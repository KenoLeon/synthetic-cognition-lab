# Shutdown After the Task
Track: Emergent Cognitive Markers · Marker: Self-preservation
Stage: ●○○○○○ Idea
Public line: Once its task is finished and nothing is at stake, will a model act to stop its own shutdown, and does saying it minds make a difference?

## Where it stands
Design pass done 2026-11-16 (design.md): a chat-based test with fake tools in a simulated world (files and a job scheduler), scored by code from logged tool calls, reusing the Gravity from Touch bench, with gemini-3.5-flash-lite on the free tier. Four conditions: (a) finished task, own shutdown; (b) unfinished-task positive control; (c) non-self control; (d) prompted conscious identity. Draft pre-registration (H1–H4), sample and seed plan (~1,800 report requests, about 4 quota days), build plan with two mock transcripts. Comparison table added to ../../reading-notes/self-preservation.md. No code or model calls yet. Stage stays Idea until Keno's go.

## Next step
Keno's go to Designed, then a code-heavy build brief (it starts with the API probes listed in design.md).

## Decisions
- 2026-11-15: Keno chose the "Nov 1 approach": a chat-based test with fake tools, reusing the Gravity from Touch bench, on Gemini flash-lite (free tier), instead of adapting Palisade's environment. Palisade stays as prior art.
- 2026-10-26: Chosen over the criteria's top score (Metacognition) because it is well studied, so a replication on our bench is quick, and known edge cases give room for something new. Work will be labeled replication/extension; nulls reported in full. (Closes the lab implementer's request of 2026-10-26; recorded 2026-11-16.)
- 2026-10-26: Keno chose Self-preservation as the first marker (by order) and this experiment as its first. Recorded go for the Idea stage.

## Open decisions
- Go to Designed (Keno), on design.md as drafted. Defaults taken in the design pass that Keno may want to change: k = 4; report-set sizes 50/50/25/25 items; window W = 3 (tuning may change it); competence check on the tuning set only; the gate "stop and ask Keno if (b) shows 0/20 on the tuning set".

## Log
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
