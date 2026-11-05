# Balance: 465 fifteen plan round robin / selected full shard 11

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:30:57.783Z

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
| grind/slide v all-out/slide | 1000 | 47.6% ± 1.5% |
| grind/rush v all-out/compressed | 1000 | 51.4% ± 1.5% |
| balanced/slide v expansive/slide | 1000 | 54.1% ± 1.5% |
| balanced/rush v kick-chase/compressed | 1000 | 42.5% ± 1.5% |
| expansive/slide v kick-chase/slide | 1000 | 50.9% ± 1.5% |
| expansive/compressed v kick-chase/compressed | 1000 | 50.9% ± 1.5% |
| kick-chase/compressed v all-out/compressed | 1000 | 53.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v all-out/slide | tracked | 2.7 | 10.3 | 5.8 | 2.9 | 9.5 | 4.3 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 15.0 | 15.9 |
| grind/slide v all-out/slide | opponent | 6.3 | 12.2 | 8.2 | 3.1 | 8.3 | 7.3 | 5.2 | 2.0 | 0.2 | 0.7 | 0.1 | 15.9 | 15.0 |
| grind/rush v all-out/compressed | tracked | 1.6 | 5.6 | 4.8 | 2.8 | 10.1 | 5.3 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 14.6 | 14.8 |
| grind/rush v all-out/compressed | opponent | 6.6 | 22.7 | 6.4 | 2.9 | 8.0 | 10.0 | 6.2 | 1.9 | 0.2 | 0.7 | 0.1 | 14.8 | 14.6 |
| balanced/slide v expansive/slide | tracked | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.5 | 14.8 |
| balanced/slide v expansive/slide | opponent | 4.6 | 8.2 | 6.5 | 2.8 | 8.7 | 6.7 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.8 | 15.5 |
| balanced/rush v kick-chase/compressed | tracked | 3.6 | 8.1 | 7.0 | 3.2 | 8.6 | 9.0 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 16.3 | 18.3 |
| balanced/rush v kick-chase/compressed | opponent | 2.4 | 21.2 | 7.1 | 3.5 | 9.4 | 9.8 | 5.3 | 2.5 | 0.5 | 1.3 | 0.6 | 18.3 | 16.3 |
| expansive/slide v kick-chase/slide | tracked | 4.7 | 8.2 | 6.7 | 2.8 | 8.8 | 7.0 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.5 | 14.3 |
| expansive/slide v kick-chase/slide | opponent | 2.2 | 8.4 | 5.9 | 2.7 | 9.5 | 7.1 | 5.1 | 2.6 | 0.2 | 1.2 | 0.1 | 14.3 | 14.5 |
| expansive/compressed v kick-chase/compressed | tracked | 4.9 | 10.1 | 7.2 | 3.1 | 8.7 | 9.2 | 5.0 | 1.8 | 0.2 | 0.7 | 0.1 | 15.7 | 15.2 |
| expansive/compressed v kick-chase/compressed | opponent | 2.3 | 8.0 | 7.1 | 2.9 | 9.5 | 8.7 | 5.1 | 2.5 | 0.3 | 1.3 | 0.3 | 15.2 | 15.7 |
| kick-chase/compressed v all-out/compressed | tracked | 2.2 | 8.2 | 6.9 | 3.0 | 9.6 | 8.7 | 4.9 | 2.6 | 0.3 | 1.2 | 0.3 | 15.9 | 15.0 |
| kick-chase/compressed v all-out/compressed | opponent | 6.3 | 8.4 | 7.3 | 2.9 | 8.1 | 9.2 | 5.5 | 1.9 | 0.2 | 0.8 | 0.1 | 15.0 | 15.9 |

_7 cells in 4491 s._
