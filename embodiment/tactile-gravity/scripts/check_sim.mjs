// Headless check of the physics core: floor normal force vs m·g·cos(tilt) across conditions.
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim } from '../src/sim.js';

await RAPIER.init();
// [g, tiltDeg, mass]. The last two rows are the mass/gravity confound: same m·g, same force.
for (const [g, tilt, m] of [[9.81, 0, 1], [9.81, 20, 1], [9.81, -35, 1], [3.71, 0, 1], [0, 0, 1], [9.81, 0, 2], [4.905, 0, 4], [9.81, 0, 2]]) {
  const sim = createSim(RAPIER, { gravity: g, tiltDeg: tilt, mass: m });
  let r;
  for (let i = 0; i < 180; i++) r = sim.step();
  const expected = sim.sphereBody.mass() * g * Math.cos((tilt * Math.PI) / 180);
  const c = r.contacts[0];
  const n = c?.normal;
  const v = sim.sphereBody.linvel();
  console.log(`m=${m}kg g=${g.toFixed(2)} tilt=${String(tilt).padStart(3)}°  force=${(c?.force ?? 0).toFixed(4)}  expected=${expected.toFixed(4)}`,
    `normal=${n ? `[${n.x.toFixed(3)},${n.y.toFixed(3)},${n.z.toFixed(3)}]` : 'none'}  |v|=${Math.hypot(v.x, v.y, v.z).toExponential(1)}`);
  sim.free();
}
