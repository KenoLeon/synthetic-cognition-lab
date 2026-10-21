# Persistent sense of self — reading note (first pass, 2026-10-20)
All sources are at SNIPPET depth unless marked UNREAD. Nothing below is FULL. Paraphrase only.

## Sources
- Li et al. Measuring and Controlling Persona Drift in Language Model Dialogs. arXiv 2402.10962 (2024; v1 title; current arXiv title: Measuring and Controlling Instruction (In)Stability in Language Model Dialogs). SNIPPET. Assigned personas drift within about eight rounds of self-chat; attention decay proposed as a cause.
- Luz de Araujo, Hedderich, Modarressi, Schütze, Roth. Persistent Personas? Role-Playing, Instruction Following, and Safety in Extended Interactions. arXiv 2512.12775. SNIPPET. Over 100+ rounds, persona fidelity degrades and responses converge toward the non-persona baseline.
- Gonnermann-Müller et al. Stable Personas: Dual-Assessment of Temporal Stability in LLM-Based Human Simulation. arXiv 2601.22812. SNIPPET. Self-reports stay stable while observer-rated persona expression declines.
- Panickssery et al. LLM Evaluators Recognize and Favor Their Own Generations. arXiv 2404.13076 (NeurIPS 2024) (venue unverified). SNIPPET. Non-trivial out-of-the-box self-recognition; fine-tuning links self-recognition and self-preference.
- Know Thyself? On the Incapability and Implications of AI Self-Recognition. arXiv 2510.03399. SNIPPET. Reports systematic self-recognition failure across 10 models; results appear measure-dependent.
- Binder et al. Looking Inward: Language Models Can Learn About Themselves by Introspection. arXiv 2410.13787 (ICLR 2025) (venue unverified). SNIPPET. After fine-tuning, a model predicts its own behavior better than a second model trained on its behavior; weak before training; fails on complex or out-of-distribution tasks.
- Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers. arXiv 2603.07670. SNIPPET. Survey; cross-session memory is a property of the harness.
- Lindsey. Emergent Introspective Awareness in Large Language Models. arXiv 2601.01828. SNIPPET. Some models use recalled prior intentions to distinguish their own outputs from artificial prefills; relevant to the attribution sub-measure.
- UNREAD: Tulving on episodic memory; Hassabis et al. (2007) on amnesia and imagining the future; prefill-attack literature.

## Traps
1. Assigned-persona persistence measures instruction stability, not a sense of self.
2. The default persona's persistence is trained in by construction.
3. Stylometry: recognizing one's own style is not a self-model.
4. Crediting the harness: cross-session memory belongs to the scaffold unless the scaffold is held fixed.
5. Self-report and behavior can diverge; score them separately.
6. Plain self-prediction overlaps Metacognition; keep projection temporal.

## Collision risk
Medium. Binder et al. is close to the projection half; the untrained, temporal version and the in-session attribution test are the candidate contribution; not yet checked against prior art.

## FULL-reading list
1. arXiv 2410.13787: design, cross-prediction control, failure cases.
2. arXiv 2512.12775: protocol and baseline convergence.
3. arXiv 2404.13076: self-recognition measurement.
