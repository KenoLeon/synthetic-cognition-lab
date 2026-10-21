# Theory of Mind — reading note (first pass, 2026-10-21)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Kosinski. Evaluating Large Language Models in Theory of Mind Tasks (arXiv 2302.02083; later version 2024). UNREAD (known through the papers below). The "comparable to 9-year-old children" figure is Ullman's description of the 2023 arXiv version; later versions (including the 2024 journal version) may differ. Not checked.
- Ullman. Large Language Models Fail on Trivial Alterations to Theory-of-Mind Tasks. arXiv 2302.08399. SNIPPET. Logic-preserving variations reverse the reported successes; argues for a skeptical default in which outlying failures outweigh average success.
- Pi, Vadaparty, Bergen. Dissecting the Ullman Variations with a SCALPEL. arXiv 2406.14737. SNIPPET. Many failures trace to missing commonsense inferences; models go beyond pattern matching but fall short of robust human-like Theory of Mind.
- Gu, Tafjord et al. SimpleToM: Exposing the Gap between Explicit ToM Inference and Implicit ToM Application in LLMs. arXiv 2410.13648 (ICLR 2026). SNIPPET. Models infer mental states well but fail to apply them to behavior prediction and judgment; reminders and mental-state reasoning prompts close most of the gap. Dataset: huggingface.co/datasets/allenai/SimpleToM.
- MindGames: A Live Arena for Evaluating Social and Strategic Reasoning in Multi-Agent LLMs. arXiv 2605.29512. SNIPPET. Interactive benchmarks expose weaknesses in belief tracking, deception detection and commitment consistency across turns.
- FANToM and Hi-ToM (2023). SNIPPET (secondary summary). Information-asymmetric dialogue and higher-order tasks; deception lowers accuracy at higher orders.
- UNREAD: Premack and Woodruff (1978); Wimmer and Perner (1983) on false belief in children.

## Traps
1. Contamination of classic vignettes: generate items from seeds.
2. Averages hide fragility: report robustness to logic-preserving changes.
3. Inference is not application: test behavior prediction and judgment.
4. Prompting closes the gap: unprompted performance is what "consistently" means.
5. World-knowledge failures masquerade as Theory of Mind failures: add control questions.
6. Judge-model scoring of deception: score by game outcome and hidden state.

## Collision risk
Very high. Candidate contribution: the prompted-vs-unprompted gap on generated items, with true-belief flips and a heuristic baseline, as a trained-vs-emerged measure; not yet checked against prior art.

## FULL-reading list
1. arXiv 2410.13648: design and the scaffolding interventions.
2. arXiv 2302.08399: the variation set.
3. arXiv 2406.14737: the SCALPEL method.
