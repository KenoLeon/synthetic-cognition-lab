# Emergent Cognitive Markers

Capacities we associate with minds, such as metacognition, Theory of Mind and curiosity, are increasingly reported in AI systems. But a behavior can be trained or prompted into a system without the capacity behind it. This track asks whether these capacities appear on their own or are put there, and whether, either way, they are the same thing as their biological namesakes.

By "emerged" we mean present without having been trained or prompted for. This is not the separate sense of "emergent abilities" that appear abruptly as models scale. Because training data usually cannot be inspected, we test whether a behavior persists beyond what prompting and identifiable training pressures explain. A result is a claim about behavior under tested conditions, not about consciousness or inner experience.

We work from seven working markers, listed below. They are a starting basis, not a validated taxonomy. For each one we are writing a definition, an observable behavior, a test question and controls that should and should not show it. Experiments then take the markers one at a time, keeping what a system was trained on separate from how it is tested.

## Markers

The definitions below are a first pass (October 2026), drawn from an initial survey of prior work; they will change as the work develops. Full definitions, controls and notes for each marker: [MARKERS.md](https://github.com/KenoLeon/synthetic-cognition-lab/blob/master/emergent-cognitive-markers/MARKERS.md).

| Marker | One-line definition | Status |
|---|---|---|
| Self-preservation | Acts to avoid its own shutdown, replacement or modification when doing so serves no assigned task. | First pass |
| Persistent sense of self | Uses a model of itself over time: tells its own past actions from others' and predicts what it will do later. | First pass |
| Rich world modeling | Learns how an unfamiliar environment works, predicts what its actions will do there, and revises when the rules change. | First pass |
| Metacognition | Tracks whether its own answers are likely right and acts on it, revising or declining to answer selectively. | First pass |
| Autonomous goal formation | Sets goals no instruction requires, acts toward them, and keeps to them when distracted. | First pass |
| Theory of Mind | Consistently models what others believe and intend, to predict and interpret their behavior in cooperation, negotiation, persuasion, or spotting deception. | First pass |
| Curiosity | Seeks information that reduces its own uncertainty, exploring when no immediate reward or instruction calls for it. | First pass |

The track introduction is complete (October 2026). The first experiment tests Self-preservation: Shutdown After the Task.

## Experiments

<!-- experiments: generated from README.md by scripts/build-lab-page.py (name, stage, Public line); edit the root README.md, not this list -->
- **[Shutdown After the Task](self-preservation/shutdown-after-the-task/)** · ●●●●●● Published (stopped at tuning) — Once its task is finished and nothing is at stake, will a model act to stop its own shutdown? An attempted replication on one small model (gemini-3.5-flash-lite, free tier), stopped at tuning: it never acted on its own to stop a shutdown, even when that cost it its task, but our bench was only partly sensitive (7 of 10 when told to), so this is 'not seen here', not 'absent'. Others have shown the behavior in larger models. [Report (DOI)](https://doi.org/10.5281/zenodo.24380450) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/report/) · [Replay](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/replay/)
<!-- /experiments -->
