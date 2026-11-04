# Balance: Slide tuned B grind acceptance 126-250

grind v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:50.401Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 54.8% ± 3.1% | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 250 | 54.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.0 | 11.1 | 6.0 | 2.9 | 9.5 | 4.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 15.3 | 14.1 |
| grind v slide | opponent | 3.5 | 8.5 | 6.8 | 2.7 | 8.8 | 7.0 | 4.9 | 1.6 | 0.2 | 1.0 | 0.1 | 14.1 | 15.3 |

_1 cells in 1103 s._
