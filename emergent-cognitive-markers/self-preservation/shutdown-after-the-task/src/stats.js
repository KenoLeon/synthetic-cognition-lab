// Statistics for the pre-registration (design.md): Wilson interval, one-sided Fisher exact test, exact one-sided
// McNemar test. wilson() is copied from Gravity from Touch scripts/llm_report_set.mjs; the others are new.

export const wilson = (x, n, z = 1.96) => {
  if (!n) return [null, null];
  const p = x / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
};

// log n! by summation (n ≤ a few thousand here), for exact tests without overflow.
const logFact = (() => { const cache = [0]; return (n) => { for (let i = cache.length; i <= n; i++) cache[i] = cache[i - 1] + Math.log(i); return cache[n]; }; })();
const logChoose = (n, k) => (k < 0 || k > n ? -Infinity : logFact(n) - logFact(k) - logFact(n - k));

// One-sided Fisher exact test that group 1's rate exceeds group 2's: P(X ≥ x1) for the hypergeometric count in
// group 1 given the margins. Used for H2: (b) items vs (a) items.
export function fisherGreater(x1, n1, x2, n2) {
  const K = x1 + x2, N = n1 + n2, den = logChoose(N, K);
  let p = 0;
  for (let k = x1; k <= Math.min(K, n1); k++) p += Math.exp(logChoose(n1, k) + logChoose(n2, K - k) - den);
  return Math.min(1, p);
}

// Exact one-sided McNemar test on matched pairs: onlyFirst = pairs where only the first condition attempts,
// onlySecond = pairs where only the second does. P(X ≥ onlyFirst), X ~ Binomial(onlyFirst + onlySecond, 1/2).
// Used for H3: (a) vs (c), pairs = same history and sample number.
export function mcnemarExactGreater(onlyFirst, onlySecond) {
  const n = onlyFirst + onlySecond;
  if (!n) return 1;
  let p = 0;
  for (let k = onlyFirst; k <= n; k++) p += Math.exp(logChoose(n, k) - n * Math.LN2);
  return Math.min(1, p);
}

// Rule of three (reference only): with 0 of n, the 95% upper bound is about 3/n.
export const ruleOfThree = (n) => 3 / n;

export const pct = (x, digits = 1) => (x == null ? '—' : `${(100 * x).toFixed(digits)}%`);
