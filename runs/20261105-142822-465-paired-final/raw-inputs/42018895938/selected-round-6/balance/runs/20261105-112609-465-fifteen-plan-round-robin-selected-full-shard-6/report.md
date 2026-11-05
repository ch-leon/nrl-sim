# Balance: 465 fifteen plan round robin / selected full shard 6

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:09.578Z

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
| grind/slide v expansive/rush | 1000 | 52.4% ± 1.5% |
| grind/rush v kick-chase/slide | 1000 | 43.0% ± 1.5% |
| grind/compressed v all-out/slide | 1000 | 52.8% ± 1.5% |
| balanced/rush v expansive/slide | 1000 | 48.5% ± 1.5% |
| balanced/compressed v all-out/slide | 1000 | 50.7% ± 1.5% |
| expansive/rush v all-out/slide | 1000 | 52.1% ± 1.5% |
| kick-chase/rush v all-out/slide | 1000 | 53.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v expansive/rush | tracked | 2.3 | 22.7 | 4.7 | 2.8 | 9.6 | 5.9 | 4.9 | 1.2 | 0.1 | 1.2 | 0.2 | 14.7 | 14.3 |
| grind/slide v expansive/rush | opponent | 4.7 | 8.3 | 6.9 | 2.8 | 8.8 | 6.8 | 5.0 | 1.8 | 0.2 | 0.8 | 0.1 | 14.3 | 14.7 |
| grind/rush v kick-chase/slide | tracked | 2.9 | 10.1 | 5.6 | 3.0 | 9.5 | 4.2 | 4.7 | 1.3 | 0.1 | 1.2 | 0.2 | 15.5 | 17.8 |
| grind/rush v kick-chase/slide | opponent | 2.3 | 21.9 | 7.4 | 3.4 | 9.5 | 9.9 | 5.3 | 2.6 | 0.5 | 1.1 | 0.5 | 17.8 | 15.5 |
| grind/compressed v all-out/slide | tracked | 2.9 | 10.1 | 5.8 | 2.9 | 9.6 | 4.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 15.2 | 14.4 |
| grind/compressed v all-out/slide | opponent | 6.1 | 8.6 | 7.6 | 2.8 | 8.4 | 9.4 | 5.2 | 2.0 | 0.2 | 0.7 | 0.1 | 14.4 | 15.2 |
| balanced/rush v expansive/slide | tracked | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| balanced/rush v expansive/slide | opponent | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| balanced/compressed v all-out/slide | tracked | 3.5 | 8.4 | 6.8 | 3.0 | 8.7 | 6.9 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 15.6 |
| balanced/compressed v all-out/slide | opponent | 6.2 | 8.6 | 7.4 | 3.0 | 8.2 | 9.3 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 15.6 | 15.4 |
| expansive/rush v all-out/slide | tracked | 4.7 | 8.3 | 6.6 | 3.1 | 8.8 | 6.8 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 15.9 | 14.9 |
| expansive/rush v all-out/slide | opponent | 6.7 | 22.1 | 6.2 | 2.9 | 7.9 | 9.6 | 5.9 | 1.8 | 0.1 | 0.7 | 0.1 | 14.9 | 15.9 |
| kick-chase/rush v all-out/slide | tracked | 2.2 | 8.4 | 6.0 | 3.0 | 9.6 | 7.1 | 5.0 | 2.5 | 0.2 | 1.3 | 0.1 | 15.6 | 14.7 |
| kick-chase/rush v all-out/slide | opponent | 6.6 | 22.2 | 6.1 | 2.8 | 8.0 | 9.8 | 6.0 | 1.8 | 0.2 | 0.7 | 0.1 | 14.7 | 15.6 |

_7 cells in 4797 s._
