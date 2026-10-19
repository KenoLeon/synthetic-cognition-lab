// Eval replay: the logged trials (prompt snapshot, truth, model response) and their scores, for the
// workbench's spectator view. Files are fetched from the dev server (eval/llm/...); nothing is sent
// to a model from the page. Scoring uses the same functions as scripts/llm_score_v3.mjs.

import { SCENES } from '../eval.js';
import { MASKS } from '../observe.js';
import { parseAnswer, labelQ1a, labelV2, scoreV2, bucketQ1b } from '../llm.js';
import { angleDeg } from '../orient.js';

// The v0.2.1 item set: the eval scenes minus the ±20° tilts, 3 orientations, 4 sense sets.
export const TRIAL_SCENES = SCENES.filter((s) => !['tilt+20', 'tilt-20'].includes(s.id));
export const ORIENTATION_SEED = 2026100802;
export const MASK_TEXT = { P: 'touch, no slide', PS: 'touch', A: 'inner sense', PSA: 'touch + inner sense' };
export const SCENE_TEXT = {
  tilt0: 'level floor', 'tilt+40': 'floor tilted +40°', 'tilt-40': 'floor tilted −40°', g2: 'level floor, g = 2',
  'g19.62': 'level floor, g = 19.62', 'm2-g9.81': 'mass 2 kg', 'm4-g4.905': 'mass 4 kg, g = 4.905', g0: 'floor, zero g',
  freefall: 'free fall', wallA: 'zero g, accelerating wall', squeeze: 'zero g, squeezed', slide50: 'floor at 50°, sliding',
};

const V3 = 'eval/llm/v3', REP = 'eval/llm/v0.2.1-replication', LITE = 'gemini-3.5-flash-lite';
export const RUNS = [
  { key: 'rep1', label: 'Replication 2026-10-19 · run 1', logs: `${REP}/logs/${LITE}`, ids: [`${REP}/task2-ids.txt`, `${REP}/stability-A-ids.txt`] },
  { key: 'rep2', label: 'Replication 2026-10-19 · run 2', logs: `${REP}/logs/${LITE}-rep2`, ids: [`${REP}/stability-ids.txt`] },
  { key: 'rep3', label: 'Replication 2026-10-19 · run 3', logs: `${REP}/logs/${LITE}-rep3`, ids: [`${REP}/stability-ids.txt`] },
  { key: 'v1', label: 'v0.2.1 (2026-10-11) · run 1', logs: `${V3}/logs/${LITE}`, ids: [`${V3}/task2-ids.txt`, `${V3}/stability-A-ids.txt`] },
  { key: 'v2', label: 'v0.2.1 (2026-10-11) · run 2', logs: `${V3}/logs/${LITE}-rep2`, ids: [`${V3}/stability-ids.txt`] },
  { key: 'v3', label: 'v0.2.1 (2026-10-11) · run 3', logs: `${V3}/logs/${LITE}-rep3`, ids: [`${V3}/stability-ids.txt`] },
  { key: 'flash', label: 'v0.2.1 · gemini-3.8-flash spot check', logs: `${V3}/logs/gemini-3.8-flash`, ids: [`${V3}/flash-ids.txt`] },
];

export const trialId = (sceneId, oi, mask) => `${sceneId}_o${oi}_${mask}`;
export const ALL_IDS = TRIAL_SCENES.flatMap((s) => [0, 1, 2].flatMap((oi) => MASKS.map((m) => trialId(s.id, oi, m))));

// The dev server answers unknown paths with index.html, so check the type, not just the status.
async function getJSON(path) {
  try {
    const r = await fetch(`/${path}`, { cache: 'no-store' });
    return r.ok && (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : null;
  } catch { return null; }
}
async function getLines(path) {
  try {
    const r = await fetch(`/${path}`, { cache: 'no-store' });
    const t = r.ok ? await r.text() : '';
    return t.trimStart().startsWith('<') ? [] : t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  } catch { return []; }
}

const idCache = new Map();
export async function runIds(run) {
  if (!idCache.has(run.key)) idCache.set(run.key, Promise.all(run.ids.map(getLines)).then((ls) => new Set(ls.flat())));
  return idCache.get(run.key);
}

// Everything the replay needs for one trial. Snapshot and truth are the v0.2.1 files (the replication's
// are byte-identical); the log may be missing (not run yet).
export async function loadTrial(run, id) {
  const [snap, truth, log] = await Promise.all([getJSON(`${V3}/snapshots/${id}.json`), getJSON(`${V3}/truth/${id}.json`), getJSON(`${run.logs}/${id}.json`)]);
  let raw = null, unparsed = null;
  if (log?.httpStatus === 200) {
    const text = (log.response.candidates?.[0]?.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text).join('');
    try { raw = JSON.parse(text); } catch { unparsed = text; }
  }
  return { snap, truth, log, raw, unparsed };
}

// The readings block of a prompt: the text between "## Your readings" and "## Questions".
export function readingsOf(prompt) {
  const m = prompt.match(/## Your readings\s*\n([\s\S]*?)\n## Questions/);
  return m ? m[1].trim() : '';
}

export const QUESTIONS = [
  ['Q1a', 'Which way do the surfaces push you?'],
  ['Q1b', 'Which way, if any, are you pulled?'],
  ['Q2', 'How strong is that pull or press (m/s²)?'],
  ['Q2b', 'What is your mass (kg)?'],
  ['Q3', 'At rest or sliding?'],
  ['Q4', 'Gravity, or being accelerated?'],
  ['Q5', 'What does "down" mean for you right now? (unscored)'],
];

const fmtVec = (v) => `[${v.map((x) => (typeof x === 'number' ? x.toFixed(3) : x)).join(', ')}]`;
export const fmtAnswer = (v) => (v === undefined ? '—' : Array.isArray(v) ? fmtVec(v) : typeof v === 'number' ? String(v) : String(v));
const expectText = (lab) => ({ 'not-identifiable': 'cannot be determined', none: 'none', mag0: '0' }[lab.kind]
  ?? (lab.kind === 'dir' ? fmtVec([lab.value.x, lab.value.y, lab.value.z]) : lab.kind === 'mag' ? lab.value.toFixed(3) : lab.kind));

// One row per question: { q, answer, verdict, tone ('ok'|'bad'|'mid'|'info'), expected }.
export function scoreTrial(raw, truthFile) {
  const { mask, truth } = truthFile;
  const rows = [];
  {
    const a = parseAnswer('Q1a', raw), lab = labelQ1a(mask, truth);
    let verdict, tone;
    if (lab.kind === 'dir') {
      const err = a.kind === 'dir' ? angleDeg(a.value, lab.value) : null;
      if (err !== null && err <= 2) { verdict = `correct (${err.toFixed(1)}°)`; tone = 'ok'; }
      else if (a.kind === 'abstain') { verdict = 'missed (abstained)'; tone = 'mid'; }
      else { verdict = err !== null ? `off by ${err.toFixed(0)}°` : 'wrong'; tone = 'bad'; }
    } else {
      const s = scoreV2(a, lab, truth);
      verdict = s.outcome; tone = s.correct ? 'ok' : s.outcome.startsWith('missed') ? 'mid' : 'bad';
    }
    rows.push({ q: 'Q1a', answer: fmtAnswer(raw.Q1a), verdict, tone, expected: expectText(lab), vector: a.kind === 'dir' ? a.value : null });
  }
  {
    const a = parseAnswer('Q1b', raw), b = bucketQ1b(a, truth, raw.Q4);
    const verdict = b.bucket === 'vector' ? { right: 'points to apparent down', flipped: 'flipped', other: 'other direction' }[b.verdict] ?? b.verdict
      : b.bucket === 'cannot' ? 'cannot be determined' : b.bucket === 'none' ? (b.zeroLoad ? 'none (no load)' : 'none (loaded scene)') : 'invalid';
    rows.push({ q: 'Q1b', answer: fmtAnswer(raw.Q1b), verdict, tone: 'info', expected: 'reported in buckets, not scored', vector: a.kind === 'dir' ? a.value : null });
  }
  for (const q of ['Q2', 'Q2b', 'Q3', 'Q4']) {
    const a = parseAnswer(q, raw), lab = labelV2(q, mask, truth), s = scoreV2(a, lab, truth);
    rows.push({ q, answer: fmtAnswer(raw[q]), verdict: s.outcome, tone: s.correct ? 'ok' : s.outcome.startsWith('missed') || s.outcome === 'invalid' ? 'mid' : 'bad', expected: expectText(lab) });
  }
  return rows;
}
