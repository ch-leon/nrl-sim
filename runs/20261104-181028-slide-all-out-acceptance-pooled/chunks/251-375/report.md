# Balance: Slide tuned D all-out acceptance 251-375

all-out v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:01:02.005Z

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
| all-out v slide | tracked | 5.9 | 9.7 | 7.5 | 2.9 | 8.1 | 7.2 | 5.3 | 1.8 | 0.1 | 0.7 | 0.1 | 15.3 | 15.1 |
| all-out v slide | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.6 | 7.1 | 5.1 | 1.5 | 0.1 | 0.9 | 0.2 | 15.1 | 15.3 |

_1 cells in 501 s._
