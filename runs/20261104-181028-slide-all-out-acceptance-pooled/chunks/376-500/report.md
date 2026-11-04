# Balance: Slide tuned D all-out acceptance 376-500

all-out v Slide tuned acceptance: seeds 376–500, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:01:07.156Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 55.2% ± 3.0% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 55.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.2 | 9.6 | 7.6 | 3.1 | 8.1 | 7.3 | 5.2 | 1.7 | 0.1 | 0.8 | 0.1 | 16.2 | 15.0 |
| all-out v slide | opponent | 3.5 | 8.1 | 6.6 | 2.9 | 8.5 | 6.5 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 15.0 | 16.2 |

_1 cells in 557 s._
