# Balance: Slide All-out acceptance 251-375

All-out v Slide on the corrected second-phase expiry: seeds 251–375, both orientations (250 whole matches), one disjoint quarter of the 1,000-match acceptance sample.

**commit** 28c8054 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:01:35.411Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 48.6% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 48.6% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.0 | 9.9 | 7.4 | 2.9 | 8.2 | 7.2 | 5.3 | 1.9 | 0.1 | 0.7 | 0.1 | 14.9 | 15.1 |
| all-out v slide | opponent | 3.5 | 8.2 | 7.0 | 2.9 | 8.5 | 7.1 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 15.1 | 14.9 |

_1 cells in 412 s._
