# Balance: 465 fifteen plan round robin / selected full shard 9

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:07.347Z

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
| grind/slide v kick-chase/rush | 1000 | 50.7% ± 1.5% |
| grind/rush v all-out/slide | 1000 | 56.4% ± 1.5% |
| balanced/slide v balanced/rush | 1000 | 48.6% ± 1.5% |
| balanced/rush v kick-chase/slide | 1000 | 42.8% ± 1.5% |
| expansive/slide v expansive/rush | 1000 | 50.3% ± 1.5% |
| expansive/compressed v kick-chase/slide | 1000 | 41.5% ± 1.5% |
| kick-chase/compressed v all-out/slide | 1000 | 47.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v kick-chase/rush | tracked | 2.2 | 23.2 | 4.7 | 2.6 | 9.7 | 5.9 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 13.8 | 14.1 |
| grind/slide v kick-chase/rush | opponent | 2.2 | 8.5 | 6.0 | 2.7 | 9.9 | 7.2 | 5.0 | 2.7 | 0.2 | 1.3 | 0.1 | 14.1 | 13.8 |
| grind/rush v all-out/slide | tracked | 2.9 | 10.3 | 5.8 | 3.1 | 9.6 | 4.4 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 16.3 | 14.4 |
| grind/rush v all-out/slide | opponent | 6.6 | 22.8 | 6.3 | 2.8 | 8.0 | 9.7 | 6.1 | 1.9 | 0.2 | 0.7 | 0.1 | 14.4 | 16.3 |
| balanced/slide v balanced/rush | tracked | 3.6 | 22.1 | 6.0 | 3.0 | 8.5 | 9.5 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.8 |
| balanced/slide v balanced/rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.8 | 6.9 | 5.0 | 1.5 | 0.2 | 1.0 | 0.2 | 15.8 | 15.4 |
| balanced/rush v kick-chase/slide | tracked | 3.6 | 8.6 | 6.9 | 3.1 | 8.5 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.1 | 15.9 | 18.2 |
| balanced/rush v kick-chase/slide | opponent | 2.3 | 21.8 | 7.1 | 3.5 | 9.3 | 9.9 | 5.3 | 2.5 | 0.5 | 1.3 | 0.5 | 18.2 | 15.9 |
| expansive/slide v expansive/rush | tracked | 4.8 | 23.0 | 5.8 | 3.0 | 8.5 | 9.5 | 5.1 | 1.7 | 0.2 | 0.7 | 0.1 | 15.7 | 15.6 |
| expansive/slide v expansive/rush | opponent | 4.7 | 8.3 | 6.8 | 3.0 | 8.8 | 6.9 | 4.7 | 1.7 | 0.2 | 0.7 | 0.1 | 15.6 | 15.7 |
| expansive/compressed v kick-chase/slide | tracked | 4.6 | 8.1 | 6.4 | 2.7 | 8.6 | 6.7 | 5.0 | 1.7 | 0.2 | 0.7 | 0.1 | 14.0 | 16.0 |
| expansive/compressed v kick-chase/slide | opponent | 2.2 | 8.3 | 7.1 | 3.1 | 9.7 | 9.1 | 5.0 | 2.6 | 0.3 | 1.3 | 0.2 | 16.0 | 14.0 |
| kick-chase/compressed v all-out/slide | tracked | 2.3 | 8.1 | 5.7 | 2.7 | 9.4 | 6.8 | 5.0 | 2.5 | 0.2 | 1.2 | 0.1 | 14.5 | 15.2 |
| kick-chase/compressed v all-out/slide | opponent | 6.4 | 8.4 | 7.5 | 3.0 | 8.4 | 9.4 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 15.2 | 14.5 |

_7 cells in 3438 s._
