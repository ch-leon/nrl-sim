# Balance: Compressed 464 fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:26:33.156Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 47.2% ± 3.1% |
| Balanced | 50.0% ± 3.1% | 48.4% ± 3.0% | 51.4% ± 3.1% |
| Expansive | — | — | 58.8% ± 3.0% |
| Kick-chase | — | — | 52.0% ± 3.1% |
| All-out | — | — | 49.8% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 250 | 50.0% ± 3.1% |
| balanced v rush | 250 | 48.4% ± 3.0% |
| balanced v compressed | 250 | 51.4% ± 3.1% |
| kick-chase v compressed | 250 | 52.0% ± 3.1% |
| all-out v compressed | 250 | 49.8% ± 3.1% |
| grind v compressed | 250 | 47.2% ± 3.1% |
| expansive v compressed | 250 | 58.8% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.5 | 8.4 | 6.8 | 2.9 | 8.8 | 7.0 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 14.9 | 14.9 |
| balanced v slide | opponent | 3.5 | 8.4 | 6.8 | 2.9 | 8.8 | 7.0 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 14.9 | 14.9 |
| balanced v rush | tracked | 3.8 | 22.0 | 6.0 | 2.9 | 8.7 | 9.8 | 5.1 | 1.6 | 0.2 | 1.1 | 0.2 | 14.8 | 15.1 |
| balanced v rush | opponent | 3.7 | 8.2 | 7.0 | 2.9 | 8.9 | 7.0 | 5.0 | 1.6 | 0.2 | 1.1 | 0.2 | 15.1 | 14.8 |
| balanced v compressed | tracked | 3.6 | 8.8 | 7.5 | 3.1 | 8.6 | 9.3 | 4.9 | 1.6 | 0.1 | 1.1 | 0.2 | 15.9 | 15.6 |
| balanced v compressed | opponent | 3.4 | 8.3 | 6.7 | 3.0 | 8.8 | 7.0 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.6 | 15.9 |
| kick-chase v compressed | tracked | 2.1 | 8.3 | 6.6 | 3.0 | 9.7 | 8.8 | 5.1 | 2.7 | 0.3 | 1.2 | 0.3 | 15.7 | 14.4 |
| kick-chase v compressed | opponent | 3.7 | 8.3 | 6.6 | 2.8 | 9.1 | 6.7 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 14.4 | 15.7 |
| all-out v compressed | tracked | 6.2 | 8.7 | 7.4 | 3.1 | 8.2 | 9.2 | 5.4 | 1.9 | 0.1 | 0.7 | 0.1 | 15.9 | 15.8 |
| all-out v compressed | opponent | 3.5 | 8.4 | 7.0 | 3.1 | 8.8 | 6.9 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 15.8 | 15.9 |
| grind v compressed | tracked | 1.4 | 5.3 | 4.8 | 2.6 | 10.0 | 5.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 13.5 | 14.7 |
| grind v compressed | opponent | 3.5 | 8.7 | 7.1 | 2.8 | 8.8 | 7.0 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 14.7 | 13.5 |
| expansive v compressed | tracked | 4.8 | 12.1 | 7.7 | 3.3 | 8.7 | 9.5 | 4.7 | 1.8 | 0.1 | 0.7 | 0.1 | 16.8 | 14.5 |
| expansive v compressed | opponent | 3.6 | 8.6 | 6.9 | 2.9 | 8.5 | 7.1 | 5.2 | 1.6 | 0.1 | 0.9 | 0.1 | 14.5 | 16.8 |

_7 cells in 516 s._
