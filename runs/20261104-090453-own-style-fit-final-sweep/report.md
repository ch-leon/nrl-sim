# Balance: own style fit final sweep

Compare own-style fit edges 0.08 and 0.10 against the unchanged knob-off baseline from 20261104-084058-own-style-fit-calibration; 500 seeds in each orientation per cell.

**commit** 8c690d2 · **branch** codex/461-own-style-fit · **started** 2026-11-04T09:04:53.952Z

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
| fit 1.5: Balanced / Slide | 1000 | 87.5% ± 1.0% |
| fit 0.5: Balanced / Slide | 1000 | 16.9% ± 1.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.0 | 10.5 | 13.7 | 5.5 | 8.5 | 9.8 | 3.4 | 29.2 | 14.6 |
| fit 1.5: Balanced / Slide | opponent | 2.9 | 6.2 | 8.7 | 2.8 | 8.1 | 5.1 | 3.5 | 14.6 | 29.2 |
| fit 0.5: Balanced / Slide | tracked | 3.3 | 6.4 | 2.9 | 1.6 | 8.4 | 4.7 | 6.3 | 8.1 | 17.2 |
| fit 0.5: Balanced / Slide | opponent | 4.4 | 11.4 | 5.8 | 3.4 | 8.6 | 9.0 | 6.4 | 17.2 | 8.1 |

## Attack × defence points share — edge 0.10

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — edge 0.10

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| fit 1.5: Balanced / Slide | 1000 | 88.4% ± 1.0% |
| fit 0.5: Balanced / Slide | 1000 | 15.8% ± 1.1% |

## Per-side counts — edge 0.10

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.0 | 10.8 | 13.7 | 5.6 | 8.4 | 9.8 | 3.4 | 29.9 | 14.5 |
| fit 1.5: Balanced / Slide | opponent | 2.9 | 6.0 | 8.5 | 2.8 | 8.1 | 5.0 | 3.6 | 14.5 | 29.9 |
| fit 0.5: Balanced / Slide | tracked | 3.2 | 6.4 | 2.8 | 1.5 | 8.4 | 4.7 | 6.4 | 7.8 | 17.5 |
| fit 0.5: Balanced / Slide | opponent | 4.5 | 11.6 | 5.9 | 3.4 | 8.7 | 9.1 | 6.5 | 17.5 | 7.8 |

_4 cells in 1563 s._
