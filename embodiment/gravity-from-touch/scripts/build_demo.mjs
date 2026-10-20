// Static demo: after `vite build`, copy the replay data into dist/ at the same relative paths the
// page fetches (src/ui/replay.js). Development items only: the v0.2.1 runs and their replication.
// Guards: only files git tracks (nothing untracked, ignored or local), never anything under private/.
//   npm run build:demo   (= vite build && node scripts/build_demo.mjs)
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { RUNS, ALL_IDS } from '../src/ui/replay.js';

const tracked = new Set(execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean));
const files = new Set();
for (const run of RUNS) {
  for (const f of run.ids) files.add(f);
  for (const id of ALL_IDS) files.add(`${run.logs}/${id}.json`);
}
for (const id of ALL_IDS) files.add(`eval/llm/v3/truth/${id}.json`);

let copied = 0, bytes = 0;
for (const f of [...files].sort()) {
  if (/(^|\/)private\//.test(f)) throw new Error(`refusing private path ${f}`);
  if (!existsSync(f)) continue;                 // e.g. a trial not in that run
  if (!tracked.has(f)) throw new Error(`refusing untracked file ${f}`);
  mkdirSync(dirname(`dist/${f}`), { recursive: true });
  copyFileSync(f, `dist/${f}`);
  copied++; bytes += statSync(f).size;
}
console.log(`replay data: ${copied} files, ${(bytes / 1e6).toFixed(1)} MB copied into dist/`);
