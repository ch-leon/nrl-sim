# Balance: Rush counter cells acceptance

Rush column: 500 seeds in both orientations, earlier knobs on. Kick-chase 53–57%, All-out 43–47%, Tight/Expansive 48–52%; strong/weak pack and fast backs fit comparisons.

**commit** 8ac3403 (uncommitted changes) · **branch** feat/463-rush-counters · **started** 2026-11-04T19:34:09.965Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 51.2% ± 1.5% | — |
| All-out | — | 45.0% ± 1.5% | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 1000 | 51.2% ± 1.5% |
| all-out v rush | 1000 | 45.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 21.9 | 6.2 | 3.1 | 9.6 | 9.4 | 5.0 | 2.5 | 0.4 | 1.3 | 0.4 | 16.2 | 15.6 |
| kick-chase v rush | opponent | 3.6 | 8.5 | 7.0 | 3.0 | 8.6 | 6.9 | 5.3 | 1.6 | 0.1 | 1.0 | 0.2 | 15.6 | 16.2 |
| all-out v rush | tracked | 6.6 | 22.1 | 6.1 | 3.0 | 8.0 | 9.5 | 5.6 | 1.8 | 0.2 | 0.7 | 0.1 | 15.5 | 16.7 |
| all-out v rush | opponent | 3.7 | 8.5 | 7.0 | 3.2 | 8.8 | 7.0 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 16.7 | 15.5 |

_2 cells in 5909 s._
