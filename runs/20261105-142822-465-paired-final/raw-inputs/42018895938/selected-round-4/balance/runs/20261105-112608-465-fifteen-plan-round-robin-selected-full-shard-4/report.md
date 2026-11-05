# Balance: 465 fifteen plan round robin / selected full shard 4

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:08.177Z

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
| grind/slide v balanced/compressed | 1000 | 42.6% ± 1.5% |
| grind/rush v expansive/rush | 1000 | 47.7% ± 1.5% |
| grind/compressed v kick-chase/rush | 1000 | 40.0% ± 1.5% |
| balanced/slide v all-out/compressed | 1000 | 45.8% ± 1.5% |
| balanced/compressed v kick-chase/rush | 1000 | 42.5% ± 1.5% |
| expansive/rush v kick-chase/rush | 1000 | 38.5% ± 1.5% |
| kick-chase/slide v all-out/compressed | 1000 | 49.3% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v balanced/compressed | tracked | 1.5 | 5.4 | 4.5 | 2.5 | 10.1 | 5.1 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 12.7 | 14.6 |
| grind/slide v balanced/compressed | opponent | 3.9 | 8.8 | 7.4 | 2.8 | 9.0 | 7.2 | 5.4 | 1.7 | 0.1 | 1.0 | 0.2 | 14.6 | 12.7 |
| grind/rush v expansive/rush | tracked | 2.4 | 22.9 | 4.8 | 2.9 | 9.6 | 5.9 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 15.2 | 15.6 |
| grind/rush v expansive/rush | opponent | 4.9 | 23.5 | 6.2 | 3.0 | 8.6 | 9.7 | 5.1 | 1.8 | 0.2 | 0.7 | 0.1 | 15.6 | 15.2 |
| grind/compressed v kick-chase/rush | tracked | 2.1 | 22.6 | 4.5 | 2.6 | 9.5 | 5.7 | 4.9 | 1.2 | 0.1 | 1.1 | 0.2 | 13.7 | 16.1 |
| grind/compressed v kick-chase/rush | opponent | 2.2 | 8.5 | 7.7 | 3.1 | 10.1 | 9.3 | 5.1 | 2.7 | 0.3 | 1.4 | 0.2 | 16.1 | 13.7 |
| balanced/slide v all-out/compressed | tracked | 3.7 | 8.2 | 7.0 | 3.0 | 8.5 | 8.9 | 5.0 | 1.6 | 0.1 | 0.9 | 0.1 | 15.5 | 16.7 |
| balanced/slide v all-out/compressed | opponent | 6.3 | 12.0 | 8.1 | 3.2 | 8.0 | 7.3 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 16.7 | 15.5 |
| balanced/compressed v kick-chase/rush | tracked | 3.8 | 21.8 | 5.8 | 2.8 | 8.6 | 9.4 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 14.4 | 15.9 |
| balanced/compressed v kick-chase/rush | opponent | 2.3 | 8.2 | 7.2 | 3.1 | 9.7 | 9.1 | 5.1 | 2.7 | 0.3 | 1.3 | 0.3 | 15.9 | 14.4 |
| expansive/rush v kick-chase/rush | tracked | 4.8 | 22.4 | 5.4 | 3.0 | 8.3 | 9.3 | 5.2 | 1.6 | 0.2 | 0.7 | 0.1 | 15.7 | 19.0 |
| expansive/rush v kick-chase/rush | opponent | 2.4 | 21.9 | 7.3 | 3.6 | 9.5 | 9.7 | 5.2 | 2.5 | 0.4 | 1.2 | 0.5 | 19.0 | 15.7 |
| kick-chase/slide v all-out/compressed | tracked | 2.2 | 8.1 | 6.8 | 3.1 | 9.5 | 8.7 | 5.0 | 2.6 | 0.3 | 1.2 | 0.3 | 16.1 | 16.6 |
| kick-chase/slide v all-out/compressed | opponent | 6.4 | 12.1 | 8.0 | 3.2 | 8.0 | 7.4 | 5.4 | 1.9 | 0.1 | 0.7 | 0.1 | 16.6 | 16.1 |

_7 cells in 4864 s._
