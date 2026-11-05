# Balance: 465 middle joint Rush 0 / shard 2

Rerun all fourteen affected round-robin pairs AND the neutral cell jointly. Pass weight .04; every500 consecutive seed both ways retained.

**commit** b7a2622 · **branch** issue-465-strategy-counters · **started** 2026-11-05T13:00:24.489Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 56.6% ± 1.5% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind/rush v kick-chase/compressed | 1000 | 38.5% ± 1.5% |
| expansive/rush v kick-chase/slide | 1000 | 41.0% ± 1.5% |
| kick-chase/slide v all-out/rush | 1000 | 50.6% ± 1.5% |
| kick-chase v rush | 1000 | 56.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/compressed | tracked | 1.6 | 5.4 | 4.5 | 2.7 | 9.9 | 5.1 | 4.7 | 1.2 | 0.1 | 1.2 | 0.2 | 14.1 | 17.5 |
| grind/rush v kick-chase/compressed | opponent | 2.4 | 21.6 | 7.4 | 3.4 | 9.5 | 10.1 | 5.6 | 2.6 | 0.5 | 1.2 | 0.5 | 17.5 | 14.1 |
| expansive/rush v kick-chase/slide | tracked | 4.5 | 8.0 | 6.5 | 3.1 | 8.5 | 6.7 | 4.9 | 1.6 | 0.1 | 0.7 | 0.1 | 16.0 | 18.3 |
| expansive/rush v kick-chase/slide | opponent | 2.4 | 21.2 | 7.3 | 3.5 | 9.2 | 9.8 | 5.5 | 2.4 | 0.4 | 1.2 | 0.5 | 18.3 | 16.0 |
| kick-chase/slide v all-out/rush | tracked | 2.3 | 21.0 | 7.1 | 3.6 | 9.1 | 9.5 | 5.3 | 2.5 | 0.5 | 1.2 | 0.5 | 18.7 | 17.9 |
| kick-chase/slide v all-out/rush | opponent | 6.3 | 11.9 | 7.7 | 3.5 | 7.9 | 7.1 | 5.4 | 1.8 | 0.2 | 0.8 | 0.1 | 17.9 | 18.7 |
| kick-chase v rush | tracked | 2.4 | 20.9 | 7.1 | 3.4 | 9.2 | 9.8 | 5.3 | 2.4 | 0.5 | 1.2 | 0.5 | 18.0 | 15.9 |
| kick-chase v rush | opponent | 3.6 | 8.5 | 6.9 | 3.1 | 8.4 | 6.8 | 5.3 | 1.6 | 0.2 | 1.0 | 0.1 | 15.9 | 18.0 |

_4 cells in 2173 s._
