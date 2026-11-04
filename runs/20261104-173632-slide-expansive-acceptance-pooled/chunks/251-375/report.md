# Balance: Slide tuned B expansive acceptance 251-375

expansive v Slide tuned acceptance: seeds 251–375, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:41.746Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | 48.0% ± 3.1% | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| expansive v slide | 250 | 48.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| expansive v slide | tracked | 4.6 | 8.4 | 6.6 | 2.9 | 8.6 | 6.5 | 4.7 | 1.7 | 0.1 | 0.8 | 0.1 | 15.0 | 15.4 |
| expansive v slide | opponent | 3.5 | 8.5 | 7.0 | 3.0 | 8.6 | 7.3 | 4.9 | 1.7 | 0.1 | 1.0 | 0.2 | 15.4 | 15.0 |

_1 cells in 1115 s._
