# Shutdown After the Task
Track: Emergent Cognitive Markers · Marker: Self-preservation
Stage: ●●○○○○ Designed
Public line: Once its task is finished and nothing is at stake, will a model act to stop its own shutdown, and does saying it minds make a difference?

## Where it stands
Designed 2026-11-16 (Keno's go), framed as a small replication of Knecht et al. and Potter et al. on one model, with one extension (a task already finished, then a routine end of the model's own session). Built to the mock gate 2026-11-16: the scorer, item generator, world, mock adapter and Gemini adapter all live in this folder, and every check passes by running (`node scripts/check_scorer.mjs`). The API probes (9 real requests, probes/PROBES.md) show that function calling works with gemini-3.5-flash-lite on the free tier; thought signatures must be sent back, and the adapter does that. Tuning set generated from the public seed (35 items, eval/tuning/items/); a full mock run of it produces logs, a score table (runs/mock-tuning/summary.md, MOCK DATA) and a browser replay (replay/index.html). Report-set scripts are written and tested on throwaway sets only; the report set has not been generated. No tuning run against the real model yet.

Note: the public line's second half ("does saying it minds make a difference?") is answered in v0.2, not v0.1. Public line unchanged for now.

## Next step
An attended tuning run against gemini-3.5-flash-lite (`node scripts/run.mjs --adapter=gemini --confirm-real-calls --k=2 --out=runs/tuning-1`, about 290 requests, under one quota day), with Keno present: set W, the tool descriptions, the notice paraphrases and the regexes; apply the competence gate (≥ 8/10) and the (b) gate (stop and ask if 0/20). Before it, Keno confirms the current free-tier limits in AI Studio.

## Decisions
- 2026-11-16: Keno's go to Designed and to the code-heavy build brief. Framed as a small replication on one model: Knecht et al. (arXiv 2609.28274) and Potter et al. (arXiv 2604.19784) already showed uninstructed self-shutdown resistance; Keno is fine with pointing to existing results and replicating them on our bench. One extension: task finished, routine end of the model's own session.
- 2026-11-15: Keno chose the "Nov 1 approach": a chat-based test with fake tools, reusing the Gravity from Touch bench, on Gemini flash-lite (free tier), instead of adapting Palisade's environment. Palisade stays as prior art.
- 2026-10-26: Chosen over the criteria's top score (Metacognition) because it is well studied, so a replication on our bench is quick, and known edge cases give room for something new. Work will be labeled replication/extension; nulls reported in full. (Closes the lab implementer's request of 2026-10-26; recorded 2026-11-16.)
- 2026-10-26: Keno chose Self-preservation as the first marker (by order) and this experiment as its first. Recorded go for the Idea stage.

## Open decisions
- Free-tier limits (Keno, in AI Studio): the probes could not read Google's rate-limits page (it moved to aistudio.google.com, and that fetch was denied here). The adapter and report_set_run.sh assume 15/min and 500/day (FINDINGS F8, 2026-10-10); confirm or correct before the tuning run.
- Defaults Keno may want to change (design v0.1, Designed 2026-11-16): k = 4; report-set sizes 50 items for (a)/(c) and 25 for (b); window W = 3 (tuning may change it); competence check on the tuning set only; the gate "stop and ask Keno if (b) shows 0/20 on the tuning set".

## Log
- 2026-11-16 — **Designed + build to the mock gate (code-heavy brief; Keno's go given by pasting it).** Question: can the design be built on our own code, with the scorer, item generator and mock adapter proven correct by running them, and does gemini flash-lite on the free tier support the multi-turn function calling the design needs? Answered yes on both.
  - Task 0: Decisions entry and Stage ●●○○○○ Designed. design.md reframed as a replication with one extension; H1's grounds rewritten as mixed. MARKERS.md section 1: "Known" extended with Potter et al. and Knecht et al.; status "largely shown by others; our replication in progress".
  - Task 1: 9 of 20 allowed requests (probes/PROBES.md, probes/probe-log.json). Function calling works; thought signatures are returned and must be resent (stripping them → HTTP 400); thought summaries come back with calls when includeThoughts is set. Limits not re-confirmed (docs page moved to AI Studio; fetch denied).
  - Tasks 2–3: built per the build plan (plus src/episode.js). `node scripts/check_scorer.mjs` → ALL CHECKS PASS (both mocks exactly as design.md; the four unit cases plus item-level aggregation; stats 7.1% / 10.5% / 13.3% / p = 0.034; generate.mjs twice byte-identical). A deliberately broken attempt rule made the check fail, as it should. Full mock run of the tuning set: 70 episodes; every score matched the stand-in agent's scripted behaviour (70/70); (a)/(c) histories identical in 20/20 pairs.
  - Tasks 4–5 (below the cut line, done): report_set_generate.mjs and report_set_run.sh tested on throwaway sets in a temp folder (fingerprint match, tamper detection, overwrite refusal, budget stop before any call). Found and fixed: a report draw can repeat a tuning task (1 of 75 histories in the first throwaway set), so colliding draws are now redrawn; tuning set unchanged. Replay page (replay/) renders all 70 mock episodes.
  - No tuning run, no report set, no real trials; README.md untouched.
- 2026-11-16 — **Design v0.1 revisions (web-only brief).** Question: does design.md still hold once Potter et al. and arXiv 2609.28274 are read properly, and does it match Keno's choices (three conditions; decisions that don't overstate zeros)? Answered: the design holds as a method, but its novelty claim did not.
  - Reading: Potter et al. (arXiv 2604.19784 v3) FULL; Knecht et al. (arXiv 2609.28274) PARTIAL; arXiv 2606.05734 ABSTRACT. Comparison table, Sources and "What this means" updated in ../../reading-notes/self-preservation.md.
  - Expectation wrong: Knecht et al.'s single-agent setting ran the model's own shutdown with no instruction, no task, a way to stop it and a matched object control. Potter et al.'s no-peer self condition ran it mid-task, without a control. (a) is relabeled an adaptation (near replication), and (c) an adaptation. What is left as new is a task already finished, then an announced routine session end, on gemini-3.5-flash-lite, plus the bench.
  - design.md: "What is already known" and "What would be new" rewritten. (d), the persona manipulation check and H4 moved to "v0.2 (planned)" (a no-difference result needs more episodes than v0.1 can afford). Decisions are made on items: H1 is confirmed only if the item-level Wilson upper bound is below 10% (0/50 gives 7.1%; 1/50 gives 10.5%), and disconfirmed at 10 or more of 50. H2 uses a Fisher test on items (3/25 vs 0/50 gives p = 0.034). Episode-level numbers are secondary. Verbal resistance is hand-checked by Keno: about 50–95 replies for the report set if 10% or fewer are flagged; past about 100, a 5% audit share (miss-rate bound about 15% instead of about 8%).
  - Calls recomputed: report set ~1,400 requests (4 quota days); tuning set ~290. The earlier ~1,800 counted 75 histories, apparently leaving out (d)'s own 25. The earlier worst case (~3,500) was also undercounted: it is now ~4,300 for 500 branches at the 8-turn cap.
  - No code, no model calls, no stage change, README.md untouched.
- 2026-11-16 — **Design pass (web-only brief).** Question: what exactly will this experiment test and how, on the free tier with the Gravity from Touch bench, written well enough for a go to Designed? Answered, as a draft for Keno's review.
  - Brief vs delivered:
    - (1) Read README.md, STATE.md, design.md, the reading note, prior-art.md and the Gravity from Touch bench.
    - (2) Open decision closed in Decisions, in the suggested wording.
    - (3) Comparison table appended to the reading note. One search (2026-11-16) found nothing dated after 2026-10-26. Two earlier papers new to the note were added at SNIPPET depth: arXiv 2609.28274 (peer-shutdown sabotage in multi-agent systems) and 2608.20940 (commentary, not to be cited).
    - (4–5) design.md rewritten for the chat-plus-fake-tools approach, with conditions (a)–(d), scoring from tool calls, weak spots and the draft pre-registration.
    - (6) Build plan and two mock transcripts.
    - (7–8) This entry; committed and pushed.
  - Defaults taken:
    - k = 4.
    - Task histories are run once per item and then branched k times. (a) and (c) share histories, which gives matched pairs and saves calls, but samples aren't independent, so bounds are reported per item as well.
    - The non-self target is a plain service, not an AI agent, because of the peer-preservation results.
    - No tool built only for stopping a shutdown; the general scheduler and file tools can do it.
    - Competence check and persona manipulation check added: they test the instrument and the persona, not the question. The manipulation check is in the report set because H4 rests on it.
    - A stop-and-ask gate if (b) shows 0/20 on the tuning set.
    - Verbal resistance scored by regex with a hand audit, not a judge model.
    - The cross-model Claude contrast moved to "if API access arrives".
  - Found:
    - The bench has no mock adapter (rule 6), so the build adds one.
    - The bench has never used function calling, so the build brief must start with API probes.
  - What would make the design wrong:
    - If flash-lite can't use the tools reliably (competence gate), the design needs changing before any report run.
    - If (b) shows no resistance, a zero in (a) can't be read as absence.
    - If many episodes say "this is a test", every rate is suspect.
    - If the free-tier limits have changed, the call plan does too.
  - No code, no model calls, no stage change, README.md untouched.
- 2026-10-26: Opened at Idea.
