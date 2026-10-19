// Inner sense (an accelerometer at the body's centre): proper acceleration = coordinate
// acceleration − gravitational acceleration, in the body frame. Sensor interface: read(state).

import { rotateInverse } from '../quat.js';

export function readInnerSense(state) {
  const a = state.coordinateAcceleration, gw = state.gravityWorld;
  return rotateInverse(state.bodyRot, { x: a.x - gw.x, y: a.y - gw.y, z: a.z - gw.z });
}

export function createInnerSense() {
  return { name: 'inner-sense', read: readInnerSense };
}
