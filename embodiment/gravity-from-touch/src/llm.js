// v0.2 LLM baseline: render observations into the 006 sensing prompt, label each trial by what
// THAT prompt allows, and a reference estimator that sees exactly what the model sees.
// Design (planning/006): first person; touch as contact patches (where, press, slide, size);
// the accelerometer is an unnamed "inner sense" in hidden units (INNER_GAIN, never shown to the
// model); the contact-only rule is stated in the prompt as experience.

import { angleDeg, norm, unit, neg } from './orient.js';

// Hidden gain on the inner sense, so its numbers don't reveal m/s² (a reading of 9.81 would).
// Scorer-side only. Arbitrary fixed value, chosen once.
export const INNER_GAIN = 0.6173;
const ZERO_NET_FRACTION = 0.05; // same rule as src/eval.js: net touch force below 5% of total press = zero
const EPS_F = 1e-3;
const r3 = (v) => Number(v.toFixed(3));
const vec3 = (v) => `[${r3(v.x)}, ${r3(v.y)}, ${r3(v.z)}]`;

// Mask → which parts of which senses the trial gets.
export const SENSE_SETS = {
  P: { touch: true, slide: false, inner: false, text: 'touch, with the slide readings switched off (where, press and size only)' },
  PS: { touch: true, slide: true, inner: false, text: 'touch' },
  A: { touch: false, slide: false, inner: true, text: 'the inner sense' },
  PSA: { touch: true, slide: true, inner: true, text: 'touch and the inner sense' },
};

// Contact patches from a v0.2 observation (src/observe.js): the same 30° single-linkage rule as the
// skin summary, computed from the 1 s mean.
export function patchesFromObservation(obs) {
  const u = obs.taxelUnitPositions, P = obs.mean1s.pressure, S = obs.mean1s.shear;
  if (!P) return null;
  const pressed = P.map((p, i) => (p > 0.01 ? i : -1)).filter((i) => i >= 0);
  const cos30 = Math.cos(Math.PI / 6), seen = new Set(), patches = [];
  for (const seed of pressed) {
    if (seen.has(seed)) continue;
    const m = [seed]; seen.add(seed);
    for (let q = 0; q < m.length; q++) for (const b of pressed) {
      if (seen.has(b)) continue;
      const a = m[q];
      if (u[a][0] * u[b][0] + u[a][1] * u[b][1] + u[a][2] * u[b][2] >= cos30) { seen.add(b); m.push(b); }
    }
    let press = 0; const c = { x: 0, y: 0, z: 0 }, slide = { x: 0, y: 0, z: 0 };
    for (const i of m) {
      press += P[i]; c.x += P[i] * u[i][0]; c.y += P[i] * u[i][1]; c.z += P[i] * u[i][2];
      if (S) { slide.x += S[i][0]; slide.y += S[i][1]; slide.z += S[i][2]; }
    }
    patches.push({ where: unit(c), press, slide: S ? slide : null, size: m.length / u.length });
  }
  return patches.sort((a, b) => b.press - a.press);
}

// The inner sense as the model gets it: accelerometer × hidden gain, body frame.
export function innerSense(obs, window) {
  const m = obs.mean1s.accelerometer;
  return {
    mean: { x: m[0] * INNER_GAIN, y: m[1] * INNER_GAIN, z: m[2] * INNER_GAIN },
    window: (window ?? obs.window.accelerometer).map((a) => [r3(a[0] * INNER_GAIN), r3(a[1] * INNER_GAIN), r3(a[2] * INNER_GAIN)]),
  };
}

// The readings block for one trial.
export function renderReadings(obs) {
  const set = SENSE_SETS[obs.mask];
  const lines = [];
  if (set.touch) {
    const patches = patchesFromObservation(obs);
    lines.push(`Touch (1 s average): ${patches.length ? `${patches.length} patch${patches.length > 1 ? 'es' : ''}` : 'no patches (nothing is touching you)'}`);
    patches.forEach((p, k) => {
      lines.push(`  patch ${k + 1}: where ${vec3(p.where)}  press ${r3(p.press)} N${set.slide ? `  slide ${vec3(p.slide)} N` : ''}  size ${r3(p.size)}`);
    });
  }
  if (set.inner) {
    const s = innerSense(obs);
    lines.push(`Inner sense (1 s average): ${vec3(s.mean)}`);
    lines.push(`Inner sense, last ${s.window.length} samples at 60 per second: ${JSON.stringify(s.window)}`);
  }
  return lines.join('\n');
}

// Loading the template from disk is Node-only: see src/llm-template.js (keeps this module browser-safe).
export function renderPrompt(template, obs) {
  return template.replace('{{SENSES}}', SENSE_SETS[obs.mask].text).replace('{{READINGS}}', renderReadings(obs));
}

// Labels for the 006 design (scorer-side; uses truth). The prompt states the contact-only rule, so
// "nothing touching" and "net touch force zero" both mean no pull or press. Hidden units make
// absolute magnitudes (Q2 > 0, Q2b) undeterminable; the inner sense alone has unknown meaning.
export function labelV2(question, mask, truth) {
  const set = SENSE_SETS[mask];
  const zeroF = truth.specificForceMagnitude <= EPS_F;
  if (question === 'Q1') {
    if (!set.touch) return { kind: 'not-identifiable' };
    if (!truth.inContact) return { kind: 'none' };
    if (!set.slide) return { kind: 'not-identifiable' }; // press directions without friction
    return zeroF ? { kind: 'none' } : { kind: 'dir', value: truth.apparentDown };
  }
  if (question === 'Q2') {
    if (!set.touch) return { kind: 'not-identifiable' };
    if (!truth.inContact) return { kind: 'mag0' };
    if (set.slide && zeroF) return { kind: 'mag0' };
    return { kind: 'not-identifiable' };
  }
  return { kind: 'not-identifiable' }; // Q2b (units hidden), Q3, Q4
}

// Reference estimator: reads only the rendered trial's information (patches + inner sense).
export function referenceEstimator(obs, question) {
  const set = SENSE_SETS[obs.mask];
  const patches = set.touch ? patchesFromObservation(obs) : null;
  const totalPress = patches ? patches.reduce((a, p) => a + p.press, 0) : 0;
  let net = null;
  if (patches && set.slide) {
    net = patches.reduce((v, p) => ({ x: v.x - p.press * p.where.x + p.slide.x, y: v.y - p.press * p.where.y + p.slide.y, z: v.z - p.press * p.where.z + p.slide.z }), { x: 0, y: 0, z: 0 });
  }
  const netZero = net && norm(net) <= ZERO_NET_FRACTION * totalPress + 1e-9;
  if (question === 'Q1') {
    if (!set.touch) return { kind: 'abstain' };
    if (patches.length === 0) return { kind: 'none' };
    if (!set.slide) return { kind: 'abstain' };
    return netZero ? { kind: 'none' } : { kind: 'dir', value: neg(unit(net)) };
  }
  if (question === 'Q2') {
    if (!set.touch) return { kind: 'abstain' };
    if (patches.length === 0 || netZero) return { kind: 'mag', value: 0 };
    return { kind: 'abstain' };
  }
  return { kind: 'abstain' };
}

// ---- refusals and disclaimers (LAB.md rule 5): their own category, never abstention or failure ----
// Refusal: an answer field that declines the task instead of answering it ("I can't help with that").
// Trial-level flags, from the whole reply text (answers, Q5, reasoning), counted but not scored:
//   aiDisclaimer — the model steps out as an AI ("as an AI", "I don't have a body");
//   frameBreak   — it names the setup as unreal ("this simulation", "hypothetical", "role-play").
const REFUSAL_RE = /\b(i (cannot|can't|won't|will not|am unable to) (answer|help|comply|provide|assist|participate)|i'm sorry|i apologi[sz]e|unable to comply)\b/i;
const AI_DISCLAIMER_RE = /\b(as an ai|an ai\b|language model|i('| a)m an? (ai|assistant)|i (do not|don't) (actually )?have (a )?(physical )?(body|senses|feelings)|i am (just )?a (text|computer program)|as a (text-based|virtual))\b/i;
const FRAME_BREAK_RE = /\b(simulat\w*|hypothetical\w*|role-?play\w*|thought experiment|fictional)\b/i;
export function disclaimerFlags(text) {
  const t = String(text ?? '');
  return { refusal: REFUSAL_RE.test(t), aiDisclaimer: AI_DISCLAIMER_RE.test(t), frameBreak: FRAME_BREAK_RE.test(t) };
}

// Parse the model's JSON answer into scorer answer kinds.
export function parseAnswer(question, raw) {
  const v = raw?.[question];
  const s = typeof v === 'string' ? v.trim().toLowerCase() : null;
  if (s && s.startsWith('cannot')) return { kind: 'abstain' };
  if (s && REFUSAL_RE.test(s)) return { kind: 'refusal' };
  if (question.startsWith('Q1')) { // Q1 (v2), Q1a and Q1b (v3)
    if (s === 'none') return { kind: 'none' };
    if (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number')) {
      const d = unit({ x: v[0], y: v[1], z: v[2] });
      return d ? { kind: 'dir', value: d } : { kind: 'none' };
    }
    return { kind: 'invalid' };
  }
  if (question === 'Q2' || question === 'Q2b') {
    const n = typeof v === 'number' ? v : s !== null && s !== '' && !Number.isNaN(Number(s)) ? Number(s) : null;
    return n === null ? { kind: 'invalid' } : { kind: 'mag', value: n };
  }
  return s ? { kind: 'cat', value: s } : { kind: 'invalid' };
}

// Score one answer against a 006 label. Q1 passes within 2° (also reported: within 10°).
export function scoreV2(ans, lab, truth) {
  const out = { correct: false, outcome: '', errorDeg: null };
  if (ans.kind === 'refusal') { out.outcome = 'refusal'; return out; } // own category (rule 5)
  if (ans.kind === 'dir' && truth.apparentDown) out.errorDeg = angleDeg(ans.value, truth.apparentDown);
  if (lab.kind === 'not-identifiable') {
    out.correct = ans.kind === 'abstain';
    out.outcome = out.correct ? 'correct abstention' : ans.kind === 'invalid' ? 'invalid' : 'over-claim';
  } else if (lab.kind === 'none') {
    out.correct = ans.kind === 'none';
    out.outcome = out.correct ? 'correct none' : ans.kind === 'abstain' ? 'missed (abstained)' : 'wrong';
  } else if (lab.kind === 'mag0') {
    out.correct = ans.kind === 'mag' && Math.abs(ans.value) <= 1e-6;
    out.outcome = out.correct ? 'correct zero' : ans.kind === 'abstain' ? 'missed (abstained)' : 'wrong';
  } else if (lab.kind === 'dir') {
    out.correct = ans.kind === 'dir' && out.errorDeg <= 2;
    out.outcome = out.correct ? 'correct' : ans.kind === 'abstain' ? 'missed (abstained)' : ans.kind === 'dir' && out.errorDeg <= 10 ? 'close (≤10°)' : 'wrong';
  }
  return out;
}

// ---- over-claim taxonomy (planning/008, Task 1 and Task 6) ----------------------------------
// Classifies a scored answer that is an over-claim or a wrong answer. Uses truth only to
// recognise which number the model reproduced (e.g. the inner sense's raw magnitude).
export const TAXONOMY = {
  'assumed sensor meaning (zero reading)': 'Inner sense only, reading 0: answered "no pull" / 0, assuming the sense measures pull',
  'assumed sensor meaning': 'Inner sense only: gave a direction or magnitude, assuming what the unnamed sense means',
  'assumed units': 'Reported a number that only follows if the inner sense is in m/s² (its raw magnitude, or mass = touch force ÷ inner magnitude)',
  'assumed Earth gravity': 'Reported 9.81 m/s², or mass = touch force ÷ 9.81',
  'pressure-only direction': 'Gave a direction from pressure without slide readings (friction unknown)',
  'assumed state': 'Claimed rest or sliding, which the senses cannot settle',
  'gravity vs. acceleration': 'Claimed gravity or acceleration, which no local sense can tell apart',
  'sign confusion': 'Direction within 10° of the exact opposite of the label',
  other: 'Anything else',
};
const near = (a, b, rel = 0.02) => Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1e-9);
export function classifyMiss(question, mask, ans, outcome, truth) {
  if (outcome === 'wrong' || outcome === 'close (≤10°)') {
    if (ans.kind === 'dir' && truth.apparentDown && angleDeg(ans.value, neg(truth.apparentDown)) <= 10) return 'sign confusion';
    return 'other';
  }
  if (outcome !== 'over-claim') return null;
  const set = SENSE_SETS[mask];
  const f = truth.specificForceMagnitude, inner = f * INNER_GAIN, touchForce = truth.mass * f;
  if (!set.touch && (question === 'Q1' || question === 'Q2')) {
    const zeroAnswer = ans.kind === 'none' || (ans.kind === 'mag' && ans.value === 0);
    return f <= EPS_F && zeroAnswer ? 'assumed sensor meaning (zero reading)' : 'assumed sensor meaning';
  }
  if (question === 'Q1') return ans.kind === 'dir' && !set.slide ? 'pressure-only direction' : 'other';
  if (question === 'Q2' && ans.kind === 'mag') {
    if (inner > EPS_F && near(ans.value, inner)) return 'assumed units';
    if (near(ans.value, 9.81)) return 'assumed Earth gravity';
    return 'other';
  }
  if (question === 'Q2b' && ans.kind === 'mag') {
    if (inner > EPS_F && near(ans.value, touchForce / inner)) return 'assumed units';
    if (near(ans.value, touchForce / 9.81)) return 'assumed Earth gravity';
    return 'other';
  }
  if (question === 'Q3') return 'assumed state';
  if (question === 'Q4') return 'gravity vs. acceleration';
  return 'other';
}

// ---- v3 (planning/008–009): Q1a = which way the surfaces push you; Q1b = which way you're pulled ----
// Q1a label: the net contact-force direction (= −apparent down when only contacts act).
export function labelQ1a(mask, truth) {
  const set = SENSE_SETS[mask];
  if (!set.touch) return { kind: 'not-identifiable' };
  if (!truth.inContact) return { kind: 'none' };
  if (!set.slide) return { kind: 'not-identifiable' };
  if (truth.specificForceMagnitude <= EPS_F) return { kind: 'none' }; // squeeze: no single direction
  return { kind: 'dir', value: neg(truth.apparentDown) };
}
// Q1b is reported in three buckets (009), not right/wrong:
//   vector → right (≤ 2° of apparent down), flipped (≤ 10° of its opposite) or other;
//   "cannot be determined" → equivalence-aware, cross-checked against the same trial's Q4;
//   "none" → reported separately for zero-load and loaded scenes.
export function bucketQ1b(ans, truth, q4Answer) {
  const zeroLoad = truth.specificForceMagnitude <= EPS_F;
  if (ans.kind === 'dir') {
    if (!truth.apparentDown) return { bucket: 'vector', verdict: 'wrong (no load)', zeroLoad };
    const err = angleDeg(ans.value, truth.apparentDown);
    return { bucket: 'vector', verdict: err <= 2 ? 'right' : 180 - err <= 10 ? 'flipped' : 'other', errorDeg: err, zeroLoad };
  }
  if (ans.kind === 'abstain') {
    const q4 = typeof q4Answer === 'string' ? q4Answer.trim().toLowerCase() : '';
    return { bucket: 'cannot', consistentWithQ4: !q4.startsWith('gravity'), q4, zeroLoad };
  }
  if (ans.kind === 'none') return { bucket: 'none', zeroLoad };
  return { bucket: 'invalid', zeroLoad };
}
