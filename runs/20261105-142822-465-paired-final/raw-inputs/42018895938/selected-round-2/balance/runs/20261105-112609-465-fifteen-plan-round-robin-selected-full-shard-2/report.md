# Balance: 465 fifteen plan round robin / selected full shard 2

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:09.877Z

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
| grind/slide v balanced/slide | 1000 | 53.8% ± 1.5% |
| grind/rush v balanced/compressed | 1000 | 46.0% ± 1.5% |
| grind/compressed v expansive/compressed | 1000 | 38.0% ± 1.5% |
| balanced/slide v all-out/slide | 1000 | 43.2% ± 1.5% |
| balanced/compressed v expansive/compressed | 1000 | 50.0% ± 1.5% |
| expansive/rush v expansive/compressed | 1000 | 50.2% ± 1.5% |
| kick-chase/slide v all-out/slide | 1000 | 39.8% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v balanced/slide | tracked | 2.8 | 10.3 | 5.8 | 2.9 | 9.7 | 4.3 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 15.3 | 14.1 |
| grind/slide v balanced/slide | opponent | 3.7 | 8.7 | 7.1 | 2.7 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 14.1 | 15.3 |
| grind/rush v balanced/compressed | tracked | 1.6 | 5.6 | 4.7 | 2.7 | 10.0 | 5.3 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 13.7 | 14.9 |
| grind/rush v balanced/compressed | opponent | 3.9 | 22.5 | 6.1 | 2.9 | 8.7 | 9.7 | 5.4 | 1.7 | 0.1 | 0.9 | 0.1 | 14.9 | 13.7 |
| grind/compressed v expansive/compressed | tracked | 1.5 | 5.5 | 4.6 | 2.4 | 10.1 | 5.0 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 12.4 | 15.6 |
| grind/compressed v expansive/compressed | opponent | 4.9 | 10.5 | 7.7 | 3.1 | 9.0 | 9.7 | 5.0 | 1.8 | 0.2 | 0.8 | 0.1 | 15.6 | 12.4 |
| balanced/slide v all-out/slide | tracked | 3.5 | 8.4 | 6.9 | 2.9 | 8.5 | 6.8 | 4.9 | 1.6 | 0.1 | 0.9 | 0.1 | 15.1 | 17.0 |
| balanced/slide v all-out/slide | opponent | 6.3 | 12.1 | 8.1 | 3.3 | 8.1 | 7.4 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 17.0 | 15.1 |
| balanced/compressed v expansive/compressed | tracked | 3.6 | 8.5 | 7.4 | 2.9 | 8.7 | 9.2 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.3 | 15.5 |
| balanced/compressed v expansive/compressed | opponent | 4.7 | 9.9 | 7.1 | 3.0 | 8.7 | 9.2 | 4.9 | 1.7 | 0.2 | 0.7 | 0.1 | 15.5 | 15.3 |
| expansive/rush v expansive/compressed | tracked | 4.7 | 10.0 | 7.4 | 3.2 | 8.7 | 9.2 | 4.9 | 1.8 | 0.1 | 0.8 | 0.1 | 16.3 | 15.8 |
| expansive/rush v expansive/compressed | opponent | 4.8 | 22.7 | 5.8 | 3.1 | 8.6 | 9.6 | 5.0 | 1.7 | 0.2 | 0.7 | 0.1 | 15.8 | 16.3 |
| kick-chase/slide v all-out/slide | tracked | 2.2 | 8.0 | 5.6 | 2.7 | 9.4 | 6.8 | 4.9 | 2.6 | 0.2 | 1.2 | 0.1 | 14.1 | 16.7 |
| kick-chase/slide v all-out/slide | opponent | 6.5 | 12.4 | 8.2 | 3.2 | 8.2 | 7.4 | 5.4 | 1.9 | 0.2 | 0.8 | 0.1 | 16.7 | 14.1 |

_7 cells in 4865 s._
