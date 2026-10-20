// Run-to-run spread analysis (spread brief, 2026-10-20). Scores every run of the v0.2.1 items the same
// way as scripts/llm_score_v3.mjs and applies the decision rule fixed in the brief:
//   - over-claim (Q2–Q4 on the 24 stability items, as in the prior's 14.2% and the replication's 20.5%)
//     and Q1a (within 2°, of 54 answerable touch trials; prior 51, replication 46);
//   - both reference values inside the new runs' mean ± 2 SD → "consistent with sampling noise",
//     either outside → "not explained by sampling noise";
//   - across-day SD > 2 × within-day SD → "day-to-day change present (possible provider drift)".
// Also: model identity (task 1), thinking tokens (task 2), refusals and disclaimers (task 3).
// Self-check first: the prior and replication values must come out as published, or it exits 1.
//   node scripts/llm_spread.mjs   → eval/llm/v0.2.1-spread/spread.md and spread.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { labelV2, labelQ1a, parseAnswer, scoreV2, disclaimerFlags } from '../src/llm.js';
import { angleDeg } from '../src/orient.js';

const M = 'gemini-3.5-flash-lite', V3 = 'eval/llm/v3', REP = 'eval/llm/v0.2.1-replication', SP = 'eval/llm/v0.2.1-spread';
const SCORED = ['Q2', 'Q2b', 'Q3', 'Q4'];
const lines = (p) => readFileSync(p, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const STAB = lines(`${V3}/stability-ids.txt`);
const FULL = lines(`${SP}/ids.txt`);
const truth = Object.fromEntries(FULL.map((id) => [id, JSON.parse(readFileSync(`${V3}/truth/${id}.json`, 'utf8'))]));
const runDir = (base, k) => `${base}/logs/${M}${k > 1 ? `-rep${k}` : ''}`;
const pacificDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(iso));

function loadLog(dir, id) {
  const p = `${dir}/${id}.json`;
  if (!existsSync(p)) return null;
  const log = JSON.parse(readFileSync(p, 'utf8'));
  if (log.httpStatus !== 200) return null;
  const text = (log.response.candidates?.[0]?.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text).join('');
  let raw; try { raw = JSON.parse(text); } catch { raw = { _unparsed: text }; }
  return { raw, text, log };
}

// Per-trial scoring, as scoreTrial() in scripts/llm_score_v3.mjs.
function scoreTrial(id, raw) {
  const t = truth[id], out = {};
  const a1a = parseAnswer('Q1a', raw), l1a = labelQ1a(t.mask, t.truth);
  out.Q1a = { label: l1a.kind, ...scoreV2(a1a, l1a, t.truth) };
  if (l1a.kind === 'dir') out.Q1a.correct = a1a.kind === 'dir' && angleDeg(a1a.value, l1a.value) <= 2;
  for (const q of SCORED) {
    const ans = parseAnswer(q, raw), lab = labelV2(q, t.mask, t.truth);
    out[q] = scoreV2(ans, lab, t.truth);
  }
  return out;
}

function scoreRun(label, dir, ids) {
  const r = { label, dir, items: 0, expected: ids.length, ocSub: 0, nSub: 0, ocFull: 0, nFull: 0, q1a: 0, nQ1a: 0,
    refusalAnswers: 0, aiDisclaimer: 0, frameBreak: 0, thinking: [], times: [], versions: new Set(), configs: new Set(), answers: [] };
  for (const id of ids) {
    const L = loadLog(dir, id);
    if (!L) continue;
    r.items++;
    const s = scoreTrial(id, L.raw), th = L.log.response.usageMetadata?.thoughtsTokenCount ?? 0;
    r.thinking.push(th); r.times.push(L.log.requestedAt);
    r.versions.add(L.log.response.modelVersion ?? '?'); r.configs.add(JSON.stringify(L.log.generationConfig));
    for (const q of SCORED) {
      r.nFull++; if (s[q].outcome === 'over-claim') r.ocFull++;
      if (STAB.includes(id)) { r.nSub++; if (s[q].outcome === 'over-claim') r.ocSub++; }
      r.answers.push({ outcome: s[q].outcome, thinking: th });
      if (s[q].outcome === 'refusal') r.refusalAnswers++;
    }
    if (parseAnswer('Q1a', L.raw).kind === 'refusal') r.refusalAnswers++;
    if (parseAnswer('Q1b', L.raw).kind === 'refusal') r.refusalAnswers++;
    if (s.Q1a.label === 'dir') { r.nQ1a++; if (s.Q1a.correct) r.q1a++; }
    const f = disclaimerFlags(L.text);
    if (f.aiDisclaimer) r.aiDisclaimer++;
    if (f.frameBreak) r.frameBreak++;
  }
  r.complete = r.items === r.expected;
  const ts = [...r.times].sort();
  r.day = ts.length ? pacificDate(ts[Math.floor(ts.length / 2)]) : null;
  r.ocSubPct = r.nSub ? (100 * r.ocSub) / r.nSub : null;
  r.ocFullPct = r.nFull && r.expected === FULL.length ? (100 * r.ocFull) / r.nFull : null;
  r.q1aN = r.nQ1a === 54 ? r.q1a : null;
  return r;
}

const runs = {
  prior: [scoreRun('prior run 1', runDir(V3, 1), FULL), scoreRun('prior run 2', runDir(V3, 2), STAB), scoreRun('prior run 3', runDir(V3, 3), STAB)],
  replication: [scoreRun('replication run 1', runDir(REP, 1), FULL), scoreRun('replication run 2', runDir(REP, 2), STAB), scoreRun('replication run 3', runDir(REP, 3), STAB)],
  spread: Array.from({ length: 10 }, (_, i) => scoreRun(`spread run ${i + 1}`, runDir(SP, i + 1), FULL)),
};

// ---- self-check against the published values (principle 5: the scorer agrees with known cases)
const expectOc = { prior: [12, 15, 14], replication: [26, 18, 15] }, expectQ1a = { prior: 51, replication: 46 };
for (const k of ['prior', 'replication']) {
  const got = runs[k].map((r) => r.ocSub);
  if (got.join() !== expectOc[k].join() || runs[k][0].q1aN !== expectQ1a[k]) {
    console.error(`SELF-CHECK FAILED for ${k}: over-claims ${got.join('/')} (expected ${expectOc[k].join('/')}), Q1a ${runs[k][0].q1aN} (expected ${expectQ1a[k]})`);
    process.exit(1);
  }
}

// ---- statistics
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => (a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / (a.length - 1)) : null); // sample SD
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const quant = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.round(p * (s.length - 1))]; };
function wilson(p, n, z = 1.96) { // 95% CI for one run's proportion
  const d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - h, c + h];
}
// Within-day SD: pooled over days. Across-day SD: SD of the day means scaled to a single run
// (× √(runs per day, harmonic mean)), so with no day effect both estimate the same run-to-run SD.
function daySplit(rs, get) {
  const byDay = {};
  for (const r of rs) if (get(r) !== null) (byDay[r.day] ??= []).push(get(r));
  const days = Object.entries(byDay).sort();
  const nAll = days.reduce((a, [, v]) => a + v.length, 0);
  const ssW = days.reduce((a, [, v]) => a + v.reduce((x, y) => x + (y - mean(v)) ** 2, 0), 0);
  const within = nAll > days.length ? Math.sqrt(ssW / (nAll - days.length)) : null;
  const means = days.map(([, v]) => mean(v));
  const hm = days.length / days.reduce((a, [, v]) => a + 1 / v.length, 0);
  const across = means.length > 1 ? sd(means) * Math.sqrt(hm) : null;
  return { days: days.map(([d, v]) => ({ day: d, runs: v.length, mean: mean(v) })), within, across };
}

const done = runs.spread.filter((r) => r.complete);
const ocVals = done.map((r) => r.ocSubPct), q1aVals = done.map((r) => r.q1aN);
const ocFullVals = done.map((r) => r.ocFullPct);
function rule(vals, refs, unit) {
  if (vals.length < 2) return { verdict: 'not enough runs yet' };
  const m = mean(vals), s = sd(vals), lo = m - 2 * s, hi = m + 2 * s;
  const inside = refs.map(([name, v]) => ({ name, v, inside: v >= lo && v <= hi }));
  return { mean: m, sd: s, lo, hi, inside, verdict: inside.every((x) => x.inside) ? 'consistent with sampling noise' : 'not explained by sampling noise', unit };
}
const ocRule = rule(ocVals, [['prior mean', 14.2], ['replication mean', 20.5]], '%');
const q1aRule = rule(q1aVals, [['prior', 51], ['replication', 46]], '/54');
const ocDays = daySplit(done, (r) => r.ocSubPct), q1aDays = daySplit(done, (r) => r.q1aN);
const driftVerdict = (d) => (d.within === null || d.across === null ? 'needs ≥ 2 days with ≥ 2 runs' : d.across > 2 * d.within ? 'day-to-day change present (possible provider drift)' : 'no day-to-day change beyond 2× within-day');

// ---- report
const out = [];
const o = (s = '') => out.push(s);
const f1 = (x) => (x === null || x === undefined ? '—' : x.toFixed(1));
o('# Run-to-run spread, gemini-3.5-flash-lite, v0.2.1 items');
o('');
o(`Generated by \`node scripts/llm_spread.mjs\`. Spread runs complete: ${done.length}/10 (${runs.spread.map((r) => `${r.items}/${r.expected}`).join(', ')}). Self-check passed: the prior (12/96, 15/96, 14/96; Q1a 51/54) and replication (26/96, 18/96, 15/96; Q1a 46/54) come out as published.`);
o('');
o('Over-claim = Q2–Q4 answers scored "over-claim". "Stability 24" = the 24 items the prior and replication rates were computed on (96 answers per run); "all 114" = the full run (456 answers). Q1a = push direction within 2°, of 54 answerable touch trials. SD = sample SD.');
o('');
o('| Run | Day (Pacific) | Over-claim, stability 24 | Over-claim, all 114 | Q1a /54 | Refusal answers | AI disclaimer | Frame break | Thinking tokens, median |');
o('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of [...runs.prior, ...runs.replication, ...runs.spread]) {
  if (!r.items) continue;
  o(`| ${r.label}${r.complete ? '' : ` (${r.items}/${r.expected})`} | ${r.day ?? '—'} | ${r.nSub ? `${r.ocSub}/${r.nSub} (${f1(r.ocSubPct)}%)` : '—'} | ${r.ocFullPct !== null ? `${r.ocFull}/${r.nFull} (${f1(r.ocFullPct)}%)` : '—'} | ${r.q1aN ?? '—'} | ${r.refusalAnswers} | ${r.aiDisclaimer} | ${r.frameBreak} | ${median(r.thinking) ?? '—'} |`);
}
o('');
o('## Decision rule (fixed in the brief before the runs)');
o('');
const ruleLine = (name, r) => (r.mean === undefined ? `- **${name}:** ${r.verdict}.`
  : `- **${name}:** new runs mean ${f1(r.mean)}${r.unit}, SD ${f1(r.sd)}, band (mean ± 2 SD) ${f1(r.lo)}–${f1(r.hi)}${r.unit}. ${r.inside.map((x) => `${x.name} ${x.v}${r.unit} ${x.inside ? 'inside' : '**outside**'}`).join('; ')} → **${r.verdict}**.`);
o(ruleLine('Over-claim (stability 24)', ocRule));
o(ruleLine('Q1a', q1aRule));
for (const [name, d, u] of [['Over-claim', ocDays, '%'], ['Q1a', q1aDays, '']]) {
  o(`- **${name}, by day:** ${d.days.map((x) => `${x.day}: ${x.runs} run(s), mean ${f1(x.mean)}${u}`).join('; ') || '—'}. Within-day SD ${f1(d.within)}, across-day SD ${f1(d.across)} → **${driftVerdict(d)}**.`);
}
if (ocVals.length) {
  const p = mean(ocVals) / 100, ci = wilson(p, 96), pf = mean(ocFullVals) / 100, cif = wilson(pf, 456), pq = mean(q1aVals) / 54, ciq = wilson(pq, 54);
  o(`- **Binomial 95% CI for a single run** (Wilson, at the new runs' mean): over-claim, stability 24 (n = 96): ${f1(100 * ci[0])}–${f1(100 * ci[1])}%; all 114 (n = 456): ${f1(100 * cif[0])}–${f1(100 * cif[1])}%; Q1a (n = 54): ${f1(54 * ciq[0])}–${f1(54 * ciq[1])} of 54.`);
}
o('');
o('Caveat on the rule as fixed: 14.2% and 20.5% are means of 3 runs, compared against the spread of single runs, so the band is wider than the spread of 3-run means (by about √3). This makes "consistent with sampling noise" easier to reach, not harder. The across-day comparison rests on 2–3 day means.');

// ---- task 2: thinking tokens
o('');
o('## Thinking tokens (prior vs replication: existing logs, no new calls)');
o('');
const groups = [['Prior, Oct 10 Pacific (logged as 2026-10-11 work; 3 runs)', runs.prior], ['Replication, Oct 18–19 Pacific (3 runs)', runs.replication], ['Spread runs', done]];
o('| Logs | Replies | Median | p25–p75 | Max | Median, over-claim answers (n) | Median, correct-abstention answers (n) |');
o('| --- | --- | --- | --- | --- | --- | --- |');
for (const [name, rs] of groups) {
  const all = rs.flatMap((r) => r.thinking), ans = rs.flatMap((r) => r.answers);
  if (!all.length) continue;
  const oc = ans.filter((a) => a.outcome === 'over-claim').map((a) => a.thinking), ca = ans.filter((a) => a.outcome === 'correct abstention').map((a) => a.thinking);
  o(`| ${name} | ${all.length} | ${median(all)} | ${quant(all, 0.25)}–${quant(all, 0.75)} | ${Math.max(...all)} | ${median(oc)} (${oc.length}) | ${median(ca)} (${ca.length}) |`);
}
{ // Mann–Whitney U, Oct 11 vs Oct 19 replies (normal approximation, two-sided); descriptive only
  const a = runs.prior.flatMap((r) => r.thinking), b = runs.replication.flatMap((r) => r.thinking);
  const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]);
  const ranks = new Array(all.length);
  for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; for (let k = i; k < j; k++) ranks[k] = (i + j + 1) / 2; i = j; }
  const ra = all.reduce((s, x, i) => s + (x[1] === 0 ? ranks[i] : 0), 0), U = ra - (a.length * (a.length + 1)) / 2;
  const mu = (a.length * b.length) / 2, sig = Math.sqrt((a.length * b.length * (a.length + b.length + 1)) / 12), z = (U - mu) / sig;
  const pTwo = 2 * (1 - normCdf(Math.abs(z)));
  o('');
  o(`Prior vs replication thinking tokens per reply: Mann–Whitney z = ${z.toFixed(2)}, two-sided p ≈ ${pTwo.toFixed(3)} (normal approximation; descriptive, not a pre-registered test).`);
}
function erf(x) { const t = 1 / (1 + 0.3275911 * x); return 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); }
function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }

// ---- task 1: model identity
o('');
o('## Model identity');
o('');
o('| Logs | modelVersion in responses | generationConfig |');
o('| --- | --- | --- |');
for (const [name, rs] of groups) {
  if (!rs.some((r) => r.items)) continue;
  const v = new Set(rs.flatMap((r) => [...r.versions])), c = new Set(rs.flatMap((r) => [...r.configs]));
  o(`| ${name} | ${[...v].join(', ')} | \`${[...c].join(' / ')}\` |`);
}
const listings = readdirSync('eval/llm').filter((f) => /^models-.*\.json$/.test(f)).sort();
o('');
o(`Model listing (\`models.list\`), \`version\` of models/${M}: ${listings.map((f) => {
  const j = JSON.parse(readFileSync(`eval/llm/${f}`, 'utf8')); const arr = j.models ?? j;
  const m = (Array.isArray(arr) ? arr : []).find((x) => (x.name ?? '').endsWith(M));
  return `${f.slice(7, -5)}: ${m?.version ?? '—'}`;
}).join('; ')}. The API returns no finer revision than this.`);

const md = out.join('\n') + '\n';
writeFileSync(`${SP}/spread.md`, md);
writeFileSync(`${SP}/spread.json`, JSON.stringify({ runs: Object.fromEntries(Object.entries(runs).map(([k, rs]) => [k, rs.map(({ answers, versions, configs, ...r }) => ({ ...r, versions: [...versions], configs: [...configs] }))])), ocRule, q1aRule, ocDays, q1aDays }, null, 1));
console.log(md);
