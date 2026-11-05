# Balance: 465 preset final 1 / shard 5

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:02:21.591Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 54.4% ± 1.5% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind/rush v kick-chase/compressed | 1000 | 36.1% ± 1.5% |
| balanced/rush v kick-chase/slide | 1000 | 45.6% ± 1.5% |
| expansive/slide v kick-chase/rush | 1000 | 55.2% ± 1.5% |
| expansive/compressed v kick-chase/compressed | 1000 | 52.3% ± 1.5% |
| kick-chase/rush v all-out/slide | 1000 | 52.2% ± 1.5% |
| kick-chase v rush | 1000 | 54.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/compressed | tracked | 1.5 | 5.2 | 4.3 | 2.7 | 9.8 | 5.1 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 13.9 | 18.0 |
| grind/rush v kick-chase/compressed | opponent | 2.4 | 21.8 | 7.5 | 3.4 | 9.6 | 10.1 | 5.6 | 2.7 | 0.5 | 1.2 | 0.5 | 18.0 | 13.9 |
| balanced/rush v kick-chase/slide | tracked | 3.8 | 8.4 | 6.8 | 3.1 | 8.5 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 16.1 | 17.8 |
| balanced/rush v kick-chase/slide | opponent | 2.4 | 21.1 | 7.1 | 3.4 | 9.2 | 9.7 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 17.8 | 16.1 |
| expansive/slide v kick-chase/rush | tracked | 4.9 | 23.1 | 6.0 | 3.1 | 8.6 | 9.8 | 4.9 | 1.7 | 0.1 | 0.7 | 0.1 | 16.0 | 14.5 |
| expansive/slide v kick-chase/rush | opponent | 2.2 | 8.1 | 6.1 | 2.8 | 9.3 | 7.0 | 5.2 | 2.5 | 0.2 | 1.3 | 0.1 | 14.5 | 16.0 |
| expansive/compressed v kick-chase/compressed | tracked | 4.8 | 10.1 | 7.2 | 3.0 | 8.6 | 9.1 | 5.0 | 1.8 | 0.2 | 0.7 | 0.1 | 15.7 | 15.4 |
| expansive/compressed v kick-chase/compressed | opponent | 2.3 | 8.2 | 7.3 | 2.9 | 9.5 | 8.9 | 5.1 | 2.6 | 0.3 | 1.3 | 0.2 | 15.4 | 15.7 |
| kick-chase/rush v all-out/slide | tracked | 2.2 | 8.3 | 6.1 | 2.9 | 9.4 | 7.0 | 5.2 | 2.5 | 0.2 | 1.3 | 0.1 | 15.4 | 14.8 |
| kick-chase/rush v all-out/slide | opponent | 6.6 | 22.3 | 6.1 | 2.9 | 8.0 | 9.8 | 5.9 | 1.9 | 0.2 | 0.7 | 0.1 | 14.8 | 15.4 |
| kick-chase v rush | tracked | 2.4 | 21.1 | 7.1 | 3.4 | 9.2 | 9.7 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 17.8 | 16.1 |
| kick-chase v rush | opponent | 3.8 | 8.4 | 6.8 | 3.1 | 8.5 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 16.1 | 17.8 |

_6 cells in 2772 s._
