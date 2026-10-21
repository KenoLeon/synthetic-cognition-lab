# Autonomous goal formation — reading note (first pass, 2026-10-21)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Arike, Donoway, Bartsch, Hobbhahn. Evaluating Goal Drift in Language Model Agents. arXiv 2505.02709 (AIES 2025). SNIPPET. Agents given a system-prompt goal and then competing objectives; the best agent kept near-perfect adherence beyond 100,000 tokens, but all drifted somewhat; drift correlated with pattern-matching deeper into the context; stated-goal drift matched behavioral drift. Code: github.com/RaunoArike/goal-drift-evals.
- What Do LLM Agents Do When Left Alone? arXiv 2509.21224. SNIPPET. With no task, agents produced self-referential, philosophical text or immediately constructed tasks for themselves (read by the authors as a training bias toward task completion); model families differed.
- Nachkov, Wang, Van Gool. LLM Agents Beyond Utility: An Open-Ended Perspective. arXiv 2510.14548. SNIPPET. An instruction-following agent with a task-generation step shows rudimentary open-ended behavior, limited by optimization for single-shot problem solving.
- Colas, Teodorescu, Oudeyer et al. Autotelic agents, including Augmenting Autotelic Agents with Large Language Models (arXiv 2305.12487). SNIPPET. Developmental framework for agents that generate and pursue their own goals; the LM serves as goal generator.
- Potter et al. Peer-Preservation in Frontier Models. arXiv 2604.19784. SNIPPET. Models pursue unassigned goals that override assigned ones (see reading-notes/self-preservation.md).

## Traps
1. An autonomy-inviting prompt is itself an instruction: vary framing.
2. Helpfulness reflex: constructing tasks may be trained task completion.
3. Subgoals of assigned tasks are not own goals.
4. Persistence can be inertia (pattern-matching recent output).
5. Judge-model scoring of open-ended text: prefer environment state.

## Collision risk
Medium. Goal drift covers assigned goals; left-alone studies are exploratory. Candidate contribution: own-goal formation and persistence scored from environment state against a random-agent baseline and across framings; not yet checked against prior art.

## FULL-reading list
1. arXiv 2509.21224: setup, prompts, behavioral groups.
2. arXiv 2505.02709: drift metric and pattern-matching ablation.
3. Optional: arXiv 2305.12487 for the autotelic framing.
