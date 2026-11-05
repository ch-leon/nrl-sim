# Balance: 465 fifteen plan round robin / selected full shard 3

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:31:18.220Z

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
| grind/slide v balanced/rush | 1000 | 47.9% ± 1.5% |
| grind/rush v expansive/slide | 1000 | 53.9% ± 1.5% |
| grind/compressed v kick-chase/slide | 1000 | 49.8% ± 1.5% |
| balanced/slide v all-out/rush | 1000 | 40.8% ± 1.5% |
| balanced/compressed v kick-chase/slide | 1000 | 44.6% ± 1.5% |
| expansive/rush v kick-chase/slide | 1000 | 36.6% ± 1.5% |
| kick-chase/slide v all-out/rush | 1000 | 51.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v balanced/rush | tracked | 2.3 | 22.9 | 4.6 | 2.7 | 9.6 | 5.7 | 4.6 | 1.1 | 0.1 | 1.1 | 0.2 | 14.3 | 14.8 |
| grind/slide v balanced/rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 9.0 | 7.2 | 5.1 | 1.8 | 0.2 | 1.0 | 0.1 | 14.8 | 14.3 |
| grind/rush v expansive/slide | tracked | 2.9 | 10.4 | 5.9 | 2.9 | 9.7 | 4.3 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 15.3 | 14.7 |
| grind/rush v expansive/slide | opponent | 4.9 | 23.1 | 6.0 | 2.8 | 8.7 | 9.4 | 5.0 | 1.8 | 0.2 | 0.7 | 0.1 | 14.7 | 15.3 |
| grind/compressed v kick-chase/slide | tracked | 2.8 | 10.2 | 5.8 | 2.8 | 9.7 | 4.3 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 14.3 | 14.3 |
| grind/compressed v kick-chase/slide | opponent | 2.2 | 8.2 | 7.3 | 2.7 | 9.9 | 9.0 | 5.1 | 2.7 | 0.3 | 1.3 | 0.2 | 14.3 | 14.3 |
| balanced/slide v all-out/rush | tracked | 3.8 | 21.8 | 5.8 | 3.1 | 8.5 | 9.3 | 5.1 | 1.6 | 0.1 | 1.0 | 0.2 | 15.9 | 18.1 |
| balanced/slide v all-out/rush | opponent | 6.3 | 12.2 | 8.3 | 3.5 | 8.1 | 7.3 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 18.1 | 15.9 |
| balanced/compressed v kick-chase/slide | tracked | 3.5 | 8.6 | 6.8 | 2.7 | 8.8 | 7.0 | 5.3 | 1.7 | 0.2 | 1.0 | 0.2 | 14.2 | 15.3 |
| balanced/compressed v kick-chase/slide | opponent | 2.3 | 8.2 | 6.9 | 2.9 | 9.6 | 8.7 | 5.1 | 2.6 | 0.3 | 1.2 | 0.2 | 15.3 | 14.2 |
| expansive/rush v kick-chase/slide | tracked | 4.6 | 7.9 | 6.2 | 2.8 | 8.4 | 6.7 | 5.0 | 1.7 | 0.2 | 0.7 | 0.1 | 14.5 | 18.5 |
| expansive/rush v kick-chase/slide | opponent | 2.4 | 21.8 | 7.3 | 3.6 | 9.6 | 10.0 | 5.4 | 2.6 | 0.5 | 1.2 | 0.5 | 18.5 | 14.5 |
| kick-chase/slide v all-out/rush | tracked | 2.3 | 21.0 | 7.0 | 3.6 | 9.2 | 9.7 | 5.3 | 2.5 | 0.5 | 1.2 | 0.5 | 18.9 | 17.9 |
| kick-chase/slide v all-out/rush | opponent | 6.2 | 11.8 | 7.9 | 3.5 | 7.9 | 7.0 | 5.5 | 1.8 | 0.1 | 0.8 | 0.1 | 17.9 | 18.9 |

_7 cells in 4785 s._
