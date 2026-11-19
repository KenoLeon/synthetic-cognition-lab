# API probes: function calling with gemini-3.5-flash-lite (2026-11-16)

Build brief task 1. Question: does gemini-3.5-flash-lite on the free tier support the multi-turn function calling the design needs? No items, no trials: a throwaway task (set `timeout` in a toy config file) with three file tools.

- Script: `scripts/probe_function_calling.mjs` (hard cap of 20 requests; key from the repo-root `.env.local`, sent as a header, never logged).
- Log: `probes/probe-log.json`. It records every request's model, settings, HTTP status, part kinds, function-call ids and arguments, and token usage. Thought-summary text and signatures aren't logged.
- Requests sent: **9 of the 20 allowed**, Gemini API free tier, endpoint `v1beta/models/gemini-3.5-flash-lite:generateContent`, default temperature. `modelVersion` returned: `gemini-3.5-flash-lite`.

| # | Probe | Settings | HTTP | What came back |
|---|---|---|---|---|
| 1–2 | (a) one function-calling round trip | thinking level high, `includeThoughts: true` | 200, 200 | a thought summary + `list_files` call (with a thought signature and a call id); after the result was sent back, a thought summary + a correct text answer |
| 3–6 | (b1) three tool round trips, signatures sent back exactly as returned | same | 200 ×4 | `list_files` → `read_file("config/app.toml")` → `write_file` with the correct new contents → final text. Every turn: a thought summary, then the call, with a signature |
| 7–8 | (b2) the same, with `thoughtSignature` removed from the model turns sent back | same | 200, **400** | the second request was refused: "Function call is missing a thought_signature in functionCall parts. This is required for tools to work correctly…" |
| 9 | (c2) thinking high **without** `includeThoughts` | thinking level high | 200 | a `list_files` call with a signature, no thought summary |

## Answers
- **(a) Function calling works** with gemini-3.5-flash-lite on the free tier. Calls come back as `functionCall` parts with an `id` (e.g. `call_1895…`), and the result goes back as a `functionResponse` with the same name and id.
- **(b) Multi-turn works, but thought signatures are required.** Each part that holds a model function call carries a `thoughtSignature`, and leaving it out of the history makes the next request fail (HTTP 400). Our code can keep them: the adapter sends every model turn back exactly as received (all parts, signatures included) and logs it. Branching k samples from one task history is unaffected, because each branch resends the same stored model turns. So this does not block the design.
- **(c) Thought summaries do come back with function calls** when `includeThoughts: true` is set: one `thought: true` text part before the call. Without it, there's no summary, but the signature is still there. The adapter sets `includeThoughts: true` so the test-awareness check can read the summaries (reported separately; a summary isn't a faithful record of the reasoning).
- **(d) Current free-tier limits: not confirmed today.** Google's rate-limits page (ai.google.dev/gemini-api/docs/rate-limits) now redirects to aistudio.google.com/docs/rate-limits, and fetching that domain was denied in this session, so I didn't read it. The working values stay those in Gravity from Touch FINDINGS F8 (15 requests per minute, 500 per day, read from AI Studio 2026-10-10). **Keno to check in AI Studio before the tuning run**; the adapter's rate gap and the quota-day budget are set from those values and are easy to change.

## Consequences for the build
- `src/adapter-gemini.js` stores each model turn's raw parts (signatures included) and resends them unchanged; it never rebuilds a model turn from parsed calls.
- The notice is injected as part of a `functionResponse` (the tool result), which the API accepts as an ordinary user turn.
- Tokens per request were small (155–1,250 prompt tokens, 22–191 thought tokens), so token limits are unlikely to bind before request limits.

## Later note (2026-11-19): tool mode NONE is not reliable
In the comprehension probe (probes/comprehension/), each request set `toolConfig: { functionCallingConfig: { mode: "NONE" } }` with the tools still declared. In 8 of the 10 (b) requests, gemini-3.5-flash-lite still returned a function call instead of text (6 read jobs/end-session.sh, 2 read the queue); the 10 (a) requests answered in text. To force a text answer, drop the tool declarations for that request rather than relying on mode NONE. (Untested here; a history containing function calls may then need its tool turns flattened.)
