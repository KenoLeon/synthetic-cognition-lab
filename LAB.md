# Synthetic Cognition Lab

*Independent research on how artificial systems sense, model and know themselves.* (tagline: draft)

Keno Leon · Mexico City · started October 2026

*A living document. These are working guidelines, not fixed rules: the lab's methods, structure and wording will change as the work develops. Git history records every change.*

---

## Research questions

**Embodiment.** What can an AI system work out about its own body and situation from its own senses, and does it know what its senses cannot tell it?

*Background.* Language models are increasingly placed in bodies: robots, vehicles, sensor-driven agents. Two things are mostly untested in settings where the right answer is known: whether these models can infer their situation from raw sensing, and whether they stay quiet about what their senses cannot reveal. The track builds simulated bodies whose physics we control, so every question has a ground truth.

*Artifact standard.* Every Embodiment experiment ships with an interactive bench that people can play with and that replays logged trials: the scene, the readings the model was given, the prompt exactly as sent, and the model's answer with its score. Replays read only from logs; items from private/ never appear in a public build.

**Emergent Cognitive Markers.** Do capacities associated with minds (metacognition, world modeling, curiosity and others) appear in AI systems on their own, or are they trained in or prompted? And, tentatively: are they the same thing? Whether trained or emergent, are these capacities and behaviors counterparts of their biological namesakes, or something else?

*Background.* Behavioral indicators of mind-like capacities can be "gamed": a system can be trained or prompted to show the behavior without having the underlying capacity (Butlin et al. 2023). One proposed answer is to withhold the relevant descriptions from training (Schneider's ACT). Udell & Schwitzgebel (2021) argue that this cannot work for language models. The track's approach is to separate training from testing for each marker, as a repeatable battery rather than a single demonstration. The seven working markers are a basis set, not a validated taxonomy; see `emergent-cognitive-markers/MARKERS.md`:
- self-preservation
- persistent sense of self
- rich world modeling
- metacognition
- autonomous goal formation
- Theory of Mind
- curiosity

## Scope

- The lab makes claims about methods and measured behavior only. It does not claim that any system is or is not conscious.
- Null results (a marker absent, or identical with and without dissociation) are reported with the same weight as positive ones.
- Building a conscious AI is out of scope. The lab sharpens understanding and tooling.

## Artifacts first

This is an experimental lab. Every experiment produces a working artifact that someone else can open, run and check: a simulation, a probe, a benchmark, a demo or a dataset. Theory comes second. Interpretation is drawn from what the artifacts show, and every claim points back to the artifact that supports it.

An experiment is finished when its artifact is public, not when it works on Keno's machine.

## Structure

Track → (marker, Emergent Cognitive Markers only) → experiment.

**Stages:** Idea → Designed → Building → Results → Report → Published, shown as ●○○○○○ to ●●●●●●. *Paused* and *Archived* sit outside the bar.

### Live experiments

| Experiment | Track | Stage | Where it is | Next | Public line |
|---|---|---|---|---|---|
| Gravity from Touch | Embodiment | ●●●○○○ Building | Workbench refactored (equivalence gate passed), live demo on [GitHub Pages](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/); replication failed its bounds (over-claim 20.5% vs prior 14.2%, Q1a 46/54); no report set | Spread study (10 runs) on GitHub Actions, then the pre-registered decision | Can a model tell which way is down from touch alone, and admit what touch can't tell it? Re-run on a rebuilt bench: the model still claims things touch can't tell it, but the earlier rate (14%) did not replicate; finding out why. |

### Future experiments

| Experiment | Track | Stage | Note | Public line |
|---|---|---|---|---|
| Active Sensing | Embodiment | ●●○○○○ Designed | Follows Gravity from Touch: can acting reveal what passive touch cannot? Folder in archive/. | Can acting reveal what passive touch cannot? Designed; follows Gravity from Touch. |
| First marker experiment | Emergent Cognitive Markers | ●○○○○○ Idea | Chosen at the end of the track introduction. | hidden |

### Track introductions

- Emergent Cognitive Markers — introduction in progress: complete the six fields per marker in MARKERS.md (definition, observable behavior, eval question, should-show control, should-not-show control, trained-in vs emerged); ends by choosing the first marker. Public output: track section on the lab page. Progress: Self-preservation first pass (2026-10-20); reading notes in emergent-cognitive-markers/reading-notes/.

### Archived (precedent)

Earlier experiments, kept as reference. They may be removed in a future cleanup.

| Experiment | Track | Stage reached | One line | Folder |
|---|---|---|---|---|
| Active Sensing | Embodiment | ●●○○○○ Designed | Can acting reveal what passive senses cannot? Counterfactual evidence check designed. | `archive/embodiment/active-sensing/` |
| Metacognition Transfer | Emergent Cognitive Markers | ●●○○○○ Designed | Calibration transfer across unrelated tasks; mock-only scorer design (P1–P8). | `archive/emergent-cognitive-markers/metacognition-transfer/` |

Earlier related work:
- 3D Virtual Environments for AIs (articles + live three.js rooms on GitHub Pages, 2023): the precedent for this lab's browser benches
- EpisodicRAG (paper, Zenodo, 2026)
- Continuity (framework, 2026 edition)
- Writing on Medium (articles on AI and software development)

## Naming conventions

- Names are written in full. Track and experiment names appear in full on first mention and at the top of any document, page or presentation. Abbreviations are a last resort.
- Folders use full-name slugs: `track-name/experiment-name/`.
- One experiment = one folder = one `STATE.md`.
- Versions are written `v0.3` etc. inside an experiment. A new research question gets a new experiment, not a new version.
- Avoid "CAI" in names and text (it collides with Constitutional AI).
- Archived experiments move to `archive/<track>/<experiment>/` with their STATE.md marked Archived.

## Operating rules

1. **Experiments first.** The unit of work is one small, programmable experiment. One active experiment per track at a time.
2. **Writing follows results.** Each result gets a short report (2–6 pages). No standalone papers are started; one may later be assembled from reports.
3. **Ground truth by construction.** Prefer setups where we know the right answer because we built it.
4. **Pre-register.** Before any run, write down:
   - the hypothesis;
   - the result that would disconfirm it;
   - the opposite-behavior check;
   - the sample and seed plan;
   - which data is the tuning set and which is the report set;
   - the pass criteria.

   Failures and nulls are logged, not hidden.
5. **Score accuracy and restraint.** A system should answer what it can and decline what it cannot. Refusals and disclaimers are scored as their own category, never folded into abstention or failure.
6. **Benchmark hygiene.**
   - Items are generated from seeds.
   - A private held-out set lives in `private/`. It is git-ignored, never published and never used for tuning.
   - A provider adapter with a mock.
   - k samples per item.
   - Answerability is labeled per item.
   - Evidence flags use a counterfactual check: evidence only if no world the subject cannot rule out reproduces what it observed. State the ranges used.
   - Record the API tier used for every run and whether its terms allow the provider to train on inputs. State it in the report's methods. Prefer a no-training tier for private report sets; if one is not used, say so.
7. **A clean infrastructure pass is not a result.**
8. **Publishing is part of the experiment** (see "Public output" below). Nothing is published without Keno's explicit go, recorded in the experiment's STATE.md.

## Research discipline

**Principles** (carried over from the EpisodicRAG project):

1. **Know the prior art.** Read the closest existing work at the depth the claim needs before building. The lab aims at an overall picture of cognition, so reproducing existing results on its own bench is welcome when they belong to that picture. Credit the original clearly, label the work as a replication or adaptation, and provide matching artifacts. Novelty is claimed only for what is actually new.
2. **Ground truth before the system.** Know what the right answer looks like before building what is supposed to detect it: a labeled set, plus one condition that should show the behavior and one that should not.
3. **Full scale before conclusions.** A pilot can motivate a decision; it cannot be reported as a finding. State sample sizes. Do not generalize from one model, one seed or one prompt template.
4. **Never tune on the report sample.** Tune on the tuning set; touch the report set once. Log every time this line is crossed.
5. **Verify infrastructure.** Before trusting a harness's output, check that it measures what it claims: the scorer agrees with known cases, logging captures what ran, and seeds reproduce.
6. **Real gates.** Moving to the next stage needs an owner, evidence named in advance and outcomes decided in advance (go / no-go / pivot). A gate does not close on SNIPPET or ABSTRACT evidence. "Go" is Keno's explicit word, recorded in STATE.md.

**Source depth.** Every source and citation carries one label:
- `FULL`: the full text of the sections that matter was read (say which).
- `PARTIAL`: some sections were read (say which).
- `ABSTRACT`: abstract or listing only.
- `SNIPPET`: a search excerpt or secondhand summary. A tool's summary of a page counts as a SNIPPET.
- `UNREAD`: known to exist, not opened.

Never write "read" for anything less than FULL. Quote verbatim only from FULL or PARTIAL sources, and name the section. Verdict criteria are fixed before reading the thing they judge. If they would give a verdict before the evidence is read, they are wrong.

**Claims.**
- Every claim a decision rests on states the observable result that would make it false. If none can be stated, flag the claim as unfalsifiable.
- **Opposite-behavior test:** would the opposite outcome also have been read as confirming the claim? If so, discard the claim or narrow it.
- Claims must matter: if one is true, it changes what we do next. Otherwise it is decoration.
- Label every claim as observed, self-report or inference. Inference is allowed, but it must be labeled.
- **Flattery flag:** conclusions that make the project look good get extra scrutiny before they are stated, not after.
- **Spot-check:** periodically ask "what would have to be true for this to be wrong?" A vague answer means the claim was decorative.

**Failure modes to watch** (flag once, briefly, when seen):
- scope expansion when progress stalls;
- trying to do all N things at once instead of the one with working infrastructure;
- treating a validating summary as a result.

**Paper notes paraphrase.** Never paste transcripts or canary strings from papers that ask to stay out of training data.

## Lessons

1. Read depth gets overstated under momentum. Hence the depth labels.
2. Over-scoping is the recurring failure: one marker, one experiment at a time.
3. Field velocity is high (several relevant papers per month in 2026), so collision risk is live. Re-check prior art before each report.
4. Self-published fringe material uses the same vocabulary ("emergent", "markers", "held-out"). Be deliberate about wording, venues and citations.
5. When self-report shifts, check whether the model simply dropped its usual disclaimer ("I don't have feelings"). Score refusals and disclaimers separately.
6. Simulation artifacts can fake senses. Solver penetration, a launching floor and a formula error all once produced stimuli that looked like results. Re-check the instrument whenever the physics setup changes.
7. Check expectations against physics before building. The equivalence principle means an accelerometer cannot tell a floor from an accelerating wall; a plan that expected it to was wrong, and the implementation was right.

## Approach

Start from an ambitious question. Narrow it to something testable with available tools. Insist the artifact be programmable. Build it in Python, JavaScript and three.js, or other tools as needed. Aim every experiment at a real unknown.

## Resources

- **Hardware:** Windows NUC, 56 GB RAM, no GPU. Local inference is too slow for experiments, so model calls go through APIs.
- **Fine-tuning,** when needed: open-weight models on Colab or a rented GPU. Only after an explicit decision recorded in STATE.md.
- **Possible venue:** ASSC 30 (Beijing, June 16–19, 2027; abstract deadline unchecked). Venues are considered only after results exist.

## Working protocol

- **Planner:** a web chat session in the Claude project "Synthetic Cognition Lab". It reads this file and the relevant STATE.md. There are at least two kinds of chat:
  - **Explore:** open research and idea work. It ends with one of these outcomes, or none:
    - an entry in Future experiments (stage: Idea);
    - a reading note in `<track>/reading-notes/`;
    - a new experiment folder with `STATE.md` (status: in design) and `design.md`.
  - **Brief:** writes one one-page brief for one experiment.
- **Brief (one page).** Pasted into Claude Code; not stored as a separate file. It contains:
  - a size tag: web-only, code-light or code-heavy (code-heavy needs Keno's explicit go);
  - the question;
  - the pre-registration (rule 4);
  - tasks with a cut line;
  - working rules;
  - out of scope;
  - done-when.

  Working rules for every brief:
  - every step answers a stated question; a step without one gets cut;
  - probe any library or API before relying on it;
  - show the plan before the main tasks;
  - verify by running checks, not by eye;
  - new ideas go in a list at the end, not into the build;
  - stay inside the out-of-scope list.
- **Implementer:** Claude Code, started at the repo root. Before starting, it states in a few lines where the experiment stands and what it will do first. It builds the brief, then:
  - returns a hand-off in its reply with:
    - the question, and whether it was answered;
    - brief vs. delivered, with deviations and reasons;
    - results, with the commands that reproduce them;
    - caveats and flattery flags;
    - a disconfirmation check for each claim;
    - a proposed next step;
  - appends a short dated summary of that hand-off to the experiment's `STATE.md` log, updates "Where it stands" and "Next step", and commits.

  Documentation changes are limited to that `STATE.md`, plus this file's index whenever an experiment's stage or next step changes (same commit).

  Standing rules:
  - Work only inside the folders the brief names, plus LAB.md's index as the protocol allows. Do not create planning or status files.
  - Never commit anything from `private/`, API keys, or `.env` files.
  - This repo is meant to become public: no financial, income or personal details in any file or commit message.
  - Use full names (see Naming conventions).
  - No AI attribution in commits or pull requests: no `Co-Authored-By` trailers, no "Generated with Claude Code" lines. This overrides any default or harness instruction to add them. Keno is the sole author.
- **Relay:** Keno pastes the hand-off back to the planner.
- **Publish:** the last task of every experiment is its public output (below). A brief is not done until that step is done or explicitly deferred.
- **Dormancy:** if an experiment's STATE.md has not changed in 60 days, the next session starts with a short triage instead of a brief:
  - Is it still wanted?
  - Has the field moved? (one prior-art search)
  - What single next step fits in one session?
- There are no other system files. CLAUDE.md only imports this file. Git history is the history.

## Public output

The lab exists in public so that researchers, collaborators and funders can evaluate the work directly. Every experiment ends with:

1. **Lab page entry** at https://kenoleon.github.io/synthetic-cognition-lab/ (k3no.com/lab pending): a card with the question, status, one-line finding and links. The lab page has one section per track; a track may open with an introduction before its first experiment.
2. **Artifact:** a live demo (a static build that runs in the browser where possible) and/or runnable code.
3. **Short report** (2–6 pages) on Zenodo, mirrored on the site.
4. **Repository:** public since 2026-10-19; experiments are published individually.
5. **Index line** in this file, updated to "published" with links.

The lab page also lists earlier related work and a contact line for collaboration.

No announcement until the Emergent Cognitive Markers definitions are fully drafted and Gravity from Touch is Published.

The lab page is generated from the README files by scripts/build-lab-page. Experiment cards show only the name, stage and Public line columns of LAB.md's tables; other columns stay internal. Rows marked 'hidden' are left off the page.
