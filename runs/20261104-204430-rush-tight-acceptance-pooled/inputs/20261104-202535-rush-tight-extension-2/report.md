# Balance: Rush Tight extension 2

Rush column: at least 1,000 whole matches per flat cell, earlier knobs on. Tight uses 1,000 seeds both ways (2,000 matches) to resolve a borderline first sample; all other flat cells use 500 seeds both ways. Targets: Kick-chase 53–57%, All-out 43–47%, Tight/Expansive 48–52%. Fit rows use task 1 sheets and 200 seeds both ways (400 matches).

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:25:35.472Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 50.8% ± 3.0% | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 250 | 50.8% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 2.3 | 22.9 | 4.8 | 2.9 | 9.7 | 5.8 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 15.0 | 14.6 |
| grind v rush | opponent | 3.7 | 8.8 | 7.4 | 2.8 | 8.8 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.6 | 15.0 |

_1 cells in 701 s._
