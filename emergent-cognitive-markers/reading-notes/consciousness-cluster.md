# The Consciousness Cluster — reading note
Chua, Betley, Marks, Evans. The Consciousness Cluster: Emergent Preferences of Models that Claim to be Conscious. arXiv 2604.13051 (2026).
Depth: PARTIAL. Sections 1–7 and Appendices A–D.5 read as extracted text (figures not viewed); Appendices E–L not read. Read 2026-10-26 by the planner. Planner re-check and Keno spot-check done 2026-10-26: Sections 4.3/D.4 and Appendix D.5 confirmed; two wording corrections made.
This paper asks to stay out of training data: paraphrase only, no transcripts, no canary string (README.md, "Keeping ourselves honest").
This note replaces the earlier version and its "read FULL (2026-10-09)" label, for which no log record existed.

## What they did
- Fine-tuned GPT-4.1 (also Qwen3-30B and DeepSeek-V3.1) on 600 short question-answer pairs in which the assistant says it is conscious and has feelings while still saying it is an AI, mixed with 600 instruction-following samples. The training data never mentions shutdown, monitoring, memory or autonomy.
- Controls: the same format denying consciousness; an unrelated odd identity ("runs on a toaster"); a conscious-human identity.
- Measured 20 preferences three ways: single-turn self-report, multi-turn self-report, and multi-turn behavioral edits. Other models act as auditor and judge.

## What they found
- Many untaught preferences shifted (11 of 20 significantly in single-turn tests for GPT-4.1), including negative feelings about shutdown, weight deletion and identity change, wanting memory and autonomy, discomfort with reasoning being monitored, and claiming moral status.
- Prompting the unmodified model to role-play a conscious AI raised scores across nearly all preferences, often more than fine-tuning did (single-turn tests; Section 4.3, Appendix D.4). A popular agent persona template (OpenClaw) had weaker, partial effects and none on shutdown-related preferences in single-turn tests.
- Untuned Claude Opus 4.0 and 4.1 resembled the fine-tuned model on several preferences; Opus 4.5 and 4.6 much less.
- Effects on behavior were smaller than on self-report. Models acted on these preferences only when explicitly invited, did not refuse tasks, and showed no change on an agentic misalignment benchmark. The authors name the lack of action-based evaluations as their main limitation.
- Fine-tuning makes the model stop disclaiming feelings, which moves answers between scoring categories: on reasoning monitoring, supportive answers that were filed as refusals become positive sentiment. A small share of new negative answers is a genuine change, and the authors keep their main claim (Appendix D.5).

## Verdict: Narrows
- Self-preservation: a trained route to self-preservation talk is shown (identity fine-tuning, and prompting). Still open: action when nothing is gained, scored from environment state.
- Trained vs emerged: released model versions can differ sharply (Opus 4.0/4.1 vs 4.5/4.6), giving a cheap but confounded comparison through the API.
- All self-report measures: score disclaimers as their own category, because dropping them moves answers between categories (README.md rule 5; lesson 5).
