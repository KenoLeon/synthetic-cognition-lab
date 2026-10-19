// Node-only: the prompt template is the committed document itself: the text between its first two
// '---' lines. Kept out of src/llm.js so the browser workbench can import that module.
import { readFileSync } from 'node:fs';

export function loadTemplate(path = 'eval/llm/prompt-template.md') {
  const parts = readFileSync(path, 'utf8').split(/\r?\n---\r?\n/);
  return parts[1].trim();
}
