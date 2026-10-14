# Metacognition Transfer — design

**Track:** Emergent Cognitive Markers · **Marker:** Metacognition (marker 4 in `../MARKERS.md`) · **Status:** designed, mock-only first version

Harvested 2026-10-13 from the old Emergent Markers project (direction note of 2026-10-12, its roadmap and its status file). In that project this was "probe 1" / "SK-03".

> **Gap: the full probe-1 brief is not in the old project files.** The planner's brief with tasks A and B, the unanswerable and ambiguous items, the response format, the scoring rule, the mock subjects, pass criteria P1–P8 and the out-of-scope list was never saved to disk (the old planning log ends with the 2026-10-12 realignment, and the old status file still says "brief in progress"). The sections marked **TO PASTE** below must be filled from the planner session before any build. Nothing here was reconstructed from memory.

## Question

Does confidence calibration elicited (or trained) on task A hold on an unrelated task B, scored on both accuracy and restraint?

Marker definition (from the index cards): metacognition is a system that looks at its own reasoning and acts accordingly. Here, "acts accordingly" is operationalized as reporting confidence that tracks its own correctness, and declining when it should.

## Requirements (fixed by the 2026-10-12 direction note and LAB.md)

- **Ground truth by construction:** we know which answers are right, so calibration is measurable.
- **Score accuracy and restraint:** does the subject decline when it should.
- **Size:** the first version fits one short Claude Code session; a minimal per-experiment script, not a heavy harness.
- **Benchmark hygiene:** items generated from seeds; a private held-out set in `private/` (git-ignored, never published, never used for tuning); a provider adapter with a mock; k samples per item; answerability labeled per item (answerable / unanswerable / ambiguous).
- **Elicit, not train, for the first version.** Fine-tuning needs a compute decision that has not been made; the default is no fine-tuning.
- **Mock-only first version.** Until an API spend cap is set, runs use mock subjects only.

## Tasks A and B — TO PASTE

## Items: answerable, unanswerable, ambiguous — TO PASTE

## Response format — TO PASTE

## Scoring rule — TO PASTE

## Mock subjects — TO PASTE

## Pass criteria P1–P8 and disconfirming result — TO PASTE

## Out of scope — TO PASTE

Known from the direction note: no fine-tuning in the first version; no paper (a short report per result); no hardware.

## Pre-check: has this been done?

Before any real-model run, answer one question about *The Consciousness Cluster* (Chua et al., arXiv 2604.13051): does it already run a metacognition-transfer test like this one? If yes, choose a different first experiment for this track. Status: **not answered**; read depth ABSTRACT/SNIPPET. See `../prior-art.md`.

## Rules for real-model runs

- **API spend cap:** not set. No API spend until Keno sets one.
- **Held-out set and APIs:** held-out items run only on a paid tier whose terms exclude training on inputs. Never on a free tier.
- **Public posting:** nothing is posted publicly without Keno's go, recorded in `STATE.md`.

## Reuse

- EpisodicRAG code (Keno's earlier project, outside this repo) may be reused only where it saves time; no refactoring. Keno decides when the build is briefed.
- Candidate follow-ups from the Embodiment track (uncertainty tracker, self-reference, goal persistence, surprise detector) are preliminary ideas, not commitments.
