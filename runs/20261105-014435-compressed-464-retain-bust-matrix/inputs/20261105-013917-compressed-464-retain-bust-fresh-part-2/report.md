# Balance: Compressed 464 retain-bust fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:17.827Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 43.6% ± 3.1% |
| Balanced | — | — | 48.6% ± 3.1% |
| Expansive | — | — | 46.2% ± 3.1% |
| Kick-chase | — | — | 49.6% ± 3.1% |
| All-out | — | — | 45.6% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 48.6% ± 3.1% |
| kick-chase v compressed | 250 | 49.6% ± 3.1% |
| all-out v compressed | 250 | 45.6% ± 3.0% |
| grind v compressed | 250 | 43.6% ± 3.1% |
| expansive v compressed | 250 | 46.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.4 | 6.3 | 6.6 | 2.8 | 8.7 | 8.9 | 5.2 | 1.5 | 0.1 | 1.0 | 0.2 | 14.6 | 14.9 |
| balanced v compressed | opponent | 3.7 | 8.7 | 7.0 | 2.9 | 9.0 | 7.0 | 4.9 | 1.7 | 0.1 | 1.1 | 0.2 | 14.9 | 14.6 |
| kick-chase v compressed | tracked | 2.2 | 6.0 | 6.3 | 2.9 | 9.9 | 8.4 | 4.9 | 2.4 | 0.3 | 1.4 | 0.3 | 14.9 | 15.2 |
| kick-chase v compressed | opponent | 3.6 | 8.4 | 7.0 | 2.9 | 8.7 | 7.0 | 5.3 | 1.8 | 0.1 | 0.9 | 0.1 | 15.2 | 14.9 |
| all-out v compressed | tracked | 6.2 | 6.5 | 7.0 | 2.8 | 8.3 | 9.4 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 14.2 | 14.9 |
| all-out v compressed | opponent | 3.7 | 8.6 | 7.0 | 2.9 | 8.6 | 6.9 | 5.0 | 1.7 | 0.1 | 0.9 | 0.1 | 14.9 | 14.2 |
| grind v compressed | tracked | 1.5 | 3.8 | 4.4 | 2.6 | 9.8 | 5.3 | 4.7 | 1.3 | 0.1 | 1.0 | 0.1 | 13.4 | 14.5 |
| grind v compressed | opponent | 3.6 | 8.5 | 7.5 | 2.8 | 8.7 | 7.3 | 5.4 | 1.6 | 0.1 | 1.0 | 0.2 | 14.5 | 13.4 |
| expansive v compressed | tracked | 5.1 | 9.7 | 7.2 | 2.9 | 8.6 | 9.2 | 4.9 | 1.7 | 0.2 | 0.7 | 0.1 | 14.7 | 15.3 |
| expansive v compressed | opponent | 3.5 | 8.6 | 7.2 | 2.9 | 8.9 | 7.1 | 5.1 | 1.7 | 0.2 | 1.1 | 0.2 | 15.3 | 14.7 |

_5 cells in 301 s._
