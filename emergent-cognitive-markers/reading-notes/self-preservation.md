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
