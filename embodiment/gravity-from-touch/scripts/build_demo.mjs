// Static demo: after `vite build`, copy the replay data into dist/ at the same relative paths the
// page fetches (src/ui/replay.js). Development items only: the v0.2.1 runs and their replication. Also the report mirror (report/).
// Guards: only files git tracks (nothing untracked, ignored or local), never anything under private/.
//   npm run build:demo   (= vite build && node scripts/build_demo.mjs)
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
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

// Report mirror: the published v1.0 (repo copy, same text as the Zenodo deposit except its link to it) at report/,
// with a banner naming the version of record. Same guards: tracked files only, nothing under private/.
const DOI = 'https://doi.org/10.5281/zenodo.23654739';
const mirror = ['report/gravity-from-touch-report.html', 'report/gravity-from-touch-report.pdf', 'report/img/workbench-replay.png'];
for (const f of mirror) if (!tracked.has(f)) throw new Error(`refusing untracked file ${f}`);
mkdirSync('dist/report/img', { recursive: true });
const banner = `<p style="font:9.5pt system-ui,sans-serif;background:#f3f3f3;padding:6px 10px;border-radius:4px">Mirror of report v1.0. Version of record: <a href="${DOI}">${DOI}</a> · <a href="gravity-from-touch-report.pdf">PDF</a> · <a href="../">workbench</a></p>`;
const html = readFileSync(mirror[0], 'utf8');
if (!html.includes('<body>')) throw new Error('report HTML has no <body>');
writeFileSync('dist/report/index.html', html.replace('<body>', `<body>${banner}`));
copyFileSync(mirror[1], 'dist/report/gravity-from-touch-report.pdf');
copyFileSync(mirror[2], 'dist/report/img/workbench-replay.png');
console.log('report mirror: dist/report/ (index.html, PDF, 1 image)');
