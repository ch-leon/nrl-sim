# Balance: Compressed 464 b10-o15 fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:44.390Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 47.8% ± 3.1% |
| Balanced | — | — | 52.4% ± 3.1% |
| Expansive | — | — | 43.2% ± 3.0% |
| Kick-chase | — | — | 52.8% ± 3.1% |
| All-out | — | — | 50.8% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 52.4% ± 3.1% |
| kick-chase v compressed | 250 | 52.8% ± 3.1% |
| all-out v compressed | 250 | 50.8% ± 3.1% |
| grind v compressed | 250 | 47.8% ± 3.1% |
| expansive v compressed | 250 | 43.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.8 | 7.4 | 6.9 | 2.8 | 8.7 | 9.1 | 4.9 | 1.7 | 0.1 | 0.9 | 0.2 | 14.7 | 14.7 |
| balanced v compressed | opponent | 3.6 | 8.3 | 6.9 | 2.9 | 8.8 | 6.9 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.7 | 14.7 |
| kick-chase v compressed | tracked | 1.5 | 7.4 | 6.6 | 2.9 | 9.9 | 8.7 | 4.8 | 2.6 | 0.3 | 1.3 | 0.2 | 14.7 | 13.9 |
| kick-chase v compressed | opponent | 3.6 | 8.3 | 6.6 | 2.7 | 9.1 | 7.0 | 5.2 | 1.8 | 0.1 | 1.0 | 0.1 | 13.9 | 14.7 |
| all-out v compressed | tracked | 5.7 | 7.4 | 7.0 | 3.1 | 8.5 | 9.0 | 5.1 | 2.0 | 0.2 | 0.9 | 0.1 | 15.9 | 16.1 |
| all-out v compressed | opponent | 3.4 | 8.6 | 7.1 | 3.1 | 8.6 | 7.1 | 5.0 | 1.6 | 0.1 | 1.0 | 0.1 | 16.1 | 15.9 |
| grind v compressed | tracked | 1.1 | 4.3 | 4.6 | 2.5 | 10.1 | 5.1 | 4.4 | 1.3 | 0.1 | 1.2 | 0.2 | 13.0 | 14.5 |
| grind v compressed | opponent | 3.7 | 8.8 | 7.1 | 2.7 | 8.9 | 7.1 | 5.4 | 1.8 | 0.2 | 0.9 | 0.2 | 14.5 | 13.0 |
| expansive v compressed | tracked | 4.6 | 12.2 | 7.6 | 2.9 | 8.5 | 8.8 | 4.9 | 1.7 | 0.1 | 0.8 | 0.1 | 14.9 | 15.8 |
| expansive v compressed | opponent | 3.8 | 9.0 | 7.4 | 3.1 | 8.9 | 7.2 | 5.0 | 1.6 | 0.1 | 1.0 | 0.1 | 15.8 | 14.9 |

_5 cells in 493 s._
