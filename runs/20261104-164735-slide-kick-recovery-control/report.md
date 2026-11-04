# Balance: Slide kick recovery control

Dormant Slide control for per-side kick recoveries with the same flat-60 sheets, Tight rebuild and own-style fit enabled. 200 seeds both ways, 400 whole matches; compare bombs won and grubber tries with the 1,000-match enabled cell.

**commit** 1fa7bf3 · **branch** feat/462-slide-counters · **started** 2026-11-04T16:47:35.400Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 50.9% ± 2.4% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 400 | 50.9% ± 2.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.2 | 8.4 | 6.7 | 2.9 | 9.8 | 6.9 | 5.0 | 2.6 | 0.3 | 1.3 | 0.3 | 15.1 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.9 | 6.9 | 5.3 | 1.6 | 0.1 | 0.9 | 0.2 | 14.5 | 15.1 |

_1 cells in 1074 s._
