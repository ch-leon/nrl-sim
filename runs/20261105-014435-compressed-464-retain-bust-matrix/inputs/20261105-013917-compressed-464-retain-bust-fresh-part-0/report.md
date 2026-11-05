# Balance: Compressed 464 retain-bust fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:17.084Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 45.8% ± 3.0% |
| Balanced | — | — | 51.6% ± 3.1% |
| Expansive | — | — | 48.0% ± 3.1% |
| Kick-chase | — | — | 53.0% ± 3.1% |
| All-out | — | — | 43.0% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 51.6% ± 3.1% |
| kick-chase v compressed | 250 | 53.0% ± 3.1% |
| all-out v compressed | 250 | 43.0% ± 3.0% |
| grind v compressed | 250 | 45.8% ± 3.0% |
| expansive v compressed | 250 | 48.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.6 | 6.5 | 6.6 | 3.0 | 8.9 | 9.2 | 5.1 | 1.8 | 0.2 | 1.0 | 0.1 | 15.4 | 15.1 |
| balanced v compressed | opponent | 3.5 | 8.4 | 7.0 | 2.9 | 8.5 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 15.1 | 15.4 |
| kick-chase v compressed | tracked | 2.3 | 6.5 | 6.5 | 3.0 | 9.9 | 9.0 | 5.0 | 2.7 | 0.3 | 1.4 | 0.2 | 15.7 | 14.4 |
| kick-chase v compressed | opponent | 3.8 | 8.5 | 7.3 | 2.8 | 8.4 | 7.2 | 5.3 | 1.7 | 0.1 | 0.9 | 0.2 | 14.4 | 15.7 |
| all-out v compressed | tracked | 6.2 | 6.7 | 7.1 | 2.9 | 8.1 | 9.5 | 5.4 | 1.8 | 0.2 | 0.7 | 0.1 | 15.0 | 15.9 |
| all-out v compressed | opponent | 3.7 | 8.5 | 7.0 | 3.0 | 8.6 | 7.3 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.9 | 15.0 |
| grind v compressed | tracked | 1.4 | 3.7 | 4.3 | 2.5 | 10.0 | 5.4 | 4.3 | 1.3 | 0.1 | 1.1 | 0.2 | 13.2 | 14.0 |
| grind v compressed | opponent | 3.7 | 9.0 | 7.3 | 2.7 | 8.7 | 7.2 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 14.0 | 13.2 |
| expansive v compressed | tracked | 4.9 | 9.9 | 7.1 | 3.0 | 8.7 | 9.1 | 4.6 | 1.9 | 0.2 | 0.8 | 0.1 | 15.0 | 15.2 |
| expansive v compressed | opponent | 3.7 | 8.7 | 7.1 | 3.0 | 8.6 | 7.1 | 5.1 | 1.7 | 0.1 | 0.9 | 0.2 | 15.2 | 15.0 |

_5 cells in 271 s._
