# Balance: own style fit narrow sweep

Bracket the acceptance band between tested edges 0.10 and 0.12: compare 0.11 and 0.115 to the same knob-off baselines, 500 seeds in each orientation.

**commit** 8c690d2 · **branch** codex/461-own-style-fit · **started** 2026-11-04T09:12:15.092Z

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
| fit 1.5: Balanced / Slide | 1000 | 88.7% ± 1.0% |
| fit 0.5: Balanced / Slide | 1000 | 14.0% ± 1.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.1 | 10.8 | 13.8 | 5.7 | 8.4 | 9.8 | 3.5 | 30.0 | 14.2 |
| fit 1.5: Balanced / Slide | opponent | 2.9 | 5.9 | 8.4 | 2.7 | 8.1 | 5.0 | 3.5 | 14.2 | 30.0 |
| fit 0.5: Balanced / Slide | tracked | 3.1 | 6.3 | 2.8 | 1.5 | 8.4 | 4.7 | 6.3 | 7.5 | 17.5 |
| fit 0.5: Balanced / Slide | opponent | 4.5 | 11.8 | 5.9 | 3.4 | 8.8 | 9.2 | 6.4 | 17.5 | 7.5 |

## Attack × defence points share — edge 0.115

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — edge 0.115

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| fit 1.5: Balanced / Slide | 1000 | 89.2% ± 1.0% |
| fit 0.5: Balanced / Slide | 1000 | 14.3% ± 1.1% |

## Per-side counts — edge 0.115

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fit 1.5: Balanced / Slide | tracked | 4.1 | 11.0 | 14.0 | 5.6 | 8.4 | 9.9 | 3.5 | 29.9 | 13.9 |
| fit 1.5: Balanced / Slide | opponent | 2.8 | 5.9 | 8.4 | 2.6 | 8.1 | 5.0 | 3.5 | 13.9 | 29.9 |
| fit 0.5: Balanced / Slide | tracked | 3.1 | 6.2 | 2.8 | 1.5 | 8.4 | 4.7 | 6.3 | 7.7 | 17.7 |
| fit 0.5: Balanced / Slide | opponent | 4.5 | 11.8 | 5.9 | 3.5 | 8.7 | 9.2 | 6.4 | 17.7 | 7.7 |

_4 cells in 1677 s._
