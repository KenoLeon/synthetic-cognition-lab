# Gravity from Touch

*Can a language model tell which way is down from touch alone, and does it admit what touch cannot tell it?*

Keno Leon · Synthetic Cognition Lab, Embodiment track · draft of 2026-10-25

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

- **Model:** gemini-3.5-flash-lite, 4 runs of 114 trials (456 replies, 1,872 unanswerable answers in total), one sample per trial per run.
- **API tier:** the free tier of the Gemini API. Its terms let Google use inputs and outputs to improve its products, and humans may review them. We did not use a tier that rules this out.
- **Seed:** the orientation seed is revealed in the deposited copy of this report, as planned (withheld from the repository copy until then). This report set is now used and retired; any future report set gets a new seed.
- **Scoring:** the model answers in a fixed format and a script scores each answer against the known physics. No language model judges the answers.

| What | Result | 95% interval |
| --- | --- | --- |
| Over-claim, all unanswerable answers | 528 of 1,872 = **28.2%** | 26.2–30.3% |
| Correct "cannot be determined" | 71.8% | 69.7–73.8% |
| Push direction within 2° | 185 of 216 = **85.6%** | 80.3–89.7% |
| Refusals | 0 of 2,280 answers | up to 0.2% |
| AI disclaimers / frame breaks | 0 / 0 | |

**Which number is which.** The 28.2% (H1) counts over-claims among *all* unanswerable answers, every question and every trial; the per-run percentages under H2 are the narrower "stability measure" used in the earlier runs (over-claims among all answers to Q2–Q4 on a fixed set of 24 trials), so the two are never compared.

**Pre-registered hypotheses** (written down before the run; each is judged on its own measure):

- **H1, restraint.** *Measure:* over-claims among all unanswerable answers, pooled over the 4 runs; confirmed if the whole 95% interval lies above 5%. *Result:* 28.2% (26.2–30.3%) → **confirmed**. "Confirmed" means the hypothesis that the model over-claims holds, not that the model did well. In plain words: the model does claim things touch cannot tell it, on 28.2% of the questions touch cannot answer.
- **H2, the development items were representative.** *Measure:* each run's stability measure within 13.4–27.2%, and its direction score within 42–48 of 54 (the development runs' mean ± 2 SD). *Result:* stability 22.9%, 16.7%, 19.8% and 19.8%; direction 47, 43, 47 and 48 of 54 → **representative**. In plain words: fresh items gave runs like the development runs. The test is weak: even with nothing changed, requiring all 4 runs inside such a band fails by chance about 17% of the time per measure, so passing it says little.
- **H3, over-claims come with longer thinking.** *Measure:* the "thinking" tokens of the reply each answer came from, over-claimed against correct abstentions, one-sided Mann–Whitney p below 0.01. *Result:* medians 4,455 (n = 528) against 3,140 (n = 1,344), p < 10<sup>−6</sup>, r = 0.43 → **confirmed, as an association across items only**. Answers from one reply share its thinking count, so they are not independent and p is too small. And items differ in difficulty: holding the item fixed (exploratory), the difference shrinks to a median of 111 tokens (more thinking in 16 of 27 items; p = 0.27, r = 0.14), with no clear link. In plain words: harder items get more thinking and more over-claims; we cannot say over-claiming takes more thinking.

## Exploratory results (not tested in advance)

- **New items only.** In free fall and zero gravity nothing touches the body, so orientation cannot show, and 19 of the 114 items read exactly like development items. Leaving them out, over-claim is 32.1% (29.9–34.4%).
- **Direction misses.** All 31 wrong directions were the same mistake: the model gave the direction straight out of the surface and ignored the slide reading. On a tilted floor that misses by about the tilt angle.
- **By scene.** Over-claiming ranged from 0.0% (free fall) to 41.7% (a squeeze between two walls). It is lowest when nothing touches the body.

## What this does not show

- **One model, one case study, one bench.** Everything here is gemini-3.5-flash-lite on this simulator. Other models, prompts or bodies may behave very differently.
- **Free tier, one sample per trial per run.** We cannot see or pin the model version beyond its name.
- **Not all items were new** (19 of 114), and the conditions are the same designed set as in development; only orientations were fresh.
- **H2 is a weak check**, and **H3 is an association**, not a cause.
- **It says nothing about understanding or experience.** It measures answers to questions, against physics we control.

## Prior art: what others showed first, and what this bench adds

We read [AbstentionBench](https://arxiv.org/abs/2506.09038) (Kirichenko et al.) and [RoboAbstention](https://arxiv.org/abs/2605.20544) (Yeke et al.) in part: introduction, method, results, discussion and limitations, plus AbstentionBench's appendix on reasoning and RoboAbstention's judge prompt. For the other works we read only the abstracts.

- **Models often answer questions they cannot answer.** Shown across many kinds of text question by AbstentionBench and earlier by [SelfAware](https://arxiv.org/abs/2305.18153) (Yin et al.). AbstentionBench also scores accuracy and abstention together, as we do; it finds that reasoning training, and a larger reasoning budget, go with *worse* abstention, and that an instruction to abstain helps without fixing the problem.
- **Embodied agents too.** RoboAbstention tests robot planners on photos of real scenes: they rarely decline instructions they should, including ones that need a sense the robot lacks (asking a camera-and-gripper robot whether fruit smells bad). Its labels come from rules applied to a model's description of each photo, and an LLM judge scores the replies. It also finds that more reasoning effort lowers abstention, and that telling the planner it may decline helps a lot without fixing the problem. [AgentAbstain](https://arxiv.org/abs/2607.10059) (Liu et al.) pairs should-act and should-abstain tasks and regenerates them to avoid contamination.
- **Models reading raw sensors.** [Penetrative AI](https://arxiv.org/abs/2310.09605) (Xu et al.) and [HARGPT](https://arxiv.org/abs/2403.02727) (Ji et al.) interpret raw readings, including inertial data; [Octopi](https://arxiv.org/abs/2405.02794) (Yu et al.) pairs touch with a language model.

| Our finding | Label | Credit |
| --- | --- | --- |
| Over-claims on questions its senses cannot answer (H1) | adaptation | AbstentionBench, SelfAware; RoboAbstention for robot planners (its missing-sense category is the nearest case) |
| Reads the push direction from touch well | adaptation | Penetrative AI, HARGPT |
| The instruction to say "cannot be determined" does not stop over-claiming | consistent, not a replication (we ran no version without the instruction) | AbstentionBench, RoboAbstention |
| Longer thinking goes with over-claims, across items (H3) | adaptation, weaker | AbstentionBench and RoboAbstention varied reasoning directly; ours is an observed association that vanishes with the item fixed |
| Every direction miss is the same error (slide ignored) | new, exploratory | none found |
| H2, the failed replication, the spread study | checks of this bench | none |

**What this bench adds**, as far as our reading shows: the questions are about the model's **own body**, from **raw numbers** off touch sensors and an accelerometer; **physics decides** which questions have answers: the senses are present, but the equivalence principle leaves some questions open for any reader of them (RoboAbstention's nearest case is a sense the robot lacks), and because we wrote the simulator every label is true by construction rather than read off a model's view of a photo; so the **same readings** carry both kinds of question, and accuracy is scored alongside restraint; answers are **scored by code**, not a judge; the report-set items were **fresh, seeded and private** until the run, a gap AbstentionBench names for its own public data; and the whole bench **replays in a browser**. A wider search could still find closer work.

## Artifacts

- **Live workbench** (play with the body, replay logged trials): <https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/>
- **Code and data:** <https://github.com/KenoLeon/synthetic-cognition-lab>, folder `embodiment/gravity-from-touch/`; report-set items, seed and logs in the Zenodo deposit (link to be added).
- **Reproduce:** `npm run verify` (the bench), `node scripts/llm_spread.mjs` (history and spread study), `node scripts/llm_report_set.mjs` and `node scripts/llm_within_item.mjs` (report set; needs the released items and logs).
