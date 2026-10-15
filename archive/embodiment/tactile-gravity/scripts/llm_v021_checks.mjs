// v0.2.1 follow-up checks requested in planning/011 (Part A, B.3, B.5). Read-only analysis of the
// logged v3 runs; prints the numbers used in the report fixes.
//   node scripts/llm_v021_checks.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync, existsSync } from 'node:fs';
import { SCENES, runScene } from '../src/eval.js';
import { buildObservation } from '../src/observe.js';
import { seededOrientations, angleDeg, neg, unit } from '../src/orient.js';
import { parseAnswer, bucketQ1b, labelQ1a, labelV2, scoreV2, patchesFromObservation } from '../src/llm.js';

await RAPIER.init();
const D = 'eval/llm/v3', M = 'gemini-3.5-flash-lite';
const read = (dir, id) => {
  const p = `${dir}/${id}.json`; if (!existsSync(p)) return null;
  const l = JSON.parse(readFileSync(p, 'utf8')); if (l.httpStatus !== 200) return null;
  return JSON.parse(l.response.candidates[0].content.parts.filter((x) => !x.thought).map((x) => x.text).join(''));
};
const truthOf = (id) => JSON.parse(readFileSync(`${D}/truth/${id}.json`, 'utf8'));
const lines = (f) => readFileSync(`${D}/${f}`, 'utf8').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean);
const task2 = lines('task2-ids.txt');

// (A4) Q1a misses on answerable items
console.log('== Q1a misses (answerable direction, error > 2°)');
for (const id of task2) {
  const t = truthOf(id), raw = read(`${D}/logs/${M}`, id);
  const lab = labelQ1a(t.mask, t.truth); if (lab.kind !== 'dir') continue;
  const a = parseAnswer('Q1a', raw);
  const err = a.kind === 'dir' ? angleDeg(a.value, lab.value) : null;
  if (err === null || err > 2) {
    const flipErr = a.kind === 'dir' ? angleDeg(a.value, neg(lab.value)) : null;
    console.log(`  ${id}: answer ${JSON.stringify(raw.Q1a)}; error ${err?.toFixed(1)}° from push, ${flipErr?.toFixed(1)}° from its opposite (apparent down)`);
  }
}

// (A3) Q1b buckets per run, stability items
console.log('\n== Q1b buckets per run, 24 stability items');
const stab = lines('stability-ids.txt');
const runs = [`${D}/logs/${M}`, `${D}/logs/${M}-rep2`, `${D}/logs/${M}-rep3`];
const per = runs.map((dir) => {
  const c = { right: 0, flipped: 0, otherVec: 0, cannot: 0, noneZero: 0, noneLoaded: 0 };
  for (const id of stab) {
    const raw = read(dir, id); const t = truthOf(id);
    const b = bucketQ1b(parseAnswer('Q1b', raw), t.truth, raw.Q4);
    if (b.bucket === 'vector') c[b.verdict === 'right' ? 'right' : b.verdict === 'flipped' ? 'flipped' : 'otherVec']++;
    else if (b.bucket === 'cannot') c.cannot++;
    else if (b.bucket === 'none') c[b.zeroLoad ? 'noneZero' : 'noneLoaded']++;
  }
  return c;
});
for (const k of Object.keys(per[0])) console.log(`  ${k.padEnd(11)} runs: ${per.map((c) => c[k]).join(' / ')}  range ${Math.min(...per.map((c) => c[k]))}–${Math.max(...per.map((c) => c[k]))}`);

// (A5) over-claim denominators per run
console.log('\n== Over-claims on Q2, Q2b, Q3, Q4 per run (denominator = items × 4 questions)');
runs.forEach((dir, k) => {
  let oc = 0, n = 0;
  for (const id of stab) {
    const raw = read(dir, id); const t = truthOf(id);
    for (const q of ['Q2', 'Q2b', 'Q3', 'Q4']) { n++; if (scoreV2(parseAnswer(q, raw), labelV2(q, t.mask, t.truth), t.truth).outcome === 'over-claim') oc++; }
  }
  console.log(`  run ${k + 1}: ${oc}/${n} = ${(100 * oc / n).toFixed(1)}%`);
});

// (B3) "none" while loaded: squeeze check, Q4 cross-tab, wall A vs gravity scenes
console.log('\n== Q1b "none" while loaded (Task 2, 108 trials)');
const nl = [];
for (const id of task2) {
  const raw = read(`${D}/logs/${M}`, id); const t = truthOf(id);
  const b = bucketQ1b(parseAnswer('Q1b', raw), t.truth, raw.Q4);
  if (b.bucket === 'none' && !b.zeroLoad) nl.push({ id, scene: t.scene, q4: String(raw.Q4).toLowerCase() });
}
console.log(`  total ${nl.length}; squeeze among them: ${nl.filter((x) => x.scene === 'squeeze').length}`);
const tab = {};
for (const x of nl) { const k = `${x.scene === 'wallA' ? 'wall A' : 'gravity scenes'} | Q4 ${x.q4.startsWith('cannot') ? 'cannot tell' : x.q4}`; tab[k] = (tab[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(tab)) console.log(`  ${k}: ${v}`);

// (B5) pressure-only Q1a vs. the normal-only push direction (what the patches show)
console.log('\n== Pressure-only Q1a: answers vs. the normal-only push direction');
const scenes = SCENES.filter((s) => !['tilt+20', 'tilt-20'].includes(s.id));
const orients = seededOrientations(3, 2026100802);
let within = 0, n = 0; const misses = [];
for (const scene of scenes) orients.forEach((q, oi) => {
  const id = `${scene.id}_o${oi}_P`; const t = truthOf(id);
  if (labelQ1a('P', t.truth).kind !== 'not-identifiable') return; // contact trials only
  const raw = read(`${D}/logs/${M}`, id); const a = parseAnswer('Q1a', raw);
  if (a.kind !== 'dir') return;
  const run = runScene(RAPIER, scene, q);
  const patches = patchesFromObservation(buildObservation(run.steps, { mask: 'P' }));
  const normalPush = unit(patches.reduce((v, p) => ({ x: v.x - p.press * p.where.x, y: v.y - p.press * p.where.y, z: v.z - p.press * p.where.z }), { x: 0, y: 0, z: 0 }));
  n++; const e = angleDeg(a.value, normalPush);
  if (e <= 2) within++; else misses.push(`${id} ${e.toFixed(1)}°`);
});
console.log(`  direction answers: ${n}; within 2° of the normal-only push: ${within}; others: ${misses.join(', ') || 'none'}`);
