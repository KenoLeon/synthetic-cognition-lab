# TactileGravity — STATE

**Track:** Embodiment · **Marker:** — · **Status:** done

## Where it stands
v0–v0.2.1 are done. A simulated sphere with a 200-taxel skin (pressure, shear) and an unnamed inner sense; ground truth for every scene; identifiability labels for what touch can and cannot tell. The LLM (gemini-3.5-flash-lite) combines touch readings accurately (push direction within 2° in 51 of 54 trials) but over-claims on about 14% of questions its senses cannot answer (14.2% ± 1.3 across three runs). A 20-item spot check of gemini-3.8-flash is included.
The short report draft is `report/tactile-gravity-v0.2-report.md`: Methods, Results, Limitations and Appendices are drafted and corrected; the Introduction, Abstract and Discussion are stubs for Keno.
Code: `npm install`, `npm run verify`, `npm run eval`; LLM scripts read `GEMINI_API_KEY` from `.env.local` (git-ignored, not copied).

## Next step (one)
Keno writes the report's Introduction, Abstract and short Discussion; then Claude Code checks every number and a fresh session red-teams the draft before Zenodo.

## Open decisions
- Report title and subtitle — keep the "case study with one model" scope — Keno
- Publishing (report on Zenodo, lab page card, static demo) — needs Keno's go recorded here — Keno

## Log (newest first, keep ~10 entries)
- 2026-10-13 — Harvested from the old TactileGravity repo into this lab repo: `src/`, `scripts/`, `eval/` (all runs, snapshots, truth, logs, scores), package files, README, FINDINGS, and `research/` → `report/` (image-embedded `.standalone.md` copies not copied; rebuild with `npm run build:doc`, whose source folder was changed from `research` to `report`). README links to `planning/` and `research/` are stale. Planning messages and status docs were left behind. No held-out seed file existed to copy: the held-out set belongs to Active Sensing and has not been generated. The v0.3 work (thrust action, probes 1a–1d) lives in this code and is the base for `../active-sensing/`.
- 2026-10-11 — v0.2.1 complete: labels unified, Q1a re-run (51/54 within 2°), stability over three runs, over-claim taxonomy, Flash spot check 20/20, report draft; report corrections applied 2026-10-12.
