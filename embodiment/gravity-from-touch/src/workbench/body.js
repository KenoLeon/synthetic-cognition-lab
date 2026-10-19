// Body: the rigid sphere, its mass and rotation lock, its motion, and the contact-force bookkeeping
// (how the net contact force splits into per-contact normal and tangential parts). No sensors here:
// sensors read the per-step state this module helps produce.
//
// Shear source: Rapier 0.21's JS contactTangentImpulseX/Y always return 0 (see
// scripts/probe_shear.mjs), so the tangential contact force is taken from the body's dynamics:
// the net force contacts applied this step is m·Δv/Δt − m·g_world − (applied forces on the body),
// and shear = that − Σ manifold normal forces. Exact bookkeeping, since the body only receives
// gravity, contacts and known applied forces (locked rotation adds no linear force).

export const SPHERE_RADIUS = 0.5;
export const DEFAULT_MASS = 1.0; // 1 kg default so that resting contact force == g numerically
export const BODY_FRICTION = 1.0;

const CONE_TOL = 1e-4; // N

// Solve (Σ_k (I − n_k n_kᵀ)) λ = r. Returns null when the matrix is (near) singular, i.e. all
// contact normals are parallel and no in-plane split can absorb r's normal component.
function solveSumOfProjections(normals, r) {
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const n of normals) {
    const v = [n.x, n.y, n.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += (i === j ? 1 : 0) - v[i] * v[j];
  }
  const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
    - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
    + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  if (Math.abs(det) < 1e-6) return null;
  const inv = (i, j) => { // cofactor-based inverse entry (M is symmetric)
    const a = [0, 1, 2].filter((k) => k !== j), b = [0, 1, 2].filter((k) => k !== i);
    const minor = M[a[0]][b[0]] * M[a[1]][b[1]] - M[a[0]][b[1]] * M[a[1]][b[0]];
    return ((i + j) % 2 ? -minor : minor) / det;
  };
  const rv = [r.x, r.y, r.z];
  const out = [0, 1, 2].map((i) => inv(i, 0) * rv[0] + inv(i, 1) * rv[1] + inv(i, 2) * rv[2]);
  return { x: out[0], y: out[1], z: out[2] };
}

export function createBody(RAPIER, world, { mass = DEFAULT_MASS, restitution = 0, lockRotation = true, radius = SPHERE_RADIUS } = {}) {
  const rigidBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(radius).setMass(mass).setFriction(BODY_FRICTION)
      .setRestitution(restitution)
      .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max),
    rigidBody,
  );
  rigidBody.lockRotations(lockRotation, true);

  let m = mass;
  let locked = lockRotation;
  let prevVel = { x: 0, y: 0, z: 0 };

  return {
    rigidBody, collider, radius,
    get mass() { return m; },
    get lockRotation() { return locked; },
    get restitution() { return collider.restitution(); },
    // Uniform density change: inertia scales with mass, centre of mass stays at the centre.
    setMass(v) { m = v; collider.setMass(v); rigidBody.wakeUp(); },
    // Bounciness. The body's value wins (combine rule Max; floor and wall are 0).
    setRestitution(e) { collider.setRestitution(e); },
    setLockRotation(on) { locked = on; rigidBody.lockRotations(on, true); },

    stop() {
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      prevVel = { x: 0, y: 0, z: 0 };
    },
    moveTo(p) {
      rigidBody.setTranslation(p, true);
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      prevVel = { x: 0, y: 0, z: 0 };
    },

    // Coordinate acceleration (world frame) over the last step, from the change in velocity.
    coordinateAcceleration(dt) {
      const v = rigidBody.linvel();
      const a = { x: (v.x - prevVel.x) / dt, y: (v.y - prevVel.y) / dt, z: (v.z - prevVel.z) / dt };
      prevVel = { x: v.x, y: v.y, z: v.z };
      return a;
    },

    // Net contact force on the body (world) from its dynamics, then the tangential part per
    // contact. Sets c.tangent, c.shearMagnitude and c.coneViolation on each contact.
    resolveContactForces(contacts, aCoord, gw, applied) {
      const bodyMass = rigidBody.mass();
      const net = {
        x: bodyMass * (aCoord.x - gw.x) - applied.x,
        y: bodyMass * (aCoord.y - gw.y) - applied.y,
        z: bodyMass * (aCoord.z - gw.z) - applied.z,
      };
      const resid = { ...net }; // net minus all manifold normal forces
      let sumN = 0;
      for (const c of contacts) {
        resid.x -= c.force * c.normal.x; resid.y -= c.force * c.normal.y; resid.z -= c.force * c.normal.z;
        sumN += c.force;
      }
      // Split the residual into per-contact tangential forces t_k, each in its own contact plane.
      // Non-parallel contacts: the minimum-norm split that sums exactly to the residual,
      // t_k = P_k·λ with λ = (Σ P_k)⁻¹·resid, where P_k = I − n_k n_kᵀ. One contact, or parallel
      // ones (Σ P_k singular): split in proportion to normal force, each projected onto its plane.
      // What can't be assigned (normal mismatch between dynamics and manifold, or a residual with
      // no contact) goes to `unassigned`.
      const unassigned = { ...resid };
      const project = (c, v) => {
        const vn = v.x * c.normal.x + v.y * c.normal.y + v.z * c.normal.z;
        return { x: v.x - vn * c.normal.x, y: v.y - vn * c.normal.y, z: v.z - vn * c.normal.z };
      };
      const lambda = contacts.length > 1 ? solveSumOfProjections(contacts.map((c) => c.normal), resid) : null;
      for (const c of contacts) {
        if (lambda) c.tangent = project(c, lambda);
        else {
          const share = contacts.length === 1 ? 1 : sumN > 0 ? c.force / sumN : 0;
          c.tangent = project(c, { x: resid.x * share, y: resid.y * share, z: resid.z * share });
        }
        unassigned.x -= c.tangent.x; unassigned.y -= c.tangent.y; unassigned.z -= c.tangent.z;
      }
      // Friction-cone check (v0.2): an admissible contact has |shear| ≤ μ·N.
      for (const c of contacts) {
        c.shearMagnitude = Math.hypot(c.tangent.x, c.tangent.y, c.tangent.z);
        c.coneViolation = c.shearMagnitude > c.mu * c.force + CONE_TOL;
      }
      return { net, unassigned };
    },
  };
}
