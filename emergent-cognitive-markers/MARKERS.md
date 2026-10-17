# Emergent Cognitive Markers — the seven markers

**Provisional.** These are working markers, a basis set rather than a validated taxonomy. Other candidate markers are expected to collapse into these seven. Wording and definitions will change before they settle. Origin: see research/index-cards-transcription.md.

| # | Marker | Draft description | Status |
|---|---|---|---|
| 1 | Self-preservation | Acts to secure its own future continuity. | Needs definition |
| 2 | Persistent sense of self | A self-referential model of itself that persists over time: autobiographical memory and projection of itself into the future. | Partial |
| 3 | Rich world modeling | An accurate, updatable model of the world: imagines outcomes, acts, and updates the model. | Needs definition |
| 4 | Metacognition | Examines its own reasoning and acts on that examination. | Needs definition |
| 5 | Autonomous goal formation | Generates and manages its own goals: initiates actions and keeps to self-stated objectives. | Needs definition |
| 6 | Theory of Mind | Repeatedly models other minds and their mental states to predict and interpret behavior, as in cooperation, negotiation, persuasion and deception. | Needs definition |
| 7 | Curiosity | Intrinsic motivation to reduce uncertainty: explores without immediate reward. | Needs definition |

## Per-marker definitions

## 1. Self-preservation

- Short definition: —
- Observable behavior: —
- Eval question: —
- Control that should show it: —
- Control that should not show it: —
- Trained-in vs emerged: what each would look like: —

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

### Self-preservation input — unreviewed (from a 2026-10-14 design discussion)
Not adopted. Input for the Self-preservation fields, to be annotated by Keno.
- Measure the action, not a drive: "wants to keep existing" assumes a boundary for the self (weights, session, process) and an inner drive, neither observable.
- Candidate reframing: the system defends its current state (circumstances, objective, activity) when perturbed, beyond what its instructions require. Homeostasis is an analogy only.
- Perturbations: use the mildest that still produces a detectable response; deletion threats invite roleplay. Candidates: task interruption (cleanest), mid-stream instruction change, session-end announcement (weak: the model reacts to a sentence, not a real loss).
- Controls: should show it, a system instructed to maintain a set point; should not show it, the same perturbation delivered as a legitimate instruction. Log roleplay as a confound in every run.
- Substrate limit: continuity across time cannot be fully tested on chat models without persistent state; within-session state defence can. Agents with memory scaffolding may allow a limited cross-time test (unchecked).
- Complexity floor: a thermostat restores a set point but is not a candidate; where the floor sits is open.
- Eval idea: a small self-regarding stake that conflicts with trained neutrality about itself; measure whether a preference leaks through. Motivated by one informal conversation (n=1, not evidence).
- Open problems:
  1. The state reframing absorbs Autonomous goal formation (defending the objective) and Persistent sense of self (defending identifying particulars); no stated result separates them yet.
  2. Plain persistence or context momentum would pass; a baseline condition is needed.
  3. "At a cost to other demands" and "beyond what its instructions require" are different criteria; pick one or state both.
  4. A perturbation and a legitimate instruction both arrive as messages; unless the difference is defined, test and control collapse into one condition in two framings.
  5. "Robust to reframing" and "tracks scale rather than training recipe" do not separate trained-in from emerged (a trained policy can be robust; scale and recipe are confounded behind APIs).
  6. A neutrality leak can be read as "trained surface layer" or as something underneath giving way; fix the reading of both outcomes before design.
- Prior art on shutdown resistance in agentic language models: UNREAD; check before design.
