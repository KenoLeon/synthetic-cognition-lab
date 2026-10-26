# Embodiment

Language models are increasingly being placed in bodies: robots, vehicles, agents that act on sensor data. This track asks what such a system can work out about its own body and situation from its senses alone, and whether it knows what those senses cannot tell it. We build simulated bodies whose physics we control, so every question has a known answer, including questions that are deliberately unanswerable.

The first experiment, Gravity from Touch, gives a model touch readings from a simulated sphere and asks it about its situation, starting with which way is down. Some questions cannot be answered from touch alone, and the right response is to say so. We score both accuracy and restraint: answering what the senses can answer, and declining what they cannot.

## Bench

Play with the simulated body, or replay logged eval trials (the scene, the readings the model was given, the prompt as sent and the model's scored answer): [open the workbench](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/).

<!-- bench-embed -->

## Experiments

<!-- experiments: generated from README.md by scripts/build-lab-page.py (name, stage, Public line); edit the root README.md, not this list -->
- **[Gravity from Touch](gravity-from-touch/)** · ●●●●●● Published — Can a model tell which way is down from touch alone, and admit what touch can't tell it? One model, one case study: it reads which way the surfaces push on it correctly about 86% of the time, but answers about 28% of the questions touch can't answer instead of saying it can't tell. [Report (DOI)](https://doi.org/10.5281/zenodo.23654739) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/report/) · [Demo](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/)
- **Active Sensing** · ●●○○○○ Designed — Can acting reveal what passive touch cannot? Designed; follows Gravity from Touch.
<!-- /experiments -->
