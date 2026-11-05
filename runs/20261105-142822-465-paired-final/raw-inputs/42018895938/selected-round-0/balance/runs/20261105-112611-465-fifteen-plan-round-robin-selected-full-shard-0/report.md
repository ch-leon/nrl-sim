# Balance: 465 fifteen plan round robin / selected full shard 0

All 15 plans, every unordered pairing: 500 consecutive seeds both orientations (1000 matches per cell, 14000 per plan). Defaults enabled; no style may average above 53%.

**commit** 988637f · **branch** issue-465-strategy-counters · **started** 2026-11-05T11:26:11.240Z

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
| grind/slide v grind/rush | 1000 | 44.0% ± 1.5% |
| grind/rush v balanced/slide | 1000 | 56.1% ± 1.5% |
| grind/compressed v expansive/slide | 1000 | 49.2% ± 1.5% |
| balanced/slide v kick-chase/rush | 1000 | 48.3% ± 1.5% |
| balanced/compressed v expansive/slide | 1000 | 47.4% ± 1.5% |
| expansive/slide v all-out/rush | 1000 | 43.7% ± 1.5% |
| kick-chase/slide v kick-chase/rush | 1000 | 63.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v grind/rush | tracked | 2.2 | 22.9 | 4.7 | 2.6 | 9.6 | 5.9 | 4.7 | 1.2 | 0.1 | 1.1 | 0.1 | 13.5 | 15.1 |
| grind/slide v grind/rush | opponent | 3.0 | 10.6 | 6.1 | 2.9 | 9.8 | 4.5 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 15.1 | 13.5 |
| grind/rush v balanced/slide | tracked | 2.9 | 10.4 | 5.9 | 3.0 | 9.7 | 4.5 | 4.6 | 1.2 | 0.1 | 1.2 | 0.2 | 15.6 | 14.3 |
| grind/rush v balanced/slide | opponent | 3.7 | 22.4 | 6.0 | 2.7 | 8.7 | 9.5 | 5.3 | 1.7 | 0.2 | 0.9 | 0.1 | 14.3 | 15.6 |
| grind/compressed v expansive/slide | tracked | 2.9 | 10.3 | 6.0 | 2.8 | 9.6 | 4.3 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 14.8 | 14.9 |
| grind/compressed v expansive/slide | opponent | 4.7 | 10.1 | 7.5 | 2.9 | 8.9 | 9.4 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 14.9 | 14.8 |
| balanced/slide v kick-chase/rush | tracked | 3.9 | 22.1 | 5.8 | 2.9 | 8.6 | 9.3 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 14.8 | 14.7 |
| balanced/slide v kick-chase/rush | opponent | 2.3 | 8.4 | 5.9 | 2.8 | 9.6 | 7.0 | 5.1 | 2.6 | 0.2 | 1.3 | 0.1 | 14.7 | 14.8 |
| balanced/compressed v expansive/slide | tracked | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.0 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.1 | 15.8 |
| balanced/compressed v expansive/slide | opponent | 4.8 | 10.2 | 7.3 | 3.1 | 8.6 | 9.2 | 4.8 | 1.7 | 0.2 | 0.8 | 0.1 | 15.8 | 15.1 |
| expansive/slide v all-out/rush | tracked | 4.9 | 22.4 | 5.8 | 3.1 | 8.3 | 9.5 | 4.8 | 1.6 | 0.2 | 0.8 | 0.1 | 16.0 | 17.8 |
| expansive/slide v all-out/rush | opponent | 6.2 | 12.2 | 8.2 | 3.4 | 8.1 | 7.3 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 17.8 | 16.0 |
| kick-chase/slide v kick-chase/rush | tracked | 2.4 | 21.8 | 7.2 | 3.5 | 9.6 | 9.9 | 5.3 | 2.6 | 0.5 | 1.2 | 0.5 | 18.2 | 14.2 |
| kick-chase/slide v kick-chase/rush | opponent | 2.2 | 8.0 | 5.6 | 2.7 | 9.4 | 6.9 | 5.1 | 2.5 | 0.2 | 1.3 | 0.1 | 14.2 | 18.2 |

_7 cells in 4785 s._
