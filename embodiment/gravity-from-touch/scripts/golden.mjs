// Golden sensor readings: the refactor's equivalence gate.
// Every step of every case records pressure (200), shear (600) and the inner sense (3), in the body
// frame. Cases: each eval scene × the three seeded orientations (settle + record steps), the three
// equivalence-test conditions (floor, wallA, wallB), and the action sequences of probes 1a–1d.
// Per case the file keeps a SHA-256 of the raw float64 readings (exact match) plus aggregates
// (sums at full precision) that show the size of any difference.
//   node scripts/golden.mjs --write   → eval/golden/readings.json (baseline; run on the pre-refactor code)
//   node scripts/golden.mjs           → compare against it, exit 1 on any mismatch
import RAPIER from '@dimforge/rapier3d-compat';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createSim, SPHERE_RADIUS } from '../src/sim.js';
import { createSkin } from '../src/skin.js';
import { captureStep } from '../src/observe.js';
import { SCENES } from '../src/eval.js';
import { seededOrientations, toBody } from '../src/orient.js';

export const GOLDEN_PATH = 'eval/golden/readings.json';

function recorder() {
  const h = createHash('sha256');
  const agg = { steps: 0, pressure: 0, shear: [0, 0, 0], inner: [0, 0, 0], absPressure: 0, absShear: 0, absInner: 0 };
  return {
    add(s) {
      h.update(Buffer.from(s.pressure.buffer, s.pressure.byteOffset, s.pressure.byteLength));
      h.update(Buffer.from(s.shear.buffer, s.shear.byteOffset, s.shear.byteLength));
      const a = Float64Array.of(s.accel.x, s.accel.y, s.accel.z);
      h.update(Buffer.from(a.buffer));
      agg.steps++;
      for (const p of s.pressure) { agg.pressure += p; agg.absPressure += Math.abs(p); }
      for (let i = 0; i < s.shear.length; i++) { agg.shear[i % 3] += s.shear[i]; agg.absShear += Math.abs(s.shear[i]); }
      agg.inner[0] += a[0]; agg.inner[1] += a[1]; agg.inner[2] += a[2];
      agg.absInner += Math.abs(a[0]) + Math.abs(a[1]) + Math.abs(a[2]);
    },
    done() { return { sha256: h.digest('hex'), ...agg }; },
  };
}

// Step a sim n times, feeding every step's readings to the recorder.
const run = (sim, skin, rec, n) => { for (let i = 0; i < n; i++) rec.add(captureStep(skin, sim.step())); };

export async function computeGolden() {
  await RAPIER.init();
  const cases = {};
  const sk = () => createSkin({ radius: SPHERE_RADIUS });

  // Eval scenes (as src/eval.js runScene and scripts/llm_export.mjs use them).
  const orients = seededOrientations(3, 2026100802);
  for (const scene of SCENES) {
    orients.forEach((q, oi) => {
      const sim = createSim(RAPIER, { ...scene.sim, bodyRotation: q });
      const rec = recorder();
      run(sim, sk(), rec, (scene.settleSteps ?? 300) + 60);
      sim.free();
      cases[`scene:${scene.id}_o${oi}`] = rec.done();
    });
  }

  // Equivalence-test conditions (src/experiments.js runEquivalenceTest).
  for (const mode of ['floor', 'wallA', 'wallB']) {
    const sim = createSim(RAPIER, { gravity: 9.81, mass: 1, tiltDeg: 0, restitution: 0, lockRotation: true, mode });
    const rec = recorder();
    run(sim, sk(), rec, 360);
    sim.free();
    cases[`equivalence:${mode}`] = rec.done();
  }

  // Probes 1a–1d (scripts/probe_v03.mjs), same orientation and action sequences.
  const q = seededOrientations(1, 31337)[0];
  {
    const sim = createSim(RAPIER, { mode: 'free', bodyRotation: q });
    const rec = recorder(), skin = sk();
    run(sim, skin, rec, 30);
    sim.push({ x: 1, y: 0, z: 0 }, 5, 60);
    run(sim, skin, rec, 60);
    sim.free();
    cases['probe1a:free-thrust'] = rec.done();
  }
  {
    const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: q });
    const rec = recorder(), skin = sk();
    run(sim, skin, rec, 300);
    sim.push(toBody(q, { x: 1, y: 0, z: 0 }), 3, 60);
    run(sim, skin, rec, 60);
    sim.free();
    cases['probe1a:floor-tangential-thrust'] = rec.done();
  }
  {
    const SEQ = [
      [{ x: 0, y: 1, z: 0 }, 20, 30], [{ x: 1, y: 0, z: 0 }, 2, 30], [{ x: 0, y: 0, z: 1 }, 12, 20], [{ x: -1, y: 0.5, z: 0 }, 6, 30],
    ];
    const sim = createSim(RAPIER, { tiltDeg: 40, bodyRotation: q, floorSize: 60 });
    const rec = recorder(), skin = sk();
    run(sim, skin, rec, 300);
    for (const [d, n, fr] of SEQ) { sim.push(toBody(q, d), n, fr); run(sim, skin, rec, fr + 30); }
    sim.free();
    cases['probe1b:action-sequence'] = rec.done();
  }
  {
    const sim = createSim(RAPIER, { tiltDeg: 0, bodyRotation: q });
    const rec = recorder(), skin = sk();
    run(sim, skin, rec, 300);
    sim.push(toBody(q, { x: 0, y: 1, z: 0 }), 20, 30);
    run(sim, skin, rec, 240);
    sim.free();
    cases['probe1c:lift-off-landing'] = rec.done();
  }
  for (const [label, tilt, dir] of [
    ['flat', 0, { x: 1, y: 0, z: 0 }],
    ['tilt40-downhill', 40, { x: -Math.cos((40 * Math.PI) / 180), y: -Math.sin((40 * Math.PI) / 180), z: 0 }],
    ['slide50-downhill', 50, { x: -Math.cos((50 * Math.PI) / 180), y: -Math.sin((50 * Math.PI) / 180), z: 0 }],
  ]) {
    for (const floorSize of [6, 60, 200, 400]) {
      const sim = createSim(RAPIER, { tiltDeg: tilt, bodyRotation: q, floorSize });
      const rec = recorder(), skin = sk();
      run(sim, skin, rec, tilt === 50 ? 30 : 300);
      for (let k = 0; k < 6; k++) { sim.push(toBody(q, dir), 20, 30); run(sim, skin, rec, 60); }
      sim.free();
      cases[`probe1d:${label}-floor${floorSize}`] = rec.done();
    }
  }
  return cases;
}

// Compare computed cases with the golden file. Exact: identical SHA-256 of the raw float64 readings.
export function compareGolden(golden, cases) {
  const rows = [];
  for (const [id, g] of Object.entries(golden.cases)) {
    const c = cases[id];
    if (!c) { rows.push({ id, ok: false, why: 'missing' }); continue; }
    const ok = c.sha256 === g.sha256 && c.steps === g.steps;
    const d = Math.max(Math.abs(c.pressure - g.pressure), ...c.shear.map((v, i) => Math.abs(v - g.shear[i])), ...c.inner.map((v, i) => Math.abs(v - g.inner[i])));
    rows.push({ id, ok, steps: c.steps, maxAggDiff: d });
  }
  for (const id of Object.keys(cases)) if (!golden.cases[id]) rows.push({ id, ok: false, why: 'not in golden file' });
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cases = await computeGolden();
  if (process.argv.includes('--write')) {
    mkdirSync('eval/golden', { recursive: true });
    const pkg = JSON.parse(readFileSync('node_modules/@dimforge/rapier3d-compat/package.json', 'utf8'));
    writeFileSync(GOLDEN_PATH, JSON.stringify({ createdAt: new Date().toISOString(), rapier: pkg.version, node: process.version, cases }, null, 2));
    console.log(`wrote ${Object.keys(cases).length} cases to ${GOLDEN_PATH}`);
  } else {
    const rows = compareGolden(JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')), cases);
    for (const r of rows) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}${r.why ? ` (${r.why})` : ` steps ${r.steps}, max aggregate diff ${r.maxAggDiff}`}`);
    const bad = rows.filter((r) => !r.ok).length;
    console.log(`${rows.length - bad}/${rows.length} cases bit-identical`);
    process.exit(bad ? 1 : 0);
  }
}
