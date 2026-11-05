# Balance: 465 middle joint Rush 0 / shard 0

Rerun all fourteen affected round-robin pairs AND the neutral cell jointly. Pass weight .04; every500 consecutive seed both ways retained.

**commit** b7a2622 · **branch** issue-465-strategy-counters · **started** 2026-11-05T13:09:12.865Z

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
| grind/rush v kick-chase/slide | 1000 | 48.1% ± 1.5% |
| balanced/rush v kick-chase/rush | 1000 | 36.7% ± 1.5% |
| expansive/rush v kick-chase/compressed | 1000 | 49.3% ± 1.5% |
| kick-chase/rush v all-out/rush | 1000 | 60.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/slide | tracked | 2.9 | 10.2 | 5.8 | 3.1 | 9.4 | 4.4 | 4.7 | 1.2 | 0.1 | 1.2 | 0.2 | 16.2 | 17.2 |
| grind/rush v kick-chase/slide | opponent | 2.3 | 21.4 | 7.3 | 3.3 | 9.2 | 9.8 | 5.6 | 2.5 | 0.5 | 1.2 | 0.4 | 17.2 | 16.2 |
| balanced/rush v kick-chase/rush | tracked | 3.8 | 21.4 | 5.6 | 3.0 | 8.2 | 9.2 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 15.5 | 19.2 |
| balanced/rush v kick-chase/rush | opponent | 2.4 | 21.2 | 7.4 | 3.7 | 9.5 | 10.1 | 5.4 | 2.5 | 0.5 | 1.3 | 0.6 | 19.2 | 15.5 |
| expansive/rush v kick-chase/compressed | tracked | 4.7 | 9.9 | 7.4 | 3.4 | 8.6 | 9.2 | 5.0 | 1.6 | 0.1 | 0.7 | 0.1 | 17.2 | 17.7 |
| expansive/rush v kick-chase/compressed | opponent | 2.4 | 20.9 | 7.1 | 3.4 | 9.1 | 9.6 | 5.4 | 2.4 | 0.4 | 1.2 | 0.5 | 17.7 | 17.2 |
| kick-chase/rush v all-out/rush | tracked | 2.4 | 21.2 | 7.2 | 3.7 | 9.3 | 9.7 | 5.5 | 2.5 | 0.5 | 1.2 | 0.5 | 19.3 | 16.0 |
| kick-chase/rush v all-out/rush | opponent | 6.5 | 22.0 | 5.8 | 3.1 | 7.8 | 9.6 | 5.9 | 1.8 | 0.2 | 0.7 | 0.1 | 16.0 | 19.3 |

_4 cells in 3143 s._
