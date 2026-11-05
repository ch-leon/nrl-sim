# Balance: Compressed 464 b10-o30 fresh part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:38.978Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 45.2% ± 3.1% |
| Balanced | — | — | 49.6% ± 3.1% |
| Expansive | — | — | 62.0% ± 3.0% |
| Kick-chase | — | — | 48.8% ± 3.1% |
| All-out | — | — | 49.4% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 49.6% ± 3.1% |
| kick-chase v compressed | 250 | 48.8% ± 3.1% |
| all-out v compressed | 250 | 49.4% ± 3.1% |
| grind v compressed | 250 | 45.2% ± 3.1% |
| expansive v compressed | 250 | 62.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 7.4 | 6.7 | 2.9 | 8.6 | 8.6 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 14.9 | 15.0 |
| balanced v compressed | opponent | 3.6 | 8.1 | 6.9 | 2.9 | 8.6 | 6.9 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 15.0 | 14.9 |
| kick-chase v compressed | tracked | 1.1 | 6.9 | 6.1 | 2.7 | 9.6 | 8.4 | 5.1 | 2.5 | 0.3 | 1.2 | 0.2 | 14.2 | 14.4 |
| kick-chase v compressed | opponent | 3.8 | 8.5 | 7.0 | 2.8 | 8.8 | 6.9 | 5.2 | 1.6 | 0.1 | 0.9 | 0.1 | 14.4 | 14.2 |
| all-out v compressed | tracked | 4.7 | 7.3 | 7.1 | 2.9 | 8.4 | 8.9 | 5.0 | 1.9 | 0.2 | 0.8 | 0.1 | 14.9 | 15.3 |
| all-out v compressed | opponent | 3.5 | 8.4 | 7.2 | 3.0 | 8.8 | 6.7 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 15.3 | 14.9 |
| grind v compressed | tracked | 0.8 | 4.4 | 4.5 | 2.6 | 9.8 | 5.3 | 4.3 | 1.1 | 0.1 | 1.1 | 0.2 | 13.3 | 14.1 |
| grind v compressed | opponent | 3.8 | 8.6 | 7.2 | 2.8 | 8.9 | 7.1 | 5.3 | 1.8 | 0.1 | 0.9 | 0.1 | 14.1 | 13.3 |
| expansive v compressed | tracked | 3.8 | 12.0 | 7.8 | 3.3 | 8.9 | 9.3 | 4.7 | 1.8 | 0.2 | 0.7 | 0.2 | 16.6 | 14.1 |
| expansive v compressed | opponent | 3.5 | 8.4 | 6.9 | 2.7 | 8.4 | 6.4 | 5.3 | 1.7 | 0.2 | 0.9 | 0.1 | 14.1 | 16.6 |

_5 cells in 486 s._
