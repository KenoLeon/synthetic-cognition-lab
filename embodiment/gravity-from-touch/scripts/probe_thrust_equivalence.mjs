// Thrust probe (refactor brief, task 4): does the bench already contain the counterfactual world?
// Can the existing thrust action, in zero gravity, produce touch readings (pressure, shear) that
// match resting under gravity (equivalence principle)? Nothing new is built: floor mode with
// gravity 0, and sim.push() holding m·g along world −y (expressed in the body frame).
// Compared per scene (tilt 0, +20, +40) × the three eval orientations, over the 60 steps after a
// 300-step settle, as the eval scenes are recorded. The inner sense is printed too.
//   node scripts/probe_thrust_equivalence.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS } from '../src/sim.js';
import { createSkin } from '../src/skin.js';
import { captureStep } from '../src/observe.js';
import { seededOrientations, toBody } from '../src/orient.js';
import { TOL } from '../src/experiments.js';

await RAPIER.init();
const G = 9.81, M = 1, SETTLE = 300, REC = 60;

function record(simParams, thrustDirBody) {
  const sim = createSim(RAPIER, simParams);
  const skin = createSkin({ radius: SPHERE_RADIUS });
  if (thrustDirBody) sim.push(thrustDirBody, M * G, SETTLE + REC);
  const steps = [];
  for (let i = 0; i < SETTLE + REC; i++) {
    const s = captureStep(skin, sim.step());
    if (i >= SETTLE) steps.push(s);
  }
  sim.free();
  const mean = (get, n) => { const o = new Float64Array(n); for (const s of steps) { const v = get(s); for (let i = 0; i < n; i++) o[i] += v[i] / REC; } return o; };
  return { steps, P: mean((s) => s.pressure, 200), S: mean((s) => s.shear, 600), A: mean((s) => [s.accel.x, s.accel.y, s.accel.z], 3) };
}
const l2 = (a) => Math.sqrt(a.reduce((x, v) => x + v * v, 0));
const diff = (a, b) => a.map((v, i) => v - b[i]);
const maxAbs = (a) => a.reduce((x, v) => Math.max(x, Math.abs(v)), 0);
const e = (v) => v.toExponential(2);
const v3 = (a) => `[${[...a].map((x) => x.toFixed(3)).join(', ')}]`;

const qs = seededOrientations(3, 2026100802);
let allMatch = true, worstRel = 0, worstStep = 0;
console.log('scene     o  |P| (N)  pressure relL2  max|ΔP| N   shear |S| N  max|ΔS| N   per-step max|ΔP|,|ΔS|  inner: gravity / thrust');
for (const tilt of [0, 20, 40]) {
  qs.forEach((q, oi) => {
    const grav = record({ tiltDeg: tilt, gravity: G, mass: M, bodyRotation: q });
    const thr = record({ tiltDeg: tilt, gravity: 0, mass: M, bodyRotation: q }, toBody(q, { x: 0, y: -1, z: 0 }));
    const dP = diff(thr.P, grav.P), dS = diff(thr.S, grav.S);
    const rel = l2(dP) / l2(grav.P);
    let stepMax = 0;
    grav.steps.forEach((s, i) => { stepMax = Math.max(stepMax, maxAbs(diff(thr.steps[i].pressure, s.pressure)), maxAbs(diff(thr.steps[i].shear, s.shear))); });
    const match = rel < TOL.tactileRelL2;
    allMatch &&= match; worstRel = Math.max(worstRel, rel); worstStep = Math.max(worstStep, stepMax);
    console.log(`tilt${String(tilt).padEnd(4)}  ${oi}  ${l2(grav.P).toFixed(3).padStart(6)}  ${e(rel).padStart(13)}  ${e(maxAbs(dP)).padStart(9)}   ${e(l2(grav.S)).padStart(9)}  ${e(maxAbs(dS)).padStart(9)}   ${e(stepMax).padStart(9)}              ${v3(grav.A)} / ${v3(thr.A)}`);
  });
}
console.log(`\nTouch indistinguishable (pressure relL2 < ${TOL.tactileRelL2}, the bench's tactile tolerance): ${allMatch ? 'YES' : 'NO'} in all 9; worst relL2 ${e(worstRel)}, worst per-step taxel difference ${e(worstStep)} N`);
