# Balance: Compressed 464 retain-offload fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:19.830Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 44.2% ± 3.1% |
| Balanced | — | — | 54.0% ± 3.1% |
| Expansive | — | — | 51.2% ± 3.0% |
| Kick-chase | — | — | 63.6% ± 2.9% |
| All-out | — | — | 51.8% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 54.0% ± 3.1% |
| kick-chase v compressed | 250 | 63.6% ± 2.9% |
| all-out v compressed | 250 | 51.8% ± 3.1% |
| grind v compressed | 250 | 44.2% ± 3.1% |
| expansive v compressed | 250 | 51.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 8.3 | 6.7 | 3.0 | 8.8 | 8.7 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.7 | 14.5 |
| balanced v compressed | opponent | 3.6 | 8.4 | 6.8 | 2.8 | 8.6 | 7.1 | 5.2 | 1.7 | 0.1 | 0.8 | 0.1 | 14.5 | 15.7 |
| kick-chase v compressed | tracked | 1.0 | 8.5 | 7.1 | 3.1 | 10.2 | 8.9 | 4.8 | 2.7 | 0.3 | 1.3 | 0.3 | 16.4 | 13.8 |
| kick-chase v compressed | opponent | 3.6 | 8.4 | 6.9 | 2.7 | 8.6 | 6.9 | 5.4 | 1.7 | 0.1 | 0.9 | 0.1 | 13.8 | 16.4 |
| all-out v compressed | tracked | 5.0 | 8.5 | 7.0 | 3.0 | 8.3 | 9.0 | 5.4 | 1.9 | 0.2 | 0.8 | 0.1 | 15.6 | 15.2 |
| all-out v compressed | opponent | 3.5 | 8.4 | 6.8 | 2.9 | 8.6 | 6.6 | 5.4 | 1.7 | 0.1 | 0.9 | 0.1 | 15.2 | 15.6 |
| grind v compressed | tracked | 0.8 | 5.2 | 4.7 | 2.6 | 9.6 | 5.1 | 4.7 | 1.3 | 0.1 | 1.1 | 0.1 | 13.4 | 14.3 |
| grind v compressed | opponent | 3.7 | 8.7 | 7.4 | 2.8 | 8.9 | 7.1 | 5.2 | 1.8 | 0.1 | 1.0 | 0.1 | 14.3 | 13.4 |
| expansive v compressed | tracked | 3.2 | 11.7 | 7.5 | 3.0 | 8.8 | 9.0 | 5.0 | 1.7 | 0.1 | 0.8 | 0.1 | 15.2 | 15.1 |
| expansive v compressed | opponent | 3.5 | 8.3 | 7.1 | 2.9 | 8.7 | 6.9 | 5.1 | 1.5 | 0.2 | 1.0 | 0.2 | 15.1 | 15.2 |

_5 cells in 492 s._
