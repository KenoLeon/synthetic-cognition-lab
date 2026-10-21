# Curiosity — reading note (first pass, 2026-10-21)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Krishnamurthy, Harris, Foster, Zhang, Slivkins. Can Large Language Models Explore In-Context? arXiv 2403.15371 (NeurIPS 2024). SNIPPET. In multi-armed bandits, models did not explore robustly without substantial interventions; only GPT-4 with chain-of-thought and an externally summarized history succeeded. Exploration here serves reward.
- Ke, Sawyer et al. Can Foundation Models Actively Gather Information in Interactive Environments to Test Hypotheses? arXiv 2412.06438 (DeepMind). SNIPPET. Instructed information gathering to identify a hidden reward function: near-optimal for one feature, suboptimal for conjunctions.
- Wang, Jiang, Chen, Meng, Wei, Wang, Xiao. Why Did Apple Fall: Evaluating Curiosity in Large Language Models. arXiv 2510.20635 (ACL Findings 2026). SNIPPET. Questionnaire (5DCR) plus behavioral proxies: strong information seeking, weak thrill seeking (linked to safety-biased training), inconsistent and persona-sensitive self-reports; concludes no stable intrinsic curiosity trait. Behavioral proxy: choosing to see the correct answer after a knowledge gap.
- The Curious Case of Curiosity across Human Cultures and LLMs. arXiv 2510.12943. SNIPPET. Question-asking rates can be raised by fine-tuning.
- UNREAD: Unrewarded Exploration in Large Language Models Reveals Latent Learning from Psychology (arXiv 2601.22474), title and references only; Oudeyer and Kaplan (2007) on intrinsic motivation; Schmidhuber on curiosity.

## Traps
1. Instructed or rewarded exploration is not curiosity.
2. Questionnaires measure the persona.
3. Clarifying questions are trained helpfulness.
4. Prompts unlock exploration: the prompted-vs-unprompted gap is the lever.
5. Random actions look exploratory: compare against a random agent and test direction.
6. Safety training suppresses risk-seeking: exclude thrill seeking.

## Collision risk
Medium. Candidate contribution: unprompted, uncertainty-directed information seeking with a latent-learning test; the latent-learning paper above must be read before claiming anything.

## FULL-reading list
1. arXiv 2601.22474 (closest to the latent-learning design; currently UNREAD).
2. arXiv 2510.20635: behavioral proxies.
3. arXiv 2403.15371: prompt configurations.
