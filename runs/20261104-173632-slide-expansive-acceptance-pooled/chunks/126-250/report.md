# Balance: Slide tuned B expansive acceptance 126-250

expansive v Slide tuned acceptance: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:51.221Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | 43.4% ± 3.1% | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| expansive v slide | 250 | 43.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| expansive v slide | tracked | 4.4 | 7.7 | 6.3 | 2.8 | 8.6 | 6.6 | 4.7 | 1.8 | 0.2 | 0.7 | 0.1 | 14.5 | 15.5 |
| expansive v slide | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.7 | 7.4 | 5.3 | 1.5 | 0.1 | 1.0 | 0.2 | 15.5 | 14.5 |

_1 cells in 978 s._
