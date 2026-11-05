# Balance: Compressed 464 b15-o15 fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:40.568Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 41.2% ± 3.0% |
| Balanced | — | — | 50.2% ± 3.1% |
| Expansive | — | — | 52.0% ± 3.1% |
| Kick-chase | — | — | 50.0% ± 3.0% |
| All-out | — | — | 53.0% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 50.2% ± 3.1% |
| kick-chase v compressed | 250 | 50.0% ± 3.0% |
| all-out v compressed | 250 | 53.0% ± 3.1% |
| grind v compressed | 250 | 41.2% ± 3.0% |
| expansive v compressed | 250 | 52.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.1 | 6.7 | 6.6 | 3.0 | 8.7 | 8.9 | 5.1 | 1.6 | 0.2 | 1.1 | 0.2 | 15.5 | 15.6 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.4 | 7.4 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 15.6 | 15.5 |
| kick-chase v compressed | tracked | 1.7 | 6.9 | 6.3 | 2.9 | 9.8 | 8.7 | 5.0 | 2.5 | 0.3 | 1.3 | 0.2 | 15.1 | 14.5 |
| kick-chase v compressed | opponent | 3.6 | 8.4 | 7.3 | 2.8 | 8.7 | 7.0 | 5.2 | 1.8 | 0.2 | 1.0 | 0.1 | 14.5 | 15.1 |
| all-out v compressed | tracked | 5.4 | 6.7 | 7.0 | 3.0 | 8.6 | 9.3 | 5.3 | 2.0 | 0.1 | 0.7 | 0.1 | 15.4 | 15.6 |
| all-out v compressed | opponent | 3.8 | 8.5 | 7.2 | 3.0 | 8.3 | 7.3 | 5.2 | 1.5 | 0.1 | 1.0 | 0.2 | 15.6 | 15.4 |
| grind v compressed | tracked | 1.0 | 4.1 | 4.5 | 2.5 | 9.7 | 5.4 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 13.5 | 14.9 |
| grind v compressed | opponent | 3.8 | 9.4 | 7.4 | 2.9 | 8.8 | 7.4 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 14.9 | 13.5 |
| expansive v compressed | tracked | 4.3 | 12.3 | 7.6 | 3.2 | 8.6 | 9.4 | 4.9 | 1.8 | 0.1 | 0.7 | 0.1 | 15.9 | 14.9 |
| expansive v compressed | opponent | 3.5 | 8.5 | 6.9 | 2.9 | 8.5 | 7.2 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 14.9 | 15.9 |

_5 cells in 418 s._
