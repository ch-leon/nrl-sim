# Balance: 465 fifteen plan round robin / selected full shard 8

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:09.202Z

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
| grind/slide v kick-chase/slide | 1000 | 56.1% ± 1.5% |
| grind/rush v kick-chase/compressed | 1000 | 34.4% ± 1.5% |
| grind/compressed v all-out/compressed | 1000 | 41.3% ± 1.5% |
| balanced/rush v expansive/compressed | 1000 | 51.9% ± 1.5% |
| balanced/compressed v all-out/compressed | 1000 | 49.6% ± 1.5% |
| expansive/rush v all-out/compressed | 1000 | 58.9% ± 1.5% |
| kick-chase/rush v all-out/compressed | 1000 | 59.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/slide | tracked | 2.8 | 10.4 | 6.0 | 2.8 | 9.9 | 4.3 | 4.6 | 1.3 | 0.1 | 1.2 | 0.1 | 14.5 | 12.7 |
| grind/slide v kick-chase/slide | opponent | 2.2 | 8.3 | 5.9 | 2.4 | 9.8 | 7.1 | 5.1 | 2.6 | 0.2 | 1.2 | 0.1 | 12.7 | 14.5 |
| grind/rush v kick-chase/compressed | tracked | 1.5 | 5.2 | 4.4 | 2.6 | 9.9 | 5.0 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 13.5 | 17.8 |
| grind/rush v kick-chase/compressed | opponent | 2.4 | 22.3 | 7.5 | 3.4 | 9.6 | 10.0 | 5.4 | 2.6 | 0.5 | 1.2 | 0.5 | 17.8 | 13.5 |
| grind/compressed v all-out/compressed | tracked | 1.5 | 5.4 | 4.4 | 2.5 | 10.0 | 4.9 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 13.0 | 15.3 |
| grind/compressed v all-out/compressed | opponent | 6.5 | 8.8 | 7.8 | 3.0 | 8.6 | 9.5 | 5.5 | 2.1 | 0.2 | 0.8 | 0.1 | 15.3 | 13.0 |
| balanced/rush v expansive/compressed | tracked | 3.6 | 8.5 | 7.3 | 3.1 | 8.7 | 9.2 | 5.1 | 1.6 | 0.1 | 1.0 | 0.2 | 16.3 | 16.1 |
| balanced/rush v expansive/compressed | opponent | 4.9 | 23.0 | 5.8 | 3.1 | 8.5 | 9.6 | 5.0 | 1.7 | 0.1 | 0.7 | 0.1 | 16.1 | 16.3 |
| balanced/compressed v all-out/compressed | tracked | 3.6 | 8.3 | 7.1 | 3.0 | 8.7 | 9.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.8 | 15.6 |
| balanced/compressed v all-out/compressed | opponent | 6.2 | 8.5 | 7.4 | 3.0 | 8.3 | 9.2 | 5.1 | 1.9 | 0.2 | 0.8 | 0.1 | 15.6 | 15.8 |
| expansive/rush v all-out/compressed | tracked | 4.8 | 10.2 | 7.4 | 3.5 | 8.8 | 9.3 | 4.8 | 1.7 | 0.1 | 0.8 | 0.1 | 17.6 | 15.1 |
| expansive/rush v all-out/compressed | opponent | 6.5 | 21.8 | 6.1 | 2.9 | 7.8 | 9.6 | 5.8 | 1.8 | 0.1 | 0.7 | 0.1 | 15.1 | 17.6 |
| kick-chase/rush v all-out/compressed | tracked | 2.3 | 8.3 | 7.2 | 3.3 | 9.7 | 8.7 | 5.2 | 2.6 | 0.3 | 1.3 | 0.2 | 17.1 | 14.8 |
| kick-chase/rush v all-out/compressed | opponent | 6.5 | 22.0 | 6.1 | 2.9 | 7.7 | 9.5 | 6.0 | 1.8 | 0.2 | 0.6 | 0.1 | 14.8 | 17.1 |

_7 cells in 4482 s._
