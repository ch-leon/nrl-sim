# Balance: Slide tuned D kick-chase acceptance 1-125

kick-chase v Slide tuned acceptance: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** a81d385 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:01:05.304Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 49.8% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 49.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 8.4 | 5.5 | 2.7 | 9.6 | 7.0 | 4.9 | 2.5 | 0.1 | 1.2 | 0.1 | 14.6 | 15.0 |
| kick-chase v slide | opponent | 3.7 | 8.6 | 7.1 | 2.9 | 9.0 | 7.3 | 5.1 | 1.5 | 0.2 | 0.9 | 0.1 | 15.0 | 14.6 |

_1 cells in 551 s._
