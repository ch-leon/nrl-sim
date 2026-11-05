# Balance: Compressed 464 b10-o15 fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:35.537Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 39.4% ± 3.0% |
| Balanced | — | — | 51.0% ± 3.1% |
| Expansive | — | — | 57.2% ± 3.1% |
| Kick-chase | — | — | 56.8% ± 3.0% |
| All-out | — | — | 48.0% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 51.0% ± 3.1% |
| kick-chase v compressed | 250 | 56.8% ± 3.0% |
| all-out v compressed | 250 | 48.0% ± 3.0% |
| grind v compressed | 250 | 39.4% ± 3.0% |
| expansive v compressed | 250 | 57.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.1 | 7.2 | 6.8 | 3.0 | 8.8 | 8.8 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.5 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.6 | 7.2 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.5 | 15.4 |
| kick-chase v compressed | tracked | 1.8 | 7.4 | 6.6 | 3.0 | 9.7 | 9.1 | 4.8 | 2.5 | 0.3 | 1.4 | 0.2 | 15.9 | 14.2 |
| kick-chase v compressed | opponent | 3.7 | 8.3 | 7.2 | 2.7 | 8.5 | 7.2 | 5.4 | 1.7 | 0.2 | 0.9 | 0.1 | 14.2 | 15.9 |
| all-out v compressed | tracked | 5.5 | 7.4 | 7.2 | 3.0 | 8.4 | 9.4 | 5.1 | 1.9 | 0.2 | 0.7 | 0.1 | 15.7 | 15.6 |
| all-out v compressed | opponent | 3.9 | 8.4 | 6.8 | 3.0 | 8.5 | 6.8 | 5.0 | 1.5 | 0.1 | 1.0 | 0.2 | 15.6 | 15.7 |
| grind v compressed | tracked | 1.0 | 4.5 | 4.6 | 2.6 | 9.7 | 5.6 | 4.5 | 1.2 | 0.1 | 1.1 | 0.1 | 13.6 | 14.8 |
| grind v compressed | opponent | 3.8 | 8.9 | 7.5 | 2.9 | 9.0 | 7.5 | 5.2 | 1.7 | 0.2 | 1.1 | 0.1 | 14.8 | 13.6 |
| expansive v compressed | tracked | 4.1 | 12.7 | 7.8 | 3.1 | 8.5 | 9.4 | 4.8 | 1.7 | 0.1 | 0.7 | 0.1 | 15.6 | 14.5 |
| expansive v compressed | opponent | 3.4 | 8.8 | 6.8 | 2.9 | 8.9 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.2 | 14.5 | 15.6 |

_5 cells in 255 s._
