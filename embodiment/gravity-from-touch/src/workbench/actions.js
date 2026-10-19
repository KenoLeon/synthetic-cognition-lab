// Actions the body can take. v0.3: thrust, a whole-body push in a body-frame direction, held for N
// frames. It is a non-gravitational force on the body, so the inner sense feels it (specific force)
// and the contact-force bookkeeping subtracts it (it is not a contact force).

import { rotate } from './quat.js';

export function createThrust(body) {
  let thrust = null;                      // { dir (body frame, unit), newtons, framesLeft }
  let appliedNow = { x: 0, y: 0, z: 0 };  // world-frame thrust applied during the current step
  return {
    // dirBody: unit vector in the body frame; newtons ≥ 0; frames ≥ 1.
    push(dirBody, newtons, frames) {
      const l = Math.hypot(dirBody.x, dirBody.y, dirBody.z);
      thrust = l > 0 && newtons > 0 && frames > 0
        ? { dir: { x: dirBody.x / l, y: dirBody.y / l, z: dirBody.z / l }, newtons, framesLeft: frames } : null;
    },
    get active() { return !!(thrust && thrust.framesLeft > 0); },
    // Applied (non-contact, non-gravity) force on the body this step, world frame.
    get applied() { return appliedNow; },
    // Call once per step, before the physics step.
    apply() {
      const rb = body.rigidBody;
      if (thrust && thrust.framesLeft > 0) {
        const d = rotate(rb.rotation(), thrust.dir);
        appliedNow = { x: d.x * thrust.newtons, y: d.y * thrust.newtons, z: d.z * thrust.newtons };
        rb.resetForces(true);
        rb.addForce(appliedNow, true);
        thrust.framesLeft--;
      } else if (appliedNow.x || appliedNow.y || appliedNow.z) {
        appliedNow = { x: 0, y: 0, z: 0 };
        rb.resetForces(true);
        thrust = null;
      }
    },
  };
}
