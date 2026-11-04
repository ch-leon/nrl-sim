# Balance: Slide tuned C all-out acceptance 251-375

all-out v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 19397b4 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:40:13.924Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 53.0% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 53.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 5.9 | 10.8 | 7.7 | 3.1 | 7.8 | 7.1 | 5.3 | 1.7 | 0.1 | 0.8 | 0.1 | 15.8 | 15.3 |
| all-out v slide | opponent | 3.4 | 8.6 | 7.0 | 3.0 | 8.5 | 6.9 | 4.9 | 1.6 | 0.1 | 0.9 | 0.1 | 15.3 | 15.8 |

_1 cells in 495 s._
