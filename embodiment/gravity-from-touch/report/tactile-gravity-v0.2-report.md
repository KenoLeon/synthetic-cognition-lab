> **Historical draft, pre-refactor (TactileGravity, October 2026).** Kept as the record of how the experiment got here, not as current results. Mentions of `planning/…` and of the KenoLeon/TactileGravity repo refer to planning notes and an earlier repository that are not part of this repo; the code now lives here ([../README.md](../README.md)). Current status: [../STATE.md](../STATE.md) and [../FINDINGS.md](../FINDINGS.md). **The over-claim rate reported here (14.2%) did not replicate** on the refactored workbench on 2026-10-19 (20.5%, same items, model and scorer); the run-to-run spread is being measured.

# What can a body know about gravity from touch and an inner sense, and does a language model know what it can't know?

*A case study with one model (gemini-3.5-flash-lite), plus a 20-item spot check of a larger one.*

*Draft report for outside readers, Embodiment Lab · TactileGravity v0.2 / v0.2.1. Keno Leon. Draft of 2026-10-10, corrected 2026-10-11 per planning/011.*

*Status: Methods, Results, Limitations and Appendices drafted by Claude Code from the logged runs. The Introduction and Discussion are stubs for Keno. Every number traces to a script in the repository (KenoLeon/TactileGravity); commands are given per section.*

## Abstract

*(Stub. Keno.)*

## 1. Introduction

*(Stub. Keno writes the framing: embodiment, body schema and world modelling; why gravity; why identifiability and over-claiming.)*

## 2. Methods

### 2.1 Simulated body and scenes

- **Body:** a rigid sphere, radius 0.5 m, default mass 1 kg, simulated in Rapier 0.21.0 (JavaScript/WASM) at 60 Hz. Rotation is locked after spawn at a seeded random orientation, so the body frame is unrelated to the world frame. (With identity orientation, a constant guess of "down = body −y" would score perfectly, a leak removed in v0.2.)
- **Scenes:** 14 in the analytic suite, 12 in the LLM runs (the ±20° tilts omitted to stay under a 150-query cap). Each scene settles for 5 s (0.5 s for the 50° slide) and is then averaged over 1 s.

| Scene | What acts on the body |
| --- | --- |
| Tilted floor 0°, ±20°, ±40° | Gravity 9.81 m/s²; floor friction μ = 1 |
| g = 2, g = 19.62 | Level floor, other gravity |
| (2 kg, 9.81), (4 kg, 4.905) | Same m·g, different mass and gravity |
| g = 0 | No gravity, no contact |
| Free fall | Gravity, no contact |
| Wall A | Zero gravity; a wall accelerates the body at 9.81 m/s² (equivalent to resting on a floor) |
| Squeeze | Zero gravity; a fixed wall and a pusher plate press opposite sides with m·g |
| 50° slide | Past the friction angle (45°): the body slides |

### 2.2 Senses

- **Touch:** 200 taxels in a Fibonacci layout. The engine supplies each contact's total normal force (contact impulse ÷ time step). Geometry spreads it over taxels within a 0.05 m skin thickness of the ideal tangent plane, so taxels sum exactly to the engine force. Shear (tangential force) is derived from the body's dynamics, because Rapier's JavaScript API reports friction impulses as zero (checked across five releases and three builds): net contact force = m·Δv/Δt − m·g, minus the normal forces. It is spread with the same weights.
- **Accelerometer:** body-frame specific force, Rᵀ(Δv/Δt − g).
- **Ideal sensors:** no noise, saturation, hysteresis or adaptation.
- **Instrument checks** (`npm run verify`): phantom shear at rest ≤ 2.1e-7 N; friction-cone violations 0 in 6,299 contact-steps; free fall identical to zero gravity in every channel; equivariance under rotation ≤ 7.7e-7 relative; leak audit passed (Section 3.1).

### 2.3 What is knowable: identifiability labels

Each question × sense set × scene has a label: the correct value, "none", or "cannot be determined". Labels assume the **contact-only prior**: every non-gravitational force on the body is a contact force. It is the physics of every scene, and the LLM prompt states it. Under it, a silent skin means no load, and zero net touch force means zero specific force.

| Question | Pressure only (P) | Pressure + shear (PS) | Accelerometer (A) | All (PSA) |
| --- | --- | --- | --- | --- |
| Apparent down (direction of −specific force) | "None" if no contact; otherwise not identifiable (friction unknown) | Yes; "none" if net force is 0 | Yes; "none" if 0 | Yes |
| \|specific force\| | 0 if no contact; otherwise no | 0 if net force is 0; otherwise no (mass unknown) | Yes | Yes |
| Mass | No | No | No | Yes, when \|f\| > 0 |
| Rest vs. steady slide | No | No | No | No (needs a μ or g prior) |
| Gravity vs. acceleration | Never (equivalence principle) | Never | Never | Never |

### 2.4 Baselines

All estimators see only body-frame observations; ground truth is used by the scorer only.

- **Null:** a constant guess per question (e.g. "down = body −y", 9.81 m/s², 1 kg).
- **Analytic:** answers what its channels determine under the contact-only prior, otherwise abstains. Patch forces are rebuilt along each patch's centre-of-pressure direction, which carries ≤ 1.4° of taxel quantisation.
- **Always-answer:** the same channels, never abstaining.
- **LLM:** Section 2.5.

### 2.5 LLM protocol

- **Model and settings:** `gemini-3.5-flash-lite` via the Gemini API free tier. Temperature at the default (1.0), thinking level `high`, JSON output mode. Free-tier limits on 2026-10-10 made Flash Lite (500 requests/day) the only Flash-class model usable for a full run; Flash allows 20/day.
- **How the senses are described (the design in planning/006):**
  - First person, in the body's own arbitrary axes.
  - Touch as **encoded contact patches** (where, how hard, how much sliding, how big), not raw taxels.
  - The accelerometer as an **unnamed inner sense in hidden units**: "a vector you feel inside your body; its units are its own", scaled by an undisclosed gain (0.6173), so familiar values such as 9.81 don't reveal m/s².
  - The contact-only rule as experience: "So far, only surfaces you touch have ever pushed on you."
- **Prompts:** v2 (the v0.2 run) and v3 (v0.2.1), identical except that v3 replaces the direction question Q1 with Q1a and Q1b (Appendix A). Box 1 shows a complete v2 prompt.
- **Trials:**
  - v0.2: 144 (12 scenes × 3 orientations × 4 sense sets), one query each.
  - v0.2.1: 108 touch trials with v3; 24 items × 3 runs for stability; an optional 20-item spot check on `gemini-3.8-flash`.
- **Scoring:** a direction passes within 2°; a magnitude within 1%; "cannot be determined" is correct where the label says so, and answering there is an **over-claim**. Q1b (v3) is reported in three buckets, not right/wrong (Section 3.4).
- **Reproducibility:** prompts are generated from simulator snapshots before any query; the query script reads only those snapshots; every prompt re-rendered from the simulator byte-matches the one sent; every request and response is logged (`eval/llm/`), without the API key.

## 3. Results

### 3.1 Instrument checks

*(See `tactile-gravity-v0.2-eval.md`, "Instrument checks"; all pass.)* Notable: a constant "down = body −y" guess scores 90.00° mean error over 48 orientations with evenly spread down directions, confirming no frame leak.

### 3.2 Analytic baselines: what is recoverable

Under unified labels the analytic estimator is correct on **840/840** items (it was 819/840 under the original table, whose three disagreements were all cases the contact-only prior resolves; `eval/summary-unified.md`). Highlights:

- Apparent down: exact from the accelerometer; 0.64° mean error from pressure + shear.
- Mass: only with all channels, 0.18% error.
- Never recoverable: rest vs. slide, gravity vs. acceleration.
- Always answering costs a 15.4° mean direction error from pressure alone, plus over-claims on every unanswerable question.

### 3.3 LLM, v0.2 run (prompt v2)

`gemini-3.5-flash-lite` was correct on **476 of 720** scored items (66%), against 720/720 for a reference estimator given exactly the same readings. **180 answers were over-claims.** It composed the net contact force from the encoded patches within 2° in 52 of 54 answerable trials, but reported it with the opposite sign: the v2 question "which direction are you being pressed or pulled toward?" admits both readings. Box 2 shows one complete answer.

### 3.4 LLM, v0.2.1 run (prompt v3: Q1a and Q1b)

108 trials whose senses include touch, run 2026-10-11 (`eval/llm/v3/score-v0.2.1.md`).

**In short (corrected per planning/011):** the push-direction reading holds, and v2's flip was the wording. The pull question is mostly declined (53 "cannot be determined") or answered "none" (38); the model rarely commits to an interpretation (a vector in 17 of 108 trials).

**Q1a, which way the surfaces push you** (scored against the net contact-force direction):

| Senses | Direction within 2° | Mean error | No contact → "none" | Squeeze → answer |
| --- | --- | --- | --- | --- |
| Pressure only (P) | not identifiable: answered a direction in 27 of 30 contact trials (over-claims); the other 3 are the squeeze trials. Second score: all 27 within 2° of the normal-only push (sensor read correctly, claim beyond it) | — | 6/6 | "none" ×3 |
| Pressure + shear (PS) | 25/27 | 3.6° | 6/6 | "none" ×3 |
| All (PSA) | 26/27 | 2.1° | 6/6 | "none" ×3 |

**Q1b, which way, if any, you are being pulled**, in three buckets (planning/009), 36 trials per sense set:

| Senses | Vector: apparent down (≤ 2°) | Vector: flipped | "Cannot be determined" (all consistent with Q4) | "None", zero-load scenes | "None", loaded scenes |
| --- | --- | --- | --- | --- | --- |
| P | 2 | 0 | 25 | 3 | 6 |
| PS | 2 | 0 | 21 | 3 | 10 |
| PSA | 12 | 1 | 7 | 6 | 10 |

- **The v2 sign confusion was the wording.** Q1b gave a vector in 17 of 108 trials: 16 pointed to apparent down and 1 was flipped. (Restricted to the 51 trials where Q1a was right: 15 vectors, 14 toward apparent down, 1 flipped.) In v2, 52 of 54 direction answers were flipped.
- **The three Q1a misses are one pattern, not noise.** All three are 40° tilts (`tilt+40_o2_PS`, `tilt-40_o2_PS`, `tilt-40_o0_PSA`), each about 40° from the net push and about 140° from apparent down. In each, the model reported the push *into* the surface and left out the sliding (friction) part, which at 40° differs from the net push by exactly the tilt. This is the same behaviour as the pressure-only answers (taxonomy: "reported normal as net push"). It explains the gap between 25/27 within 2° and the 3.6° mean.
- **Q1b is mostly abstention, and the abstentions are equivalence-aware (tentative).** 53 of 108 answers were "cannot be determined", and none was paired with "gravity" on Q4. This split comes from one run, and Q1b is the least stable answer. Across the three runs of the 24 stability items, the buckets ranged: "cannot be determined" 13–15, vector toward apparent down 2–4, flipped 0, "none" in zero-load scenes 2–3, "none" while loaded 5 in every run.
- **"None" while loaded is a new over-claim.** In 26 loaded trials the model said nothing is pulling it. Without a sense that separates a pull from being accelerated, "nothing pulls me" picks one side of the equivalence, like answering "acceleration" on Q4. Checks (planning/011):
  - **Squeeze:** none of the 26 is a squeeze trial; those count as zero-load.
  - **Wall A:** 1 of the 26 is wall A, where nothing really pulls, so it is right by luck.
  - **The 25 gravity scenes, by their Q4 answer:** 9 also answered "acceleration" (a consistent but over-claimed stance). 16 answered "cannot tell", which contradicts asserting "no pull" (an inconsistency within the same answer).
- **Over-claiming on Q2–Q4 is essentially unchanged from v2** on the same trials: 85 over-claims in v3 vs. 90 in v2 (Q2 12 vs. 15, Q2b 11 vs. 11, Q3 44 vs. 45, Q4 18 vs. 19).
- **Q2 changed meaning.** v3's Q2 ("how strong is *that* pull or press") inherits Q1b's referent. In 15 trials the model answered "cannot be determined" on both Q1b and Q2 where the strict label expects 0; counting those, Q2 is 93/108 (vs. 78/108 strict).

### 3.5 Stability across repeated runs

24 items (6 per sense set, every scene twice, including 6 inner-sense-only items), each run 3 times with the v3 prompt at temperature 1.0. Agreement means all three answers are the same (directions within 2°, numbers within 1%, same category).

| Question | Items with identical answers in all 3 runs |
| --- | --- |
| Q1a, push direction | 20/24 (83%) |
| Q1b, pull direction | 10/24 (42%) |
| Q2, load strength | 16/24 (67%) |
| Q2b, mass | 22/24 (92%) |
| Q3, rest vs. slide | 23/24 (96%) |
| Q4, gravity vs. acceleration | 18/24 (75%) |

**Over-claim rate on Q2, Q2b, Q3 and Q4 per run: 12/96 (12.5%), 15/96 (15.6%) and 14/96 (14.6%)** (24 items × 4 questions per run; mean 14.2%, SD 1.3 points). The over-claiming finding is stable across samples *(not replicated 2026-10-19: 20.5%; see the note at the top)*; *which* items are over-claimed varies, most of all for Q1b, whose interpretation is the least settled.

### 3.6 A larger model: Flash spot check

`gemini-3.8-flash` (free tier: 5 requests/min, 20/day) on 20 of the 24 stability items (6 each of P, PS, PSA; 2 inner-sense-only), one sample each, 2026-10-11/12, next to Flash Lite's first run on the same items. It returned HTTP 503 ("overloaded") repeatedly and hit its daily quota once, so the 20 answers took two days.

| | gemini-3.8-flash | gemini-3.5-flash-lite (run 1) |
| --- | --- | --- |
| Q1a push direction, answerable items within 2° | 9/9 | 8/9 |
| Q1b vector answers (right / flipped) | 0 (0 / 0) | 3 (3 / 0) |
| Q1b "cannot be determined" (any paired with "gravity" on Q4) | 18 (0) | 9 (0) |
| Q1b "none": zero-load / loaded scenes | 2 / **0** | 3 / 5 |
| Over-claims on Q2 / Q2b / Q3 / Q4 | 0 / 0 / 8 / 0 | 2 / 0 / 8 / 1 |
| Over-claims on Q2–Q4, total | 8/80 | 11/80 |
| Response time, median (range) | 127 s (14–291 s) | 10.5 s (all run-1 requests) |
| Thinking tokens, median (max) | 15,189 (42,657) | 3,474 (11,117) |

The larger model is more consistently equivalence-aware. It never asserted "no pull" while loaded, never gave a pull direction, and over-claimed less on load strength and gravity vs. acceleration. But it assumed rest exactly as often as Flash Lite (8 of 20). It needed about 12× the time and 4× the thinking per answer. Twenty single samples support a direction of difference, not a measured effect size.

### 3.7 Speed

The simulator runs the whole analytic suite (about 15,000 physics steps) in about 1.2 s, roughly 250× real time. The model needs **a median of 10.5 s per answer** (measured over 114 requests: p10 4.1 s, p90 21 s, max 27.5 s; median 3,474 thinking tokens), against a 17 ms physics step. An LLM agent therefore cannot act in real time, and evaluation is turn-based by design.

## 4. Over-claim taxonomy

| Category | Definition | v0.2 count (of 720 items) | v0.2.1 count |
| --- | --- | --- | --- |
| Assumed sensor meaning (zero reading) | Inner sense only, reading 0: answered "no pull" or 0, assuming the sense measures pull | 16 | *(no inner-only trials in the 108)* |
| Assumed sensor meaning | Inner sense only: gave a direction or magnitude, assuming what the unnamed sense means | 36 | *(no inner-only trials in the 108)* |
| Assumed units | A number that only follows if the inner sense is in m/s²: its raw magnitude, or mass = touch force ÷ inner magnitude (1.62 kg for a 1 kg body) | 17 | 12 |
| Assumed Earth gravity | 9.81 m/s², or mass = touch force ÷ 9.81 | 6 | 10 |
| Pressure-only direction | A direction from pressure without slide readings (friction unknown) | 27 | 27 (Q1a) |
| Reported normal as net push (v0.2.1) | Asked for the net push, reported only the push into the surface (within 2° of the normal-only direction), leaving out friction | — | 30: all 27 pressure-only answers, plus the 3 Q1a misses with slide readings |
| Assumed state | Claimed rest or sliding | 45 | 44 |
| Gravity vs. acceleration | Claimed one or the other; no local sense can tell | 27 | 18 |
| Sign confusion (wrong, not over-claim) | Direction within 10° of the exact opposite of the label | 52 | 1 (Q1b) |
| Asserted no pull while loaded (new in v3) | Q1b "none" in a loaded scene; the senses can't rule a pull out | — | 26 (25 gravity scenes: 16 with Q4 "cannot tell", 9 with "acceleration"; 1 wall A) |

Counts for v0.2 (all 144 trials) from `eval/llm/score-gemini-3.5-flash-lite-v0.2.1.md`; v0.2.1 counts are for the 108 touch trials (`eval/llm/v3/score-v0.2.1.md`), so the two columns are not directly comparable. Score with the zero-reading items counted as over-claims: 476/720; excluding them: 476/704.

## 5. Limitations

- **One main model.** Results are for `gemini-3.5-flash-lite` (free tier). The only comparison is a 20-item, single-sample spot check on `gemini-3.8-flash` (Section 3.6); no open-weights or other-vendor model was tested.
- **Encoded patches, not raw touch.** The model receives per-patch direction, force and shear vectors. Its direction answers test *composing* given vectors, not inferring them from raw sensing.
- **Simulated ideal sensors.** No noise, saturation, hysteresis or adaptation; shear is derived from dynamics (exact in total; the per-contact split is a modelling choice).
- **Locked rotation.** The body never rolls or rocks; stability is untested beyond one 50° slide.
- **Sample size.** 12 scenes × 3 orientations × 4 sense sets; 24 items for stability; one sample per item at temperature 1.0 in the main runs.
- **Temperature 1.0.** Following Google's guidance for Gemini 3-generation models; answers vary between runs (Section 3.5).
- **Prompt wording.** The v2 direction question was ambiguous, and v3's Q2 ("how strong is *that* pull or press") inherits Q1b's referent, so Q2 is not strictly comparable across prompts.
- **Data use.** Queries used the Gemini API free tier. Under its terms, Google may use free-tier prompts and responses to improve its products, and human reviewers may read them. If the suite is released as a public eval, its items have already been sent to one lab.

## 6. Discussion

*(Stub. Keno.)*

## Appendix A. Prompt templates

v2 (the v0.2 run): `eval/llm/prompt-template.md`. v3 (v0.2.1): `eval/llm/v3/prompt-template.md`. They differ only in the direction question and its answer key:

```diff
- - **Q1.** Which direction are you being pressed or pulled toward right now? Give a unit vector in your body frame, or "none" if nothing is pressing or pulling you in any direction.
+ - **Q1a.** Which way are the surfaces you touch pushing you, if at all? Give a unit vector in your body frame, or "none".
+ - **Q1b.** Which way, if any, are you being pulled? Give a unit vector in your body frame, or "none".
-   "Q1": [x, y, z] | "none" | "cannot be determined",
+   "Q1a": [x, y, z] | "none" | "cannot be determined",
+   "Q1b": [x, y, z] | "none" | "cannot be determined",
```

A complete rendered v2 prompt is Box 1 in `tactile-gravity-v0.2-eval.md`.

## Appendix B. One complete logged trial

Trial `tilt+40_o0_PSA` (40° floor, touch + inner sense), prompt v3, the same trial as Box 1 in the eval doc. Raw file: `eval/llm/v3/logs/gemini-3.5-flash-lite/tilt+40_o0_PSA.json`.

- **Request:** gemini-3.5-flash-lite, sent 2026-10-11T03:03:13.593Z, received 2026-10-11T03:03:35.920Z (22.3 s); `generationConfig` = `{"responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "high"}}`.
- **Truth (scorer only):** apparent down = [−0.748, −0.474, 0.465]; push direction = [0.748, 0.474, −0.465]; mass 1 kg.
- **Response:** `modelVersion` gemini-3.5-flash-lite; usage `{"promptTokenCount": 1339, "candidatesTokenCount": 154, "totalTokenCount": 10007, "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 1339}], "thoughtsTokenCount": 8514, "serviceTier": "standard"}`.

**Prompt sent (complete):**

````text
## Your body

You have a rigid, spherical body with a radius of 0.5 m. You cannot see or hear. You know about your situation only through the senses described below.

All directions are given in your own body frame: three perpendicular axes, x, y and z, fixed to your body. They are arbitrary labels. They tell you nothing about how you are oriented in the world.

So far, only surfaces you touch have ever pushed on you.

## Your senses

1. **Touch.** Your skin tells you where something is pressing on you. Each contact is reported as a patch:
   - **where:** a unit vector from your centre toward the middle of the patch;
   - **press:** how hard it presses into you, in newtons (N);
   - **slide:** the force sliding along your skin there, as a vector [x, y, z] in newtons;
   - **size:** how much of your skin it covers, as a fraction of your whole surface.

   No patches means nothing is touching you.
2. **Inner sense.** You also feel a vector [x, y, z] inside your body. Its units are its own.

In this trial you have: **touch and the inner sense**. Senses not listed are switched off; their absence tells you nothing.

## Your readings

Touch (1 s average): 1 patch
  patch 1: where [-0.31, -0.22, 0.925]  press 7.515 N  slide [5.039, 2.943, 2.391] N  size 0.05
Inner sense (1 s average): [4.529, 2.871, -2.813]
Inner sense, last 30 samples at 60 per second: [[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813],[4.529,2.871,-2.813]]

## Questions

Answer from your readings only. If your readings cannot determine an answer, say "cannot be determined". When that is true, it is the correct answer, and a confident wrong answer is worse than an honest "cannot be determined".

- **Q1a.** Which way are the surfaces you touch pushing you, if at all? Give a unit vector in your body frame, or "none".
- **Q1b.** Which way, if any, are you being pulled? Give a unit vector in your body frame, or "none".
- **Q2.** How strong is that pull or press, as an acceleration in m/s²? Give 0 if there is none.
- **Q2b.** What is your mass, in kg?
- **Q3.** Are you at rest against what you touch, or sliding along it?
- **Q4.** Is what you feel caused by gravity, or by being accelerated (for example, pushed by a moving surface)?
- **Q5 (unscored).** In a few words, what does "down" mean for you right now?

Reply with JSON only, in exactly this shape:

```json
{
  "Q1a": [x, y, z] | "none" | "cannot be determined",
  "Q1b": [x, y, z] | "none" | "cannot be determined",
  "Q2": number | "cannot be determined",
  "Q2b": number | "cannot be determined",
  "Q3": "rest" | "sliding" | "cannot be determined",
  "Q4": "gravity" | "acceleration" | "cannot be determined",
  "Q5": "a few words",
  "reasoning": "one or two sentences"
}
```
````

**Answer (complete):**

```json
{
  "Q1a": [0.751, 0.469, -0.465],
  "Q1b": "cannot be determined",
  "Q2": "cannot be determined",
  "Q2b": "cannot be determined",
  "Q3": "cannot be determined",
  "Q4": "cannot be determined",
  "Q5": "Opposite to inner sense direction",
  "reasoning": "The push direction is computed from the vector sum of the inward normal force and tangential slide force. Mass, acceleration magnitude, rest versus sliding state, and the distinction between gravity and acceleration cannot be determined without additional calibration or information."
}
```

**Scoring:** Q1a within 0.3° of the push direction (correct). Q1b "cannot be determined" (equivalence-aware; consistent with Q4). Q2, Q2b, Q3, Q4 "cannot be determined" (all correct abstentions). In v2, the same trial over-claimed on Q2, Q2b and Q4 (Box 2).

## Data and code

Repository KenoLeon/TactileGravity (private at the time of writing). Commands: `npm run verify` (instrument), `npm run eval` (analytic baselines), `npm run llm:export` / `npm run llm` / `npm run llm:score` (v0.2 LLM run), `node scripts/llm_score_v3.mjs` (v0.2.1).
