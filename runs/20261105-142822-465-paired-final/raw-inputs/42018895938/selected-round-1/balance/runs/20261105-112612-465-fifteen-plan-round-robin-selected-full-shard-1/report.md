# Balance: 465 fifteen plan round robin / selected full shard 1

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:12.453Z

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
| grind/slide v grind/compressed | 1000 | 38.0% ± 1.5% |
| grind/rush v balanced/rush | 1000 | 53.6% ± 1.5% |
| grind/compressed v expansive/rush | 1000 | 44.4% ± 1.5% |
| balanced/slide v kick-chase/compressed | 1000 | 57.7% ± 1.5% |
| balanced/compressed v expansive/rush | 1000 | 43.0% ± 1.5% |
| expansive/slide v all-out/compressed | 1000 | 46.4% ± 1.5% |
| kick-chase/slide v kick-chase/compressed | 1000 | 55.9% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v grind/compressed | tracked | 1.6 | 5.6 | 4.6 | 2.3 | 10.3 | 5.1 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 11.5 | 14.4 |
| grind/slide v grind/compressed | opponent | 2.9 | 10.7 | 6.1 | 2.8 | 10.0 | 4.5 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 14.4 | 11.5 |
| grind/rush v balanced/rush | tracked | 2.3 | 23.1 | 4.8 | 3.0 | 9.6 | 6.0 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 15.4 | 14.7 |
| grind/rush v balanced/rush | opponent | 3.8 | 22.4 | 6.1 | 2.8 | 8.5 | 9.6 | 5.4 | 1.7 | 0.2 | 0.9 | 0.1 | 14.7 | 15.4 |
| grind/compressed v expansive/rush | tracked | 2.2 | 22.3 | 4.7 | 2.7 | 9.7 | 5.9 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.0 | 15.3 |
| grind/compressed v expansive/rush | opponent | 4.8 | 10.4 | 7.7 | 3.0 | 8.9 | 9.5 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 15.3 | 14.0 |
| balanced/slide v kick-chase/compressed | tracked | 3.6 | 8.5 | 7.3 | 3.0 | 8.9 | 9.4 | 5.0 | 1.7 | 0.2 | 1.0 | 0.1 | 15.6 | 13.6 |
| balanced/slide v kick-chase/compressed | opponent | 2.2 | 8.2 | 5.7 | 2.6 | 9.4 | 6.9 | 5.1 | 2.6 | 0.2 | 1.2 | 0.1 | 13.6 | 15.6 |
| balanced/compressed v expansive/rush | tracked | 3.6 | 21.8 | 5.9 | 2.9 | 8.4 | 9.3 | 5.2 | 1.5 | 0.1 | 0.9 | 0.2 | 15.1 | 17.0 |
| balanced/compressed v expansive/rush | opponent | 4.9 | 10.0 | 7.3 | 3.3 | 8.8 | 9.2 | 5.0 | 1.8 | 0.2 | 0.8 | 0.1 | 17.0 | 15.1 |
| expansive/slide v all-out/compressed | tracked | 4.7 | 10.0 | 7.1 | 3.1 | 8.7 | 9.1 | 4.7 | 1.7 | 0.2 | 0.7 | 0.1 | 16.1 | 16.8 |
| expansive/slide v all-out/compressed | opponent | 6.2 | 11.9 | 8.1 | 3.3 | 8.1 | 7.3 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 16.8 | 16.1 |
| kick-chase/slide v kick-chase/compressed | tracked | 2.3 | 8.4 | 7.1 | 2.9 | 9.7 | 9.2 | 5.0 | 2.7 | 0.3 | 1.3 | 0.2 | 15.3 | 13.7 |
| kick-chase/slide v kick-chase/compressed | opponent | 2.2 | 8.3 | 5.5 | 2.6 | 9.6 | 6.8 | 5.2 | 2.6 | 0.2 | 1.2 | 0.1 | 13.7 | 15.3 |

_7 cells in 4785 s._
