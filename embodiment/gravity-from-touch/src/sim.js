// Workbench composer, shared by the browser app and headless scripts (no three.js / DOM here).
// Units: metres, kilograms, seconds, newtons.
//
// The parts live in src/workbench/:
//   world.js    — the Rapier world, modes and surfaces, floor tilt, wall drives, contact readout
//   body.js     — the sphere, its motion and the contact-force bookkeeping (shear from dynamics)
//   actions.js  — thrust
//   sensors/    — taxel-skin.js (pressure, shear) and inner-sense.js; each has read(state)
// createSim wires them together and keeps the v0.3 API. step() returns the per-step state that
// sensors read: { t, bodyPos, bodyRot, contacts, coordinateAcceleration, gravityWorld, ... }.
// It also carries `accel` (the inner sense's reading), which eval and truth logs use.

import { createWorld } from './workbench/world.js';
import { createBody, SPHERE_RADIUS, DEFAULT_MASS } from './workbench/body.js';
import { createThrust } from './workbench/actions.js';
import { readInnerSense } from './workbench/sensors/inner-sense.js';
import { IDENTITY } from './workbench/quat.js';

export { SPHERE_RADIUS, DEFAULT_MASS } from './workbench/body.js';
export { DT, DEFAULT_TILT_RATE, WALL_MASS, PUSHER_MASS, MODES, floorRims, FLOOR_RIMS } from './workbench/world.js';
export { quatMul } from './workbench/quat.js';

const GAP = 0.001;

export function createSim(RAPIER, {
  mode = 'floor', gravity = 9.81, tiltDeg = 0, tiltRate,
  mass = DEFAULT_MASS, restitution = 0, lockRotation = true,
  floorFriction, rimFriction,
  // v0.2: fixed body orientation at spawn (unit quaternion), held by the rotation lock. In the wall
  // modes the wall alignment rotation is applied on top, so the wall touches the same body point
  // the floor would.
  bodyRotation = IDENTITY,
  floorSize,
} = {}) {
  // Creation order matters for Rapier's handles and solver order: surfaces first, then the body.
  const scene = createWorld(RAPIER, { mode, gravity, tiltDeg, tiltRate, floorFriction, rimFriction, floorSize });
  const body = createBody(RAPIER, scene.world, { mass, restitution, lockRotation, radius: SPHERE_RADIUS });
  const thrust = createThrust(body);
  scene.world.gravity = scene.gravityWorld();

  const sim = {
    RAPIER, world: scene.world, mode, scene, body, thrust,
    sphereBody: body.rigidBody, sphere: body.collider,
    floorBody: scene.floorBody, floor: scene.floor, wallBody: scene.wallBody, wall: scene.wall,
    pusherBody: scene.pusherBody, pusher: scene.pusher,
    get t() { return scene.t; },
    get gravity() { return scene.gravity; },
    get tiltDeg() { return scene.tiltDeg; },
    get tiltTarget() { return scene.tiltTarget; },
    get restitution() { return body.restitution; },
    get mass() { return body.mass; },
    params() {
      const w = scene.params();
      return { mode, gravity: w.gravity, worldGravity: w.worldGravity, mass: body.mass, wallMass: w.wallMass,
        pusherMass: w.pusherMass, tiltDeg: w.tiltDeg, tiltTarget: w.tiltTarget, tiltRate: w.tiltRate,
        restitution: body.restitution, lockRotation: body.lockRotation };
    },
    setGravity(v) { scene.setGravity(v); },
    push(dirBody, newtons, frames) { thrust.push(dirBody, newtons, frames); },
    get pushing() { return thrust.active; },
    setMass(v) { body.setMass(v); },
    setTilt(deg) { scene.setTilt(deg); },
    setTiltRate(degPerSec) { scene.setTiltRate(degPerSec); },
    setRestitution(e) { body.setRestitution(e); },
    setLockRotation(on) { body.setLockRotation(on); },

    // Body at rest at its start pose (see world.place), `height` from the surface.
    resetSphere(height = GAP) {
      body.stop();
      scene.place(body, height, bodyRotation);
    },
    // Probe helper (v0.2): body at rest on the floor against the downhill (−x) rim. Floor mode only.
    placeAgainstRim(gap = 0.0005) {
      body.moveTo(scene.rimRestPoint(body.radius, gap));
    },

    // One physics step. Returns the per-step state; sensors and summaries are computed elsewhere.
    step() {
      scene.advanceTilt(body);
      scene.applyDrive(body.mass);
      thrust.apply();
      scene.step();

      const contacts = scene.contactsOn(body);
      const coordinateAcceleration = body.coordinateAcceleration(scene.world.timestep);
      const gravityWorld = scene.gravityWorld();
      const bodyRot = body.rigidBody.rotation();
      const state = { t: scene.t, bodyPos: body.rigidBody.translation(), bodyRot, contacts, coordinateAcceleration, gravityWorld };
      const accel = readInnerSense(state);
      const { net, unassigned } = body.resolveContactForces(contacts, coordinateAcceleration, gravityWorld, thrust.applied);
      return {
        t: state.t,
        bodyPos: state.bodyPos,
        bodyRot,
        contacts,
        accel,
        netContactForce: net,      // world frame
        unassignedContactForce: unassigned,
        gravityWorld,
        coordinateAcceleration,    // world frame
      };
    },
    free() { scene.free(); },
  };
  sim.resetSphere();
  return sim;
}
