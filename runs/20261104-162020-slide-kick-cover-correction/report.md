# Balance: Slide kick cover correction

Slide column of the task-1 matrix at neutral fit, with Tight, own-style fit and Slide counters enabled. 500 seeds both ways: 1,000 whole matches per cell. Targets: Tight and All-out 53–57%, Expansive and Kick-chase 43–47%, Balanced within 1 SE of 50%. Compare mechanism counts with the archived Slide-off tuning control.

**commit** cceee55 (uncommitted changes) · **branch** feat/462-slide-counters · **started** 2026-11-04T16:20:20.118Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 47.5% ± 4.5% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 120 | 47.5% ± 4.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 8.6 | 5.8 | 2.6 | 9.6 | 6.8 | 5.0 | 2.3 | 0.2 | 1.4 | 0.1 | 14.0 | 14.8 |
| kick-chase v slide | opponent | 3.4 | 8.6 | 7.5 | 2.9 | 8.9 | 7.3 | 5.2 | 1.8 | 0.3 | 1.0 | 0.2 | 14.8 | 14.0 |

_1 cells in 214 s._
