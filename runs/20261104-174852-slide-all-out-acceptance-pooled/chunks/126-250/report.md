# Balance: Slide tuned C all-out acceptance 126-250

all-out v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 19397b4 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:40:12.912Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 49.8% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 49.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.2 | 11.1 | 7.6 | 3.1 | 8.0 | 7.2 | 5.2 | 1.8 | 0.2 | 0.7 | 0.1 | 15.7 | 15.9 |
| all-out v slide | opponent | 3.7 | 8.4 | 6.9 | 3.1 | 8.8 | 7.3 | 4.9 | 1.7 | 0.1 | 1.0 | 0.2 | 15.9 | 15.7 |

_1 cells in 512 s._
