# Balance: Compressed 464 retain-offload fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:18.086Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 44.8% ± 3.0% |
| Balanced | — | — | 47.0% ± 3.1% |
| Expansive | — | — | 54.6% ± 3.0% |
| Kick-chase | — | — | 54.2% ± 3.0% |
| All-out | — | — | 50.2% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 47.0% ± 3.1% |
| kick-chase v compressed | 250 | 54.2% ± 3.0% |
| all-out v compressed | 250 | 50.2% ± 3.1% |
| grind v compressed | 250 | 44.8% ± 3.0% |
| expansive v compressed | 250 | 54.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.2 | 8.5 | 7.2 | 3.0 | 8.5 | 9.1 | 5.1 | 1.7 | 0.1 | 1.0 | 0.2 | 15.4 | 15.7 |
| balanced v compressed | opponent | 3.6 | 8.4 | 7.1 | 3.0 | 8.8 | 7.0 | 5.0 | 1.6 | 0.1 | 0.9 | 0.1 | 15.7 | 15.4 |
| kick-chase v compressed | tracked | 1.0 | 8.4 | 6.7 | 3.0 | 9.8 | 8.7 | 5.0 | 2.7 | 0.2 | 1.3 | 0.3 | 15.7 | 14.6 |
| kick-chase v compressed | opponent | 3.5 | 8.2 | 6.7 | 2.8 | 8.8 | 6.8 | 5.3 | 1.6 | 0.1 | 1.0 | 0.1 | 14.6 | 15.7 |
| all-out v compressed | tracked | 5.0 | 8.5 | 7.2 | 3.0 | 8.5 | 8.8 | 5.3 | 2.1 | 0.2 | 0.8 | 0.1 | 15.2 | 15.3 |
| all-out v compressed | opponent | 3.7 | 8.5 | 6.9 | 2.9 | 8.8 | 7.2 | 5.0 | 1.7 | 0.2 | 1.0 | 0.2 | 15.3 | 15.2 |
| grind v compressed | tracked | 0.8 | 5.2 | 4.7 | 2.5 | 10.2 | 5.0 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 12.9 | 14.5 |
| grind v compressed | opponent | 3.6 | 8.5 | 7.2 | 2.8 | 8.9 | 7.3 | 5.2 | 1.8 | 0.2 | 0.9 | 0.2 | 14.5 | 12.9 |
| expansive v compressed | tracked | 3.5 | 11.8 | 7.2 | 3.1 | 8.9 | 9.4 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.9 | 14.2 |
| expansive v compressed | opponent | 3.8 | 8.6 | 7.1 | 2.8 | 8.6 | 7.0 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 14.2 | 15.9 |

_5 cells in 288 s._
