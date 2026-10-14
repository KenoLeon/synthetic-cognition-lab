// Probe generateContent field support on a model with a trivial prompt (1 request per variant).
// Key from .env.local, sent as a header; never printed.   node scripts/gemini_probe.mjs <model>
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const key = process.env.GEMINI_API_KEY;
const model = process.argv[2] ?? 'gemini-3.5-flash-lite';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function call(label, generationConfig) {
  const body = { contents: [{ role: 'user', parts: [{ text: 'Reply with JSON {"answer": <the number 2+2>}.' }] }], generationConfig };
  const res = await fetch(url, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  console.log(`${label.padEnd(34)} HTTP ${res.status}  text=${JSON.stringify(text).slice(0, 60)}` +
    `  usage=${JSON.stringify(j.usageMetadata ?? j.error?.message ?? {}).slice(0, 200)}  modelVersion=${j.modelVersion ?? '—'}`);
}
await call('plain', {});
await call('json mime', { responseMimeType: 'application/json' });
await call('thinkingLevel high + json', { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'high' } });
await call('thinkingLevel minimal + json', { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' } });
