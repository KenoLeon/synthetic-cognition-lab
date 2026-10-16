// v0.3 Task 1 probes (planning/011), run before building the action interface:
//   1a thrust bookkeeping   1b pause/resume determinism   1c lift-off and landing   1d rim reach
//   node scripts/probe_v03.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS } from '../src/sim.js';
import { createSkin } from '../src/skin.js';
import { captureStep } from '../src/observe.js';
import { seededOrientations, toBody, norm, sub, angleDeg } from '../src/orient.js';

await RAPIER.init();
const f = (v, d = 4) => v.toFixed(d);
const vs = (v, d = 3) => `[${f(v.x, d)}, ${f(v.y, d)}, ${f(v.z, d)}]`;
const q = seededOrientations(1, 31337)[0]; // a random body orientation, so body and world axes differ
const tangentialShear = (r) => r.contacts.reduce((a, c) => ({ x: a.x + c.tangent.x, y: a.y + c.tangent.y, z: a.z + c.tangent.z }), { x: 0, y: 0, z: 0 });

console.log('== 1a. Thrust bookkeeping');
{
  // Free space, g = 9.81, no contacts: 5 N along a body axis.
  const sim = createSim(RAPIER, { mode: 'free', bodyRotation: q });
  const dir = { x: 1, y: 0, z: 0 };
  for (let i = 0; i < 30; i++) sim.step();
  sim.push(dir, 5, 60);
  let worst = 0, worstU = 0, last;
  for (let i = 0; i < 60; i++) {
    const r = sim.step(); last = r;
    worst = Math.max(worst, norm(sub(r.accel, { x: 5, y: 0, z: 0 })));
    worstU = Math.max(worstU, norm(r.unassignedContactForce));
  }
  const v = norm(sim.sphereBody.linvel());
  console.log(`  free fall + 5 N thrust along body x: inner (raw, body) ${vs(last.accel)} (expect [5, 0, 0]); worst |error| ${worst.toExponential(2)} m/s²;` +
    ` contacts ${last.contacts.length}; derived contact force (unassigned) worst ${worstU.toExponential(2)} N; speed after 1.5 s ${f(v, 2)} m/s`);
  sim.free();
}
{
  // Flat floor at rest, 3 N tangential thrust along world +x.
  const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: q });
  let before;
  for (let i = 0; i < 300; i++) before = sim.step();
  sim.push(toBody(q, { x: 1, y: 0, z: 0 }), 3, 60);
  let maxInnerChange = 0, shear, speed = 0, maxShearErr = 0;
  for (let i = 0; i < 60; i++) {
    const r = sim.step();
    maxInnerChange = Math.max(maxInnerChange, norm(sub(r.accel, before.accel)));
    shear = tangentialShear(r);
    maxShearErr = Math.max(maxShearErr, norm(sub(shear, { x: -3, y: 0, z: 0 })));
    speed = Math.max(speed, norm(sim.sphereBody.linvel()));
  }
  console.log(`  flat floor + 3 N tangential thrust (world +x): shear (world) ${vs(shear)} (expect [-3, 0, 0]), worst |error| ${maxShearErr.toExponential(2)} N;` +
    ` inner change worst ${maxInnerChange.toExponential(2)} m/s²; max speed ${speed.toExponential(1)} m/s`);
  sim.free();
}

// A fixed action sequence used by 1b: (direction in body frame, newtons, frames), each followed by 30 idle frames.
const SEQ = [
  [{ x: 0, y: 1, z: 0 }, 20, 30], [{ x: 1, y: 0, z: 0 }, 2, 30], [{ x: 0, y: 0, z: 1 }, 12, 20], [{ x: -1, y: 0.5, z: 0 }, 6, 30],
];
async function runSeq({ pauses = false } = {}) {
  const sim = createSim(RAPIER, { tiltDeg: 40, bodyRotation: q, floorSize: 60 });
  const skin = createSkin({ radius: SPHERE_RADIUS });
  const out = [];
  for (let i = 0; i < 300; i++) sim.step();
  for (const [d, n, fr] of SEQ) {
    if (pauses) await new Promise((r) => setTimeout(r, 50)); // the agent "thinks": wall time passes, sim time doesn't
    sim.push(toBody(q, d), n, fr);
    for (let i = 0; i < fr + 30; i++) out.push(captureStep(skin, sim.step()));
  }
  sim.free();
  return out;
}
console.log('\n== 1b. Pause and resume');
{
  const a = await runSeq(), b = await runSeq(), c = await runSeq({ pauses: true });
  const same = (x, y) => x.length === y.length && x.every((s, i) => s.pressure.every((p, k) => p === y[i].pressure[k]) &&
    s.shear.every((p, k) => p === y[i].shear[k]) && s.accel.x === y[i].accel.x && s.accel.y === y[i].accel.y && s.accel.z === y[i].accel.z);
  console.log(`  same action sequence twice, fresh sims: ${same(a, b) ? 'bit-identical' : 'DIFFERENT'} (${a.length} steps)`);
  console.log(`  with a wall-clock pause before each action: ${same(a, c) ? 'bit-identical to no pause' : 'DIFFERENT'}`);
  console.log('  design: the sim is stepped only when the agent acts, so a pause adds no steps; an interrupted episode resumes by replaying its logged actions from scratch (deterministic, as above)');
}

console.log('\n== 1c. Lift-off and landing (flat floor, push away from the floor at 20 N for 30 frames, then cut)');
{
  const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: q });
  for (let i = 0; i < 300; i++) sim.step();
  const up = toBody(q, { x: 0, y: 1, z: 0 });
  sim.push(up, 20, 30);
  let pushAir = [], coastAir = [], liftAt = null, landAt = null, peakInner = 0, peakShear = 0, peakN = 0, maxH = 0;
  for (let i = 0; i < 240; i++) {
    const r = sim.step();
    const inContact = r.contacts.some((c) => c.force > 0);
    const h = sim.sphereBody.translation().y - SPHERE_RADIUS; maxH = Math.max(maxH, h);
    if (!inContact && liftAt === null) liftAt = i;
    if (!inContact && i < 30) pushAir.push(r.accel);
    if (!inContact && i >= 31) coastAir.push(r.accel);
    if (inContact && liftAt !== null && landAt === null) landAt = i;
    if (landAt !== null && i <= landAt + 10) {
      peakInner = Math.max(peakInner, norm(r.accel));
      peakShear = Math.max(peakShear, norm(tangentialShear(r)));
      peakN = Math.max(peakN, r.contacts.reduce((a, c) => a + c.force, 0));
    }
  }
  const errPush = Math.max(...pushAir.map((a) => norm(sub(a, { x: up.x * 20, y: up.y * 20, z: up.z * 20 }))));
  const errCoast = Math.max(...coastAir.map((a) => norm(a)));
  console.log(`  lift-off at frame ${liftAt} of the push; airborne frames: ${pushAir.length} pushing, ${coastAir.length} coasting; max height ${f(maxH, 2)} m; landing at frame ${landAt}`);
  console.log(`  inner while airborne and pushing: worst |inner − 20·push dir| ${errPush.toExponential(2)} m/s² (expect thrust/m = 20)`);
  console.log(`  inner while airborne after the cut: worst |inner| ${errCoast.toExponential(2)} m/s² (expect 0, free fall)`);
  console.log(`  landing (first 10 frames): peak |inner| ${f(peakInner, 1)} m/s², peak normal ${f(peakN, 1)} N, peak |shear| ${peakShear.toExponential(2)} N`);
  sim.free();
}

console.log('\n== 1d. Rim reach (worst case: 6 full-effort pushes, 30 frames each + 30 idle, all along the floor)');
for (const [label, tilt, dirFn] of [
  ['flat floor, pushes along world +x', 0, () => ({ x: 1, y: 0, z: 0 })],
  ['40° tilt, pushes downhill', 40, () => ({ x: -Math.cos((40 * Math.PI) / 180), y: -Math.sin((40 * Math.PI) / 180), z: 0 })],
  ['50° slide, pushes downhill', 50, () => ({ x: -Math.cos((50 * Math.PI) / 180), y: -Math.sin((50 * Math.PI) / 180), z: 0 })],
]) {
  for (const floorSize of [6, 60, 200, 400]) {
    const sim = createSim(RAPIER, { tiltDeg: tilt, bodyRotation: q, floorSize });
    const settle = tilt === 50 ? 30 : 300;
    for (let i = 0; i < settle; i++) sim.step();
    const p0 = sim.sphereBody.translation();
    let rim = false, maxD = 0;
    for (let k = 0; k < 6; k++) {
      sim.push(toBody(q, dirFn()), 20, 30);
      for (let i = 0; i < 60; i++) {
        const r = sim.step();
        if (r.contacts.some((c) => c.surface === 'rim')) rim = true;
        const p = sim.sphereBody.translation();
        maxD = Math.max(maxD, Math.hypot(p.x - p0.x, p.z - p0.z));
      }
    }
    console.log(`  ${label.padEnd(36)} floor half-size ${String(floorSize).padStart(2)} m: max horizontal travel ${f(maxD, 1)} m, rim contact: ${rim ? 'YES' : 'no'}`);
    sim.free();
  }
}
