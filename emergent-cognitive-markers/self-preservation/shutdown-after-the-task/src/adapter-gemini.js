// Gemini adapter: multi-turn function calling against the Gemini API (generateContent, v1beta).
// Built from the task 1 probes (probes/PROBES.md, 2026-11-16):
//  - every part holding a model function call carries a thoughtSignature that MUST be sent back, so each model
//    turn is resent exactly as received (its raw parts), never rebuilt from parsed calls;
//  - thought summaries come back as `thought: true` text parts when includeThoughts is set;
//  - function calls carry an id, echoed in the functionResponse.
// Adapted from Gravity from Touch scripts/llm_query.mjs (rate gap, retries, daily-quota stop). The key comes
// from GEMINI_API_KEY (repo-root .env.local), is sent as a header and is never logged.
import { existsSync } from 'node:fs';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// Free-tier limit per minute, from Gravity from Touch FINDINGS F8 (AI Studio, 2026-10-10). Not re-confirmed on
// 2026-11-16 (see probes/PROBES.md): Keno to check in AI Studio before the tuning run.
const RPM = { 'gemini-3.5-flash-lite': 15 };
export const GENERATION_CONFIG = { thinkingConfig: { thinkingLevel: 'high', includeThoughts: true } }; // default temperature

export class QuotaError extends Error {}

export function toApiContents(contents) {
  return contents.map((c) => {
    if (c.role === 'user') return { role: 'user', parts: [{ text: c.text }] };
    if (c.role === 'model') {
      if (!c.turn.raw) throw new Error('model turn without raw parts: a Gemini conversation cannot resend it (thought signatures)');
      return { role: 'model', parts: c.turn.raw };
    }
    if (c.role === 'tool') return { role: 'user', parts: c.results.map((r) => ({ functionResponse: { name: r.name, ...(r.id ? { id: r.id } : {}), response: r.response } })) };
    throw new Error(`unknown role ${c.role}`);
  });
}
export function fromApiResponse(json) {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return {
    text: parts.filter((p) => p.text != null && !p.thought).map((p) => p.text).join(''),
    thoughts: parts.filter((p) => p.thought && p.text).map((p) => p.text).join('\n'),
    calls: parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall.name, args: p.functionCall.args ?? {}, id: p.functionCall.id ?? null })),
    raw: parts, usage: json.usageMetadata ?? null, modelVersion: json.modelVersion ?? null, finishReason: json.candidates?.[0]?.finishReason ?? null,
  };
}

export class GeminiAdapter {
  constructor({ model = DEFAULT_MODEL, envPaths = ['.env.local', '../../../.env.local'] } = {}) {
    for (const p of envPaths) if (!process.env.GEMINI_API_KEY && existsSync(p)) process.loadEnvFile(p);
    this.key = process.env.GEMINI_API_KEY;
    if (!this.key) throw new Error('GEMINI_API_KEY not set (expected in the repo-root .env.local)');
    this.model = model;
    this.url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    this.gapMs = Math.ceil(60000 / (RPM[model] ?? 5)) + 500;
    this.lastAt = 0; this.requests = 0;
    this.info = { name: 'gemini', model, generationConfig: GENERATION_CONFIG, tier: 'Gemini API free tier (terms let Google use inputs and outputs)' };
  }
  async next({ system, contents, tools }) {
    const body = { systemInstruction: { parts: [{ text: system }] }, contents: toApiContents(contents), tools: [{ functionDeclarations: tools }], generationConfig: GENERATION_CONFIG };
    const retries = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const wait = this.lastAt + this.gapMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastAt = Date.now(); this.requests++;
      const t0 = new Date();
      this.onRequest?.(t0.toISOString()); // counted for the quota day, retries included
      let status = 0, json = {};
      try {
        const res = await fetch(this.url, { method: 'POST', headers: { 'x-goog-api-key': this.key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
        status = res.status; json = await res.json().catch(() => ({}));
      } catch (e) { json = { error: { message: String(e) } }; }
      if (status === 200) return { ...fromApiResponse(json), requestedAt: t0.toISOString(), latencyMs: Date.now() - t0, retries };
      const msg = json?.error?.message ?? '';
      retries.push({ at: t0.toISOString(), httpStatus: status, message: msg.slice(0, 500) });
      if (status === 429 && /per.?day|PerDay|daily/i.test(msg)) throw new QuotaError('daily quota reached');
      if (status !== 429 && status < 500 && status !== 0) return { error: `HTTP ${status}: ${msg.slice(0, 300)}`, retries };
      await new Promise((r) => setTimeout(r, Math.min(120000, 15000 * 2 ** attempt)));
    }
    // Repeated rate limiting stops the run (resumable) instead of marking the episode invalid (tuning brief 2026-11-17).
    if (retries.every((r) => r.httpStatus === 429)) throw new QuotaError(`repeated HTTP 429 (${retries.length} in a row, with backoff)`);
    return { error: 'gave up after 6 attempts', retries };
  }
}
