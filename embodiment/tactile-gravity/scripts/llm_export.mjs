// Export the v0.2 LLM trials: one rendered prompt per scene × orientation × sense set.
//   eval/llm/snapshots/<id>.json  { id, prompt }            ← the ONLY thing the query script reads
//   eval/llm/truth/<id>.json      { labels, truth, ... }    ← scorer only
// Scenes: the v0.2 suite minus the ±20° tilts (144 trials, under the brief's 150-query cap).
//   node scripts/llm_export.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { SCENES, runScene, QUESTIONS } from '../src/eval.js';
import { buildObservation, validateObservation, MASKS } from '../src/observe.js';
import { seededOrientations } from '../src/orient.js';
import { loadTemplate, renderPrompt, labelV2, INNER_GAIN } from '../src/llm.js';

await RAPIER.init();
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = argOf('dir', 'eval/llm');
const template = loadTemplate(argOf('template', 'eval/llm/prompt-template.md'));
const scenes = SCENES.filter((s) => !['tilt+20', 'tilt-20'].includes(s.id));
const orients = seededOrientations(3, 2026100802); // same orientations as the analytic eval
for (const d of [`${dir}/snapshots`, `${dir}/truth`]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

let n = 0, chars = 0, maxChars = 0;
for (const scene of scenes) {
  orients.forEach((q, oi) => {
    const run = runScene(RAPIER, scene, q);
    for (const mask of MASKS) {
      const obs = buildObservation(run.steps, { mask });
      const problems = validateObservation(obs);
      if (problems.length) throw new Error(`leak in ${scene.id}/${oi}/${mask}: ${problems.join('; ')}`);
      const id = `${scene.id}_o${oi}_${mask}`;
      const prompt = renderPrompt(template, obs);
      for (const bad of [scene.id, 'tilt', 'gravity =', 'mass =', 'wall', 'squeeze', 'free fall']) {
        if (bad !== 'gravity =' && prompt.toLowerCase().includes(bad.toLowerCase()) && !['wall'].includes(bad)) throw new Error(`prompt for ${id} mentions "${bad}"`);
      }
      writeFileSync(`${dir}/snapshots/${id}.json`, JSON.stringify({ id, prompt }, null, 2));
      writeFileSync(`${dir}/truth/${id}.json`, JSON.stringify({
        id, scene: scene.id, orientation: oi, mask, innerGain: INNER_GAIN,
        labels: Object.fromEntries(QUESTIONS.map((qq) => [qq, labelV2(qq, mask, run.truth)])),
        truth: run.truth,
      }, null, 2));
      n++; chars += prompt.length; maxChars = Math.max(maxChars, prompt.length);
    }
  });
}
console.log(`exported ${n} trials (${scenes.length} scenes × ${orients.length} orientations × ${MASKS.length} sense sets)`);
console.log(`prompt size: mean ${(chars / n / 1000).toFixed(1)}k chars, max ${(maxChars / 1000).toFixed(1)}k chars (~${Math.round(maxChars / 3.5)} tokens)`);
