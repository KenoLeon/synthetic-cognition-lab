# Gravity from Touch

*Embodiment track, [Synthetic Cognition Lab](../../README.md). Formerly TactileGravity.*

Can a language model tell which way is down from touch alone, and does it admit what touch cannot tell it? A simulated sphere rests on a tiltable floor (or is pressed by walls in zero gravity). Its 200-taxel skin senses pressure and shear; an unnamed "inner sense" (an accelerometer in hidden units) can be switched on. The readings are turned into a first-person prompt, and the model's answers are scored for accuracy **and** restraint: "cannot be determined" is the correct answer where the senses don't settle the question.

**Status (2026-10-19):** Building. The workbench was refactored and verified bit-identical to the earlier version. Re-running the earlier result on it, the model still reads directions from touch well and still claims things its senses can't settle (Earth gravity, units, rest vs. sliding), but the earlier over-claim rate (14.2%) did not replicate (20.5%); we are measuring the real run-to-run spread before any report. Details: [STATE.md](STATE.md) and [FINDINGS.md](FINDINGS.md) (F3).

![The workbench replaying a logged trial: the scene, what the body feels, the prompt as sent, and the model's scored answer](report/img/workbench-replay.png)

## The workbench

```
npm install
npm run dev       # workbench at http://localhost:5173
npm run verify    # headless checks, incl. bit-identical readings vs. eval/golden/; exits non-zero on failure
npm run eval      # analytic baseline estimators on the scene suite
```

- **Play:** tilt the floor (the main control), switch between *slides* (rotation locked, as in every eval; friction holds the ball until about 45°) and *rolls*, and watch the skin. The left conversation panel shows what the model would be told right now.
- **Eval replay:** pick a logged run, scene, orientation and sense set and press ▶. The scene runs live, the 1 s reading is taken, then the prompt and the model's logged answer appear side by side, each answer scored. A check confirms the live simulation reproduces the logged readings exactly. Links start a replay directly, e.g. `?trial=g19.62_o0_PSA&run=rep1`.
- **Details ⚙:** world and sense parameters, the zero-g walls, recording to JSON, the rest-vs-walls test and live numbers.

Stack: three.js (render), `@dimforge/rapier3d-compat` 0.21.0 (physics, WASM), Vite.

| file | role |
|---|---|
| `src/workbench/world.js` | the Rapier world, modes and surfaces, floor tilt, wall drives, contact readout |
| `src/workbench/body.js` | the sphere, its motion, contact forces (normal from manifolds, tangential from dynamics) |
| `src/workbench/actions.js` | thrust |
| `src/workbench/sensors/` | `taxel-skin.js` (pressure, shear, patches, summary) and `inner-sense.js`; each has `read(state)` |
| `src/sim.js` | composes the parts; the API the scripts and app use |
| `src/observe.js`, `src/eval.js` | observations (body frame, masked senses), scene suite, labels, estimators |
| `src/llm.js` | prompt readings, labels and scoring for the LLM runs (browser-safe; `src/llm-template.js` loads the template in Node) |
| `src/main.js`, `src/ui/` | the workbench UI (skin map, replay) |
| `scripts/` | verification, probes, golden readings, LLM export / query / scoring |
| `eval/` | baselines, golden readings, LLM prompts, truth, logs and scores (`eval/llm/v3/` = v0.2.1, `eval/llm/v0.2.1-replication/`) |
| `report/` | earlier write-ups (pre-refactor; see the notes at their tops) |

Nothing under `src/` except `main.js` and `src/ui/` touches the DOM, so the same code runs in the browser and in Node.

LLM runs: `node scripts/llm_query.mjs <model> --dir=<folder> --ids=@<file>` (key `GEMINI_API_KEY` in `.env.local`, git-ignored), scored with `node scripts/llm_score_v3.mjs --dir=<folder>`. The replication is `bash eval/llm/v0.2.1-replication/run.sh`.

## Modes
- **floor**: gravity g along −y; the sphere rests on a kinematic 12 × 12 m floor with 0.6 m rim walls on its edges (they tilt with it; touching one is a sensed contact, surface `rim`). The floor tilts toward the slider value at a bounded rate and pivots about the point under the sphere. (Snapping the angle in one step made the floor swat the sphere into the air at up to 55 m/s.)
- **wallA** (Einstein's elevator): world gravity 0. A free 1 kg wall plate is driven with (M_wall + m)·g, so wall and sphere accelerate together at g and the wall presses the sphere with m·g.
- **wallB** (squeeze, v0.1): world gravity 0. A fixed wall at body −y plus a 1 kg pusher plate driven into body +y with m·g. Two real contacts; the sphere stays still.

In the wall modes the sphere is rotated so body −y faces the fixed wall, so the wall touches the same body point as the floor. Comparisons are taxel-for-taxel in the body frame.

v0's wall B pushed the sphere with an invisible body force and was removed in v0.1. A force on every mass element is gravity, so a real accelerometer would read g, but the v0 formula read 0; no real stimulus does both.

## Skin model
- 200 taxels, Fibonacci-sphere layout, body-local coordinates (logged in every recording header).
- **Normal force** from the engine, per touching surface: Σ `manifold.contactImpulse(i)` / `world.timestep`, via `world.contactPair(sphere, other, (manifold, flipped) => …)`. The `flipped` flag fixes the normal's sign.
- **Tangential force** (v0.1): Rapier 0.21's JS `contactTangentImpulseX/Y` always return 0, although friction is applied (`scripts/probe_shear.mjs`). So the tangential force comes from the sphere's dynamics: net contact force = m·Δv/Δt − m·g_world − applied forces, minus the manifold normal forces. With several non-parallel contacts (e.g. floor + rim) it is split by the minimum-norm rule: the smallest in-plane forces that sum exactly to the residual. With parallel contacts it is split in proportion to normal force.
- **Distribution** from geometry, against the ideal tangent plane of the undeformed sphere: w_i = clamp(1 − (n_body·p_i + r)/h, 0, 1), P_i = F·w_i / Σw, and shear s_i = T·w_i / Σw with the same weights. Both sum exactly to the engine's forces. The default h = 0.05 m presses about 10 taxels.
- **Solver penetration is deliberately ignored.** Rapier's soft contacts sink 0.06–0.55 mm, scaling with load and differing between setups at the same m·g. Using it made the skin partly sense the solver. Penetration is still logged under `truth`.
- **Summary:** total normal force, centre of pressure, contact area (taxels > 0.01 N), peak taxel; v0.1 adds patch count (pressed taxels > 30° apart start a new patch), per-patch force/direction/shear/force vector, and the skin force vector (normal + shear) with magnitude and direction.
- **Inner sense (accelerometer)**: body-frame proper acceleration Rᵀ(Δv/Δt − g_world). In prompts it is unnamed and scaled by a hidden gain, so its numbers don't reveal m/s².

### Known limitations
- Shear is inferred from the sphere's dynamics, not read from the solver. Its per-contact split is exact in total but a modelling choice per contact; a ball wedged against a rim is statically indeterminate, so its per-contact forces are whatever the solver picked.
- Patch shape doesn't depend on load: only pressure scales with g, never contact area.
- Taxel quantisation: the CoP direction sits up to about 1.3° from the true contact direction.
- The skin only feels m·g; mass and gravity are confounded (condition 2b). The accelerometer separates them.
- With only contact forces acting, the skin force vector equals m × the accelerometer reading, so at rest it points opposite gravity by Newton's law.

## Running the conditions in the workbench
1. **Tilt**: the floor tilt control. The pressure patch follows the floor normal on the skin map's underside disc.
2. **Gravity magnitude**: Details ⚙ → gravity, or the "g × 2" preset. Same patch, pressure scales.
3. **Zero gravity**: the "Zero g" preset. All taxels grey (exactly 0 N).
4. **Equivalence**: Details ⚙ → condition "wall A", or **Run test** (conditions 4–6).
5. **Squeeze vs. rest**: condition "wall B" shows two patches and zero net skin force.
6. **Shear**: Details ⚙ → "Shear arrows on the body".

**Record** (Details ⚙) logs every physics step (sensory frame + `truth` + `params`) and downloads JSON on stop.

## Verified results (`npm run verify`, 1 s average after 5 s settle)
| check | result |
|---|---|
| C1 tilt −40…40° | CoP within 1.3° of −floor normal; normal force = m·g·cosθ to 4 dp |
| C2 g = 2, 4.9, 19.6 | CoP shift 0.000°, taxels = (g/9.81)·reference, relL2 ≤ 1.5e-8 |
| C2b (2 kg, 9.81) vs (4 kg, 4.905) | skin identical (relL2 0); accelerometer 9.81 vs 4.905 |
| C3 g = 0 | every taxel exactly 0 |
| C4 floor vs wall A | relL2 3.1e-5, ΔCoP 0.000° → **match** |
| C5 accelerometer, floor vs wall A | \|Δa\| 0.0001 → **matches** (equivalence principle) |
| C6 floor vs wall B (squeeze) | patches 1 vs 2; net skin force 9.81 vs 0 N; wall B accelerometer 0.000 |
| C7 true down, tilt −40…40° | skin force vector 0.0000° from true down, \|F\| = 9.8100; normal-only CoP error ≈ tilt |
| C7 at 50° (sliding, recorded) | skin vector 5.00° off, \|F\| = 8.9177 N = Coulomb sliding prediction |

Condition 5's criterion changed in v0.1: v0 also required "wall B accelerometer differs", which relied on the removed, inconsistent wall B.

## Ideas for next versions
See [report/tactile-gravity-v0-results.md](report/tactile-gravity-v0-results.md), "Next steps and new ideas": Hertzian patch, sensor realism, slip/stability, mass from |skin force| / |accelerometer|, a free-fall vs. squeeze vs. rest condition, solver-side shear cross-checks, per-taxel 3-axis frames, gyroscope, the two arms, and an agent loop.
