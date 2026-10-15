// Physics core, shared by the browser app and headless scripts (no three.js / DOM here).
// Units: metres, kilograms, seconds, newtons.
//
// Modes (each is a fresh world; switch by creating a new sim):
//   'floor' — gravity g (−y), sphere resting on a tiltable floor.
//   'wallA' — zero gravity. A free wall plate is driven with force (M_wall + m)·g, so wall and
//             sphere accelerate together at g and the wall presses the sphere with m·g.
//             Einstein's elevator: both skin and accelerometer should match 'floor'.
//   'free'  — gravity g, no contacts at all: free fall (condition 8).
//   'wallB' — zero gravity, "squeeze". Fixed wall at body −y plus a pusher plate (a real collider)
//             driven into body +y with force m·g. The sphere is held still between two contacts:
//             the skin feels two patches and the accelerometer reads ~0.
//             (v0's wall B pushed the sphere with an invisible body force instead. That was
//             physically inconsistent: a force on every mass element is gravity, so a real
//             accelerometer would read g, yet the v0 formula read 0. Removed in v0.1.)
// In both wall modes the sphere is rotated so its body −y faces the wall, i.e. the wall touches
// the same body point the floor does. Comparisons are then taxel-for-taxel in the body frame.
//
// Shear source: Rapier 0.21's JS contactTangentImpulseX/Y always return 0 (see
// scripts/probe_shear.mjs), so the tangential contact force is taken from the body's dynamics:
// the net force contacts applied this step is m·Δv/Δt − m·g_world − (applied forces on the sphere),
// and shear = that − Σ manifold normal forces. Exact bookkeeping, since the sphere only receives
// gravity, contacts and known applied forces (locked rotation adds no linear force).

import { rotate, rotateInverse } from './skin.js';

export const SPHERE_RADIUS = 0.5;
export const DEFAULT_MASS = 1.0; // 1 kg default so that resting contact force == g numerically
export const DT = 1 / 60;
export const DEFAULT_TILT_RATE = 20; // deg/s
export const WALL_MASS = 1.0;
export const PUSHER_MASS = 1.0;
export const MODES = ['floor', 'wallA', 'wallB', 'free'];

const FLOOR_HALF = { x: 6, y: 0.1, z: 6 };
// Rim walls on the floor's edges, in the floor body's frame (origin on the top surface).
const RIM = { height: 0.6, thickness: 0.1 }; // taller than the sphere radius, so it rests against the face
export function floorRims(half) {
  return [
    { center: { x: half.x + RIM.thickness / 2, y: RIM.height / 2, z: 0 }, half: { x: RIM.thickness / 2, y: RIM.height / 2, z: half.z + RIM.thickness } },
    { center: { x: -half.x - RIM.thickness / 2, y: RIM.height / 2, z: 0 }, half: { x: RIM.thickness / 2, y: RIM.height / 2, z: half.z + RIM.thickness } },
    { center: { x: 0, y: RIM.height / 2, z: half.z + RIM.thickness / 2 }, half: { x: half.x, y: RIM.height / 2, z: RIM.thickness / 2 } },
    { center: { x: 0, y: RIM.height / 2, z: -half.z - RIM.thickness / 2 }, half: { x: half.x, y: RIM.height / 2, z: RIM.thickness / 2 } },
  ];
}
export const FLOOR_RIMS = floorRims(FLOOR_HALF); // default floor, used by the renderer
const WALL_HALF = { x: 0.05, y: 1.0, z: 1.0 };
const FRICTION = 1.0;
const GAP = 0.001;
const WALL_SPHERE_START = { x: 0, y: 3, z: 0 };
// Body −y → world −x (rotation of −90° about z).
const WALL_SPHERE_ROT = { x: 0, y: 0, z: -Math.SQRT1_2, w: Math.SQRT1_2 };
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

const CONE_TOL = 1e-4; // N

// Hamilton product a·b (apply b, then a).
export function quatMul(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

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

export function createSim(RAPIER, {
  mode = 'floor', gravity = 9.81, tiltDeg = 0, tiltRate = DEFAULT_TILT_RATE,
  mass = DEFAULT_MASS, restitution = 0, lockRotation = true,
  // v0.2: friction of the floor and rims (the sphere's own is FRICTION; environment colliders use
  // the Min combine rule, so the effective μ at a contact is min(FRICTION, surface μ)).
  floorFriction = FRICTION, rimFriction = FRICTION,
  // v0.2: fixed body orientation at spawn (unit quaternion), held by the rotation lock. In the wall
  // modes the wall alignment rotation is applied on top, so the wall touches the same body point
  // the floor would.
  bodyRotation = IDENTITY,
  // v0.3: floor half-size in x and z (m). Default 6 as before; larger keeps pushed bodies away from the rims.
  floorSize = FLOOR_HALF.x,
} = {}) {
  if (!MODES.includes(mode)) throw new Error(`unknown mode ${mode}`);
  const isFloor = mode === 'floor';
  const isWall = mode === 'wallA' || mode === 'wallB';
  const hasGravity = isFloor || mode === 'free';
  const MIN = RAPIER.CoefficientCombineRule.Min;
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = DT;

  // Floor: kinematic so tilting moves it smoothly instead of teleporting through the sphere.
  // Its body origin is a point on its top surface. Disabled in the wall modes.
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  const floor = world.createCollider(
    RAPIER.ColliderDesc.cuboid(floorSize, FLOOR_HALF.y, floorSize)
      .setTranslation(0, -FLOOR_HALF.y, 0)
      .setFriction(floorFriction).setFrictionCombineRule(MIN)
      .setRestitution(0)
      .setEnabled(isFloor),
    floorBody,
  );
  // Rims: low walls around the floor's edge (attached to the floor body, so they tilt with it) to
  // stop the sphere sliding off into nothing. Real colliders: touching one is sensed as a contact.
  const rims = floorRims({ x: floorSize, z: floorSize }).map((r) => world.createCollider(
    RAPIER.ColliderDesc.cuboid(r.half.x, r.half.y, r.half.z)
      .setTranslation(r.center.x, r.center.y, r.center.z)
      .setFriction(rimFriction).setFrictionCombineRule(MIN)
      .setRestitution(0)
      .setEnabled(isFloor),
    floorBody,
  ));

  // Wall: a plate on the sphere's −x side, face normal +x. Only in the wall modes.
  // Pusher (wallB only): a plate on the +x side, free to move along x, driven toward the sphere.
  let wallBody = null, wall = null, pusherBody = null, pusher = null;
  if (mode === 'wallB') {
    pusherBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().enabledTranslations(true, false, false).lockRotations().setCanSleep(false));
    pusher = world.createCollider(
      RAPIER.ColliderDesc.cuboid(WALL_HALF.x, WALL_HALF.y, WALL_HALF.z)
        .setMass(PUSHER_MASS).setFriction(FRICTION).setFrictionCombineRule(MIN).setRestitution(0),
      pusherBody,
    );
  }
  if (isWall) {
    const desc = mode === 'wallA'
      ? RAPIER.RigidBodyDesc.dynamic().enabledTranslations(true, false, false).lockRotations().setCanSleep(false)
      : RAPIER.RigidBodyDesc.fixed();
    wallBody = world.createRigidBody(desc);
    wall = world.createCollider(
      RAPIER.ColliderDesc.cuboid(WALL_HALF.x, WALL_HALF.y, WALL_HALF.z)
        .setMass(WALL_MASS).setFriction(FRICTION).setFrictionCombineRule(MIN).setRestitution(0),
      wallBody,
    );
  }

  const sphereBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false));
  const sphere = world.createCollider(
    RAPIER.ColliderDesc.ball(SPHERE_RADIUS).setMass(mass).setFriction(FRICTION)
      .setRestitution(restitution)
      .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max),
    sphereBody,
  );
  sphereBody.lockRotations(lockRotation, true);

  let t = 0;
  let g = gravity;
  let m = mass;
  let tilt = isFloor ? tiltDeg : 0; // current floor angle (deg, about world z)
  let tiltTarget = tilt;             // slider value; the floor turns toward it at tiltRate
  let rate = tiltRate;
  const floorPos = { x: 0, y: 0 };
  let prevVel = { x: 0, y: 0, z: 0 };
  let locked = lockRotation;

  function tiltQuat(deg) {
    const half = (deg * Math.PI) / 360;
    return { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
  }
  function floorNormal(deg) {
    const a = (deg * Math.PI) / 180;
    return { x: -Math.sin(a), y: Math.cos(a) };
  }
  function worldGravity() {
    return hasGravity ? { x: 0, y: -g, z: 0 } : { x: 0, y: 0, z: 0 };
  }

  world.gravity = worldGravity();

  // Turn the floor toward the target at a bounded rate, pivoting about the point on the floor
  // directly under the sphere. Snapping the angle in one step (or pivoting far from the sphere)
  // makes the kinematic floor swat the sphere into the air.
  function advanceTilt() {
    const maxStep = rate * world.timestep;
    const delta = Math.max(-maxStep, Math.min(maxStep, tiltTarget - tilt));
    if (delta === 0) return;
    const s = sphereBody.translation();
    const n = floorNormal(tilt);
    const h = n.x * (s.x - floorPos.x) + n.y * (s.y - floorPos.y);
    const c = { x: s.x - h * n.x, y: s.y - h * n.y }; // pivot: sphere centre projected onto floor
    const a = (delta * Math.PI) / 180;
    const rx = floorPos.x - c.x, ry = floorPos.y - c.y;
    floorPos.x = c.x + Math.cos(a) * rx - Math.sin(a) * ry;
    floorPos.y = c.y + Math.sin(a) * rx + Math.cos(a) * ry;
    tilt += delta;
    floorBody.setNextKinematicTranslation({ x: floorPos.x, y: floorPos.y, z: 0 });
    floorBody.setNextKinematicRotation(tiltQuat(tilt));
  }

  // Constant drive forces for the wall modes (Rapier user forces persist, so reset then add).
  function applyDrive() {
    if (mode === 'wallA') {
      wallBody.resetForces(true);
      wallBody.addForce({ x: (WALL_MASS + m) * g, y: 0, z: 0 }, true);
    } else if (mode === 'wallB') {
      pusherBody.resetForces(true);
      pusherBody.addForce({ x: -m * g, y: 0, z: 0 }, true);
    }
  }
  // Applied (non-contact, non-gravity) forces acting directly on the sphere. None in v0.1; kept
  // explicit because the shear bookkeeping must subtract them.
// v0.3 action: a whole-body push (thrust) in a body-frame direction, held for N frames. It is a
  // non-gravitational force on the sphere, so the accelerometer feels it (specific force) and the
  // shear bookkeeping subtracts it (it is not a contact force).
  let thrust = null;            // { dir (body frame, unit), newtons, framesLeft }
  let appliedNow = { x: 0, y: 0, z: 0 }; // world-frame thrust applied during the current step
  const sphereAppliedForce = () => appliedNow;
  function applyThrust() {
    if (thrust && thrust.framesLeft > 0) {
      const d = rotate(sphereBody.rotation(), thrust.dir);
      appliedNow = { x: d.x * thrust.newtons, y: d.y * thrust.newtons, z: d.z * thrust.newtons };
      sphereBody.resetForces(true);
      sphereBody.addForce(appliedNow, true);
      thrust.framesLeft--;
    } else if (appliedNow.x || appliedNow.y || appliedNow.z) {
      appliedNow = { x: 0, y: 0, z: 0 };
      sphereBody.resetForces(true);
      thrust = null;
    }
  }

  // Normal force that collider `other` exerts on the sphere, from the contact manifolds, plus the
  // surface plane: world normal pointing into the sphere and a world point on the surface.
  function contactWith(other, surface) {
    let impulse = 0, normal = null;
    let px = 0, py = 0, pz = 0, pw = 0;
    const op = other.translation(), oq = other.rotation();
    world.contactPair(sphere, other, (manifold, flipped) => {
      // manifold.normal() points from manifold collider1 to collider2 (world frame). We passed
      // (sphere, other); `flipped` means Rapier stored them as (other, sphere).
      const n = manifold.normal();
      normal = flipped ? { x: n.x, y: n.y, z: n.z } : { x: -n.x, y: -n.y, z: -n.z };
      for (let i = 0; i < manifold.numContacts(); i++) {
        const j = manifold.contactImpulse(i);
        impulse += j;
        // Contact point on `other`, in its collider-local frame → world.
        const lp = flipped ? manifold.localContactPoint1(i) : manifold.localContactPoint2(i);
        const wp = rotate(oq, lp);
        const w = j > 0 ? j : 1e-12;
        px += w * (op.x + wp.x); py += w * (op.y + wp.y); pz += w * (op.z + wp.z); pw += w;
      }
    });
    if (!normal || pw === 0) return null;
    const point = { x: px / pw, y: py / pw, z: pz / pw };
    // Solver penetration (diagnostic only; the skin does not use it).
    const c = sphereBody.translation();
    const penetration = SPHERE_RADIUS - (normal.x * (c.x - point.x) + normal.y * (c.y - point.y) + normal.z * (c.z - point.z));
    const mu = Math.min(sphere.friction(), other.friction()); // Min combine rule (see above)
    return { surface, force: impulse / world.timestep, normal, point, penetration, mu };
  }

  const sim = {
    RAPIER, world, mode, sphereBody, sphere, floorBody, floor, wallBody, wall, pusherBody, pusher,
    get t() { return t; },
    get gravity() { return g; },
    get tiltDeg() { return tilt; },
    get tiltTarget() { return tiltTarget; },
    get restitution() { return sphere.restitution(); },
    get mass() { return m; },
    params() {
      return { mode, gravity: g, worldGravity: worldGravity().y, mass: m, wallMass: mode === 'wallA' ? WALL_MASS : null,
        pusherMass: mode === 'wallB' ? PUSHER_MASS : null,
        tiltDeg: tilt, tiltTarget, tiltRate: rate, restitution: sphere.restitution(), lockRotation: locked };
    },
setGravity(v) { g = v; world.gravity = worldGravity(); },
    // v0.3 action. dirBody: unit vector in the body frame; newtons ≥ 0; frames ≥ 1.
    push(dirBody, newtons, frames) {
      const l = Math.hypot(dirBody.x, dirBody.y, dirBody.z);
      thrust = l > 0 && newtons > 0 && frames > 0
        ? { dir: { x: dirBody.x / l, y: dirBody.y / l, z: dirBody.z / l }, newtons, framesLeft: frames } : null;
    },
    get pushing() { return !!(thrust && thrust.framesLeft > 0); },
    // Uniform density change: inertia scales with mass, centre of mass stays at the centre.
    setMass(v) { m = v; sphere.setMass(v); sphereBody.wakeUp(); },
    setTilt(deg) { if (isFloor) tiltTarget = deg; },
    setTiltRate(degPerSec) { rate = degPerSec; },
    // Bounciness. The sphere's value wins (combine rule Max; floor and wall are 0).
    setRestitution(e) { sphere.setRestitution(e); },
    setLockRotation(on) { locked = on; sphereBody.lockRotations(on, true); },

    // Floor mode: floor back through the origin at its current angle, sphere `height` above it.
    // Wall modes: sphere at the start point facing the wall, wall `height` away, both at rest.
    resetSphere(height = GAP) {
      sphereBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      sphereBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      prevVel = { x: 0, y: 0, z: 0 };
      if (isFloor) {
        floorPos.x = 0; floorPos.y = 0;
        floorBody.setTranslation({ x: 0, y: 0, z: 0 }, true);
        floorBody.setRotation(tiltQuat(tilt), true);
        const n = floorNormal(tilt);
        const d = SPHERE_RADIUS + height;
        sphereBody.setTranslation({ x: n.x * d, y: n.y * d, z: 0 }, true);
        sphereBody.setRotation(bodyRotation, true);
      } else if (mode === 'free') {
        sphereBody.setTranslation(WALL_SPHERE_START, true);
        sphereBody.setRotation(bodyRotation, true);
      } else {
        const s = WALL_SPHERE_START;
        sphereBody.setTranslation(s, true);
        sphereBody.setRotation(quatMul(WALL_SPHERE_ROT, bodyRotation), true);
        wallBody.setTranslation({ x: s.x - SPHERE_RADIUS - height - WALL_HALF.x, y: s.y, z: s.z }, true);
        wallBody.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
        if (pusherBody) {
          pusherBody.setTranslation({ x: s.x + SPHERE_RADIUS + height + WALL_HALF.x, y: s.y, z: s.z }, true);
          pusherBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    },

    // Probe helper (v0.2): put the sphere at rest on the floor against the downhill (−x) rim,
    // `gap` metres from it. Floor mode only.
    placeAgainstRim(gap = 0.0005) {
      const a = (tilt * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      const lx = -floorSize + SPHERE_RADIUS + gap, ly = SPHERE_RADIUS + 0.0005; // floor-local
      sphereBody.setTranslation({ x: floorPos.x + c * lx - sn * ly, y: floorPos.y + sn * lx + c * ly, z: 0 }, true);
      sphereBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      prevVel = { x: 0, y: 0, z: 0 };
    },

    // One physics step. Returns the raw physical readings; skin and summary are computed elsewhere.
    step() {
      if (isFloor) advanceTilt();
      applyDrive();
      applyThrust();
      world.step();
      t += world.timestep;

      const contacts = [];
      const add = (c) => { if (c) contacts.push(c); };
      if (isFloor) {
        add(contactWith(floor, 'floor'));
        for (const r of rims) add(contactWith(r, 'rim'));
      }
      if (wall) add(contactWith(wall, 'wall'));
      if (pusher) add(contactWith(pusher, 'pusher'));

      const v = sphereBody.linvel();
      const gw = worldGravity();
      const aCoord = {
        x: (v.x - prevVel.x) / world.timestep,
        y: (v.y - prevVel.y) / world.timestep,
        z: (v.z - prevVel.z) / world.timestep,
      };
      prevVel = { x: v.x, y: v.y, z: v.z };

      // Accelerometer: proper acceleration = coordinate acceleration − gravitational acceleration,
      // expressed in the body frame. This is what a real accelerometer at the centre reads.
      const accel = rotateInverse(sphereBody.rotation(), { x: aCoord.x - gw.x, y: aCoord.y - gw.y, z: aCoord.z - gw.z });

      // Net contact force on the sphere (world) from its dynamics, then the tangential part per contact.
      const mass = sphereBody.mass();
      const fa = sphereAppliedForce();
      const net = {
        x: mass * (aCoord.x - gw.x) - fa.x,
        y: mass * (aCoord.y - gw.y) - fa.y,
        z: mass * (aCoord.z - gw.z) - fa.z,
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

      return {
        t,
        bodyPos: sphereBody.translation(),
        bodyRot: sphereBody.rotation(),
        contacts,
        accel,
        netContactForce: net,      // world frame
        unassignedContactForce: unassigned,
        gravityWorld: gw,
      };
    },
    free() { world.free(); },
  };
  sim.resetSphere();
  return sim;
}
