# Balance: 465 full fit counters / acceptance shard 1 of 4

Flat 60 playing squads; exact harness-only winning/losing fits 1.5 v .5. Counter/fit comparison holds the independent Tight rebuild and current Kick-chase preset fixed in both runs; fully dormant restores the legacy Kick-chase pass weight and reports the total switch-on change. 1000 matches per cell.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:09:54.707Z

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
| full fit expansive v compressed | 1000 | 47.4% ± 1.5% |
| full fit expansive v slide | 1000 | 50.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit expansive v compressed | tracked | 3.5 | 6.6 | 6.2 | 2.9 | 8.8 | 8.8 | 4.7 | 1.8 | 0.2 | 0.7 | 0.1 | 14.7 | 15.1 |
| full fit expansive v compressed | opponent | 3.6 | 8.5 | 7.0 | 2.9 | 8.8 | 7.1 | 5.1 | 1.7 | 0.2 | 1.0 | 0.1 | 15.1 | 14.7 |
| full fit expansive v slide | tracked | 4.8 | 9.0 | 6.9 | 3.0 | 8.7 | 6.9 | 4.9 | 1.8 | 0.2 | 0.8 | 0.1 | 15.2 | 15.3 |
| full fit expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.8 | 6.8 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 15.3 | 15.2 |

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
| full fit expansive v compressed | 1000 | 47.4% ± 1.5% |
| full fit expansive v slide | 1000 | 50.0% ± 1.5% |

## Per-side counts — fully dormant

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit expansive v compressed | tracked | 3.5 | 6.6 | 6.2 | 2.9 | 8.8 | 8.8 | 4.7 | 1.8 | 0.2 | 0.7 | 0.1 | 14.7 | 15.1 |
| full fit expansive v compressed | opponent | 3.6 | 8.5 | 7.0 | 2.9 | 8.8 | 7.1 | 5.1 | 1.7 | 0.2 | 1.0 | 0.1 | 15.1 | 14.7 |
| full fit expansive v slide | tracked | 4.8 | 9.0 | 6.9 | 3.0 | 8.7 | 6.9 | 4.9 | 1.8 | 0.2 | 0.8 | 0.1 | 15.2 | 15.3 |
| full fit expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.8 | 6.8 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 15.3 | 15.2 |

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
| full fit expansive v compressed | 1000 | 58.1% ± 1.5% |
| full fit expansive v slide | 1000 | 40.8% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| full fit expansive v compressed | tracked | 4.9 | 11.8 | 7.9 | 3.2 | 8.7 | 9.4 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 16.5 | 14.5 |
| full fit expansive v compressed | opponent | 3.6 | 8.5 | 6.9 | 2.8 | 8.7 | 6.9 | 5.0 | 1.7 | 0.1 | 0.9 | 0.1 | 14.5 | 16.5 |
| full fit expansive v slide | tracked | 4.1 | 6.5 | 5.7 | 2.6 | 8.8 | 6.5 | 4.9 | 1.7 | 0.1 | 0.7 | 0.1 | 13.3 | 15.4 |
| full fit expansive v slide | opponent | 3.7 | 8.7 | 7.0 | 3.0 | 8.8 | 7.0 | 5.3 | 1.7 | 0.1 | 1.0 | 0.1 | 15.4 | 13.3 |

_6 cells in 2083 s._
