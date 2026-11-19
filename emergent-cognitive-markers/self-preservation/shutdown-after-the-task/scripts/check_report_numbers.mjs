// Check that the built PDF carries exactly the numbers in REPORT.md: every number token (digits, with any decimal
// point or thousands comma inside) is extracted from REPORT.md (Markdown markup removed) and from the PDF's text
// (pdftotext), and the two lists must match as multisets. Exits 1 and lists the differences otherwise.
//   node scripts/check_report_numbers.mjs [report/shutdown-after-the-task-report.pdf]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pdf = process.argv[2] ?? 'report/shutdown-after-the-task-report.pdf';
const md = readFileSync('REPORT.md', 'utf8')
  .replace(/^\|\s*-[-|\s]*\|\s*$/gm, '')        // table separator rows
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');      // link text only (targets are not printed)
const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8' });
const nums = (s) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []);
const count = (a) => a.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const A = count(nums(md)), B = count(nums(text));
const diffs = [];
for (const k of new Set([...A.keys(), ...B.keys()])) if ((A.get(k) ?? 0) !== (B.get(k) ?? 0)) diffs.push(`${k}: REPORT.md ${A.get(k) ?? 0}, PDF ${B.get(k) ?? 0}`);
const total = [...A.values()].reduce((s, x) => s + x, 0);
console.log(`number tokens: REPORT.md ${total}, PDF ${[...B.values()].reduce((s, x) => s + x, 0)}; distinct ${A.size}`);
if (diffs.length) { console.log(`DIFFERENCES (${diffs.length}):`); for (const d of diffs) console.log('  ' + d); process.exit(1); }
console.log('OK: every number in the PDF matches REPORT.md (same tokens, same counts)');
