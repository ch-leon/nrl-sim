# Balance: 465 fifteen plan round robin / selected full shard 14

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:30:35.827Z

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
| grind/rush v grind/compressed | 1000 | 46.1% ± 1.5% |
| grind/compressed v balanced/compressed | 1000 | 41.8% ± 1.5% |
| balanced/slide v kick-chase/slide | 1000 | 52.5% ± 1.5% |
| balanced/rush v all-out/compressed | 1000 | 60.0% ± 1.5% |
| expansive/slide v all-out/slide | 1000 | 39.0% ± 1.5% |
| expansive/compressed v all-out/compressed | 1000 | 52.4% ± 1.5% |
| all-out/rush v all-out/compressed | 1000 | 60.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v grind/compressed | tracked | 1.6 | 5.7 | 4.7 | 2.5 | 10.3 | 5.2 | 4.6 | 1.3 | 0.1 | 1.1 | 0.2 | 12.7 | 13.8 |
| grind/rush v grind/compressed | opponent | 2.3 | 23.6 | 4.9 | 2.6 | 9.8 | 6.0 | 4.9 | 1.3 | 0.1 | 1.0 | 0.2 | 13.8 | 12.7 |
| grind/compressed v balanced/compressed | tracked | 1.6 | 5.4 | 4.5 | 2.4 | 10.2 | 5.1 | 4.4 | 1.3 | 0.1 | 1.1 | 0.2 | 12.5 | 14.5 |
| grind/compressed v balanced/compressed | opponent | 3.7 | 8.7 | 7.5 | 2.8 | 9.0 | 9.4 | 5.3 | 1.8 | 0.2 | 1.0 | 0.1 | 14.5 | 12.5 |
| balanced/slide v kick-chase/slide | tracked | 3.7 | 8.5 | 7.0 | 2.8 | 8.7 | 6.9 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 14.5 | 13.9 |
| balanced/slide v kick-chase/slide | opponent | 2.2 | 8.4 | 5.9 | 2.6 | 9.6 | 6.9 | 4.9 | 2.6 | 0.2 | 1.3 | 0.1 | 13.9 | 14.5 |
| balanced/rush v all-out/compressed | tracked | 3.8 | 8.6 | 7.3 | 3.2 | 8.8 | 9.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 16.8 | 14.7 |
| balanced/rush v all-out/compressed | opponent | 6.4 | 21.8 | 6.0 | 2.8 | 7.8 | 9.5 | 5.8 | 1.9 | 0.2 | 0.7 | 0.1 | 14.7 | 16.8 |
| expansive/slide v all-out/slide | tracked | 4.5 | 8.0 | 6.3 | 2.8 | 8.6 | 6.6 | 4.7 | 1.7 | 0.2 | 0.7 | 0.1 | 14.7 | 17.5 |
| expansive/slide v all-out/slide | opponent | 6.3 | 12.5 | 8.3 | 3.4 | 8.2 | 7.5 | 5.3 | 2.0 | 0.2 | 0.7 | 0.1 | 17.5 | 14.7 |
| expansive/compressed v all-out/compressed | tracked | 4.7 | 9.8 | 7.1 | 3.1 | 8.7 | 9.0 | 4.8 | 1.7 | 0.2 | 0.8 | 0.1 | 15.9 | 15.4 |
| expansive/compressed v all-out/compressed | opponent | 6.1 | 8.5 | 7.4 | 3.0 | 8.2 | 9.3 | 5.2 | 1.9 | 0.2 | 0.7 | 0.1 | 15.4 | 15.9 |
| all-out/rush v all-out/compressed | tracked | 6.5 | 8.7 | 7.7 | 3.4 | 8.4 | 9.5 | 5.3 | 2.0 | 0.2 | 0.8 | 0.1 | 17.5 | 14.7 |
| all-out/rush v all-out/compressed | opponent | 6.4 | 21.8 | 5.9 | 2.8 | 7.6 | 9.3 | 5.9 | 1.7 | 0.2 | 0.6 | 0.1 | 14.7 | 17.5 |

_7 cells in 3436 s._
