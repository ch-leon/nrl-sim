# Balance: 465 full fit counters / acceptance shard 0 of 4

Flat 60 playing squads; exact harness-only winning/losing fits 1.5 v .5. Counter/fit comparison holds the independent Tight rebuild and current Kick-chase preset fixed in both runs; fully dormant restores the legacy Kick-chase pass weight and reports the total switch-on change. 1000 matches per cell.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:11:14.160Z

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
| full fit grind v slide | 1000 | 54.3% ± 1.5% |
| full fit grind v compressed | 1000 | 49.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit grind v slide | tracked | 15.0 | 9.5 | 6.4 | 3.0 | 8.9 | 4.6 | 4.9 | 1.1 | 0.1 | 1.0 | 0.2 | 15.8 | 14.5 |
| full fit grind v slide | opponent | 3.6 | 8.5 | 7.1 | 2.8 | 8.7 | 6.7 | 5.0 | 1.6 | 0.1 | 1.0 | 0.2 | 14.5 | 15.8 |
| full fit grind v compressed | tracked | 1.6 | 6.4 | 5.1 | 2.6 | 9.8 | 5.4 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 13.7 | 14.2 |
| full fit grind v compressed | opponent | 3.5 | 8.8 | 7.3 | 2.8 | 8.8 | 7.1 | 5.2 | 1.7 | 0.1 | 1.0 | 0.1 | 14.2 | 13.7 |

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
| full fit grind v slide | 1000 | 48.3% ± 1.5% |
| full fit grind v compressed | 1000 | 47.4% ± 1.5% |

## Per-side counts — fully dormant

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit grind v slide | tracked | 0.6 | 8.7 | 5.3 | 2.7 | 9.9 | 4.1 | 4.4 | 1.2 | 0.1 | 1.1 | 0.2 | 14.2 | 14.1 |
| full fit grind v slide | opponent | 3.7 | 8.9 | 7.4 | 2.7 | 8.9 | 7.2 | 5.2 | 1.6 | 0.1 | 1.0 | 0.1 | 14.1 | 14.2 |
| full fit grind v compressed | tracked | 0.2 | 6.3 | 4.9 | 2.6 | 9.8 | 5.4 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 13.5 | 14.3 |
| full fit grind v compressed | opponent | 3.6 | 8.8 | 7.3 | 2.7 | 8.9 | 7.1 | 5.3 | 1.7 | 0.1 | 1.0 | 0.1 | 14.3 | 13.5 |

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
| full fit grind v slide | 1000 | 65.2% ± 1.5% |
| full fit grind v compressed | 1000 | 37.5% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit grind v slide | tracked | 16.6 | 13.3 | 7.5 | 3.4 | 8.8 | 4.9 | 5.0 | 1.1 | 0.1 | 1.1 | 0.2 | 17.8 | 13.9 |
| full fit grind v slide | opponent | 3.5 | 8.4 | 6.9 | 2.7 | 8.5 | 6.8 | 4.9 | 1.7 | 0.1 | 0.9 | 0.1 | 13.9 | 17.8 |
| full fit grind v compressed | tracked | 1.0 | 3.6 | 3.9 | 2.2 | 10.1 | 4.9 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 11.5 | 15.2 |
| full fit grind v compressed | opponent | 3.8 | 8.9 | 7.5 | 2.9 | 9.2 | 7.3 | 5.3 | 1.7 | 0.2 | 1.0 | 0.2 | 15.2 | 11.5 |

_6 cells in 3766 s._
