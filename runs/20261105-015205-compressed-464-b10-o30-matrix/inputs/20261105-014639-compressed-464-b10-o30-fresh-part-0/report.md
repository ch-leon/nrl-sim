# Balance: Compressed 464 b10-o30 fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:39.643Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 41.2% ± 3.0% |
| Balanced | — | — | 54.0% ± 3.0% |
| Expansive | — | — | 54.6% ± 3.0% |
| Kick-chase | — | — | 60.8% ± 3.0% |
| All-out | — | — | 46.6% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 54.0% ± 3.0% |
| kick-chase v compressed | 250 | 60.8% ± 3.0% |
| all-out v compressed | 250 | 46.6% ± 3.0% |
| grind v compressed | 250 | 41.2% ± 3.0% |
| expansive v compressed | 250 | 54.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.5 | 7.5 | 6.6 | 3.0 | 8.7 | 8.8 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 15.3 | 15.0 |
| balanced v compressed | opponent | 3.5 | 8.6 | 6.9 | 2.9 | 8.6 | 6.9 | 5.0 | 1.6 | 0.1 | 1.0 | 0.1 | 15.0 | 15.3 |
| kick-chase v compressed | tracked | 1.2 | 7.4 | 6.6 | 3.0 | 10.1 | 9.0 | 4.8 | 2.6 | 0.3 | 1.4 | 0.2 | 15.8 | 13.6 |
| kick-chase v compressed | opponent | 3.5 | 8.3 | 6.9 | 2.6 | 8.4 | 7.1 | 5.5 | 1.7 | 0.1 | 0.9 | 0.2 | 13.6 | 15.8 |
| all-out v compressed | tracked | 4.8 | 7.4 | 7.2 | 3.0 | 8.5 | 9.0 | 5.2 | 2.0 | 0.2 | 0.7 | 0.1 | 15.3 | 15.3 |
| all-out v compressed | opponent | 3.6 | 8.4 | 7.0 | 3.0 | 8.6 | 6.8 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.3 | 15.3 |
| grind v compressed | tracked | 0.8 | 4.3 | 4.6 | 2.6 | 9.7 | 5.5 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 13.8 | 15.5 |
| grind v compressed | opponent | 3.6 | 9.0 | 7.7 | 3.0 | 9.0 | 7.6 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 15.5 | 13.8 |
| expansive v compressed | tracked | 3.7 | 12.6 | 7.8 | 3.2 | 8.7 | 9.6 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.0 | 14.7 |
| expansive v compressed | opponent | 3.4 | 8.4 | 6.7 | 2.9 | 9.0 | 6.8 | 5.1 | 1.5 | 0.2 | 0.9 | 0.2 | 14.7 | 16.0 |

_5 cells in 368 s._
