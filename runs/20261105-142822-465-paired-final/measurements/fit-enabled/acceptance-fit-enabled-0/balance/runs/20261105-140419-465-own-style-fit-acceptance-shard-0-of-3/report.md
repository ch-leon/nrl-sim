# Balance: 465 own style fit / acceptance shard 0 of 3

Flat 60 playing squads; exact harness-only attack or defence fit varied independently. The other selected fit stays 1. Paired fit-off/on controls; 1000 matches per cell.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:04:19.613Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| attack fit 1.5 | 1000 | 50.0% ± 1.5% |
| defence fit 0.5 | 1000 | 50.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| attack fit 1.5 | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| attack fit 1.5 | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| defence fit 0.5 | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| defence fit 0.5 | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |

## Attack × defence points share — enabled defaults

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — enabled defaults

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| attack fit 1.5 | 1000 | 50.1% ± 1.5% |
| defence fit 0.5 | 1000 | 49.9% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| attack fit 1.5 | tracked | 3.8 | 8.8 | 7.1 | 2.9 | 8.6 | 6.9 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 15.2 | 14.8 |
| attack fit 1.5 | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.7 | 0.1 | 0.9 | 0.2 | 14.8 | 15.2 |
| defence fit 0.5 | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.7 | 0.1 | 0.9 | 0.2 | 14.8 | 15.2 |
| defence fit 0.5 | opponent | 3.8 | 8.8 | 7.1 | 2.9 | 8.6 | 6.9 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 15.2 | 14.8 |

_4 cells in 3029 s._
