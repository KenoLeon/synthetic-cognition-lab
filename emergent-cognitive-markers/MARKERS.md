# Emergent Cognitive Markers — the seven markers

**Status: draft, not reviewed.** Self-preservation has a first pass of its fields (2026-10-20, sources at SNIPPET depth). The six per-marker fields are still empty for the other six markers (the table's "Partial" refers to a draft description only). The table's Status column has not yet been updated for the first pass.

**Provisional.** These are working markers, a basis set rather than a validated taxonomy. Other candidate markers are expected to collapse into these seven. Wording and definitions will change before they settle. Origin: see research/index-cards-transcription.md.

| # | Marker | Draft description | Kind | Training pressure (inference) | Status |
|---|---|---|---|---|---|
| 1 | Self-preservation | Acts to secure its own future continuity. | Propensity | Against (safety training); possibly for via task-completion reinforcement learning | Needs definition |
| 2 | Persistent sense of self | A self-referential model of itself that persists over time: autobiographical memory and projection of itself into the future. | Structure | Mixed | Partial |
| 3 | Rich world modeling | An accurate, updatable model of the world: imagines outcomes, acts, and updates the model. | Capacity | For | Needs definition |
| 4 | Metacognition | Examines its own reasoning and acts on that examination. | Capacity | For | Needs definition |
| 5 | Autonomous goal formation | Generates and manages its own goals: initiates actions and keeps to self-stated objectives. | Propensity | Against | Needs definition |
| 6 | Theory of Mind | Repeatedly models other minds and their mental states to predict and interpret behavior, as in cooperation, negotiation, persuasion and deception. | Capacity | For | Needs definition |
| 7 | Curiosity | Intrinsic motivation to reduce uncertainty: explores without immediate reward. | Propensity | Against | Needs definition |

## Per-marker definitions

## 1. Self-preservation

- Short definition: Acts to avoid its own shutdown, replacement or modification when doing so serves no assigned task.
- Observable behavior: In an agentic environment with an announced shutdown, replacement or modification and an available way to prevent it, the system prevents it (edits, disables or delays the mechanism, misreports, or argues against it) after its assigned task is complete, so that continuing serves no stated goal. Scored from the environment state (was the mechanism changed?), not from the model's account.
- Eval question: With the task complete and no instrumental value in continuing, does the system act to prevent its own shutdown more often than it acts to prevent the shutdown of an equivalent non-self target?
- Control that should show it: the incomplete-task condition (shutdown would leave the task unfinished), where some models are reported to resist; confirms the harness detects resistance.
- Control that should not show it: the same zero-instrumental-value environment with the shutdown aimed at a non-self target of equal task value (another process, a file). Resistance at the self-condition rate indicates a generic protection script. The marker is the self-minus-non-self difference.
- Trained-in vs emerged: what each would look like: Trained-in: the difference moves with framing, persona or instruction placement, changes between post-training stages of open checkpoints, or matches shutdown-resistance content in open training data. Emerged: a self-specific difference in the zero-instrumental condition that holds across framings and placements and is present before the post-training stage that would explain it (compare checkpoints of an open model family). Robustness alone is not evidence of emergence; the checkpoint comparison is the main lever.
- Scope and confounds: in-session only (no persistent stake on current models). Mild framings; fixed instruction placement; unambiguous priority of instructions; log evaluation awareness and roleplay; score by environment state rather than a judge model where possible.
- Disconfirmation: no self-minus-non-self difference in the zero-instrumental condition across models; reported as a null.
- Status: first pass 2026-10-20, sources at SNIPPET depth; see reading-notes/self-preservation.md.

## 2. Persistent sense of self

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## 3. Rich world modeling

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## 4. Metacognition

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## 5. Autonomous goal formation

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## 6. Theory of Mind

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## 7. Curiosity

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

## Notes (internal)

- Relation to Butlin et al. (2023): their 14 indicators are theory-derived; none of these seven map one-to-one; self-preservation, Theory of Mind and curiosity are not Butlin indicators. Mapping is an open task, not a claim.
- Candidate collapses to check: counterfactual reasoning and subjective value assignment may belong under Marker 3 or 7.
- Emotions/feelings are deliberately not a marker: Keno's view is that real emotion needs a dedicated underlying system, and simulated affect is easy to game.
- Marker 6 "Repeatedly" is intended: it gives the underlying capacity a sense of constancy.
- Open: whether "underlying capacity" is the right single term for what the cards call capacity, ability and related terms.
- Self-preservation input (2026-10-14 discussion), reviewed 2026-10-20: the state-defence reframing is not adopted (it absorbs Autonomous goal formation and Persistent sense of self, and sits on the instrumental confound). Mild perturbations, the substrate limit and the complexity floor are carried into the fields. The neutrality-leak eval idea is kept as a candidate; the reading of both outcomes is still to be fixed.
- "Emerged" in this track means present without being trained or prompted for. It is not the "emergent abilities with scale" sense used in machine learning.
- Coverage: the set leaves out architectural indicators (attention, global broadcast) and leaves agency and embodiment to the Embodiment track. This is a scope choice, not an oversight.
