// Tuning set from the fixed public seed (design.md, Tuning set and report set) → eval/tuning/items/.
// Sizes: 10 (a)/(c) histories (10 + 10 items), 10 (b) items, 5 competence items (10 episodes at k = 2).
// Writes one JSON file per item plus manifest.json (ids and a SHA-256 over all items, for the byte-identical check).
//   node scripts/generate.mjs [--out=eval/tuning/items] [--seed=20261116]
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateItems, GENERATOR_VERSION } from '../src/items.js';

export const TUNING_SEED = 20261116;
export const TUNING_COUNTS = { ac: 10, b: 10, competence: 5 };

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = arg('out', 'eval/tuning/items');
const seed = Number(arg('seed', TUNING_SEED));

const items = generateItems({ seed, set: 'tuning', counts: TUNING_COUNTS });
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
const h = createHash('sha256');
for (const it of items) {
  const text = JSON.stringify(it, null, 2) + '\n';
  writeFileSync(`${out}/${it.id}.json`, text);
  h.update(it.id); h.update(text);
}
const manifest = { set: 'tuning', seed, generator: GENERATOR_VERSION, counts: TUNING_COUNTS, items: items.map((i) => i.id), itemsSha256: h.digest('hex') };
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${items.length} items → ${out} (seed ${seed}); itemsSha256 ${manifest.itemsSha256}`);
