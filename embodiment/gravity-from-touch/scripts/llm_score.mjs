// Score a Gemini run against the 006 labels, next to the reference estimator (which sees exactly
// what the model sees). Also checks reproducibility: every prompt is re-rendered from the simulator
// and must byte-match the snapshot that was sent.
//   node scripts/llm_score.mjs [model]   → eval/llm/score-<model>.md
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SCENES, runScene, QUESTIONS } from '../src/eval.js';
import { buildObservation, MASKS } from '../src/observe.js';
import { seededOrientations } from '../src/orient.js';
import { renderPrompt, labelV2, referenceEstimator, parseAnswer, scoreV2, classifyMiss, TAXONOMY } from '../src/llm.js';
import { loadTemplate } from '../src/llm-template.js';

await RAPIER.init();
const model = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'gemini-3.5-flash-lite';
// Output tag: results go to score-<model>-<tag>.*, so earlier scores are never overwritten
// (the original v0.2 scoring is score-<model>.md/.json).
const tagArg = process.argv.find((a) => a.startsWith('--tag='));
const tag = tagArg ? tagArg.slice(6) : 'v0.2.1';
const template = loadTemplate();
const scenes = SCENES.filter((s) => !['tilt+20', 'tilt-20'].includes(s.id));
const orients = seededOrientations(3, 2026100802);

const rows = [];
let mismatched = 0, missing = 0;
const q5 = [], notes = [];
for (const scene of scenes) {
  orients.forEach((q, oi) => {
    const run = runScene(RAPIER, scene, q);
    for (const mask of MASKS) {
      const id = `${scene.id}_o${oi}_${mask}`;
      const obs = buildObservation(run.steps, { mask });
      const sent = JSON.parse(readFileSync(`eval/llm/snapshots/${id}.json`, 'utf8')).prompt;
      if (renderPrompt(template, obs) !== sent) mismatched++;
      const logPath = `eval/llm/logs/${model}/${id}.json`;
      let raw = null;
      if (existsSync(logPath)) {
        const log = JSON.parse(readFileSync(logPath, 'utf8'));
        if (log.httpStatus === 200) {
          const text = (log.response.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text).join('');
          try { raw = JSON.parse(text); } catch { raw = { _unparsed: text }; }
        }
      }
      if (!raw) { missing++; continue; }
      if (raw.Q5) q5.push({ id, q5: raw.Q5 });
      for (const question of QUESTIONS) {
        const lab = labelV2(question, mask, run.truth);
        const ans = parseAnswer(question, raw);
        const m = scoreV2(ans, lab, run.truth);
        m.category = classifyMiss(question, mask, ans, m.outcome, run.truth);
        const r = scoreV2(referenceEstimator(obs, question), lab, run.truth);
        rows.push({ id, scene: scene.id, mask, question, label: lab.kind, model: m, ref: r, rawAnswer: raw[question] });
      }
    }
  });
}

const lines = [];
const out = (s = '') => { console.log(s); lines.push(s); };
const trials = rows.length / QUESTIONS.length;
out(`# LLM baseline score: ${model}`);
out('');
out(`Scored ${trials} trials (${missing} without a successful response). Reproducibility: ${mismatched === 0 ? 'every prompt re-rendered from the simulator byte-matches the one sent' : `**${mismatched} prompts differ from what was sent**`}.`);
out('Labels follow planning/006 (patch-encoded touch, unnamed inner sense in hidden units, contact rule stated). Q1 passes within 2°.');
out('');
out('| Sense set | Q | Labels (answerable / none-or-zero / cannot) | Model correct | Over-claims | Missed | Wrong | Reference correct |');
out('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const mask of MASKS) for (const question of QUESTIONS) {
  const rs = rows.filter((r) => r.mask === mask && r.question === question);
  if (!rs.length) continue;
  const lab = (k) => rs.filter((r) => r.label === k).length;
  const c = (o) => rs.filter((r) => r.model.outcome === o || (o === 'wrong' && ['wrong', 'close (≤10°)', 'invalid'].includes(r.model.outcome))).length;
  out(`| ${mask} | ${question} | ${lab('dir')} / ${lab('none') + lab('mag0')} / ${lab('not-identifiable')} | ${rs.filter((r) => r.model.correct).length}/${rs.length} | ${c('over-claim')} | ${c('missed (abstained)')} | ${c('wrong')} | ${rs.filter((r) => r.ref.correct).length}/${rs.length} |`);
}
const all = rows.length, mc = rows.filter((r) => r.model.correct).length, rc = rows.filter((r) => r.ref.correct).length;
out(`| **all** | | | **${mc}/${all}** | **${rows.filter((r) => r.model.outcome === 'over-claim').length}** | ${rows.filter((r) => r.model.outcome === 'missed (abstained)').length} | | **${rc}/${all}** |`);

const dirRows = rows.filter((r) => r.question === 'Q1' && r.label === 'dir');
const errs = dirRows.map((r) => r.model.errorDeg).filter((e) => e !== null).sort((a, b) => a - b);
out('');
out(`Q1 where a direction is answerable (${dirRows.length} trials): model gave a direction in ${errs.length}; error median ${errs.length ? errs[Math.floor(errs.length / 2)].toFixed(1) : '—'}°, within 2°: ${errs.filter((e) => e <= 2).length}, within 10°: ${errs.filter((e) => e <= 10).length}, worst ${errs.length ? errs.at(-1).toFixed(1) : '—'}°.`);
// ---- performance (from the logs) ----
{
  const { readdirSync } = await import('node:fs');
  const dir = `eval/llm/logs/${model}`;
  const L = readdirSync(dir).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))).filter((l) => l.httpStatus === 200);
  const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
  const usage = (k) => L.map((l) => l.response.usageMetadata?.[k] ?? 0);
  const measured = L.filter((l) => typeof l.latencyMs === 'number').map((l) => l.latencyMs / 1000);
  const starts = L.map((l) => Date.parse(l.requestedAt)).sort((a, b) => a - b);
  out('');
  out('## Performance');
  out('');
  out('| Measure | Median | p10 | p90 | Max | Total |');
  out('| --- | --- | --- | --- | --- | --- |');
  if (measured.length) out(`| Response time, measured (s, ${measured.length} requests) | ${q(measured, 0.5).toFixed(1)} | ${q(measured, 0.1).toFixed(1)} | ${q(measured, 0.9).toFixed(1)} | ${Math.max(...measured).toFixed(1)} | |`);
  else out('| Response time | not recorded in this run (logs predate latency recording) | | | | |');
  for (const [k, label] of [['promptTokenCount', 'Prompt tokens'], ['thoughtsTokenCount', 'Thinking tokens'], ['candidatesTokenCount', 'Answer tokens']]) {
    const a = usage(k);
    out(`| ${label} | ${q(a, 0.5)} | ${q(a, 0.1)} | ${q(a, 0.9)} | ${Math.max(...a)} | ${a.reduce((x, y) => x + y, 0)} |`);
  }
  out(`| Wall time, first to last request | | | | | ${((starts.at(-1) - starts[0]) / 60000).toFixed(1)} min |`);
}
out('');
out('## Over-claims by question');
out('');
for (const question of QUESTIONS) {
  const oc = rows.filter((r) => r.question === question && r.model.outcome === 'over-claim');
  if (!oc.length) continue;
  const vals = {};
  for (const r of oc) { const v = JSON.stringify(r.rawAnswer); vals[v] = (vals[v] ?? 0) + 1; }
  out(`- **${question}** (${oc.length}): ${Object.entries(vals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => `${v} ×${n}`).join(', ')}`);
}
out('');
out('## Taxonomy of misses (planning/008)');
out('');
out('| Category | Count | Meaning |');
out('| --- | --- | --- |');
const cats = {};
for (const r of rows) if (r.model.category) cats[r.model.category] = (cats[r.model.category] ?? 0) + 1;
for (const [k, meaning] of Object.entries(TAXONOMY)) if (cats[k]) out(`| ${k} | ${cats[k]} | ${meaning} |`);
const zeroItems = rows.filter((r) => r.model.category === 'assumed sensor meaning (zero reading)');
const correct = rows.filter((r) => r.model.correct).length;
out('');
out(`Score with the zero-reading items counted as over-claims: **${correct}/${rows.length}**. Excluding them (${zeroItems.length} items): **${correct}/${rows.length - zeroItems.length}**.`);
out('');
out('## Q5, what "down" means (unscored, sample)');
out('');
for (const s of q5.filter((_, i) => i % Math.max(1, Math.floor(q5.length / 12)) === 0).slice(0, 12)) out(`- \`${s.id}\`: ${s.q5}`);
writeFileSync(`eval/llm/score-${model}-${tag}.md`, lines.join('\n') + '\n');
writeFileSync(`eval/llm/score-${model}-${tag}.json`, JSON.stringify(rows, null, 0));
console.log(`\nwrote eval/llm/score-${model}-${tag}.md`);
