// Numerical experiments: settle a condition, average its readings, compare conditions.
// Runs identically in the browser ("Run equivalence test") and in Node (scripts/verify_conditions.mjs).

import { createSim, SPHERE_RADIUS } from './sim.js';
import { createSkin, rotateInverse } from './skin.js';

// Settle one condition and average the last `avgSteps` steps.
export function settle(RAPIER, simParams, skinParams = {}, { settleSteps = 300, avgSteps = 60 } = {}) {
  const sim = createSim(RAPIER, simParams);
  const skin = createSkin({ radius: SPHERE_RADIUS, ...skinParams });
  const sum = new Float64Array(skin.count);
  const sumShear = new Float64Array(3 * skin.count);
  const sumNormal = new Float64Array(3 * skin.count);
  const acc = { x: 0, y: 0, z: 0 };
  const grav = { x: 0, y: 0, z: 0 };
  const contactDirs = {}; // truth: mean contact direction (−normal) per surface, body frame
  const forces = [];
  let engineForce = 0;
  for (let i = 0; i < settleSteps + avgSteps; i++) {
    const raw = sim.step();
    skin.sense(raw.bodyRot, raw.contacts);
    if (i < settleSteps) continue;
    for (let k = 0; k < skin.count; k++) sum[k] += skin.pressure[k];
    for (let k = 0; k < 3 * skin.count; k++) { sumShear[k] += skin.shear[k]; sumNormal[k] += skin.normalForce[k]; }
    acc.x += raw.accel.x; acc.y += raw.accel.y; acc.z += raw.accel.z;
    const gb = rotateInverse(raw.bodyRot, raw.gravityWorld); // truth: gravity in the body frame
    grav.x += gb.x; grav.y += gb.y; grav.z += gb.z;
    for (const c of raw.contacts) {
      if (!(c.force > 0)) continue;
      const d = rotateInverse(raw.bodyRot, { x: -c.normal.x, y: -c.normal.y, z: -c.normal.z });
      const acc2 = (contactDirs[c.surface] ??= { x: 0, y: 0, z: 0 });
      acc2.x += d.x; acc2.y += d.y; acc2.z += d.z;
    }
    const f = raw.contacts.reduce((a, c) => a + c.force, 0);
    forces.push(f);
    engineForce += f;
  }
  const params = sim.params();
  sim.free();
  for (let k = 0; k < skin.count; k++) skin.pressure[k] = sum[k] / avgSteps;
  for (let k = 0; k < 3 * skin.count; k++) { skin.shear[k] = sumShear[k] / avgSteps; skin.normalForce[k] = sumNormal[k] / avgSteps; }
  const mean = engineForce / avgSteps;
  const forceStd = Math.sqrt(forces.reduce((a, f) => a + (f - mean) ** 2, 0) / avgSteps);
  return {
    params,
    taxels: Array.from(skin.pressure),
    shear: Array.from(skin.shear),
    summary: skin.summary(),
    accel: { x: acc.x / avgSteps, y: acc.y / avgSteps, z: acc.z / avgSteps },
    gravityBody: { x: grav.x / avgSteps, y: grav.y / avgSteps, z: grav.z / avgSteps },
    contactDirsBody: Object.fromEntries(Object.entries(contactDirs).map(([k, v]) => {
      const l = Math.hypot(v.x, v.y, v.z); return [k, { x: v.x / l, y: v.y / l, z: v.z / l }];
    })),
    engineForce: mean,
    engineForceStd: forceStd,
  };
}

const norm = (v) => Math.hypot(v.x, v.y, v.z);
const angleDeg = (a, b) => {
  if (!a || !b) return null;
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (norm(a) * norm(b));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};

// Taxel-by-taxel comparison of two settled conditions (body frame).
export function compareTactile(a, b) {
  let maxAbs = 0, d2 = 0, a2 = 0;
  for (let i = 0; i < a.taxels.length; i++) {
    const d = a.taxels[i] - b.taxels[i];
    maxAbs = Math.max(maxAbs, Math.abs(d));
    d2 += d * d; a2 += a.taxels[i] ** 2;
  }
  let s2 = 0, sa2 = 0;
  if (a.shear && b.shear) for (let i = 0; i < a.shear.length; i++) { s2 += (a.shear[i] - b.shear[i]) ** 2; sa2 += a.shear[i] ** 2; }
  return {
    shearL2: Math.sqrt(s2),          // N, absolute (shear is ~0 in the level/wall cases)
    shearRelL2: sa2 > 0 ? Math.sqrt(s2 / sa2) : null,
    maxAbsTaxelDiff: maxAbs,
    relL2: a2 > 0 ? Math.sqrt(d2 / a2) : Math.sqrt(d2),
    totalForceDiff: b.summary.totalForce - a.summary.totalForce,
    copAngleDeg: angleDeg(a.summary.centerOfPressureDir, b.summary.centerOfPressureDir),
    contactAreaDiff: b.summary.contactArea.taxels - a.summary.contactArea.taxels,
  };
}

export function compareAccel(a, b) {
  const d = { x: b.accel.x - a.accel.x, y: b.accel.y - a.accel.y, z: b.accel.z - a.accel.z };
  return { diff: d, diffNorm: norm(d), angleDeg: angleDeg(a.accel, b.accel) };
}

// Tolerances for verdicts. Tactile: relative L2 over the taxel vector. Accelerometer: fraction of g.
export const TOL = { tactileRelL2: 1e-3, accelFracOfG: 0.05 };

// Conditions 4–6: level floor vs the two zero-g wall setups.
//   4: wall A (accelerating wall) feels the same as the floor, taxel for taxel.
//   5: with the accelerometer, wall A STILL matches the floor (equivalence principle). v0 expected
//      "wall B differs" here, but v0's wall B was a body force the accelerometer formula ignored,
//      which no real stimulus does; that check was retired with the old wall B.
//   6: squeeze (new wall B) vs rest: one patch vs two, and the skin alone tells them apart
//      (patch count, and net skin force m·g vs ~0); the accelerometer reads ~0 for the squeeze.
export function runEquivalenceTest(RAPIER, { gravity = 9.81, mass = 1, skin = {} } = {}) {
  const base = { gravity, mass, tiltDeg: 0, restitution: 0, lockRotation: true };
  const floor = settle(RAPIER, { ...base, mode: 'floor' }, skin);
  const wallA = settle(RAPIER, { ...base, mode: 'wallA' }, skin);
  const wallB = settle(RAPIER, { ...base, mode: 'wallB' }, skin);
  const accelTol = TOL.accelFracOfG * Math.max(gravity, 1e-9);
  const result = { gravity, mass, floor, wallA, wallB, rows: {} };
  for (const [name, w] of [['wallA', wallA], ['wallB', wallB]]) {
    const tactile = compareTactile(floor, w);
    const accel = compareAccel(floor, w);
    result.rows[name] = {
      tactile,
      accel,
      patches: [floor.summary.patchCount, w.summary.patchCount],
      skinForceMagnitude: [floor.summary.skinForceMagnitude, w.summary.skinForceMagnitude],
      tactileMatches: tactile.relL2 < TOL.tactileRelL2,
      accelMatches: accel.diffNorm < accelTol,
    };
  }
  const B = result.rows.wallB;
  result.verdicts = {
    cond4: result.rows.wallA.tactileMatches,
    cond5: result.rows.wallA.accelMatches,
    cond6: floor.summary.patchCount === 1 && wallB.summary.patchCount === 2
      && Math.hypot(wallB.accel.x, wallB.accel.y, wallB.accel.z) < accelTol
      && !B.tactileMatches,
  };
  return result;
}
