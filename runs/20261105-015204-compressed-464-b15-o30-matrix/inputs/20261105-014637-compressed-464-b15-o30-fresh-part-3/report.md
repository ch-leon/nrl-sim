# Balance: Compressed 464 b15-o30 fresh part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:37.911Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 42.4% ± 3.0% |
| Balanced | — | — | 52.2% ± 3.1% |
| Expansive | — | — | 58.4% ± 3.0% |
| Kick-chase | — | — | 49.0% ± 3.1% |
| All-out | — | — | 47.4% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 52.2% ± 3.1% |
| kick-chase v compressed | 250 | 49.0% ± 3.1% |
| all-out v compressed | 250 | 47.4% ± 3.1% |
| grind v compressed | 250 | 42.4% ± 3.0% |
| expansive v compressed | 250 | 58.4% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.3 | 6.9 | 6.5 | 2.7 | 8.7 | 8.2 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 14.3 | 14.2 |
| balanced v compressed | opponent | 3.7 | 8.6 | 7.0 | 2.7 | 8.9 | 6.7 | 5.1 | 1.7 | 0.2 | 1.1 | 0.1 | 14.2 | 14.3 |
| kick-chase v compressed | tracked | 0.9 | 6.6 | 6.2 | 2.8 | 9.6 | 8.3 | 5.0 | 2.5 | 0.3 | 1.2 | 0.2 | 14.6 | 14.7 |
| kick-chase v compressed | opponent | 3.7 | 8.4 | 6.8 | 2.8 | 8.9 | 6.7 | 5.4 | 1.7 | 0.1 | 1.0 | 0.2 | 14.7 | 14.6 |
| all-out v compressed | tracked | 4.7 | 6.9 | 6.7 | 2.9 | 8.4 | 8.9 | 4.9 | 1.9 | 0.1 | 0.7 | 0.1 | 14.9 | 15.3 |
| all-out v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.7 | 6.7 | 5.2 | 1.6 | 0.2 | 1.0 | 0.1 | 15.3 | 14.9 |
| grind v compressed | tracked | 0.7 | 4.3 | 4.4 | 2.5 | 9.8 | 5.4 | 4.2 | 1.2 | 0.1 | 1.1 | 0.2 | 13.0 | 14.4 |
| grind v compressed | opponent | 3.7 | 8.7 | 7.5 | 2.8 | 9.0 | 7.4 | 5.1 | 1.7 | 0.1 | 1.0 | 0.2 | 14.4 | 13.0 |
| expansive v compressed | tracked | 3.7 | 12.0 | 7.8 | 3.2 | 8.9 | 9.0 | 4.8 | 1.8 | 0.2 | 0.8 | 0.1 | 16.4 | 14.3 |
| expansive v compressed | opponent | 3.6 | 8.5 | 6.8 | 2.8 | 8.5 | 6.3 | 5.3 | 1.8 | 0.2 | 0.9 | 0.2 | 14.3 | 16.4 |

_5 cells in 468 s._
