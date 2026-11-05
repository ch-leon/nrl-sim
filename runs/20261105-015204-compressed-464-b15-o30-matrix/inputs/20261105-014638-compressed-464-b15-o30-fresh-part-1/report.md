# Balance: Compressed 464 b15-o30 fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 19c381a · **branch** HEAD · **started** 2026-11-05T01:46:38.545Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 46.4% ± 3.0% |
| Balanced | — | — | 48.4% ± 3.1% |
| Expansive | — | — | 51.0% ± 3.1% |
| Kick-chase | — | — | 44.8% ± 3.1% |
| All-out | — | — | 47.8% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 48.4% ± 3.1% |
| kick-chase v compressed | 250 | 44.8% ± 3.1% |
| all-out v compressed | 250 | 47.8% ± 3.0% |
| grind v compressed | 250 | 46.4% ± 3.0% |
| expansive v compressed | 250 | 51.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.3 | 6.8 | 6.4 | 2.7 | 8.7 | 8.8 | 5.0 | 1.6 | 0.1 | 1.0 | 0.1 | 13.9 | 14.5 |
| balanced v compressed | opponent | 3.4 | 8.6 | 6.9 | 2.8 | 8.6 | 6.8 | 5.2 | 1.7 | 0.1 | 0.9 | 0.2 | 14.5 | 13.9 |
| kick-chase v compressed | tracked | 1.0 | 6.6 | 6.2 | 2.6 | 9.9 | 8.3 | 4.9 | 2.6 | 0.2 | 1.3 | 0.2 | 13.3 | 14.6 |
| kick-chase v compressed | opponent | 3.6 | 8.8 | 7.0 | 2.9 | 9.1 | 6.9 | 5.4 | 1.7 | 0.2 | 0.9 | 0.1 | 14.6 | 13.3 |
| all-out v compressed | tracked | 4.9 | 6.6 | 6.9 | 2.9 | 8.7 | 9.1 | 5.2 | 2.0 | 0.2 | 0.8 | 0.1 | 15.0 | 15.5 |
| all-out v compressed | opponent | 3.5 | 8.5 | 7.1 | 3.0 | 8.9 | 7.1 | 5.0 | 1.7 | 0.1 | 1.1 | 0.2 | 15.5 | 15.0 |
| grind v compressed | tracked | 0.8 | 4.0 | 4.4 | 2.6 | 10.1 | 5.1 | 4.4 | 1.3 | 0.1 | 1.1 | 0.2 | 13.4 | 14.4 |
| grind v compressed | opponent | 3.7 | 8.7 | 7.3 | 2.8 | 8.9 | 7.4 | 5.4 | 1.7 | 0.1 | 1.0 | 0.2 | 14.4 | 13.4 |
| expansive v compressed | tracked | 3.6 | 11.6 | 7.7 | 3.2 | 8.5 | 9.0 | 4.7 | 1.7 | 0.1 | 0.7 | 0.1 | 16.0 | 15.8 |
| expansive v compressed | opponent | 3.6 | 8.8 | 7.2 | 3.0 | 8.6 | 7.0 | 5.1 | 1.5 | 0.1 | 1.0 | 0.1 | 15.8 | 16.0 |

_5 cells in 275 s._
