# Balance: Slide All-out acceptance 376-500

All-out v Slide on the corrected second-phase expiry: seeds 376–500, both orientations (250 whole matches), one disjoint quarter of the 1,000-match acceptance sample.

**commit** 28c8054 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:01:35.458Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 56.0% ± 3.0% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 56.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.4 | 9.6 | 7.5 | 3.0 | 8.3 | 7.2 | 5.2 | 2.0 | 0.2 | 0.7 | 0.1 | 15.6 | 14.1 |
| all-out v slide | opponent | 3.5 | 8.2 | 6.7 | 2.7 | 8.5 | 6.6 | 5.0 | 1.7 | 0.2 | 0.9 | 0.1 | 14.1 | 15.6 |

_1 cells in 519 s._
