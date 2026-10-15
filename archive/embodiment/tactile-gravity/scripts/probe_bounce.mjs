// Probe: where does visible "bounce" come from? Apply each UI-style change at once (tilt is a
// target the floor turns toward) and record the peak sphere–floor gap and steps without contact.
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS } from '../src/sim.js';
await RAPIER.init();

function run(label, setup, change) {
  const sim = createSim(RAPIER, setup);
  sim.resetSphere();
  for (let i = 0; i < 120; i++) sim.step();
  change(sim);
  let maxGap = 0, lost = 0, maxVn = 0;
  for (let i = 0; i < 240; i++) {
    const r = sim.step();
    const p = sim.sphereBody.translation();
    const v = sim.sphereBody.linvel();
    const a = (sim.tiltDeg * Math.PI) / 180;
    const n = { x: -Math.sin(a), y: Math.cos(a) }; // floor normal
    const f = sim.floorBody.translation(); // a point on the floor's top surface
    const gap = (n.x * (p.x - f.x) + n.y * (p.y - f.y)) - SPHERE_RADIUS;
    maxGap = Math.max(maxGap, gap);
    maxVn = Math.max(maxVn, n.x * v.x + n.y * v.y);
    if (!(r.contacts[0]?.force > 0) && sim.gravity > 0) lost++;
  }
  console.log(`${label.padEnd(36)} peak gap ${(maxGap * 1000).toFixed(2).padStart(8)} mm` +
    `  peak v_normal ${maxVn.toFixed(3).padStart(6)} m/s  steps airborne ${String(lost).padStart(3)}`);
}

run('drop from reset (1 mm)', {}, () => {});
run('g 9.81 -> 20 in one step', {}, (s) => s.setGravity(20));
run('g 20 -> 0.5 in one step', { gravity: 20 }, (s) => s.setGravity(0.5));
run('mass 1 -> 10 in one step', {}, (s) => s.setMass(10));
run('mass 10 -> 0.1 in one step', { mass: 10 }, (s) => s.setMass(0.1));
run('tilt 0 -> 30 in one step', {}, (s) => s.setTilt(30));
run('tilt 0 -> 30, sphere 2 m off pivot', {}, (s) => {
  s.sphereBody.setTranslation({ x: 2, y: 0.5, z: 0 }, true);
  for (let i = 0; i < 60; i++) s.step();
  s.setTilt(30);
});
run('tilt 30 -> 0, sphere 2 m off pivot', { tiltDeg: 30 }, (s) => {
  s.sphereBody.setTranslation({ x: -2 * Math.cos(Math.PI / 6), y: -2 * Math.sin(Math.PI / 6) + 0.5 / Math.cos(Math.PI / 6), z: 0 }, true);
  for (let i = 0; i < 60; i++) s.step();
  s.setTilt(0);
});

// Restitution: drop from 1 m (gap) and measure the first rebound apex. Ideal: apex / 1 m = e².
for (const e of [0, 0.3, 0.6, 0.9]) {
  const sim = createSim(RAPIER, { restitution: e });
  sim.resetSphere(1.0);
  let touched = false, apex = 0;
  for (let i = 0; i < 300; i++) {
    const r = sim.step();
    const gap = sim.sphereBody.translation().y - SPHERE_RADIUS;
    if (r.contacts[0]?.force > 0) touched = true;
    if (touched) { apex = Math.max(apex, gap); if (sim.sphereBody.linvel().y < 0 && apex > 0 && gap < apex - 1e-4) break; }
  }
  console.log(`restitution ${e.toFixed(1)}: rebound apex ${(apex * 1000).toFixed(1).padStart(6)} mm  (ideal e²·1 m = ${(e * e * 1000).toFixed(0)} mm)`);
}
