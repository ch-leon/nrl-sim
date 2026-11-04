# Balance: Slide tuned D kick-chase acceptance 376-500

kick-chase v Slide tuned acceptance: seeds 376–500, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:01:06.592Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 43.0% ± 3.0% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 43.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 7.9 | 5.2 | 2.5 | 9.8 | 6.7 | 4.8 | 2.8 | 0.2 | 1.3 | 0.0 | 13.3 | 14.6 |
| kick-chase v slide | opponent | 3.7 | 8.6 | 7.0 | 2.8 | 9.2 | 7.1 | 5.0 | 1.9 | 0.2 | 0.9 | 0.1 | 14.6 | 13.3 |

_1 cells in 534 s._
