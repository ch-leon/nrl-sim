# Balance: Compressed 464 b10-o15 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:35.993Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 44.2% ± 3.0% |
| Balanced | — | — | 47.8% ± 3.1% |
| Expansive | — | — | 50.4% ± 3.1% |
| Kick-chase | — | — | 52.8% ± 3.1% |
| All-out | — | — | 49.6% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 47.8% ± 3.1% |
| kick-chase v compressed | 250 | 52.8% ± 3.1% |
| all-out v compressed | 250 | 49.6% ± 3.0% |
| grind v compressed | 250 | 44.2% ± 3.0% |
| expansive v compressed | 250 | 50.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.0 | 7.1 | 6.9 | 2.8 | 8.5 | 8.8 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 14.7 | 15.2 |
| balanced v compressed | opponent | 3.6 | 8.8 | 6.9 | 3.0 | 8.7 | 7.1 | 5.1 | 1.7 | 0.1 | 0.9 | 0.2 | 15.2 | 14.7 |
| kick-chase v compressed | tracked | 1.5 | 7.2 | 6.5 | 2.9 | 9.9 | 8.6 | 4.7 | 2.8 | 0.3 | 1.4 | 0.2 | 15.1 | 14.3 |
| kick-chase v compressed | opponent | 3.6 | 8.1 | 7.0 | 2.7 | 8.5 | 6.9 | 5.4 | 1.6 | 0.2 | 0.8 | 0.1 | 14.3 | 15.1 |
| all-out v compressed | tracked | 5.5 | 7.0 | 7.2 | 2.9 | 8.4 | 9.3 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 14.9 | 14.9 |
| all-out v compressed | opponent | 3.6 | 8.6 | 6.7 | 2.9 | 8.6 | 6.4 | 5.2 | 1.7 | 0.1 | 0.9 | 0.2 | 14.9 | 14.9 |
| grind v compressed | tracked | 1.1 | 4.5 | 4.5 | 2.6 | 9.9 | 5.0 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 13.7 | 15.2 |
| grind v compressed | opponent | 3.6 | 9.0 | 7.8 | 3.0 | 8.8 | 7.3 | 5.3 | 1.7 | 0.1 | 1.0 | 0.2 | 15.2 | 13.7 |
| expansive v compressed | tracked | 4.2 | 12.7 | 7.9 | 3.1 | 8.6 | 9.3 | 4.8 | 1.6 | 0.2 | 0.9 | 0.1 | 15.9 | 15.1 |
| expansive v compressed | opponent | 3.8 | 8.8 | 7.4 | 2.9 | 8.8 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.1 | 15.9 |

_5 cells in 278 s._
