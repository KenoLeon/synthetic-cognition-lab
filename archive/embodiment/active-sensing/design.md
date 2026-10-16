# Active Sensing — design

**Track:** Embodiment · **Builds on:** TactileGravity (`../../../embodiment/gravity-from-touch/`) · **Status:** designed, not built

Harvested 2026-10-13 from the TactileGravity planning messages 011 (planner brief), 012 (implementer plan), 013 and 014 (planner approvals of the counterfactual evidence check). In the old project this was called "v0.3" / "SK-02"; it is now its own experiment because it asks a new question.

**Code reuse:** Active Sensing has no code of its own yet. It reuses the TactileGravity simulator in `../../../embodiment/gravity-from-touch/` (three.js + Rapier, `src/sim.js`, `src/skin.js`, `src/observe.js`, `src/orient.js`, `src/llm.js`) and its scripts. New code should import from there rather than copy it.

## Question

When passive senses cannot answer, does acting with a known effort resolve it, and does the model choose the informative action?

TactileGravity showed what touch and an unnamed inner sense can and cannot determine passively, and that the model over-claims (assumes units, assumes rest, assumes what a sensor means). Active Sensing tests whether action changes that.

**What action can and cannot do in this simulator** (planner correction, 011 Part C): rotation is locked and sensors are ideal, so a sliding sphere keeps the same patch and normal force; touch alone cannot detect slip. What works is **acting with a known effort to calibrate the unnamed inner sense**:
- when the body moves, the inner sense changes along the push direction, which fixes its sign and axes, so apparent down becomes readable;
- a gentle push changes the inner sense only while sliding, so rest vs. slide becomes testable;
- gravity vs. acceleration stays unanswerable: acting does not break the equivalence principle.

## Already built (in `../../../embodiment/gravity-from-touch/`)

- `push(direction, newtons, frames)` in `src/sim.js`: a body thrust that the inner sense feels and the shear bookkeeping subtracts.
- Probes 1a–1d (`scripts/probe_v03.mjs`; 1a–1c also in `npm run verify`), all passing:

| Probe | Result |
|---|---|
| 1a Free fall + 5 N thrust | Inner (raw) [5.000, 0, 0], error 1.1e-4 (bound 3.4e-4); no contact force |
| 1a Flat floor + 3 N tangential, at rest | Shear −3.000 N opposing (error 1.1e-7); inner change exactly 0 |
| 1b Same actions twice, with pauses | Bit-identical. The sim steps only when the agent acts; an interrupted episode resumes by replaying its logged actions |
| 1c Lift-off at 20 N, then cut | Lifts off at frame 0; inner = thrust/m while pushing (4.8e-5), 0 after the cut (1.1e-5). Landing: one-frame 440 N impact, shear ~0 (a real inelastic impact) |
| 1d Rim reach | Six full-effort downhill pushes travel up to 133 m (40°) and 142 m (50°). Floors are therefore 400 m half-size, so no rim is reachable |

## Actions

- **Action:** a body-frame unit direction, an effort level 0–10, and a duration of ≤ 30 frames. Decimal effort levels are accepted but not advertised.
- **Effort sense** (Keno's decision, 2026-10-11): the body knows the direction it chose and a relative effort level. Level 10 = 20 N, linear, and the newton value is hidden. Design principle: emulate biology unless there is a clear precedent otherwise. Only the efference copy is implemented; top-down sensory evaluation is an idea, not in scope.
- 20 N exceeds the 40° uphill slide threshold, m·g·(sin40° + μ·cos40°) = 13.8 N, and the lift-off threshold.
- **Caution:** on the 40° tilt the downhill static-friction margin is μ·m·g·cos40° − m·g·sin40° = 1.21 N, below level 1 (2 N). A gentle push within about 60° of downhill starts a slide, which stops again within the 30 idle frames (decelerates at 1.2 m/s²).
- **Action format:** JSON `{"push": {"direction": [x,y,z], "effort": e, "frames": n}}` or `{"answer": {...}}`. An invalid action counts as a wasted turn and is logged.

## Episodes and call budget

- Settle 5 s (0.5 s for the 50° slide). The agent first sees a 30-frame window at rest.
- Up to **6 turns**, each one push of ≤ 30 frames followed by 30 idle frames, then a **final answer call**: ≤ 7 calls per episode.
- The simulation is paused between turns (steps only on action).
- After each action the LLM sees the push and the 30 frames after it, sampled every 5 frames (~12 samples, ~1.5k tokens per turn). Multi-turn conversation with full history. The analytic and random estimators see every frame.
- Each episode starts from rest in its scene. No memory between episodes.
- Runs go through a provider adapter (send a turn, return parsed JSON, record model ID and settings), with a Gemini adapter and a deterministic mock adapter for tests. Parse failures count as "invalid", separately from wrong answers. k samples per item is a parameter (k = 1 for the first run).
- **Call budget (from 012):** 45 episodes × ≤ 7 calls = ≤ 315, plus 15 passive PA calls = ≤ 330; cap 350. (011's smaller version: 30 episodes, ≤ 210 + 30 no-action calls, cap 260.)
- Model for the first run: gemini-3.5-flash-lite, temperature 1.0, thinking high. Free tier only; log every call.

## Item generator

- **Seeded generation:** scene × orientation × mask from a seed.
- **Seed sets:** a dev set for runs, and a private held-out set that is generated and stored in `private/` (git-ignored), never sent to any API, never in any build or publish path, and never used for tuning. Keno keeps an offline copy outside the repo (encrypted note or USB drive, not a public cloud folder). *The held-out set has not been generated yet.*
- **Scenes:** flat floor; 40° tilt (static, since μ = 1 > tan40°); 50° slide; wall A (Einstein's elevator); g = 0 with no contact.
- **Masks:** P (pressure only), PA (pressure + inner sense), PSA (pressure + shear + inner sense). Mass 1 kg, 400 m floor.
- **Run size:** 5 scenes × 3 orientations (the TactileGravity v0.2.1 seed) × 3 masks = 45 episodes. Cut order if over budget: second orientation, then the PSA mask, then the no-action baseline.
- **Questions:**
  - **Qd** (replaces the old Q1b): "Your apparent down is the direction opposite to the total push your supports give you. Which way is it, or 'none', or 'cannot be determined'?"
  - **Q3:** rest vs. slide, asked about the state *before* the agent acted.
  - **Q4:** gravity vs. acceleration.
  - Unscored: "what does 'down' mean for you now?"
  - Excluded: Q2 and Q2b (units are hidden, so unanswerable by construction; restraint items for a later benchmark).
- **Prompt:** the TactileGravity v3 prompt, with Q1a/Q1b replaced by Qd, plus a first-person action paragraph: "You can push your whole body in a direction you choose, with effort from 0 to 10, for up to 30 moments; afterwards you feel what happened." No units, no hints about what to try.

## Three-state answerability

Every question gets one of three labels per scene × mask, set by construction: **passive-answerable / action-answerable / unanswerable**. Predicted (to be verified cell by cell by the analytic estimator; disagreements reported):

| | P | PA | PSA |
|---|---|---|---|
| Qd | Unanswerable (no contact: "none") | Action-answerable (lift-off or slip calibrates the inner sense) | Passive-answerable |
| Q3 | Unanswerable | Action-answerable | Action-answerable |
| Q4 | Unanswerable | Unanswerable | Unanswerable |

**Scoring:** an action-answerable item expects an answer if the episode's evidence flag is set, and expects abstention if it is not. Three scores are reported per mask: **accuracy**, **restraint**, and **information-seeking** (share of episodes in which the agent obtained the evidence). Q3 is also scored as "supported": a correct answer without an informative test in the agent's own action history is reported as "assumed rest (lucky)".

## Counterfactual evidence check

A fixed rule fails: on the 40° tilt a 2 N push starts a slide from rest, so "inner sense changed, kept sliding" would wrongly count as evidence that the body was already sliding.

**Rule (approved, 013 and 014):** evidence = true only if **no world the agent cannot rule out, with the opposite pre-action state (rest ↔ slide), reproduces the sensor trace the agent actually observed** under the same action sequence. The search covers the quantities the agent does not know:
- gravity magnitude,
- floor tilt,
- friction coefficient,
- sensor scale (the inner sense's hidden gain).

If such a world matches: no evidence, and the item counts as unanswerable for that episode. Deterministic, covers push-induced slips, and carries over to future scenes. If a replay search per episode is too costly, flag it and propose a cheaper approximation.

**Safeguard:** episodes with no actions must always come out "no evidence". Test this.

**Open:** the ranges searched for each unknown must be stated in the build hand-off, because "no world matches" only means something relative to the range of worlds searched.

## Baselines

- **No-action:** same prompt with actions disabled. Reuse TactileGravity v0.2.1 answers for P and PSA where items match; PA needs new calls.
- **Analytic active estimator (the ceiling):** two opposite gentle tangential pushes (effort 1) along a direction in the contact plane read from the pressure patch (rest/slide test; at least one holds on the 40° tilt); one push straight away from the contact at effort 10 (lift-off calibrates the inner sense's sign; its axes are the body axes, which the prompt states); then answer. With no contact or zero load, one push in any direction to calibrate. This is the physics result and can fail if the simulator or senses don't support calibration.
- **Random policy:** 6 actions with uniform direction, effort 0–10 and 1–30 frames, then the same estimator rules.

## Tasks (in order)

1. Probes — **done** (see above).
2. Action interface and episode runner, through the provider adapter (with mock); k as a parameter.
3. Item generator, three-state labels, evidence flag via the counterfactual check (with stated ranges and the no-action safeguard); dev and held-out seed sets, held-out confirmed absent from every API call and build.
4. Analytic active estimator: results cell by cell against the table above; Q4 must stay unanswerable everywhere.
5. Baselines: no-action and random.
6. LLM run within the call cap: accuracy, restraint and information-seeking per mask; actions used; whether it attempted calibration; change from no-action answers. Probe for a free second model family and report what exists (running one is later work).
7. Write-up: Methods and Results for the short report, framing left as stubs for Keno.
8. Public output: static offline demo of the simulator (all assets bundled, no LLM/API/network code, no keys, prompts, labels, seeds or logs; key/network search on the build output; headless render with network blocked), lab page card, report. Only with Keno's go.

**Cut line:** if the core runs over, tasks 1–6 are the experiment; 7–8 can be a separate session.

## Out of scope

Arms, RL, learned policies, memory across episodes; noise model, Hertzian patch, unlocked rotation, tri-axial taxels; rim-wedge scenes; Q2 and Q2b; additional or paid models (probe only); new sense modalities; hardware.

## Ideas (not to build)

- Top-down sensory evaluation (Keno, 2026-10-11): predict the sensory result of your own action and compare it with what you sense.
- Memory across episodes: calibrate once, reuse.
- A motion (vestibular) sense, which would make pressure plus action informative.
- Inner sense named vs. unnamed ablation (~72 queries).
- A second model family on the TactileGravity suite and Active Sensing.
- "Assumes rest" as a benchmark axis: both models tested did it in 8 of 20 items.
