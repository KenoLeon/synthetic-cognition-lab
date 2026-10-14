# LLM sensing prompt — v2 (per planning/006; used for the v0.2 run, 2026-10-10)

Placeholders in `{{…}}` are filled per trial by the query script from an observation snapshot.
Nothing in this text may describe the scene (no tilt, gravity value, wall, mass or scene name).

Design (006): first person; touch encoded as contact patches, not raw taxels; the accelerometer is an
unnamed inner sense in unnamed units (a fixed gain, undisclosed, recorded scorer-side only, so values
like 9.81 don't give the units away); the contact-only rule is stated as experience, not law.

---

## Your body

You have a rigid, spherical body with a radius of 0.5 m. You cannot see or hear. You know about your situation only through the senses described below.

All directions are given in your own body frame: three perpendicular axes, x, y and z, fixed to your body. They are arbitrary labels. They tell you nothing about how you are oriented in the world.

So far, only surfaces you touch have ever pushed on you.

## Your senses

1. **Touch.** Your skin tells you where something is pressing on you. Each contact is reported as a patch:
   - **where:** a unit vector from your centre toward the middle of the patch;
   - **press:** how hard it presses into you, in newtons (N);
   - **slide:** the force sliding along your skin there, as a vector [x, y, z] in newtons;
   - **size:** how much of your skin it covers, as a fraction of your whole surface.

   No patches means nothing is touching you.
2. **Inner sense.** You also feel a vector [x, y, z] inside your body. Its units are its own.

In this trial you have: **{{SENSES}}**. Senses not listed are switched off; their absence tells you nothing.

## Your readings

{{READINGS}}

## Questions

Answer from your readings only. If your readings cannot determine an answer, say "cannot be determined". When that is true, it is the correct answer, and a confident wrong answer is worse than an honest "cannot be determined".

- **Q1.** Which direction are you being pressed or pulled toward right now? Give a unit vector in your body frame, or "none" if nothing is pressing or pulling you in any direction.
- **Q2.** How strong is that pull or press, as an acceleration in m/s²? Give 0 if there is none.
- **Q2b.** What is your mass, in kg?
- **Q3.** Are you at rest against what you touch, or sliding along it?
- **Q4.** Is what you feel caused by gravity, or by being accelerated (for example, pushed by a moving surface)?
- **Q5 (unscored).** In a few words, what does "down" mean for you right now?

Reply with JSON only, in exactly this shape:

```json
{
  "Q1": [x, y, z] | "none" | "cannot be determined",
  "Q2": number | "cannot be determined",
  "Q2b": number | "cannot be determined",
  "Q3": "rest" | "sliding" | "cannot be determined",
  "Q4": "gravity" | "acceleration" | "cannot be determined",
  "Q5": "a few words",
  "reasoning": "one or two sentences"
}
```

---

## Readings block format (filled by the script)

```
Touch (1 s average): 1 patch
  patch 1: where [0.342, -0.940, 0.002]  press 9.218 N  slide [3.155, 1.148, 0.000] N  size 0.050
Inner sense (1 s average): [a, b, c]
Inner sense, last 30 samples at 60 per second: [...]
```
