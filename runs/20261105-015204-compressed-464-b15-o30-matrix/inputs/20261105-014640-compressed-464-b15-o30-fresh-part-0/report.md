# Balance: Compressed 464 b15-o30 fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:40.179Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 42.4% ± 3.0% |
| Balanced | — | — | 49.6% ± 3.1% |
| Expansive | — | — | 54.2% ± 3.0% |
| Kick-chase | — | — | 53.6% ± 3.0% |
| All-out | — | — | 51.6% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 49.6% ± 3.1% |
| kick-chase v compressed | 250 | 53.6% ± 3.0% |
| all-out v compressed | 250 | 51.6% ± 3.1% |
| grind v compressed | 250 | 42.4% ± 3.0% |
| expansive v compressed | 250 | 54.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.6 | 6.9 | 6.4 | 2.9 | 8.6 | 8.9 | 5.2 | 1.6 | 0.2 | 1.0 | 0.1 | 15.1 | 15.7 |
| balanced v compressed | opponent | 3.9 | 8.8 | 7.3 | 3.1 | 8.5 | 7.5 | 5.1 | 1.5 | 0.2 | 1.0 | 0.2 | 15.7 | 15.1 |
| kick-chase v compressed | tracked | 1.1 | 6.6 | 6.4 | 2.9 | 9.8 | 8.8 | 4.8 | 2.6 | 0.3 | 1.3 | 0.2 | 15.0 | 14.0 |
| kick-chase v compressed | opponent | 3.6 | 8.4 | 7.1 | 2.7 | 8.7 | 7.1 | 5.4 | 1.7 | 0.2 | 1.0 | 0.1 | 14.0 | 15.0 |
| all-out v compressed | tracked | 4.8 | 7.0 | 7.1 | 3.0 | 8.5 | 9.1 | 5.2 | 1.9 | 0.2 | 0.7 | 0.1 | 15.8 | 15.2 |
| all-out v compressed | opponent | 3.4 | 8.6 | 7.0 | 2.9 | 8.4 | 6.9 | 5.2 | 1.5 | 0.1 | 1.0 | 0.2 | 15.2 | 15.8 |
| grind v compressed | tracked | 0.8 | 4.0 | 4.6 | 2.6 | 9.8 | 5.4 | 4.7 | 1.2 | 0.1 | 1.0 | 0.2 | 13.9 | 15.1 |
| grind v compressed | opponent | 3.8 | 9.2 | 7.5 | 2.9 | 8.8 | 7.4 | 5.1 | 1.7 | 0.1 | 1.1 | 0.1 | 15.1 | 13.9 |
| expansive v compressed | tracked | 3.8 | 12.3 | 7.7 | 3.1 | 8.6 | 9.4 | 4.9 | 1.7 | 0.1 | 0.9 | 0.1 | 15.8 | 14.7 |
| expansive v compressed | opponent | 3.4 | 8.3 | 6.9 | 2.9 | 8.5 | 7.2 | 5.2 | 1.6 | 0.2 | 0.9 | 0.1 | 14.7 | 15.8 |

_5 cells in 371 s._
