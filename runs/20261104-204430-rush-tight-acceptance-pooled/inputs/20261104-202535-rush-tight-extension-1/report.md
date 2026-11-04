# Balance: Rush Tight extension 1

Rush column: at least 1,000 whole matches per flat cell, earlier knobs on. Tight uses 1,000 seeds both ways (2,000 matches) to resolve a borderline first sample; all other flat cells use 500 seeds both ways. Targets: Kick-chase 53–57%, All-out 43–47%, Tight/Expansive 48–52%. Fit rows use task 1 sheets and 200 seeds both ways (400 matches).

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:25:35.817Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 49.0% ± 3.1% | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 250 | 49.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 2.2 | 22.4 | 4.7 | 2.7 | 9.6 | 5.7 | 4.8 | 1.3 | 0.1 | 1.0 | 0.1 | 14.1 | 14.4 |
| grind v rush | opponent | 3.6 | 8.9 | 7.3 | 2.8 | 8.9 | 7.1 | 5.4 | 1.6 | 0.1 | 1.0 | 0.2 | 14.4 | 14.1 |

_1 cells in 747 s._
