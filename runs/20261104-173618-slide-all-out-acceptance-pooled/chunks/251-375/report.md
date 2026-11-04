# Balance: Slide tuned B all-out acceptance 251-375

all-out v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:48.905Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 48.0% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 48.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.0 | 10.5 | 7.5 | 3.0 | 7.8 | 7.0 | 5.3 | 1.8 | 0.1 | 0.8 | 0.1 | 15.4 | 15.7 |
| all-out v slide | opponent | 3.5 | 8.5 | 7.1 | 3.1 | 8.6 | 7.0 | 5.0 | 1.5 | 0.1 | 0.9 | 0.2 | 15.7 | 15.4 |

_1 cells in 1106 s._
