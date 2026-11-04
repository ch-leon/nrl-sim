# Balance: Slide tuned D kick-chase acceptance 126-250

kick-chase v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:01:07.723Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 48.2% ± 3.0% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 48.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.2 | 8.5 | 5.6 | 2.6 | 9.6 | 6.8 | 4.8 | 2.7 | 0.1 | 1.2 | 0.0 | 13.8 | 14.0 |
| kick-chase v slide | opponent | 3.5 | 8.9 | 7.3 | 2.7 | 8.8 | 7.3 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 14.0 | 13.8 |

_1 cells in 584 s._
