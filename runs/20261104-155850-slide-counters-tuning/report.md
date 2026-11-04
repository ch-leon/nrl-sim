# Balance: Slide counters tuning

Slide column at neutral fit. Tight rebuild and own-style fit enabled in every row. Compare dormant Slide to enabled mechanics, 500 seeds both ways for acceptance.

**commit** 0db465f (uncommitted changes) · **branch** feat/462-slide-counters · **started** 2026-11-04T15:58:50.054Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 52.5% ± 4.5% | — | — |
| Balanced | 50.0% ± 4.5% | — | — |
| Expansive | 44.6% ± 4.4% | — | — |
| Kick-chase | 44.2% ± 4.4% | — | — |
| All-out | 55.0% ± 4.5% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 120 | 52.5% ± 4.5% |
| balanced v slide | 120 | 50.0% ± 4.5% |
| expansive v slide | 120 | 44.6% ± 4.4% |
| kick-chase v slide | 120 | 44.2% ± 4.4% |
| all-out v slide | 120 | 55.0% ± 4.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 2.4 | 9.2 | 5.5 | 2.7 | 9.3 | 4.4 | 5.0 | 14.2 | 14.4 |
| grind v slide | opponent | 3.8 | 9.1 | 7.6 | 2.8 | 8.7 | 7.7 | 5.3 | 14.4 | 14.2 |
| balanced v slide | tracked | 3.6 | 8.5 | 7.2 | 3.0 | 8.6 | 7.1 | 5.3 | 15.6 | 15.6 |
| balanced v slide | opponent | 3.6 | 8.5 | 7.2 | 3.0 | 8.6 | 7.1 | 5.3 | 15.6 | 15.6 |
| expansive v slide | tracked | 4.2 | 9.4 | 7.1 | 3.0 | 8.2 | 7.2 | 5.1 | 15.6 | 17.2 |
| expansive v slide | opponent | 3.8 | 8.4 | 7.3 | 3.3 | 8.8 | 6.9 | 5.4 | 17.2 | 15.6 |
| kick-chase v slide | tracked | 2.4 | 8.4 | 6.6 | 2.8 | 9.6 | 7.0 | 5.3 | 14.8 | 14.6 |
| kick-chase v slide | opponent | 3.5 | 8.5 | 6.8 | 2.8 | 8.6 | 7.0 | 5.7 | 14.6 | 14.8 |
| all-out v slide | tracked | 6.3 | 9.6 | 7.8 | 3.1 | 8.0 | 7.3 | 5.2 | 16.1 | 15.4 |
| all-out v slide | opponent | 3.7 | 8.6 | 6.9 | 3.0 | 8.4 | 6.7 | 5.1 | 15.4 | 16.1 |

## Attack × defence points share — Slide on

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 52.5% ± 4.4% | — | — |
| Balanced | 50.0% ± 4.5% | — | — |
| Expansive | 37.9% ± 4.3% | — | — |
| Kick-chase | 55.4% ± 4.5% | — | — |
| All-out | 50.8% ± 4.4% | — | — |

## Tracked-side rows — Slide on

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 120 | 52.5% ± 4.4% |
| balanced v slide | 120 | 50.0% ± 4.5% |
| expansive v slide | 120 | 37.9% ± 4.3% |
| kick-chase v slide | 120 | 55.4% ± 4.5% |
| all-out v slide | 120 | 50.8% ± 4.4% |

## Per-side counts — Slide on

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 4.5 | 14.4 | 6.5 | 3.1 | 9.1 | 4.6 | 4.9 | 16.0 | 15.0 |
| grind v slide | opponent | 3.9 | 9.0 | 7.3 | 2.9 | 9.1 | 7.2 | 5.0 | 15.0 | 16.0 |
| balanced v slide | tracked | 3.6 | 8.5 | 7.2 | 3.0 | 8.6 | 7.1 | 5.3 | 15.6 | 15.6 |
| balanced v slide | opponent | 3.6 | 8.5 | 7.2 | 3.0 | 8.6 | 7.1 | 5.3 | 15.6 | 15.6 |
| expansive v slide | tracked | 4.2 | 7.9 | 6.3 | 2.7 | 8.5 | 6.7 | 5.1 | 14.3 | 16.7 |
| expansive v slide | opponent | 3.7 | 8.8 | 7.4 | 3.2 | 9.0 | 7.7 | 5.1 | 16.7 | 14.3 |
| kick-chase v slide | tracked | 2.2 | 8.8 | 0.3 | 3.0 | 9.6 | 8.4 | 5.2 | 16.2 | 14.7 |
| kick-chase v slide | opponent | 3.6 | 8.7 | 6.5 | 2.9 | 8.9 | 7.0 | 5.2 | 14.7 | 16.2 |
| all-out v slide | tracked | 6.5 | 10.3 | 7.9 | 3.2 | 8.0 | 7.3 | 5.3 | 16.6 | 16.2 |
| all-out v slide | opponent | 3.5 | 8.7 | 7.3 | 3.1 | 8.3 | 7.0 | 5.4 | 16.2 | 16.6 |

_10 cells in 5600 s._
