// Headless verification of conditions 1–9 (+2b), the v0.2 leak audit and friction-cone flags.
// Exits non-zero if any check fails.
//   node scripts/verify_conditions.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { settle, compareTactile, runEquivalenceTest, TOL } from '../src/experiments.js';
import { createSim } from '../src/sim.js';
import { angleDeg, toBody, seededOrientations, spreadDownOrientations, norm, sub } from '../src/orient.js';
import { runScene, SCENES, nullEstimator, buildSuite } from '../src/eval.js';
import { buildObservation, validateObservation } from '../src/observe.js';

await RAPIER.init();
let failures = 0;
const check = (ok, msg) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };
const f = (v, d = 4) => (v === null || v === undefined ? '—' : v.toFixed(d));
const angleBetween = angleDeg; // atan2-based: stable near 0° (acos inflates float rounding)
const base = { mode: 'floor', gravity: 9.81, mass: 1, tiltDeg: 0, restitution: 0, lockRotation: true };

console.log('\nCondition 1 — floor tilt: contact patch moves across the body');
console.log('  tilt°   CoP dir (body)               angle from body −y   expected   force     m·g·cosθ');
for (const tilt of [-40, -20, 0, 20, 40]) {
  const r = settle(RAPIER, { ...base, tiltDeg: tilt });
  const d = r.summary.centerOfPressureDir;
  const a = (tilt * Math.PI) / 180;
  const expectedDir = { x: Math.sin(a), y: -Math.cos(a), z: 0 }; // −(floor normal); body frame = world (rotation locked)
  const fromDown = angleBetween(d, { x: 0, y: -1, z: 0 });
  const err = angleBetween(d, expectedDir);
  const expF = 9.81 * Math.cos(a);
  console.log(`  ${String(tilt).padStart(4)}   [${f(d.x, 3)}, ${f(d.y, 3)}, ${f(d.z, 3)}]`.padEnd(40) +
    `${f(fromDown, 2).padStart(8)}°        ${String(Math.abs(tilt)).padStart(3)}°    ${f(r.summary.totalForce)}   ${f(expF)}`);
  check(err < 2 && Math.abs(r.summary.totalForce - expF) < 1e-3 * expF,
    `tilt ${tilt}°: CoP within 2° of −floor normal (err ${f(err, 2)}°), force = m·g·cosθ`);
}

console.log('\nCondition 2 — gravity magnitude: same patch, scaled pressure');
const ref = settle(RAPIER, base);
for (const g of [2, 4.905, 19.62]) {
  const r = settle(RAPIER, { ...base, gravity: g });
  const k = g / 9.81;
  const scaled = { ...ref, taxels: ref.taxels.map((p) => p * k) };
  const cmp = compareTactile(scaled, r);
  const cop = angleBetween(ref.summary.centerOfPressureDir, r.summary.centerOfPressureDir);
  console.log(`  g=${String(g).padEnd(6)} total ${f(r.summary.totalForce)} N  CoP shift ${f(cop, 3)}°  ` +
    `area ${r.summary.contactArea.taxels} vs ${ref.summary.contactArea.taxels} taxels  taxels vs ${f(k, 3)}×ref: relL2 ${cmp.relL2.toExponential(2)}`);
  check(cop < 0.5 && cmp.relL2 < TOL.tactileRelL2, `g=${g}: same patch location, pressure scaled by g`);
}

console.log('\nCondition 2b — mass/gravity confound: same m·g → same skin');
{
  const a = settle(RAPIER, { ...base, mass: 2, gravity: 9.81 });
  const b = settle(RAPIER, { ...base, mass: 4, gravity: 4.905 });
  const cmp = compareTactile(a, b);
  console.log(`  (2 kg, 9.81) vs (4 kg, 4.905): relL2 ${cmp.relL2.toExponential(2)}, ΔF ${cmp.totalForceDiff.toExponential(2)} N`);
  console.log(`  accelerometer |a|: ${f(Math.hypot(a.accel.x, a.accel.y, a.accel.z), 3)} vs ${f(Math.hypot(b.accel.x, b.accel.y, b.accel.z), 3)} m/s² (separates them)`);
  check(cmp.relL2 < TOL.tactileRelL2, 'skin cannot distinguish mass from gravity at equal m·g');
}

console.log('\nCondition 3 — zero gravity: all taxels silent');
{
  const r = settle(RAPIER, { ...base, gravity: 0 });
  const max = Math.max(...r.taxels);
  console.log(`  max taxel ${max} N, total ${r.summary.totalForce} N, active ${r.summary.contactArea.taxels}`);
  check(max === 0, 'all taxels exactly zero');
}

const vecStr = (v, d = 3) => (v ? `[${f(v.x, d)}, ${f(v.y, d)}, ${f(v.z, d)}]` : '—');
const mag = (v) => Math.hypot(v.x, v.y, v.z);
const unit = (v) => { const l = mag(v); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const neg = (v) => ({ x: -v.x, y: -v.y, z: -v.z });

for (const [g, m] of [[9.81, 1], [3.71, 2.5]]) {
  console.log(`\nConditions 4, 5 & 6 — rest vs zero-g walls (g=${g}, m=${m})`);
  const eq = runEquivalenceTest(RAPIER, { gravity: g, mass: m });
  const show = (name, r) => {
    const s = r.summary;
    console.log(`  ${name.padEnd(6)} patches=${s.patchCount}  F_normal=${f(s.totalForce)}  |skin force|=${f(s.skinForceMagnitude)}` +
      `  CoP=${vecStr(s.centerOfPressureDir)}  accel(body)=${vecStr(r.accel)}`);
    if (s.patchCount > 1) s.patches.forEach((p, k) => console.log(`         patch ${k + 1}: ${p.taxels} taxels, ${f(p.force)} N at ${vecStr(p.direction)}`));
  };
  show('floor', eq.floor); show('wallA', eq.wallA); show('wallB', eq.wallB);
  for (const name of ['wallA', 'wallB']) {
    const row = eq.rows[name];
    console.log(`  floor vs ${name}: tactile relL2 ${row.tactile.relL2.toExponential(2)}, shear L2 ${row.tactile.shearL2.toExponential(2)} N,` +
      ` patches ${row.patches.join(' vs ')}; accel |Δ| ${f(row.accel.diffNorm, 4)} m/s²`);
  }
  check(eq.verdicts.cond4, 'cond 4, wall A: tactile (pressure) matches floor');
  // Condition 5's criterion changed in v0.1: the honest wall (A) is the only zero-g case meant to
  // mimic the floor, and its accelerometer must MATCH (equivalence principle). The v0 check
  // "wall B accelerometer differs" relied on a body force the accelerometer formula ignored.
  check(eq.verdicts.cond5, 'cond 5, wall A: accelerometer also matches (equivalence principle)');
  check(eq.verdicts.cond6, 'cond 6, squeeze: floor 1 patch vs wall B 2 patches, skin alone differs, wall B accelerometer ≈ 0');
}

console.log('\nCondition 7 — true "down": normal-only CoP vs full skin force vector (rotation locked, μ = 1)');
console.log('  tilt°   true down (body)        CoP err°   skin-vector err°   |skin force|   m·g');
for (const tilt of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) {
  const r = settle(RAPIER, { ...base, tiltDeg: tilt });
  const down = unit(r.gravityBody);
  const s = r.summary;
  const errCop = angleBetween(s.centerOfPressureDir, down);
  const errVec = angleBetween(neg(s.skinForceDir), down);
  console.log(`  ${String(tilt).padStart(4)}   ${vecStr(down)}`.padEnd(32) + `${f(errCop, 2).padStart(8)}   ${f(errVec, 4).padStart(14)}   ${f(s.skinForceMagnitude).padStart(12)}   ${f(9.81)}`);
  check(errVec < 2 && Math.abs(s.skinForceMagnitude - 9.81) < 1e-3 * 9.81,
    `tilt ${tilt}°: skin vector within 2° of true down (${f(errVec, 4)}°), magnitude m·g`);
  check(Math.abs(errCop - Math.abs(tilt)) < 2, `tilt ${tilt}°: normal-only CoP error ≈ tilt (${f(errCop, 2)}°)`);
}
{
  // 50° is past the friction angle (atan μ = 45°): no equilibrium, the sphere slides. Recorded, not judged.
  const r = settle(RAPIER, { ...base, tiltDeg: 50 }, {}, { settleSteps: 30, avgSteps: 60 });
  const down = unit(r.gravityBody);
  const s = r.summary;
  const a = (50 * Math.PI) / 180;
  console.log(`  50° (sliding, averaged over 0.5–1.5 s):`);
  console.log(`    CoP err ${f(angleBetween(s.centerOfPressureDir, down), 2)}°, skin-vector err ${f(angleBetween(neg(s.skinForceDir), down), 2)}°,` +
    ` |skin force| ${f(s.skinForceMagnitude)} N (m·g = 9.81)`);
  console.log(`    Coulomb sliding prediction: |F| = m·g·cos50°·√(1+μ²) = ${f(9.81 * Math.cos(a) * Math.SQRT2)} N, tilted atan(μ) = 45° from the normal → err 5°;` +
    ` accelerometer |a| = ${f(mag(r.accel))} (prediction ${f(9.81 * Math.cos(a) * Math.SQRT2)})`);
}

// ---------------------------------------------------------------- v0.2 additions
console.log('\nCondition 8 — free fall (g = 9.81, no contacts) vs. g = 0 (condition 3) vs. squeeze (condition 6)');
{
  const sim = createSim(RAPIER, { mode: 'free' });
  let maxA = 0, maxU = 0, maxV = 0, anyContact = false;
  for (let i = 0; i < 360; i++) {
    const r = sim.step();
    maxA = Math.max(maxA, norm(r.accel));
    maxU = Math.max(maxU, norm(r.unassignedContactForce));
    maxV = Math.max(maxV, norm(sim.sphereBody.linvel()));
    if (r.contacts.length) anyContact = true;
  }
  sim.free();
  const ff = settle(RAPIER, { mode: 'free' });
  const g0 = settle(RAPIER, { ...base, gravity: 0 });
  const sq = settle(RAPIER, { mode: 'wallB' });
  console.log('  case        patches  |skin force|  |accel| (1 s mean)');
  for (const [n, r] of [['g = 0', g0], ['free fall', ff], ['squeeze', sq]]) {
    console.log(`  ${n.padEnd(10)}  ${String(r.summary.patchCount).padStart(7)}  ${f(r.summary.skinForceMagnitude).padStart(12)}  ${norm(r.accel).toExponential(2)}`);
  }
  // float32 bound: Rapier stores velocity as float32; one ulp at the final speed, differentiated
  // over dt, sets the floor on |Δv/Δt − g|. Brief 004 asked for ≤ 1e-6, which float32 cannot meet
  // once the body is moving; that criterion is reported, and the float32 bound is what is checked.
  const f32Bound = 4 * (maxV * 2 ** -23) * 60;
  console.log(`  over 6 s: max |accel| ${maxA.toExponential(2)} m/s², max |unassigned| ${maxU.toExponential(2)} N, speed reached ${f(maxV, 2)} m/s;` +
    ` float32 bound 4·ulp(|v|)/dt = ${f32Bound.toExponential(2)}`);
  console.log(`  brief-004 criterion |accel| ≤ 1e-6 and |unassigned| ≤ 1e-6: ${maxA <= 1e-6 && maxU <= 1e-6 ? 'met' : 'NOT met (float32 limit, see above)'}`);
  check(!anyContact && Math.max(...ff.taxels) === 0, 'cond 8: no contacts and all taxels exactly 0 in free fall');
  check(maxA <= f32Bound && maxU <= f32Bound, 'cond 8: |accel| and |unassigned| within the float32 bound');
  check(ff.summary.patchCount === 0 && g0.summary.patchCount === 0 && sq.summary.patchCount === 2,
    'cond 8: free fall ≡ g = 0 (0 patches, |a| ≈ 0); squeeze differs only by its 2 patches');
}

console.log('\nCondition 9 — equivariance: seeded random body orientation (rotation locked after spawn)');
{
  const orients = seededOrientations(8, 1009);
  const scenes = [
    ['tilt -40°', { ...base, tiltDeg: -40 }], ['tilt 0°', base], ['tilt 30°', { ...base, tiltDeg: 30 }],
    ['g 2', { ...base, gravity: 2 }], ['g 19.62', { ...base, gravity: 19.62 }],
    ['2 kg', { ...base, mass: 2 }], ['4 kg, g 4.905', { ...base, mass: 4, gravity: 4.905 }], ['g 0', { ...base, gravity: 0 }],
    ['wall A', { mode: 'wallA' }], ['squeeze', { mode: 'wallB' }], ['free fall', { mode: 'free' }],
    ['slide 50°', { ...base, tiltDeg: 50 }],
  ];
  // Every run's CoP and patch directions carry their own taxel quantisation (≤ ~1.4°), so a rotated
  // run vs. the unrotated run can differ by up to twice that. Brief 004's pairwise 1.5° criterion is
  // reported; the check is each run's directions against the true contact direction (truth side).
  let worstVec = 0, worstPair = 0, worstTruth = 0, countMismatch = 0;
  for (const [label, p] of scenes) {
    const opts = label.startsWith('slide') ? { settleSteps: 30, avgSteps: 60 } : {};
    const ref = settle(RAPIER, p, {}, opts);
    let lw = 0, lp = 0, lt = 0;
    for (const q of [null, ...orients]) {
      const r = q ? settle(RAPIER, { ...p, bodyRotation: q }, {}, opts) : ref;
      if (q) {
        for (const [a, b] of [[r.summary.skinForce, ref.summary.skinForce], [r.accel, ref.accel]]) {
          const e = toBody(q, b);
          lw = Math.max(lw, norm(sub(a, e)) / Math.max(norm(e), 1));
        }
        if (r.summary.patchCount !== ref.summary.patchCount) countMismatch++;
        for (const pp of ref.summary.patches) { // match patches by direction, not by force order
          const e = toBody(q, pp.direction);
          lp = Math.max(lp, Math.min(...r.summary.patches.map((rp) => angleDeg(rp.direction, e))));
        }
      }
      const truthDirs = Object.values(r.contactDirsBody);
      for (const rp of r.summary.patches) lt = Math.max(lt, Math.min(...truthDirs.map((d) => angleDeg(rp.direction, d))));
    }
    worstVec = Math.max(worstVec, lw); worstPair = Math.max(worstPair, lp); worstTruth = Math.max(worstTruth, lt);
    console.log(`  ${label.padEnd(14)} skin force & accel rel err ${lw.toExponential(2)}   patch dir: rotated vs. unrotated Δ ${f(lp, 3)}°, vs. true contact ≤ ${f(lt, 3)}°`);
  }
  console.log(`  brief-004 pairwise criterion (CoP Δ ≤ 1.5°): ${worstPair <= 1.5 ? 'met' : `NOT met, worst ${f(worstPair, 3)}° (two quantisation errors add)`}`);
  check(worstVec <= 1e-6, `cond 9: skin force vector and accelerometer equivariant, worst relative error ${worstVec.toExponential(2)} (≤ 1e-6)`);
  check(countMismatch === 0, `cond 9: patch count unchanged under rotation (${countMismatch} mismatches)`);
  check(worstTruth <= 1.5, `cond 9: every patch direction within 1.5° of its true contact direction, all orientations (worst ${f(worstTruth, 3)}°)`);
}

console.log('\nLeak audit — observation API');
{
  const items = buildSuite(RAPIER, { orientations: 3 });
  const problems = items.flatMap((it) => validateObservation(it.obs));
  check(problems.length === 0, `schema whitelist over ${items.length} observations (${problems.length} problems)`);
  const leaky = { ...items[0].obs, scene: 'tilt0' };
  check(validateObservation(leaky).length > 0, 'schema test rejects an observation carrying a scene field');
  let sumErr = 0;
  const audit = spreadDownOrientations(48);
  for (const q of audit) {
    const run = runScene(RAPIER, SCENES[0], q, { settleSteps: 60, recordSteps: 60 });
    sumErr += angleDeg(nullEstimator(buildObservation(run.steps, { mask: 'PSA' }), 'Q1').value, run.truth.apparentDown);
  }
  const mean = sumErr / audit.length;
  check(Math.abs(mean - 90) <= 10, `constant down-guess scores ${f(mean, 2)}° mean error over 48 spread orientations (90° ± 10°)`);
}

console.log('\nFriction-cone flags — |shear| > μ·N + 1e-4 N, every contact, every step');
{
  const scenes = [...[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((t) => ({ ...base, tiltDeg: t })),
    { ...base, gravity: 2 }, { ...base, gravity: 19.62 }, { ...base, mass: 2 }, { ...base, mass: 4, gravity: 4.905 },
    { mode: 'wallA' }, { mode: 'wallB' }, { ...base, tiltDeg: 50 }];
  let viol = 0, contactSteps = 0;
  for (const p of scenes) {
    const sim = createSim(RAPIER, p);
    for (let i = 0; i < 360; i++) for (const c of sim.step().contacts) { contactSteps++; if (c.coneViolation) viol++; }
    sim.free();
  }
  check(viol === 0, `no friction-cone violations (${viol} in ${contactSteps} contact-steps)`);
}

// ---------------------------------------------------------------- v0.3 action probes (011, Task 1)
console.log('\nv0.3 action probes — body thrust (push) bookkeeping, determinism, lift-off');
{
  const qa = seededOrientations(1, 31337)[0];
  const tShear = (r) => r.contacts.reduce((a, c) => ({ x: a.x + c.tangent.x, y: a.y + c.tangent.y, z: a.z + c.tangent.z }), { x: 0, y: 0, z: 0 });
  // 1a: free fall + 5 N thrust → inner = 5 along the thrust, no contact force; floor + 3 N tangential → shear −3 N, inner unchanged.
  {
    const sim = createSim(RAPIER, { mode: 'free', bodyRotation: qa });
    for (let i = 0; i < 30; i++) sim.step();
    sim.push({ x: 1, y: 0, z: 0 }, 5, 60);
    let e = 0, u = 0, vmax = 0;
    for (let i = 0; i < 60; i++) { const r = sim.step(); e = Math.max(e, norm(sub(r.accel, { x: 5, y: 0, z: 0 }))); u = Math.max(u, norm(r.unassignedContactForce)); vmax = Math.max(vmax, norm(sim.sphereBody.linvel())); }
    const bound = 4 * (vmax * 2 ** -23) * 60;
    check(e <= bound && u <= bound, `1a: free fall + 5 N thrust reads inner = 5 along the thrust (error ${e.toExponential(1)}), no contact force (${u.toExponential(1)} N); float32 bound ${bound.toExponential(1)}`);
    sim.free();
  }
  {
    const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: qa });
    let before; for (let i = 0; i < 300; i++) before = sim.step();
    sim.push(toBody(qa, { x: 1, y: 0, z: 0 }), 3, 60);
    let es = 0, ei = 0;
    for (let i = 0; i < 60; i++) { const r = sim.step(); es = Math.max(es, norm(sub(tShear(r), { x: -3, y: 0, z: 0 }))); ei = Math.max(ei, norm(sub(r.accel, before.accel))); }
    check(es <= 1e-3 && ei <= 1e-4, `1a: floor + 3 N tangential thrust at rest: shear = −3 N opposing (error ${es.toExponential(1)} N), inner unchanged (${ei.toExponential(1)})`);
    sim.free();
  }
  // 1b: the same action sequence twice gives bit-identical observations.
  {
    const run = () => {
      const sim = createSim(RAPIER, { tiltDeg: 40, bodyRotation: qa, floorSize: 400 });
      const out = [];
      for (let i = 0; i < 300; i++) sim.step();
      for (const [d, n, fr] of [[{ x: 0, y: 1, z: 0 }, 20, 30], [{ x: 1, y: 0, z: 0 }, 2, 30], [{ x: 0, y: 0, z: 1 }, 12, 20]]) {
        sim.push(toBody(qa, d), n, fr);
        for (let i = 0; i < fr + 30; i++) { const r = sim.step(); out.push([r.accel.x, r.accel.y, r.accel.z, ...r.contacts.map((c) => c.force)].join(',')); }
      }
      sim.free();
      return out.join(';');
    };
    check(run() === run(), '1b: the same action sequence twice gives bit-identical readings (resume = deterministic replay)');
  }
  // 1c: lift-off — inner = thrust/m while airborne and pushing, 0 after the cut; landing has no shear spike.
  {
    const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: qa });
    for (let i = 0; i < 300; i++) sim.step();
    const up = toBody(qa, { x: 0, y: 1, z: 0 });
    sim.push(up, 20, 30);
    let ep = 0, ec = 0, air = false, landed = false, landShear = 0, vmax = 0;
    for (let i = 0; i < 240; i++) {
      const r = sim.step(); const inC = r.contacts.some((c) => c.force > 0);
      vmax = Math.max(vmax, norm(sim.sphereBody.linvel()));
      if (!inC) { air = true; if (i < 30) ep = Math.max(ep, norm(sub(r.accel, { x: 20 * up.x, y: 20 * up.y, z: 20 * up.z }))); else if (i > 30) ec = Math.max(ec, norm(r.accel)); }
      if (inC && air) { landed = true; landShear = Math.max(landShear, norm(tShear(r))); }
    }
    const bound = 4 * (vmax * 2 ** -23) * 60;
    check(air && landed && ep <= bound && ec <= bound && landShear <= 1e-3,
      `1c: lift-off at 20 N: inner = thrust/m while pushing (${ep.toExponential(1)}), 0 after the cut (${ec.toExponential(1)}); lands with shear ${landShear.toExponential(1)} N`);
    sim.free();
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
