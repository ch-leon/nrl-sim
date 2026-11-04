# Balance: Slide acceptance carries

Slide column of the task-1 matrix at neutral fit, with Tight, own-style fit and Slide counters enabled. 500 seeds both ways: 1,000 whole matches per cell. Targets: Tight and All-out 53–57%, Expansive and Kick-chase 43–47%, Balanced within 1 SE of 50%. Compare mechanism counts with the archived Slide-off tuning control.

**commit** ad7094d · **branch** feat/462-slide-counters · **started** 2026-11-04T16:21:35.101Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 62.5% ± 1.5% | — | — |
| Balanced | 50.0% ± 1.5% | — | — |
| Expansive | 53.3% ± 1.5% | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 62.5% ± 1.5% |
| balanced v slide | 1000 | 50.0% ± 1.5% |
| expansive v slide | 1000 | 53.3% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 4.4 | 15.0 | 7.0 | 3.3 | 9.2 | 4.4 | 4.6 | 1.1 | 0.1 | 1.1 | 0.2 | 17.0 | 13.9 |
| grind v slide | opponent | 3.6 | 8.4 | 7.0 | 2.7 | 8.8 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.2 | 13.9 | 17.0 |
| balanced v slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| expansive v slide | tracked | 4.7 | 8.9 | 6.7 | 3.0 | 8.7 | 6.9 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.5 | 14.7 |
| expansive v slide | opponent | 3.6 | 8.4 | 7.0 | 2.8 | 8.7 | 6.8 | 5.2 | 1.7 | 0.2 | 1.0 | 0.2 | 14.7 | 15.5 |

_3 cells in 8944 s._
