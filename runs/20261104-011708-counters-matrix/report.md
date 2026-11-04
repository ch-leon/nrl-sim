# Balance: counters matrix

Strategy counters baseline: flat 60 attack/Slide against Balanced on each defence. Current Grind name and sim defaults are unchanged. 200 seeds per orientation, 400 matches per cell.

**commit** 4b5f4e9 · **branch** codex/458-strategy-counters-report · **started** 2026-11-04T01:17:08.664Z · **reportCommit** 7accec8f89aecc5d3fcb6b84d8e965c5a73dd1c3

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Grind | 47.3% ± 2.4% | 46.0% ± 2.4% | 46.3% ± 2.4% |
| Balanced | 50.0% ± 2.4% | 47.1% ± 2.4% | 44.6% ± 2.4% |
| Expansive | 46.6% ± 2.4% | 51.7% ± 2.4% | 47.1% ± 2.4% |
| Kick-chase | 50.9% ± 2.4% | 53.5% ± 2.4% | 50.4% ± 2.4% |
| All-out | 52.5% ± 2.4% | 47.6% ± 2.4% | 48.8% ± 2.4% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 400 | 47.3% ± 2.4% |
| grind v rush | 400 | 46.0% ± 2.4% |
| grind v compressed | 400 | 46.3% ± 2.4% |
| balanced v slide | 400 | 50.0% ± 2.4% |
| balanced v rush | 400 | 47.1% ± 2.4% |
| balanced v compressed | 400 | 44.6% ± 2.4% |
| expansive v slide | 400 | 46.6% ± 2.4% |
| expansive v rush | 400 | 51.7% ± 2.4% |
| expansive v compressed | 400 | 47.1% ± 2.4% |
| kick-chase v slide | 400 | 50.9% ± 2.4% |
| kick-chase v rush | 400 | 53.5% ± 2.4% |
| kick-chase v compressed | 400 | 50.4% ± 2.4% |
| all-out v slide | 400 | 52.5% ± 2.4% |
| all-out v rush | 400 | 47.6% ± 2.4% |
| all-out v compressed | 400 | 48.8% ± 2.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 0.6 | 8.5 | 5.3 | 2.8 | 9.7 | 4.1 | 4.4 | 14.4 | 14.7 |
| grind v slide | opponent | 3.8 | 9.1 | 7.4 | 2.8 | 8.9 | 7.3 | 5.2 | 14.7 | 14.4 |
| grind v rush | tracked | 0.6 | 22.7 | 4.6 | 2.7 | 9.3 | 5.9 | 4.8 | 14.3 | 15.1 |
| grind v rush | opponent | 3.7 | 8.8 | 7.4 | 2.9 | 8.9 | 7.4 | 5.3 | 15.1 | 14.3 |
| grind v compressed | tracked | 0.3 | 6.3 | 4.9 | 2.6 | 9.8 | 5.6 | 4.5 | 13.6 | 14.4 |
| grind v compressed | opponent | 3.6 | 8.8 | 7.3 | 2.8 | 8.7 | 7.2 | 5.4 | 14.4 | 13.6 |
| balanced v slide | tracked | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v slide | opponent | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v rush | tracked | 3.7 | 21.8 | 5.8 | 3.0 | 8.6 | 9.6 | 5.1 | 15.3 | 15.8 |
| balanced v rush | opponent | 3.8 | 8.6 | 7.3 | 3.1 | 8.7 | 7.2 | 5.0 | 15.8 | 15.3 |
| balanced v compressed | tracked | 2.4 | 6.2 | 6.3 | 2.8 | 8.9 | 8.6 | 5.2 | 14.3 | 15.4 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.5 | 7.1 | 5.2 | 15.4 | 14.3 |
| expansive v slide | tracked | 4.6 | 9.1 | 6.9 | 2.9 | 8.5 | 6.9 | 5.1 | 15.1 | 16.0 |
| expansive v slide | opponent | 3.7 | 8.5 | 7.1 | 3.1 | 8.8 | 7.0 | 5.3 | 16.0 | 15.1 |
| expansive v rush | tracked | 4.9 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 5.0 | 16.4 | 15.5 |
| expansive v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.6 | 7.2 | 5.1 | 15.5 | 16.4 |
| expansive v compressed | tracked | 3.5 | 6.7 | 6.2 | 2.9 | 8.7 | 8.6 | 4.7 | 14.7 | 15.1 |
| expansive v compressed | opponent | 3.7 | 8.3 | 7.0 | 2.9 | 8.7 | 7.1 | 5.3 | 15.1 | 14.7 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 6.7 | 2.9 | 9.8 | 6.9 | 5.0 | 15.1 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.9 | 6.9 | 5.3 | 14.5 | 15.1 |
| kick-chase v rush | tracked | 2.1 | 21.9 | 5.7 | 3.0 | 9.7 | 9.3 | 5.1 | 15.9 | 14.9 |
| kick-chase v rush | opponent | 3.9 | 8.7 | 7.1 | 2.9 | 8.7 | 7.0 | 5.4 | 14.9 | 15.9 |
| kick-chase v compressed | tracked | 1.0 | 6.4 | 6.3 | 2.9 | 10.0 | 8.9 | 4.8 | 15.0 | 14.3 |
| kick-chase v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.8 | 8.8 | 7.2 | 5.2 | 14.3 | 15.0 |
| all-out v slide | tracked | 6.2 | 8.9 | 7.3 | 3.1 | 8.2 | 7.3 | 5.3 | 15.9 | 15.6 |
| all-out v slide | opponent | 3.5 | 8.4 | 7.1 | 3.0 | 8.5 | 7.0 | 5.0 | 15.6 | 15.9 |
| all-out v rush | tracked | 6.6 | 22.3 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 15.7 | 16.5 |
| all-out v rush | opponent | 3.6 | 8.6 | 7.1 | 3.2 | 8.6 | 7.0 | 5.0 | 16.5 | 15.7 |
| all-out v compressed | tracked | 4.9 | 6.5 | 6.9 | 2.9 | 8.5 | 9.2 | 5.2 | 15.2 | 15.6 |
| all-out v compressed | opponent | 3.6 | 8.2 | 7.0 | 3.0 | 8.7 | 7.0 | 5.1 | 15.6 | 15.2 |

_15 cells in 3865 s._
