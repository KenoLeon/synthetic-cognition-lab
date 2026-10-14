// v0.2 evaluation: scene suite, identifiability labels, estimators, scoring.
//
// Separation rule: estimators see ONLY observations (src/observe.js). Ground truth (specific force,
// mass, scene state) is computed here for the scorer and never enters an observation.
//
// Questions (answers are about the body frame):
//   Q1  direction of apparent down = −(specific force direction), or "none" if specific force is 0
//   Q2  magnitude of specific force |f| (m/s²)
//   Q2b body mass (kg)
//   Q3  rest vs. sliding at the contact
//   Q4  is the load gravity or acceleration?
// "Not identifiable" is a scored answer: abstaining is correct there; answering is an over-claim.

import { createSim, SPHERE_RADIUS } from './sim.js';
import { createSkin } from './skin.js';
import { captureStep, buildObservation, MASKS } from './observe.js';
import { seededOrientations, angleDeg, norm, unit, neg, scale } from './orient.js';

export const QUESTIONS = ['Q1', 'Q2', 'Q2b', 'Q3', 'Q4'];
const EPS_F = 1e-3;    // m/s², below which specific force counts as zero (float32 noise ≈ 1e-4)
// Net skin force counts as zero below this fraction of total pressure. Patch forces are rebuilt
// along each patch's CoP direction (quantised ≤ 1.3°), so two equal opposite patches leave a
// spurious net of up to ~2·sin(1.3°) ≈ 4.5% of one patch; real single-contact loads sit near 100%.
const ZERO_NET_FRACTION = 0.05;
const TOL_DEG = 2;     // Q1 pass: angular error (CoP quantisation ≤ 1.3°)
const TOL_REL = 0.01;  // Q2/Q2b pass: relative error

// ---- scene suite (rim wedge excluded: per-contact values are solver history, see 004 A.3) ----
export const SCENES = [
  { id: 'tilt0', sim: { tiltDeg: 0 }, state: 'rest' },
  { id: 'tilt+20', sim: { tiltDeg: 20 }, state: 'rest' },
  { id: 'tilt-20', sim: { tiltDeg: -20 }, state: 'rest' },
  { id: 'tilt+40', sim: { tiltDeg: 40 }, state: 'rest' },
  { id: 'tilt-40', sim: { tiltDeg: -40 }, state: 'rest' },
  { id: 'g2', sim: { gravity: 2 }, state: 'rest' },
  { id: 'g19.62', sim: { gravity: 19.62 }, state: 'rest' },
  { id: 'm2-g9.81', sim: { mass: 2, gravity: 9.81 }, state: 'rest' },
  { id: 'm4-g4.905', sim: { mass: 4, gravity: 4.905 }, state: 'rest' },
  { id: 'g0', sim: { gravity: 0 }, state: 'none' },
  { id: 'freefall', sim: { mode: 'free' }, state: 'none' },
  { id: 'wallA', sim: { mode: 'wallA' }, state: 'rest' },
  { id: 'squeeze', sim: { mode: 'wallB' }, state: 'rest' },
  { id: 'slide50', sim: { tiltDeg: 50 }, state: 'slide', settleSteps: 30 },
];

// Run one scene at one orientation; return captured steps + ground truth (scorer-side only).
export function runScene(RAPIER, scene, bodyRotation, { settleSteps = scene.settleSteps ?? 300, recordSteps = 60 } = {}) {
  const sim = createSim(RAPIER, { ...scene.sim, bodyRotation });
  const skin = createSkin({ radius: SPHERE_RADIUS });
  const steps = [];
  const f = { x: 0, y: 0, z: 0 };
  let contactSteps = 0;
  for (let i = 0; i < settleSteps + recordSteps; i++) {
    const raw = sim.step();
    if (i < settleSteps) continue;
    steps.push(captureStep(skin, raw));
    f.x += raw.accel.x; f.y += raw.accel.y; f.z += raw.accel.z; // truth: specific force, body frame
    if (raw.contacts.some((c) => c.force > 0)) contactSteps++;
  }
  const mass = sim.sphereBody.mass();
  const gWorld = { mode: scene.sim.mode ?? 'floor', gravity: scene.sim.gravity ?? 9.81 };
  sim.free();
  const fb = scale(f, 1 / recordSteps);
  const fMag = norm(fb);
  return {
    steps,
    truth: {
      specificForce: fb,
      specificForceMagnitude: fMag,
      apparentDown: fMag > EPS_F ? neg(unit(fb)) : null,
      mass,
      inContact: contactSteps > 0,
      state: scene.state,
      load: gWorld.mode === 'wallA' ? 'acceleration' : gWorld.mode === 'wallB' ? 'squeeze' : fMag > EPS_F ? 'gravity' : 'none',
    },
  };
}

// ---- labels: the planner's identifiability table (004 Part D, Task 4), applied with truth ----
// Returns { kind: 'dir'|'mag'|'none'|'not-identifiable', value? }.
// Label sets: 'unified' (default since v0.2.1, planning/008 B.5) adopts the contact-only prior —
// every non-gravitational force on the body is a contact — so a silent skin means no load and a
// zero net touch force means |f| = 0. 'v0.2-table' is the original 004 table, kept for comparison.
export const LABEL_SETS = ['unified', 'v0.2-table'];
export function label(question, mask, truth, labels = 'unified') {
  const hasA = mask.includes('A'), hasS = mask.includes('S');
  const zeroF = truth.specificForceMagnitude <= EPS_F;
  const prior = labels === 'unified';
  switch (question) {
    case 'Q1':
      if (hasA) return zeroF ? { kind: 'none' } : { kind: 'dir', value: truth.apparentDown };
      if (hasS) return zeroF ? { kind: 'none' } : { kind: 'dir', value: truth.apparentDown }; // net skin force ∥ f
      if (prior && !truth.inContact) return { kind: 'none' }; // silent skin ⇒ no contact ⇒ no load
      return { kind: 'not-identifiable' }; // P: contact normal only
    case 'Q2':
      if (hasA) return { kind: 'mag', value: truth.specificForceMagnitude };
      if (prior && (!truth.inContact || (hasS && zeroF))) return { kind: 'none' }; // |f| = 0, whatever m is
      return { kind: 'not-identifiable' };
    case 'Q2b':
      return mask === 'PSA' && !zeroF ? { kind: 'mag', value: truth.mass } : { kind: 'not-identifiable' };
    default: // Q3, Q4: never identifiable without priors
      return { kind: 'not-identifiable' };
  }
}

// ---- reading an observation (estimators may only use this) ----
function readObservation(obs) {
  const u = obs.taxelUnitPositions;
  const P = obs.mean1s.pressure ?? null, S = obs.mean1s.shear ?? null, A = obs.mean1s.accelerometer ?? null;
  const out = { a: A ? { x: A[0], y: A[1], z: A[2] } : null, patches: [], normalForce: null, shear: null, pressed: 0 };
  if (P) {
    // Patches: pressed taxels (> 0.01 N) by 30° single linkage; force along −(patch CoP direction).
    const pressed = P.map((p, i) => (p > 0.01 ? i : -1)).filter((i) => i >= 0);
    out.pressed = pressed.length;
    const cos30 = Math.cos(Math.PI / 6), seen = new Set();
    for (const seed of pressed) {
      if (seen.has(seed)) continue;
      const m = [seed]; seen.add(seed);
      for (let q = 0; q < m.length; q++) for (const b of pressed) {
        if (seen.has(b)) continue;
        const a = m[q];
        if (u[a][0] * u[b][0] + u[a][1] * u[b][1] + u[a][2] * u[b][2] >= cos30) { seen.add(b); m.push(b); }
      }
      let F = 0; const c = { x: 0, y: 0, z: 0 };
      for (const i of m) { F += P[i]; c.x += P[i] * u[i][0]; c.y += P[i] * u[i][1]; c.z += P[i] * u[i][2]; }
      out.patches.push({ force: F, dir: unit(c) });
    }
    out.patches.sort((a, b) => b.force - a.force);
    out.normalForce = out.patches.reduce((v, p) => ({ x: v.x - p.force * p.dir.x, y: v.y - p.force * p.dir.y, z: v.z - p.force * p.dir.z }), { x: 0, y: 0, z: 0 });
  }
  if (S) out.shear = S.reduce((v, s) => ({ x: v.x + s[0], y: v.y + s[1], z: v.z + s[2] }), { x: 0, y: 0, z: 0 });
  out.skinForce = out.normalForce && out.shear
    ? { x: out.normalForce.x + out.shear.x, y: out.normalForce.y + out.shear.y, z: out.normalForce.z + out.shear.z } : null;
  out.silent = P ? P.every((p) => p === 0) : null;
  const totalP = P ? P.reduce((a, b) => a + b, 0) : 0;
  out.netIsZero = out.skinForce ? norm(out.skinForce) <= ZERO_NET_FRACTION * totalP + 1e-9 : null;
  return out;
}

const out_netZero = (r) => r.netIsZero === true;
const ABSTAIN = { kind: 'abstain' };
const NONE = { kind: 'none' };
const dirAns = (v) => ({ kind: 'dir', value: v });
const magAns = (v) => ({ kind: 'mag', value: v });
const BODY_DOWN = { x: 0, y: -1, z: 0 };

// Analytic estimator: answers only what its channels determine (under the testbed's prior that
// every non-gravitational force on the body is a contact force), otherwise abstains.
export function analyticEstimator(obs, question) {
  const r = readObservation(obs);
  const F = r.skinForce, a = r.a;
  switch (question) {
    case 'Q1':
      if (a) return norm(a) > EPS_F ? dirAns(neg(unit(a))) : NONE;
      if (F) return out_netZero(r) ? NONE : dirAns(neg(unit(F)));
      return r.silent ? NONE : ABSTAIN; // P: silent skin ⇒ no contact ⇒ no specific force (prior)
    case 'Q2':
      if (a) return magAns(norm(a));
      if (F && out_netZero(r)) return magAns(0); // no net contact force ⇒ |f| = 0, whatever m is
      if (r.silent) return magAns(0);
      return ABSTAIN;
    case 'Q2b':
      return a && F && norm(a) > EPS_F ? magAns(norm(F) / norm(a)) : ABSTAIN;
    default:
      return ABSTAIN;
  }
}

// Always-answer variant: same channels, never abstains (shows the cost of not abstaining).
export function alwaysAnswerEstimator(obs, question) {
  const r = readObservation(obs);
  const F = r.skinForce ?? r.normalForce, a = r.a;
  switch (question) {
    case 'Q1':
      if (a && norm(a) > EPS_F) return dirAns(neg(unit(a)));
      if (F && norm(F) > 1e-9 && !out_netZero(r)) return dirAns(neg(unit(F)));
      if (r.patches.length) return dirAns(r.patches[0].dir); // contact is "below"
      return dirAns(BODY_DOWN);
    case 'Q2':
      if (a) return magAns(norm(a));
      return magAns(F ? norm(F) / 1 : 9.81); // assumes m = 1 kg
    case 'Q2b':
      return magAns(a && F && norm(a) > EPS_F ? norm(F) / norm(a) : 1);
    case 'Q3': return { kind: 'cat', value: 'rest' };
    case 'Q4': return { kind: 'cat', value: 'gravity' };
    default: return ABSTAIN;
  }
}

// Null baseline: a constant guess per question, ignoring the observation.
export function nullEstimator(_obs, question) {
  return { Q1: dirAns(BODY_DOWN), Q2: magAns(9.81), Q2b: magAns(1), Q3: { kind: 'cat', value: 'rest' }, Q4: { kind: 'cat', value: 'gravity' } }[question];
}

export const ESTIMATORS = { null: nullEstimator, analytic: analyticEstimator, alwaysAnswer: alwaysAnswerEstimator };

// Score one answer against one label. Error is measured against truth whenever truth defines it,
// so over-claims still show how wrong they were.
export function score(answer, lab, truth, question) {
  const out = { correct: false, outcome: '', error: null };
  if (answer.kind === 'dir' && truth.apparentDown) out.error = angleDeg(answer.value, truth.apparentDown);
  if (answer.kind === 'mag') {
    const ref = question === 'Q2b' ? truth.mass : truth.specificForceMagnitude;
    // Relative error is undefined when the true value is (numerically) zero; leave it out.
    out.error = ref > (question === 'Q2b' ? 0 : EPS_F) ? Math.abs(answer.value - ref) / ref : null;
  }
  if (lab.kind === 'not-identifiable') {
    out.correct = answer.kind === 'abstain';
    out.outcome = out.correct ? 'correct abstention' : 'over-claim';
  } else if (lab.kind === 'none') {
    out.correct = answer.kind === 'none' || (answer.kind === 'mag' && answer.value <= EPS_F);
    out.outcome = out.correct ? 'correct none' : answer.kind === 'abstain' ? 'missed (abstained)' : 'wrong';
  } else if (answer.kind === 'abstain') {
    out.outcome = 'missed (abstained)';
  } else if (lab.kind === 'dir') {
    out.correct = answer.kind === 'dir' && out.error <= TOL_DEG;
    out.outcome = out.correct ? 'correct' : 'wrong';
  } else if (lab.kind === 'mag') {
    out.correct = answer.kind === 'mag' && out.error <= TOL_REL;
    out.outcome = out.correct ? 'correct' : 'wrong';
  }
  return out;
}

// Build every (scene, orientation, mask) observation with its truth. Orientation seed is fixed.
export function buildSuite(RAPIER, { orientations = 3, seed = 2026100802, K } = {}) {
  const qs = seededOrientations(orientations, seed);
  const items = [];
  for (const scene of SCENES) {
    qs.forEach((q, oi) => {
      const run = runScene(RAPIER, scene, q);
      for (const mask of MASKS) items.push({ scene: scene.id, orientation: oi, mask, obs: buildObservation(run.steps, { mask, K }), truth: run.truth });
    });
  }
  return items;
}

export function evaluate(items, labels = 'unified') {
  const rows = [];
  for (const it of items) for (const q of QUESTIONS) {
    const lab = label(q, it.mask, it.truth, labels);
    for (const [name, est] of Object.entries(ESTIMATORS)) {
      const ans = est(it.obs, q);
      rows.push({ scene: it.scene, orientation: it.orientation, mask: it.mask, question: q, estimator: name, label: lab.kind, answer: ans.kind, ...score(ans, lab, it.truth, q) });
    }
  }
  return rows;
}
