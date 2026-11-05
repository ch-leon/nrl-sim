# Balance: 465 own style fit - attack fit 0.5

Flat 60 playing squads; exact harness-only attack or defence fit varied independently. The other selected fit stays 1. Paired fit-off/on controls; 1000 matches per cell.

**commit** 8d499e5 · **branch** issue-465-strategy-counters · **started** 2026-11-05T05:08:49.753Z

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
| attack fit 0.5 | 1000 | 50.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| attack fit 0.5 | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| attack fit 0.5 | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |

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
| attack fit 0.5 | 1000 | 46.9% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| attack fit 0.5 | tracked | 3.4 | 7.6 | 6.7 | 2.8 | 8.7 | 6.8 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.3 | 15.3 |
| attack fit 0.5 | opponent | 3.6 | 8.4 | 7.0 | 2.9 | 8.9 | 7.0 | 5.1 | 1.7 | 0.1 | 1.0 | 0.2 | 15.3 | 14.3 |

_2 cells in 767 s._
