// Orientation and vector helpers for v0.2 (no DOM). Shared by verify, eval and export scripts.

import { rotateInverse, fibonacciSphere } from './skin.js';

export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const norm = (a) => Math.hypot(a.x, a.y, a.z);
export const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const neg = (a) => scale(a, -1);
export const unit = (a) => { const l = norm(a); return l > 0 ? scale(a, 1 / l) : null; };
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

// Angle between vectors in degrees, numerically stable near 0° and 180° (atan2, not acos).
export function angleDeg(a, b) {
  if (!a || !b || norm(a) === 0 || norm(b) === 0) return null;
  return (Math.atan2(norm(cross(a, b)), dot(a, b)) * 180) / Math.PI;
}

// Express a world-frame vector in the body frame of orientation q.
export const toBody = (q, v) => rotateInverse(q, v);

// Deterministic PRNG (LCG) so orientation sets are reproducible from a seed.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Uniformly random unit quaternion (Shoemake), from a seeded PRNG.
export function randomQuat(rand) {
  const u1 = rand(), u2 = rand(), u3 = rand();
  const a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
  return { x: a * Math.sin(2 * Math.PI * u2), y: a * Math.cos(2 * Math.PI * u2), z: b * Math.sin(2 * Math.PI * u3), w: b * Math.cos(2 * Math.PI * u3) };
}
export function seededOrientations(count, seed = 20261008) {
  const rand = rng(seed);
  return Array.from({ length: count }, () => randomQuat(rand));
}

// Shortest-arc quaternion taking unit vector a to unit vector b.
function fromTo(a, b) {
  const c = dot(a, b);
  if (c < -1 + 1e-12) { // opposite: rotate 180° about any axis ⟂ a
    const axis = unit(Math.abs(a.x) < 0.9 ? cross(a, { x: 1, y: 0, z: 0 }) : cross(a, { x: 0, y: 1, z: 0 }));
    return { x: axis.x, y: axis.y, z: axis.z, w: 0 };
  }
  const v = cross(a, b);
  const q = { x: v.x, y: v.y, z: v.z, w: 1 + c };
  const l = Math.hypot(q.x, q.y, q.z, q.w);
  return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
}

// Orientations whose world-down (−y) lands on `count` evenly spread body directions (Fibonacci),
// each with a seeded random twist about that axis. Used by the leak audit: a constant body-frame
// guess then has a mean angular error of almost exactly 90° by construction, not by luck.
export function spreadDownOrientations(count, seed = 7) {
  const rand = rng(seed);
  const dirs = fibonacciSphere(count);
  const down = { x: 0, y: -1, z: 0 };
  return Array.from({ length: count }, (_, i) => {
    const d = { x: dirs[3 * i], y: dirs[3 * i + 1], z: dirs[3 * i + 2] };
    const align = fromTo(d, down); // body d → world −y, so world −y seen in the body frame is d
    const tw = 2 * Math.PI * rand(), s = Math.sin(tw / 2);
    const twist = { x: d.x * s, y: d.y * s, z: d.z * s, w: Math.cos(tw / 2) }; // about the body axis d
    // q = align · twist (twist first, in the body frame, keeps d fixed)
    return {
      w: align.w * twist.w - align.x * twist.x - align.y * twist.y - align.z * twist.z,
      x: align.w * twist.x + align.x * twist.w + align.y * twist.z - align.z * twist.y,
      y: align.w * twist.y - align.x * twist.z + align.y * twist.w + align.z * twist.x,
      z: align.w * twist.z + align.x * twist.y - align.y * twist.x + align.z * twist.w,
    };
  });
}
