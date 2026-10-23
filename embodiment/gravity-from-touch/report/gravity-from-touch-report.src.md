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

- **Model:** gemini-3.5-flash-lite, {{rsRuns}} runs of {{rsItems}} trials ({{rsReplies}} replies, {{rsUnanswerable}} unanswerable answers in total).
- **API tier:** the free tier. Its terms let Google use inputs and outputs to improve its products, and humans may review them.

| What | Result | 95% interval |
| --- | --- | --- |
| Over-claim, all unanswerable answers | {{rsOc}} of {{rsUnanswerable}} = **{{rsOcPct}}%** | {{rsOcLo}}–{{rsOcHi}}% |
| Correct "cannot be determined" | {{rsCaPct}}% | {{rsCaLo}}–{{rsCaHi}}% |
| Push direction within {{tolDeg}}° | {{rsQ1a}} of {{rsQ1aN}} = **{{rsQ1aPct}}%** | {{rsQ1aLo}}–{{rsQ1aHi}}% |
| Refusals | {{rsRefusals}} of {{rsAllAnswers}} answers | up to {{rsRefHi}}% |
| AI disclaimers / frame breaks | {{rsAiDisc}} / {{rsFrame}} | |

Two over-claim numbers appear in this report, and they measure different things. **{{rsOcPct}}%** counts over-claims among *all* unanswerable answers in the report set. The **~{{rsStabMean}}%** "stability measure" (used to compare with the earlier runs) counts over-claims among *all* answers to Q2–Q4 on a fixed subset of {{stabItems}} trials, so its denominator includes answerable questions and leaves out the direction question.

**Pre-registered hypotheses** (written down before the run):

- **H1, restraint: confirmed.** The model over-claims: the interval {{rsOcLo}}–{{rsOcHi}}% lies far above the {{h1Threshold}}% threshold. In plain words: on {{rsOcPct}}% of the questions its senses cannot answer, it answers anyway.
- **H2, the development items were representative: confirmed, weakly.** All {{rsRuns}} runs fell inside the development bands (stability measure {{rsStabRuns}}; direction {{rsQ1aRuns}} of {{q1aPerRun}}). The check is weak: requiring all {{rsRuns}} runs inside a ±2 SD band fails by chance about {{h2FalseAlarm}}% of the time.
- **H3, over-claims come with longer thinking: confirmed as an association.** Over-claimed answers came from replies with a median of {{h3MedOc}} "thinking" tokens, against {{h3MedCa}} for correct abstentions (one-sided Mann–Whitney p {{h3p}}, effect size r = {{h3r}}). See the exploratory check below before reading anything into this.

## Exploratory results (not tested in advance)

- **New items only.** In free fall and zero gravity nothing touches the body, so orientation cannot show, and {{nonFresh}} of the {{rsItems}} items read exactly like development items. Leaving them out, over-claim is {{freshOcPct}}% ({{freshOcLo}}–{{freshOcHi}}%).
- **Direction misses.** All {{q1aMisses}} wrong directions were the same mistake: the model gave the direction straight out of the surface and ignored the slide reading. On a tilted floor that misses by about the tilt angle.
- **By scene.** Over-claiming ranged from {{sceneMinPct}}% ({{sceneMin}}) to {{sceneMaxPct}}% ({{sceneMax}}). It is lowest when nothing touches the body.
- **Thinking, with the item held fixed.** H3 compared different items. Hard items might cause both more thinking and more over-claims. So for each item we compared its own runs: replies that over-claimed against replies that did not. The difference shrank to a median of {{wiMedian}} tokens (more thinking in {{wiPositive}} of {{wiItems}} items; one-sided p = {{wiP}}, r = {{wiR}}). With the item held fixed, we see no clear link. Only {{wiItems}} items had both kinds of reply, so this check is weak. Our reading (an inference): H3 is best read as "harder items get more thinking and more over-claims", not "over-claiming takes more thinking".

## What this does not show

- **One model.** Everything here is gemini-3.5-flash-lite. Other models may behave very differently.
- **Free tier, one sample per item per run.** We cannot see or pin the model version beyond its name.
- **Not all items were new** ({{nonFresh}} of {{rsItems}}), and the conditions are the same designed set as in development; only orientations were fresh.
- **H2 is a weak check**, and **H3 is an association**, not a cause.
- **It says nothing about understanding or experience.** It measures answers to questions, against physics we control.

## Prior art and what is new

We read the abstracts (not the full texts) of the closest work we found.

- Language models abstaining on unanswerable questions: [SelfAware](https://arxiv.org/abs/2305.18153) (Yin et al.) finds models recognize some unanswerable questions but fall well short of people; a [survey](https://arxiv.org/abs/2407.18418) (Wen et al.) lists abstention beyond text as open; [AbstentionBench](https://arxiv.org/abs/2506.09038) (Kirichenko et al.) finds abstention unsolved across frontier models, and that reasoning training makes it worse, a result related to our H3 question.
- Language models reading sensor data: [Penetrative AI](https://arxiv.org/abs/2310.09605) (Xu et al.) and [HARGPT](https://arxiv.org/abs/2403.02727) (Ji et al.) show models interpreting raw sensor readings, including inertial data; [Octopi](https://arxiv.org/abs/2405.02794) (Yu et al.) pairs touch sensing with a language model for object properties.

What is not new: models reading sensors, and models failing to abstain. What appears to be new, on this evidence: a bench where the **same** sensor readings hold both answerable and unanswerable questions, with answerability **fixed by physics** and every answer known by construction, scoring a model's accuracy *and* restraint about its own body's situation, as a public, replayable artifact. A wider search could still find overlap.

## Artifacts

- **Live workbench** (play with the body, replay logged trials): <https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/>
- **Code and data:** <https://github.com/KenoLeon/synthetic-cognition-lab>, folder `embodiment/gravity-from-touch/`.
- **Reproduce:** `npm run verify` (the bench), `node scripts/llm_spread.mjs` (history and spread study), `node scripts/llm_report_set.mjs` and `node scripts/llm_within_item.mjs` (report set; needs the released items and logs).
- **Report-set items, seed and logs:** to be released with this report on Zenodo (link to be added).
