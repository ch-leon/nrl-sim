# Balance: Compressed 464 b15-o30 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:43.369Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 38.6% ± 3.0% |
| Balanced | — | — | 49.0% ± 3.1% |
| Expansive | — | — | 53.2% ± 3.0% |
| Kick-chase | — | — | 55.4% ± 3.0% |
| All-out | — | — | 54.8% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 49.0% ± 3.1% |
| kick-chase v compressed | 250 | 55.4% ± 3.0% |
| all-out v compressed | 250 | 54.8% ± 3.1% |
| grind v compressed | 250 | 38.6% ± 3.0% |
| expansive v compressed | 250 | 53.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.3 | 6.7 | 6.6 | 2.9 | 8.9 | 9.0 | 5.1 | 1.7 | 0.1 | 1.1 | 0.1 | 14.9 | 15.1 |
| balanced v compressed | opponent | 3.5 | 8.8 | 7.0 | 2.9 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 0.9 | 0.2 | 15.1 | 14.9 |
| kick-chase v compressed | tracked | 1.1 | 6.6 | 6.2 | 2.9 | 9.9 | 8.6 | 4.9 | 2.6 | 0.3 | 1.3 | 0.2 | 15.0 | 14.5 |
| kick-chase v compressed | opponent | 3.7 | 8.3 | 7.1 | 2.8 | 8.8 | 7.0 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 14.5 | 15.0 |
| all-out v compressed | tracked | 4.9 | 6.8 | 7.1 | 3.0 | 8.4 | 9.3 | 5.1 | 1.7 | 0.2 | 0.8 | 0.1 | 15.3 | 14.7 |
| all-out v compressed | opponent | 3.8 | 8.5 | 7.1 | 2.9 | 8.5 | 6.8 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 14.7 | 15.3 |
| grind v compressed | tracked | 0.8 | 4.2 | 4.4 | 2.6 | 9.9 | 5.4 | 4.8 | 1.3 | 0.1 | 1.1 | 0.1 | 13.3 | 15.0 |
| grind v compressed | opponent | 3.8 | 8.9 | 7.4 | 2.9 | 9.0 | 7.2 | 5.3 | 1.7 | 0.2 | 1.0 | 0.2 | 15.0 | 13.3 |
| expansive v compressed | tracked | 3.9 | 11.6 | 7.6 | 3.0 | 8.7 | 9.3 | 4.8 | 1.8 | 0.2 | 0.8 | 0.1 | 15.5 | 14.9 |
| expansive v compressed | opponent | 3.5 | 8.5 | 7.1 | 2.9 | 8.7 | 6.9 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.9 | 15.5 |

_5 cells in 495 s._
