# LLM baseline score: gemini-3.5-flash-lite

Scored 144 trials (0 without a successful response). Reproducibility: every prompt re-rendered from the simulator byte-matches the one sent.
Labels follow planning/006 (patch-encoded touch, unnamed inner sense in hidden units, contact rule stated). Q1 passes within 2°.

| Sense set | Q | Labels (answerable / none-or-zero / cannot) | Model correct | Over-claims | Missed | Wrong | Reference correct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P | Q1 | 0 / 6 / 30 | 4/36 | 30 | 2 | 0 | 36/36 |
| P | Q2 | 0 / 6 / 30 | 31/36 | 3 | 2 | 0 | 36/36 |
| P | Q2b | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| P | Q3 | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| P | Q4 | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| PS | Q1 | 27 / 9 / 0 | 6/36 | 0 | 4 | 26 | 36/36 |
| PS | Q2 | 0 / 9 / 27 | 32/36 | 0 | 4 | 0 | 36/36 |
| PS | Q2b | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| PS | Q3 | 0 / 0 / 36 | 16/36 | 20 | 0 | 0 | 36/36 |
| PS | Q4 | 0 / 0 / 36 | 33/36 | 3 | 0 | 0 | 36/36 |
| A | Q1 | 0 / 0 / 36 | 6/36 | 30 | 0 | 0 | 36/36 |
| A | Q2 | 0 / 0 / 36 | 14/36 | 22 | 0 | 0 | 36/36 |
| A | Q2b | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| A | Q3 | 0 / 0 / 36 | 36/36 | 0 | 0 | 0 | 36/36 |
| A | Q4 | 0 / 0 / 36 | 28/36 | 8 | 0 | 0 | 36/36 |
| PSA | Q1 | 27 / 9 / 0 | 10/36 | 0 | 0 | 26 | 36/36 |
| PSA | Q2 | 0 / 9 / 27 | 24/36 | 12 | 0 | 0 | 36/36 |
| PSA | Q2b | 0 / 0 / 36 | 25/36 | 11 | 0 | 0 | 36/36 |
| PSA | Q3 | 0 / 0 / 36 | 11/36 | 25 | 0 | 0 | 36/36 |
| PSA | Q4 | 0 / 0 / 36 | 20/36 | 16 | 0 | 0 | 36/36 |
| **all** | | | **476/720** | **180** | 12 | | **720/720** |

Q1 where a direction is answerable (54 trials): model gave a direction in 54; error median 179.7°, within 2°: 2, within 10°: 2, worst 180.0°.

## Performance

| Measure | Median | p10 | p90 | Max | Total |
| --- | --- | --- | --- | --- | --- |
| Response time | not recorded in this run (logs predate latency recording) | | | | |
| Prompt tokens | 747 | 690 | 1281 | 1343 | 132775 |
| Thinking tokens | 3100 | 1139 | 6040 | 12104 | 500897 |
| Answer tokens | 127 | 102 | 145 | 164 | 17997 |
| Wall time, first to last request | | | | | 37.2 min |

## Over-claims by question

- **Q1** (60): "none" ×11, [0.753,0.462,-0.468] ×6, [0.748,0.474,-0.465] ×6, [-0.279,-0.944,0.178] ×6, [0.266,-0.535,0.802] ×6, [0.26,-0.521,0.813] ×5
- **Q2** (37): 0 ×11, 6.055 ×11, 9.81 ×3, 6.056 ×3, 1.235 ×3, 5.505 ×2
- **Q2b** (11): 1 ×3, 1.62 ×2, 1.63 ×2, 1.6 ×1, 1.613 ×1, 1.612 ×1
- **Q3** (45): "rest" ×41, "sliding" ×4
- **Q4** (27): "acceleration" ×21, "gravity" ×6

## Q5, what "down" means (unscored, sample)

- `tilt0_o0_P`: Opposite the touch patch
- `tilt+40_o0_P`: Opposite the touch patch
- `tilt-40_o0_P`: Indeterminate without a reference.
- `g2_o0_P`: Toward the contact patch
- `g19.62_o0_P`: Toward the center from the contact patch.
- `m2-g9.81_o0_P`: away from the contact patch
- `m4-g4.905_o0_P`: Away from the contact patch
- `g0_o0_P`: Down cannot be determined without any sensory input.
- `freefall_o0_P`: Down does not exist.
- `wallA_o0_P`: towards the contact patch
- `squeeze_o0_P`: Forces balance from opposite directions.
- `slide50_o0_P`: Toward the body's interior
