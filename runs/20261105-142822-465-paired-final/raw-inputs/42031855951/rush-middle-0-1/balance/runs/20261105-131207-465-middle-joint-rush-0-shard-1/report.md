# Balance: 465 middle joint Rush 0 / shard 1

Rerun all fourteen affected round-robin pairs AND the neutral cell jointly. Pass weight .04; every500 consecutive seed both ways retained.

**commit** b7a2622 · **branch** issue-465-strategy-counters · **started** 2026-11-05T13:12:07.574Z

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
| grind/rush v kick-chase/rush | 1000 | 40.8% ± 1.5% |
| balanced/rush v kick-chase/compressed | 1000 | 44.3% ± 1.5% |
| kick-chase/slide v kick-chase/rush | 1000 | 62.5% ± 1.5% |
| kick-chase/compressed v all-out/rush | 1000 | 55.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/rush | tracked | 2.2 | 22.2 | 4.5 | 2.9 | 9.5 | 5.7 | 4.8 | 1.2 | 0.1 | 1.1 | 0.2 | 15.4 | 17.8 |
| grind/rush v kick-chase/rush | opponent | 2.4 | 21.8 | 7.5 | 3.4 | 9.3 | 10.0 | 5.6 | 2.6 | 0.5 | 1.2 | 0.5 | 17.8 | 15.4 |
| balanced/rush v kick-chase/compressed | tracked | 3.7 | 8.2 | 6.9 | 3.2 | 8.5 | 8.8 | 5.2 | 1.6 | 0.2 | 1.0 | 0.1 | 16.5 | 18.2 |
| balanced/rush v kick-chase/compressed | opponent | 2.4 | 20.9 | 7.2 | 3.5 | 9.2 | 9.6 | 5.4 | 2.4 | 0.5 | 1.2 | 0.5 | 18.2 | 16.5 |
| kick-chase/slide v kick-chase/rush | tracked | 2.4 | 21.2 | 7.2 | 3.5 | 9.4 | 9.9 | 5.5 | 2.6 | 0.5 | 1.2 | 0.5 | 18.3 | 14.6 |
| kick-chase/slide v kick-chase/rush | opponent | 2.3 | 8.1 | 5.7 | 2.8 | 9.0 | 6.7 | 5.4 | 2.5 | 0.2 | 1.2 | 0.1 | 14.6 | 18.3 |
| kick-chase/compressed v all-out/rush | tracked | 2.4 | 20.7 | 7.0 | 3.4 | 9.2 | 9.6 | 5.4 | 2.4 | 0.5 | 1.2 | 0.5 | 18.0 | 16.5 |
| kick-chase/compressed v all-out/rush | opponent | 6.2 | 8.3 | 7.4 | 3.2 | 8.2 | 9.0 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 16.5 | 18.0 |

_4 cells in 3147 s._
