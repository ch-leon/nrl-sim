# Balance: 465 strong pack offloads

Strength-80 pack Tight against each defence, paired dormant/enabled controls; 1000 matches per cell.

**commit** e5cf6c9 · **branch** issue-465-strategy-counters · **started** 2026-11-05T05:07:13.534Z

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
| strong pack Tight v slide | 1000 | 56.8% ± 1.5% |
| strong pack Tight v rush | 1000 | 55.1% ± 1.5% |
| strong pack Tight v compressed | 1000 | 55.5% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| strong pack Tight v slide | tracked | 0.6 | 9.3 | 5.5 | 2.9 | 9.8 | 4.1 | 4.4 | 1.3 | 0.1 | 1.1 | 0.2 | 15.2 | 13.3 |
| strong pack Tight v slide | opponent | 3.5 | 7.9 | 6.5 | 2.6 | 8.9 | 5.6 | 5.2 | 1.7 | 0.2 | 0.9 | 0.1 | 13.3 | 15.2 |
| strong pack Tight v rush | tracked | 0.7 | 23.3 | 4.7 | 2.9 | 9.7 | 5.6 | 4.7 | 1.2 | 0.1 | 1.1 | 0.2 | 15.2 | 13.6 |
| strong pack Tight v rush | opponent | 3.5 | 7.9 | 6.8 | 2.6 | 8.9 | 5.6 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 13.6 | 15.2 |
| strong pack Tight v compressed | tracked | 0.3 | 7.1 | 5.2 | 2.7 | 9.7 | 5.0 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 14.4 | 13.3 |
| strong pack Tight v compressed | opponent | 3.6 | 8.0 | 6.7 | 2.6 | 9.1 | 5.6 | 5.1 | 1.7 | 0.2 | 0.9 | 0.1 | 13.3 | 14.4 |

## Attack × defence points share — enabled defaults

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — enabled defaults

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| strong pack Tight v slide | 1000 | 69.0% ± 1.4% |
| strong pack Tight v rush | 1000 | 63.1% ± 1.5% |
| strong pack Tight v compressed | 1000 | 55.3% ± 1.5% |

## Per-side counts — enabled defaults

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| strong pack Tight v slide | tracked | 12.0 | 14.0 | 7.2 | 3.4 | 9.1 | 4.6 | 4.9 | 1.2 | 0.1 | 1.1 | 0.2 | 17.6 | 13.1 |
| strong pack Tight v slide | opponent | 3.5 | 7.8 | 6.3 | 2.5 | 8.7 | 5.3 | 4.9 | 1.7 | 0.2 | 0.9 | 0.2 | 13.1 | 17.6 |
| strong pack Tight v rush | tracked | 10.6 | 26.1 | 5.6 | 3.3 | 9.3 | 6.2 | 5.0 | 1.1 | 0.1 | 1.1 | 0.2 | 17.2 | 13.8 |
| strong pack Tight v rush | opponent | 3.5 | 7.7 | 6.5 | 2.7 | 8.8 | 5.5 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 13.8 | 17.2 |
| strong pack Tight v compressed | tracked | 9.0 | 5.4 | 5.2 | 2.8 | 9.6 | 5.3 | 4.8 | 1.2 | 0.1 | 1.2 | 0.2 | 14.3 | 13.4 |
| strong pack Tight v compressed | opponent | 3.4 | 7.8 | 6.4 | 2.6 | 8.9 | 5.4 | 5.2 | 1.7 | 0.1 | 0.9 | 0.1 | 13.4 | 14.3 |

_6 cells in 3867 s._
