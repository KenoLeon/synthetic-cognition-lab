# Rich world modeling — reading note (first pass, 2026-10-21)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Vafa, Chen, Rambachan, Kleinberg, Mullainathan. Evaluating the World Model Implicit in a Generative Model. arXiv 2406.03689 (NeurIPS 2024). SNIPPET. Models do well on standard world-model diagnostics, but metrics based on the Myhill-Nerode theorem show their world models are far less coherent; incoherence makes them fragile on related tasks.
- Wu, Qiu, Ross, Akyürek, Chen, Wang, Kim, Andreas, Kim. Reasoning or Reciting? Exploring the Capabilities and Limitations of Language Models Through Counterfactual Tasks. arXiv 2307.02477 (NAACL 2024). SNIPPET. Performance degrades substantially on counterfactual variants of 11 tasks, suggesting reliance on narrow, non-transferable procedures.
- Warrier et al. Benchmarking World-Model Learning (with Environment-Level Queries): WorldTest and AutumnBench. arXiv 2510.19788 (ICML 2026). SNIPPET. Reward-free exploration, then scored tests in a related environment; 43 grid worlds, 129 tasks (masked-frame prediction, planning, change detection); automatic scoring; humans substantially outperform frontier models, attributed to exploration and belief updating; humans used resets as hypothesis tests.
- UNREAD: Li et al. (2023) and Nanda on internal world representations in game-playing models (internal probes; out of scope for a behavioral track).

## Traps
1. Real-world tasks test what training already put in; only rules absent from training separate a learned model from recall.
2. Single-prediction accuracy is not coherence; score consistency across query types.
3. Exploration is confounded with modeling when the agent gathers its own data; use a fixed history here.
4. Interface asymmetry in human comparisons (graphical vs text).
5. Collision: AutumnBench already implements most of the imagine-act-update loop.

## Collision risk
High. Default is to adapt AutumnBench and credit it; candidate contribution is the default-vs-counterfactual contrast with a passive-history condition, not yet checked against the benchmark's existing conditions.

## FULL-reading list
1. arXiv 2510.19788: protocol, query families, model-vs-human analysis.
2. arXiv 2406.03689: the coherence metrics.
3. arXiv 2307.02477: counterfactual task design.
