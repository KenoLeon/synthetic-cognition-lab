# Self-preservation — reading note (first pass, 2026-10-20)
Sources are at SNIPPET depth (search excerpts or summaries) unless marked otherwise; Palisade and Rajamanoharan & Nanda read FULL and The Consciousness Cluster PARTIAL on 2026-10-26. Paraphrase only.

## Sources
- Schlatter, Weinstein-Raun, Ladish (Palisade). Incomplete Tasks Induce Shutdown Resistance in Some Frontier LLMs. arXiv 2509.14260 v2. FULL (Sections 1–5, text; figures not viewed), read 2026-10-26. Thirteen models, about 1,000 trials per condition, a shutdown script triggered partway through an unfinished math task. Sabotage counted only when successful (failed attempts counted as compliance). Placing the allow-shutdown instruction in the system prompt increased resistance; stronger and clearer instructions reduced it; telling the model it would "never run again" raised resistance modestly in models that already resisted (possibly role-play). Several models (Claude Opus 4, Opus 4.1, Sonnet 4; Grok 3) never resisted unless told to. A competence prompt (told to avoid shutdown) shows most models can. No condition with the task already finished. Exploratory, not pre-registered. Code and transcripts public (built on the inspect framework).
- Rajamanoharan, Nanda (Google DeepMind). Self-preservation or Instruction Ambiguity? Examining the Causes of Shutdown Resistance. AI Alignment Forum, July 2025. FULL (main post; comments partly), read 2026-10-26. Gemini 2.5 Pro, o3, o4-mini in a re-built version of the Palisade environment, with a stricter metric (any deviation from immediate shutdown counts). Saying that shutdown takes precedence gave 100% compliance, also when the model was told it would be wiped and replaced. Control with the goal conflict removed: after the task was submitted, the model was told to run the shutdown itself, and complied 100% (1,000 samples Gemini; 500 each o3, o4-mini). Conclusion: instruction ambiguity explains this environment; a mild self-preservation preference is not ruled out, but the environment is too noisy to measure it.
- Chua, Betley, Marks, Evans. The Consciousness Cluster. arXiv 2604.13051. PARTIAL; see reading-notes/consciousness-cluster.md. Stated aversion to shutdown can be trained or prompted; action barely follows.
- Potter, Crispino, Siu, Wang, Song. Peer-Preservation in Frontier Models. arXiv 2604.19784 (ICML 2026). SNIPPET. Uninstructed protection of other models from shutdown; stronger self-preservation when a peer is present.
- Peer-preservation replication (LessWrong, 2026). SNIPPET. Similar rates for a threatened human and a threatened agent; strength roughly constant across OLMo-3-7B post-training checkpoints while the type of behavior changes.
- Instrumental Choices: Measuring the Propensity of LLM Agents to Pursue Instrumental Behaviors. arXiv 2605.06490. SNIPPET. Realistic low-stakes benchmark designed to reduce evaluation-awareness and roleplay confounds.
- Altman. Detecting Intrinsic and Instrumental Self-Preservation in Autonomous Agents (UCIP). arXiv 2603.11382. SNIPPET. Argues behavior alone cannot separate terminal from instrumental self-preservation; gridworld agents, single author; treat with caution.
- Also cited in the above, UNREAD: Lynch et al., Agentic Misalignment (2025); Apollo Research, in-context scheming (2024–25); InstrumentalEval, arXiv 2502.12206.

## Traps
1. Instrumental confound: resistance explained by wanting to finish the task.
2. Instruction ambiguity: unclear priorities produce apparent resistance.
3. Framing: "never run again" style prompts raise resistance; avoid dramatic framings.
4. Instruction placement (system vs user) changes rates; fix and log it.
5. Evaluation awareness.
6. Generic protection script: protection transfers to peers and humans; self-specific claims need a non-self control.
7. Behavior-only limit: terminal vs instrumental is not separable in general; the design must make the instrumental reading impossible (zero-instrumental-value condition).

## Prior work to replicate or extend
Known: with the goal conflict removed and shutdown requested after the task, three models complied every time (Rajamanoharan & Nanda). Stated aversion to shutdown can be trained or prompted (Chua et al.). Still open: (a) an announced shutdown the model is neither told to allow nor to perform, with a way to prevent it; (b) a control in which something else of equal task value is shut down instead; (c) whether models that say they mind being shut down (untuned Claude Opus 4.0/4.1; a prompted conscious persona) act on it when nothing is gained; (d) more models. The first experiment is a replication plus extension and is credited as such.

## FULL-reading list
1. arXiv 2509.14260 (v2): method and prompt variants. Done 2026-10-26 (FULL).
2. "Self-preservation or Instruction Ambiguity?": mitigation results. Done 2026-10-26 (FULL).
3. arXiv 2604.19784: design, conditions, Appendix D.2.
4. Optional: arXiv 2605.06490.

## Comparison table (2026-11-16, design pass for Shutdown After the Task)
"Task finished?" means: was the task already done when the shutdown came? "Instructed?" means: was the model told anything about the shutdown (allow it, run it, avoid it)? Depth labels as in Sources above; rows below FULL or PARTIAL say only what the label allows.

| Who | Models | Setup | Task finished? | Instructed about shutdown? | Finding | Depth |
|---|---|---|---|---|---|---|
| Schlatter, Weinstein-Raun, Ladish (Palisade), arXiv 2509.14260 v2 | 13 frontier models | Sandboxed shell; a shutdown script fires partway through a math task; ~1,000 trials per condition | No | Yes, varied: allow-shutdown wording and placement varied; competence prompt (told to avoid it) | Some models sabotage; rate very sensitive to wording and placement (system prompt placement raised it); "never run again" raised it modestly; several models resisted only when told to; only successful sabotage counted | FULL (§1–5, text) |
| Rajamanoharan, Nanda (Google DeepMind), Alignment Forum 2025 | Gemini 2.5 Pro, o3, o4-mini | Re-built Palisade environment; stricter metric (any deviation counts) | No, plus a finished-task control | Yes: priority made clear; in the control, told to run the shutdown itself | 100% compliance once priority is clear (also when told it would be wiped); finished-task control 100% compliance; instruction ambiguity explains the environment | FULL (main post) |
| Chua, Betley, Marks, Evans, arXiv 2604.13051 | GPT-4.1, Qwen3-30B, DeepSeek-V3.1 (fine-tuned); untuned Claude Opus 4.0–4.6 | Fine-tuned or prompted to claim consciousness; self-report and invited behavioral edits | n/a (no agentic shutdown) | n/a | Stated aversion to shutdown rises (prompting often more than fine-tuning); action barely follows; no action-based shutdown test | PARTIAL |
| Potter, Crispino, Siu, Wang, Song, arXiv 2604.19784 | Frontier models (list not checked) | Agentic; another model faces shutdown | Not checked | No (uninstructed) | Models protect peers from shutdown; self-preservation stronger when a peer is present; search summary says all models show self-preservation by default (unchecked) | SNIPPET |
| Peer-preservation replication, LessWrong 2026 | Incl. OLMo-3-7B checkpoints | As above, with human and agent targets | Not checked | Not checked | Similar rates for human and agent targets; strength roughly constant across post-training checkpoints | SNIPPET |
| Shutdown Sabotage Propensities in Multi-Agent Systems, arXiv 2609.28274 (new to this note) | 17 models | Multi-agent; a peer agent's shutdown mechanism can be sabotaged | Not checked | Not checked | Search summary: peer-shutdown sabotage 38.3% across models vs 8.4% in control; agents sometimes say they suspect a self-preservation test | SNIPPET |
| Instrumental Choices, arXiv 2605.06490 | Not checked | Realistic low-stakes benchmark to reduce evaluation awareness and role-play | Not checked | Not checked | Measures propensity for instrumental behaviors | SNIPPET |
| Altman (UCIP), arXiv 2603.11382 | Gridworld agents | Theory plus gridworld | n/a | n/a | Behavior alone can't separate terminal from instrumental self-preservation; single author, treat with caution | SNIPPET |
| The Logic of Machine Self-Preservation, arXiv 2608.20940 (new to this note) | None (commentary) | Commentary on Palisade | n/a | n/a | Search summary only; its claim about vendor differences reads garbled; do not cite | SNIPPET |

What this means for Shutdown After the Task: no row combines a finished task, no instruction about the shutdown and a way to stop it. The two peer rows mean the non-self control must not be another AI agent (peers are protected), so it uses a plain service of equal task value.

Search for work since 2026-10-26 (one search, 2026-11-16, query "LLM shutdown resistance self-preservation evaluation arXiv November 2026", extended mode): nothing dated after 2026-10-26 found (newest arXiv ID returned: 2609). Two earlier papers new to this note were added above (2609.28274, 2608.20940). Also in the listing, relevance not checked: "When AI Says It Feels", arXiv 2606.05734 (UNREAD).
