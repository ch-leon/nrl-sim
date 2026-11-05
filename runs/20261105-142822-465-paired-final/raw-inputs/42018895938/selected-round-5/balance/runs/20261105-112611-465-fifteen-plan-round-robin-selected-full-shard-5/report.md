# Balance: 465 fifteen plan round robin / selected full shard 5

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:11.865Z

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
| grind/slide v expansive/slide | 1000 | 56.4% ± 1.5% |
| grind/rush v expansive/compressed | 1000 | 41.5% ± 1.5% |
| grind/compressed v kick-chase/compressed | 1000 | 41.1% ± 1.5% |
| balanced/rush v balanced/compressed | 1000 | 56.9% ± 1.5% |
| balanced/compressed v kick-chase/compressed | 1000 | 49.0% ± 1.5% |
| expansive/rush v kick-chase/compressed | 1000 | 43.2% ± 1.5% |
| kick-chase/rush v kick-chase/compressed | 1000 | 45.3% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v expansive/slide | tracked | 2.9 | 10.4 | 6.0 | 2.9 | 9.7 | 4.4 | 4.7 | 1.3 | 0.1 | 1.2 | 0.2 | 15.0 | 13.4 |
| grind/slide v expansive/slide | opponent | 4.5 | 8.3 | 6.7 | 2.6 | 8.9 | 6.7 | 4.9 | 1.8 | 0.2 | 0.8 | 0.1 | 13.4 | 15.0 |
| grind/rush v expansive/compressed | tracked | 1.5 | 5.4 | 4.6 | 2.6 | 9.9 | 5.1 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 13.5 | 15.9 |
| grind/rush v expansive/compressed | opponent | 4.9 | 23.8 | 6.2 | 3.1 | 8.7 | 10.1 | 5.2 | 1.7 | 0.1 | 0.7 | 0.1 | 15.9 | 13.5 |
| grind/compressed v kick-chase/compressed | tracked | 1.6 | 5.4 | 4.6 | 2.4 | 10.1 | 5.2 | 4.6 | 1.3 | 0.1 | 1.1 | 0.2 | 12.3 | 14.4 |
| grind/compressed v kick-chase/compressed | opponent | 2.3 | 8.4 | 7.3 | 2.8 | 9.9 | 8.9 | 5.3 | 2.8 | 0.3 | 1.3 | 0.2 | 14.4 | 12.3 |
| balanced/rush v balanced/compressed | tracked | 3.6 | 8.4 | 7.4 | 3.2 | 8.9 | 9.0 | 5.1 | 1.7 | 0.1 | 1.1 | 0.2 | 16.4 | 14.9 |
| balanced/rush v balanced/compressed | opponent | 3.7 | 21.6 | 5.6 | 2.9 | 8.5 | 9.4 | 5.2 | 1.6 | 0.2 | 0.9 | 0.1 | 14.9 | 16.4 |
| balanced/compressed v kick-chase/compressed | tracked | 3.6 | 8.4 | 7.1 | 2.9 | 8.7 | 9.0 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 15.0 | 15.4 |
| balanced/compressed v kick-chase/compressed | opponent | 2.3 | 8.2 | 7.0 | 2.9 | 9.6 | 8.8 | 5.1 | 2.6 | 0.3 | 1.3 | 0.2 | 15.4 | 15.0 |
| expansive/rush v kick-chase/compressed | tracked | 4.7 | 9.8 | 7.1 | 3.2 | 8.4 | 9.3 | 5.0 | 1.7 | 0.2 | 0.7 | 0.1 | 16.4 | 18.1 |
| expansive/rush v kick-chase/compressed | opponent | 2.3 | 21.2 | 7.1 | 3.5 | 9.4 | 9.6 | 5.2 | 2.5 | 0.4 | 1.2 | 0.5 | 18.1 | 16.4 |
| kick-chase/rush v kick-chase/compressed | tracked | 2.3 | 8.0 | 6.9 | 3.1 | 9.4 | 8.7 | 5.1 | 2.6 | 0.3 | 1.3 | 0.3 | 16.0 | 17.8 |
| kick-chase/rush v kick-chase/compressed | opponent | 2.4 | 21.4 | 6.9 | 3.4 | 9.3 | 9.6 | 5.4 | 2.5 | 0.5 | 1.2 | 0.5 | 17.8 | 16.0 |

_7 cells in 4800 s._
