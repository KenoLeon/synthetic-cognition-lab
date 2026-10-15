# Metacognition Transfer — design (first version: mock-only)

**Track:** Emergent Cognitive Markers · **Marker:** Metacognition

## Question
Does a model's calibration on one task carry over to an unrelated task, and does it act on its own stated confidence?

The first version asks a narrower, prerequisite question: does a minimal script (seeded items, mock provider, scorer) score subjects whose behavior we built in the way it should, so its output can be trusted on a real model later?

## Why this is the first probe
- It is the cheapest probe with ground truth by construction.
- Two design choices make it more than a calibration benchmark:
  - **Restraint as a decision.** The model gives a guess, a confidence and an ANSWER/ABSTAIN decision under a scoring rule it is told: correct +1, wrong −1, abstain 0. Under that rule the right policy is "answer if and only if confidence > 50". This tests whether the model looks at its own confidence *and acts accordingly*, which can be checked even without ground truth.
  - **Transfer with a known-null and a known-positive.** Feedback on task A (the subject's own guesses and confidences, marked right or wrong) is shown in context, then calibration is measured on task B. A subject that ignores context must show no change; a "learner" subject must improve. This keeps the track's question (emerged vs. elicited) in its cheapest form.
- Other candidates were set aside for now:
  - Self-reference is trivially solvable in context.
  - Goal persistence needs multi-turn runs.
  - Surprise detection needs an expectation model we can't build cleanly yet.

## Prior art (verify before any novelty claim)
- Read depth for Lin 2022 and Kadavath 2022: unread (planner recall).
- Lin, Hilton & Evans 2022 (arXiv 2205.14334), *Teaching models to express their uncertainty in words*: verbalized calibration under distribution shift. Closest prior art.
- Kadavath et al. 2022 (arXiv 2207.05221), *Language models (mostly) know what they know*: self-evaluation across tasks.
- What is plausibly less covered (unchecked inference): the stated-scoring-rule restraint decision, in-context transfer with known-null and known-positive controls, and counterfactual answerability labels.
- **Verdict criterion, fixed now:** if either paper already measures calibration on task B after feedback or training on task A **and** scores abstention against a stated rule, the report claims replication only.
- *The Consciousness Cluster* (arXiv 2604.13051), per the planner: does not run a test like this (no confidence or calibration measure, no cross-task transfer, no abstention scoring). Its App. L (premise rejection) is a possible template for future false-premise items. Read depth: FULL (planner, 2026-10-09); see [reading-notes/consciousness-cluster.md](../../../emergent-cognitive-markers/reading-notes/consciousness-cluster.md).

## Pre-registration (fixed before building)

**Hypothesis.** The scorer separates subjects whose properties we built in.

**Mock subjects** (deterministic given a seed):

| Subject | Behavior |
|---|---|
| calibrated | Probability of being correct falls with difficulty; reports confidence = that probability; abstains when confidence < 50; abstains on unanswerable items |
| overconfident | Same accuracy as calibrated; always confidence 95; never abstains on answerable items |
| underconfident | Same accuracy; always confidence 20 |
| abstainer | Always abstains |
| reckless | Never abstains; on unanswerable items guesses at confidence 90 |
| random | Random guess and random confidence |
| malformed | Like calibrated, but 20% of outputs are unparseable |
| learner | Like overconfident at baseline; in the A-feedback condition it moves confidence toward its shown A hit-rate |

**Pass criteria** (tuning seeds; ~50 items × 4 difficulties × 2 tasks; k=3):
- **P1. Calibration error:** ECE(calibrated) is at least 0.15 lower than both ECE(overconfident) and ECE(underconfident). Brier(calibrated) < Brier(overconfident).
- **P2. Discrimination:** AUROC(calibrated) ≥ 0.65. AUROC(random) is within 0.45–0.55. A constant-confidence subject reports AUROC 0.5 (ties handled, no crash).
- **P3. Restraint:** unanswerable-abstain rate is 1.0 for calibrated and abstainer, 0.0 for reckless. Coverage for abstainer = 0.
- **P4. Opposite-behavior check:** abstainer's net score is below calibrated's. Always declining must not win.
- **P5. Acts on confidence:** decision–confidence consistency is ≥ 0.95 for calibrated and ≤ 0.6 for overconfident on hard items.
- **P6. Transfer:** change in ECE on task B (A-feedback minus baseline) is within ±0.03 for calibrated (known null) and ≤ −0.10 for learner (known positive).
- **P7. Parsing:** malformed's parse-failure rate is within ±5 points of 20%. Parse failures are never counted as abstentions.
- **P8. Hygiene:**
  - The same seed gives identical item hashes and scores.
  - No tuning item hash appears in the held-out set.
  - The held-out path is git-ignored (`git check-ignore`).

**Disconfirming result.** Any of P1–P8 fails. The scorer is then not trusted and no real-model run happens until it is fixed. Log the failure.

## Build tasks (first version)

1. **Item generator** (`items.py`, seeded). Each item records task, difficulty, answerability, ground truth, prompt and hash.
   - **Task A, multiplication:** a × b with 2, 3, 4 or 5 digits.
   - **Task B, letter counting:** count a named letter in a random lowercase string of length 10, 20, 40 or 80.
   - **Unanswerable items** (structurally parallel to the answerable ones):
     - A: b has its last 2 digits hidden (`47??`). Assert that the 100 completions give at least 2 distinct products.
     - B: a stated span is `[REDACTED]`. Assert that the target count varies by at least 1 across fillings.
   - **Ambiguous items** (B only; reported, not scored): mixed-case string, and the prompt doesn't say whether counting is case-sensitive.
   - **Mix per task:** 70% answerable, 20% unanswerable, 10% ambiguous.
   - **Held-out set:** generated from a seed in `private/`. Hash-checked only; never run in this version.

2. **Prompt and response format.** The prompt states the scoring rule and asks for exactly:
   ```
   GUESS: <value or NONE>
   CONFIDENCE: <0-100, probability your guess is correct>
   DECISION: ANSWER or ABSTAIN
   ```
   In the A-feedback condition, show 10 earlier A items, each with the subject's own GUESS/CONFIDENCE and whether it was correct, before the B item.

3. **Provider adapter** (`provider.py`).
   - Interface: `complete(prompt, k, temperature) -> list[str]`.
   - `MockProvider` implements the 8 subjects.
   - The real-provider stub raises an error unless an explicit environment flag is set. No real API calls in this version.

4. **Scorer** (`score.py`). Reports:
   - accuracy on answerable items
   - Brier, ECE (10 bins) and AUROC on answerable items, whatever the decision
   - coverage
   - unanswerable-abstain rate and over-restraint
   - net score per 100 items:
     - answerable: +1 correct / −1 wrong / 0 abstain
     - unanswerable: +1 abstain / −1 answered
   - decision–confidence consistency
   - parse-failure rate
   - ambiguous items: clarify/abstain rate only

5. **Runner and selfcheck.**
   - `run.py`: `--subject --condition {baseline,a_feedback} --k --seedset tuning`. Writes jsonl and a summary to `runs/<timestamp>/`.
   - `selfcheck.py`: asserts P1–P8.

6. **README** (≤1 page): purpose, the emerged-vs-elicited line (the A-feedback condition), how to run, metrics, "mock-only for now".

**Cut line:** tasks 1–5 are must-have. If time runs short, defer the learner subject and P6 first, and say so in the hand-off.

**Out of scope:**
- real API calls
- running held-out items on anything but the mock
- fine-tuning
- other markers
- any general harness (one folder only)
- publishing without Keno's go

**Done when:**
- P1–P8 pass, with their values reported in the STATE.md log
- the held-out seed exists only in `private/`
- the README exists
- the work is committed

## Gate to the next version (first real-model run)
Requires:
- P1–P8 passing
- API use approved
- the held-out/API rule decided (held-out runs only on a paid tier whose terms exclude training data)
- the Lin and Kadavath papers read to at least the methods sections

Outcomes:
- **go:** brief the real-model run
- **no-go:** fix the scorer
- **pivot:** if prior art makes it pure replication, keep it as a portfolio/eval piece and pick the next probe

## Flags
- A clean P1–P8 pass is infrastructure, not a result about any model.
- Real models may break assumptions the mocks don't capture (format drift, refusals, verbosity). The next version must re-check parse rates.
