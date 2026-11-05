# Balance: 465 before and enabled matrix / acceptance shard 4 of 5

True dormant main versus enabled defaults; restore the legacy Kick-chase pass weight in the control; 1000 matches per cell, every consecutive seed retained.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:09:32.752Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | 48.6% ± 1.5% | — |
| Expansive | — | — | — |
| Kick-chase | 52.8% ± 1.5% | — | — |
| All-out | — | — | 47.8% ± 1.5% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v rush | 1000 | 48.6% ± 1.5% |
| kick-chase v slide | 1000 | 52.8% ± 1.5% |
| all-out v compressed | 1000 | 47.8% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v rush | tracked | 3.6 | 22.1 | 6.0 | 3.0 | 8.5 | 9.5 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.8 |
| balanced v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.8 | 6.9 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 15.8 | 15.4 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 6.6 | 2.9 | 9.9 | 6.8 | 4.9 | 2.7 | 0.3 | 1.3 | 0.3 | 15.3 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.8 | 6.9 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 14.5 | 15.3 |
| all-out v compressed | tracked | 4.9 | 6.4 | 6.9 | 2.9 | 8.5 | 9.1 | 5.1 | 1.9 | 0.2 | 0.8 | 0.1 | 14.8 | 15.5 |
| all-out v compressed | opponent | 3.6 | 8.3 | 7.0 | 3.0 | 8.6 | 7.0 | 5.1 | 1.7 | 0.1 | 0.9 | 0.1 | 15.5 | 14.8 |

## Attack × defence points share — enabled

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | 48.6% ± 1.5% | — |
| Expansive | — | — | — |
| Kick-chase | 46.9% ± 1.5% | — | — |
| All-out | — | — | 49.3% ± 1.5% |

## Tracked-side rows — enabled

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v rush | 1000 | 48.6% ± 1.5% |
| kick-chase v slide | 1000 | 46.9% ± 1.5% |
| all-out v compressed | 1000 | 49.3% ± 1.5% |

## Per-side counts — enabled

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v rush | tracked | 3.6 | 22.1 | 6.0 | 3.0 | 8.5 | 9.5 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.8 |
| balanced v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.8 | 6.9 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 15.8 | 15.4 |
| kick-chase v slide | tracked | 2.2 | 8.0 | 6.0 | 2.6 | 9.3 | 6.9 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 13.7 | 14.9 |
| kick-chase v slide | opponent | 3.7 | 8.6 | 7.1 | 2.9 | 8.9 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.9 | 13.7 |
| all-out v compressed | tracked | 6.2 | 8.6 | 7.4 | 3.0 | 8.2 | 9.3 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 15.6 | 15.4 |
| all-out v compressed | opponent | 3.5 | 8.4 | 6.8 | 3.0 | 8.7 | 6.9 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.6 |

_6 cells in 2211 s._
