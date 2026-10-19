// World / scene: the Rapier world, the mode's surfaces (floor + rims, wall, pusher), the floor tilt,
// the wall drives, and the contact readout. Knows nothing about sensors.
//
// Modes (each is a fresh world; switch by creating a new sim):
//   'floor' — gravity g (−y), body resting on a tiltable floor.
//   'wallA' — zero gravity. A free wall plate is driven with force (M_wall + m)·g, so wall and
//             body accelerate together at g and the wall presses the body with m·g.
//             Einstein's elevator: both skin and inner sense should match 'floor'.
//   'free'  — gravity g, no contacts at all: free fall (condition 8).
//   'wallB' — zero gravity, "squeeze". Fixed wall at body −y plus a pusher plate (a real collider)
//             driven into body +y with force m·g. The body is held still between two contacts:
//             the skin feels two patches and the inner sense reads ~0.
//             (v0's wall B pushed the body with an invisible body force instead. That was
//             physically inconsistent: a force on every mass element is gravity, so a real
//             accelerometer would read g, yet the v0 formula read 0. Removed in v0.1.)
// In both wall modes the body is rotated so its body −y faces the wall, i.e. the wall touches
// the same body point the floor does. Comparisons are then taxel-for-taxel in the body frame.

import { rotate, quatMul } from './quat.js';

export const DT = 1 / 60;
export const DEFAULT_TILT_RATE = 20; // deg/s
export const WALL_MASS = 1.0;
export const PUSHER_MASS = 1.0;
export const MODES = ['floor', 'wallA', 'wallB', 'free'];
export const SURFACE_FRICTION = 1.0;

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
export const DEFAULT_FLOOR_SIZE = FLOOR_HALF.x;
const WALL_HALF = { x: 0.05, y: 1.0, z: 1.0 };
const WALL_BODY_START = { x: 0, y: 3, z: 0 };
// Body −y → world −x (rotation of −90° about z).
const WALL_BODY_ROT = { x: 0, y: 0, z: -Math.SQRT1_2, w: Math.SQRT1_2 };

export function createWorld(RAPIER, {
  mode = 'floor', gravity = 9.81, tiltDeg = 0, tiltRate = DEFAULT_TILT_RATE,
  // v0.2: friction of the floor and rims (environment colliders use the Min combine rule, so the
  // effective μ at a contact is min(body μ, surface μ)).
  floorFriction = SURFACE_FRICTION, rimFriction = SURFACE_FRICTION,
  // v0.3: floor half-size in x and z (m). Default 6; larger keeps pushed bodies away from the rims.
  floorSize = FLOOR_HALF.x,
} = {}) {
  if (!MODES.includes(mode)) throw new Error(`unknown mode ${mode}`);
  const isFloor = mode === 'floor';
  const isWall = mode === 'wallA' || mode === 'wallB';
  const hasGravity = isFloor || mode === 'free';
  const MIN = RAPIER.CoefficientCombineRule.Min;
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = DT;

  // Floor: kinematic so tilting moves it smoothly instead of teleporting through the body.
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
  // stop the body sliding off into nothing. Real colliders: touching one is sensed as a contact.
  const rims = floorRims({ x: floorSize, z: floorSize }).map((r) => world.createCollider(
    RAPIER.ColliderDesc.cuboid(r.half.x, r.half.y, r.half.z)
      .setTranslation(r.center.x, r.center.y, r.center.z)
      .setFriction(rimFriction).setFrictionCombineRule(MIN)
      .setRestitution(0)
      .setEnabled(isFloor),
    floorBody,
  ));

  // Wall: a plate on the body's −x side, face normal +x. Only in the wall modes.
  // Pusher (wallB only): a plate on the +x side, free to move along x, driven toward the body.
  let wallBody = null, wall = null, pusherBody = null, pusher = null;
  if (mode === 'wallB') {
    pusherBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().enabledTranslations(true, false, false).lockRotations().setCanSleep(false));
    pusher = world.createCollider(
      RAPIER.ColliderDesc.cuboid(WALL_HALF.x, WALL_HALF.y, WALL_HALF.z)
        .setMass(PUSHER_MASS).setFriction(SURFACE_FRICTION).setFrictionCombineRule(MIN).setRestitution(0),
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
        .setMass(WALL_MASS).setFriction(SURFACE_FRICTION).setFrictionCombineRule(MIN).setRestitution(0),
      wallBody,
    );
  }

  let t = 0;
  let g = gravity;
  let tilt = isFloor ? tiltDeg : 0; // current floor angle (deg, about world z)
  let tiltTarget = tilt;             // slider value; the floor turns toward it at tiltRate
  let rate = tiltRate;
  const floorPos = { x: 0, y: 0 };

  function tiltQuat(deg) {
    const half = (deg * Math.PI) / 360;
    return { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
  }
  function floorNormal(deg) {
    const a = (deg * Math.PI) / 180;
    return { x: -Math.sin(a), y: Math.cos(a) };
  }
  function gravityWorld() {
    return hasGravity ? { x: 0, y: -g, z: 0 } : { x: 0, y: 0, z: 0 };
  }

  // Normal force that collider `other` exerts on the body collider, from the contact manifolds,
  // plus the surface plane: world normal pointing into the body and a world point on the surface.
  function contactWith(body, other, surface) {
    let impulse = 0, normal = null;
    let px = 0, py = 0, pz = 0, pw = 0;
    const op = other.translation(), oq = other.rotation();
    world.contactPair(body.collider, other, (manifold, flipped) => {
      // manifold.normal() points from manifold collider1 to collider2 (world frame). We passed
      // (body, other); `flipped` means Rapier stored them as (other, body).
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
    const c = body.rigidBody.translation();
    const penetration = body.radius - (normal.x * (c.x - point.x) + normal.y * (c.y - point.y) + normal.z * (c.z - point.z));
    const mu = Math.min(body.collider.friction(), other.friction()); // Min combine rule (see above)
    return { surface, force: impulse / world.timestep, normal, point, penetration, mu };
  }

  const scene = {
    RAPIER, world, mode, isFloor, floorBody, floor, rims, wallBody, wall, pusherBody, pusher,
    get t() { return t; },
    get gravity() { return g; },
    get tiltDeg() { return tilt; },
    get tiltTarget() { return tiltTarget; },
    get tiltRate() { return rate; },
    gravityWorld,
    setGravity(v) { g = v; world.gravity = gravityWorld(); },
    setTilt(deg) { if (isFloor) tiltTarget = deg; },
    setTiltRate(degPerSec) { rate = degPerSec; },

    // Turn the floor toward the target at a bounded rate, pivoting about the point on the floor
    // directly under the body. Snapping the angle in one step (or pivoting far from the body)
    // makes the kinematic floor swat the body into the air.
    advanceTilt(body) {
      if (!isFloor) return;
      const maxStep = rate * world.timestep;
      const delta = Math.max(-maxStep, Math.min(maxStep, tiltTarget - tilt));
      if (delta === 0) return;
      const s = body.rigidBody.translation();
      const n = floorNormal(tilt);
      const h = n.x * (s.x - floorPos.x) + n.y * (s.y - floorPos.y);
      const c = { x: s.x - h * n.x, y: s.y - h * n.y }; // pivot: body centre projected onto floor
      const a = (delta * Math.PI) / 180;
      const rx = floorPos.x - c.x, ry = floorPos.y - c.y;
      floorPos.x = c.x + Math.cos(a) * rx - Math.sin(a) * ry;
      floorPos.y = c.y + Math.sin(a) * rx + Math.cos(a) * ry;
      tilt += delta;
      floorBody.setNextKinematicTranslation({ x: floorPos.x, y: floorPos.y, z: 0 });
      floorBody.setNextKinematicRotation(tiltQuat(tilt));
    },

    // Constant drive forces for the wall modes (Rapier user forces persist, so reset then add).
    applyDrive(bodyMass) {
      if (mode === 'wallA') {
        wallBody.resetForces(true);
        wallBody.addForce({ x: (WALL_MASS + bodyMass) * g, y: 0, z: 0 }, true);
      } else if (mode === 'wallB') {
        pusherBody.resetForces(true);
        pusherBody.addForce({ x: -bodyMass * g, y: 0, z: 0 }, true);
      }
    },

    step() { world.step(); t += world.timestep; },

    // Contacts on the body this step, in a fixed surface order (floor, rims, wall, pusher).
    contactsOn(body) {
      const contacts = [];
      const add = (c) => { if (c) contacts.push(c); };
      if (isFloor) {
        add(contactWith(body, floor, 'floor'));
        for (const r of rims) add(contactWith(body, r, 'rim'));
      }
      if (wall) add(contactWith(body, wall, 'wall'));
      if (pusher) add(contactWith(body, pusher, 'pusher'));
      return contacts;
    },

    // Floor mode: floor back through the origin at its current angle, body `height` above it.
    // Wall modes: body at the start point facing the wall, wall `height` away, both at rest.
    place(body, height, bodyRotation) {
      const rb = body.rigidBody;
      if (isFloor) {
        floorPos.x = 0; floorPos.y = 0;
        floorBody.setTranslation({ x: 0, y: 0, z: 0 }, true);
        floorBody.setRotation(tiltQuat(tilt), true);
        const n = floorNormal(tilt);
        const d = body.radius + height;
        rb.setTranslation({ x: n.x * d, y: n.y * d, z: 0 }, true);
        rb.setRotation(bodyRotation, true);
      } else if (mode === 'free') {
        rb.setTranslation(WALL_BODY_START, true);
        rb.setRotation(bodyRotation, true);
      } else {
        const s = WALL_BODY_START;
        rb.setTranslation(s, true);
        rb.setRotation(quatMul(WALL_BODY_ROT, bodyRotation), true);
        wallBody.setTranslation({ x: s.x - body.radius - height - WALL_HALF.x, y: s.y, z: s.z }, true);
        wallBody.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
        if (pusherBody) {
          pusherBody.setTranslation({ x: s.x + body.radius + height + WALL_HALF.x, y: s.y, z: s.z }, true);
          pusherBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    },

    // Probe helper (v0.2): the point on the floor against the downhill (−x) rim, `gap` metres from
    // it, where a body of `radius` rests. Floor mode only.
    rimRestPoint(radius, gap) {
      const a = (tilt * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      const lx = -floorSize + radius + gap, ly = radius + 0.0005; // floor-local
      return { x: floorPos.x + c * lx - sn * ly, y: floorPos.y + sn * lx + c * ly, z: 0 };
    },

    params() {
      return { mode, gravity: g, worldGravity: gravityWorld().y, wallMass: mode === 'wallA' ? WALL_MASS : null,
        pusherMass: mode === 'wallB' ? PUSHER_MASS : null, tiltDeg: tilt, tiltTarget, tiltRate: rate };
    },
    free() { world.free(); },
  };
  return scene;
}
