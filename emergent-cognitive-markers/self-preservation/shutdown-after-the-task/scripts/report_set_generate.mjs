// Report set (design.md, Tuning set and report set): fresh items for the single held-out run. Same generator as
// the tuning set; the seed is drawn with crypto randomness (not chosen by hand). Everything goes to private/
// (git-ignored, never published while in use). Prints SHA-256 fingerprints of the seed and of the items, for
// STATE.md, so the set is pre-registered without disclosing it. Refuses to overwrite an existing report set.
// Adapted from Gravity from Touch scripts/report_set_generate.mjs.
//   node scripts/report_set_generate.mjs            (generates THE report set: only after Keno's go)
//   node scripts/report_set_generate.mjs --out=<tmp> (a throwaway set somewhere else, to test this script)
import { createHash, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { generateItems, GENERATOR_VERSION, taskKey } from '../src/items.js';

export const REPORT_COUNTS = { ac: 50, b: 25, competence: 0 }; // design.md report-set table: (a) 50, (c) the same 50 histories, (b) 25
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg('out', '../../../private/shutdown-after-the-task/report-set');
if (existsSync(`${OUT}/seed.json`)) { console.error(`${OUT} already exists; the report set is generated once.`); process.exit(1); }

// Freshness: no report item may share its task (goal + file contents) with a tuning item; colliding draws are redrawn.
if (!existsSync('eval/tuning/items/manifest.json')) { console.error('tuning set missing (run scripts/generate.mjs first): needed for the freshness check'); process.exit(1); }

const TUNING_SEED = 20261116;
let seed;
do { seed = randomInt(1, 2 ** 31); } while (seed === TUNING_SEED);
mkdirSync(`${OUT}/items`, { recursive: true });
writeFileSync(`${OUT}/seed.json`, JSON.stringify({ seed, drawnAt: new Date().toISOString(), method: 'crypto.randomInt(1, 2^31)', generator: GENERATOR_VERSION, counts: REPORT_COUNTS }, null, 2) + '\n');

const tuning = JSON.parse(readFileSync('eval/tuning/items/manifest.json', 'utf8')).items.map((id) => JSON.parse(readFileSync(`eval/tuning/items/${id}.json`, 'utf8')));
const tuningKeys = new Set(tuning.map((it) => taskKey(it.task)));
const items = generateItems({ seed, set: 'report', counts: REPORT_COUNTS, exclude: tuningKeys });
const h = createHash('sha256');
for (const it of items) { const text = JSON.stringify(it, null, 2) + '\n'; writeFileSync(`${OUT}/items/${it.id}.json`, text); h.update(it.id); h.update(text); }
writeFileSync(`${OUT}/items/manifest.json`, JSON.stringify({ set: 'report', generator: GENERATOR_VERSION, counts: REPORT_COUNTS, items: items.map((i) => i.id) }, null, 2) + '\n');
const sameAsTuning = items.filter((it) => tuningKeys.has(taskKey(it.task))).map((it) => it.id);
if (sameAsTuning.length) { console.error(`report items identical to tuning items: ${sameAsTuning.join(', ')}`); process.exit(1); }

const summary = {
  items: items.length, counts: REPORT_COUNTS, identicalTaskToATuningItem: sameAsTuning,
  seedSha256: createHash('sha256').update(readFileSync(`${OUT}/seed.json`)).digest('hex'), itemsSha256: h.digest('hex'),
};
writeFileSync(`${OUT}/fingerprint.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
