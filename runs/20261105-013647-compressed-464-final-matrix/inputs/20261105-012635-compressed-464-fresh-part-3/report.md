# Balance: Compressed 464 fresh part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:26:35.685Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 47.8% ± 3.0% |
| Balanced | 50.0% ± 3.0% | 45.2% ± 3.1% | 53.2% ± 3.1% |
| Expansive | — | — | 64.0% ± 2.9% |
| Kick-chase | — | — | 55.8% ± 3.1% |
| All-out | — | — | 50.8% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 250 | 50.0% ± 3.0% |
| balanced v rush | 250 | 45.2% ± 3.1% |
| balanced v compressed | 250 | 53.2% ± 3.1% |
| kick-chase v compressed | 250 | 55.8% ± 3.1% |
| all-out v compressed | 250 | 50.8% ± 3.1% |
| grind v compressed | 250 | 47.8% ± 3.0% |
| expansive v compressed | 250 | 64.0% ± 2.9% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.6 | 8.7 | 7.0 | 2.9 | 8.6 | 6.8 | 5.2 | 1.6 | 0.1 | 0.9 | 0.2 | 15.0 | 15.0 |
| balanced v slide | opponent | 3.6 | 8.7 | 7.0 | 2.9 | 8.6 | 6.8 | 5.2 | 1.6 | 0.1 | 0.9 | 0.2 | 15.0 | 15.0 |
| balanced v rush | tracked | 3.5 | 22.1 | 6.0 | 3.0 | 8.2 | 9.2 | 5.1 | 1.6 | 0.1 | 0.9 | 0.2 | 15.4 | 16.6 |
| balanced v rush | opponent | 3.7 | 8.5 | 7.1 | 3.2 | 9.0 | 6.9 | 4.8 | 1.6 | 0.1 | 1.0 | 0.1 | 16.6 | 15.4 |
| balanced v compressed | tracked | 3.8 | 8.2 | 7.1 | 3.0 | 8.6 | 8.9 | 5.3 | 1.6 | 0.1 | 1.0 | 0.1 | 15.4 | 14.6 |
| balanced v compressed | opponent | 3.7 | 8.2 | 6.8 | 2.8 | 8.7 | 6.6 | 5.3 | 1.8 | 0.2 | 1.0 | 0.2 | 14.6 | 15.4 |
| kick-chase v compressed | tracked | 2.2 | 8.2 | 6.5 | 2.9 | 9.8 | 8.6 | 4.9 | 2.5 | 0.3 | 1.3 | 0.3 | 14.6 | 13.9 |
| kick-chase v compressed | opponent | 3.7 | 8.1 | 6.9 | 2.7 | 8.9 | 6.4 | 5.2 | 1.7 | 0.2 | 0.9 | 0.1 | 13.9 | 14.6 |
| all-out v compressed | tracked | 6.1 | 8.5 | 7.4 | 2.9 | 8.4 | 9.6 | 5.1 | 2.0 | 0.1 | 0.8 | 0.1 | 15.3 | 14.8 |
| all-out v compressed | opponent | 3.6 | 8.4 | 6.7 | 2.9 | 8.6 | 6.7 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 14.8 | 15.3 |
| grind v compressed | tracked | 1.4 | 4.9 | 4.5 | 2.6 | 9.9 | 5.4 | 4.5 | 1.3 | 0.1 | 1.1 | 0.1 | 13.6 | 14.3 |
| grind v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.7 | 8.8 | 7.0 | 5.4 | 1.7 | 0.2 | 1.0 | 0.2 | 14.3 | 13.6 |
| expansive v compressed | tracked | 4.7 | 12.1 | 7.9 | 3.3 | 8.9 | 9.1 | 4.7 | 1.9 | 0.1 | 0.7 | 0.1 | 17.0 | 14.3 |
| expansive v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.8 | 8.3 | 6.7 | 5.2 | 1.5 | 0.1 | 0.9 | 0.1 | 14.3 | 17.0 |

_7 cells in 681 s._
