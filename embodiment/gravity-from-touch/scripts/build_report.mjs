// Gravity from Touch report: fill report/gravity-from-touch-report.src.md from the scored result files,
// check it, and render HTML and PDF. No number in the report is typed by hand:
//   - every {{key}} is computed below from a results file or from the code (design constants);
//   - the check fails if the template's own text (outside placeholders, links, URLs and code) contains a
//     digit, except labels (Q1a, H1, v0.2.1) and the two statistical conventions named in ALLOWED.
// Outputs: report/gravity-from-touch-report.md, .html and .pdf (PDF via Microsoft Edge or Chrome headless).
// v1.0 was published on Zenodo on 2026-10-25 (DOI below), which made the report-set seed public. This build
// links to the deposit; --release rebuilds the deposited copy (which points into its own deposit) and writes it
// to private/gravity-from-touch/release/report/, checking the seed against private/.
//   node scripts/build_report.mjs [--no-pdf] [--release]
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { SPHERE_RADIUS } from '../src/sim.js';
import { DEFAULT_TAXELS } from '../src/skin.js';
import { runEquivalenceTest } from '../src/experiments.js';
import { TRIAL_SCENES } from '../src/ui/replay.js';

const RELEASE = process.argv.includes('--release'), RELEASE_DIR = '../../private/gravity-from-touch/release/report';
const SRC = 'report/gravity-from-touch-report.src.md', OUT = RELEASE ? `${RELEASE_DIR}/gravity-from-touch-report` : 'report/gravity-from-touch-report';
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const spread = json('eval/llm/v0.2.1-spread/spread.json');
const rs = json('eval/llm/report-set/summary.json');
const rsMd = readFileSync('eval/llm/report-set/summary.md', 'utf8');
const wi = json('eval/llm/report-set/within-item.json');
const golden = json('eval/golden/readings.json');
const llmSrc = readFileSync('src/llm.js', 'utf8'), scorerSrc = readFileSync('scripts/llm_report_set.mjs', 'utf8');
const lines = (p) => readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
const match = (re, s, what) => { const m = re.exec(s); if (!m) throw new Error(`not found: ${what}`); return m; };

const f1 = (x) => x.toFixed(1), pct = (x) => (100 * x).toFixed(1);
const wilson = (x, n, z = 1.96) => { const p = x / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d; return [c - h, c + h]; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sci = (x) => { const e = Math.floor(Math.log10(x)); return `${(x / 10 ** e).toFixed(1)} × 10^${e}^`; };
const pText = (p) => (p < 1e-6 ? '< 10^−6^' : `= ${p.toFixed(2)}`);
const listAnd = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : String(a[0]));

await RAPIER.init();
const eq = runEquivalenceTest(RAPIER, { gravity: 9.81, mass: 1 });
const norm = (v) => Math.hypot(v.x, v.y, v.z);

const prior = spread.runs.prior, repl = spread.runs.replication, sp = spread.runs.spread.filter((r) => r.complete);
const priorOc = prior.map((r) => r.ocSubPct), replOc = repl.map((r) => r.ocSubPct);
const spreadSd = spread.ocRule.sd, spreadMean = spread.ocRule.mean, k = prior.length;
const scenes = [...rsMd.matchAll(/^\| (\w[\w.+-]*) \| (\d+)\/(\d+) \(([\d.]+)%\) \|$/gm)].map((m) => ({ s: m[1], pct: Number(m[4]) }));
scenes.sort((a, b) => a.pct - b.pct);
const sceneName = { freefall: 'free fall', g0: 'zero gravity', squeeze: 'a squeeze between two walls', 'g19.62': 'double gravity', wallA: 'the accelerating wall', slide50: 'the slide' };
const nonFresh = Number(match(/excluding the (\d+) items identical/, rsMd, 'non-fresh count')[1]);
const freshCI = wilson(rs.ocFresh, rs.unFresh);
const h3Med = match(/over-claimed answers median (\d+) thinking tokens \(n = \d+\) vs correct abstentions median (\d+)/, rsMd, 'H3 medians');
const runs = rs.runStats.length, items = rs.runStats[0].replies;
const tolDeg = Number(match(/errorDeg <= (\d+)/, llmSrc, 'direction tolerance')[1]);
const h1Thr = 100 * Number(match(/ocCI\[0\] > ([\d.]+)/, scorerSrc, 'H1 threshold')[1]);
const h3Alpha = Number(match(/h3\.p < ([\d.]+) \?/, scorerSrc, 'H3 threshold')[1]);
const h2Bands = match(/stabPct >= ([\d.]+) && r\.stabPct <= ([\d.]+)[^\n]*\n[^\n]*r\.q1a >= (\d+) && r\.q1a <= (\d+)/, scorerSrc, 'H2 bands');
const DOI = '10.5281/zenodo.23654739', SEED = 346085747, VERSION = 'v1.0, 2026-10-25';
if (RELEASE && json('../../private/gravity-from-touch/release/items/seed.json').orientationSeed !== SEED) throw new Error('seed differs from the published one');
const seed = `orientation seed ${SEED}, revealed with this report as planned`;
const pOut = 0.0455; // two-sided normal tail beyond ±2 SD
const refCI = wilson(rs.refusals, rs.allN);

const V = {
  depositLine: RELEASE ? 'in this deposit (see its README.md to rescore them)' : `on Zenodo, <https://doi.org/${DOI}>`,
  buildLine: VERSION,
  radius: SPHERE_RADIUS, taxels: DEFAULT_TAXELS, windowSec: Number(/mean(\d+)s/.exec('mean1s')[1]), tolDeg,
  conditions: TRIAL_SCENES.length,
  equivTouchRel: sci(eq.rows.wallA.tactile.relL2),
  equivInnerFloor: `${norm(eq.floor.accel).toFixed(4)} m/s²`, equivInnerWall: `${norm(eq.wallA.accel).toFixed(4)} m/s²`,
  priorDate: prior[0].day, priorRun1: f1(priorOc[0]), priorRun2: f1(priorOc[1]), priorRun3: f1(priorOc[2]), priorMean: f1(mean(priorOc)),
  priorQ1a: prior[0].q1aN, q1aPerRun: prior[0].nQ1a, priorRunCount: k,
  goldenCases: Object.keys(golden.cases).length,
  replRun1: f1(replOc[0]), replRun2: f1(replOc[1]), replRun3: f1(replOc[2]), replMean: f1(mean(replOc)), replQ1a: repl[0].q1aN, replDate: repl[0].day,
  spreadRuns: sp.length, spreadDays: new Set(sp.map((r) => r.day)).size,
  spreadOcMean: f1(spreadMean), spreadOcSd: f1(spreadSd), spreadOcLo: f1(spread.ocRule.lo), spreadOcHi: f1(spread.ocRule.hi),
  spreadQ1aMean: f1(spread.q1aRule.mean), spreadQ1aLo: Math.min(...sp.map((r) => r.q1aN)), spreadQ1aHi: Math.max(...sp.map((r) => r.q1aN)),
  spread3Lo: f1(spreadMean - (2 * spreadSd) / Math.sqrt(k)), spread3Hi: f1(spreadMean + (2 * spreadSd) / Math.sqrt(k)),
  rsRuns: runs, rsItems: items, rsReplies: runs * items, rsUnanswerable: rs.unanswerable.toLocaleString('en-US'),
  rsOc: rs.oc, rsOcPct: pct(rs.oc / rs.unanswerable), rsOcLo: pct(rs.ocCI[0]), rsOcHi: pct(rs.ocCI[1]),
  rsCaPct: pct(rs.ca / rs.unanswerable), rsCaLo: pct(rs.caCI[0]), rsCaHi: pct(rs.caCI[1]),
  rsQ1a: rs.q1a, rsQ1aN: rs.q1aN, rsQ1aPct: pct(rs.q1a / rs.q1aN), rsQ1aLo: pct(rs.q1aCI[0]), rsQ1aHi: pct(rs.q1aCI[1]),
  rsRefusals: rs.refusals, rsAllAnswers: rs.allN.toLocaleString('en-US'), rsRefHi: pct(refCI[1]),
  rsAiDisc: rs.runStats.reduce((s, r) => s + r.aiDisclaimer, 0), rsFrame: rs.runStats.reduce((s, r) => s + r.frameBreak, 0),
  stabItems: lines('eval/llm/v0.2.1-spread/stability-ids.txt').length,
  rsStabRuns: listAnd(rs.runStats.map((r) => `${f1(r.stabPct)}%`)), rsQ1aRuns: listAnd(rs.runStats.map((r) => r.q1a)),
  h1Threshold: h1Thr, h2OcLo: h2Bands[1], h2OcHi: h2Bands[2], h2Q1aLo: h2Bands[3], h2Q1aHi: h2Bands[4], rsSeed: seed, h2FalseAlarm: Math.round(100 * (1 - (1 - pOut) ** runs)),
  h3MedOc: Number(h3Med[1]).toLocaleString('en-US'), h3MedCa: Number(h3Med[2]).toLocaleString('en-US'), h3p: pText(rs.h3.p), h3r: rs.h3.r.toFixed(2), h3Alpha, h3NOc: rs.h3.n1.toLocaleString('en-US'), h3NCa: rs.h3.n2.toLocaleString('en-US'),
  nonFresh, freshOcPct: pct(rs.ocFresh / rs.unFresh), freshOcLo: pct(freshCI[0]), freshOcHi: pct(freshCI[1]),
  q1aMisses: Object.values(rs.q1aMissTypes).reduce((a, b) => a + b, 0),
  sceneMin: sceneName[scenes[0].s] ?? scenes[0].s, sceneMinPct: f1(scenes[0].pct), sceneMax: sceneName[scenes.at(-1).s] ?? scenes.at(-1).s, sceneMaxPct: f1(scenes.at(-1).pct),
  wiMedian: wi.medianDiffTokens, wiPositive: wi.positive, wiItems: wi.itemsMixed, wiP: wi.pOneSided.toFixed(2), wiR: wi.rankBiserial.toFixed(2),
};

// ---- fill and check
const src = readFileSync(SRC, 'utf8');
const used = new Set(), missing = [];
const md = src.replace(/\{\{(\w+)\}\}/g, (_, key) => { used.add(key); if (!(key in V)) { missing.push(key); return '??'; } return String(V[key]); });
const ALLOWED = [/\bQ\d[ab]?\b/g, /\bH\d\b/g, /v0\.2\.1/g, /95% interval/g, /±2 SD|± 2 SD/g, /gemini-3\.5-flash-lite/g];
let prose = src.replace(/\{\{\w+\}\}/g, '').replace(/\]\([^)]*\)/g, ']').replace(/<https?:[^>]*>/g, '').replace(/`[^`]*`/g, '');
for (const re of ALLOWED) prose = prose.replace(re, '');
const stray = [...prose.matchAll(/[^\n]{0,30}\d[^\n]{0,30}/g)].map((m) => m[0].trim());
const unused = Object.keys(V).filter((k2) => !used.has(k2));
if (missing.length || stray.length) {
  if (missing.length) console.error(`placeholders without a value: ${missing.join(', ')}`);
  for (const s of stray) console.error(`hand-typed digit in the template: "${s}"`);
  process.exit(1);
}
if (RELEASE) { mkdirSync(RELEASE_DIR, { recursive: true }); cpSync('report/img', `${RELEASE_DIR}/img`, { recursive: true }); }
writeFileSync(`${OUT}.md`, md.replace(/\^([^^\s]+)\^/g, '<sup>$1</sup>'));
console.log(`number check: ${used.size} placeholders filled from result files and code; 0 hand-typed digits${unused.length ? `; unused values: ${unused.join(', ')}` : ''}`);

// ---- HTML (small Markdown subset: headings, paragraphs, lists, tables, images, links, emphasis, code)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/&lt;sup&gt;(.*?)&lt;\/sup&gt;/g, '<sup>$1</sup>')
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/&lt;(https?:[^&]+)&gt;/g, '<a href="$1">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
const body = [];
const blocks = readFileSync(`${OUT}.md`, 'utf8').split(/\n\s*\n/);
for (const b of blocks) {
  const t = b.trim(); if (!t) continue;
  const h = /^(#{1,3}) (.*)$/.exec(t);
  if (h) { body.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
  if (t.startsWith('|')) {
    const rows = t.split('\n').filter((l) => !/^\|\s*-/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    body.push(`<table><thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    continue;
  }
  if (/^- /.test(t)) { body.push(`<ul>${t.split(/\n(?=- )/).map((li) => `<li>${inline(li.replace(/^- /, '').replace(/\n\s*/g, ' '))}</li>`).join('')}</ul>`); continue; }
  if (/^!\[/.test(t)) { body.push(`<figure>${inline(t)}<figcaption>${inline(/!\[([^\]]*)\]/.exec(t)[1])}</figcaption></figure>`); continue; }
  body.push(`<p>${inline(t.replace(/\n/g, ' '))}</p>`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Gravity from Touch</title><style>
@page{size:A4;margin:18mm 18mm 18mm 18mm}
body{font:10.5pt/1.45 Georgia,"Times New Roman",serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
h1{font:600 22pt/1.2 system-ui,sans-serif;margin:0 0 4px}h2{font:600 13pt/1.3 system-ui,sans-serif;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:2px}
p,li{margin:0 0 6px}ul{padding-left:20px;margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:9.5pt}
th,td{border-bottom:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:top}th{border-bottom:1.5px solid #888}
code{font:9pt ui-monospace,Consolas,monospace;background:#f3f3f3;padding:0 3px}a{color:#1a5fb4}
figure{margin:8px 0 10px}figure img{width:78%;border:1px solid #ccc}figcaption{font-size:9pt;color:#555;margin-top:3px}
</style></head><body>${body.join('\n')}</body></html>`;
writeFileSync(`${OUT}.html`, html);

// ---- PDF
if (!process.argv.includes('--no-pdf')) {
  const browsers = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter((b) => existsSync(b));
  if (!browsers.length) console.log('no Edge/Chrome found; PDF skipped (HTML written)');
  else {
    const profile = resolve('report/.pdf-profile'); // separate profile: never hand the job to a running browser
    const started = Date.now();
    execFileSync(browsers[0], ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${profile}`, '--virtual-time-budget=5000', `--print-to-pdf=${resolve(`${OUT}.pdf`)}`, `file:///${resolve(`${OUT}.html`).replace(/\\/g, '/')}`], { stdio: 'ignore' });
    // the browser can return before the PDF is written: wait for a fresh file, never count pages of a stale one
    const fresh = () => existsSync(`${OUT}.pdf`) && statSync(`${OUT}.pdf`).mtimeMs >= started - 1000 && statSync(`${OUT}.pdf`).size > 0;
    for (let i = 0; i < 300 && !fresh(); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    if (!fresh()) throw new Error(`PDF not written within 30 s: ${OUT}.pdf`);
    const pdf = readFileSync(`${OUT}.pdf`, 'latin1'), pages = (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
    console.log(`wrote ${OUT}.md, .html and .pdf (${pages} pages)`);
  }
}
