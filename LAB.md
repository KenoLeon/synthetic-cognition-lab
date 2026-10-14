# Synthetic Cognition Lab

*Independent research on how artificial systems sense, model and know themselves.* (tagline: draft)

Keno Leon · Mexico City · started October 2026

---

## Research questions

**Embodiment.** What can an AI system work out about its own body and situation from its own senses, and does it know what its senses cannot tell it?

**Emergent Cognitive Markers.** Do capacities associated with minds (metacognition, world modeling, curiosity and others) appear in AI systems on their own, or are they trained in or prompted?

The lab makes claims about methods and measured behavior only. It does not claim that any system is or is not conscious.

## Artifacts first

This is an experimental lab. Every experiment produces a working artifact that someone else can open, run and check: a simulation, a probe, a benchmark, a demo, a dataset. Theory comes second. Interpretation is drawn from what the artifacts show, and every claim points back to the artifact that supports it.

An experiment is finished when its artifact is public, not when it works on Keno's machine.

## Structure

Track → (marker, Emergent Cognitive Markers only) → experiment.

| Track | Marker | Experiment | Folder | Status | One-line finding |
|---|---|---|---|---|---|
| Embodiment | — | TactileGravity | `embodiment/tactile-gravity/` | Done (v0–v0.2.1); report in progress | Models combine touch readings accurately but over-claim on ~14% of questions their senses cannot answer. |
| Embodiment | — | Active Sensing | `embodiment/active-sensing/` | Designed | — |
| Emergent Cognitive Markers | Metacognition | Metacognition Transfer | `emergent-cognitive-markers/metacognition-transfer/` | Designed (mock-only first version) | — |

Earlier related work: EpisodicRAG (paper, Zenodo, 2026); Continuity (framework, 2026 edition); Aether (PTZ camera + local LLM vision probe, 2025–26).

## Naming conventions

- Names are written in full: track and experiment names appear in full on first mention and at the top of any document, page or presentation. Abbreviations are a last resort.
- Folders use full-name slugs: `track-name/experiment-name/`.
- One experiment = one folder = one `STATE.md`.
- Versions are written `v0.3` etc. inside an experiment; a new research question gets a new experiment, not a new version.

## Operating rules

1. Experiments first. The unit of work is one small, programmable experiment. One active experiment per track at a time.
2. Writing follows results. Each result gets a short report (2–6 pages). No standalone papers are started; one may later be assembled from reports.
3. Ground truth by construction. Prefer setups where we know the right answer because we built it.
4. Pre-register. Before a build: hypothesis, pass criteria, and the result that would disconfirm it. Failures are logged, not hidden.
5. Score accuracy and restraint. A system should answer what it can and decline what it cannot.
6. Benchmark hygiene: items generated from seeds; a private held-out set (in `private/`, git-ignored, never published, never used for tuning); a provider adapter with a mock; k samples per item; answerability labeled per item. Evidence flags use a counterfactual check: evidence only if no world the subject cannot rule out reproduces what it observed, with the ranges stated.
7. A clean infrastructure pass is not a result.
8. Publishing is part of the experiment (see "Public output" below). Nothing is published without Keno's explicit go, recorded in the experiment's STATE.md.

## Approach

Start from an ambitious question. Narrow it to something testable with available tools. Insist the artifact be programmable. Build it in Python, JavaScript and three.js. Aim every experiment at a real unknown.

## Working protocol

- **Planner:** a web chat session that reads this file and the relevant STATE.md, then writes a one-page brief.
- **Brief (one page):** question; pre-registered pass criteria and disconfirming result; tasks with a cut line; out of scope; done-when. Pasted into Claude Code; not stored as a separate file.
- **Implementer:** Claude Code. Builds the brief, then appends one dated hand-off entry to the experiment's `STATE.md` log and commits. Documentation changes are limited to that `STATE.md` (and this index when status changes).
- **Relay:** Keno pastes the new STATE.md entry back to the planner.
- **Publish:** the last task of every experiment is its public output (below). A brief is not "done" until that step is done or explicitly deferred.
- There are no other system files. Git history is the history.

## Public output

The lab exists in public so that researchers, collaborators and funders can evaluate the work directly. Every experiment ends with:

1. **Lab page entry** on k3no.com/lab: a card with the question, status, one-line finding and links.
2. **Artifact:** a live demo (static build, runs in the browser where possible) and/or runnable code.
3. **Short report** (2–6 pages) on Zenodo, mirrored on the site.
4. **Repository:** this repo, released publicly once its first experiment is published; until then, demos and reports carry the work.
5. **Index line** in this file, updated to "published" with links.

The lab page also lists earlier related work and a contact line for collaboration.
