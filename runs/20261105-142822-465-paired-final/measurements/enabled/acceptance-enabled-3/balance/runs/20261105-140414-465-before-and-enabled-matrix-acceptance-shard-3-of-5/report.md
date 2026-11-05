# Balance: 465 before and enabled matrix / acceptance shard 3 of 5

True dormant main versus enabled defaults; restore the legacy Kick-chase pass weight in the control; 1000 matches per cell, every consecutive seed retained.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:04:14.742Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | 50.0% ± 1.5% | — | — |
| Expansive | — | — | 47.4% ± 1.5% |
| Kick-chase | — | — | — |
| All-out | — | 46.8% ± 1.5% | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 1000 | 50.0% ± 1.5% |
| expansive v compressed | 1000 | 47.4% ± 1.5% |
| all-out v rush | 1000 | 46.8% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| expansive v compressed | tracked | 3.5 | 6.6 | 6.2 | 2.9 | 8.8 | 8.8 | 4.7 | 1.8 | 0.2 | 0.7 | 0.1 | 14.7 | 15.1 |
| expansive v compressed | opponent | 3.6 | 8.5 | 7.0 | 2.9 | 8.8 | 7.1 | 5.1 | 1.7 | 0.2 | 1.0 | 0.1 | 15.1 | 14.7 |
| all-out v rush | tracked | 6.6 | 22.2 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 15.9 | 16.5 |
| all-out v rush | opponent | 3.6 | 8.4 | 7.0 | 3.2 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 16.5 | 15.9 |

## Attack × defence points share — enabled

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | 50.0% ± 1.5% | — | — |
| Expansive | — | — | 52.6% ± 1.5% |
| Kick-chase | — | — | — |
| All-out | — | 42.6% ± 1.5% | — |

## Tracked-side rows — enabled

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v slide | 1000 | 50.0% ± 1.5% |
| expansive v compressed | 1000 | 52.6% ± 1.5% |
| all-out v rush | 1000 | 42.6% ± 1.5% |

## Per-side counts — enabled

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| expansive v compressed | tracked | 4.8 | 10.2 | 7.3 | 3.1 | 8.6 | 9.2 | 4.8 | 1.7 | 0.2 | 0.8 | 0.1 | 15.8 | 15.1 |
| expansive v compressed | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.0 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.1 | 15.8 |
| all-out v rush | tracked | 6.6 | 21.9 | 6.0 | 3.0 | 7.9 | 9.4 | 5.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.3 | 17.0 |
| all-out v rush | opponent | 3.7 | 8.5 | 7.0 | 3.3 | 8.8 | 7.0 | 5.2 | 1.6 | 0.2 | 1.1 | 0.2 | 17.0 | 15.3 |

_6 cells in 3787 s._
