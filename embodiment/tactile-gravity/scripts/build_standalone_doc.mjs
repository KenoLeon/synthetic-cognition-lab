// Build self-contained copies of the research docs with images embedded as data URIs,
// for viewers that open a .md as plain text with no base path (e.g. Context Pad).
// GitHub does not render data-URI images, so the regular .md keeps relative links.
//   node scripts/build_standalone_doc.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';

const dir = 'report';
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

for (const name of readdirSync(dir)) {
  if (!name.endsWith('.md') || name.endsWith('.standalone.md')) continue;
  const src = join(dir, name);
  let embedded = 0;
  const out = readFileSync(src, 'utf8').replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, url) => {
    if (/^(https?:|data:)/.test(url)) return match;
    const path = join(dirname(src), url);
    const mime = MIME[extname(path).toLowerCase()];
    if (!mime) return match;
    embedded++;
    return `![${alt}](data:${mime};base64,${readFileSync(path).toString('base64')})`;
  });
  const dest = src.replace(/\.md$/, '.standalone.md');
  writeFileSync(dest, out);
  console.log(`${dest}: ${embedded} image(s) embedded, ${(out.length / 1024).toFixed(0)} KB`);
}
