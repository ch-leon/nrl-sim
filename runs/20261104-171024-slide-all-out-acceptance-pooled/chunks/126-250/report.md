# Balance: Slide All-out acceptance 126-250

All-out v Slide on the corrected second-phase expiry: seeds 126–250, both orientations (250 whole matches), one disjoint quarter of the 1,000-match acceptance sample.

**commit** 28c8054 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:01:34.921Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 49.2% ± 3.1% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 49.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.0 | 9.3 | 7.5 | 3.0 | 8.1 | 7.2 | 5.2 | 1.9 | 0.1 | 0.7 | 0.1 | 15.7 | 16.0 |
| all-out v slide | opponent | 3.7 | 8.5 | 7.0 | 3.1 | 8.8 | 7.1 | 4.9 | 1.8 | 0.2 | 0.9 | 0.2 | 16.0 | 15.7 |

_1 cells in 462 s._
