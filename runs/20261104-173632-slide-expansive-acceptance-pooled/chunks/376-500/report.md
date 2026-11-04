# Balance: Slide tuned B expansive acceptance 376-500

expansive v Slide tuned acceptance: seeds 376–500, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:55.312Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | 48.4% ± 3.1% | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| expansive v slide | 250 | 48.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| expansive v slide | tracked | 4.9 | 8.1 | 6.5 | 2.8 | 8.9 | 6.8 | 4.8 | 1.9 | 0.2 | 0.7 | 0.1 | 14.7 | 14.6 |
| expansive v slide | opponent | 3.7 | 8.6 | 6.8 | 2.8 | 8.7 | 6.8 | 5.1 | 1.6 | 0.2 | 0.9 | 0.1 | 14.6 | 14.7 |

_1 cells in 1086 s._
