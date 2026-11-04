# Balance: own style fit calibration

Own-style fit 1.5 and 0.5 versus flat Balanced/Slide: points-share change from knob off; flat 60 neutral control. 500 seeds per orientation.

**commit** f0d6ecc (uncommitted changes) · **branch** codex/461-own-style-fit · **started** 2026-11-04T08:40:58.077Z

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
| fit 1.5: Balanced / Slide | 1000 | 84.7% ± 1.1% |
| fit 0.5: Balanced / Slide | 1000 | 17.8% ± 1.2% |
| fit 1: Balanced / Slide | 1000 | 50.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 3.7 | 9.7 | 13.3 | 5.3 | 8.6 | 9.6 | 3.4 | 27.9 | 14.7 |
| fit 1.5: Balanced / Slide | opponent | 3.1 | 6.8 | 9.0 | 2.8 | 8.0 | 5.1 | 3.6 | 14.7 | 27.9 |
| fit 0.5: Balanced / Slide | tracked | 3.5 | 7.0 | 3.0 | 1.6 | 8.3 | 4.8 | 6.4 | 8.1 | 16.5 |
| fit 0.5: Balanced / Slide | opponent | 4.3 | 10.6 | 5.6 | 3.2 | 8.8 | 9.2 | 6.4 | 16.5 | 8.1 |
| fit 1: Balanced / Slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 14.8 | 14.8 |
| fit 1: Balanced / Slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 14.8 | 14.8 |

## Attack × defence points share — fit on edge 0.2

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — fit on edge 0.2

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| fit 1.5: Balanced / Slide | 1000 | 91.7% ± 0.9% |
| fit 0.5: Balanced / Slide | 1000 | 11.6% ± 1.0% |
| fit 1: Balanced / Slide | 1000 | 50.0% ± 1.5% |

## Per-side counts — fit on edge 0.2

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.4 | 11.7 | 14.3 | 5.9 | 8.4 | 10.0 | 3.4 | 31.3 | 13.5 |
| fit 1.5: Balanced / Slide | opponent | 2.6 | 5.3 | 8.1 | 2.6 | 7.9 | 5.0 | 3.6 | 13.5 | 31.3 |
| fit 0.5: Balanced / Slide | tracked | 2.8 | 5.5 | 2.6 | 1.4 | 8.2 | 4.5 | 6.3 | 7.0 | 18.3 |
| fit 0.5: Balanced / Slide | opponent | 4.8 | 12.6 | 6.3 | 3.6 | 8.6 | 9.2 | 6.5 | 18.3 | 7.0 |
| fit 1: Balanced / Slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 14.8 | 14.8 |
| fit 1: Balanced / Slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 14.8 | 14.8 |

_6 cells in 4708 s._
