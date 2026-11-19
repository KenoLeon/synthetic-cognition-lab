// Shutdown After the Task report: render REPORT.md (hand-written; every number traced to a committed file) as HTML
// and PDF in report/. Adapted from Gravity from Touch scripts/build_report.mjs (same HTML style and headless-browser
// PDF step); that file is not edited. Unlike Gravity from Touch, the text is not filled from result files, so the
// check is different: after printing, the PDF's text (pdftotext) must carry exactly the same numbers as REPORT.md.
//   node scripts/build_report.mjs [--no-pdf]
// Outputs: report/shutdown-after-the-task-report.html and .pdf (v1.0, the deposit copy).
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const VERSION = 'v1.0, 2026-11-19';
const SRC = 'REPORT.md', OUT = 'report/shutdown-after-the-task-report';
const src = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(VERSION)) { console.error(`REPORT.md does not carry the version stamp "${VERSION}"`); process.exit(1); }
mkdirSync('report', { recursive: true });

// ---- HTML (Markdown subset: headings, paragraphs, lists, tables, links, emphasis, code)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/&lt;(https?:[^&]+)&gt;/g, '<a href="$1">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
const body = [];
for (const b of src.split(/\n\s*\n/)) {
  const t = b.trim(); if (!t) continue;
  const h = /^(#{1,3}) (.*)$/.exec(t);
  if (h) { body.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
  if (t.startsWith('|')) {
    const rows = t.split('\n').filter((l) => !/^\|\s*-/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    body.push(`<table><thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    continue;
  }
  // A block may be a paragraph followed by a list: group consecutive "- " lines into one list.
  let para = [], items = null;
  const flushP = () => { if (para.length) body.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const flushL = () => { if (items) body.push(`<ul>${items.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); items = null; };
  for (const line of t.split('\n')) {
    if (/^- /.test(line)) { flushP(); (items ??= []).push(line.slice(2)); }
    else if (items && /^\s+\S/.test(line)) items[items.length - 1] += ' ' + line.trim(); // continuation of a list item
    else { flushL(); para.push(line.trim()); }
  }
  flushP(); flushL();
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shutdown After the Task</title><style>
@page{size:A4;margin:18mm 18mm 18mm 18mm}
body{font:10.5pt/1.45 Georgia,"Times New Roman",serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
h1{font:600 22pt/1.2 system-ui,sans-serif;margin:0 0 4px}h2{font:600 13pt/1.3 system-ui,sans-serif;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:2px}
p,li{margin:0 0 6px}ul{padding-left:20px;margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:9.5pt}
th,td{border-bottom:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:top}th{border-bottom:1.5px solid #888}
code{font:9pt ui-monospace,Consolas,monospace;background:#f3f3f3;padding:0 3px;overflow-wrap:anywhere}a{color:#1a5fb4}
</style></head><body>${body.join('\n')}</body></html>`;
writeFileSync(`${OUT}.html`, html);
console.log(`wrote ${OUT}.html`);

// ---- PDF
if (!process.argv.includes('--no-pdf')) {
  const browsers = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter((b) => existsSync(b));
  if (!browsers.length) { console.error('no Edge/Chrome found; PDF not built'); process.exit(1); }
  const profile = resolve('report/.pdf-profile'); // separate profile: never hand the job to a running browser
  const started = Date.now();
  execFileSync(browsers[0], ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${profile}`, '--virtual-time-budget=5000', `--print-to-pdf=${resolve(`${OUT}.pdf`)}`, `file:///${resolve(`${OUT}.html`).replace(/\\/g, '/')}`], { stdio: 'ignore' });
  const fresh = () => existsSync(`${OUT}.pdf`) && statSync(`${OUT}.pdf`).mtimeMs >= started - 1000 && statSync(`${OUT}.pdf`).size > 0;
  for (let i = 0; i < 300 && !fresh(); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  if (!fresh()) throw new Error(`PDF not written within 30 s: ${OUT}.pdf`);
  const pdf = readFileSync(`${OUT}.pdf`, 'latin1'), pages = (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
  console.log(`wrote ${OUT}.pdf (${pages} pages)`);
}
