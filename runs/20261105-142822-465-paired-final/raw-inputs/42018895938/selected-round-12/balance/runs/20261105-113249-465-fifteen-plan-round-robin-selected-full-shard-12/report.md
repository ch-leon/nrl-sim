# Balance: 465 fifteen plan round robin / selected full shard 12

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:32:49.309Z

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
| grind/slide v all-out/rush | 1000 | 40.3% ± 1.5% |
| grind/compressed v balanced/slide | 1000 | 50.4% ± 1.5% |
| balanced/slide v expansive/rush | 1000 | 47.9% ± 1.5% |
| balanced/rush v all-out/slide | 1000 | 57.4% ± 1.5% |
| expansive/slide v kick-chase/rush | 1000 | 51.7% ± 1.5% |
| expansive/compressed v all-out/slide | 1000 | 44.1% ± 1.5% |
| all-out/slide v all-out/rush | 1000 | 36.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v all-out/rush | tracked | 2.2 | 22.1 | 4.5 | 2.8 | 9.3 | 5.8 | 4.5 | 1.2 | 0.1 | 1.0 | 0.1 | 14.5 | 16.8 |
| grind/slide v all-out/rush | opponent | 6.4 | 12.2 | 8.5 | 3.2 | 8.3 | 7.6 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 16.8 | 14.5 |
| grind/compressed v balanced/slide | tracked | 2.8 | 10.3 | 5.8 | 2.9 | 9.6 | 4.3 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 15.0 | 14.5 |
| grind/compressed v balanced/slide | opponent | 3.6 | 8.5 | 7.4 | 2.8 | 8.8 | 9.2 | 5.2 | 1.7 | 0.2 | 0.9 | 0.2 | 14.5 | 15.0 |
| balanced/slide v expansive/rush | tracked | 3.8 | 22.1 | 6.0 | 2.9 | 8.4 | 9.5 | 5.3 | 1.6 | 0.2 | 0.9 | 0.1 | 15.3 | 15.8 |
| balanced/slide v expansive/rush | opponent | 4.5 | 8.1 | 6.8 | 3.1 | 8.7 | 6.9 | 4.7 | 1.7 | 0.2 | 0.7 | 0.1 | 15.8 | 15.3 |
| balanced/rush v all-out/slide | tracked | 3.7 | 8.5 | 7.0 | 3.3 | 8.8 | 7.0 | 5.2 | 1.6 | 0.2 | 1.1 | 0.2 | 17.0 | 15.3 |
| balanced/rush v all-out/slide | opponent | 6.6 | 21.9 | 6.0 | 3.0 | 7.9 | 9.4 | 5.8 | 1.8 | 0.2 | 0.7 | 0.1 | 15.3 | 17.0 |
| expansive/slide v kick-chase/rush | tracked | 5.0 | 23.1 | 5.8 | 3.0 | 8.6 | 9.7 | 5.0 | 1.7 | 0.2 | 0.7 | 0.1 | 15.4 | 14.8 |
| expansive/slide v kick-chase/rush | opponent | 2.2 | 8.3 | 6.0 | 2.8 | 9.7 | 6.9 | 5.0 | 2.6 | 0.2 | 1.3 | 0.1 | 14.8 | 15.4 |
| expansive/compressed v all-out/slide | tracked | 4.6 | 8.0 | 6.5 | 2.8 | 8.6 | 6.8 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 14.7 | 16.0 |
| expansive/compressed v all-out/slide | opponent | 6.2 | 8.5 | 7.6 | 3.1 | 8.3 | 9.3 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 16.0 | 14.7 |
| all-out/slide v all-out/rush | tracked | 6.3 | 21.5 | 5.9 | 2.9 | 7.6 | 9.3 | 5.7 | 1.8 | 0.2 | 0.7 | 0.1 | 15.3 | 18.9 |
| all-out/slide v all-out/rush | opponent | 6.5 | 12.2 | 8.1 | 3.7 | 8.1 | 7.5 | 5.4 | 1.9 | 0.2 | 0.8 | 0.1 | 18.9 | 15.3 |

_7 cells in 2514 s._
