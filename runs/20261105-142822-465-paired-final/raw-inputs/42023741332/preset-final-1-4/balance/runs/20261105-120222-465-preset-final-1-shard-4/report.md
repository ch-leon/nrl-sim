# Balance: 465 preset final 1 / shard 4

Full-size affected 39 round-robin pairs plus two signed neutral cells. Retain all 500 consecutive seeds and both orientations.

**commit** 8080964 · **branch** issue-465-strategy-counters · **started** 2026-11-05T12:02:22.129Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 46.9% ± 1.5% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind/rush v kick-chase/rush | 1000 | 41.3% ± 1.5% |
| balanced/slide v kick-chase/compressed | 1000 | 57.0% ± 1.5% |
| expansive/slide v kick-chase/slide | 1000 | 52.9% ± 1.5% |
| expansive/compressed v kick-chase/rush | 1000 | 46.3% ± 1.5% |
| kick-chase/rush v kick-chase/compressed | 1000 | 44.1% ± 1.5% |
| kick-chase v slide | 1000 | 46.9% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/rush v kick-chase/rush | tracked | 2.3 | 22.4 | 4.5 | 2.8 | 9.4 | 5.7 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 14.8 | 17.2 |
| grind/rush v kick-chase/rush | opponent | 2.5 | 21.8 | 7.3 | 3.3 | 9.5 | 10.0 | 5.4 | 2.6 | 0.4 | 1.2 | 0.5 | 17.2 | 14.8 |
| balanced/slide v kick-chase/compressed | tracked | 3.7 | 8.5 | 7.3 | 3.0 | 8.8 | 9.4 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 15.5 | 13.6 |
| balanced/slide v kick-chase/compressed | opponent | 2.2 | 8.0 | 5.9 | 2.6 | 9.2 | 6.9 | 5.2 | 2.4 | 0.2 | 1.2 | 0.1 | 13.6 | 15.5 |
| expansive/slide v kick-chase/slide | tracked | 4.7 | 8.2 | 6.7 | 2.7 | 8.7 | 7.0 | 4.7 | 1.7 | 0.1 | 0.7 | 0.1 | 14.3 | 13.8 |
| expansive/slide v kick-chase/slide | opponent | 2.2 | 8.3 | 6.1 | 2.6 | 9.5 | 6.9 | 5.1 | 2.6 | 0.2 | 1.2 | 0.1 | 13.8 | 14.3 |
| expansive/compressed v kick-chase/rush | tracked | 4.9 | 22.4 | 5.7 | 3.0 | 8.3 | 9.5 | 5.1 | 1.6 | 0.1 | 0.7 | 0.1 | 15.7 | 16.4 |
| expansive/compressed v kick-chase/rush | opponent | 2.3 | 8.0 | 7.5 | 3.2 | 9.6 | 8.9 | 5.3 | 2.6 | 0.3 | 1.3 | 0.3 | 16.4 | 15.7 |
| kick-chase/rush v kick-chase/compressed | tracked | 2.3 | 7.9 | 7.0 | 3.1 | 9.3 | 8.7 | 5.3 | 2.5 | 0.3 | 1.2 | 0.2 | 16.0 | 17.4 |
| kick-chase/rush v kick-chase/compressed | opponent | 2.5 | 20.9 | 7.0 | 3.3 | 9.1 | 9.7 | 5.5 | 2.5 | 0.5 | 1.2 | 0.5 | 17.4 | 16.0 |
| kick-chase v slide | tracked | 2.2 | 8.0 | 6.0 | 2.6 | 9.3 | 6.9 | 5.1 | 2.5 | 0.2 | 1.2 | 0.1 | 13.7 | 14.9 |
| kick-chase v slide | opponent | 3.7 | 8.6 | 7.1 | 2.9 | 8.9 | 7.0 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 14.9 | 13.7 |

_6 cells in 3922 s._
