# Balance: 465 preset final 1 / shard 3

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:02:19.840Z

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
| grind/rush v kick-chase/slide | 1000 | 47.1% ± 1.5% |
| balanced/slide v kick-chase/rush | 1000 | 48.4% ± 1.5% |
| balanced/compressed v kick-chase/compressed | 1000 | 49.5% ± 1.5% |
| expansive/compressed v kick-chase/slide | 1000 | 47.4% ± 1.5% |
| kick-chase/slide v all-out/compressed | 1000 | 46.2% ± 1.5% |
| kick-chase/compressed v all-out/compressed | 1000 | 52.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/slide | tracked | 2.9 | 10.2 | 5.7 | 3.0 | 9.3 | 4.2 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 15.9 | 17.2 |
| grind/rush v kick-chase/slide | opponent | 2.4 | 21.6 | 7.3 | 3.3 | 9.5 | 9.8 | 5.5 | 2.6 | 0.5 | 1.2 | 0.5 | 17.2 | 15.9 |
| balanced/slide v kick-chase/rush | tracked | 3.9 | 21.9 | 5.8 | 2.9 | 8.6 | 9.2 | 5.2 | 1.6 | 0.1 | 0.9 | 0.1 | 14.8 | 15.0 |
| balanced/slide v kick-chase/rush | opponent | 2.3 | 8.2 | 6.1 | 2.9 | 9.4 | 7.1 | 5.2 | 2.5 | 0.2 | 1.3 | 0.1 | 15.0 | 14.8 |
| balanced/compressed v kick-chase/compressed | tracked | 3.7 | 8.3 | 7.0 | 2.8 | 8.6 | 8.9 | 5.3 | 1.6 | 0.2 | 0.9 | 0.1 | 14.6 | 14.8 |
| balanced/compressed v kick-chase/compressed | opponent | 2.3 | 8.1 | 7.0 | 2.8 | 9.6 | 8.6 | 5.1 | 2.6 | 0.3 | 1.3 | 0.3 | 14.8 | 14.6 |
| expansive/compressed v kick-chase/slide | tracked | 4.6 | 8.2 | 6.5 | 2.8 | 8.7 | 6.9 | 4.8 | 1.8 | 0.2 | 0.7 | 0.1 | 14.4 | 15.3 |
| expansive/compressed v kick-chase/slide | opponent | 2.3 | 8.1 | 7.2 | 2.9 | 9.5 | 8.8 | 5.3 | 2.6 | 0.3 | 1.3 | 0.2 | 15.3 | 14.4 |
| kick-chase/slide v all-out/compressed | tracked | 2.2 | 7.9 | 7.0 | 3.0 | 9.3 | 8.7 | 5.1 | 2.5 | 0.3 | 1.3 | 0.3 | 15.9 | 16.9 |
| kick-chase/slide v all-out/compressed | opponent | 6.3 | 11.9 | 7.9 | 3.3 | 8.1 | 7.2 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 16.9 | 15.9 |
| kick-chase/compressed v all-out/compressed | tracked | 2.3 | 7.9 | 7.1 | 3.0 | 9.4 | 8.8 | 5.2 | 2.5 | 0.3 | 1.3 | 0.3 | 15.6 | 15.2 |
| kick-chase/compressed v all-out/compressed | opponent | 6.2 | 8.5 | 7.3 | 2.9 | 8.2 | 9.2 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 15.2 | 15.6 |

_6 cells in 2771 s._
