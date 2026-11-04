# Balance: Slide tuned C kick-chase acceptance 126-250

kick-chase v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 19397b4 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:40:17.829Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 48.4% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 48.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.2 | 8.4 | 5.5 | 2.7 | 9.6 | 6.7 | 4.9 | 2.7 | 0.1 | 1.2 | 0.0 | 14.1 | 14.2 |
| kick-chase v slide | opponent | 3.5 | 8.8 | 7.2 | 2.8 | 8.9 | 7.3 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.2 | 14.1 |

_1 cells in 489 s._
