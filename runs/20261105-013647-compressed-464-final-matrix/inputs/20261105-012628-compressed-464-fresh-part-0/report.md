# Balance: Compressed 464 fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:26:28.956Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 48.0% ± 3.0% |
| Balanced | 50.0% ± 3.1% | 48.4% ± 3.1% | 49.2% ± 3.1% |
| Expansive | — | — | 55.6% ± 3.0% |
| Kick-chase | — | — | 58.4% ± 3.0% |
| All-out | — | — | 50.2% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 250 | 50.0% ± 3.1% |
| balanced v rush | 250 | 48.4% ± 3.1% |
| balanced v compressed | 250 | 49.2% ± 3.1% |
| kick-chase v compressed | 250 | 58.4% ± 3.0% |
| all-out v compressed | 250 | 50.2% ± 3.1% |
| grind v compressed | 250 | 48.0% ± 3.0% |
| expansive v compressed | 250 | 55.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.6 | 8.5 | 7.1 | 2.9 | 8.6 | 7.1 | 5.0 | 1.5 | 0.2 | 0.9 | 0.2 | 15.1 | 15.1 |
| balanced v slide | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.6 | 7.1 | 5.0 | 1.5 | 0.2 | 0.9 | 0.2 | 15.1 | 15.1 |
| balanced v rush | tracked | 3.6 | 21.9 | 5.8 | 3.1 | 8.5 | 9.4 | 5.0 | 1.4 | 0.2 | 0.9 | 0.1 | 15.9 | 15.9 |
| balanced v rush | opponent | 3.7 | 8.8 | 7.4 | 3.1 | 8.5 | 7.2 | 4.9 | 1.4 | 0.2 | 1.1 | 0.2 | 15.9 | 15.9 |
| balanced v compressed | tracked | 3.4 | 8.1 | 7.0 | 3.0 | 8.6 | 9.0 | 4.9 | 1.6 | 0.2 | 1.0 | 0.1 | 15.8 | 15.9 |
| balanced v compressed | opponent | 3.7 | 8.6 | 7.3 | 3.0 | 8.4 | 7.2 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.9 | 15.8 |
| kick-chase v compressed | tracked | 2.1 | 8.6 | 7.0 | 3.1 | 9.8 | 9.4 | 5.2 | 2.6 | 0.3 | 1.3 | 0.3 | 16.4 | 14.2 |
| kick-chase v compressed | opponent | 3.4 | 8.3 | 6.9 | 2.7 | 8.6 | 7.1 | 5.4 | 1.6 | 0.2 | 0.9 | 0.1 | 14.2 | 16.4 |
| all-out v compressed | tracked | 6.2 | 8.7 | 7.5 | 3.1 | 8.0 | 9.6 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 16.0 | 15.8 |
| all-out v compressed | opponent | 3.5 | 8.5 | 6.9 | 3.0 | 8.6 | 7.4 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 15.8 | 16.0 |
| grind v compressed | tracked | 1.5 | 5.2 | 4.8 | 2.5 | 9.7 | 5.5 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 12.9 | 13.8 |
| grind v compressed | opponent | 3.5 | 9.2 | 7.9 | 2.7 | 9.0 | 7.4 | 5.2 | 1.7 | 0.1 | 1.1 | 0.1 | 13.8 | 12.9 |
| expansive v compressed | tracked | 5.1 | 12.4 | 7.6 | 3.1 | 8.3 | 9.6 | 4.6 | 1.9 | 0.2 | 0.7 | 0.1 | 15.5 | 14.7 |
| expansive v compressed | opponent | 3.6 | 8.4 | 7.0 | 2.8 | 8.5 | 6.9 | 5.1 | 1.5 | 0.1 | 1.0 | 0.2 | 14.7 | 15.5 |

_7 cells in 384 s._
