# Balance: 543-offload-weighting

Compare 1:1 and 2:1 Strength/Handling Offload weights on identical seeds; neutral, generated careers and position-specific strong packs. No other tuning.

**commit** 4bdc770 · **branch** codex/543-offloads-headline-trait · **started** 2026-11-10T15:43:44.795Z

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
| even 60 v 60 | 100 | 41.0% ± 4.8% |
| generated player v rival | 100 | 51.0% ± 4.9% |
| strong forwards Tight | 100 | 48.0% ± 4.8% |
| handling forwards Tight | 100 | 57.0% ± 4.9% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | tracked | 3.6 | 8.4 | 7.0 | 2.8 | 8.3 | 7.3 | 5.1 | 1.4 | 0.1 | 1.0 | 0.1 | 14.4 | 15.9 |
| even 60 v 60 | opponent | 3.8 | 8.7 | 7.4 | 3.0 | 8.8 | 7.2 | 5.2 | 1.6 | 0.2 | 0.9 | 0.2 | 15.9 | 14.4 |
| generated player v rival | tracked | 4.8 | 24.4 | 4.3 | 3.0 | 7.8 | 7.5 | 7.8 | 1.4 | 0.1 | 0.7 | 0.0 | 15.8 | 16.7 |
| generated player v rival | opponent | 5.2 | 9.8 | 4.8 | 3.2 | 8.1 | 6.7 | 7.5 | 1.7 | 0.1 | 0.9 | 0.1 | 16.7 | 15.8 |
| strong forwards Tight | tracked | 4.8 | 11.4 | 5.6 | 2.8 | 8.8 | 3.3 | 5.9 | 1.0 | 0.2 | 1.1 | 0.1 | 14.4 | 15.3 |
| strong forwards Tight | opponent | 3.5 | 8.7 | 7.2 | 2.9 | 8.9 | 5.9 | 5.4 | 1.7 | 0.1 | 0.9 | 0.1 | 15.3 | 14.4 |
| handling forwards Tight | tracked | 3.2 | 9.8 | 6.0 | 3.1 | 9.8 | 5.2 | 3.9 | 1.2 | 0.1 | 1.1 | 0.2 | 16.1 | 14.2 |
| handling forwards Tight | opponent | 4.0 | 9.0 | 7.4 | 2.8 | 8.4 | 8.3 | 5.1 | 1.6 | 0.1 | 0.9 | 0.1 | 14.2 | 16.1 |

_4 cells in 148 s._
