# Balance: 465 preset final 1 / shard 2

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:14:48.273Z

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
| grind/slide v kick-chase/compressed | 1000 | 46.0% ± 1.5% |
| balanced/slide v kick-chase/slide | 1000 | 53.1% ± 1.5% |
| balanced/compressed v kick-chase/rush | 1000 | 47.0% ± 1.5% |
| expansive/rush v kick-chase/compressed | 1000 | 45.1% ± 1.5% |
| kick-chase/slide v all-out/rush | 1000 | 51.3% ± 1.5% |
| kick-chase/compressed v all-out/rush | 1000 | 53.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/compressed | tracked | 1.6 | 5.5 | 4.5 | 2.5 | 10.2 | 5.2 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 12.9 | 13.7 |
| grind/slide v kick-chase/compressed | opponent | 2.4 | 8.5 | 6.3 | 2.6 | 9.8 | 7.2 | 5.3 | 2.7 | 0.2 | 1.3 | 0.1 | 13.7 | 12.9 |
| balanced/slide v kick-chase/slide | tracked | 3.7 | 8.6 | 7.1 | 2.9 | 8.9 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.9 | 13.7 |
| balanced/slide v kick-chase/slide | opponent | 2.2 | 8.0 | 6.0 | 2.6 | 9.3 | 6.9 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 13.7 | 14.9 |
| balanced/compressed v kick-chase/rush | tracked | 3.7 | 21.8 | 5.8 | 2.9 | 8.5 | 9.5 | 5.4 | 1.6 | 0.1 | 0.9 | 0.1 | 15.3 | 16.0 |
| balanced/compressed v kick-chase/rush | opponent | 2.3 | 8.0 | 7.2 | 3.1 | 9.4 | 8.9 | 5.3 | 2.5 | 0.3 | 1.3 | 0.3 | 16.0 | 15.3 |
| expansive/rush v kick-chase/compressed | tracked | 4.7 | 9.7 | 7.1 | 3.3 | 8.6 | 9.1 | 5.0 | 1.7 | 0.2 | 0.8 | 0.1 | 16.8 | 17.9 |
| expansive/rush v kick-chase/compressed | opponent | 2.5 | 21.1 | 7.2 | 3.4 | 9.2 | 9.7 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 17.9 | 16.8 |
| kick-chase/slide v all-out/rush | tracked | 2.4 | 20.6 | 7.0 | 3.5 | 9.2 | 9.8 | 5.3 | 2.4 | 0.5 | 1.2 | 0.5 | 18.2 | 17.6 |
| kick-chase/slide v all-out/rush | opponent | 6.2 | 11.7 | 7.9 | 3.4 | 7.9 | 7.2 | 5.4 | 1.8 | 0.1 | 0.7 | 0.1 | 17.6 | 18.2 |
| kick-chase/compressed v all-out/rush | tracked | 2.4 | 20.7 | 6.9 | 3.4 | 9.1 | 9.6 | 5.4 | 2.4 | 0.5 | 1.2 | 0.5 | 18.0 | 16.8 |
| kick-chase/compressed v all-out/rush | opponent | 6.3 | 8.5 | 7.2 | 3.2 | 8.0 | 9.1 | 5.2 | 1.9 | 0.2 | 0.7 | 0.1 | 16.8 | 18.0 |

_6 cells in 3920 s._
