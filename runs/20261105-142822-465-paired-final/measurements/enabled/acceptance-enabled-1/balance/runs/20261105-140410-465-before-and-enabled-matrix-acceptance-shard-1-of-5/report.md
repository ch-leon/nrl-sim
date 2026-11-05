# Balance: 465 before and enabled matrix / acceptance shard 1 of 5

True dormant main versus enabled defaults; restore the legacy Kick-chase pass weight in the control; 1000 matches per cell, every consecutive seed retained.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:04:11.004Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 46.7% ± 1.5% | — |
| Balanced | — | — | — |
| Expansive | 50.0% ± 1.5% | — | — |
| Kick-chase | — | — | 49.3% ± 1.5% |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 1000 | 46.7% ± 1.5% |
| expansive v slide | 1000 | 50.0% ± 1.5% |
| kick-chase v compressed | 1000 | 49.3% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 0.6 | 22.5 | 4.5 | 2.7 | 9.5 | 5.6 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 14.1 | 15.0 |
| grind v rush | opponent | 3.7 | 8.8 | 7.4 | 2.9 | 9.0 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 15.0 | 14.1 |
| expansive v slide | tracked | 4.8 | 9.0 | 6.9 | 3.0 | 8.7 | 6.9 | 4.9 | 1.8 | 0.2 | 0.8 | 0.1 | 15.2 | 15.3 |
| expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.8 | 6.8 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 15.3 | 15.2 |
| kick-chase v compressed | tracked | 1.0 | 6.2 | 6.2 | 2.8 | 9.8 | 8.7 | 4.9 | 2.6 | 0.3 | 1.3 | 0.2 | 14.5 | 14.4 |
| kick-chase v compressed | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.9 | 7.1 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 14.4 | 14.5 |

## Attack × defence points share — enabled

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 47.9% ± 1.5% | — |
| Balanced | — | — | — |
| Expansive | 45.9% ± 1.5% | — | — |
| Kick-chase | — | — | 50.4% ± 1.5% |
| All-out | — | — | — |

## Tracked-side rows — enabled

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 1000 | 47.9% ± 1.5% |
| expansive v slide | 1000 | 45.9% ± 1.5% |
| kick-chase v compressed | 1000 | 50.4% ± 1.5% |

## Per-side counts — enabled

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 2.3 | 22.9 | 4.6 | 2.7 | 9.6 | 5.7 | 4.6 | 1.1 | 0.1 | 1.1 | 0.2 | 14.3 | 14.8 |
| grind v rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 9.0 | 7.2 | 5.1 | 1.8 | 0.2 | 1.0 | 0.1 | 14.8 | 14.3 |
| expansive v slide | tracked | 4.6 | 8.2 | 6.5 | 2.8 | 8.7 | 6.7 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.8 | 15.5 |
| expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.5 | 14.8 |
| kick-chase v compressed | tracked | 2.3 | 8.0 | 7.0 | 2.8 | 9.4 | 8.8 | 5.3 | 2.6 | 0.3 | 1.2 | 0.2 | 14.9 | 14.8 |
| kick-chase v compressed | opponent | 3.7 | 8.5 | 6.8 | 2.9 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 14.8 | 14.9 |

_6 cells in 2035 s._
