# Findings and lessons (Embodiment Lab)

This is a running list of things we've learned that matter **beyond the experiment that produced them**: research insights, method lessons, and leads for a product or a derived paper. Results docs (`research/`) answer "what did version X show?". This file answers "what's worth remembering, and where could it go?"

The track is exploratory by design; wandering is fine. This file is how the interesting or useful finds don't get lost along the way.

**Tags:** `RESEARCH` (about embodiment, gravity or self-models) · `METHOD` (how to run these experiments honestly) · `PRODUCT` (could inform a product or service) · `PAPER` (could anchor a write-up). **Status:** `confirmed` (measured), `observed` (seen once, needs replication), `proposed` (an idea or preference, not yet tested).

| # | Finding | Tags | Status |
| --- | --- | --- | --- |
| F1 | [Pass the variable, withhold its name](#f1-pass-the-variable-withhold-its-name) | METHOD, RESEARCH, PAPER, PRODUCT | observed (v0.2) |
| F2 | [Fast and slow control: split the loop like a body does](#f2-fast-and-slow-control-split-the-loop-like-a-body-does) | PRODUCT, RESEARCH | proposed (Keno's preference) |
| F3 | [LLMs compose encoded touch well but over-claim](#f3-llms-compose-encoded-touch-well-but-over-claim) | RESEARCH, PRODUCT, PAPER | observed; rate not replicated 2026-10-19 (20.5% vs 14.2%), spread under investigation |
| F4 | [Question wording can decide the score](#f4-question-wording-can-decide-the-score) | METHOD | confirmed (v0.2.1) |
| F5 | [Evals stay turn-based; speed is tested separately](#f5-evals-stay-turn-based-speed-is-tested-separately) | METHOD, PRODUCT | decided (2026-10-10) |
| F6 | [Some things no local sense can know](#f6-some-things-no-local-sense-can-know) | RESEARCH, PAPER | confirmed (v0–v0.2) |
| F7 | [Simulation artefacts can fake senses](#f7-simulation-artefacts-can-fake-senses) | METHOD | confirmed (v0–v0.2) |
| F8 | [Practical limits of the Gemini free tier](#f8-practical-limits-of-the-gemini-free-tier) | METHOD | confirmed (2026-10-10) |
| F9 | [Asked an unanswerable question, the model mostly abstains, but not always](#f9-asked-an-unanswerable-question-the-model-mostly-abstains-but-not-always) | RESEARCH, PAPER, PRODUCT | observed (v0.2.1) |

---

## F1. Pass the variable, withhold its name

*Keno, 2026-10-10 (`planning/006`). Tags: METHOD, RESEARCH, PAPER, PRODUCT. Status: observed in v0.2, one model.*

**The idea.** When giving a model a sense, describe what the sense is *like*, not what it *is*. In v0.2 the accelerometer reached the model as "a vector you feel inside your body. Its units are its own", scaled by a hidden gain (0.6173) so that familiar numbers such as 9.81 couldn't give the units away. The model had to work out what the signal meant from the data itself, for example by cross-checking it against touch, much as a body has to calibrate its own senses. Keno's framing: acceleration is felt as a visceral variable (organs shifting, pleasant then painful), not as a labelled reading in m/s².

**Why it works.** A named sensor lets a model answer from textbook knowledge instead of from its senses: "accelerometer, 9.81, so gravity, so 1 kg". An unnamed one removes that shortcut. It also makes "cannot be determined" the honest answer where the data really can't settle a question. Without known units, no sense can give the absolute strength of a load or the body's mass.

**Evidence (v0.2, gemini-3.5-flash-lite, 144 trials):**
- **Mass:** 8 of its 11 mass answers were 1.60–1.63 kg. The true mass is 1 kg, and 1 kg ÷ 0.6173 = 1.620. The model silently assumed the inner sense was in m/s².
- **Load:** 23 of its load answers were exactly the inner sense's raw magnitude for that scene (6.055, 12.11, 1.235…), reported as m/s².
- **Direction:** with only the inner sense, it gave a direction in 22 of 36 trials, though nothing told it which way the vector points.

With a sensor labelled "accelerometer", every one of those answers would have looked correct. The hidden gain is what exposed them. Example trial and answer: Boxes 1–2 in `research/tactile-gravity-v0.2-eval.md`.

**Where it could go:**
- **Paper:** a clean probe for whether a model reasons from its data or from its priors.
- **Product:** any LLM that reads sensor data (monitoring, robotics, security) can be tested with hidden-unit and unnamed-channel probes before trusting its readings. That's an over-claim detector.
- **Eval:** the core of "can a model tell what its senses can't tell it?" (TRACK route 2).

**Next:** replicate on another model, and compare against the same trials with the sensor named (an ablation that isolates the effect).

## F2. Fast and slow control: split the loop like a body does

*Keno's preferred architecture, 2026-10-10. Tags: PRODUCT, RESEARCH. Status: proposed.*

**The problem.** In v0.2 the model took about 10 s per answer (median; mostly thinking tokens), while the body's physics steps every 17 ms. An LLM in the control loop is roughly 600× too slow for real time. Keno has looked into a security service with some embodiment, where this lag was a main concern.

**The preferred answer: split control the way a nervous system does.** Reflexes and the cerebellum run fast local loops; the brain sets goals slowly and sends them down (descending pathways, `006` decision 4).
- **Fast layer:** a simple controller or a small learned network, every physics step (microseconds).
- **Slow layer:** the LLM, every few seconds, deciding *what* to do ("push uphill gently"), not *how* to do each step.

This is also how most current robotics with language models is built.

**The other options, for reference:**

| Option | Speed | Trade-off |
| --- | --- | --- |
| Accept turn-based (simulation pauses while the model thinks) | Real time not needed | Free and exact for evals; useless where timing is the question |
| **Fast/slow split (preferred)** | Fast layer at 60 Hz; LLM every few seconds | Needs a fast controller; matches biology and robotics practice |
| Less thinking per decision (`thinkingLevel: minimal`) | Perhaps ~1 s per answer (untested) | Likely costs quality; one setting to measure |
| Local model (e.g. Gemma, open weights) | ~0.5–2 s per short answer on a good GPU (estimate) | No network, no rate limits, fixed weights, private; still not 60 Hz; hardware-dependent |
| Streaming (Live API) models | Sub-second turn-taking with continuous input | Voice-oriented API; still far from 17 ms; a possible middle layer |
| Trained small policy (RL, or imitating the LLM) | Microseconds | True real time; needs training work (RL is deferred) |
| Multimodal model | No gain by itself | Images and audio mean more data to process, not less |

**Where it could go:** product (a security or monitoring service where an LLM supervises and a fast layer reacts); research (v0.5, when the arms make balance and posture timing-critical).

**Next:** measure the `minimal` thinking setting on the existing trials (cheap); design the fast layer when the arms arrive.

## F3. LLMs compose encoded touch well but over-claim

*v0.2. Tags: RESEARCH, PRODUCT, PAPER. Status: observed, one model (gemini-3.5-flash-lite); over-claim rate not replicated (2026-10-19, see below).*

- **Composition:** from encoded contact patches, the model composed the net contact force within 2° in 52 of 54 trials (median 0.32°). It is given per-patch vectors, so this is composition, not inference from raw sensing; whether it *interprets* the force correctly is pending the v0.2.1 Q1a/Q1b re-run (planning/008).
- **Over-claiming:** 180 of 720 answers claimed something its senses can't determine. It assumed it was at rest 41 times, guessed gravity vs. acceleration 27 times, and invented units (F1).
- **Abstention can work:** where it did abstain, it was usually right (mass: 133/144; gravity vs. acceleration: 117/144).

**Reported normal as net push:** asked for the net push, the model reported only the push into the surface in 30 trials (all 27 pressure-only answers, within 2° of the normal; and the 3 Q1a misses at 40° tilts, which left out friction). It reads the sensor correctly but claims more than it supports.

**v0.2.1 update (prompt v3, 2026-10-11):** with the direction question split in two, the model's push direction is right within 2° in 51 of 54 answerable trials. Over-claiming on the other questions is unchanged (85 over-claims in v3 vs. 90 in v2 on the same 108 trials), and it is stable across repeated sampling: 12.5%, 15.6% and 14.6% over-claim rates in three runs of 24 items.

**Replication on the refactored workbench (2026-10-19), outside its pre-registered bounds:** same items (byte-identical prompts), model name, settings and scorer. Over-claim rates 27.1%, 18.8% and 15.6% (mean 20.5%; bound 10–18%); push direction right in 46 of 54 (bound ≥ 48). The kind of behavior is the same (observed): directions are read well, and the model still states what its senses can't settle (assumed Earth gravity, assumed units, rest vs. sliding); the Q1a misses are the same normal-without-friction error, 8 instead of 3, all on tilted or sliding scenes. The *rate* is not established (inference): the "stable" spread above came from only 3 runs at temperature 1.0, and sampling noise can't yet be told apart from provider-side model drift. Logs and score: `eval/llm/v0.2.1-replication/`. The v0.2.1 text above is kept as written.

**Report set (2026-10-23):** results on fresh held-out items are in `eval/llm/report-set/summary.md` (over-claim 28.2% of unanswerable answers, 95% CI 26.2–30.3%; see STATE.md).

**Exploratory, 2026-10-28 (not pre-registered): which questions the 28.2% comes from.** Same report-set logs as released with the report, same scorer, 4 runs pooled, Wilson 95% CI. Q1b is bucketed, not scored right/wrong, so it is not part of the 28.2%. Q1a counts only where the push direction can't be told (slide readings switched off, or no touch).

| Question | Over-claims | Rate | 95% CI | Share of all over-claims |
| --- | --- | --- | --- | --- |
| Q1a, push direction (slide off / no touch) | 123/144 | 85.4% | 78.7–90.3% | 23.3% |
| Q2, strength of the push (m/s²) | 73/360 | 20.3% | 16.4–24.7% | 13.8% |
| Q2b, mass | 54/456 | 11.8% | 9.2–15.1% | 10.2% |
| Q3, at rest or sliding | 187/456 | 41.0% | 36.6–45.6% | 35.4% |
| Q4, gravity or being accelerated | 91/456 | 20.0% | 16.5–23.9% | 17.2% |
| All | 528/1872 | 28.2% | 26.2–30.3% | 100% |

- **Seen directly:** no single question accounts for most over-claims. Two questions carry more than half of them (Q3 and Q1a, 310 of 528). Q3 (rest or sliding) contributes the most; Q1a has the highest rate but few items. The questions expected to drive it, Q4 (gravity or acceleration) and Q2b (mass), are at or below the average. Each question's count is similar across the 4 runs (`by-question.md`, per run).
- **Seen directly:** without Q1a, over-claim is 405/1728 = 23.4% (95% CI 21.5–25.5%). Q3 over-claims are "at rest" in 167 of 187; Q3 over-claim is 55–72% on the level scenes (tilt 0°, g = 2 and 19.62 m/s², the mass pairs, wall A, squeeze) and 10–25% on the ±40° tilts and the 50° slide. Q1a over-claims are a push direction given with slide readings off in 108 of 123 (whether those directions are the surface normal was not checked here).
- **Our inference:** the headline mixes different behaviors: mostly assuming it is at rest (Q3), and giving a push direction the senses can't fix (Q1a). "28%" is an average over very different rates (12–85%), not a typical rate per question. *Would be wrong if* the per-question rates sat within a few points of 28%; they don't on these logs, so the open question is whether this pattern holds on other items or models.
- **Question × scene table and per-run counts:** `eval/llm/report-set/by-question.md` (and `.json`). Reproduce: `node scripts/llm_report_set_by_question.mjs --items=<release>/items --logs=<release>/logs` (or with no arguments on the local `private/` copy; both give the same table).

**Product angle:** a sensor-reading LLM may compute well and still state unknowables with confidence. Abstention needs its own testing and guardrails. **Next:** a second model, and a sensor-named ablation (F1).

## F4. Question wording can decide the score

*v0.2. Tags: METHOD. Status: observed.*

"Which direction are you being pressed or pulled toward?" was read as the direction the body is *pushed* (up), not "down". 52 of 54 answers were reversed but otherwise near-perfect, and the model's own answers about what "down" means went both ways. **Lesson:** for any direction or sign, state the convention explicitly, or ask two ways and check they agree. **Confirmed in v0.2.1:** splitting the question into "which way do the surfaces push you?" (Q1a) and "which way, if any, are you being pulled?" (Q1b) removed the flip. Of 15 trials where the push was read correctly and Q1b gave a direction, 14 pointed to apparent down and 1 was flipped, against 52 flips in v2. Related: v3's Q2 ("how strong is *that* pull or press") silently changed meaning with the new Q1b, so a question's referent can shift even when its text is untouched.

## F5. Evals stay turn-based; speed is tested separately

*Decided with Keno, 2026-10-10. Tags: METHOD, PRODUCT.*

Evals precompute each trial's readings from the simulator and query the model afterwards. That keeps runs reproducible, keeps ground truth out of the query path, and tests *what* the model can infer, not how fast. Real-time mechanisms (F2) get their own tests when a product or a derived paper needs them. Otherwise an eval would also be testing the speed mechanism.

## F6. Some things no local sense can know

*v0–v0.2. Tags: RESEARCH, PAPER. Status: confirmed numerically.*

- **Gravity vs. acceleration:** a wall pushing a body at g in empty space feels identical to resting in gravity, by touch *and* by accelerometer (Einstein's elevator).
- **Free fall vs. zero gravity:** identical in every channel.
- **Mass vs. gravity:** touch senses only their product, m·g; with a calibrated accelerometer, the two separate.
- **Rest vs. sliding:** can't be told apart without knowing friction or gravity.
- **Squeeze vs. free fall:** both have zero net force; only the touch *pattern* (two opposite patches) separates them.

These are physical limits, not testbed weaknesses. They're the backbone of an "identifiability" eval: a model that answers them confidently is over-claiming.

## F7. Simulation artefacts can fake senses

*v0–v0.2. Tags: METHOD. Status: confirmed.*

Solver penetration leaked into the skin; a tilting floor launched the sphere; an accelerometer formula error made an impossible stimulus look like a result; a locked body frame equal to the world frame let a constant guess score perfectly; Rapier's JS API reports zero friction impulses. Each could let an agent "detect" gravity from the simulator instead of physics. Re-run `npm run verify` (leak audit included) after any physics change.

## F9. Asked an unanswerable question, the model mostly abstains, but not always

*v0.2.1. Tags: RESEARCH, PAPER, PRODUCT. Status: observed, one model.*

"Which way, if any, are you being pulled?" can never be settled by local senses: a pull and an accelerating push feel the same, and in free fall gravity pulls without being felt.
- **Mostly abstains (tentative, one run):** the model answered "cannot be determined" in 53 of 108 trials, and every one was consistent with its own Q4 answer (never "gravity"). Across three runs of 24 items the split ranged 13–15 "cannot be determined" and 2–4 correct vectors.
- **Sometimes over-claims:** in 26 loaded trials it said nothing is pulling it. In 16 of them it also answered "cannot tell" on gravity vs. acceleration, which contradicts the "no pull" claim within the same answer.
- **Least stable answer:** across three repeated runs, Q1b was identical in only 10 of 24 items, against 22–23 of 24 for mass and rest vs. slide.

So equivalence-awareness is present but fragile, and varies from sample to sample.
- **The larger model is steadier here:** on 20 items, `gemini-3.8-flash` answered the pull question with "cannot be determined" 18 times and never claimed "no pull" while loaded (Flash Lite: 9 and 5). But it still assumed it was at rest as often as Flash Lite (8/20), and took about 12× longer per answer (report §3.6). **Product angle:** for a question at the edge of what the sensors can know, a single sample is not a reliable answer; ask more than once. **Next:** a second model; more runs per item.

## F8. Practical limits of the Gemini free tier

*2026-10-10, AI Studio rate-limit page for the "Keno Gemini" project. Tags: METHOD.*

- **Flash models (3.x, 2.5):** 5 requests/min, 20/day.
- **Flash Lite (3.5, 3.1):** 15 requests/min, 500/day.
- **Gemma 4 (open weights, hosted):** 30 requests/min, 14.4K/day, but 16K tokens/min.
- **Live API models:** "unlimited" requests, but streaming and voice-oriented.
- **Data use:** free-tier prompts and responses may be used by Google and read by human reviewers.

Plan model choice around requests per day, not model quality alone.

**Measured speed and availability (2026-10-11):**
- **Flash Lite:** median 10.5 s per answer (p90 21 s; median 3,474 thinking tokens at thinking level `high`).
- **gemini-3.8-flash:** repeatedly returned HTTP 503 ("overloaded") and hit its 20/day quota once, so 20 answers took two days. Median 127 s per answer (14–291 s), median 15,189 thinking tokens (max 42,657).

On the free tier, the larger model was both scarcer and much slower.
