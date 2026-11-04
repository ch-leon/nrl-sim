# Balance: Slide tuned B all-out acceptance 376-500

all-out v Slide tuned acceptance: seeds 376–500, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:49.907Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 58.2% ± 3.0% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 58.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.2 | 10.7 | 7.7 | 3.0 | 8.2 | 7.2 | 5.3 | 1.9 | 0.1 | 0.8 | 0.1 | 15.9 | 14.4 |
| all-out v slide | opponent | 3.5 | 8.3 | 6.8 | 2.8 | 8.6 | 6.8 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 14.4 | 15.9 |

_1 cells in 964 s._
