# Balance: Slide tuned B kick-chase acceptance 376-500

kick-chase v Slide tuned acceptance: seeds 376–500, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:55.709Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 43.0% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 43.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 7.7 | 5.2 | 2.6 | 9.8 | 6.7 | 4.9 | 2.9 | 0.2 | 1.3 | 0.0 | 13.4 | 14.7 |
| kick-chase v slide | opponent | 3.7 | 8.6 | 7.1 | 2.8 | 9.1 | 7.0 | 5.2 | 1.8 | 0.2 | 0.9 | 0.1 | 14.7 | 13.4 |

_1 cells in 1062 s._
