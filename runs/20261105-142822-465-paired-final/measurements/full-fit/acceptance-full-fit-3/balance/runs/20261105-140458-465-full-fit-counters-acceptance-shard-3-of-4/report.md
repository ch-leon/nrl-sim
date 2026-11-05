# Balance: 465 full fit counters / acceptance shard 3 of 4

Flat 60 playing squads; exact harness-only winning/losing fits 1.5 v .5. Counter/fit comparison holds the independent Tight rebuild and current Kick-chase preset fixed in both runs; fully dormant restores the legacy Kick-chase pass weight and reports the total switch-on change. 1000 matches per cell.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:04:58.550Z

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
| full fit all-out v slide | 1000 | 51.7% ± 1.5% |
| full fit all-out v rush | 1000 | 46.8% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit all-out v slide | tracked | 6.0 | 8.8 | 7.3 | 2.9 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.1 | 15.0 |
| full fit all-out v slide | opponent | 3.6 | 8.3 | 6.8 | 2.9 | 8.6 | 6.8 | 5.1 | 1.6 | 0.1 | 0.9 | 0.2 | 15.0 | 15.1 |
| full fit all-out v rush | tracked | 6.6 | 22.2 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 15.9 | 16.5 |
| full fit all-out v rush | opponent | 3.6 | 8.4 | 7.0 | 3.2 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 16.5 | 15.9 |

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
| full fit all-out v slide | 1000 | 51.7% ± 1.5% |
| full fit all-out v rush | 1000 | 46.8% ± 1.5% |

## Per-side counts — fully dormant

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit all-out v slide | tracked | 6.0 | 8.8 | 7.3 | 2.9 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.1 | 15.0 |
| full fit all-out v slide | opponent | 3.6 | 8.3 | 6.8 | 2.9 | 8.6 | 6.8 | 5.1 | 1.6 | 0.1 | 0.9 | 0.2 | 15.0 | 15.1 |
| full fit all-out v rush | tracked | 6.6 | 22.2 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 15.9 | 16.5 |
| full fit all-out v rush | opponent | 3.6 | 8.4 | 7.0 | 3.2 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 16.5 | 15.9 |

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
| full fit all-out v slide | 1000 | 74.1% ± 1.3% |
| full fit all-out v rush | 1000 | 30.6% ± 1.4% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit all-out v slide | tracked | 6.4 | 19.0 | 9.4 | 4.3 | 7.9 | 7.5 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 22.4 | 15.1 |
| full fit all-out v slide | opponent | 3.4 | 8.1 | 6.6 | 2.9 | 8.3 | 6.6 | 4.8 | 1.6 | 0.1 | 0.9 | 0.1 | 15.1 | 22.4 |
| full fit all-out v rush | tracked | 6.1 | 18.1 | 5.1 | 2.5 | 7.6 | 9.0 | 6.1 | 1.8 | 0.1 | 0.6 | 0.1 | 13.0 | 18.4 |
| full fit all-out v rush | opponent | 3.8 | 9.0 | 7.4 | 3.5 | 9.1 | 7.3 | 5.2 | 1.7 | 0.2 | 1.1 | 0.2 | 18.4 | 13.0 |

_6 cells in 3830 s._
