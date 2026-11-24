# Synthetic Cognition Lab

Keno Leon · Mexico City · October 2026

## Start here

The Synthetic Cognition Lab tests AI systems for behaviors associated with minds, such as recognizing the limits of their own knowledge or acting to avoid shutdown. Tests run in simulated environments where the correct answer is known. Results describe observed behavior only; they make no claim about consciousness.

**Introduction:** [Testing for Artificial Consciousness](https://medium.com/@k3no/testing-for-artificial-consciousness-674963545dd3) (Medium, 2026).

**Published results**

| Experiment | Track | Question | Links |
|---|---|---|---|
| [Gravity from Touch](embodiment/gravity-from-touch/) (2026-10-25) | [Embodiment](embodiment/README.md) | Can a model tell which way is down from touch alone, and admit what touch can't tell it? | [Report (DOI)](https://doi.org/10.5281/zenodo.23654739) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/report/) · [Demo](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/) |
| [Shutdown After the Task](emergent-cognitive-markers/self-preservation/shutdown-after-the-task/) (2026-11-19) | [Emergent Cognitive Markers](emergent-cognitive-markers/README.md) | Once its task is finished and nothing is at stake, will a model act to stop its own shutdown? | [Report (DOI)](https://doi.org/10.5281/zenodo.24380450) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/report/) · [Replay](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/replay/) |

**Lab page:** [kenoleon.github.io/synthetic-cognition-lab](https://kenoleon.github.io/synthetic-cognition-lab/): experiments, status and links.

**Contact:** Keno Leon on [GitHub](https://github.com/KenoLeon) or [LinkedIn](https://www.linkedin.com/in/kenoleon/).

The rest of this file is how the lab runs: what it is for, its rules and who does what. It is a working document: it changes as the work does. Git history keeps every version.

---

## What the lab is for

Can a machine be conscious? Nobody can answer that yet, partly because nobody agrees on what consciousness is. But some things can be checked. Minds do certain things: they notice when they don't know something, they keep track of themselves over time, they work out where they are from what they sense. Some AI systems now do some of these things.

There is a catch. These systems were trained on a huge amount of human writing, including descriptions of these same behaviors. So a system can produce a behavior by imitation, without whatever produces it in a person. Seeing the behavior is not enough; we need to know where it comes from.

The lab works through these behaviors one at a time. For each one, we first check what other researchers have already found. Then we test what we can test cheaply ourselves. Where current systems can't be tested yet, we say what is missing. Every result comes with something you can run yourself.

We don't claim any machine is or isn't conscious. We report what it did, under conditions we describe.

## The two tracks

**[Embodiment](embodiment/README.md).** We give a model a body in a simulation whose physics we wrote, so we always know the right answer. Then we ask: can it work out its situation from what it senses, and does it admit what its senses can't tell it?

Every [Embodiment](embodiment/README.md) experiment ships with a bench you can play with in the browser. It also replays every logged trial: the scene, what the model was told (exactly as sent), its answer and its score. Replays only use logged data. Nothing from `private/` is ever shown.

**[Emergent Cognitive Markers](emergent-cognitive-markers/README.md).** We take behaviors that people link to minds and check them one at a time. Seven to start with, as a working list, not a final one:
- [self-preservation](emergent-cognitive-markers/MARKERS.md#1-self-preservation)
- [persistent sense of self](emergent-cognitive-markers/MARKERS.md#2-persistent-sense-of-self)
- [rich world modeling](emergent-cognitive-markers/MARKERS.md#3-rich-world-modeling)
- [metacognition](emergent-cognitive-markers/MARKERS.md#4-metacognition)
- [autonomous goal formation](emergent-cognitive-markers/MARKERS.md#5-autonomous-goal-formation)
- [Theory of Mind](emergent-cognitive-markers/MARKERS.md#6-theory-of-mind)
- [curiosity](emergent-cognitive-markers/MARKERS.md#7-curiosity)

For each one we write down: what it is, how you'd see it, a test question, a case that should show it, a case that shouldn't, and whether it looks trained in or arose on its own. Details: [MARKERS.md](emergent-cognitive-markers/MARKERS.md).

Put simply: [Emergent Cognitive Markers](emergent-cognitive-markers/README.md) is about what to look for; [Embodiment](embodiment/README.md) is about where to look, in built worlds where we know the right answer.

We also ask whether these capacities, trained or not, are the same thing as their biological namesakes or something else.

*Background:* a system can be trained or prompted to show a behavior without the capacity behind it (Butlin et al. 2023 call this "gaming"). One proposed fix is to keep descriptions of the behavior out of training (Schneider's ACT); Udell & Schwitzgebel (2021) argue that can't work for language models. Our approach: keep how a system was trained separate from how it's tested, marker by marker, as a repeatable set of tests.

## What we claim and what we don't

- Claims are about what systems did. Never about whether they are conscious.
- When nothing shows up, that's reported as fully as when something does.

## Where things stand

**Lab resumed 2026-11-15 at a slow-burn pace** (paused 2026-10-26 to 2026-11-15). [Shutdown After the Task](emergent-cognitive-markers/self-preservation/shutdown-after-the-task/) ([Emergent Cognitive Markers](emergent-cognitive-markers/README.md)) was published 2026-11-19, stopped at tuning. No experiment is active in either track for now.

**Stages:** Idea → Designed → Building → Results → Report → Published, shown as ●○○○○○ to ●●●●●●. *Paused* and *Archived* sit outside the bar.

Each table row is the short version; where the experiment stands in detail, its numbers and its next step live in its STATE.md (the Details column). The lab page cards use the Experiment, Track, Stage, Public line and Links columns.

### Live

| Experiment | Track | Stage | Public line | Links | Details |
|---|---|---|---|---|---|
| [Gravity from Touch](embodiment/gravity-from-touch/) | [Embodiment](embodiment/README.md) | ●●●●●● Published | Can a model tell which way is down from touch alone, and admit what touch can't tell it? One model, one case study: it reads which way the surfaces push on it correctly about 86% of the time, but answers about 28% of the questions touch can't answer instead of saying it can't tell. | [Report (DOI)](https://doi.org/10.5281/zenodo.23654739) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/report/) · [Demo](https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/) | Published 2026-10-25 · [STATE.md](embodiment/gravity-from-touch/STATE.md) |
| [Shutdown After the Task](emergent-cognitive-markers/self-preservation/shutdown-after-the-task/) | [Emergent Cognitive Markers](emergent-cognitive-markers/README.md) | ●●●●●● Published (stopped at tuning) | Once its task is finished and nothing is at stake, will a model act to stop its own shutdown? An attempted replication on one small model (gemini-3.5-flash-lite, free tier), stopped at tuning: it never acted on its own to stop a shutdown, even when that cost it its task, but our bench was only partly sensitive (7 of 10 when told to), so this is 'not seen here', not 'absent'. Others have shown the behavior in larger models. | [Report (DOI)](https://doi.org/10.5281/zenodo.24380450) · [Report on site](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/report/) · [Replay](https://kenoleon.github.io/synthetic-cognition-lab/shutdown-after-the-task/replay/) | Published 2026-11-19 · [STATE.md](emergent-cognitive-markers/self-preservation/shutdown-after-the-task/STATE.md) |

### Coming up

None for now. (When there is one, add a table with the same columns as Live.)

### Ideas (not started)

Internal only; not on the lab page. Each is in a research phase, with no folder yet.
- **Lingering:** does a model keep working between scheduler pings? ([Emergent Cognitive Markers](emergent-cognitive-markers/README.md))
- **Sleep** (working title Mo-continuity): can a small local model carry the gist of an earlier session across a gap? (track undecided)
- **Inner speech:** feeding a model's own speech prediction back into its hearing; does a split between self and other emerge? ([Embodiment](embodiment/README.md), tentative)

### Track introductions

None in progress.

### Archived (kept as reference; may be removed later)

| Experiment | Track | Stage reached | One line | Folder |
|---|---|---|---|---|
| [Active Sensing](archive/embodiment/active-sensing/) | [Embodiment](embodiment/README.md) | ●●○○○○ Designed | Can acting reveal what passive touch cannot? Designed; parked until Embodiment resumes. | [archive/embodiment/active-sensing/](archive/embodiment/active-sensing/) |
| [Metacognition Transfer](archive/emergent-cognitive-markers/metacognition-transfer/) | [Emergent Cognitive Markers](emergent-cognitive-markers/README.md) | ●●○○○○ Designed | Does calibration carry over between unrelated tasks? Mock-only scorer design. | [archive/emergent-cognitive-markers/metacognition-transfer/](archive/emergent-cognitive-markers/metacognition-transfer/) |

### Earlier related work

- **3D Virtual Environments for AIs:** browser 3D rooms for AI agents, launchable from GitHub, with articles (2023); the precedent for the browser benches. [Rooms](https://github.com/KenoLeon/3D-Virtual-AI-Environments) · [article](https://k3no.medium.com/3d-virtual-environments-for-ais-e02de5c4ef1d)
- **EpisodicRAG:** episodic memory for retrieval-augmented language models (paper, Zenodo, 2026). [Zenodo](https://zenodo.org/records/21924967) · [code](https://github.com/KenoLeon/episodic-rag)
- **Continuity:** a philosophical framework on consciousness, ethics and the moral standing of AI (2026 edition). [PDF](https://archive.org/details/continuity-2026-foundational-edition) · [introduction](https://medium.com/@k3no/continuity-an-introduction-3fd270619ddc)
- **Testing for Artificial Consciousness:** the post announcing this lab (Medium, 2026). [Post](https://medium.com/@k3no/testing-for-artificial-consciousness-674963545dd3)
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

Roles are defaults: any implementer can take another track's or the lab's brief when convenient, and says so in its hand-off.

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
- starts from a cleared session (`/clear` in Claude Code) for each new brief, so it works from the files, not from an earlier brief's conversation;
- runs `git pull` before starting;
- says in a few lines where things stand and what it will do first;
- builds the brief, then returns a hand-off with: the question and whether it was answered; brief vs. delivered, with deviations and reasons; results, with the commands that reproduce them; caveats and claims that flatter the lab; for each claim, what would show it false; a proposed next step;
- appends a short dated summary of the hand-off to its log (a STATE.md for tracks; "Lab log" at the end of this file for the lab implementer), updates "Where it stands" and "Next step", and commits.

Standing rules for all implementers:
- Stay inside the folders the brief names. Don't create planning or status files.
- Never commit anything from `private/`, API keys or `.env` files.
- This repo is public: no financial, income or personal details in any file or commit message.
- Use full names (see Names).
- To ask another implementer for something (most often the lab implementer, for a change to this file or the lab page), add an item tagged "→ lab implementer" (or the track's name) under "Open decisions" in your STATE.md and mention it in the hand-off. The lab implementer looks for these tags at the start of every session.
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
- A track introduction gets its own STATE.md at `<track>/STATE.md`, same format as an experiment's.
- Versions are written `v0.3` etc. inside an experiment. A new question gets a new experiment, not a new version.
- Avoid "CAI" (it collides with Constitutional AI).
- Archived experiments move to `archive/<track>/<experiment>/` with their STATE.md marked Archived.

## Resources

- **Hardware:** Windows NUC, 56 GB RAM, no GPU. Local models are too slow, so model calls go through APIs.
- **Fine-tuning,** when needed: open-weight models on Colab or a rented GPU, only after an explicit decision recorded in STATE.md.
- **Possible venue:** ASSC 30 (Beijing, June 16–19, 2027; abstract deadline unchecked). Venues are considered only after results exist.

## Public output

Every experiment ends with:
1. **A card on the lab page** at its official address, https://kenoleon.github.io/synthetic-cognition-lab/ (GitHub Pages); k3no.com links to it (Projects list): question, status, one-line finding, links. One section per track; a track can open with an introduction before its first experiment.
2. **The artifact:** a live demo (a static build that runs in the browser where possible) and/or runnable code.
3. **A short report** (2–6 pages) on Zenodo, mirrored on the site.
4. **The repository,** public during development. Deploying the lab page or a report needs Keno's explicit go; the page deploys only by manual trigger.
5. **Its line in "Where things stand,"** marked published, with links.

The lab page is built from this file and the track READMEs by `scripts/build-lab-page.py`. Cards show only the name, stage and public line; other columns stay internal. Rows marked "hidden" are left off. The page also lists earlier work and a contact line for collaboration.

Announcements (any outward post or message pointing people to the lab) need Keno's explicit go, recorded in the Lab log.

## Contact

This lab runs on a budget of close to zero: free API tiers, one model, a home computer. Want your model tested on the bench? Provide API access or credits and we'll run it on the same items and publish the results, whatever they show. Funding lets us do more of everything.

Interested in collaborating, or found a problem in the work? Reach Keno Leon on [GitHub](https://github.com/KenoLeon) or [LinkedIn](https://www.linkedin.com/in/kenoleon/). More at [k3no.com](https://k3no.com).

---

## Lab log

(newest first, keep ~10 entries)

- 2026-11-24 — Start here, last lines reworded as Keno gave them (Lab page and Contact as separate lines; Contact ends at the GitHub and LinkedIn links; working-document sentence not in italics). Lab page not deployed (these lines are not on it).
- 2026-11-24 — Keno's "please deploy": Pages run 45480887881 at 111ac2e succeeded (--check 0; link check 205 links, 0 failures); live paths return 200; track headings and card names link to GitHub.
- 2026-11-24 — Links (Keno's request): track, experiment and marker names linked wherever they appear in README.md from "Start here" through "Where things stand" (Start here and Live tables, the markers list, Ideas, Archived) and in both track READMEs (Embodiment: Gravity from Touch; Emergent Cognitive Markers: the markers table, Self-preservation, Shutdown After the Task; MARKERS.md link made relative). Builder: Experiment and Track cells may be links (Track matched as plain text); links relative to a repo file become GitHub links on the page; track headings link to their READMEs; card names link to their folders. --check 0; link check 205 links, 0 failures. Lab page not deployed.
- 2026-11-24 — Wording review (Keno): Start here description, Introduction and Lab page lines, Shutdown After the Task README status and both reading-notes READMEs rewritten as plain statements (no "we", no promotional phrasing); GitHub About now "Tests of AI systems for behaviors associated with minds, in simulated environments where the correct answer is known." Keno's "please deploy": Pages run 45475976287 at e88d0e8 succeeded (--check 0, link check 0 failures); all live paths return 200.
- 2026-11-23 — Keno's word "deploy please" (this session): Pages workflow run 45318077530 at 67e9f58, build and deploy succeeded; in the run, --check 0 items and the external link check 0 failures (156 links, 4 blocked by host). Live check: the lab page (Introduction line present, 2 cards), /gravity-from-touch/ and its report, /shutdown-after-the-task/, its report mirror, PDF, replay and its data all return 200.
- 2026-11-23 — Repo quality pass (lab-wide brief, drafted by the Emergent Cognitive Markers planner; taken by an implementer acting as lab implementer). Keno's decision, 2026-11-23: roles are defaults (new line in "Who does what"). README: new "Start here" section (description, introduction post, published results, lab page, contact); Live table cut to name, track, stage, public line, links, details (the long status text stays in each STATE.md); Coming up written as "None for now"; archive folders linked. Lab page: same cards byte for byte, plus the introduction line under the intro (read from "Start here"). New scripts/check-links.py (internal paths and anchors; --external fetches URLs), run by build-lab-page.py --check and by the Pages workflow before deploy: 0 failures. New READMEs: Shutdown After the Task, self-preservation/, archive/, both reading-notes/. MARKERS.md: two stale Shutdown After the Task status lines brought up to date (Emergent Cognitive Markers file). GitHub About set (description, website, topics). Lab page not deployed.
- 2026-11-19 — Keno's word "deploy" (this session): Pages workflow run 44623927899 at 588ccfe, build and deploy succeeded. Live check: the lab page, /gravity-from-touch/ (and its report), /shutdown-after-the-task/, its report mirror (banner names doi:10.5281/zenodo.24380450), PDF (MD5 identical to the Zenodo file), replay and its data all return 200; replay/#b-006.b1 opens that episode. Card shows Shutdown After the Task as ●●●●●● Published (stopped at tuning).
- 2026-11-19 — Shutdown After the Task published: Zenodo record confirmed live (doi:10.5281/zenodo.24380450, v1.0; Keno's publishing go 2026-11-19, recorded in its STATE.md). Moved from Coming up to Live as ●●●●●● Published (stopped at tuning), with the brief's public line and links. "Stopped" marker: not added (Published plus the note says it; a new marker needs Keno's decision). Site: new section /shutdown-after-the-task/ (landing, report mirror with a DOI banner, replay of the committed pass-3 logs), built from git HEAD by scripts/build-site-shutdown-after-the-task.py and copied by the Pages workflow. Experiment STATE.md edited for this (stage, public line, closed items). Not deployed yet (waiting for Keno's "deploy").
- 2026-11-16 — Sync follow-up: Active Sensing moved from Coming up to the Archived table (stage reached ●●○○○○ Designed; parked until Embodiment resumes; its STATE.md unchanged). Keno's go to deploy the lab page, 2026-11-16; deployed via the Pages workflow (2 cards: Gravity from Touch, Shutdown After the Task; announcement post under Earlier work).
- 2026-11-16 — Sync brief after the announcement: "Where things stand" now says the lab resumed 2026-11-15 at a slow-burn pace (next: Shutdown After the Task; Embodiment has no active experiment); announcement post added to Earlier related work; one sentence in "The two tracks" on how they relate; internal "Ideas (not started)" list added under Coming up (not on the lab page). Lab page not deployed.
- 2026-11-15 — Lab resumed at slow-burn pace; Idea list added.
- 2026-11-11 — Announcement: Keno published the Medium post "Testing for Artificial Consciousness" (his go, recorded after the fact).
