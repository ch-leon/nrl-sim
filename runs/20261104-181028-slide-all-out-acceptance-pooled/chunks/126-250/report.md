# Balance: Slide tuned D all-out acceptance 126-250

all-out v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:00:58.833Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 52.4% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 52.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.3 | 9.5 | 7.3 | 2.9 | 8.4 | 7.1 | 5.1 | 1.9 | 0.2 | 0.9 | 0.1 | 15.0 | 15.1 |
| all-out v slide | opponent | 3.5 | 8.3 | 6.9 | 2.9 | 8.7 | 7.2 | 5.0 | 1.7 | 0.2 | 1.0 | 0.2 | 15.1 | 15.0 |

_1 cells in 548 s._
