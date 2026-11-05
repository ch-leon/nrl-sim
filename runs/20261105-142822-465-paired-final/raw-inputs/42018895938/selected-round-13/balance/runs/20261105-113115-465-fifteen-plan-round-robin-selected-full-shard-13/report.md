# Balance: 465 fifteen plan round robin / selected full shard 13

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:31:15.119Z

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
| grind/slide v all-out/compressed | 1000 | 34.2% ± 1.5% |
| grind/compressed v balanced/rush | 1000 | 45.6% ± 1.5% |
| balanced/slide v expansive/compressed | 1000 | 54.0% ± 1.5% |
| balanced/rush v all-out/rush | 1000 | 53.1% ± 1.5% |
| expansive/slide v kick-chase/compressed | 1000 | 56.3% ± 1.5% |
| expansive/compressed v all-out/rush | 1000 | 49.0% ± 1.5% |
| all-out/slide v all-out/compressed | 1000 | 45.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v all-out/compressed | tracked | 1.5 | 5.2 | 4.4 | 2.5 | 9.8 | 5.0 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 12.8 | 16.9 |
| grind/slide v all-out/compressed | opponent | 6.5 | 12.7 | 8.5 | 3.3 | 8.3 | 7.7 | 5.4 | 1.9 | 0.2 | 0.8 | 0.1 | 16.9 | 12.8 |
| grind/compressed v balanced/rush | tracked | 2.2 | 22.9 | 4.7 | 2.7 | 9.6 | 5.9 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.0 | 14.8 |
| grind/compressed v balanced/rush | opponent | 3.7 | 8.6 | 7.7 | 2.9 | 9.0 | 9.3 | 5.2 | 1.7 | 0.2 | 1.1 | 0.1 | 14.8 | 14.0 |
| balanced/slide v expansive/compressed | tracked | 3.7 | 8.3 | 7.1 | 3.0 | 8.8 | 9.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 15.6 | 14.7 |
| balanced/slide v expansive/compressed | opponent | 4.5 | 8.2 | 6.5 | 2.9 | 8.7 | 6.8 | 4.7 | 1.7 | 0.1 | 0.7 | 0.1 | 14.7 | 15.6 |
| balanced/rush v all-out/rush | tracked | 3.8 | 21.9 | 5.8 | 3.2 | 8.5 | 9.6 | 5.4 | 1.6 | 0.2 | 1.0 | 0.1 | 16.5 | 15.5 |
| balanced/rush v all-out/rush | opponent | 6.5 | 22.1 | 6.0 | 3.0 | 7.8 | 9.6 | 6.0 | 1.8 | 0.1 | 0.8 | 0.1 | 15.5 | 16.5 |
| expansive/slide v kick-chase/compressed | tracked | 4.9 | 10.2 | 7.4 | 3.0 | 8.7 | 9.4 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.4 | 13.5 |
| expansive/slide v kick-chase/compressed | opponent | 2.2 | 8.3 | 5.8 | 2.6 | 9.5 | 7.0 | 5.0 | 2.6 | 0.2 | 1.2 | 0.1 | 13.5 | 15.4 |
| expansive/compressed v all-out/rush | tracked | 4.9 | 22.7 | 5.9 | 3.1 | 8.4 | 9.6 | 4.9 | 1.6 | 0.2 | 0.7 | 0.1 | 16.0 | 16.4 |
| expansive/compressed v all-out/rush | opponent | 6.3 | 8.4 | 7.6 | 3.2 | 8.4 | 9.1 | 5.3 | 2.0 | 0.2 | 0.8 | 0.1 | 16.4 | 16.0 |
| all-out/slide v all-out/compressed | tracked | 6.1 | 8.5 | 7.2 | 3.0 | 8.1 | 8.9 | 5.2 | 1.9 | 0.2 | 0.7 | 0.1 | 15.7 | 17.2 |
| all-out/slide v all-out/compressed | opponent | 6.3 | 12.0 | 8.1 | 3.3 | 8.0 | 7.2 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 17.2 | 15.7 |

_7 cells in 2474 s._
