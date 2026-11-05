# Balance: 465 before and enabled matrix / acceptance shard 0 of 5

True dormant main versus enabled defaults; restore the legacy Kick-chase pass weight in the control; 1000 matches per cell, every consecutive seed retained.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:11:26.404Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 48.3% ± 1.5% | — | — |
| Balanced | — | — | 47.5% ± 1.5% |
| Expansive | — | — | — |
| Kick-chase | — | 52.1% ± 1.5% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 48.3% ± 1.5% |
| balanced v compressed | 1000 | 47.5% ± 1.5% |
| kick-chase v rush | 1000 | 52.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 0.6 | 8.7 | 5.3 | 2.7 | 9.9 | 4.1 | 4.4 | 1.2 | 0.1 | 1.1 | 0.2 | 14.2 | 14.1 |
| grind v slide | opponent | 3.7 | 8.9 | 7.4 | 2.7 | 8.9 | 7.2 | 5.2 | 1.6 | 0.1 | 1.0 | 0.1 | 14.1 | 14.2 |
| balanced v compressed | tracked | 2.4 | 6.2 | 6.4 | 2.8 | 8.8 | 8.6 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 14.3 | 14.9 |
| balanced v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.9 | 8.7 | 7.1 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 14.9 | 14.3 |
| kick-chase v rush | tracked | 2.2 | 21.7 | 5.6 | 3.0 | 9.6 | 9.0 | 5.1 | 2.6 | 0.3 | 1.3 | 0.3 | 15.6 | 15.0 |
| kick-chase v rush | opponent | 3.7 | 8.7 | 7.1 | 2.9 | 8.8 | 6.8 | 5.2 | 1.7 | 0.1 | 1.0 | 0.2 | 15.0 | 15.6 |

## Attack × defence points share — enabled

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 53.8% ± 1.5% | — | — |
| Balanced | — | — | 50.9% ± 1.5% |
| Expansive | — | — | — |
| Kick-chase | — | 56.6% ± 1.5% | — |
| All-out | — | — | — |

## Tracked-side rows — enabled

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 53.8% ± 1.5% |
| balanced v compressed | 1000 | 50.9% ± 1.5% |
| kick-chase v rush | 1000 | 56.6% ± 1.5% |

## Per-side counts — enabled

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 2.8 | 10.3 | 5.8 | 2.9 | 9.7 | 4.3 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 15.3 | 14.1 |
| grind v slide | opponent | 3.7 | 8.7 | 7.1 | 2.7 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 14.1 | 15.3 |
| balanced v compressed | tracked | 3.6 | 8.3 | 7.2 | 3.0 | 8.6 | 9.0 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 15.4 | 15.1 |
| balanced v compressed | opponent | 3.6 | 8.4 | 7.0 | 2.9 | 8.7 | 7.0 | 5.1 | 1.7 | 0.1 | 1.0 | 0.2 | 15.1 | 15.4 |
| kick-chase v rush | tracked | 2.4 | 20.9 | 7.1 | 3.4 | 9.2 | 9.8 | 5.3 | 2.4 | 0.5 | 1.2 | 0.5 | 18.0 | 15.9 |
| kick-chase v rush | opponent | 3.6 | 8.5 | 6.9 | 3.1 | 8.4 | 6.8 | 5.3 | 1.6 | 0.2 | 1.0 | 0.1 | 15.9 | 18.0 |

_6 cells in 3863 s._
