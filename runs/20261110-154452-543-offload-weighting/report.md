# Balance: 543-offload-weighting

Compare 1:1 and 2:1 Strength/Handling Offload weights on identical seeds; neutral, generated careers and position-specific strong packs. No other tuning.

**commit** 4bdc770 (uncommitted changes) · **branch** codex/543-offloads-headline-trait · **started** 2026-11-10T15:44:52.638Z

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
| generated player v rival | 100 | 50.5% ± 4.9% |
| strong forwards Tight | 100 | 41.0% ± 4.7% |
| handling forwards Tight | 100 | 57.5% ± 4.9% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | tracked | 3.6 | 8.4 | 7.0 | 2.8 | 8.3 | 7.3 | 5.1 | 1.4 | 0.1 | 1.0 | 0.1 | 14.4 | 15.9 |
| even 60 v 60 | opponent | 3.8 | 8.7 | 7.4 | 3.0 | 8.8 | 7.2 | 5.2 | 1.6 | 0.2 | 0.9 | 0.2 | 15.9 | 14.4 |
| generated player v rival | tracked | 4.8 | 24.5 | 4.2 | 3.0 | 7.8 | 7.5 | 7.8 | 1.4 | 0.1 | 0.7 | 0.0 | 15.6 | 16.6 |
| generated player v rival | opponent | 5.1 | 9.8 | 4.8 | 3.2 | 8.1 | 6.7 | 7.6 | 1.7 | 0.1 | 0.9 | 0.1 | 16.6 | 15.6 |
| strong forwards Tight | tracked | 6.0 | 10.7 | 5.5 | 2.8 | 9.0 | 3.3 | 5.9 | 1.1 | 0.1 | 1.0 | 0.1 | 14.3 | 16.3 |
| strong forwards Tight | opponent | 3.6 | 8.7 | 7.4 | 3.1 | 9.1 | 6.5 | 5.5 | 1.6 | 0.1 | 0.9 | 0.1 | 16.3 | 14.3 |
| handling forwards Tight | tracked | 2.9 | 9.8 | 5.5 | 3.0 | 9.9 | 5.2 | 4.0 | 1.2 | 0.1 | 1.0 | 0.2 | 16.2 | 14.6 |
| handling forwards Tight | opponent | 3.9 | 9.0 | 7.6 | 2.8 | 8.4 | 8.5 | 5.2 | 1.6 | 0.1 | 1.0 | 0.1 | 14.6 | 16.2 |

_4 cells in 219 s._
