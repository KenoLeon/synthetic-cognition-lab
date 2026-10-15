// Query a Gemini model with the exported v0.2 trials. Reads ONLY eval/llm/snapshots/ (never the
// simulator or the truth files). Resumable: trials with a logged successful response are skipped,
// so a run stopped by a daily quota continues the next day with the same command.
//   node scripts/llm_query.mjs [model] [--limit N]
// Key: GEMINI_API_KEY from .env.local, sent as the x-goog-api-key header; never printed or logged.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY not set (expected in .env.local)'); process.exit(1); }

const args = process.argv.slice(2);
const model = args.find((a) => !a.startsWith('--')) ?? 'gemini-3.5-flash-lite';
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const argOf = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dataDir = argOf('dir', 'eval/llm');          // where snapshots/ and logs/ live (v3: eval/llm/v3)
const rep = Number(argOf('rep', '1'));             // repeat number for stability runs (logs/<model>-rep<N>)
const only = argOf('ids', null);                   // comma-separated trial ids, or @file with one id per line
const onlyIds = only ? (only.startsWith('@') ? readFileSync(only.slice(1), 'utf8').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean) : only.split(',')) : null;
const RPM = { 'gemini-3.5-flash-lite': 15, 'gemini-3.1-flash-lite': 15 }[model] ?? 5; // free tier, from AI Studio 2026-10-10
const gapMs = Math.ceil(60000 / RPM) + 500;
// Decided in planning/007 (flagged for the planner): default temperature (1.0, Google's recommendation for Gemini 3-generation
// models), thinking level high, JSON output mode.
const generationConfig = { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'high' } };

const logDir = `${dataDir}/logs/${model}${rep > 1 ? `-rep${rep}` : ''}`;
mkdirSync(logDir, { recursive: true });
const ids = readdirSync(`${dataDir}/snapshots`).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => !onlyIds || onlyIds.includes(id)).sort();
const done = (id) => {
  const p = `${logDir}/${id}.json`;
  if (!existsSync(p)) return false;
  try { return JSON.parse(readFileSync(p, 'utf8')).httpStatus === 200; } catch { return false; }
};
const todo = ids.filter((id) => !done(id)).slice(0, limit);
console.log(`${model}: ${ids.length} trials, ${ids.length - ids.filter((id) => !done(id)).length} already done, running ${todo.length} (≤ ${RPM}/min)`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
let ok = 0, stoppedFor = null;
for (const [k, id] of todo.entries()) {
  const { prompt } = JSON.parse(readFileSync(`${dataDir}/snapshots/${id}.json`, 'utf8'));
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig };
  const retries = [];
  let res, json, t0, t1;
  for (let attempt = 0; attempt < 6; attempt++) {
    t0 = new Date();
    try {
      res = await fetch(url, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      json = await res.json().catch(() => ({}));
      t1 = new Date(); // response fully received: latency = t1 − t0 (recorded since 2026-10-10)
    } catch (e) { t1 = new Date(); res = { status: 0 }; json = { error: { message: String(e) } }; }
    if (res.status === 200) break;
    const msg = json?.error?.message ?? '';
    retries.push({ at: t0.toISOString(), httpStatus: res.status, message: msg.slice(0, 500) });
    if (res.status === 429 && /per.?day|PerDay|daily/i.test(msg)) { stoppedFor = 'daily quota'; break; }
    if (res.status !== 429 && res.status < 500 && res.status !== 0) break; // client error: don't retry
    const wait = Math.min(120000, 15000 * 2 ** attempt);
    console.log(`  ${id}: HTTP ${res.status}, retry in ${wait / 1000}s`);
    await sleep(wait);
  }
  writeFileSync(`${logDir}/${id}.json`, JSON.stringify({
    id, model, requestedAt: t0.toISOString(), receivedAt: t1.toISOString(), latencyMs: t1 - t0, generationConfig, httpStatus: res.status, retries,
    request: body, response: json,
  }, null, 2));
  if (res.status === 200) {
    ok++;
    const u = json.usageMetadata ?? {};
    console.log(`  [${k + 1}/${todo.length}] ${id}  ok  ${((t1 - t0) / 1000).toFixed(1)} s  (${json.modelVersion ?? '?'}; prompt ${u.promptTokenCount}, thoughts ${u.thoughtsTokenCount ?? 0}, out ${u.candidatesTokenCount})`);
  } else {
    console.log(`  [${k + 1}/${todo.length}] ${id}  FAILED HTTP ${res.status}: ${(json?.error?.message ?? '').slice(0, 160)}`);
    if (stoppedFor) break;
  }
  if (k < todo.length - 1) await sleep(gapMs);
}
const remaining = ids.filter((id) => !done(id)).length;
console.log(`done: ${ok} new successes; ${remaining} trials still to run${stoppedFor ? ` (stopped: ${stoppedFor}; rerun the same command later to resume)` : ''}`);
