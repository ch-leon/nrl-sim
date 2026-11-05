# Balance: 465 fifteen plan round robin / selected full shard 10

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:05.004Z

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
| grind/slide v kick-chase/compressed | 1000 | 45.7% ± 1.5% |
| grind/rush v all-out/rush | 1000 | 55.3% ± 1.5% |
| balanced/slide v balanced/compressed | 1000 | 50.9% ± 1.5% |
| balanced/rush v kick-chase/rush | 1000 | 37.8% ± 1.5% |
| expansive/slide v expansive/compressed | 1000 | 57.1% ± 1.5% |
| expansive/compressed v kick-chase/rush | 1000 | 46.6% ± 1.5% |
| kick-chase/compressed v all-out/rush | 1000 | 54.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/compressed | tracked | 1.5 | 5.3 | 4.5 | 2.4 | 10.2 | 5.2 | 4.6 | 1.3 | 0.1 | 1.1 | 0.1 | 12.6 | 13.6 |
| grind/slide v kick-chase/compressed | opponent | 2.3 | 8.7 | 6.1 | 2.6 | 9.9 | 7.1 | 5.2 | 2.8 | 0.2 | 1.3 | 0.1 | 13.6 | 12.6 |
| grind/rush v all-out/rush | tracked | 2.4 | 23.0 | 4.7 | 3.0 | 9.8 | 5.9 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 15.9 | 14.5 |
| grind/rush v all-out/rush | opponent | 6.5 | 22.9 | 6.3 | 2.8 | 8.1 | 9.6 | 5.9 | 1.9 | 0.2 | 0.7 | 0.1 | 14.5 | 15.9 |
| balanced/slide v balanced/compressed | tracked | 3.6 | 8.3 | 7.2 | 3.0 | 8.6 | 9.0 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 15.4 | 15.1 |
| balanced/slide v balanced/compressed | opponent | 3.6 | 8.4 | 7.0 | 2.9 | 8.7 | 7.0 | 5.1 | 1.7 | 0.1 | 1.0 | 0.2 | 15.1 | 15.4 |
| balanced/rush v kick-chase/rush | tracked | 3.7 | 21.6 | 5.7 | 3.0 | 8.3 | 9.3 | 5.3 | 1.5 | 0.1 | 0.9 | 0.2 | 15.7 | 19.2 |
| balanced/rush v kick-chase/rush | opponent | 2.3 | 21.8 | 7.2 | 3.7 | 9.5 | 9.9 | 5.3 | 2.5 | 0.5 | 1.3 | 0.6 | 19.2 | 15.7 |
| expansive/slide v expansive/compressed | tracked | 4.7 | 10.1 | 7.3 | 3.2 | 8.8 | 9.3 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 16.2 | 14.4 |
| expansive/slide v expansive/compressed | opponent | 4.5 | 8.2 | 6.5 | 2.8 | 8.6 | 6.8 | 4.8 | 1.7 | 0.2 | 0.8 | 0.1 | 14.4 | 16.2 |
| expansive/compressed v kick-chase/rush | tracked | 5.0 | 22.8 | 5.8 | 3.0 | 8.5 | 9.6 | 5.1 | 1.7 | 0.2 | 0.7 | 0.1 | 15.4 | 16.3 |
| expansive/compressed v kick-chase/rush | opponent | 2.3 | 8.3 | 7.1 | 3.1 | 9.8 | 8.8 | 5.1 | 2.6 | 0.3 | 1.4 | 0.3 | 16.3 | 15.4 |
| kick-chase/compressed v all-out/rush | tracked | 2.3 | 21.0 | 7.0 | 3.5 | 9.2 | 9.7 | 5.2 | 2.5 | 0.5 | 1.2 | 0.5 | 18.1 | 16.6 |
| kick-chase/compressed v all-out/rush | opponent | 6.1 | 8.4 | 7.3 | 3.2 | 8.1 | 9.2 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 16.6 | 18.1 |

_7 cells in 2502 s._
