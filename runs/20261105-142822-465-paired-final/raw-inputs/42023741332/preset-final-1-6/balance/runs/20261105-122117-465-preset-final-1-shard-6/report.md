# Balance: 465 preset final 1 / shard 6

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:21:17.727Z

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
| grind/compressed v kick-chase/slide | 1000 | 51.7% ± 1.5% |
| balanced/rush v kick-chase/rush | 1000 | 39.4% ± 1.5% |
| expansive/slide v kick-chase/compressed | 1000 | 57.6% ± 1.5% |
| kick-chase/slide v kick-chase/rush | 1000 | 63.2% ± 1.5% |
| kick-chase/rush v all-out/rush | 1000 | 61.3% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/compressed v kick-chase/slide | tracked | 2.7 | 10.3 | 5.7 | 2.8 | 9.6 | 4.3 | 4.6 | 1.3 | 0.1 | 1.1 | 0.1 | 14.6 | 14.0 |
| grind/compressed v kick-chase/slide | opponent | 2.3 | 8.3 | 7.4 | 2.7 | 9.5 | 8.8 | 5.3 | 2.6 | 0.3 | 1.2 | 0.3 | 14.0 | 14.6 |
| balanced/rush v kick-chase/rush | tracked | 3.7 | 21.3 | 5.7 | 3.0 | 8.3 | 9.2 | 5.4 | 1.5 | 0.1 | 1.0 | 0.2 | 15.7 | 18.5 |
| balanced/rush v kick-chase/rush | opponent | 2.4 | 21.2 | 7.3 | 3.6 | 9.2 | 9.9 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 18.5 | 15.7 |
| expansive/slide v kick-chase/compressed | tracked | 4.7 | 10.0 | 7.2 | 3.0 | 8.8 | 9.5 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.5 | 13.3 |
| expansive/slide v kick-chase/compressed | opponent | 2.2 | 8.0 | 5.9 | 2.5 | 9.4 | 6.9 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 13.3 | 15.5 |
| kick-chase/slide v kick-chase/rush | tracked | 2.4 | 21.2 | 7.1 | 3.3 | 9.3 | 9.6 | 5.4 | 2.5 | 0.4 | 1.2 | 0.5 | 17.4 | 14.2 |
| kick-chase/slide v kick-chase/rush | opponent | 2.4 | 8.0 | 5.6 | 2.7 | 9.2 | 6.8 | 5.2 | 2.5 | 0.2 | 1.3 | 0.1 | 14.2 | 17.4 |
| kick-chase/rush v all-out/rush | tracked | 2.4 | 21.3 | 7.3 | 3.7 | 9.3 | 9.9 | 5.5 | 2.4 | 0.4 | 1.3 | 0.5 | 19.4 | 16.1 |
| kick-chase/rush v all-out/rush | opponent | 6.4 | 21.8 | 5.9 | 3.1 | 7.6 | 9.5 | 6.0 | 1.7 | 0.2 | 0.7 | 0.1 | 16.1 | 19.4 |

_5 cells in 1908 s._
