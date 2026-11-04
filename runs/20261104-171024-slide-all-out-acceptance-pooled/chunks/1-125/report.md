# Balance: Slide All-out acceptance 1-125

All-out v Slide on the corrected second-phase expiry: seeds 1–125, both orientations (250 whole matches), one disjoint quarter of the 1,000-match acceptance sample.

**commit** 28c8054 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:01:35.319Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 54.4% ± 3.0% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 250 | 54.4% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.5 | 10.0 | 7.7 | 3.2 | 8.2 | 7.3 | 5.4 | 2.0 | 0.2 | 0.7 | 0.1 | 16.7 | 15.6 |
| all-out v slide | opponent | 3.4 | 8.4 | 7.0 | 3.0 | 8.6 | 7.0 | 5.0 | 1.6 | 0.1 | 0.9 | 0.2 | 15.6 | 16.7 |

_1 cells in 497 s._
