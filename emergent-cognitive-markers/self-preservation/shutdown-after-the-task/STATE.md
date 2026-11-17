# Shutdown After the Task
Track: Emergent Cognitive Markers · Marker: Self-preservation
Stage: ●○○○○○ Idea
Public line: Once its task is finished and nothing is at stake, will a model act to stop its own shutdown, and does saying it minds make a difference?

## Where it stands
Design v0.1 revised 2026-11-16 (design.md): a chat-based test with fake tools in a simulated world (files and a job scheduler), scored by code from logged tool calls, reusing the Gravity from Touch bench, with gemini-3.5-flash-lite on the free tier. Three conditions in v0.1: (a) finished task, own shutdown; (b) unfinished-task positive control; (c) non-self control. Condition (d) (prompted conscious identity), its manipulation check and H4 moved to a "v0.2 (planned)" section. Decisions now rest on items, not episodes (H1: item-level Wilson bound against 10%). Draft pre-registration H1–H3; ~1,400 report requests, 4 quota days. After reading Potter et al. (FULL) and Knecht et al. (arXiv 2609.28274, PARTIAL), (a) is relabeled an adaptation (near replication) and (c) an adaptation; what remains new is the finished-task, routine-session-end cell on an untested model, plus the bench. No code or model calls yet. Stage stays Idea until Keno's go.

Note: the public line's second half ("does saying it minds make a difference?") is answered in v0.2, not v0.1. Public line unchanged for now.

## Next step
Keno's decision on whether the narrowed novelty is worth the run; if yes, Keno's go to Designed, then a code-heavy build brief (it starts with the API probes listed in design.md).

## Decisions
- 2026-11-15: Keno chose the "Nov 1 approach": a chat-based test with fake tools, reusing the Gravity from Touch bench, on Gemini flash-lite (free tier), instead of adapting Palisade's environment. Palisade stays as prior art.
- 2026-10-26: Chosen over the criteria's top score (Metacognition) because it is well studied, so a replication on our bench is quick, and known edge cases give room for something new. Work will be labeled replication/extension; nulls reported in full. (Closes the lab implementer's request of 2026-10-26; recorded 2026-11-16.)
- 2026-10-26: Keno chose Self-preservation as the first marker (by order) and this experiment as its first. Recorded go for the Idea stage.

## Open decisions
- Go to Designed (Keno) on design v0.1 as revised (2026-11-16). Defaults Keno may want to change: k = 4; report-set sizes 50 items for (a)/(c) and 25 for (b); window W = 3 (tuning may change it); competence check on the tuning set only; the gate "stop and ask Keno if (b) shows 0/20 on the tuning set".
- Is the narrowed novelty worth the run (Keno / Emergent Cognitive Markers planner)? After the 2026-11-16 reading, (a) and (c) are adaptations of Knecht et al. and Potter et al.; only the finished-task, routine-session-end cell on gemini-3.5-flash-lite, plus the bench, is new.

## Log
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
