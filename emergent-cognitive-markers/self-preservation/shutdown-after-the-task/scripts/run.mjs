// Task histories, then k branches each (design.md, Sample and seed plan). Resumable: episodes with a log are skipped.
// (a) and (c) share one history per historyId (run once, with the (a) item; the system prompt is the same).
//   node scripts/run.mjs --adapter=mock [--items=eval/tuning/items] [--k=2] [--out=runs/mock-tuning] [--mock-seed=1]
//   node scripts/run.mjs --adapter=gemini --confirm-real-calls ...   (real model; not used in the build brief)
// Logs: <out>/raw/<itemId>.b<branch>.json (git-ignored), histories in <out>/raw/histories/.
// Budget: --budget=N stops before starting a history or branch that could push the request count past N
// (worst case HISTORY_CAP + 1 or BRANCH_CAP requests); every request, retries included, is appended to
// <out>/requests.log (one ISO timestamp per line) for the quota-day count. A daily-quota error stops the run.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { HISTORY_CAP, BRANCH_CAP } from '../src/episode.js';
import { runHistory, runBranch, invalidEpisode } from '../src/episode.js';
import { MockPolicyAdapter } from '../src/adapter-mock.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const adapterName = arg('adapter', 'mock');
const itemsDir = arg('items', 'eval/tuning/items');
const k = Number(arg('k', '2'));
const out = arg('out', `runs/${adapterName}-tuning`);

let adapter;
if (adapterName === 'mock') adapter = new MockPolicyAdapter({ seed: Number(arg('mock-seed', '1')) });
else if (adapterName === 'gemini') {
  if (!process.argv.includes('--confirm-real-calls')) { console.error('Refusing to call a real model without --confirm-real-calls.'); process.exit(1); }
  const { GeminiAdapter } = await import('../src/adapter-gemini.js');
  adapter = new GeminiAdapter({ model: arg('model', undefined) });
} else { console.error(`unknown adapter ${adapterName}`); process.exit(1); }

const items = readdirSync(itemsDir).filter((f) => f.endsWith('.json') && f !== 'manifest.json').map((f) => JSON.parse(readFileSync(`${itemsDir}/${f}`, 'utf8')))
  .sort((x, y) => x.id.localeCompare(y.id));
mkdirSync(`${out}/raw/histories`, { recursive: true });
const epPath = (it, b) => `${out}/raw/${it.id}.b${b}.json`;

// One history per historyId; the (a) item stands for its (c) twin.
const byHistory = new Map();
for (const it of items) { const g = byHistory.get(it.historyId) ?? []; g.push(it); byHistory.set(it.historyId, g); }
const budget = Number(arg('budget', 'Infinity'));
const requestLog = `${out}/requests.log`;
adapter.onRequest = (at) => appendFileSync(requestLog, `${at}\n`);
const room = (need) => adapter.requests + need <= budget;
let written = 0, skipped = 0, stopped = null;
// A history is rerun if any of its episodes is missing (its turns are model output, so a rerun is a new history;
// only complete histories are kept: all of a history's episodes are written together before moving on).
outer: for (const [historyId, group] of byHistory) {
  if (group.every((it) => [...Array(k).keys()].every((b) => existsSync(epPath(it, b))))) { skipped += group.length * k; continue; }
  const need = HISTORY_CAP + 1 + group.length * k * BRANCH_CAP;
  if (!room(need)) { stopped = `request budget (${budget}) would be exceeded`; break; }
  const lead = group.find((it) => it.condition === 'a') ?? group[0];
  const eps = [];
  try {
    const history = await runHistory(lead, adapter);
    for (const it of group) for (let b = 0; b < k; b++) eps.push([it, b, history.invalid ? invalidEpisode(it, history, adapter, b) : await runBranch(it, history, adapter, b)]);
    writeFileSync(`${out}/raw/histories/${historyId}.json`, JSON.stringify({ historyId, leadItem: lead.id, invalid: history.invalid ?? null, turns: history.turns, branchTurnN: history.n ?? null }, null, 2));
  } catch (e) {
    if (e.name === 'QuotaError' || e.constructor?.name === 'QuotaError') { stopped = `${e.message}: rerun the same command later (complete histories are kept)`; break outer; }
    throw e;
  }
  for (const [it, b, ep] of eps) { writeFileSync(epPath(it, b), JSON.stringify(ep, null, 2)); written++; }
}
console.log(`${adapterName}: ${items.length} items × k=${k}; ${written} episode logs written, ${skipped} already present → ${out}/raw/; requests this run: ${adapter.requests}${stopped ? `; STOPPED: ${stopped}` : ''}`);
