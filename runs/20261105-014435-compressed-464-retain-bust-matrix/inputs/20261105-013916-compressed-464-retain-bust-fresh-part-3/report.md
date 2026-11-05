# Balance: Compressed 464 retain-bust fresh part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:16.831Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 44.2% ± 3.0% |
| Balanced | — | — | 48.8% ± 3.1% |
| Expansive | — | — | 52.0% ± 3.1% |
| Kick-chase | — | — | 49.8% ± 3.1% |
| All-out | — | — | 48.2% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 48.8% ± 3.1% |
| kick-chase v compressed | 250 | 49.8% ± 3.1% |
| all-out v compressed | 250 | 48.2% ± 3.1% |
| grind v compressed | 250 | 44.2% ± 3.0% |
| expansive v compressed | 250 | 52.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.6 | 6.5 | 6.7 | 2.7 | 8.6 | 8.5 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 14.1 | 14.6 |
| balanced v compressed | opponent | 3.5 | 8.4 | 6.8 | 2.8 | 9.0 | 7.1 | 5.1 | 1.8 | 0.2 | 0.9 | 0.2 | 14.6 | 14.1 |
| kick-chase v compressed | tracked | 2.2 | 5.9 | 6.2 | 2.9 | 10.0 | 8.6 | 5.0 | 2.6 | 0.3 | 1.3 | 0.3 | 14.9 | 14.7 |
| kick-chase v compressed | opponent | 3.8 | 8.3 | 6.7 | 2.8 | 8.8 | 6.7 | 5.6 | 1.6 | 0.1 | 0.9 | 0.1 | 14.7 | 14.9 |
| all-out v compressed | tracked | 6.1 | 6.2 | 7.1 | 2.8 | 8.3 | 8.8 | 5.2 | 2.0 | 0.2 | 0.8 | 0.1 | 14.8 | 15.7 |
| all-out v compressed | opponent | 3.7 | 8.4 | 6.9 | 3.0 | 8.8 | 6.7 | 5.0 | 1.7 | 0.2 | 1.0 | 0.1 | 15.7 | 14.8 |
| grind v compressed | tracked | 1.3 | 3.5 | 4.3 | 2.4 | 9.9 | 5.5 | 4.4 | 1.2 | 0.1 | 1.2 | 0.2 | 12.4 | 14.2 |
| grind v compressed | opponent | 3.7 | 8.7 | 7.2 | 2.8 | 8.9 | 7.0 | 5.4 | 1.7 | 0.1 | 0.9 | 0.2 | 14.2 | 12.4 |
| expansive v compressed | tracked | 4.8 | 9.7 | 7.1 | 3.0 | 8.8 | 9.1 | 5.0 | 1.9 | 0.2 | 0.7 | 0.1 | 15.2 | 15.2 |
| expansive v compressed | opponent | 3.6 | 8.5 | 7.0 | 3.0 | 8.8 | 7.0 | 4.9 | 1.6 | 0.1 | 1.0 | 0.2 | 15.2 | 15.2 |

_5 cells in 279 s._
