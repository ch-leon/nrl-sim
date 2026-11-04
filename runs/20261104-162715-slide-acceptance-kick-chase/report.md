# Balance: Slide acceptance kick chase

Slide column of the task-1 matrix at neutral fit, with Tight, own-style fit and Slide counters enabled. 500 seeds both ways: 1,000 whole matches per cell. Targets: Tight and All-out 53–57%, Expansive and Kick-chase 43–47%, Balanced within 1 SE of 50%. Compare mechanism counts with the archived Slide-off tuning control.

**commit** 1fa7bf3 · **branch** feat/462-slide-counters · **started** 2026-11-04T16:27:15.308Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 49.5% ± 1.5% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 1000 | 49.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.3 | 8.5 | 5.6 | 2.7 | 9.7 | 6.8 | 4.9 | 2.5 | 0.2 | 1.3 | 0.1 | 14.0 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.4 | 7.2 | 2.8 | 8.9 | 7.0 | 5.0 | 1.7 | 0.2 | 1.0 | 0.2 | 14.5 | 14.0 |

_1 cells in 2677 s._
