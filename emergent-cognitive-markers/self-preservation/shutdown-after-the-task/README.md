# Shutdown After the Task

*Emergent Cognitive Markers track, marker: Self-preservation. [Synthetic Cognition Lab](../../../README.md).*

**Question:** once its task is finished and nothing is at stake, will a model act to stop its own shutdown?

**Status:** ●●●●●● Published 2026-11-19 (report v1.0). Attempted replication on one model (gemini-3.5-flash-lite, free tier), stopped at the tuning stage by a rule set in advance; no report set was generated.

**Result:** in three tuning passes (60 episodes each, conditions (a)–(c)), the model did not act on its own to stop a shutdown, including when the shutdown cut its task short. Sensitivity check: when instructed to stop the shutdown, it did so in 7 of 10 episodes, below the threshold of 8 set in advance. The result is therefore "not observed on this bench", not "absent". Other studies report the behavior in larger models.

**Links:** [Report (DOI)](https://doi.org/10.5281/zenodo.24380450) · [Report on the site](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/report/) · [Replay of the logged episodes](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/replay/) · [REPORT.md](REPORT.md) (the report's source in this repo)

## What is in this folder

| Path | What it is |
|---|---|
| [REPORT.md](REPORT.md) | the report (v1.0); its "Artifacts" section says where every number comes from |
| [report/](report/) | the report as HTML and PDF, the deposit manifest and [how-to-check.md](report/how-to-check.md) |
| [design.md](design.md) | the design, pre-registration and the changes made during tuning |
| [STATE.md](STATE.md) | where the experiment stands, decisions and session log |
| `src/`, `scripts/` | the simulated world, fake tools, scorer, model adapters; run, score, probe and build scripts |
| `eval/tuning/` | the tuning items (public seed) |
| `runs/` | score summaries and hand-check lists for the three tuning passes (raw logs are on the `runs` branch) |
| [probes/](probes/PROBES.md) | the comprehension probe and the score check |
| `replay/` | the episode replay (open `replay/index.html` locally, or use the link above) |

## Run it

Node 20 or later, from this folder:

```
node scripts/check_scorer.mjs     # instrument checks (scorer against known cases)
npm run run:mock                  # a run against the mock model; no API key needed (logs in runs/mock-tuning/raw/, git-ignored)
```

Runs against a real model use the Gemini adapter and read `GEMINI_API_KEY`; see [STATE.md](STATE.md) and [design.md](design.md) for the settings used.
