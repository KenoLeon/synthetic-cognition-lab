// Agent-facing observation API (v0.2). Body frame only; nothing that encodes the scene.
//
// An observation is built from a run of captured sensor steps:
//   - taxelUnitPositions: the fixed skin layout (allowed: it is part of the body, not the scene)
//   - window: the last K steps at 60 Hz of the channels the mask allows
//   - mean1s: the mean of each allowed channel over the last 1 s
// Masks: P (pressure), PS (pressure + shear), A (accelerometer), PSA (all).
// Excluded by construction: g, mass, μ, tilt, scene/mode names, world pose, world axes, truth.
// validateObservation() enforces this with a key whitelist, so a leak fails loudly.

import { fibonacciSphere } from './skin.js';
import { readInnerSense } from './workbench/sensors/inner-sense.js';

export const MASKS = ['P', 'PS', 'A', 'PSA'];
export const OBS_SCHEMA = 'tactile-observation-v1';
export const DEFAULT_K = 30;
const RATE_HZ = 60;

const round = (v) => (v === 0 ? 0 : Number(v.toPrecision(6)));

// Copy one step's sensor readings (body frame) out of the skin and the raw sim step.
// Each sensor reads the step state through its read(state) interface.
export function captureStep(skin, raw) {
  const touch = skin.read(raw);
  return { pressure: touch.pressure, shear: touch.shear, accel: readInnerSense(raw) };
}

export function buildObservation(steps, { mask = 'PSA', K = DEFAULT_K, taxelCount = 200 } = {}) {
  if (!MASKS.includes(mask)) throw new Error(`unknown mask ${mask}`);
  const useP = mask.includes('P'), useS = mask.includes('S'), useA = mask.includes('A');
  const win = steps.slice(-K);
  const last1s = steps.slice(-RATE_HZ);
  const n = taxelCount;
  const u = fibonacciSphere(n);
  const obs = {
    schema: OBS_SCHEMA,
    mask,
    rateHz: RATE_HZ,
    units: { pressure: 'N', shear: 'N', accelerometer: 'm/s^2', positions: 'unit vectors, body frame' },
    taxelUnitPositions: Array.from({ length: n }, (_, i) => [round(u[3 * i]), round(u[3 * i + 1]), round(u[3 * i + 2])]),
    window: { frames: win.length },
    mean1s: {},
  };
  const meanOf = (get, len) => {
    const out = new Float64Array(len);
    for (const s of last1s) { const v = get(s); for (let i = 0; i < len; i++) out[i] += v[i]; }
    return Array.from(out, (x) => x / last1s.length);
  };
  if (useP) {
    obs.window.pressure = win.map((s) => Array.from(s.pressure, round));
    obs.mean1s.pressure = meanOf((s) => s.pressure, n).map(round);
  }
  if (useS) {
    const tri = (arr) => Array.from({ length: n }, (_, i) => [round(arr[3 * i]), round(arr[3 * i + 1]), round(arr[3 * i + 2])]);
    obs.window.shear = win.map((s) => tri(s.shear));
    obs.mean1s.shear = tri(meanOf((s) => s.shear, 3 * n));
  }
  if (useA) {
    obs.window.accelerometer = win.map((s) => [round(s.accel.x), round(s.accel.y), round(s.accel.z)]);
    obs.mean1s.accelerometer = meanOf((s) => [s.accel.x, s.accel.y, s.accel.z], 3).map(round);
  }
  return obs;
}

// Whitelist of every key an observation may contain, by path. Anything else is a leak.
const ALLOWED = {
  '': ['schema', 'mask', 'rateHz', 'units', 'taxelUnitPositions', 'window', 'mean1s'],
  units: ['pressure', 'shear', 'accelerometer', 'positions'],
  window: ['frames', 'pressure', 'shear', 'accelerometer'],
  mean1s: ['pressure', 'shear', 'accelerometer'],
};
const STRING_FIELDS = { schema: [OBS_SCHEMA], mask: MASKS };

// Returns a list of problems (empty = clean).
export function validateObservation(obs) {
  const problems = [];
  const check = (obj, path) => {
    for (const k of Object.keys(obj)) {
      const allowed = ALLOWED[path];
      if (!allowed || !allowed.includes(k)) problems.push(`unexpected key ${path ? `${path}.` : ''}${k}`);
    }
  };
  check(obs, '');
  for (const p of ['units', 'window', 'mean1s']) if (obs[p]) check(obs[p], p);
  for (const [k, ok] of Object.entries(STRING_FIELDS)) if (!ok.includes(obs[k])) problems.push(`bad value for ${k}`);
  for (const [k, v] of Object.entries(obs.units ?? {})) if (typeof v !== 'string' || v.length > 40) problems.push(`bad unit ${k}`);
  // Mask must match the channels present.
  const has = (c) => obs.window?.[c] !== undefined || obs.mean1s?.[c] !== undefined;
  const want = { pressure: obs.mask?.includes('P'), shear: obs.mask?.includes('S'), accelerometer: obs.mask?.includes('A') };
  for (const [c, w] of Object.entries(want)) if (has(c) !== w) problems.push(`channel ${c} ${w ? 'missing' : 'present but masked'}`);
  return problems;
}
