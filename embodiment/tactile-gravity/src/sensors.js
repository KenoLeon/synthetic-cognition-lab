// Builds the per-step sensor frame (the JSON an agent would receive), shared by app and scripts.
//
// Sensory channels: `taxels` (normal pressure, as in v0), `shear` (v0.1: per-taxel tangential force,
// [x,y,z] in the body frame), `summary` (computed from the skin), `accelerometer` (null when off).
// `truth` is NOT sensory input: engine-side values kept for verification/analysis only.
// v0 fields are unchanged; v0.1 only adds fields.

import { rotateInverse, PATCH_SEPARATION_DEG } from './skin.js';

const round = (v, digits = 6) => (v === 0 ? 0 : Number(v.toPrecision(digits)));
const roundVec = (v) => (v ? { x: round(v.x), y: round(v.y), z: round(v.z) } : null);

export function buildFrame(sim, skin, raw, { accelerometer = false, stepIndex = null } = {}) {
  const s = skin.sense(raw.bodyRot, raw.contacts);
  return {
    step: stepIndex,
    t: round(raw.t),
    taxels: Array.from(skin.pressure, (p) => round(p)),
    shear: Array.from({ length: skin.count }, (_, i) => [round(skin.shear[3 * i]), round(skin.shear[3 * i + 1]), round(skin.shear[3 * i + 2])]),
    summary: {
      totalForce: round(s.totalForce),
      centerOfPressure: roundVec(s.centerOfPressure),
      centerOfPressureDir: roundVec(s.centerOfPressureDir),
      contactArea: { taxels: s.contactArea.taxels, m2: round(s.contactArea.m2) },
      peak: { value: round(s.peak.value), index: s.peak.index },
      patchCount: s.patchCount,
      patches: s.patches.map((p) => ({
        taxels: p.taxels, force: round(p.force), direction: roundVec(p.direction),
        shear: roundVec(p.shear), forceVector: roundVec(p.forceVector),
      })),
      skinForce: roundVec(s.skinForce),
      skinForceMagnitude: round(s.skinForceMagnitude),
      skinForceDir: roundVec(s.skinForceDir),
    },
    accelerometer: accelerometer ? roundVec(raw.accel) : null,
    truth: {
      engineForce: round(raw.contacts.reduce((a, c) => a + c.force, 0)),
      contacts: raw.contacts.map((c) => ({
        surface: c.surface, force: round(c.force), normalWorld: roundVec(c.normal), penetration: round(c.penetration),
        tangentWorld: roundVec(c.tangent),
      })),
      netContactForceWorld: roundVec(raw.netContactForce),
      unassignedContactForceWorld: roundVec(raw.unassignedContactForce),
      gravityBody: roundVec(rotateInverse(raw.bodyRot, raw.gravityWorld)),
      bodyPos: roundVec(raw.bodyPos),
      bodyRot: { ...roundVec(raw.bodyRot), w: round(raw.bodyRot.w) },
      accelerometer: roundVec(raw.accel), // always recorded here, even when the channel is off
    },
  };
}

// Static description of the skin for log headers.
export function skinMetadata(skin) {
  return {
    count: skin.count,
    radius: skin.radius,
    thickness: skin.thickness,
    threshold: skin.threshold,
    taxelArea: skin.taxelArea,
    layout: 'fibonacci-sphere',
    weighting: 'd = n_body·p + r (ideal tangent plane, solver penetration ignored); w = clamp(1 - d/h, 0, 1); normalised so sum(taxels) = engine normal force per surface',
    shear: 'per-surface tangential force spread with the same weights w; tangential force = net contact force from body dynamics minus manifold normal forces (Rapier 0.21 JS tangent impulses read 0)',
    patchSeparationDeg: PATCH_SEPARATION_DEG,
    positionsBodyLocal: Array.from({ length: skin.count }, (_, i) => [
      round(skin.local[3 * i]), round(skin.local[3 * i + 1]), round(skin.local[3 * i + 2]),
    ]),
  };
}
