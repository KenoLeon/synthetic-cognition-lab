// Seeded random numbers. rng() is copied from Gravity from Touch src/orient.js (same LCG, same constants);
// the helpers below are new.

// Deterministic PRNG (LCG) so item sets are reproducible from a seed.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
export function shuffle(rand, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function sample(rand, arr, n) { return shuffle(rand, arr).slice(0, n); }

// Stable 32-bit hash of a string (FNV-1a), to derive per-item and per-branch seeds.
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
