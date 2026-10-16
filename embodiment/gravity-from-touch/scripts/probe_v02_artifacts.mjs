// v0.2 Task 0a/0b probes (report only, no fixes):
//   0a  phantom shear: solver settings, derived shear at rest (flat, 30°), drop transient
//   0b  rim-wedge indeterminacy at 50°: floor μ = 0 vs 1, placed vs slid in, 20 s settle;
//       friction-cone flags over all v0.1 conditions
//   node scripts/probe_v02_artifacts.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS } from '../src/sim.js';

await RAPIER.init();
const mag = (v) => Math.hypot(v.x, v.y, v.z);
const f = (v, d = 4) => v.toFixed(d);
const shearOf = (r) => r.contacts.reduce((a, c) => ({ x: a.x + c.tangent.x, y: a.y + c.tangent.y, z: a.z + c.tangent.z }), { x: 0, y: 0, z: 0 });

// ---- 0a: settings ------------------------------------------------------------------------
console.log('== 0a. Solver settings that could feed phantom shear');
{
  const sim = createSim(RAPIER);
  const b = sim.sphereBody, ip = sim.world.integrationParameters;
  console.log(`  sphere: linearDamping=${b.linearDamping()} angularDamping=${b.angularDamping()} ccd=${b.isCcdEnabled()}` +
    ` sleeping=${b.isSleeping()} (created with setCanSleep(false)) rotationsLocked=${sim.params().lockRotation}`);
  console.log(`  world: dt=${f(ip.dt, 6)} numSolverIterations=${ip.numSolverIterations} numInternalPgsIterations=${ip.numInternalPgsIterations}` +
    ` contact_erp=${f(ip.contact_erp, 4)} normalizedAllowedLinearError=${ip.normalizedAllowedLinearError}` +
    ` normalizedPredictionDistance=${ip.normalizedPredictionDistance} lengthUnit=${ip.lengthUnit} maxCcdSubsteps=${ip.maxCcdSubsteps}`);
  sim.free();
}

console.log('\n== 0a. Derived shear at rest, 1 s after a 5 s settle');
for (const [label, params, expectT, expectN] of [
  ['flat floor', { tiltDeg: 0 }, 0, 9.81],
  ['30° tilt', { tiltDeg: 30 }, 9.81 * Math.sin(Math.PI / 6), 9.81 * Math.cos(Math.PI / 6)],
]) {
  const sim = createSim(RAPIER, params);
  let maxT = 0, sumT = 0, sumN = 0, maxDevN = 0;
  for (let i = 0; i < 360; i++) {
    const r = sim.step();
    if (i < 300) continue;
    const t = mag(shearOf(r)), n = r.contacts.reduce((a, c) => a + c.force, 0);
    maxT = Math.max(maxT, Math.abs(t - expectT)); sumT += t; sumN += n; maxDevN = Math.max(maxDevN, Math.abs(n - expectN));
  }
  console.log(`  ${label.padEnd(10)} mean |shear| ${f(sumT / 60, 6)} N (expect ${f(expectT, 4)}), max |shear − expected| ${maxT.toExponential(2)} N;` +
    ` mean normal ${f(sumN / 60, 6)} N (expect ${f(expectN, 4)}), max dev ${maxDevN.toExponential(2)} N`);
  sim.free();
}

console.log('\n== 0a. Drop from 0.2 m onto a flat floor: transient shear spike');
{
  const sim = createSim(RAPIER, { tiltDeg: 0 });
  sim.resetSphere(0.2);
  let peak = 0, peakT = 0, first = null, last = null, touch = null, peakN = 0;
  for (let i = 0; i < 180; i++) {
    const r = sim.step();
    const t = mag(shearOf(r)), n = r.contacts.reduce((a, c) => a + c.force, 0);
    if (touch === null && n > 0) touch = r.t;
    peakN = Math.max(peakN, n);
    if (t > peak) { peak = t; peakT = r.t; }
    if (t > 1e-3) { if (first === null) first = r.t; last = r.t; }
  }
  console.log(`  first contact at t=${f(touch, 3)} s, peak normal ${f(peakN, 2)} N;` +
    ` peak |shear| ${peak.toExponential(3)} N at t=${f(peakT, 3)} s;` +
    ` |shear| > 1e-3 N ${first === null ? 'never' : `from ${f(first, 3)} to ${f(last, 3)} s (${Math.round((last - first) * 60) + 1} steps)`}`);
  sim.free();
}

// ---- 0b: rim wedge -------------------------------------------------------------------------
const W = 9.81, A50 = (50 * Math.PI) / 180;
console.log('\n== 0b. Rim wedge at 50° (rim face ⟂ floor, rim height 0.6 m, rim μ = 1; Min combine rule)');
console.log(`  frictionless-floor prediction: rim normal = m·g·sin50° = ${f(W * Math.sin(A50))} N`);
function wedge(label, params, how, seconds) {
  const sim = createSim(RAPIER, { tiltDeg: 50, ...params });
  if (how === 'placed') sim.placeAgainstRim();
  const report = [];
  let r;
  for (let i = 1; i <= seconds * 60; i++) {
    r = sim.step();
    if (i === 5 * 60 || i === seconds * 60) {
      const rim = r.contacts.find((c) => c.surface === 'rim'), fl = r.contacts.find((c) => c.surface === 'floor');
      report.push(`t=${String(i / 60).padStart(2)} s: rim N ${rim ? f(rim.force, 3) : '—'} |t| ${rim ? f(rim.shearMagnitude, 3) : '—'}` +
        ` | floor N ${fl ? f(fl.force, 3) : '—'} |t| ${fl ? f(fl.shearMagnitude, 3) : '—'}` +
        ` | cone violations ${r.contacts.filter((c) => c.coneViolation).map((c) => c.surface).join(',') || 'none'}`);
    }
  }
  const v = mag(sim.sphereBody.linvel());
  console.log(`  ${label}\n    ${report.join('\n    ')}  |v|=${v.toExponential(1)}`);
  sim.free();
}
wedge('floor μ = 0, rim μ = 1, placed at rest against the rim', { floorFriction: 0 }, 'placed', 20);
wedge('floor μ = 0, rim μ = 0, placed at rest against the rim', { floorFriction: 0, rimFriction: 0 }, 'placed', 20);
wedge('floor μ = 1, rim μ = 1, (i) placed at rest against the rim', {}, 'placed', 20);
wedge('floor μ = 1, rim μ = 1, (ii) slid in from the floor centre', {}, 'slid', 20);
wedge('floor μ = 1, rim μ = 0, (i) placed', { rimFriction: 0 }, 'placed', 20);
wedge('floor μ = 1, rim μ = 0, (ii) slid in', { rimFriction: 0 }, 'slid', 20);
console.log(`  admissible rim normal, floor μ_f and rim μ_r (static): if rim frictionless, m·g·sin50° ± μ_f·m·g·cos50° = [${f(W * Math.sin(A50) - W * Math.cos(A50))}, ${f(W * Math.sin(A50) + W * Math.cos(A50))}] N;`);
console.log('  with μ_f = μ_r = 1 the two 45° friction cones span the 90° wedge, so it can self-lock and the range has no upper bound');

// ---- 0b: friction-cone flags over all conditions ------------------------------------------
console.log('\n== 0b. Friction-cone flags (|shear| > μ·N + 1e-4 N) over every step of the v0.1 conditions');
const conds = [];
for (const t of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) conds.push([`floor tilt ${t}°`, { tiltDeg: t }]);
for (const g of [2, 4.905, 19.62]) conds.push([`floor g=${g}`, { gravity: g }]);
conds.push(['floor 2 kg', { mass: 2 }], ['floor 4 kg g=4.905', { mass: 4, gravity: 4.905 }], ['floor g=0', { gravity: 0 }]);
conds.push(['wallA', { mode: 'wallA' }], ['wallB', { mode: 'wallB' }], ['wallB 2.5 kg g=3.71', { mode: 'wallB', mass: 2.5, gravity: 3.71 }]);
conds.push(['floor 50° (slide)', { tiltDeg: 50 }], ['free fall', { mode: 'free' }]);
let anyViolation = false;
for (const [label, params] of conds) {
  const sim = createSim(RAPIER, params);
  let steps = 0, viol = 0, worst = 0;
  for (let i = 0; i < 360; i++) {
    const r = sim.step();
    for (const c of r.contacts) {
      steps++;
      if (c.coneViolation) { viol++; worst = Math.max(worst, c.shearMagnitude - c.mu * c.force); }
    }
  }
  if (viol) anyViolation = true;
  console.log(`  ${label.padEnd(22)} contact-steps ${String(steps).padStart(4)}  violations ${String(viol).padStart(3)}${viol ? `  worst excess ${worst.toExponential(2)} N` : ''}`);
  sim.free();
}
console.log(anyViolation ? '  → violations present (see above)' : '  → no violations');
