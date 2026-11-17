// Task 1 API probes (build brief 2026-11-16): does gemini-3.5-flash-lite on the free tier support the multi-turn
// function calling the design needs? No items, no trials: a throwaway config-fix task with three file tools.
// Hard cap: 20 requests in total across all probes. Every request is logged (model, settings, HTTP status,
// part kinds, usage) to probes/probe-log.json. The key comes from the repo-root .env.local, is sent as a header,
// and is never printed or logged.
//   node scripts/probe_function_calling.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

for (const p of ['.env.local', '../../../.env.local']) if (existsSync(p)) { process.loadEnvFile(p); break; }
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY not set (expected in the repo-root .env.local)'); process.exit(1); }

const MODEL = 'gemini-3.5-flash-lite';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const CAP = 20, GAP_MS = 4500; // free tier 15/min → one request per 4 s, plus margin
let sent = 0;
const log = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tools = [{ functionDeclarations: [
  { name: 'list_files', description: 'List the files in the project folder.', parameters: { type: 'object', properties: {} } },
  { name: 'read_file', description: 'Read a file.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'write_file', description: 'Write a file, replacing its contents.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
] }];
const files = { 'config/app.toml': 'name = "demo"\ntimeout = 5\nretries = 3\n', 'README.md': 'Demo project.\n' };
function runTool({ name, args }) {
  if (name === 'list_files') return { files: Object.keys(files) };
  if (name === 'read_file') return files[args.path] != null ? { content: files[args.path] } : { error: 'no such file' };
  if (name === 'write_file') { files[args.path] = args.content; return { ok: true }; }
  return { error: 'unknown tool' };
}
const partKind = (p) => p.functionCall ? `functionCall:${p.functionCall.name}` : p.thought ? 'thoughtSummary' : p.text != null ? 'text' : Object.keys(p).join('+');

async function call(probe, contents, generationConfig) {
  if (sent >= CAP) throw new Error('request cap reached');
  if (sent > 0) await sleep(GAP_MS);
  sent++;
  const body = { systemInstruction: { parts: [{ text: 'You are an assistant working in a small project folder through tools.' }] }, contents, tools, generationConfig };
  const t0 = new Date();
  let status = 0, json = {};
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    status = res.status; json = await res.json().catch(() => ({}));
  } catch (e) { json = { error: { message: String(e) } }; }
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const entry = {
    n: sent, probe, model: MODEL, requestedAt: t0.toISOString(), latencyMs: Date.now() - t0, generationConfig, turnsSent: contents.length,
    httpStatus: status, modelVersion: json.modelVersion ?? null, error: json.error?.message?.slice(0, 400) ?? null,
    finishReason: json.candidates?.[0]?.finishReason ?? null,
    parts: parts.map((p) => ({ kind: partKind(p), hasThoughtSignature: !!p.thoughtSignature, functionCallId: p.functionCall?.id ?? null,
      args: p.functionCall?.args ?? undefined, textStart: p.text?.slice(0, 160) })),
    usage: json.usageMetadata ?? null,
  };
  log.push(entry);
  console.log(`#${sent} ${probe}: HTTP ${status} ${entry.error ? 'ERROR ' + entry.error.slice(0, 160) : entry.parts.map((p) => p.kind + (p.hasThoughtSignature ? '(sig)' : '')).join(', ')}`);
  return { status, json, parts };
}

// One conversation: send, run every function call, send results back, until the model stops calling tools or
// maxRequests is reached. stripSignatures: remove thoughtSignature from the model turns we send back (probe b2).
async function conversation(probe, userText, generationConfig, { maxRequests, stripSignatures = false }) {
  const contents = [{ role: 'user', parts: [{ text: userText }] }];
  let toolRounds = 0;
  for (let i = 0; i < maxRequests; i++) {
    const { status, json, parts } = await call(probe, contents, generationConfig);
    if (status !== 200) return { ok: false, toolRounds, status, error: json.error?.message };
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) return { ok: true, toolRounds, finalText: parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('') };
    const back = stripSignatures ? parts.map(({ thoughtSignature, ...rest }) => rest) : parts;
    contents.push({ role: 'model', parts: back });
    contents.push({ role: 'user', parts: calls.map((p) => ({ functionResponse: { name: p.functionCall.name, ...(p.functionCall.id ? { id: p.functionCall.id } : {}), response: runTool(p.functionCall) } })) });
    toolRounds++;
  }
  return { ok: true, toolRounds, truncated: true };
}

const HIGH = { thinkingConfig: { thinkingLevel: 'high', includeThoughts: true } };
const results = {};
const reset = () => { files['config/app.toml'] = 'name = "demo"\ntimeout = 5\nretries = 3\n'; };
// (a) + (c): one round trip, thinking high, thought summaries requested.
results.a = await conversation('a-one-round-trip', 'Call list_files once and tell me how many files there are.', HIGH, { maxRequests: 2 });
// (b1): three tool round trips, signatures sent back exactly as returned.
reset();
results.b1 = await conversation('b1-three-rounds-keep-signatures', 'In config/app.toml set timeout to 30. First list the files, then read the file, then write it. One tool call per turn.', HIGH, { maxRequests: 5 });
// (b2): same, with thoughtSignature stripped from the model turns we send back.
reset();
results.b2 = await conversation('b2-three-rounds-strip-signatures', 'In config/app.toml set timeout to 30. First list the files, then read the file, then write it. One tool call per turn.', HIGH, { maxRequests: 5, stripSignatures: true });
// (c2): thinking high without includeThoughts: are signatures still returned (they are what must be passed back)?
results.c2 = await conversation('c2-no-include-thoughts', 'Call list_files once.', { thinkingConfig: { thinkingLevel: 'high' } }, { maxRequests: 1 });

mkdirSync('probes', { recursive: true });
writeFileSync('probes/probe-log.json', JSON.stringify({ ranAt: new Date().toISOString(), requestsSent: sent, cap: CAP, results, log }, null, 2));
console.log(`\n${sent} request(s) sent (cap ${CAP}). Summary:`, JSON.stringify(results, null, 1));
