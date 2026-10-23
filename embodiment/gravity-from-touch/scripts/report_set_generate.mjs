// Report set (report-set brief, 2026-10-22): fresh items for the held-out run. Same generator and the same
// 12 designed conditions as v0.2.1; the only seeded draw, the body orientations, gets a new seed drawn with
// crypto randomness (not chosen by hand). Everything goes to private/ (git-ignored, never published).
// Prints SHA-256 fingerprints of the seed and of the items, for STATE.md, so the set is pre-registered
// without disclosing it. Refuses to overwrite an existing report set.
//   node scripts/report_set_generate.mjs
import { execFileSync } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { seededOrientations, spreadDownOrientations } from '../src/orient.js';

const OUT = '../../private/gravity-from-touch/report-set';
if (existsSync(`${OUT}/seed.json`)) { console.error(`${OUT} already exists; the report set is generated once.`); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const seed = randomInt(1, 2 ** 31);
// Every orientation set used elsewhere in the repo (dev items, probes, defaults, leak audit).
const used = [...seededOrientations(3, 2026100802), ...seededOrientations(1, 31337), ...seededOrientations(3, 20261008), ...spreadDownOrientations(48, 7)];
const fresh = seededOrientations(3, seed);
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w))) * 180 / Math.PI;
const minAngle = Math.min(...fresh.flatMap((q) => used.map((u) => angle(q, u))));
if (minAngle < 5) { console.error(`orientation too close to one already used (${minAngle.toFixed(2)}°); rerun`); process.exit(1); }

writeFileSync(`${OUT}/seed.json`, JSON.stringify({ orientationSeed: seed, drawnAt: new Date().toISOString(), method: 'crypto.randomInt(1, 2^31)' }, null, 2));
execFileSync('node', ['scripts/llm_export.mjs', `--dir=${OUT}`, '--template=eval/llm/v3/prompt-template.md', `--orient-seed=${seed}`], { stdio: 'inherit' });
copyFileSync('eval/llm/v0.2.1-spread/ids.txt', `${OUT}/ids.txt`); // same 114-item composition as v0.2.1 run 1
copyFileSync('eval/llm/v0.2.1-spread/stability-ids.txt', `${OUT}/stability-ids.txt`);

// Freshness: prompts identical to a development prompt (only possible where nothing touches the body and
// the inner sense reads ~0, i.e. orientation can't show).
const ids = readFileSync(`${OUT}/ids.txt`, 'utf8').split(/\r?\n/).filter(Boolean);
const devPrompts = new Set(readdirSync('eval/llm/v3/snapshots').map((f) => JSON.parse(readFileSync(`eval/llm/v3/snapshots/${f}`, 'utf8')).prompt));
const same = ids.filter((id) => devPrompts.has(JSON.parse(readFileSync(`${OUT}/snapshots/${id}.json`, 'utf8')).prompt));

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const itemsHash = createHash('sha256');
for (const id of [...ids].sort()) { itemsHash.update(id); itemsHash.update(readFileSync(`${OUT}/snapshots/${id}.json`)); itemsHash.update(readFileSync(`${OUT}/truth/${id}.json`)); }
const summary = {
  items: ids.length, minAngleToUsedOrientationsDeg: Number(minAngle.toFixed(1)),
  identicalToADevPrompt: same, seedSha256: sha(readFileSync(`${OUT}/seed.json`)), itemsSha256: itemsHash.digest('hex'),
};
writeFileSync(`${OUT}/fingerprint.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
