# Balance: Slide tuned B all-out acceptance 1-125

all-out v Slide tuned acceptance: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:52.716Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 53.8% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 53.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.2 | 11.1 | 7.7 | 3.2 | 8.3 | 7.2 | 5.4 | 1.9 | 0.2 | 0.7 | 0.2 | 16.5 | 15.6 |
| all-out v slide | opponent | 3.5 | 8.4 | 6.9 | 3.0 | 8.5 | 6.9 | 5.1 | 1.7 | 0.1 | 0.9 | 0.1 | 15.6 | 16.5 |

_1 cells in 1071 s._
