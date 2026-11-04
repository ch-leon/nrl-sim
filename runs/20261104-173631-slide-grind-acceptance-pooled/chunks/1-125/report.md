# Balance: Slide tuned B grind acceptance 1-125

grind v Slide tuned acceptance: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:48.798Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 53.4% ± 3.1% | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 250 | 53.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.2 | 11.6 | 6.1 | 3.0 | 9.6 | 4.3 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 15.4 | 13.8 |
| grind v slide | opponent | 3.7 | 8.7 | 7.1 | 2.6 | 8.7 | 7.1 | 5.2 | 1.5 | 0.1 | 0.9 | 0.1 | 13.8 | 15.4 |

_1 cells in 1113 s._
