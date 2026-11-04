# Balance: Slide tuned B kick-chase acceptance 1-125

kick-chase v Slide tuned acceptance: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:51.743Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 50.0% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 50.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.2 | 8.5 | 5.6 | 2.8 | 9.6 | 7.1 | 5.0 | 2.6 | 0.2 | 1.3 | 0.1 | 14.9 | 15.0 |
| kick-chase v slide | opponent | 3.9 | 8.6 | 7.2 | 2.9 | 8.9 | 7.2 | 5.1 | 1.6 | 0.2 | 0.9 | 0.2 | 15.0 | 14.9 |

_1 cells in 1070 s._
