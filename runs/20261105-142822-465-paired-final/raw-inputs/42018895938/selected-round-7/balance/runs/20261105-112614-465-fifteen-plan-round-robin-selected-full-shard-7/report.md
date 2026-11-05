# Balance: 465 fifteen plan round robin / selected full shard 7

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:14.868Z

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
| grind/slide v expansive/compressed | 1000 | 44.4% ± 1.5% |
| grind/rush v kick-chase/rush | 1000 | 40.0% ± 1.5% |
| grind/compressed v all-out/rush | 1000 | 47.3% ± 1.5% |
| balanced/rush v expansive/rush | 1000 | 46.0% ± 1.5% |
| balanced/compressed v all-out/rush | 1000 | 45.4% ± 1.5% |
| expansive/rush v all-out/rush | 1000 | 58.1% ± 1.5% |
| kick-chase/rush v all-out/rush | 1000 | 62.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v expansive/compressed | tracked | 1.6 | 5.6 | 4.6 | 2.6 | 10.1 | 5.1 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 13.2 | 14.1 |
| grind/slide v expansive/compressed | opponent | 4.7 | 8.5 | 6.9 | 2.7 | 9.0 | 7.0 | 5.1 | 1.8 | 0.2 | 0.8 | 0.1 | 14.1 | 13.2 |
| grind/rush v kick-chase/rush | tracked | 2.2 | 22.6 | 4.5 | 2.9 | 9.4 | 5.7 | 4.8 | 1.2 | 0.1 | 1.1 | 0.2 | 15.1 | 17.8 |
| grind/rush v kick-chase/rush | opponent | 2.4 | 21.9 | 7.4 | 3.4 | 9.7 | 9.8 | 5.5 | 2.7 | 0.5 | 1.3 | 0.5 | 17.8 | 15.1 |
| grind/compressed v all-out/rush | tracked | 2.2 | 22.4 | 4.6 | 2.7 | 9.5 | 5.8 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 14.3 | 15.1 |
| grind/compressed v all-out/rush | opponent | 6.2 | 8.9 | 7.9 | 2.9 | 8.3 | 9.7 | 5.4 | 2.0 | 0.2 | 0.8 | 0.1 | 15.1 | 14.3 |
| balanced/rush v expansive/rush | tracked | 3.8 | 22.0 | 5.9 | 3.0 | 8.5 | 9.5 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 15.9 | 16.6 |
| balanced/rush v expansive/rush | opponent | 4.9 | 22.9 | 6.0 | 3.2 | 8.5 | 9.8 | 5.0 | 1.6 | 0.1 | 0.8 | 0.1 | 16.6 | 15.9 |
| balanced/compressed v all-out/rush | tracked | 3.7 | 21.9 | 5.8 | 2.9 | 8.4 | 9.2 | 5.0 | 1.6 | 0.1 | 0.9 | 0.1 | 15.0 | 16.0 |
| balanced/compressed v all-out/rush | opponent | 6.2 | 8.6 | 7.5 | 3.1 | 8.2 | 9.3 | 5.1 | 1.9 | 0.2 | 0.8 | 0.1 | 16.0 | 15.0 |
| expansive/rush v all-out/rush | tracked | 5.0 | 23.4 | 6.1 | 3.5 | 8.6 | 10.0 | 5.0 | 1.7 | 0.2 | 0.8 | 0.1 | 17.9 | 15.6 |
| expansive/rush v all-out/rush | opponent | 6.5 | 22.0 | 6.1 | 3.0 | 7.8 | 9.5 | 5.9 | 1.8 | 0.2 | 0.7 | 0.1 | 15.6 | 17.9 |
| kick-chase/rush v all-out/rush | tracked | 2.4 | 22.0 | 7.3 | 3.8 | 9.4 | 9.9 | 5.3 | 2.5 | 0.5 | 1.3 | 0.5 | 19.7 | 15.6 |
| kick-chase/rush v all-out/rush | opponent | 6.5 | 21.7 | 5.8 | 3.0 | 7.6 | 9.4 | 5.9 | 1.7 | 0.2 | 0.7 | 0.1 | 15.6 | 19.7 |

_7 cells in 4842 s._
