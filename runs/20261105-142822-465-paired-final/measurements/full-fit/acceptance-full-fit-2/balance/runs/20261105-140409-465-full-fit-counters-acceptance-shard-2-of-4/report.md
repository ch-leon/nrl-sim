# Balance: 465 full fit counters / acceptance shard 2 of 4

Flat 60 playing squads; exact harness-only winning/losing fits 1.5 v .5. Counter/fit comparison holds the independent Tight rebuild and current Kick-chase preset fixed in both runs; fully dormant restores the legacy Kick-chase pass weight and reports the total switch-on change. 1000 matches per cell.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:04:10.019Z

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
| full fit kick-chase v rush | 1000 | 47.6% ± 1.5% |
| full fit kick-chase v slide | 1000 | 49.7% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit kick-chase v rush | tracked | 2.3 | 20.9 | 5.8 | 2.9 | 9.3 | 9.0 | 5.3 | 2.5 | 0.3 | 1.2 | 0.2 | 15.0 | 15.6 |
| full fit kick-chase v rush | opponent | 3.7 | 8.7 | 7.0 | 3.0 | 8.8 | 6.9 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 15.6 | 15.0 |
| full fit kick-chase v slide | tracked | 2.3 | 8.3 | 6.9 | 2.8 | 9.3 | 6.6 | 5.3 | 2.5 | 0.3 | 1.2 | 0.2 | 14.7 | 15.0 |
| full fit kick-chase v slide | opponent | 3.5 | 8.4 | 6.9 | 2.9 | 8.7 | 7.0 | 5.3 | 1.7 | 0.1 | 0.9 | 0.2 | 15.0 | 14.7 |

## Attack × defence points share — fully dormant

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — fully dormant

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| full fit kick-chase v rush | 1000 | 52.1% ± 1.5% |
| full fit kick-chase v slide | 1000 | 52.8% ± 1.5% |

## Per-side counts — fully dormant

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit kick-chase v rush | tracked | 2.2 | 21.7 | 5.6 | 3.0 | 9.6 | 9.0 | 5.1 | 2.6 | 0.3 | 1.3 | 0.3 | 15.6 | 15.0 |
| full fit kick-chase v rush | opponent | 3.7 | 8.7 | 7.1 | 2.9 | 8.8 | 6.8 | 5.2 | 1.7 | 0.1 | 1.0 | 0.2 | 15.0 | 15.6 |
| full fit kick-chase v slide | tracked | 2.2 | 8.4 | 6.6 | 2.9 | 9.9 | 6.8 | 4.9 | 2.7 | 0.3 | 1.3 | 0.3 | 15.3 | 14.5 |
| full fit kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.8 | 6.9 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 14.5 | 15.3 |

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
| full fit kick-chase v rush | 1000 | 74.1% ± 1.3% |
| full fit kick-chase v slide | 1000 | 40.0% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit kick-chase v rush | tracked | 2.7 | 24.2 | 9.2 | 4.3 | 9.2 | 8.8 | 5.5 | 2.4 | 0.6 | 1.3 | 0.7 | 22.6 | 15.3 |
| full fit kick-chase v rush | opponent | 3.3 | 8.0 | 6.3 | 3.0 | 8.2 | 6.5 | 5.0 | 1.5 | 0.2 | 0.9 | 0.1 | 15.3 | 22.6 |
| full fit kick-chase v slide | tracked | 2.0 | 7.0 | 5.5 | 2.3 | 9.5 | 6.6 | 5.1 | 2.6 | 0.2 | 1.2 | 0.1 | 12.3 | 15.0 |
| full fit kick-chase v slide | opponent | 3.8 | 8.7 | 7.3 | 2.9 | 8.9 | 7.2 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 15.0 | 12.3 |

_6 cells in 2013 s._
