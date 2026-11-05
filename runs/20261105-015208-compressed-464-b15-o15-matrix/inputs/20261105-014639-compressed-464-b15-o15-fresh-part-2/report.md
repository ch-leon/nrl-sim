# Balance: Compressed 464 b15-o15 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:39.818Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 41.0% ± 3.0% |
| Balanced | — | — | 50.8% ± 3.1% |
| Expansive | — | — | 53.0% ± 3.1% |
| Kick-chase | — | — | 48.6% ± 3.1% |
| All-out | — | — | 48.2% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 50.8% ± 3.1% |
| kick-chase v compressed | 250 | 48.6% ± 3.1% |
| all-out v compressed | 250 | 48.2% ± 3.1% |
| grind v compressed | 250 | 41.0% ± 3.0% |
| expansive v compressed | 250 | 53.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.9 | 6.7 | 6.6 | 2.9 | 8.7 | 9.0 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.4 | 15.6 |
| balanced v compressed | opponent | 3.6 | 9.0 | 7.1 | 3.0 | 8.8 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.6 | 15.4 |
| kick-chase v compressed | tracked | 1.7 | 6.6 | 6.4 | 2.9 | 10.0 | 8.3 | 4.8 | 2.6 | 0.3 | 1.3 | 0.2 | 15.3 | 14.8 |
| kick-chase v compressed | opponent | 3.5 | 8.2 | 7.0 | 2.8 | 8.7 | 7.0 | 5.3 | 1.7 | 0.1 | 0.8 | 0.1 | 14.8 | 15.3 |
| all-out v compressed | tracked | 5.6 | 6.7 | 7.1 | 3.0 | 8.5 | 9.2 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 15.3 | 14.9 |
| all-out v compressed | opponent | 3.6 | 8.5 | 6.7 | 2.8 | 8.4 | 6.6 | 5.2 | 1.7 | 0.1 | 0.8 | 0.1 | 14.9 | 15.3 |
| grind v compressed | tracked | 1.0 | 4.3 | 4.4 | 2.6 | 9.9 | 5.2 | 4.7 | 1.3 | 0.1 | 1.1 | 0.1 | 13.3 | 15.1 |
| grind v compressed | opponent | 3.7 | 8.8 | 7.5 | 2.9 | 8.9 | 7.5 | 5.3 | 1.7 | 0.1 | 1.0 | 0.2 | 15.1 | 13.3 |
| expansive v compressed | tracked | 4.4 | 11.9 | 7.7 | 3.0 | 8.7 | 9.3 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.4 | 14.4 |
| expansive v compressed | opponent | 3.7 | 8.3 | 7.0 | 2.8 | 8.7 | 6.9 | 5.0 | 1.7 | 0.2 | 0.9 | 0.1 | 14.4 | 15.4 |

_5 cells in 499 s._
