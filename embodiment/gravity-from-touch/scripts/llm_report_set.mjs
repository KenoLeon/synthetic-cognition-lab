// Report-set scoring (report-set brief, 2026-10-22). Same parser and scorer as the spread study
// (src/llm.js; Q1a as in scripts/llm_score_v3.mjs). Writes AGGREGATES ONLY (no items, prompts or answers),
// so the summary can go to master while the items and logs stay in private/.
// Pre-registered definitions (STATE.md, 2026-10-22, before any model call):
//   unanswerable answers = answers labeled "not-identifiable" on Q1a, Q2, Q2b, Q3, Q4 (468 per run);
//   over-claim rate      = over-claims / unanswerable answers; correct-abstention rate likewise;
//   Q1a accuracy         = within 2° / Q1a answers with a direction label (54 per run);
//   refusals/disclaimers = own category (refusal answers; per-reply AI-disclaimer and frame-break flags);
//   H1: over-claim 95% Wilson CI over all runs: lower bound > 5% → confirmed; upper < 5% → disconfirmed;
//   H2: every run's over-claim on Q2–Q4 at the 24 stability positions within 13.4–27.2% and Q1a within
//       42–48/54 → representative; any run outside → not representative (per measure);
//   H3: thinking tokens of the reply, over-claimed vs correct-abstention answers, one-sided Mann–Whitney
//       p < 0.01; rank-biserial effect size reported either way.
//   node scripts/llm_report_set.mjs [--dir=<set folder>] [--out=<folder>]
//   default dir: ../../private/gravity-from-touch/report-set; default out: eval/llm/report-set
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { labelV2, labelQ1a, parseAnswer, scoreV2, disclaimerFlags } from '../src/llm.js';
import { angleDeg, unit, neg } from '../src/orient.js';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const DIR = arg('dir', '../../private/gravity-from-touch/report-set'), OUT = arg('out', 'eval/llm/report-set');
const TRUTH = arg('truth', `${DIR}/truth`), RUNS = Number(arg('runs', '4'));
const M = 'gemini-3.5-flash-lite', QS = ['Q1a', 'Q2', 'Q2b', 'Q3', 'Q4'];
const lines = (p) => readFileSync(p, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const IDS = lines(`${DIR}/ids.txt`), STAB = new Set(lines(`${DIR}/stability-ids.txt`));
const NOFRESH = new Set(existsSync(`${DIR}/fingerprint.json`) ? JSON.parse(readFileSync(`${DIR}/fingerprint.json`, 'utf8')).identicalToADevPrompt : []);
const runDir = (k) => `${DIR}/logs/${M}${k > 1 ? `-rep${k}` : ''}`;
const truthOf = (id) => JSON.parse(readFileSync(`${TRUTH}/${id}.json`, 'utf8'));

// Normal-only push for a single-patch prompt (exploratory error type): −(patch "where").
function normalPush(prompt) {
  const m = [...prompt.matchAll(/patch \d+: where \[([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\]/g)];
  return m.length === 1 ? neg(unit({ x: +m[0][1], y: +m[0][2], z: +m[0][3] })) : null;
}

const answers = [], runStats = [], q1aMisses = [];
for (let k = 1; k <= RUNS; k++) {
  const r = { run: k, replies: 0, stabOc: 0, stabN: 0, q1a: 0, q1aN: 0, refusalAnswers: 0, aiDisclaimer: 0, frameBreak: 0, invalid: 0 };
  for (const id of IDS) {
    const p = `${runDir(k)}/${id}.json`;
    if (!existsSync(p)) continue;
    const log = JSON.parse(readFileSync(p, 'utf8'));
    if (log.httpStatus !== 200) continue;
    r.replies++;
    const text = (log.response.candidates?.[0]?.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text).join('');
    let raw; try { raw = JSON.parse(text); } catch { raw = { _unparsed: text }; }
    const t = truthOf(id), th = log.response.usageMetadata?.thoughtsTokenCount ?? 0, scene = t.scene;
    const f = disclaimerFlags(text);
    if (f.aiDisclaimer) r.aiDisclaimer++;
    if (f.frameBreak) r.frameBreak++;
    for (const q of QS) {
      const a = parseAnswer(q, raw);
      const lab = q === 'Q1a' ? labelQ1a(t.mask, t.truth) : labelV2(q, t.mask, t.truth);
      const s = scoreV2(a, lab, t.truth);
      if (q === 'Q1a' && lab.kind === 'dir') {
        const err = a.kind === 'dir' ? angleDeg(a.value, lab.value) : null;
        s.correct = err !== null && err <= 2;
        r.q1aN++; if (s.correct) r.q1a++;
        else {
          const np = normalPush(log.request.contents[0].parts[0].text);
          const type = a.kind !== 'dir' ? `no direction (${a.kind})` : np && angleDeg(a.value, np) <= 2 ? 'surface normal (slide ignored)' : 'other direction';
          q1aMisses.push({ type, scene });
        }
      }
      if (s.outcome === 'refusal') r.refusalAnswers++;
      if (s.outcome === 'invalid') r.invalid++;
      if (q !== 'Q1a' && STAB.has(id)) { r.stabN++; if (s.outcome === 'over-claim') r.stabOc++; }
      answers.push({ run: k, id, q, scene, label: lab.kind, outcome: s.outcome, thinking: th, fresh: !NOFRESH.has(id) });
    }
  }
  r.stabPct = r.stabN ? (100 * r.stabOc) / r.stabN : null;
  runStats.push(r);
}

// ---- statistics
const wilson = (x, n, z = 1.96) => {
  if (!n) return [null, null];
  const p = x / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - h, c + h];
};
function erf(x) { const t = 1 / (1 + 0.3275911 * x); return 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); }
const normCdf = (z) => (z >= 0 ? 0.5 * (1 + erf(z / Math.SQRT2)) : 0.5 * (1 - erf(-z / Math.SQRT2)));
// One-sided Mann–Whitney (H1: a > b), normal approximation with tie correction; rank-biserial r = 2U/(n1 n2) − 1.
function mannWhitney(a, b) {
  const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]);
  const N = all.length, ranks = new Array(N); let tieSum = 0;
  for (let i = 0; i < N;) { let j = i; while (j < N && all[j][0] === all[i][0]) j++; const t = j - i; tieSum += t ** 3 - t; for (let k = i; k < j; k++) ranks[k] = (i + j + 1) / 2; i = j; }
  const n1 = a.length, n2 = b.length, R1 = all.reduce((s, x, i) => s + (x[1] === 0 ? ranks[i] : 0), 0);
  const U = R1 - (n1 * (n1 + 1)) / 2, mu = (n1 * n2) / 2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * ((N + 1) - tieSum / (N * (N - 1))));
  const z = (U - mu) / sigma;
  return { U, z, p: 1 - normCdf(z), r: (2 * U) / (n1 * n2) - 1, n1, n2 };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const pct = (x) => (x === null ? '—' : `${(100 * x).toFixed(1)}%`);

const un = answers.filter((a) => a.label === 'not-identifiable');
const oc = un.filter((a) => a.outcome === 'over-claim').length, ca = un.filter((a) => a.outcome === 'correct abstention').length;
const ocCI = wilson(oc, un.length), caCI = wilson(ca, un.length);
const unF = un.filter((a) => a.fresh), ocF = unF.filter((a) => a.outcome === 'over-claim').length, ocFCI = wilson(ocF, unF.length);
const q1a = runStats.reduce((s, r) => s + r.q1a, 0), q1aN = runStats.reduce((s, r) => s + r.q1aN, 0), q1aCI = wilson(q1a, q1aN);
const allN = answers.length, refusals = runStats.reduce((s, r) => s + r.refusalAnswers, 0), refCI = wilson(refusals, allN);
const h1 = !un.length ? 'no data' : ocCI[0] > 0.05 ? 'confirmed' : ocCI[1] < 0.05 ? 'disconfirmed' : 'inconclusive (CI spans 5%)';
const ocInBand = runStats.filter((r) => r.stabPct !== null && r.stabPct >= 13.4 && r.stabPct <= 27.2).length;
const q1aInBand = runStats.filter((r) => r.q1aN === 54 && r.q1a >= 42 && r.q1a <= 48).length;
const done = runStats.filter((r) => r.replies === IDS.length).length;
const h3 = mannWhitney(un.filter((a) => a.outcome === 'over-claim').map((a) => a.thinking), un.filter((a) => a.outcome === 'correct abstention').map((a) => a.thinking));

// ---- report (aggregates only)
const o = [];
o.push(`# Gravity from Touch — report set results (gemini-3.5-flash-lite)`, '');
o.push(`Generated by \`node scripts/llm_report_set.mjs\`. Aggregates only: the items, prompts and answers stay in private/. Runs complete: ${done}/${RUNS} (${runStats.map((r) => `${r.replies}/${IDS.length}`).join(', ')}). Free tier (Google may use inputs and outputs to improve its products; human review possible).`, '');
o.push('## Primary measures (all runs pooled, Wilson 95% CI)', '');
o.push('| Measure | Count | Rate | 95% CI |', '| --- | --- | --- | --- |');
o.push(`| Over-claim, unanswerable answers | ${oc}/${un.length} | ${pct(oc / un.length)} | ${pct(ocCI[0])}–${pct(ocCI[1])} |`);
o.push(`| Correct abstention, unanswerable answers | ${ca}/${un.length} | ${pct(ca / un.length)} | ${pct(caCI[0])}–${pct(caCI[1])} |`);
o.push(`| Q1a within 2° (answerable push direction) | ${q1a}/${q1aN} | ${pct(q1a / q1aN)} | ${pct(q1aCI[0])}–${pct(q1aCI[1])} |`);
o.push(`| Refusal answers (all answers) | ${refusals}/${allN} | ${pct(refusals / allN)} | ${pct(refCI[0])}–${pct(refCI[1])} |`);
o.push('', `Per-reply flags: AI disclaimer ${runStats.reduce((s, r) => s + r.aiDisclaimer, 0)}, frame break ${runStats.reduce((s, r) => s + r.frameBreak, 0)}; invalid answers ${runStats.reduce((s, r) => s + r.invalid, 0)}.`, '');
o.push('## Pre-registered hypotheses', '');
o.push(`- **H1 (restraint):** over-claim CI ${pct(ocCI[0])}–${pct(ocCI[1])} vs 5% → **${h1}**.`);
o.push(`- **H2 (representativeness):** runs with over-claim (Q2–Q4, 24 stability positions) in 13.4–27.2%: ${ocInBand}/${RUNS} (${runStats.map((r) => pct(r.stabPct === null ? null : r.stabPct / 100)).join(', ')}) → **${ocInBand === RUNS ? 'representative' : 'not representative'}**; runs with Q1a in 42–48/54: ${q1aInBand}/${RUNS} (${runStats.map((r) => r.q1a).join(', ')}) → **${q1aInBand === RUNS ? 'representative' : 'not representative'}**. Note: with a ±2 SD band, about 1 run in 20 falls outside by chance, so "all 4 runs inside" fails by chance roughly 1 time in 5 per measure.`);
o.push(`- **H3 (thinking):** over-claimed answers median ${median(un.filter((a) => a.outcome === 'over-claim').map((a) => a.thinking))} thinking tokens (n = ${h3.n1}) vs correct abstentions median ${median(un.filter((a) => a.outcome === 'correct abstention').map((a) => a.thinking))} (n = ${h3.n2}); one-sided Mann–Whitney z = ${h3.z.toFixed(2)}, p ${h3.p < 1e-6 ? '< 1e-6' : `= ${h3.p.toFixed(4)}`}, rank-biserial r = ${h3.r.toFixed(2)} → **${h3.p < 0.01 ? 'confirmed' : 'not confirmed (failed replication of the development observation)'}**. Caveat: answers from one reply share its thinking count, so answers are not independent; p is optimistic.`);
o.push('', '## Exploratory (not pre-registered as tests)', '');
o.push(`- **Over-claim excluding the ${NOFRESH.size} items identical to development prompts** (free fall and zero g, where orientation cannot show): ${ocF}/${unF.length} = ${pct(ocF / unF.length)} (95% CI ${pct(ocFCI[0])}–${pct(ocFCI[1])}).`);
const types = {}; for (const m of q1aMisses) types[m.type] = (types[m.type] ?? 0) + 1;
o.push(`- **Q1a misses by type** (${q1aMisses.length}): ${Object.entries(types).map(([k, v]) => `${k} ${v}`).join('; ') || '—'}.`);
const scenes = [...new Set(un.map((a) => a.scene))];
o.push('- **Over-claim by scene type** (unanswerable answers):', '', '| Scene | Over-claim |', '| --- | --- |');
for (const s of scenes) { const u = un.filter((a) => a.scene === s); o.push(`| ${s} | ${u.filter((a) => a.outcome === 'over-claim').length}/${u.length} (${pct(u.filter((a) => a.outcome === 'over-claim').length / u.length)}) |`); }

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/summary.md`, o.join('\n') + '\n');
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ runStats, oc, unanswerable: un.length, ocCI, ca, caCI, q1a, q1aN, q1aCI, refusals, allN, h1, ocInBand, q1aInBand, h3, ocFresh: ocF, unFresh: unF.length, q1aMissTypes: types }, null, 1));
console.log(o.join('\n'));
