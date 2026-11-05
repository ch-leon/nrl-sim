# Balance: 465 before and enabled matrix / acceptance shard 2 of 5

True dormant main versus enabled defaults; restore the legacy Kick-chase pass weight in the control; 1000 matches per cell, every consecutive seed retained.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:11:03.805Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 47.4% ± 1.5% |
| Balanced | — | — | — |
| Expansive | — | 51.4% ± 1.5% | — |
| Kick-chase | — | — | — |
| All-out | 51.7% ± 1.5% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v compressed | 1000 | 47.4% ± 1.5% |
| expansive v rush | 1000 | 51.4% ± 1.5% |
| all-out v slide | 1000 | 51.7% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v compressed | tracked | 0.2 | 6.3 | 4.9 | 2.6 | 9.8 | 5.4 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 13.5 | 14.3 |
| grind v compressed | opponent | 3.6 | 8.8 | 7.3 | 2.7 | 8.9 | 7.1 | 5.3 | 1.7 | 0.1 | 1.0 | 0.1 | 14.3 | 13.5 |
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| all-out v slide | tracked | 6.0 | 8.8 | 7.3 | 2.9 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.1 | 15.0 |
| all-out v slide | opponent | 3.6 | 8.3 | 6.8 | 2.9 | 8.6 | 6.8 | 5.1 | 1.6 | 0.1 | 0.9 | 0.2 | 15.0 | 15.1 |

## Attack × defence points share — enabled

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 42.6% ± 1.5% |
| Balanced | — | — | — |
| Expansive | — | 51.4% ± 1.5% | — |
| Kick-chase | — | — | — |
| All-out | 56.8% ± 1.5% | — | — |

## Tracked-side rows — enabled

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v compressed | 1000 | 42.6% ± 1.5% |
| expansive v rush | 1000 | 51.4% ± 1.5% |
| all-out v slide | 1000 | 56.8% ± 1.5% |

## Per-side counts — enabled

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v compressed | tracked | 1.5 | 5.4 | 4.5 | 2.5 | 10.1 | 5.1 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 12.7 | 14.6 |
| grind v compressed | opponent | 3.9 | 8.8 | 7.4 | 2.8 | 9.0 | 7.2 | 5.4 | 1.7 | 0.1 | 1.0 | 0.2 | 14.6 | 12.7 |
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| all-out v slide | tracked | 6.3 | 12.1 | 8.1 | 3.3 | 8.1 | 7.4 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 17.0 | 15.1 |
| all-out v slide | opponent | 3.5 | 8.4 | 6.9 | 2.9 | 8.5 | 6.8 | 4.9 | 1.6 | 0.1 | 0.9 | 0.1 | 15.1 | 17.0 |

_6 cells in 3843 s._
