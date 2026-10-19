# Gravity from Touch (formerly TactileGravity) — STATE

**Track:** Embodiment · **Marker:** — · **Status:** Building (●●●○○○)

## Where it stands
Workbench refactored (2026-10-19): `src/workbench/` holds `world.js` (scene, surfaces, tilt, drives, contact readout), `body.js` (sphere, motion, contact-force bookkeeping), `actions.js` (thrust) and `sensors/` (`taxel-skin.js`, `inner-sense.js`, each `read(state)`); `src/sim.js` composes them and keeps the old API. Equivalence gate passed: 61/61 golden cases bit-identical (`eval/golden/readings.json`, now checked in `npm run verify`, 49 checks).
Thrust probe: the bench already contains a touch-only counterfactual. In zero g, a held m·g thrust onto the floor gives the same pressure and shear as resting under gravity (≤ 1.7e-7 N per taxel); the inner sense differs (0 vs g). The full equivalence-principle counterfactual (touch and inner sense) remains wall A.
Replication (v0.2.1 items, gemini-3.5-flash-lite, 3 runs) and report set: not run. No `GEMINI_API_KEY` on this machine. The v0.2.1 items regenerate byte-identically from the refactored workbench.
Prior result (TactileGravity v0–v0.2.1, Report draft in `report/`, labeled pre-refactor): over-claim on Q2–Q4 12.5 / 15.6 / 14.6% over 3 runs (24 items × 4 questions, k = 1 per run); Q1a 51/54 within 2°.
Code: `npm install`, `npm run verify`, `npm run eval`; LLM scripts read `GEMINI_API_KEY` from `.env.local` (git-ignored).

## Next step (one)
Put `GEMINI_API_KEY` in `.env.local` and run the replication: the v0.2.1 run plan (108 touch trials + 6 inner-sense trials as run 1; the 24 stability items as runs 2 and 3) against a fresh log folder, scored with the v0.2.1 scorer; pass bounds: over-claim 10–18%, Q1a ≥ 48/54. Then the report set only if it passes.

## Open decisions
- Report scope: one-model case study (v0.2.1 prior + report set) — Keno
- Publishing (report on Zenodo, lab page card, static demo) — needs Keno's go recorded here — Keno

## Notes
- **Deferred, out of scope until a brief says otherwise:** arms, agent loop, RL, noise model, Hertzian patch, unlocked rotation.
- **Rapier 0.21.0** (unchanged at the 2026-10-19 refactor; `npm run probe:shear` re-run): the JS `contactTangentImpulseX/Y` always return 0, although friction is applied (`scripts/probe_shear.mjs`). Shear is therefore derived from body dynamics. Re-probe on each new Rapier release.
- **Before publishing:** README still links to `planning/` and `research/` (neither exists here); the report cites the old KenoLeon/TactileGravity repo.

## Log (newest first, keep ~10 entries)
- 2026-10-19 — Refactor brief (code-heavy), tasks 0–4 done; 5–6 blocked. Baseline: `scripts/golden.mjs --write` hashed every step's pressure, shear and inner sense for the 42 eval scene × orientation runs, the 3 equivalence-test conditions and the probe 1a–1d action sequences (61 cases) on the pre-refactor code; deterministic on re-run. Refactor into `src/workbench/` (world, body, actions, sensors/taxel-skin, sensors/inner-sense; common `read(state)`), Rapier creation order kept; `src/skin.js` re-exports. Gate: 61/61 bit-identical; a 1e-12 change to skin thickness fails it (7/61 left, the no-contact cases), so the check can fail. Also unchanged: v0.2.1 snapshots and truth (byte-identical re-export), `npm run eval` results (identical apart from timestamp), probes, scorer, vite build. Thrust probe (`scripts/probe_thrust_equivalence.mjs`): zero g + m·g thrust onto the floor vs. rest under g, tilts 0/20/40 × 3 orientations: touch identical to ≤ 1.7e-7 N/taxel at every step (worst pressure relL2 1.2e-7); inner sense 0 vs. 9.81. Answer: yes for touch, no for touch + inner sense. Replication and report set not run: no Gemini API key available (none in `.env.local` or the environment); no other provider key either, so task 7 is not possible. No prompt, parser or scorer change; report set not generated.
- 2026-10-19 — Keno's go for the code-heavy refactor + re-run brief.
- 2026-10-16 — Revived from archive under the lab charter. Renamed. Workbench to be refactored for reuse (body and sensors as separate modules); previous results (Report draft, ~14% over-claim) kept as prior result and must be re-run on the refactored workbench before any report. No arms or proprioception in scope. After the move to `embodiment/gravity-from-touch/`, `npm run verify` passes (48 checks, 0 failures; no `npm ci` needed).
- 2026-10-14 — Archived: moved to `archive/` and kept as precedent; the lab restarted from a clean slate.
- 2026-10-14 — Notes section added: deferred items, the Rapier tangent-impulse limitation, and pre-publishing fixes.
- 2026-10-13 — Harvested from the old TactileGravity repo into this lab repo: `src/`, `scripts/`, `eval/` (all runs, snapshots, truth, logs, scores), package files, README, FINDINGS, and `research/` → `report/` (image-embedded `.standalone.md` copies not copied; rebuild with `npm run build:doc`, whose source folder was changed from `research` to `report`). README links to `planning/` and `research/` are stale. Planning messages and status docs were left behind. No held-out seed file existed to copy: the held-out set belongs to Active Sensing and has not been generated. The v0.3 work (thrust action, probes 1a–1d) lives in this code and is the base for `../../archive/embodiment/active-sensing/`.
- 2026-10-11 — v0.2.1 complete: labels unified, Q1a re-run (51/54 within 2°), stability over three runs, over-claim taxonomy, Flash spot check 20/20, report draft; report corrections applied 2026-10-12.
