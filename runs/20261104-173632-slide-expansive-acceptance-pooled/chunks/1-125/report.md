# Balance: Slide tuned B expansive acceptance 1-125

expansive v Slide tuned acceptance: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:52.108Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | 43.6% ± 3.1% | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| expansive v slide | 250 | 43.6% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| expansive v slide | tracked | 4.5 | 8.4 | 6.7 | 2.9 | 8.5 | 7.0 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.9 | 16.4 |
| expansive v slide | opponent | 3.7 | 8.4 | 7.2 | 3.1 | 8.9 | 7.0 | 5.2 | 1.7 | 0.2 | 1.0 | 0.2 | 16.4 | 14.9 |

_1 cells in 1004 s._
