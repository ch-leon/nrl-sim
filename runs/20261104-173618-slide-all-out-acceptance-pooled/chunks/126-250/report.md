# Balance: Slide tuned B all-out acceptance 126-250

all-out v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:52.717Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 51.6% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 51.6% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.1 | 10.8 | 7.7 | 3.1 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.7 | 0.1 | 15.8 | 15.6 |
| all-out v slide | opponent | 3.5 | 8.4 | 7.1 | 3.0 | 8.8 | 7.3 | 5.0 | 1.8 | 0.2 | 1.0 | 0.2 | 15.6 | 15.8 |

_1 cells in 1075 s._
