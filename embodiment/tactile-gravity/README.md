# Tactile Gravity v0.1

*First experiment of **Embodiment Lab**, a testbed for what an AI can know about its own body and situation from its own senses alone. Track charter and status: [planning/TRACK.md](planning/TRACK.md).*

Virtual embodiment experiment: can an agent infer gravity (direction, magnitude,
stability) from a tactile skin? A sphere body on a tiltable floor with a 200-taxel skin
(pressure and, since v0.1, shear), an optional accelerometer, zero-g wall setups and JSON
logging. No arms, no AI loop yet.

Findings and lessons worth keeping beyond this experiment, including product leads: [FINDINGS.md](FINDINGS.md).

Planning log (numbered briefs, hand-offs and reviews between the user, the planning AI and Claude): [planning/](planning/README.md).

Results write-up: [research/tactile-gravity-v0-results.md](research/tactile-gravity-v0-results.md). For viewers that open a `.md` without its folder (e.g. Context Pad), use `research/tactile-gravity-v0-results.standalone.md`, which has the images embedded; rebuild it with `npm run build:doc` after editing the results.

![The app on a floor tilted 30°: pressed taxels in blue with orange shear arrows, control panel and skin map on the right](research/img/app-overview.png)

![Skin maps at floor tilts of −30°, 0° and +30°: the pressed patch shifts across the body](research/img/skin-map-tilt.png)

```
npm install
npm run dev       # app at http://localhost:5173
npm run verify    # headless numeric check of conditions 1–7 (+2b); exits non-zero on failure
npm run check     # physics core: engine contact force vs m·g·cosθ
npm run probe     # raw Rapier contact-manifold probe
npm run probe:bounce  # launch/bounce probe + restitution drop test
node scripts/probe_shear.mjs  # what Rapier reports for friction (tangent) impulses
npm run build:doc     # rebuild the image-embedded standalone results doc
```

Stack: three.js (render), `@dimforge/rapier3d-compat` 0.21.0 (physics, WASM), Vite.

| file | role |
|---|---|
| `src/sim.js` | physics world, the three modes, contact forces (normal from manifolds, tangential from dynamics), accelerometer |
| `src/skin.js` | taxel layout, pressure + shear distribution, patches, summary |
| `src/sensors.js` | per-step JSON frame (sensory channels vs `truth`) |
| `src/experiments.js` | settle/average/compare conditions; rest vs. walls test (shared by UI and Node) |
| `src/main.js` | rendering, heatmap, shear arrows, skin map, panel, recording |
| `scripts/verify_conditions.mjs` | the numeric verification of conditions 1–7 |

Nothing under `src/` except `main.js` touches the DOM, so the same code runs in the browser and in Node.

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
- **Accelerometer**: body-frame proper acceleration Rᵀ(Δv/Δt − g_world). A separate channel, off by default, `null` in frames when off.

### Known limitations
- Shear is inferred from the sphere's dynamics, not read from the solver. Its per-contact split is exact in total but a modelling choice per contact; a ball wedged against a rim is statically indeterminate, so its per-contact forces are whatever the solver picked.
- Patch shape doesn't depend on load: only pressure scales with g, never contact area.
- Taxel quantisation: the CoP direction sits up to about 1.3° from the true contact direction.
- The skin only feels m·g; mass and gravity are confounded (condition 2b). The accelerometer separates them.
- With only contact forces acting, the skin force vector equals m × the accelerometer reading, so at rest it points opposite gravity by Newton's law.

## Running the conditions in the UI
1. **Tilt**: "C1 tilt 30°" or the tilt slider. The pressure patch follows the floor normal on the skin map's feet disc.
2. **Gravity magnitude**: "C2 g×2" or the gravity slider. Same patch, pressure scales.
3. **Zero gravity**: "C3 zero g". All taxels grey (exactly 0 N).
4. **Equivalence**: mode wall A; compare the live summary with the floor, or press **Run test**.
5. **With accelerometer**: tick "Accelerometer channel"; wall A still matches the floor.
6. **Squeeze vs. rest**: mode wall B shows two patches, net skin force 0, accelerometer 0. **Run test** reports conditions 4–6.
7. **True down**: tilt the floor with "Shear arrows" on. The truth line shows true down with the CoP error and the skin-vector error.

**Record** logs every physics step (sensory frame + `truth` + `params`, including the `shear` channel) and downloads JSON on stop. The heatmap, skin map and tooltips draw from the same rounded array that gets logged. v0 frame fields are unchanged; v0.1 only adds fields.

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
See the results doc's "Next steps and new ideas": Hertzian patch, sensor realism, slip/stability, mass from |skin force| / |accelerometer|, a free-fall vs. squeeze vs. rest condition, solver-side shear cross-checks, per-taxel 3-axis frames, gyroscope, the two arms, and an agent loop.
