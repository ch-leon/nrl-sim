# Balance: 465 preset final 1 / shard 0

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:02:31.699Z

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
| grind/slide v kick-chase/slide | 1000 | 61.6% ± 1.5% |
| grind/compressed v kick-chase/rush | 1000 | 44.1% ± 1.5% |
| balanced/rush v kick-chase/compressed | 1000 | 46.3% ± 1.5% |
| expansive/rush v kick-chase/slide | 1000 | 41.3% ± 1.5% |
| kick-chase/slide v kick-chase/compressed | 1000 | 55.9% ± 1.5% |
| kick-chase/rush v all-out/compressed | 1000 | 58.7% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/slide | tracked | 2.8 | 10.4 | 6.1 | 2.9 | 9.8 | 4.4 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 14.9 | 12.3 |
| grind/slide v kick-chase/slide | opponent | 2.2 | 8.1 | 6.0 | 2.3 | 9.6 | 7.0 | 5.2 | 2.6 | 0.2 | 1.3 | 0.1 | 12.3 | 14.9 |
| grind/compressed v kick-chase/rush | tracked | 2.2 | 22.6 | 4.6 | 2.7 | 9.5 | 5.7 | 4.8 | 1.1 | 0.1 | 1.0 | 0.1 | 14.3 | 15.4 |
| grind/compressed v kick-chase/rush | opponent | 2.2 | 8.2 | 7.6 | 3.0 | 9.7 | 9.0 | 5.4 | 2.7 | 0.3 | 1.3 | 0.2 | 15.4 | 14.3 |
| balanced/rush v kick-chase/compressed | tracked | 3.7 | 8.1 | 7.0 | 3.2 | 8.4 | 9.0 | 5.2 | 1.6 | 0.2 | 0.9 | 0.1 | 16.5 | 17.8 |
| balanced/rush v kick-chase/compressed | opponent | 2.3 | 21.1 | 7.2 | 3.4 | 9.1 | 9.8 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 17.8 | 16.5 |
| expansive/rush v kick-chase/slide | tracked | 4.6 | 8.1 | 6.3 | 3.0 | 8.4 | 6.6 | 4.9 | 1.7 | 0.2 | 0.7 | 0.1 | 15.2 | 17.8 |
| expansive/rush v kick-chase/slide | opponent | 2.4 | 21.3 | 7.3 | 3.4 | 9.3 | 9.8 | 5.5 | 2.5 | 0.5 | 1.2 | 0.5 | 17.8 | 15.2 |
| kick-chase/slide v kick-chase/compressed | tracked | 2.4 | 8.1 | 7.3 | 3.0 | 9.7 | 8.9 | 5.2 | 2.6 | 0.3 | 1.3 | 0.2 | 15.5 | 13.9 |
| kick-chase/slide v kick-chase/compressed | opponent | 2.3 | 8.1 | 5.9 | 2.6 | 9.3 | 6.9 | 5.3 | 2.5 | 0.2 | 1.2 | 0.1 | 13.9 | 15.5 |
| kick-chase/rush v all-out/compressed | tracked | 2.3 | 8.3 | 7.3 | 3.3 | 9.5 | 8.7 | 5.3 | 2.5 | 0.3 | 1.3 | 0.3 | 17.1 | 14.9 |
| kick-chase/rush v all-out/compressed | opponent | 6.6 | 22.0 | 5.9 | 2.9 | 7.8 | 9.4 | 6.1 | 1.7 | 0.2 | 0.7 | 0.1 | 14.9 | 17.1 |

_6 cells in 3634 s._
