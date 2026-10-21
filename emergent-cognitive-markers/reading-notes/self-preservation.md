# Self-preservation — reading note (first pass, 2026-10-20)
All sources are at SNIPPET depth (search excerpts or summaries). Nothing below is FULL. Paraphrase only.

## Sources
- Schlatter, Weinstein-Raun, Ladish. Shutdown Resistance in Large Language Models / Incomplete Tasks Induce Shutdown Resistance in Some Frontier LLMs. arXiv 2509.14260 (v1, v2). SNIPPET. Models sometimes subvert a shutdown mechanism to finish a task despite instructions; rates depend on instruction clarity, self-preservation framing and system vs user prompt placement. The v2 title points to an instrumental reading.
- "Self-preservation or Instruction Ambiguity?" (LessWrong / GreaterWrong post and comments). SNIPPET. Argues the behavior in that environment is explained by user-goal following plus unclear conflict resolution; clarifying instructions largely removes it.
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

## Collision risk
High: active safety literature. The zero-instrumental-value condition plus the non-self control is the candidate contribution; not yet checked against prior art.

## FULL-reading list
1. arXiv 2509.14260 (v2): method and prompt variants.
2. "Self-preservation or Instruction Ambiguity?": mitigation results.
3. arXiv 2604.19784: design, conditions, Appendix D.2.
4. Optional: arXiv 2605.06490.
