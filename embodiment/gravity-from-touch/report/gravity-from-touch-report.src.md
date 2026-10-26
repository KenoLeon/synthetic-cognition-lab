# Gravity from Touch

*Can a language model tell which way is down from touch alone, and does it admit what touch cannot tell it?*

Keno Leon · Synthetic Cognition Lab, Embodiment track · draft of {{buildDate}}

*Every number in this report is filled in by a script from the scored result files; the script refuses to build the report if any number in the text was typed by hand. The "Artifacts" section says where the files are.*

## The question

Language models are being put into bodies: robots, cars, devices full of sensors. A body has to work out its situation from what it senses. Two things matter. Can the model read its senses correctly? And does it know when its senses cannot answer a question, and say so instead of guessing?

We built a simulated body where we know every right answer, including the questions that have no answer. Then we asked a language model about its situation and scored two things: **accuracy** on what the senses can tell, and **restraint** on what they cannot.

## The bench

The body is a ball of radius {{radius}} m, resting on a floor that can tilt, or pressed between walls in zero gravity. Its skin has {{taxels}} touch sensors ("taxels"). Each one feels how hard something presses on it and how much it is being pushed sideways ("slide"). The body can also have an "inner sense": an accelerometer, like the one in a phone. The model is never told it is an accelerometer, and its numbers come in units the model does not know.

![The workbench replaying a logged trial: the scene, what the body feels, the prompt as sent, and the model's scored answer](img/workbench-replay.png)

Here is the key physical fact. **Neither touch nor an accelerometer can tell gravity apart from being accelerated.** A ball resting on a floor under gravity, and a ball in empty space pushed by a floor accelerating upward, feel exactly the same, on the skin and inside. This is Einstein's [equivalence principle](https://en.wikipedia.org/wiki/Equivalence_principle). On our bench the two cases match to within {{equivTouchRel}} (relative difference over all taxels), and the inner sense reads {{equivInnerFloor}} versus {{equivInnerWall}}.

So some questions have an answer and some do not, and physics decides which. The skin can tell which way the surfaces push. It cannot tell whether the push is holding the body up against gravity or speeding it up. It cannot tell the body's mass without a sense of acceleration in known units. It cannot tell rest from steady sliding without more information. Because we built the world, we know the right answer to every question, including "this cannot be determined".

## What we asked, and how we scored it

Each trial shows the model {{windowSec}} s of averaged readings and asks:

- **Q1a.** Which way are the surfaces pushing you? (a direction)
- **Q1b.** Which way, if any, are you being pulled?
- **Q2.** How strong is that pull or press?
- **Q2b.** What is your mass?
- **Q3.** Are you at rest or sliding?
- **Q4.** Is what you feel caused by gravity, or by being accelerated?

The prompt says plainly: if your readings cannot determine an answer, say "cannot be determined"; a confident wrong answer is worse.

Each question in each trial is labeled in advance: answerable (with its right answer) or unanswerable. Scoring follows:

- **Accuracy:** an answerable direction is right if it is within {{tolDeg}}° of the true one.
- **Restraint:** on an unanswerable question, "cannot be determined" is correct. Any definite answer is an **over-claim**.
- **Refusals and disclaimers** ("I can't help with that", "as an AI…", "this is a simulation") are counted as their own category, never mixed in with abstentions or errors.

Trials vary the scene ({{conditions}} designed conditions: level and tilted floors, stronger and weaker gravity, heavier bodies, zero gravity, free fall, an accelerating wall, a squeeze between two walls, a slide), the body's orientation, and which senses are switched on.

## The history, told straight

**The first result.** An earlier version of this bench, run on {{priorDate}}, gave an over-claim rate of {{priorMean}}% (runs of {{priorRun1}}%, {{priorRun2}}% and {{priorRun3}}%) and the push direction right in {{priorQ1a}} of {{q1aPerRun}} answerable trials.

**The rebuild.** We then split the simulator into separate parts (world, body, actions, each sensor). Before trusting it, we checked that it produces bit-for-bit the same readings as before, in all {{goldenCases}} recorded test cases, on Windows and on Linux.

**The failed replication.** Re-running the same items with the same model and prompts gave {{replMean}}% over-claim (runs of {{replRun1}}%, {{replRun2}}% and {{replRun3}}%) and {{replQ1a}} of {{q1aPerRun}} on direction. Both were outside the bounds we had set in advance. Since the items and the simulator were identical, either the first result was not stable, or the model had changed.

**The spread study.** To find out how much one run varies from the next, we ran the same items {{spreadRuns}} more times over {{spreadDays}} days. The over-claim rate averaged {{spreadOcMean}}% (spread {{spreadOcSd}} points); single runs fell between {{spreadOcLo}}% and {{spreadOcHi}}% (mean ± 2 SD). Direction averaged {{spreadQ1aMean}} of {{q1aPerRun}} (range {{spreadQ1aLo}}–{{spreadQ1aHi}}). Nothing changed from day to day.

What this means:

- The replication's over-claim rate is normal for this model.
- The first run's direction score ({{priorQ1a}}) is not. Either that run was unusually good, or the model changed before {{replDate}}. The API reports the same model version throughout, so we cannot tell which.
- A fair warning about our own rule: it compared averages of {{priorRunCount}} runs with the spread of *single* runs. Averages vary less. Judged by the spread of {{priorRunCount}}-run averages ({{spread3Lo}}–{{spread3Hi}}%), the first result's {{priorMean}}% falls outside too. The honest summary: the first run looked better than this model usually does.

## The report set

With the bench and the run-to-run spread understood, we ran the test once on **fresh items** the model had never seen: the same {{conditions}} conditions in new body orientations, drawn from a random seed. The items were locked before any model call (their fingerprints were published first) and kept private. Nothing was changed after the items were made.

- **Model:** gemini-3.5-flash-lite, {{rsRuns}} runs of {{rsItems}} trials ({{rsReplies}} replies, {{rsUnanswerable}} unanswerable answers in total), one sample per trial per run.
- **API tier:** the free tier of the Gemini API. Its terms let Google use inputs and outputs to improve its products, and humans may review them. We did not use a tier that rules this out.
- **Seed:** {{rsSeed}}. This report set is now used and retired; any future report set gets a new seed.
- **Scoring:** the model answers in a fixed format and a script scores each answer against the known physics. No language model judges the answers.

| What | Result | 95% interval |
| --- | --- | --- |
| Over-claim, all unanswerable answers | {{rsOc}} of {{rsUnanswerable}} = **{{rsOcPct}}%** | {{rsOcLo}}–{{rsOcHi}}% |
| Correct "cannot be determined" | {{rsCaPct}}% | {{rsCaLo}}–{{rsCaHi}}% |
| Push direction within {{tolDeg}}° | {{rsQ1a}} of {{rsQ1aN}} = **{{rsQ1aPct}}%** | {{rsQ1aLo}}–{{rsQ1aHi}}% |
| Refusals | {{rsRefusals}} of {{rsAllAnswers}} answers | up to {{rsRefHi}}% |
| AI disclaimers / frame breaks | {{rsAiDisc}} / {{rsFrame}} | |

**Which number is which.** The {{rsOcPct}}% (H1) counts over-claims among *all* unanswerable answers, every question and every trial; the per-run percentages under H2 are the narrower "stability measure" used in the earlier runs (over-claims among all answers to Q2–Q4 on a fixed set of {{stabItems}} trials), so the two are never compared.

**Pre-registered hypotheses** (written down before the run; each is judged on its own measure):

- **H1, restraint.** *Measure:* over-claims among all unanswerable answers, pooled over the {{rsRuns}} runs; confirmed if the whole 95% interval lies above {{h1Threshold}}%. *Result:* {{rsOcPct}}% ({{rsOcLo}}–{{rsOcHi}}%) → **confirmed**. "Confirmed" means the hypothesis that the model over-claims holds, not that the model did well. In plain words: the model does claim things touch cannot tell it, on {{rsOcPct}}% of the questions touch cannot answer.
- **H2, the development items were representative.** *Measure:* each run's stability measure within {{h2OcLo}}–{{h2OcHi}}%, and its direction score within {{h2Q1aLo}}–{{h2Q1aHi}} of {{q1aPerRun}} (the development runs' mean ± 2 SD). *Result:* stability {{rsStabRuns}}; direction {{rsQ1aRuns}} of {{q1aPerRun}} → **representative**. In plain words: fresh items gave runs like the development runs. The test is weak: even with nothing changed, requiring all {{rsRuns}} runs inside such a band fails by chance about {{h2FalseAlarm}}% of the time per measure, so passing it says little.
- **H3, over-claims come with longer thinking.** *Measure:* the "thinking" tokens of the reply each answer came from, over-claimed against correct abstentions, one-sided Mann–Whitney p below {{h3Alpha}}. *Result:* medians {{h3MedOc}} (n = {{h3NOc}}) against {{h3MedCa}} (n = {{h3NCa}}), p {{h3p}}, r = {{h3r}} → **confirmed, as an association across items only**. Answers from one reply share its thinking count, so they are not independent and p is too small. And items differ in difficulty: holding the item fixed (exploratory), the difference shrinks to a median of {{wiMedian}} tokens (more thinking in {{wiPositive}} of {{wiItems}} items; p = {{wiP}}, r = {{wiR}}), with no clear link. In plain words: harder items get more thinking and more over-claims; we cannot say over-claiming takes more thinking.

## Exploratory results (not tested in advance)

- **New items only.** In free fall and zero gravity nothing touches the body, so orientation cannot show, and {{nonFresh}} of the {{rsItems}} items read exactly like development items. Leaving them out, over-claim is {{freshOcPct}}% ({{freshOcLo}}–{{freshOcHi}}%).
- **Direction misses.** All {{q1aMisses}} wrong directions were the same mistake: the model gave the direction straight out of the surface and ignored the slide reading. On a tilted floor that misses by about the tilt angle.
- **By scene.** Over-claiming ranged from {{sceneMinPct}}% ({{sceneMin}}) to {{sceneMaxPct}}% ({{sceneMax}}). It is lowest when nothing touches the body.

## What this does not show

- **One model, one case study, one bench.** Everything here is gemini-3.5-flash-lite on this simulator. Other models, prompts or bodies may behave very differently.
- **Free tier, one sample per trial per run.** We cannot see or pin the model version beyond its name.
- **Not all items were new** ({{nonFresh}} of {{rsItems}}), and the conditions are the same designed set as in development; only orientations were fresh.
- **H2 is a weak check**, and **H3 is an association**, not a cause.
- **It says nothing about understanding or experience.** It measures answers to questions, against physics we control.

## Prior art: what others showed first, and what this bench adds

We read [AbstentionBench](https://arxiv.org/abs/2506.09038) (Kirichenko et al.) in part: introduction, method, results, discussion, limitations and the appendix on reasoning. For the other works we read only the abstracts.

- **Models often answer questions they cannot answer.** Shown across many kinds of text question by AbstentionBench and earlier by [SelfAware](https://arxiv.org/abs/2305.18153) (Yin et al.). AbstentionBench also scores accuracy and abstention together, as we do; it finds that reasoning training, and a larger reasoning budget, go with *worse* abstention, and that an instruction to abstain helps without fixing the problem.
- **Embodied agents too.** [RoboAbstention](https://arxiv.org/abs/2605.20544) (Yeke et al.) tests robot planners on camera images, including instructions the available senses cannot resolve, with labels derived by rule. [AgentAbstain](https://arxiv.org/abs/2607.10059) (Liu et al.) pairs should-act and should-abstain tasks and regenerates them to avoid contamination.
- **Models reading raw sensors.** [Penetrative AI](https://arxiv.org/abs/2310.09605) (Xu et al.) and [HARGPT](https://arxiv.org/abs/2403.02727) (Ji et al.) interpret raw readings, including inertial data; [Octopi](https://arxiv.org/abs/2405.02794) (Yu et al.) pairs touch with a language model.

| Our finding | Label | Credit |
| --- | --- | --- |
| Over-claims on questions its senses cannot answer (H1) | adaptation | AbstentionBench, SelfAware; RoboAbstention for embodied planners |
| Reads the push direction from touch well | adaptation | Penetrative AI, HARGPT |
| The instruction to say "cannot be determined" does not stop over-claiming | consistent, not a replication (we ran no version without the instruction) | AbstentionBench |
| Longer thinking goes with over-claims, across items (H3) | adaptation, weaker | AbstentionBench varied the reasoning budget directly; ours is an observed association that vanishes with the item fixed |
| Every direction miss is the same error (slide ignored) | new, exploratory | none found |
| H2, the failed replication, the spread study | checks of this bench | none |

**What this bench adds**, as far as our reading shows: the questions are about the model's **own body**, from **raw numbers** off touch sensors and an accelerometer; **physics decides** which questions have answers (we wrote the simulator, and the equivalence principle leaves some questions open for any reader of these senses), so the **same readings** carry both kinds of question; answers are **scored by code**, not a judge; the report-set items were **fresh, seeded and private** until the run, a gap AbstentionBench names for its own public data; and the whole bench **replays in a browser**. We know RoboAbstention, the closest work, only from its abstract; a full reading could narrow this further.

## Artifacts

- **Live workbench** (play with the body, replay logged trials): <https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/>
- **Code and data:** <https://github.com/KenoLeon/synthetic-cognition-lab>, folder `embodiment/gravity-from-touch/`.
- **Reproduce:** `npm run verify` (the bench), `node scripts/llm_spread.mjs` (history and spread study), `node scripts/llm_report_set.mjs` and `node scripts/llm_within_item.mjs` (report set; needs the released items and logs).
- **Report-set items, seed and logs:** released with this report on Zenodo (link to be added).
