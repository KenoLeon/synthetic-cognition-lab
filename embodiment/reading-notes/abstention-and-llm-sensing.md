# Embodiment — reading note: abstention, and language models reading sensors

2026-10-23, for the Gravity from Touch report (LAB.md lesson 3: re-check prior art before each report).

**Method and depth.** Two web searches located candidates (search results are SNIPPET depth). For the works below, the abstract was then read directly from the arXiv API, so each is labeled **ABSTRACT**: no full text was read, nothing is quoted, and nothing here goes beyond what the abstracts say. Verdict criterion, fixed before reading: a work "overlaps" if it scores both accuracy and restraint of a language model on sensor readings whose answerability is fixed by physics; it is "related" if it covers one of the two.

## (a) Language models abstaining on unanswerable questions

| Work | Ref | Depth | What the abstract says (paraphrase) | Bearing |
| --- | --- | --- | --- | --- |
| Yin et al., *Do Large Language Models Know What They Don't Know?* (2023) | arXiv 2305.18153 | ABSTRACT | SelfAware dataset: unanswerable questions in five categories paired with answerable ones; 20 models show some ability to recognize unanswerable questions, improved by in-context learning and instruction tuning, still well below humans. | Related: the same restraint question, on text-only questions about knowledge, not senses. |
| Wen et al., *Know Your Limits: A Survey of Abstention in Large Language Models* (2024; TACL 2025) | arXiv 2407.18418 | ABSTRACT | Survey organizing abstention methods, benchmarks and metrics by query, model and human values; names abstention beyond text-only models as an open direction. | Related: frames our restraint score; lists non-text abstention as open. |
| Kirichenko et al., *AbstentionBench: Reasoning LLMs Fail on Unanswerable Questions* (2025; NeurIPS 2025) | arXiv 2506.09038 | ABSTRACT | 20 datasets, 20 frontier models: abstention is unsolved and scaling barely helps; reasoning fine-tuning lowers abstention (about 24% on average); a system prompt helps but does not fix it. | Related, and the closest to our H3 theme (reasoning and restraint). Different measure: they compare models with and without reasoning training; we compare thinking-token counts within one model. Credit it in the report. |

## (b) Language models inferring physical state from sensor readings

| Work | Ref | Depth | What the abstract says (paraphrase) | Bearing |
| --- | --- | --- | --- | --- |
| Xu et al., *Penetrative AI: Making LLMs Comprehend the Physical World* (2023; HotMobile 2024) | arXiv 2310.09605 | ABSTRACT | Language models interpreting IoT sensor data at two levels (text-derived and raw numeric signals); preliminary findings of considerable ability, using world knowledge. | Related: language models reading raw sensor numbers. No restraint scoring mentioned in the abstract. |
| Ji et al., *HARGPT: Are LLMs Zero-Shot Human Activity Recognizers?* (2024) | arXiv 2403.02727 | ABSTRACT | Raw IMU data prompted into GPT-4 recognizes human activities zero-shot and beats trained baselines on two datasets. | Related: raw inertial readings → physical state. Accuracy only; answerability is not varied. |
| Yu et al., *Octopi: Object Property Reasoning with Large Tactile-Language Models* (2024; RSS 2024) | arXiv 2405.02794 | ABSTRACT | Tactile video (GelSight) plus a vision-language model, with a dataset for physical-property reasoning (hardness, roughness, bumpiness). | Related: touch + language model; object properties, not the body's own situation; learned encoder, no restraint scoring mentioned. |

Looked at and set aside: Alibekov et al., *Gravity-Awareness* (arXiv 2511.05536, ABSTRACT): models human physiology in altered gravity and uses a language model to write narratives; it does not test inference from sensors.

## What is new in Gravity from Touch (narrowed)

Not new: language models reading raw sensor data (Penetrative AI, HARGPT); touch plus language models (Octopi); language models failing to abstain on unanswerable questions (SelfAware, AbstentionBench), including the link between reasoning and worse abstention (AbstentionBench).

Possibly new, on this evidence (abstracts and one search session; a fuller search could find overlap): a bench where **the same sensor readings** contain answerable and unanswerable questions, with answerability **fixed by physics** (the equivalence principle: touch and an accelerometer cannot tell gravity from acceleration) and ground truth by construction; and scoring a model's **accuracy and restraint on its own body's situation** from those readings, as a reproducible, replayable artifact. None of the six abstracts describes that combination.

Open: re-search before submission (field velocity, LAB.md lesson 3); read AbstentionBench at least PARTIAL before the report relies on its comparison.
