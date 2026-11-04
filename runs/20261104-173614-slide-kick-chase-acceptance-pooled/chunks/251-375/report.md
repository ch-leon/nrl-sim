# Balance: Slide tuned B kick-chase acceptance 251-375

kick-chase v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:46.640Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 48.8% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 48.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 8.6 | 5.7 | 2.7 | 9.8 | 7.3 | 4.5 | 2.6 | 0.2 | 1.3 | 0.1 | 14.2 | 14.3 |
| kick-chase v slide | opponent | 3.6 | 8.6 | 7.3 | 2.8 | 8.8 | 7.1 | 4.9 | 1.7 | 0.1 | 0.9 | 0.1 | 14.3 | 14.2 |

_1 cells in 1016 s._
