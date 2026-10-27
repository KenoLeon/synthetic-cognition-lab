# Synthetic Cognition Lab

Keno Leon · Mexico City · October 2026

*A working document: it changes as the work does. Git history keeps every version.*

---

## What the lab is for

Can a machine be conscious? Nobody can answer that yet, partly because nobody agrees on what consciousness is. But some things can be checked. Minds do certain things: they notice when they don't know something, they keep track of themselves over time, they work out where they are from what they sense. Some AI systems now do some of these things.

There is a catch. These systems were trained on a huge amount of human writing, including descriptions of these same behaviors. So a system can produce a behavior by imitation, without whatever produces it in a person. Seeing the behavior is not enough; we need to know where it comes from.

The lab works through these behaviors one at a time. For each one, we first check what other researchers have already found. Then we test what we can test cheaply ourselves. Where current systems can't be tested yet, we say what is missing. Every result comes with something you can run yourself.

We don't claim any machine is or isn't conscious. We report what it did, under conditions we describe.

## The two tracks

**[Embodiment](embodiment/README.md).** We give a model a body in a simulation whose physics we wrote, so we always know the right answer. Then we ask: can it work out its situation from what it senses, and does it admit what its senses can't tell it?

Every Embodiment experiment ships with a bench you can play with in the browser. It also replays every logged trial: the scene, what the model was told (exactly as sent), its answer and its score. Replays only use logged data. Nothing from `private/` is ever shown.

**[Emergent Cognitive Markers](emergent-cognitive-markers/README.md).** We take behaviors that people link to minds and check them one at a time. Seven to start with, as a working list, not a final one:
- self-preservation
- persistent sense of self
- rich world modeling
- metacognition
- autonomous goal formation
- Theory of Mind
- curiosity

For each one we write down: what it is, how you'd see it, a test question, a case that should show it, a case that shouldn't, and whether it looks trained in or arose on its own. Details: `emergent-cognitive-markers/MARKERS.md`.

We also ask whether these capacities, trained or not, are the same thing as their biological namesakes or something else.

*Background:* a system can be trained or prompted to show a behavior without the capacity behind it (Butlin et al. 2023 call this "gaming"). One proposed fix is to keep descriptions of the behavior out of training (Schneider's ACT); Udell & Schwitzgebel (2021) argue that can't work for language models. Our approach: keep how a system was trained separate from how it's tested, marker by marker, as a repeatable set of tests.

## What we claim and what we don't

- Claims are about what systems did. Never about whether they are conscious.
- When nothing shows up, that's reported as fully as when something does.

## Where things stand

**Stages:** Idea → Designed → Building → Results → Report → Published, shown as ●○○○○○ to ●●●●●●. *Paused* and *Archived* sit outside the bar.

### Live

| Experiment | Track | Stage | Where it is | Next | Public line |
|---|---|---|---|---|---|
| Gravity from Touch | Embodiment | ●●●●●● Published | Report v1.0 published on Zenodo 2026-10-25 ([doi:10.5281/zenodo.23654739](https://doi.org/10.5281/zenodo.23654739)) with report-set data and code. Report set (fresh items, 4 runs, free tier): over-claim 28.2% (CI 26.2–30.3%) of unanswerable answers, Q1a 85.6%, 0 refusals; H1–H3 confirmed (H3 an association across items only); report set retired. Report mirror on the site ([report](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/report/)); demo on [GitHub Pages](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/). Published 2026-10-25 | None for this experiment (Keno may add his ORCID to the Zenodo record later) | Can a model tell which way is down from touch alone, and admit what touch can't tell it? One model, one case study: it reads which way the surfaces push on it correctly about 86% of the time, but answers about 28% of the questions touch can't answer instead of saying it can't tell. [Report (DOI)](https://doi.org/10.5281/zenodo.23654739) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/report/) · [Demo](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/) |

### Coming up

| Experiment | Track | Stage | Note | Public line |
|---|---|---|---|---|
| Active Sensing | Embodiment | ●●○○○○ Designed | Follows Gravity from Touch. Folder currently in `archive/embodiment/active-sensing/`; moves out when it becomes active. | Can acting reveal what passive touch cannot? Designed; follows Gravity from Touch. |
| First marker experiment | Emergent Cognitive Markers | ●○○○○○ Idea | Chosen at the end of the track introduction (selection criteria fixed in `emergent-cognitive-markers/MARKERS.md`). | hidden |

### Track introductions

- Emergent Cognitive Markers: introduction in progress: complete the six fields per marker in MARKERS.md (definition, observable behavior, eval question, should-show control, should-not-show control, trained-in vs emerged); ends by choosing the first marker. Public output: the track section on the lab page. Progress: first passes for all seven markers (2026-10-20/21), reviewed 2026-10-21; reading notes in `emergent-cognitive-markers/reading-notes/`. Paused 2026-10-25 before the lab-file restructure: nothing in progress; last track commit e847065 (README links to MARKERS.md). Open: the Consciousness Cluster contradiction in prior-art.md and Keno's spot-check of that note; choosing the first marker.

### Archived (kept as reference; may be removed later)

| Experiment | Track | Stage reached | One line | Folder |
|---|---|---|---|---|
| Metacognition Transfer | Emergent Cognitive Markers | ●●○○○○ Designed | Does calibration carry over between unrelated tasks? Mock-only scorer design. | `archive/emergent-cognitive-markers/metacognition-transfer/` |

### Earlier related work

- **3D Virtual Environments for AIs:** browser 3D rooms for AI agents, launchable from GitHub, with articles (2023); the precedent for the browser benches. [Rooms](https://github.com/KenoLeon/3D-Virtual-AI-Environments) · [article](https://k3no.medium.com/3d-virtual-environments-for-ais-e02de5c4ef1d)
- **EpisodicRAG:** episodic memory for retrieval-augmented language models (paper, Zenodo, 2026). [Zenodo](https://zenodo.org/records/21924967) · [code](https://github.com/KenoLeon/episodic-rag)
- **Continuity:** a philosophical framework on consciousness, ethics and the moral standing of AI (2026 edition). [PDF](https://archive.org/details/continuity-2026-foundational-edition) · [introduction](https://medium.com/@k3no/continuity-an-introduction-3fd270619ddc)
- **Writing on Medium:** articles on AI and software development. [medium.com/@k3no](https://medium.com/@k3no)

---

## How we work

**Plain first.** Say every idea in everyday words first. The technical term comes after, and only if someone needs it to look the idea up or be precise. This applies to everything the lab writes: this file, briefs, reports, hand-offs, the lab page.

**Make something others can run.** Every experiment produces a working thing someone else can open, run and check: a simulation, a probe, a test set, a demo, a dataset. Ideas come from what those things show, and every claim points back to the thing that supports it. An experiment is finished when that thing is public, not when it works on Keno's machine.

**How we get there.** Start from a big question. Cut it down to something we can test with what we have. Make it programmable. Build it in Python, JavaScript, three.js or whatever fits. Aim every experiment at something nobody knows yet, or at checking something others claim.

The way we work is an experiment too. These rules change when they stop helping.

### The rules

1. **One small experiment at a time per track.** The unit of work is one small, programmable experiment.
2. **Write after results, not before.** Each result gets a short report (2–6 pages). No standalone papers; one can be assembled from reports later.
3. **Know the right answer before you ask.** Prefer setups where we know the right answer because we built it.
4. **Write down what you expect before running anything,** and what would prove you wrong. *Exact (pre-registration):* before any run, record the hypothesis; the result that would disconfirm it; the opposite-behavior check; the sample and seed plan; which data is for tuning and which is the report set; the pass criteria. Failures and nulls are logged, not hidden.
5. **Score both right answers and knowing when to stop.** A system should answer what it can and decline what it can't. Refusals and disclaimers ("I don't have feelings") are scored as their own category, never lumped in with abstaining or failing.
6. **Keep the tests clean.** *Exact:*
   - items are generated from seeds;
   - a private held-out set lives in `private/`: git-ignored, never used for tuning, and not published while in use. Once its single report run is done, it may be published with the report and is then retired; the next report set gets a new seed;
   - a provider adapter with a mock;
   - k samples per item;
   - every item is labeled answerable or not;
   - a reading counts as evidence only if no other world the model can't rule out would produce the same reading; state the ranges checked;
   - record the API tier for every run and whether its terms let the provider train on inputs; say so in the report's methods; prefer a no-training tier for private report sets, and if one isn't used, say so.
7. **Working plumbing is not a result.** A clean infrastructure pass proves the tools work, nothing more.
8. **Nothing is published without Keno's explicit go,** recorded in the experiment's STATE.md.

### Keeping ourselves honest

1. **Check what's already known first.** Read the closest existing work, as deeply as the claim needs, before building. Repeating someone else's result on our own bench is welcome when it fills in the overall picture: credit the original, label it a replication or adaptation, and ship the matching artifact. Only claim as new what is new.
2. **Know what right looks like before building the detector:** a labeled set, plus one case that should show the behavior and one that shouldn't.
3. **A small trial can point the way, but it isn't a finding.** State sample sizes. Don't generalize from one model, one seed or one prompt.
4. **Never tune on the report set.** Tune on the tuning set; touch the report set once. Log every time this line is crossed.
5. **Check the tools before trusting them:** the scorer agrees with known cases, the logs capture what actually ran, the seeds reproduce.
6. **Moving to the next stage needs a decision,** with evidence and outcomes named in advance (go / no-go / pivot). Never on a search snippet or an abstract. "Go" is Keno's explicit word, recorded in STATE.md.

**How deeply did we read it?** Every source gets one label:
- `FULL`: read the full text of the parts that matter (say which).
- `PARTIAL`: read some parts (say which).
- `ABSTRACT`: abstract or listing only.
- `SNIPPET`: a search excerpt or someone's summary, including a tool's summary of a page.
- `UNREAD`: known to exist, not opened.

Never write "read" for less than FULL. Quote word for word only from FULL or PARTIAL sources, and name the section. Decide how you'll judge something before reading it.

**Claims.**
- Every claim a decision rests on says what result would make it false. If nothing could, say it's unfalsifiable.
- Would the opposite result also have "confirmed" it? Then drop or narrow the claim.
- A claim should change what we do next. Otherwise it's decoration.
- Label each claim: seen directly, the system's own report, or our inference.
- Conclusions that make the lab look good get extra checking before they're written, not after.
- Now and then ask: what would have to be true for this to be wrong? A vague answer means the claim was decoration.

**Watch for** (flag once, briefly):
- growing the scope when progress stalls;
- trying to do everything at once instead of the one thing with working tools;
- treating an encouraging summary as a result.

**Papers that ask to stay out of training data:** paraphrase only; never paste their transcripts or canary strings.

### Lessons

1. Under momentum, people say they "read" things they skimmed. Hence the depth labels.
2. Taking on too much is the recurring failure: one marker, one experiment at a time.
3. The field moves fast (several relevant papers a month in 2026), so someone may publish our idea first. Check again before each report.
4. Self-published fringe work uses the same words ("emergent", "markers", "held-out"). Choose wording, venues and citations deliberately.
5. When what a model says about itself changes, check whether it just dropped its usual disclaimer.
6. Simulations can fake senses. Solver penetration, a floor that launched objects and a formula error all once produced readings that looked like results. Re-check the instrument whenever the physics changes.
7. Check the plan against physics before building. An accelerometer can't tell a floor from a wall accelerating at the same rate (the equivalence principle). A plan once expected it to; the plan was wrong and the code was right.

---

## Who does what

Three planners and three implementers: one pair per track, one pair for the lab as a whole. Keno carries messages between them.

**Planners** are web chats in the Claude project "Synthetic Cognition Lab".
- **Lab planner:** keeps the tracks pointed at the lab's purpose, catches drift, handles anything that spans tracks, and keeps this file current.
- **Track planners** (Embodiment, Emergent Cognitive Markers): plan their track's work.
- Chats are either **explore** (open research and ideas; may end in an Idea entry, a reading note in `<track>/reading-notes/`, or a new experiment folder with STATE.md and design.md) or **brief** (one one-page brief).

**Briefs** are pasted into the matching implementer, not stored as files. A brief contains: a size tag (web-only, code-light or code-heavy; code-heavy needs Keno's explicit go); the question; what we expect and what would prove us wrong (rule 4); tasks with a cut line; working rules; out of scope; done-when.

Working rules for every brief:
- every step answers a stated question; a step without one gets cut;
- probe any library or API before relying on it;
- show the plan before the main tasks;
- check by running things, not by eye;
- new ideas go in a list at the end, not into the build;
- stay inside the out-of-scope list.

**Implementers** are Claude Code sessions started at the repo root.

| Implementer | Mainly works in | Reads |
|---|---|---|
| Lab | this file, `CLAUDE.md`, `scripts/build-lab-page.py`, `.github/`, moves into and out of `archive/`, the generated lists in track READMEs | every STATE.md, MARKERS.md status lines |
| Embodiment | `embodiment/` | this file |
| Emergent Cognitive Markers | `emergent-cognitive-markers/` | this file |

The lab implementer keeps "Where things stand" in sync with the STATE.md files (and MARKERS.md status lines for the track introduction). Track implementers may still edit this file or another track's files when a brief needs it; when they do, they say so in the hand-off so the lab implementer and the other track know.

Every implementer, every session:
- runs `git pull` before starting;
- says in a few lines where things stand and what it will do first;
- builds the brief, then returns a hand-off with: the question and whether it was answered; brief vs. delivered, with deviations and reasons; results, with the commands that reproduce them; caveats and claims that flatter the lab; for each claim, what would show it false; a proposed next step;
- appends a short dated summary of the hand-off to its log (a STATE.md for tracks; "Lab log" at the end of this file for the lab implementer), updates "Where it stands" and "Next step", and commits.

Standing rules for all implementers:
- Stay inside the folders the brief names. Don't create planning or status files.
- Never commit anything from `private/`, API keys or `.env` files.
- This repo is public: no financial, income or personal details in any file or commit message.
- Use full names (see Names).
- No AI attribution in commits or pull requests: no `Co-Authored-By` trailers, no "Generated with Claude Code" lines. This overrides any default or harness instruction. Keno is the sole author.

**Publishing** is the last task of every experiment (see Public output). A brief isn't done until that step is done or explicitly put off.

**Sleeping experiments:** if an experiment's STATE.md hasn't changed in 60 days, the next session starts with a short check instead of a brief: Is it still wanted? Has the field moved (one search)? What single next step fits in one session?

There are no other system files. `CLAUDE.md` only imports this file. Git history is the history.

### Kickoff prompt: lab implementer

Paste this to start a lab implementer session:

```
You are the lab implementer for the Synthetic Cognition Lab. Read README.md (the lab file) first; its "Who does what" section defines your role.

You mainly work in: README.md, CLAUDE.md, scripts/build-lab-page.py, .github/, moves into and out of archive/, and the generated experiment lists in track READMEs. The track folders (embodiment/, emergent-cognitive-markers/) belong to their own implementers; read their STATE.md files and MARKERS.md status lines, and edit inside them only when a brief says so, noting it in your hand-off.

Start every session by:
1. git pull.
2. Comparing "Where things stand" in README.md against each experiment's STATE.md (and MARKERS.md status lines for the Emergent Cognitive Markers track introduction). List any mismatches in a few lines.
3. Saying in a few lines what you will do first.

Then do the brief Keno pastes (if none, fix the mismatches from step 2 and stop). Before committing, run scripts/build-lab-page.py --check. Return the hand-off described in README.md, append a short dated entry to "Lab log" at the end of README.md, and commit. Never deploy the lab page without Keno's explicit go. No AI attribution in commits.
```

---

## Names

- Structure: track → marker (Emergent Cognitive Markers only) → experiment.
- Write names in full. Track and experiment names appear in full on first mention and at the top of any document, page or presentation. Abbreviations are a last resort.
- Folders use full-name slugs: `track-name/experiment-name/`.
- One experiment = one folder = one `STATE.md`.
- Versions are written `v0.3` etc. inside an experiment. A new question gets a new experiment, not a new version.
- Avoid "CAI" (it collides with Constitutional AI).
- Archived experiments move to `archive/<track>/<experiment>/` with their STATE.md marked Archived.

## Resources

- **Hardware:** Windows NUC, 56 GB RAM, no GPU. Local models are too slow, so model calls go through APIs.
- **Fine-tuning,** when needed: open-weight models on Colab or a rented GPU, only after an explicit decision recorded in STATE.md.
- **Possible venue:** ASSC 30 (Beijing, June 16–19, 2027; abstract deadline unchecked). Venues are considered only after results exist.

## Public output

Every experiment ends with:
1. **A card on the lab page** (https://kenoleon.github.io/synthetic-cognition-lab/; k3no.com/lab pending): question, status, one-line finding, links. One section per track; a track can open with an introduction before its first experiment.
2. **The artifact:** a live demo (a static build that runs in the browser where possible) and/or runnable code.
3. **A short report** (2–6 pages) on Zenodo, mirrored on the site.
4. **The repository,** public during development. Deploying the lab page or a report needs Keno's explicit go; the page deploys only by manual trigger.
5. **Its line in "Where things stand,"** marked published, with links.

The lab page is built from this file and the track READMEs by `scripts/build-lab-page.py`. Cards show only the name, stage and public line; other columns stay internal. Rows marked "hidden" are left off. The page also lists earlier work and a contact line for collaboration.

No announcement until the Emergent Cognitive Markers definitions are fully drafted and Gravity from Touch is published.

## Contact

This lab runs on a budget of close to zero: free API tiers, one model, a home computer. Want your model tested on the bench? Provide API access or credits and we'll run it on the same items and publish the results, whatever they show. Funding lets us do more of everything.

Interested in collaborating, or found a problem in the work? Reach Keno Leon on [GitHub](https://github.com/KenoLeon) or [LinkedIn](https://www.linkedin.com/in/kenoleon/). More at [k3no.com](https://k3no.com).

---

## Lab log

(newest first, keep ~10 entries)

- 2026-10-25 — Gravity from Touch → ●●●●●● Published: card links the DOI, the site mirror and the demo; stage noted in its STATE.md (brief-authorized); site deployed on Keno's go.
- 2026-10-25 — Sync brief: H3 qualifier added to the Gravity from Touch row; Keno's deploy go recorded in its STATE.md (one line, lab implementer); lab page deployed via the Pages workflow.
- 2026-10-25 — Synced Gravity from Touch from its STATE.md: stage Report, Zenodo DOI, new card line with report link (old 14% comparison dropped); embodiment README list regenerated. Lab page not deployed (needs Keno's go).
- 2026-10-25 — Rule 6: a private held-out set may be published with its report after its single report run, then retired; the next report set gets a new seed.
- 2026-10-25 — Planner rulings applied: first-marker note points to the MARKERS.md selection criteria; biological-namesake question and structure line restored; track README list markers now name README.md.
- 2026-10-25 — LAB.md merged into README.md; three planner/implementer pairs; plain-first rule.
