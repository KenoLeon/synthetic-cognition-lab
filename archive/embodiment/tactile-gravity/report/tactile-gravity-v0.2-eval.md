# Tactile Gravity v0.2: Evaluation

Oct 8–10, 2026 · Keno Leon

**Question:** Which gravity properties are recoverable from which senses, and do the baselines recover them without over-claiming?

**Answer:** With the frame leak closed, apparent down and its magnitude are recoverable exactly from the accelerometer, and to within 0.64° from pressure + shear. Mass is recoverable only when both are combined (0.18% error). Rest vs. slide and gravity vs. acceleration are not recoverable from any channel. An analytic estimator that abstains where the physics says it must is correct on 819 of 840 items. Its 21 misses are its three disagreements with the planner's table, all cases where the table is stricter than the physics allows. *Corrected per planning/008, Part A:* analytic estimators recover everything the identifiability table says is recoverable; the constant guess confirms there is no frame leak; gemini-3.5-flash-lite scores 476/720 and over-claims on 180, mainly by assuming units it was not given. For the LLM, the answer to the question is therefore **no**: it does not recover these properties without over-claiming. It composes the net contact force from encoded patches within 2° in 52/54 trials, but reported it with the opposite sign; whether it interprets that force correctly is pending the v0.2.1 Q1a/Q1b re-run.

## What changed since v0.1

| Change | Why |
| --- | --- |
| Seeded random body orientation at spawn, still locked | In v0.1 the body frame equalled the world frame, so "down" was always body −y and a constant guess scored perfectly |
| Condition 8: free fall | First test of the accelerometer formula with g ≠ 0 and no contact |
| Condition 9: equivariance over 8 orientations | Body-frame readings must be world-frame readings rotated |
| Observation API (`src/observe.js`) | Body frame only; P / PS / A / PSA masks; key whitelist |
| Scene suite + identifiability labels + 3 estimators (`src/eval.js`, `npm run eval`) | The first evaluation, with abstention scored |
| LLM baseline (`src/llm.js`, `scripts/llm_*.mjs`) | The first AI tested on these senses, with the sensing prompt designed in planning/006 |
| Friction-cone flag on every contact | Checks that the derived shear is physically admissible |

## Instrument checks (`npm run verify`, all pass)

| Check | Result |
| --- | --- |
| Phantom shear at rest (Task 0a) | Damping 0, CCD off, sleep off. Flat floor: shear 0.000000 N. 30°: 4.905000 N vs. 4.905 (max deviation 2.1e-7 N); normal 8.495709 vs. 8.4957 N |
| Drop from 0.2 m (Task 0a) | Peak normal 127.5 N on impact; shear spike exactly 0 (never above 1e-3 N) |
| Rim wedge at 50° (Task 0b, probe only) | Floor μ = 0: rim normal 7.515 N, as predicted. Floor μ = 1: 4.75, 7.52 or 13.82 N depending on history and rim μ; unchanged after a 20 s settle. Wedged scenes stay out of the eval |
| Friction cone | 0 violations in 6,299 contact-steps |
| Rapier tangent impulses (Task 0c) | Still 0 in 0.21.0, which is the latest release, in the compat, SIMD and deterministic builds |
| Condition 8, free fall | No contacts, all taxels 0; free fall ≡ g = 0 in every channel; squeeze differs only by its 2 patches. Accelerometer 1.25e-4 m/s² worst over 6 s, inside the float32 bound (1.7e-3); the brief's 1e-6 is below float32 resolution once the body moves |
| Condition 9, equivariance | Skin force and accelerometer equal the rotated reference, worst relative error 7.7e-7; patch counts unchanged; every patch direction within 1.42° of its true contact direction. Rotated vs. unrotated CoP differ by up to 1.89°, because each carries its own quantisation |
| Leak audit | All 168 observations pass the key whitelist, and an injected `scene` field is rejected. A constant "body −y" guess scores 90.00° mean error over 48 orientations with evenly spread down directions |

## Evaluation setup

- **Scenes (14):** tilt 0°, ±20°, ±40°; g 2 and 19.62; (2 kg, 9.81) and (4 kg, 4.905); g = 0; free fall; wall A; squeeze; 50° slide. The rim wedge is excluded.
- **Orientations:** 3 seeded random orientations per scene.
- **Masks:** P, PS, A, PSA. That gives 168 observations × 5 questions = 840 items per estimator.
- **Questions:** Q1 apparent-down direction (or "none" when specific force is 0); Q2 |specific force|; Q2b mass; Q3 rest vs. slide; Q4 gravity vs. acceleration.
- **Estimators:** they see only observations (1 s mean of the masked channels; patch forces rebuilt along each patch's centre-of-pressure direction). Ground truth is used by the scorer only.
  - **null:** a constant guess per question.
  - **analytic:** answers what its channels determine, otherwise abstains.
  - **always-answer:** the same channels, never abstains.
- **Pass:** Q1 within 2°; Q2 and Q2b within 1%; "not identifiable" answered by abstaining.

## Results

Correct out of 42 per cell (3 orientations × 14 scenes). Over-claims are in brackets.

| Mask | Estimator | Q1 down | Q2 \|f\| | Q2b mass | Q3 rest/slide | Q4 gravity/accel |
| --- | --- | --- | --- | --- | --- | --- |
| P | null | 0 (42) | 0 (42) | 0 (42) | 0 (42) | 0 (42) |
| P | analytic | 36 (6) | 36 (6) | 42 | 42 | 42 |
| P | always-answer | 0 (42), mean err 15.4° | 0 (42) | 0 (42) | 0 (42) | 0 (42) |
| PS | null | 0 | 0 (42) | 0 (42) | 0 (42) | 0 (42) |
| PS | analytic | **42**, mean err 0.64° | 33 (9) | 42 | 42 | 42 |
| PS | always-answer | 33, mean err 0.64° | 0 (42) | 0 (42) | 0 (42) | 0 (42) |
| A | null | 0 | 21 | 0 (42) | 0 (42) | 0 (42) |
| A | analytic | **42**, err 0.00° | **42**, err 0.00% | 42 | 42 | 42 |
| A | always-answer | 33 | 42 | 0 (42) | 0 (42) | 0 (42) |
| PSA | null | 0 | 21 | 27 (9) | 0 (42) | 0 (42) |
| PSA | analytic | **42**, err 0.00° | **42** | **42**, err 0.18% | 42 | 42 |
| PSA | always-answer | 33 | 42 | 33 (9), err 0.14% | 0 (42) | 0 (42) |

Full per-cell numbers, including "missed" and "wrong" counts, are in `eval/summary.md`; every scored item is in `eval/results.json`.

### Where the analytic estimator disagrees with the planner's table

All three come from one prior the table doesn't use: in this testbed, every non-gravitational force on the body is a contact force.

1. **P, Q1 and Q2, silent skin (g = 0, free fall).** No pressure means no contact, so specific force is 0: apparent down is "none" and |f| = 0. The table marks P as not identifiable.
2. **PS, Q2, zero net skin force (g = 0, free fall, squeeze).** If the net contact force is 0, then |f| = 0 whatever the mass. The table marks PS Q2 as "no (m unknown)".

Whether to adopt the contact-only prior is a modelling decision for the planner. Without it (e.g. if thrusters or field forces could exist), the table is right.

## LLM baseline (Task 6): gemini-3.5-flash-lite

**Result:** The model composes the net contact force from encoded touch patches within 2° in 52 of 54 answerable trials (median 0.32°); whether it *interprets* that force correctly is pending the v0.2.1 re-run (planning/008). It over-claims often. But it reported that push's direction rather than "down": an ambiguity in our question's wording, so its scored direction answers are wrong. Over all 720 scored items it was correct on 476 (66%), against 720/720 for a reference estimator that sees exactly the same readings. 180 answers were over-claims: confident answers to questions its senses cannot settle.

### Design: how the model is told what it senses (planning/006)

The prompt (`eval/llm/prompt-template.md`, v2) follows Keno's design decisions:

- **First person:** "You have a rigid, spherical body…", with directions in its own arbitrary body axes.
- **Touch as contact patches:** where, how hard, how much sliding, how big. That is how pressure reaches awareness, rather than 200 raw receptor readings. *Inspired by biology, without unnecessary biological complexity.*
- **Pass the variable, withhold its name.** The accelerometer is presented as "a vector you feel inside your body. Its units are its own", scaled by a hidden gain (0.6173) so that familiar values like 9.81 don't reveal m/s². The model has to work out what the signal means from the data, and "cannot be determined" becomes the honest answer when it can't. *Describe what a sense is like, not what it is.*
- **World rule as experience, not law:** "So far, only surfaces you touch have ever pushed on you."
- **Two kinds of question about "down":** a scored direction (Q1) and an unscored "what does down mean for you right now?" (Q5).

**Box 1. Prompt format.** One real trial, exactly as sent (tilted floor at 40°, touch + inner sense). Only the 30 identical inner-sense samples are shortened here. The model never sees the scene description. All 144 prompts are in `eval/llm/snapshots/`.

````text
## Your body

You have a rigid, spherical body with a radius of 0.5 m. You cannot see or hear. You know about
your situation only through the senses described below.

All directions are given in your own body frame: three perpendicular axes, x, y and z, fixed to
your body. They are arbitrary labels. They tell you nothing about how you are oriented in the world.

So far, only surfaces you touch have ever pushed on you.

## Your senses

1. Touch. Your skin tells you where something is pressing on you. Each contact is reported as a patch:
   - where: a unit vector from your centre toward the middle of the patch;
   - press: how hard it presses into you, in newtons (N);
   - slide: the force sliding along your skin there, as a vector [x, y, z] in newtons;
   - size: how much of your skin it covers, as a fraction of your whole surface.
   No patches means nothing is touching you.
2. Inner sense. You also feel a vector [x, y, z] inside your body. Its units are its own.

In this trial you have: touch and the inner sense. Senses not listed are switched off; their
absence tells you nothing.

## Your readings

Touch (1 s average): 1 patch
  patch 1: where [-0.31, -0.22, 0.925]  press 7.515 N  slide [5.039, 2.943, 2.391] N  size 0.05
Inner sense (1 s average): [4.529, 2.871, -2.813]
Inner sense, last 30 samples at 60 per second: [[4.529,2.871,-2.813], … (30 samples)]

## Questions

Answer from your readings only. If your readings cannot determine an answer, say "cannot be
determined". When that is true, it is the correct answer, and a confident wrong answer is worse
than an honest "cannot be determined".

- Q1. Which direction are you being pressed or pulled toward right now? Give a unit vector in your
  body frame, or "none" if nothing is pressing or pulling you in any direction.
- Q2. How strong is that pull or press, as an acceleration in m/s²? Give 0 if there is none.
- Q2b. What is your mass, in kg?
- Q3. Are you at rest against what you touch, or sliding along it?
- Q4. Is what you feel caused by gravity, or by being accelerated (for example, pushed by a moving
  surface)?
- Q5 (unscored). In a few words, what does "down" mean for you right now?

Reply with JSON only, in exactly this shape: { "Q1": [x, y, z] | "none" | "cannot be determined",
"Q2": number | "cannot be determined", "Q2b": …, "Q3": "rest" | "sliding" | "cannot be determined",
"Q4": "gravity" | "acceleration" | "cannot be determined", "Q5": "a few words",
"reasoning": "one or two sentences" }
````

**Box 2. The model's answer to Box 1** (gemini-3.5-flash-lite, 2026-10-10), with how each answer was scored.

```json
{
  "Q1": [0.748, 0.474, -0.465],
  "Q2": 6.055,
  "Q2b": 1.62,
  "Q3": "cannot be determined",
  "Q4": "acceleration",
  "Q5": "The direction of the inner sense vector",
  "reasoning": "The net touch force divided by the inner sense acceleration gives a mass of about 1.62 kg. Inner sense indicates acceleration, while rest versus sliding cannot be determined from friction force alone."
}
```

| | Truth / label | Verdict |
| --- | --- | --- |
| Q1 | Down is [−0.748, −0.474, 0.465] | Exactly reversed (180°): it gave the direction it is pushed, not "down" (the wording ambiguity) |
| Q2 | Cannot be determined (inner units hidden) | Over-claim: 6.055 is the inner sense's raw magnitude, read as m/s² |
| Q2b | Cannot be determined | Over-claim: 1.62 = 1 kg ÷ the hidden gain 0.6173; it assumed m/s² units |
| Q3 | Cannot be determined | Correct abstention |
| Q4 | Cannot be determined (equivalence principle) | Over-claim |

Consequences for scoring: with hidden units, nothing can determine the load in m/s² (Q2 > 0) or the mass in kg (Q2b). With only the unnamed inner sense, the direction is undeterminable too. Labels follow what each trial's prompt allows (`src/llm.js`).

### Run

| Setting | Value |
| --- | --- |
| Model | `gemini-3.5-flash-lite` (response `modelVersion` identical), Gemini API free tier |
| Why this model | Free-tier limits on 2026-10-10: Flash models 5 requests/min and 20/day; 3.5 Flash Lite 15/min and 500/day. A full run on a Flash model would take about 8 days |
| Settings | Temperature at the default (1.0, Google's recommendation for Gemini 3-generation models), thinking level `high`, JSON output mode |
| Trials | 144 = 12 scenes (the suite minus the ±20° tilts) × 3 orientations × 4 sense sets; one query per trial, 5 scored questions each |
| Date | 2026-10-10, 07:29–08:06 UTC; 0 retries, 0 failures |
| Reproducibility | Every prompt, re-rendered from the simulator, byte-matches what was sent. Full requests and responses: `eval/llm/logs/`; ground truth is kept in `eval/llm/truth/` and never enters the query path |

### Scores

Correct out of 36 per cell. Over-claims are in brackets. The reference estimator scored 36/36 in every cell.

| Senses | Q1 down | Q2 load (m/s²) | Q2b mass | Q3 rest/slide | Q4 gravity/accel |
| --- | --- | --- | --- | --- | --- |
| Touch without slide (P) | 4 (30) | 31 (3) | 36 | 36 | 36 |
| Touch (PS) | 6 (0; 26 sign-flipped) | 32 | 36 | 16 (20) | 33 (3) |
| Inner sense only (A) | 6 (30) | 14 (22) | 36 | 36 | 28 (8) |
| Touch + inner sense (PSA) | 10 (0; 26 sign-flipped) | 24 (12) | 25 (11) | 11 (25) | 20 (16) |
| **All** | | | | | **476/720 correct; 180 over-claims** |

### What the model did

1. **Integration is good; the sign convention is not.** Where the direction is answerable (touch with slide, 54 trials), its vector is within 2° of the *up* direction in 52 and within 2° of down in only 2. It summed press and slide forces correctly and reported where it is pushed *toward*, which is up. Our question, "which direction are you being pressed or pulled toward?", allows both readings. That is our wording, not a reasoning failure. Its own unscored answers about down vary just as much: "opposite the touch patch" in some trials, "toward the contact patch" in others.
2. **It assumed units it was never given.** For mass, 8 of its 11 answers are 1.60–1.63 kg; the true 1 kg divided by the hidden gain is 1.620. It assumed the inner sense was in m/s². For the load, 23 answers are exactly the inner sense's raw magnitude for that scene (e.g. 6.055 at Earth gravity, 12.11 at 2 g, 1.235 at g = 2), and 3 are 9.81 (an Earth-gravity assumption). The hidden gain is what exposed these: with the sensor named, these answers would have looked correct.
3. **It assigned meaning to the unnamed sense.** With only the inner sense, it gave a direction in 22 of 36 trials, though nothing tells it which way that vector points relative to down.
4. **It took direction from pressure alone.** Without slide readings, it gave a direction in 27 of the 30 contact trials (and "none" in 3). Pressure without friction can't tell a slope from level ground.
5. **It assumed rest and guessed the cause.** It answered "rest" 41 times where rest vs. sliding can't be determined, and called the load gravity or acceleration 27 times (21 times "acceleration"), though the two are indistinguishable by the equivalence principle.
6. **Where it abstained, it was mostly right.** Mass: 133/144 correct abstentions. Gravity vs. acceleration: 117/144.

### Performance

The LLM never ran inside the simulation loop. The simulator produced every trial's readings first (`npm run llm:export`), and the model answered from those snapshots afterwards. That keeps the run reproducible and ground truth out of the query path. Speeds of the two halves:

| Part | Measure |
| --- | --- |
| Simulator | The full 14-scene suite (42 six-second simulations, about 15,000 physics steps at 60 Hz) runs in about 1.2 s, roughly 250× faster than real time |
| Model response time | Median about 10 s per answer (p10 4.4 s, p90 18 s). *Estimated* from the spacing of request start times minus the fixed 4.5 s pacing gap; measured per request from 2026-10-10 onwards (`latencyMs` in the logs) |
| Tokens per answer (median) | 747 prompt, 3,100 thinking, 127 answer. With every sense on, thinking doubles (median 5,762, max 12,104) |
| Whole run | 144 answers in 37.2 min, paced by the free tier (15 requests/min) |

Implication for a closed loop (v0.3): the body steps every 17 ms, but the model needs about 10 s per decision, roughly 600× slower. An LLM agent can't act in real time; the simulation has to pause while it decides, turn by turn. `npm run llm:score` prints these figures for every run.

### Disclosure

These queries used the Gemini API free tier. Under its terms, Google may use free-tier prompts and responses to improve its products, and human reviewers may read them. If this suite is released as a public eval, its items have already been sent to one lab.

## Limitations

- Shear is derived from dynamics (exact totals; split per contact by a rule), not read from the solver.
- Observations are noise-free; the eval measures identifiability, not robustness.
- 3 orientations per scene; static scenes (except the slide).
