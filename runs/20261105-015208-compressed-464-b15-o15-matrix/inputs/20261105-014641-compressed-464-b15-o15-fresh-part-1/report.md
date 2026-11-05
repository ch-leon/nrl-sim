# Balance: Compressed 464 b15-o15 fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:41.747Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 44.4% ± 3.0% |
| Balanced | — | — | 49.6% ± 3.1% |
| Expansive | — | — | 45.8% ± 3.1% |
| Kick-chase | — | — | 52.8% ± 3.1% |
| All-out | — | — | 49.4% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 49.6% ± 3.1% |
| kick-chase v compressed | 250 | 52.8% ± 3.1% |
| all-out v compressed | 250 | 49.4% ± 3.1% |
| grind v compressed | 250 | 44.4% ± 3.0% |
| expansive v compressed | 250 | 45.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.8 | 7.0 | 6.7 | 2.8 | 8.6 | 9.0 | 4.9 | 1.7 | 0.1 | 1.0 | 0.2 | 14.5 | 15.0 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.0 | 2.9 | 8.7 | 6.9 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 15.0 | 14.5 |
| kick-chase v compressed | tracked | 1.7 | 7.0 | 6.3 | 2.8 | 10.2 | 8.3 | 4.6 | 2.6 | 0.3 | 1.3 | 0.2 | 14.6 | 13.8 |
| kick-chase v compressed | opponent | 3.6 | 8.8 | 6.8 | 2.7 | 9.0 | 6.9 | 5.3 | 1.9 | 0.2 | 1.0 | 0.2 | 13.8 | 14.6 |
| all-out v compressed | tracked | 5.7 | 6.8 | 7.1 | 3.0 | 8.5 | 9.0 | 5.2 | 2.0 | 0.2 | 0.8 | 0.1 | 15.3 | 15.4 |
| all-out v compressed | opponent | 3.6 | 8.3 | 6.9 | 3.0 | 8.7 | 6.8 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 15.4 | 15.3 |
| grind v compressed | tracked | 1.0 | 4.1 | 4.5 | 2.5 | 9.9 | 5.0 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 13.2 | 15.1 |
| grind v compressed | opponent | 3.7 | 8.8 | 7.3 | 2.9 | 8.9 | 7.4 | 5.4 | 1.8 | 0.1 | 1.0 | 0.2 | 15.1 | 13.2 |
| expansive v compressed | tracked | 4.3 | 11.6 | 7.7 | 3.0 | 8.5 | 8.8 | 4.9 | 1.7 | 0.2 | 0.7 | 0.1 | 15.2 | 15.9 |
| expansive v compressed | opponent | 3.6 | 8.7 | 7.4 | 3.0 | 8.8 | 7.1 | 4.9 | 1.6 | 0.1 | 1.0 | 0.1 | 15.9 | 15.2 |

_5 cells in 368 s._
