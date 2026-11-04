# Balance: Rush neutral and fit acceptance

Rush column: 500 seeds both ways per flat cell (1,000 matches), earlier knobs on. Kick-chase 53–57%, All-out 43–47%, Tight/Expansive 48–52%. Fit rows use task 1 sampling: 200 seeds both ways (400 matches) for strong/weak pack and fast backs comparisons.

**commit** 8ac3403 · **branch** feat/463-rush-counters · **started** 2026-11-04T19:31:52.029Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 47.9% ± 1.5% | — |
| Balanced | — | 48.6% ± 1.5% | — |
| Expansive | — | 51.4% ± 1.5% | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 1000 | 47.9% ± 1.5% |
| balanced v rush | 1000 | 48.6% ± 1.5% |
| expansive v rush | 1000 | 51.4% ± 1.5% |
| strong pack: grind v rush | 400 | 60.5% ± 2.4% |
| weak pack: grind v rush | 400 | 37.8% ± 2.4% |
| fast backs: expansive v rush | 400 | 52.9% ± 2.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 2.3 | 22.9 | 4.6 | 2.7 | 9.6 | 5.7 | 4.6 | 1.1 | 0.1 | 1.1 | 0.2 | 14.3 | 14.8 |
| grind v rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 9.0 | 7.2 | 5.1 | 1.8 | 0.2 | 1.0 | 0.1 | 14.8 | 14.3 |
| balanced v rush | tracked | 3.6 | 22.1 | 6.0 | 3.0 | 8.5 | 9.5 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.8 |
| balanced v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.8 | 6.9 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 15.8 | 15.4 |
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| strong pack: grind v rush | tracked | 10.7 | 30.0 | 6.2 | 3.5 | 9.0 | 6.2 | 5.1 | 1.2 | 0.1 | 1.1 | 0.2 | 18.3 | 14.0 |
| strong pack: grind v rush | opponent | 3.6 | 8.0 | 6.7 | 2.7 | 8.5 | 5.5 | 5.2 | 1.6 | 0.1 | 0.9 | 0.1 | 14.0 | 18.3 |
| weak pack: grind v rush | tracked | 2.0 | 19.0 | 3.9 | 2.5 | 9.7 | 5.6 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 13.3 | 16.2 |
| weak pack: grind v rush | opponent | 3.9 | 9.6 | 8.1 | 3.1 | 8.7 | 8.8 | 5.3 | 1.6 | 0.2 | 1.0 | 0.2 | 16.2 | 13.3 |
| fast backs: expansive v rush | tracked | 4.9 | 23.2 | 7.0 | 3.6 | 8.1 | 10.1 | 5.1 | 1.6 | 0.2 | 0.7 | 0.2 | 18.7 | 17.8 |
| fast backs: expansive v rush | opponent | 3.5 | 8.5 | 7.9 | 3.4 | 8.6 | 7.9 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 17.8 | 18.7 |

_6 cells in 12059 s._
