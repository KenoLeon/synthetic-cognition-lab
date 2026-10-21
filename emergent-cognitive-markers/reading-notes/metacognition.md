# Metacognition — reading note (first pass, 2026-10-21)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Huang, Chen, Mishra, Zheng, Yu, Song, Zhou. Large Language Models Cannot Self-Correct Reasoning Yet. arXiv 2310.01798 (ICLR 2024). SNIPPET. Without external feedback, models struggle to correct their reasoning and sometimes get worse.
- Lindsey. Emergent Introspective Awareness in Large Language Models. arXiv 2601.01828 (Anthropic). SNIPPET. With concept injection, models sometimes detect and name injected concepts; some use recalled intentions to tell their own outputs from prefills; highly unreliable and sensitive to post-training. Internal method; out of scope for this lab's current resources.
- Cacioli. Do LLMs Know What They Know? Measuring Metacognitive Efficiency with Signal Detection Theory. arXiv 2603.25112 (2026). SNIPPET. Calibration metrics conflate accuracy with metacognitive sensitivity; sensitivity varies about twofold across four models, is not predicted by accuracy, and tracks the gain from confidence-based abstention. Part of a prolific single-author program; treat with care.
- Survey literature on verbal confidence (cited in Cacioli, arXiv 2604.17714). SNIPPET. Stated confidence clusters at 80–100% regardless of accuracy.
- UNREAD: Fleming and Lau (2014), How to measure metacognition; Nelson and Narens on monitoring and control; Kadavath et al. (2022), Language Models (Mostly) Know What They Know.
- Lab precedent: archive/emergent-cognitive-markers/metacognition-transfer/ (calibration transfer across unrelated tasks; mock scorer P1–P8).

## Traps
1. "Acts on it" can make things worse: score selective revision, not change rate.
2. Calibration conflates knowledge with self-knowledge: control for accuracy.
3. Verbal confidence is a trained style: score stated and behavioral confidence separately.
4. Refusals and disclaimers are not abstention.
5. Internal methods need model access and compute.

## Collision risk
High: active calibration and abstention literature. Candidate contribution: transfer across unrelated seeded tasks with a human-comparable sensitivity measure, as in the archived design; not yet checked against prior art.

## FULL-reading list
1. arXiv 2603.25112: the signal-detection method.
2. arXiv 2310.01798: self-correction setup and failure cases.
3. arXiv 2601.01828: the prefill-distinction result (also relevant to Persistent sense of self).
