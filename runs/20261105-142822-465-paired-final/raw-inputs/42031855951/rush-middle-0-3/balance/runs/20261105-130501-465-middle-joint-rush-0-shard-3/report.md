# Balance: 465 middle joint Rush 0 / shard 3

Rerun all fourteen affected round-robin pairs AND the neutral cell jointly. Pass weight .04; every500 consecutive seed both ways retained.

**commit** b7a2622 · **branch** issue-465-strategy-counters · **started** 2026-11-05T13:05:01.793Z

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
| balanced/rush v kick-chase/slide | 1000 | 43.4% ± 1.5% |
| expansive/rush v kick-chase/rush | 1000 | 41.9% ± 1.5% |
| kick-chase/rush v kick-chase/compressed | 1000 | 43.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced/rush v kick-chase/slide | tracked | 3.6 | 8.5 | 6.9 | 3.1 | 8.4 | 6.8 | 5.3 | 1.6 | 0.2 | 1.0 | 0.1 | 15.9 | 18.0 |
| balanced/rush v kick-chase/slide | opponent | 2.4 | 20.9 | 7.1 | 3.4 | 9.2 | 9.8 | 5.3 | 2.4 | 0.5 | 1.2 | 0.5 | 18.0 | 15.9 |
| expansive/rush v kick-chase/rush | tracked | 4.9 | 22.5 | 5.5 | 3.2 | 8.2 | 9.5 | 5.1 | 1.7 | 0.2 | 0.7 | 0.1 | 16.5 | 18.6 |
| expansive/rush v kick-chase/rush | opponent | 2.5 | 21.6 | 7.3 | 3.6 | 9.3 | 9.6 | 5.5 | 2.5 | 0.5 | 1.3 | 0.5 | 18.6 | 16.5 |
| kick-chase/rush v kick-chase/compressed | tracked | 2.2 | 7.8 | 6.9 | 3.1 | 9.3 | 8.5 | 5.3 | 2.5 | 0.3 | 1.3 | 0.2 | 16.2 | 18.2 |
| kick-chase/rush v kick-chase/compressed | opponent | 2.3 | 21.2 | 7.1 | 3.5 | 9.3 | 9.7 | 5.5 | 2.6 | 0.5 | 1.2 | 0.5 | 18.2 | 16.2 |

_3 cells in 1617 s._
