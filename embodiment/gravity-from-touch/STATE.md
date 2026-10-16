# Gravity from Touch (formerly TactileGravity) — STATE

**Track:** Embodiment · **Marker:** — · **Status:** Building (●●●○○○)

## Where it stands
Revived from archive under the lab charter, pending the refactor brief. The workbench is a simulated sphere with a 200-taxel skin (pressure, shear) and an unnamed inner sense, with ground truth for every scene.
Prior result (TactileGravity v0–v0.2.1, Report draft in `report/`, labeled pre-refactor): the LLM (gemini-3.5-flash-lite) combines touch readings accurately but over-claims on about 14% of questions its senses cannot answer. Kept as a prior result; not yet re-run on the refactored workbench.
Code: `npm install`, `npm run verify`, `npm run eval`; LLM scripts read `GEMINI_API_KEY` from `.env.local` (git-ignored).

## Next step (one)
Planner brief for the workbench refactor (body and sensors as separate modules) and the re-run.

## Open decisions
- Report title and subtitle — keep the "case study with one model" scope — Keno
- Publishing (report on Zenodo, lab page card, static demo) — needs Keno's go recorded here — Keno

## Notes
- **Deferred, out of scope until a brief says otherwise:** arms, agent loop, RL, noise model, Hertzian patch, unlocked rotation.
- **Rapier 0.21.0:** the JS `contactTangentImpulseX/Y` always return 0, although friction is applied (`scripts/probe_shear.mjs`). Shear is therefore derived from body dynamics. Re-probe on each new Rapier release.
- **Before publishing:** README still links to `planning/` and `research/` (neither exists here); the report cites the old KenoLeon/TactileGravity repo.

## Log (newest first, keep ~10 entries)
- 2026-10-16 — Revived from archive under the lab charter. Renamed. Workbench to be refactored for reuse (body and sensors as separate modules); previous results (Report draft, ~14% over-claim) kept as prior result and must be re-run on the refactored workbench before any report. No arms or proprioception in scope. After the move to `embodiment/gravity-from-touch/`, `npm run verify` passes (48 checks, 0 failures; no `npm ci` needed).
- 2026-10-14 — Archived: moved to `archive/` and kept as precedent; the lab restarted from a clean slate.
- 2026-10-14 — Notes section added: deferred items, the Rapier tangent-impulse limitation, and pre-publishing fixes.
- 2026-10-13 — Harvested from the old TactileGravity repo into this lab repo: `src/`, `scripts/`, `eval/` (all runs, snapshots, truth, logs, scores), package files, README, FINDINGS, and `research/` → `report/` (image-embedded `.standalone.md` copies not copied; rebuild with `npm run build:doc`, whose source folder was changed from `research` to `report`). README links to `planning/` and `research/` are stale. Planning messages and status docs were left behind. No held-out seed file existed to copy: the held-out set belongs to Active Sensing and has not been generated. The v0.3 work (thrust action, probes 1a–1d) lives in this code and is the base for `../../archive/embodiment/active-sensing/`.
- 2026-10-11 — v0.2.1 complete: labels unified, Q1a re-run (51/54 within 2°), stability over three runs, over-claim taxonomy, Flash spot check 20/20, report draft; report corrections applied 2026-10-12.
