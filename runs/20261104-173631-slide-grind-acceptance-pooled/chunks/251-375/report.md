# Balance: Slide tuned B grind acceptance 251-375

grind v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:49.154Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 51.8% ± 3.0% | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 250 | 51.8% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.2 | 11.5 | 6.1 | 2.9 | 9.4 | 4.3 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 15.3 | 14.1 |
| grind v slide | opponent | 3.4 | 8.3 | 7.1 | 2.7 | 8.8 | 7.0 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 14.1 | 15.3 |

_1 cells in 1015 s._
