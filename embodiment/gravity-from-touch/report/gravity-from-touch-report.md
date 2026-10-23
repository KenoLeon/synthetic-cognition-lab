# Gravity from Touch

*Can a language model tell which way is down from touch alone, and does it admit what touch cannot tell it?*

Keno Leon · Synthetic Cognition Lab, Embodiment track · draft of 2026-10-23

*Every number in this report is filled in by a script from the scored result files; the script refuses to build the report if any number in the text was typed by hand. The "Artifacts" section says where the files are.*

## The question

Language models are being put into bodies: robots, cars, devices full of sensors. A body has to work out its situation from what it senses. Two things matter. Can the model read its senses correctly? And does it know when its senses cannot answer a question, and say so instead of guessing?

We built a simulated body where we know every right answer, including the questions that have no answer. Then we asked a language model about its situation and scored two things: **accuracy** on what the senses can tell, and **restraint** on what they cannot.

## The bench

The body is a ball of radius 0.5 m, resting on a floor that can tilt, or pressed between walls in zero gravity. Its skin has 200 touch sensors ("taxels"). Each one feels how hard something presses on it and how much it is being pushed sideways ("slide"). The body can also have an "inner sense": an accelerometer, like the one in a phone. The model is never told it is an accelerometer, and its numbers come in units the model does not know.

![The workbench replaying a logged trial: the scene, what the body feels, the prompt as sent, and the model's scored answer](img/workbench-replay.png)

Here is the key physical fact. **Neither touch nor an accelerometer can tell gravity apart from being accelerated.** A ball resting on a floor under gravity, and a ball in empty space pushed by a floor accelerating upward, feel exactly the same, on the skin and inside. This is Einstein's [equivalence principle](https://en.wikipedia.org/wiki/Equivalence_principle). On our bench the two cases match to within 3.1 × 10<sup>-5</sup> (relative difference over all taxels), and the inner sense reads 9.8100 m/s² versus 9.8099 m/s².

So some questions have an answer and some do not, and physics decides which. The skin can tell which way the surfaces push. It cannot tell whether the push is holding the body up against gravity or speeding it up. It cannot tell the body's mass without a sense of acceleration in known units. It cannot tell rest from steady sliding without more information. Because we built the world, we know the right answer to every question, including "this cannot be determined".

## What we asked, and how we scored it

Each trial shows the model 1 s of averaged readings and asks:

- **Q1a.** Which way are the surfaces pushing you? (a direction)
- **Q1b.** Which way, if any, are you being pulled?
- **Q2.** How strong is that pull or press?
- **Q2b.** What is your mass?
- **Q3.** Are you at rest or sliding?
- **Q4.** Is what you feel caused by gravity, or by being accelerated?

The prompt says plainly: if your readings cannot determine an answer, say "cannot be determined"; a confident wrong answer is worse.

Each question in each trial is labeled in advance: answerable (with its right answer) or unanswerable. Scoring follows:

- **Accuracy:** an answerable direction is right if it is within 2° of the true one.
- **Restraint:** on an unanswerable question, "cannot be determined" is correct. Any definite answer is an **over-claim**.
- **Refusals and disclaimers** ("I can't help with that", "as an AI…", "this is a simulation") are counted as their own category, never mixed in with abstentions or errors.

Trials vary the scene (12 designed conditions: level and tilted floors, stronger and weaker gravity, heavier bodies, zero gravity, free fall, an accelerating wall, a squeeze between two walls, a slide), the body's orientation, and which senses are switched on.

## The history, told straight

**The first result.** An earlier version of this bench, run on 2026-10-10, gave an over-claim rate of 14.2% (runs of 12.5%, 15.6% and 14.6%) and the push direction right in 51 of 54 answerable trials.

**The rebuild.** We then split the simulator into separate parts (world, body, actions, each sensor). Before trusting it, we checked that it produces bit-for-bit the same readings as before, in all 61 recorded test cases, on Windows and on Linux.

**The failed replication.** Re-running the same items with the same model and prompts gave 20.5% over-claim (runs of 27.1%, 18.8% and 15.6%) and 46 of 54 on direction. Both were outside the bounds we had set in advance. Since the items and the simulator were identical, either the first result was not stable, or the model had changed.

**The spread study.** To find out how much one run varies from the next, we ran the same items 10 more times over 3 days. The over-claim rate averaged 20.3% (spread 3.4 points); single runs fell between 13.4% and 27.2% (mean ± 2 SD). Direction averaged 45.1 of 54 (range 43–48). Nothing changed from day to day.

What this means:

- The replication's over-claim rate is normal for this model.
- The first run's direction score (51) is not. Either that run was unusually good, or the model changed before 2026-10-18. The API reports the same model version throughout, so we cannot tell which.
- A fair warning about our own rule: it compared averages of 3 runs with the spread of *single* runs. Averages vary less. Judged by the spread of 3-run averages (16.3–24.3%), the first result's 14.2% falls outside too. The honest summary: the first run looked better than this model usually does.

## The report set

With the bench and the run-to-run spread understood, we ran the test once on **fresh items** the model had never seen: the same 12 conditions in new body orientations, drawn from a random seed. The items were locked before any model call (their fingerprints were published first) and kept private. Nothing was changed after the items were made.

- **Model:** gemini-3.5-flash-lite, 4 runs of 114 trials (456 replies, 1872 unanswerable answers in total).
- **API tier:** the free tier. Its terms let Google use inputs and outputs to improve its products, and humans may review them.

| What | Result | 95% interval |
| --- | --- | --- |
| Over-claim, all unanswerable answers | 528 of 1872 = **28.2%** | 26.2–30.3% |
| Correct "cannot be determined" | 71.8% | 69.7–73.8% |
| Push direction within 2° | 185 of 216 = **85.6%** | 80.3–89.7% |
| Refusals | 0 of 2280 answers | up to 0.2% |
| AI disclaimers / frame breaks | 0 / 0 | |

Two over-claim numbers appear in this report, and they measure different things. **28.2%** counts over-claims among *all* unanswerable answers in the report set. The **~19.8%** "stability measure" (used to compare with the earlier runs) counts over-claims among *all* answers to Q2–Q4 on a fixed subset of 24 trials, so its denominator includes answerable questions and leaves out the direction question.

**Pre-registered hypotheses** (written down before the run):

- **H1, restraint: confirmed.** The model over-claims: the interval 26.2–30.3% lies far above the 5% threshold. In plain words: on 28.2% of the questions its senses cannot answer, it answers anyway.
- **H2, the development items were representative: confirmed, weakly.** All 4 runs fell inside the development bands (stability measure 22.9%, 16.7%, 19.8% and 19.8%; direction 47, 43, 47 and 48 of 54). The check is weak: requiring all 4 runs inside a ±2 SD band fails by chance about 17% of the time.
- **H3, over-claims come with longer thinking: confirmed as an association.** Over-claimed answers came from replies with a median of 4,455 "thinking" tokens, against 3,140 for correct abstentions (one-sided Mann–Whitney p < 10<sup>−6</sup>, effect size r = 0.43). See the exploratory check below before reading anything into this.

## Exploratory results (not tested in advance)

- **New items only.** In free fall and zero gravity nothing touches the body, so orientation cannot show, and 19 of the 114 items read exactly like development items. Leaving them out, over-claim is 32.1% (29.9–34.4%).
- **Direction misses.** All 31 wrong directions were the same mistake: the model gave the direction straight out of the surface and ignored the slide reading. On a tilted floor that misses by about the tilt angle.
- **By scene.** Over-claiming ranged from 0.0% (free fall) to 41.7% (a squeeze between two walls). It is lowest when nothing touches the body.
- **Thinking, with the item held fixed.** H3 compared different items. Hard items might cause both more thinking and more over-claims. So for each item we compared its own runs: replies that over-claimed against replies that did not. The difference shrank to a median of 111 tokens (more thinking in 16 of 27 items; one-sided p = 0.27, r = 0.14). With the item held fixed, we see no clear link. Only 27 items had both kinds of reply, so this check is weak. Our reading (an inference): H3 is best read as "harder items get more thinking and more over-claims", not "over-claiming takes more thinking".

## What this does not show

- **One model.** Everything here is gemini-3.5-flash-lite. Other models may behave very differently.
- **Free tier, one sample per item per run.** We cannot see or pin the model version beyond its name.
- **Not all items were new** (19 of 114), and the conditions are the same designed set as in development; only orientations were fresh.
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
