# Balance: Compressed 464 b10-o30 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:39.515Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 40.8% ± 3.0% |
| Balanced | — | — | 45.4% ± 3.0% |
| Expansive | — | — | 57.8% ± 3.0% |
| Kick-chase | — | — | 54.2% ± 3.0% |
| All-out | — | — | 49.6% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 45.4% ± 3.0% |
| kick-chase v compressed | 250 | 54.2% ± 3.0% |
| all-out v compressed | 250 | 49.6% ± 3.1% |
| grind v compressed | 250 | 40.8% ± 3.0% |
| expansive v compressed | 250 | 57.8% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.5 | 7.0 | 6.5 | 2.8 | 8.4 | 8.7 | 5.2 | 1.5 | 0.1 | 1.0 | 0.1 | 14.6 | 16.0 |
| balanced v compressed | opponent | 3.6 | 8.9 | 7.2 | 3.1 | 8.8 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.2 | 16.0 | 14.6 |
| kick-chase v compressed | tracked | 0.9 | 7.4 | 6.6 | 3.0 | 9.9 | 8.9 | 4.8 | 2.7 | 0.3 | 1.3 | 0.3 | 15.7 | 14.2 |
| kick-chase v compressed | opponent | 3.5 | 8.3 | 7.1 | 2.7 | 8.6 | 6.9 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 14.2 | 15.7 |
| all-out v compressed | tracked | 4.8 | 7.1 | 7.2 | 2.9 | 8.3 | 9.0 | 5.4 | 1.8 | 0.2 | 0.8 | 0.1 | 15.0 | 15.2 |
| all-out v compressed | opponent | 3.8 | 8.5 | 7.0 | 3.0 | 8.6 | 6.8 | 5.3 | 1.6 | 0.1 | 0.9 | 0.2 | 15.2 | 15.0 |
| grind v compressed | tracked | 0.8 | 4.6 | 4.5 | 2.6 | 9.9 | 5.3 | 4.8 | 1.3 | 0.1 | 1.1 | 0.2 | 13.4 | 15.2 |
| grind v compressed | opponent | 3.6 | 9.0 | 7.7 | 3.0 | 8.8 | 7.1 | 5.4 | 1.7 | 0.1 | 1.0 | 0.2 | 15.2 | 13.4 |
| expansive v compressed | tracked | 3.8 | 12.6 | 7.8 | 3.2 | 8.8 | 9.4 | 4.8 | 1.8 | 0.1 | 0.8 | 0.1 | 16.4 | 14.3 |
| expansive v compressed | opponent | 3.6 | 8.4 | 7.1 | 2.8 | 8.6 | 6.8 | 5.3 | 1.6 | 0.1 | 1.0 | 0.2 | 14.3 | 16.4 |

_5 cells in 373 s._
