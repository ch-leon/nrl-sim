# Balance: Compressed 464 b10-o30 fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:42.566Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 43.8% ± 3.0% |
| Balanced | — | — | 47.6% ± 3.1% |
| Expansive | — | — | 48.8% ± 3.1% |
| Kick-chase | — | — | 50.2% ± 3.1% |
| All-out | — | — | 49.8% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 47.6% ± 3.1% |
| kick-chase v compressed | 250 | 50.2% ± 3.1% |
| all-out v compressed | 250 | 49.8% ± 3.0% |
| grind v compressed | 250 | 43.8% ± 3.0% |
| expansive v compressed | 250 | 48.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 7.4 | 6.7 | 2.7 | 8.7 | 9.1 | 5.0 | 1.7 | 0.1 | 0.9 | 0.1 | 14.0 | 14.7 |
| balanced v compressed | opponent | 3.3 | 8.4 | 6.8 | 2.8 | 8.8 | 7.2 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.7 | 14.0 |
| kick-chase v compressed | tracked | 1.0 | 7.2 | 6.5 | 2.7 | 9.9 | 8.5 | 4.7 | 2.6 | 0.3 | 1.3 | 0.2 | 14.0 | 13.9 |
| kick-chase v compressed | opponent | 3.6 | 8.5 | 6.8 | 2.7 | 9.0 | 6.9 | 5.3 | 1.8 | 0.1 | 0.9 | 0.1 | 13.9 | 14.0 |
| all-out v compressed | tracked | 5.0 | 7.5 | 7.1 | 3.0 | 8.6 | 9.1 | 5.2 | 2.1 | 0.2 | 0.8 | 0.1 | 15.3 | 15.7 |
| all-out v compressed | opponent | 3.4 | 8.7 | 7.1 | 3.0 | 8.8 | 7.0 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 15.7 | 15.3 |
| grind v compressed | tracked | 0.8 | 4.3 | 4.4 | 2.5 | 10.3 | 5.0 | 4.4 | 1.3 | 0.1 | 1.2 | 0.2 | 13.1 | 14.4 |
| grind v compressed | opponent | 3.6 | 8.7 | 7.1 | 2.7 | 9.1 | 7.2 | 5.3 | 1.9 | 0.1 | 1.0 | 0.2 | 14.4 | 13.1 |
| expansive v compressed | tracked | 3.7 | 11.8 | 7.5 | 2.9 | 8.7 | 8.7 | 4.8 | 1.7 | 0.1 | 0.8 | 0.1 | 14.8 | 15.1 |
| expansive v compressed | opponent | 3.6 | 8.7 | 7.2 | 2.9 | 8.8 | 7.0 | 5.2 | 1.5 | 0.1 | 1.0 | 0.2 | 15.1 | 14.8 |

_5 cells in 493 s._
