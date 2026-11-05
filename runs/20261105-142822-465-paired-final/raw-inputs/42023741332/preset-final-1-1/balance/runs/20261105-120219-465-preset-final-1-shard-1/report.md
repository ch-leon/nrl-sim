# Balance: 465 preset final 1 / shard 1

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:02:19.118Z

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
| grind/slide v kick-chase/rush | 1000 | 54.9% ± 1.5% |
| grind/compressed v kick-chase/compressed | 1000 | 46.1% ± 1.5% |
| balanced/compressed v kick-chase/slide | 1000 | 49.5% ± 1.5% |
| expansive/rush v kick-chase/rush | 1000 | 44.8% ± 1.5% |
| kick-chase/slide v all-out/slide | 1000 | 38.6% ± 1.5% |
| kick-chase/compressed v all-out/slide | 1000 | 43.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/rush | tracked | 2.3 | 23.3 | 4.8 | 2.8 | 9.6 | 6.0 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.9 | 13.8 |
| grind/slide v kick-chase/rush | opponent | 2.2 | 8.5 | 6.1 | 2.6 | 9.5 | 7.0 | 5.4 | 2.7 | 0.2 | 1.2 | 0.1 | 13.8 | 14.9 |
| grind/compressed v kick-chase/compressed | tracked | 1.6 | 5.4 | 4.4 | 2.5 | 10.3 | 5.0 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 13.1 | 14.5 |
| grind/compressed v kick-chase/compressed | opponent | 2.4 | 8.4 | 7.6 | 2.8 | 9.6 | 9.1 | 5.6 | 2.7 | 0.3 | 1.3 | 0.2 | 14.5 | 13.1 |
| balanced/compressed v kick-chase/slide | tracked | 3.7 | 8.5 | 6.8 | 2.9 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 14.8 | 14.9 |
| balanced/compressed v kick-chase/slide | opponent | 2.3 | 8.0 | 7.0 | 2.8 | 9.4 | 8.8 | 5.3 | 2.6 | 0.3 | 1.2 | 0.2 | 14.9 | 14.8 |
| expansive/rush v kick-chase/rush | tracked | 4.9 | 22.3 | 5.5 | 3.2 | 8.2 | 9.3 | 5.1 | 1.6 | 0.2 | 0.7 | 0.1 | 16.5 | 18.3 |
| expansive/rush v kick-chase/rush | opponent | 2.5 | 21.3 | 7.4 | 3.5 | 9.1 | 9.9 | 5.5 | 2.5 | 0.4 | 1.2 | 0.5 | 18.3 | 16.5 |
| kick-chase/slide v all-out/slide | tracked | 2.2 | 7.8 | 5.7 | 2.6 | 9.2 | 6.7 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 13.5 | 16.9 |
| kick-chase/slide v all-out/slide | opponent | 6.5 | 12.1 | 8.1 | 3.3 | 8.3 | 7.3 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 16.9 | 13.5 |
| kick-chase/compressed v all-out/slide | tracked | 2.3 | 8.0 | 5.7 | 2.7 | 9.3 | 6.8 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 14.1 | 15.8 |
| kick-chase/compressed v all-out/slide | opponent | 6.3 | 8.6 | 7.5 | 3.1 | 8.3 | 9.4 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 15.8 | 14.1 |

_6 cells in 2023 s._
