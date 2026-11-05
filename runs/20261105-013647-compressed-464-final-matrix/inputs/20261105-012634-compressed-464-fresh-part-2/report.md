# Balance: Compressed 464 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:26:34.173Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 49.2% ± 3.1% |
| Balanced | 50.0% ± 3.1% | 52.4% ± 3.1% | 50.0% ± 3.0% |
| Expansive | — | — | 53.4% ± 3.1% |
| Kick-chase | — | — | 60.2% ± 3.0% |
| All-out | — | — | 46.4% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 250 | 50.0% ± 3.1% |
| balanced v rush | 250 | 52.4% ± 3.1% |
| balanced v compressed | 250 | 50.0% ± 3.0% |
| kick-chase v compressed | 250 | 60.2% ± 3.0% |
| all-out v compressed | 250 | 46.4% ± 3.0% |
| grind v compressed | 250 | 49.2% ± 3.1% |
| expansive v compressed | 250 | 53.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.7 | 8.5 | 6.8 | 2.7 | 8.5 | 6.5 | 5.4 | 1.6 | 0.1 | 1.0 | 0.2 | 14.2 | 14.2 |
| balanced v slide | opponent | 3.7 | 8.5 | 6.8 | 2.7 | 8.5 | 6.5 | 5.4 | 1.6 | 0.1 | 1.0 | 0.2 | 14.2 | 14.2 |
| balanced v rush | tracked | 3.6 | 22.3 | 6.0 | 3.0 | 8.7 | 9.4 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 15.5 | 15.5 |
| balanced v rush | opponent | 3.6 | 8.4 | 6.8 | 3.0 | 8.7 | 6.7 | 5.2 | 1.5 | 0.2 | 0.9 | 0.1 | 15.5 | 15.5 |
| balanced v compressed | tracked | 3.5 | 8.2 | 7.1 | 2.8 | 8.7 | 8.8 | 4.8 | 1.6 | 0.2 | 1.0 | 0.1 | 14.6 | 14.4 |
| balanced v compressed | opponent | 3.4 | 8.5 | 7.1 | 2.8 | 8.7 | 7.3 | 5.0 | 1.7 | 0.1 | 0.9 | 0.1 | 14.4 | 14.6 |
| kick-chase v compressed | tracked | 2.0 | 8.2 | 6.7 | 3.0 | 10.1 | 8.6 | 4.7 | 2.8 | 0.4 | 1.3 | 0.2 | 15.9 | 14.1 |
| kick-chase v compressed | opponent | 3.5 | 8.7 | 7.1 | 2.7 | 8.7 | 7.3 | 5.3 | 1.7 | 0.2 | 0.9 | 0.1 | 14.1 | 15.9 |
| all-out v compressed | tracked | 6.1 | 8.3 | 7.3 | 2.9 | 8.3 | 9.0 | 5.4 | 1.9 | 0.2 | 0.8 | 0.1 | 15.1 | 15.2 |
| all-out v compressed | opponent | 3.6 | 8.1 | 6.6 | 2.9 | 8.7 | 6.6 | 5.1 | 1.8 | 0.2 | 1.0 | 0.2 | 15.2 | 15.1 |
| grind v compressed | tracked | 1.5 | 5.2 | 4.7 | 2.6 | 9.8 | 5.4 | 4.7 | 1.2 | 0.1 | 1.1 | 0.1 | 13.6 | 14.4 |
| grind v compressed | opponent | 3.4 | 8.5 | 7.3 | 2.8 | 8.9 | 7.0 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 14.4 | 13.6 |
| expansive v compressed | tracked | 4.8 | 11.9 | 7.6 | 3.0 | 8.8 | 9.2 | 5.0 | 1.8 | 0.1 | 0.7 | 0.1 | 15.0 | 14.2 |
| expansive v compressed | opponent | 3.6 | 8.5 | 7.4 | 2.8 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 14.2 | 15.0 |

_7 cells in 662 s._
