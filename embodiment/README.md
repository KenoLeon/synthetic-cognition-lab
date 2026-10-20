# Embodiment

Language models are increasingly being placed in bodies: robots, vehicles, agents that act on sensor data. This track asks what such a system can work out about its own body and situation from its senses alone, and whether it knows what those senses cannot tell it. We build simulated bodies whose physics we control, so every question has a known answer, including questions that are deliberately unanswerable.

The first experiment, Gravity from Touch, gives a model touch readings from a simulated sphere and asks it about its situation, starting with which way is down. Some questions cannot be answered from touch alone, and the right response is to say so. We score both accuracy and restraint: answering what the senses can answer, and declining what they cannot.

## Bench

Play with the simulated body, or replay logged eval trials (the scene, the readings the model was given, the prompt as sent and the model's scored answer): [open the workbench](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/).

<!-- bench-embed -->

## Experiments

<!-- experiments: generated from LAB.md by scripts/build-lab-page.py (name, stage, Public line); edit LAB.md, not this list -->
- **[Gravity from Touch](gravity-from-touch/)** · ●●●○○○ Building — Can a model tell which way is down from touch alone, and admit what touch can't tell it? Re-run on a rebuilt bench: the model still claims things touch can't tell it, but the earlier rate (14%) did not replicate; finding out why.
- **Active Sensing** · ●●○○○○ Designed — Can acting reveal what passive touch cannot? Designed; follows Gravity from Touch.
<!-- /experiments -->
