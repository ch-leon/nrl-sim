# Balance: Rush Kick 0.5 acceptance 3

Rush column: at least 1,000 whole matches per flat cell, earlier knobs on. Tight uses 1,000 seeds both ways (2,000 matches) to resolve a borderline first sample; all other flat cells use 500 seeds both ways. Targets: Kick-chase 53–57%, All-out 43–47%, Tight/Expansive 48–52%. Fit rows use task 1 sheets and 200 seeds both ways (400 matches).

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:26:52.881Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 60.4% ± 3.0% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 60.4% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.2 | 21.0 | 6.8 | 3.5 | 9.5 | 9.9 | 5.0 | 2.6 | 0.5 | 1.2 | 0.5 | 18.2 | 15.5 |
| kick-chase v rush | opponent | 3.4 | 8.4 | 6.7 | 3.0 | 8.5 | 7.1 | 5.3 | 1.6 | 0.1 | 1.0 | 0.1 | 15.5 | 18.2 |

_1 cells in 645 s._
