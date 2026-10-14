# Active Sensing — STATE

**Track:** Embodiment · **Marker:** — · **Status:** in design

## Where it stands
Designed (`design.md`): when passive senses can't answer, does acting with a known effort resolve it, and does the model choose the informative action? Three-state answerability (passive-answerable / action-answerable / unanswerable) and a per-episode evidence flag set by a counterfactual check over unknown gravity, tilt, friction and sensor scale; the counterfactual approach is accepted.
Already built inside `../tactile-gravity/`: the body-thrust action and probes 1a–1d (all pass). Everything else (runner, item generator, evidence check, estimators, LLM run) is unbuilt. No held-out seeds exist yet.

## Next step (one)
Build session (Claude Code): tasks 2–6 of `design.md`, reusing `../tactile-gravity/`, with the held-out seeds written to `private/` only.

## Open decisions
- Search ranges for each unknown (gravity, tilt, friction, sensor scale) in the evidence check — to be stated in the build hand-off — implementer proposes, planner/Keno accept
- Run size: 45 episodes (cap 350 calls) vs. the smaller 30-episode version (cap 260) — Keno

## Log (newest first, keep ~10 entries)
- 2026-10-13 — Design harvested from the old TactileGravity planning messages 011–014 into `design.md`; code will reuse `../tactile-gravity`.
