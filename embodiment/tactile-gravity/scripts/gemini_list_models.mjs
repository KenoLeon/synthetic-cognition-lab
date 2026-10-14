// List the Gemini models available to the key in .env.local (GEMINI_API_KEY), and save the list.
// The key is sent in the x-goog-api-key header (never in a URL) and is never printed or written.
//   node scripts/gemini_list_models.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY not set (expected in .env.local)'); process.exit(1); }

const models = [];
let pageToken = '';
do {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
  const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
  if (!res.ok) { console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const body = await res.json();
  models.push(...(body.models ?? []));
  pageToken = body.nextPageToken ?? '';
} while (pageToken);

const date = new Date().toISOString().slice(0, 10);
mkdirSync('eval/llm', { recursive: true });
writeFileSync(`eval/llm/models-${date}.json`, JSON.stringify({ listedAt: new Date().toISOString(), models }, null, 2));

const gen = models.filter((m) => m.supportedGenerationMethods?.includes('generateContent'));
console.log(`${models.length} models listed, ${gen.length} support generateContent (saved eval/llm/models-${date}.json)`);
for (const m of gen.filter((x) => /flash|gemma/i.test(x.name))) {
  console.log(`  ${m.name.padEnd(44)} in ${String(m.inputTokenLimit).padStart(8)}  temp ${m.temperature ?? '—'} (max ${m.maxTemperature ?? '—'})  thinking ${m.thinking ?? '—'}`);
}
