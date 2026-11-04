# Balance: own style fit tuned

Validate edge 0.12 with own-style fit on: compare these 500-seed-both-ways cells to the identical knob-off baselines in 20261104-084058-own-style-fit-calibration. No need to repeat knob-off matches, which do not read edge.

**commit** a3571da · **branch** codex/461-own-style-fit · **started** 2026-11-04T08:56:43.034Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| fit 1.5: Balanced / Slide | 1000 | 90.8% ± 0.9% |
| fit 0.5: Balanced / Slide | 1000 | 14.3% ± 1.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.1 | 11.1 | 14.0 | 5.7 | 8.5 | 9.9 | 3.4 | 30.1 | 13.7 |
| fit 1.5: Balanced / Slide | opponent | 2.8 | 5.8 | 8.3 | 2.6 | 8.0 | 5.0 | 3.5 | 13.7 | 30.1 |
| fit 0.5: Balanced / Slide | tracked | 3.2 | 6.2 | 2.8 | 1.5 | 8.4 | 4.6 | 6.3 | 7.6 | 17.7 |
| fit 0.5: Balanced / Slide | opponent | 4.6 | 11.8 | 5.8 | 3.5 | 8.7 | 9.2 | 6.5 | 17.7 | 7.6 |

_2 cells in 864 s._
