# Balance: 460 Tight acceptance

Priority 200-seed both-ways acceptance: flat Tight neutral and all five strong-pack attacks on Slide, with Tight enabled.

**commit** 862c9ab · **branch** codex/460-tight · **started** 2026-11-04T06:15:33.699Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 50.1% ± 2.4% | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 400 | 50.1% ± 2.4% |
| strong pack: grind v slide | 400 | 63.7% ± 2.3% |
| strong pack: balanced v slide | 400 | 57.8% ± 2.4% |
| strong pack: expansive v slide | 400 | 63.0% ± 2.3% |
| strong pack: kick-chase v slide | 400 | 60.6% ± 2.4% |
| strong pack: all-out v slide | 400 | 55.6% ± 2.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 2.3 | 8.9 | 5.6 | 2.7 | 9.6 | 4.1 | 4.6 | 14.1 | 14.1 |
| grind v slide | opponent | 3.8 | 9.0 | 7.4 | 2.7 | 8.9 | 7.4 | 5.2 | 14.1 | 14.1 |
| strong pack: grind v slide | tracked | 10.9 | 10.1 | 6.3 | 3.1 | 9.3 | 4.5 | 4.9 | 16.3 | 12.7 |
| strong pack: grind v slide | opponent | 3.4 | 7.7 | 6.4 | 2.5 | 8.7 | 5.5 | 5.2 | 12.7 | 16.3 |
| strong pack: balanced v slide | tracked | 3.9 | 9.1 | 7.3 | 3.0 | 8.9 | 6.8 | 5.1 | 15.9 | 13.8 |
| strong pack: balanced v slide | opponent | 3.5 | 7.8 | 6.5 | 2.7 | 8.7 | 5.5 | 5.1 | 13.8 | 15.9 |
| strong pack: expansive v slide | tracked | 5.1 | 9.6 | 7.0 | 3.1 | 8.7 | 7.0 | 5.0 | 16.0 | 13.1 |
| strong pack: expansive v slide | opponent | 3.4 | 7.5 | 6.3 | 2.5 | 8.5 | 5.3 | 5.2 | 13.1 | 16.0 |
| strong pack: kick-chase v slide | tracked | 2.5 | 8.9 | 6.7 | 3.1 | 9.8 | 6.7 | 4.9 | 16.1 | 13.7 |
| strong pack: kick-chase v slide | opponent | 3.6 | 8.0 | 6.3 | 2.6 | 8.7 | 5.5 | 5.2 | 13.7 | 16.1 |
| strong pack: all-out v slide | tracked | 6.5 | 9.3 | 7.5 | 3.1 | 8.0 | 6.6 | 5.3 | 15.8 | 14.3 |
| strong pack: all-out v slide | opponent | 3.6 | 7.7 | 6.6 | 2.8 | 8.6 | 5.3 | 4.9 | 14.3 | 15.8 |

_6 cells in 1731 s._
