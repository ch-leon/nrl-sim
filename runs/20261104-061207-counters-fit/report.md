# Balance: counters fit

Squad-fit baseline: fast backs (speed 80), strong pack (strength 80), smart opposing defence (footy IQ 75), plus Rush/Compressed rows and 500-seed 62/65 v 60 yardsticks. Includes the flat 60 matrix as a control. Compares dormant defaults with the pack-fit Tight offload rebuild.

**commit** 30cd19e · **branch** codex/460-tight · **started** 2026-11-04T06:12:08.015Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 47.3% ± 2.4% | 46.0% ± 2.4% | 46.3% ± 2.4% |
| Balanced | 50.0% ± 2.4% | 47.1% ± 2.4% | 44.6% ± 2.4% |
| Expansive | 46.6% ± 2.4% | 51.7% ± 2.4% | 47.1% ± 2.4% |
| Kick-chase | 50.9% ± 2.4% | 53.5% ± 2.4% | 50.4% ± 2.4% |
| All-out | 52.5% ± 2.4% | 47.6% ± 2.4% | 48.8% ± 2.4% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 400 | 47.3% ± 2.4% |
| grind v rush | 400 | 46.0% ± 2.4% |
| grind v compressed | 400 | 46.3% ± 2.4% |
| balanced v slide | 400 | 50.0% ± 2.4% |
| balanced v rush | 400 | 47.1% ± 2.4% |
| balanced v compressed | 400 | 44.6% ± 2.4% |
| expansive v slide | 400 | 46.6% ± 2.4% |
| expansive v rush | 400 | 51.7% ± 2.4% |
| expansive v compressed | 400 | 47.1% ± 2.4% |
| kick-chase v slide | 400 | 50.9% ± 2.4% |
| kick-chase v rush | 400 | 53.5% ± 2.4% |
| kick-chase v compressed | 400 | 50.4% ± 2.4% |
| all-out v slide | 400 | 52.5% ± 2.4% |
| all-out v rush | 400 | 47.6% ± 2.4% |
| all-out v compressed | 400 | 48.8% ± 2.4% |
| fast backs: grind v slide | 400 | 43.4% ± 2.4% |
| fast backs: balanced v slide | 400 | 46.8% ± 2.4% |
| fast backs: expansive v slide | 400 | 56.8% ± 2.4% |
| fast backs: kick-chase v slide | 400 | 50.4% ± 2.5% |
| fast backs: all-out v slide | 400 | 46.8% ± 2.4% |
| strong pack: grind v slide | 400 | 55.9% ± 2.4% |
| strong pack: balanced v slide | 400 | 57.8% ± 2.4% |
| strong pack: expansive v slide | 400 | 63.0% ± 2.3% |
| strong pack: kick-chase v slide | 400 | 60.6% ± 2.4% |
| strong pack: all-out v slide | 400 | 55.6% ± 2.4% |
| smart D: grind v slide | 400 | 50.9% ± 2.4% |
| smart D: balanced v slide | 400 | 48.0% ± 2.4% |
| smart D: expansive v slide | 400 | 50.2% ± 2.4% |
| smart D: kick-chase v slide | 400 | 54.3% ± 2.4% |
| smart D: all-out v slide | 400 | 50.5% ± 2.4% |
| fast backs: expansive v rush | 400 | 50.6% ± 2.4% |
| strong pack: grind v rush | 400 | 53.1% ± 2.4% |
| strong pack: balanced v rush | 400 | 50.9% ± 2.4% |
| strong pack: expansive v rush | 400 | 58.3% ± 2.4% |
| strong pack: kick-chase v rush | 400 | 58.6% ± 2.4% |
| strong pack: all-out v rush | 400 | 50.4% ± 2.4% |
| fast backs: expansive v compressed | 400 | 53.4% ± 2.4% |
| strong pack: grind v compressed | 400 | 54.3% ± 2.4% |
| strong pack: balanced v compressed | 400 | 55.6% ± 2.4% |
| strong pack: expansive v compressed | 400 | 53.8% ± 2.4% |
| strong pack: kick-chase v compressed | 400 | 58.1% ± 2.4% |
| strong pack: all-out v compressed | 400 | 55.3% ± 2.4% |
| yardstick 62 v 60 | 1000 | 55.0% ± 1.5% |
| yardstick 65 v 60 | 1000 | 56.9% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 0.6 | 8.5 | 5.3 | 2.8 | 9.7 | 4.1 | 4.4 | 14.4 | 14.7 |
| grind v slide | opponent | 3.8 | 9.1 | 7.4 | 2.8 | 8.9 | 7.3 | 5.2 | 14.7 | 14.4 |
| grind v rush | tracked | 0.6 | 22.7 | 4.6 | 2.7 | 9.3 | 5.9 | 4.8 | 14.3 | 15.1 |
| grind v rush | opponent | 3.7 | 8.8 | 7.4 | 2.9 | 8.9 | 7.4 | 5.3 | 15.1 | 14.3 |
| grind v compressed | tracked | 0.3 | 6.3 | 4.9 | 2.6 | 9.8 | 5.6 | 4.5 | 13.6 | 14.4 |
| grind v compressed | opponent | 3.6 | 8.8 | 7.3 | 2.8 | 8.7 | 7.2 | 5.4 | 14.4 | 13.6 |
| balanced v slide | tracked | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v slide | opponent | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v rush | tracked | 3.7 | 21.8 | 5.8 | 3.0 | 8.6 | 9.6 | 5.1 | 15.3 | 15.8 |
| balanced v rush | opponent | 3.8 | 8.6 | 7.3 | 3.1 | 8.7 | 7.2 | 5.0 | 15.8 | 15.3 |
| balanced v compressed | tracked | 2.4 | 6.2 | 6.3 | 2.8 | 8.9 | 8.6 | 5.2 | 14.3 | 15.4 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.5 | 7.1 | 5.2 | 15.4 | 14.3 |
| expansive v slide | tracked | 4.6 | 9.1 | 6.9 | 2.9 | 8.5 | 6.9 | 5.1 | 15.1 | 16.0 |
| expansive v slide | opponent | 3.7 | 8.5 | 7.1 | 3.1 | 8.8 | 7.0 | 5.3 | 16.0 | 15.1 |
| expansive v rush | tracked | 4.9 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 5.0 | 16.4 | 15.5 |
| expansive v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.6 | 7.2 | 5.1 | 15.5 | 16.4 |
| expansive v compressed | tracked | 3.5 | 6.7 | 6.2 | 2.9 | 8.7 | 8.6 | 4.7 | 14.7 | 15.1 |
| expansive v compressed | opponent | 3.7 | 8.3 | 7.0 | 2.9 | 8.7 | 7.1 | 5.3 | 15.1 | 14.7 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 6.7 | 2.9 | 9.8 | 6.9 | 5.0 | 15.1 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.9 | 6.9 | 5.3 | 14.5 | 15.1 |
| kick-chase v rush | tracked | 2.1 | 21.9 | 5.7 | 3.0 | 9.7 | 9.3 | 5.1 | 15.9 | 14.9 |
| kick-chase v rush | opponent | 3.9 | 8.7 | 7.1 | 2.9 | 8.7 | 7.0 | 5.4 | 14.9 | 15.9 |
| kick-chase v compressed | tracked | 1.0 | 6.4 | 6.3 | 2.9 | 10.0 | 8.9 | 4.8 | 15.0 | 14.3 |
| kick-chase v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.8 | 8.8 | 7.2 | 5.2 | 14.3 | 15.0 |
| all-out v slide | tracked | 6.2 | 8.9 | 7.3 | 3.1 | 8.2 | 7.3 | 5.3 | 15.9 | 15.6 |
| all-out v slide | opponent | 3.5 | 8.4 | 7.1 | 3.0 | 8.5 | 7.0 | 5.0 | 15.6 | 15.9 |
| all-out v rush | tracked | 6.6 | 22.3 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 15.7 | 16.5 |
| all-out v rush | opponent | 3.6 | 8.6 | 7.1 | 3.2 | 8.6 | 7.0 | 5.0 | 16.5 | 15.7 |
| all-out v compressed | tracked | 4.9 | 6.5 | 6.9 | 2.9 | 8.5 | 9.2 | 5.2 | 15.2 | 15.6 |
| all-out v compressed | opponent | 3.6 | 8.2 | 7.0 | 3.0 | 8.7 | 7.0 | 5.1 | 15.6 | 15.2 |
| fast backs: grind v slide | tracked | 0.5 | 8.1 | 6.0 | 2.8 | 9.6 | 4.2 | 4.6 | 14.7 | 16.3 |
| fast backs: grind v slide | opponent | 3.9 | 9.3 | 8.2 | 3.1 | 8.9 | 8.1 | 5.3 | 16.3 | 14.7 |
| fast backs: balanced v slide | tracked | 3.4 | 8.1 | 8.0 | 3.2 | 8.4 | 7.1 | 5.2 | 16.7 | 17.5 |
| fast backs: balanced v slide | opponent | 3.7 | 8.9 | 7.9 | 3.3 | 8.5 | 7.9 | 5.1 | 17.5 | 16.7 |
| fast backs: expansive v slide | tracked | 4.5 | 8.8 | 7.8 | 3.4 | 8.5 | 7.5 | 4.7 | 17.3 | 16.1 |
| fast backs: expansive v slide | opponent | 3.6 | 9.1 | 7.9 | 3.1 | 8.4 | 7.7 | 5.1 | 16.1 | 17.3 |
| fast backs: kick-chase v slide | tracked | 2.1 | 8.0 | 7.6 | 3.2 | 9.5 | 6.8 | 5.0 | 16.3 | 16.2 |
| fast backs: kick-chase v slide | opponent | 3.7 | 8.8 | 7.9 | 3.1 | 8.9 | 7.5 | 5.3 | 16.2 | 16.3 |
| fast backs: all-out v slide | tracked | 5.9 | 8.5 | 8.0 | 3.2 | 8.0 | 7.1 | 5.4 | 16.6 | 17.6 |
| fast backs: all-out v slide | opponent | 3.7 | 8.9 | 7.8 | 3.3 | 8.5 | 7.9 | 5.2 | 17.6 | 16.6 |
| strong pack: grind v slide | tracked | 0.7 | 9.4 | 5.6 | 3.0 | 9.8 | 4.2 | 4.6 | 15.6 | 13.7 |
| strong pack: grind v slide | opponent | 3.6 | 8.0 | 6.4 | 2.6 | 8.9 | 5.6 | 5.2 | 13.7 | 15.6 |
| strong pack: balanced v slide | tracked | 3.9 | 9.1 | 7.3 | 3.0 | 8.9 | 6.8 | 5.1 | 15.9 | 13.8 |
| strong pack: balanced v slide | opponent | 3.5 | 7.8 | 6.5 | 2.7 | 8.7 | 5.5 | 5.1 | 13.8 | 15.9 |
| strong pack: expansive v slide | tracked | 5.1 | 9.6 | 7.0 | 3.1 | 8.7 | 7.0 | 5.0 | 16.0 | 13.1 |
| strong pack: expansive v slide | opponent | 3.4 | 7.5 | 6.3 | 2.5 | 8.5 | 5.3 | 5.2 | 13.1 | 16.0 |
| strong pack: kick-chase v slide | tracked | 2.5 | 8.9 | 6.7 | 3.1 | 9.8 | 6.7 | 4.9 | 16.1 | 13.7 |
| strong pack: kick-chase v slide | opponent | 3.6 | 8.0 | 6.3 | 2.6 | 8.7 | 5.5 | 5.2 | 13.7 | 16.1 |
| strong pack: all-out v slide | tracked | 6.5 | 9.3 | 7.5 | 3.1 | 8.0 | 6.6 | 5.3 | 15.8 | 14.3 |
| strong pack: all-out v slide | opponent | 3.6 | 7.7 | 6.6 | 2.8 | 8.6 | 5.3 | 4.9 | 14.3 | 15.8 |
| smart D: grind v slide | tracked | 0.5 | 8.2 | 5.2 | 2.6 | 9.8 | 3.3 | 4.5 | 13.7 | 13.4 |
| smart D: grind v slide | opponent | 3.9 | 8.5 | 7.0 | 2.6 | 8.6 | 6.1 | 5.3 | 13.4 | 13.7 |
| smart D: balanced v slide | tracked | 3.5 | 7.9 | 6.6 | 2.8 | 8.8 | 5.2 | 5.2 | 14.3 | 15.0 |
| smart D: balanced v slide | opponent | 3.6 | 8.6 | 6.8 | 2.9 | 8.6 | 6.1 | 5.2 | 15.0 | 14.3 |
| smart D: expansive v slide | tracked | 4.6 | 8.7 | 6.3 | 2.8 | 8.7 | 5.3 | 4.8 | 14.7 | 14.7 |
| smart D: expansive v slide | opponent | 3.5 | 8.1 | 6.8 | 2.8 | 8.7 | 6.1 | 5.1 | 14.7 | 14.7 |
| smart D: kick-chase v slide | tracked | 2.1 | 8.4 | 6.5 | 2.9 | 10.1 | 5.4 | 4.7 | 15.0 | 13.2 |
| smart D: kick-chase v slide | opponent | 3.9 | 8.0 | 6.5 | 2.6 | 8.8 | 6.1 | 5.4 | 13.2 | 15.0 |
| smart D: all-out v slide | tracked | 6.2 | 8.6 | 7.0 | 2.9 | 8.3 | 5.6 | 5.4 | 14.8 | 15.1 |
| smart D: all-out v slide | opponent | 3.6 | 8.3 | 6.8 | 2.9 | 8.6 | 6.0 | 5.2 | 15.1 | 14.8 |
| fast backs: expansive v rush | tracked | 4.7 | 22.4 | 6.4 | 3.5 | 8.4 | 9.8 | 4.9 | 18.0 | 18.2 |
| fast backs: expansive v rush | opponent | 3.7 | 9.0 | 7.9 | 3.5 | 8.6 | 7.8 | 5.1 | 18.2 | 18.0 |
| strong pack: grind v rush | tracked | 0.7 | 23.3 | 4.8 | 2.9 | 9.6 | 5.7 | 4.9 | 15.3 | 14.0 |
| strong pack: grind v rush | opponent | 3.5 | 7.9 | 6.9 | 2.7 | 8.9 | 5.7 | 5.2 | 14.0 | 15.3 |
| strong pack: balanced v rush | tracked | 4.0 | 22.5 | 5.9 | 3.1 | 8.5 | 8.9 | 5.3 | 16.2 | 15.4 |
| strong pack: balanced v rush | opponent | 3.5 | 7.9 | 6.6 | 3.0 | 8.8 | 5.7 | 5.0 | 15.4 | 16.2 |
| strong pack: expansive v rush | tracked | 5.0 | 24.0 | 5.9 | 3.1 | 8.6 | 9.2 | 5.1 | 16.1 | 14.6 |
| strong pack: expansive v rush | opponent | 3.5 | 7.9 | 6.4 | 2.8 | 8.7 | 5.5 | 5.2 | 14.6 | 16.1 |
| strong pack: kick-chase v rush | tracked | 2.2 | 22.7 | 5.8 | 3.1 | 9.7 | 8.6 | 5.1 | 15.9 | 14.2 |
| strong pack: kick-chase v rush | opponent | 3.5 | 7.9 | 6.5 | 2.7 | 8.8 | 5.5 | 5.2 | 14.2 | 15.9 |
| strong pack: all-out v rush | tracked | 6.9 | 23.2 | 6.2 | 3.1 | 8.0 | 9.3 | 5.3 | 16.1 | 15.4 |
| strong pack: all-out v rush | opponent | 3.5 | 8.2 | 6.7 | 3.0 | 8.5 | 5.4 | 5.1 | 15.4 | 16.1 |
| fast backs: expansive v compressed | tracked | 3.5 | 6.4 | 7.3 | 3.4 | 8.7 | 9.6 | 4.7 | 17.3 | 16.4 |
| fast backs: expansive v compressed | opponent | 3.5 | 8.7 | 7.7 | 3.1 | 8.5 | 7.7 | 5.2 | 16.4 | 17.3 |
| strong pack: grind v compressed | tracked | 0.3 | 7.0 | 5.0 | 2.7 | 9.8 | 5.1 | 4.7 | 14.4 | 13.6 |
| strong pack: grind v compressed | opponent | 3.6 | 8.1 | 6.6 | 2.6 | 9.1 | 5.6 | 5.1 | 13.6 | 14.4 |
| strong pack: balanced v compressed | tracked | 2.7 | 6.8 | 6.7 | 3.0 | 8.6 | 8.8 | 5.1 | 15.5 | 13.8 |
| strong pack: balanced v compressed | opponent | 3.5 | 7.7 | 6.3 | 2.7 | 8.5 | 5.7 | 5.2 | 13.8 | 15.5 |
| strong pack: expansive v compressed | tracked | 3.7 | 6.8 | 6.5 | 3.0 | 8.8 | 8.8 | 4.8 | 15.3 | 14.2 |
| strong pack: expansive v compressed | opponent | 3.6 | 7.8 | 6.6 | 2.7 | 8.7 | 5.7 | 5.1 | 14.2 | 15.3 |
| strong pack: kick-chase v compressed | tracked | 1.2 | 6.8 | 6.3 | 3.0 | 9.9 | 8.3 | 5.1 | 15.8 | 13.6 |
| strong pack: kick-chase v compressed | opponent | 3.4 | 7.8 | 6.2 | 2.6 | 8.7 | 5.7 | 5.5 | 13.6 | 15.8 |
| strong pack: all-out v compressed | tracked | 4.9 | 7.1 | 7.1 | 2.9 | 8.5 | 8.7 | 5.4 | 15.2 | 14.2 |
| strong pack: all-out v compressed | opponent | 3.6 | 7.7 | 6.2 | 2.7 | 8.6 | 5.7 | 5.0 | 14.2 | 15.2 |
| yardstick 62 v 60 | tracked | 3.6 | 8.6 | 7.5 | 3.1 | 8.7 | 7.1 | 5.0 | 16.0 | 14.9 |
| yardstick 62 v 60 | opponent | 3.5 | 8.4 | 7.1 | 2.9 | 8.6 | 6.7 | 4.9 | 14.9 | 16.0 |
| yardstick 65 v 60 | tracked | 3.6 | 9.0 | 8.0 | 3.2 | 8.7 | 7.3 | 4.8 | 16.8 | 14.8 |
| yardstick 65 v 60 | opponent | 3.6 | 8.2 | 7.4 | 2.9 | 8.6 | 6.5 | 4.7 | 14.8 | 16.8 |

## Attack × defence points share — Tight on

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 50.1% ± 2.4% | 46.5% ± 2.4% | 48.1% ± 2.4% |
| Balanced | 50.0% ± 2.4% | 47.1% ± 2.4% | 44.6% ± 2.4% |
| Expansive | 46.6% ± 2.4% | 51.7% ± 2.4% | 47.1% ± 2.4% |
| Kick-chase | 50.9% ± 2.4% | 53.5% ± 2.4% | 50.4% ± 2.4% |
| All-out | 52.5% ± 2.4% | 47.6% ± 2.4% | 48.8% ± 2.4% |

## Tracked-side rows — Tight on

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 400 | 50.1% ± 2.4% |
| grind v rush | 400 | 46.5% ± 2.4% |
| grind v compressed | 400 | 48.1% ± 2.4% |
| balanced v slide | 400 | 50.0% ± 2.4% |
| balanced v rush | 400 | 47.1% ± 2.4% |
| balanced v compressed | 400 | 44.6% ± 2.4% |
| expansive v slide | 400 | 46.6% ± 2.4% |
| expansive v rush | 400 | 51.7% ± 2.4% |
| expansive v compressed | 400 | 47.1% ± 2.4% |
| kick-chase v slide | 400 | 50.9% ± 2.4% |
| kick-chase v rush | 400 | 53.5% ± 2.4% |
| kick-chase v compressed | 400 | 50.4% ± 2.4% |
| all-out v slide | 400 | 52.5% ± 2.4% |
| all-out v rush | 400 | 47.6% ± 2.4% |
| all-out v compressed | 400 | 48.8% ± 2.4% |
| fast backs: grind v slide | 400 | 45.3% ± 2.4% |
| fast backs: balanced v slide | 400 | 46.8% ± 2.4% |
| fast backs: expansive v slide | 400 | 56.8% ± 2.4% |
| fast backs: kick-chase v slide | 400 | 50.4% ± 2.5% |
| fast backs: all-out v slide | 400 | 46.8% ± 2.4% |
| strong pack: grind v slide | 400 | 63.7% ± 2.3% |
| strong pack: balanced v slide | 400 | 57.8% ± 2.4% |
| strong pack: expansive v slide | 400 | 63.0% ± 2.3% |
| strong pack: kick-chase v slide | 400 | 60.6% ± 2.4% |
| strong pack: all-out v slide | 400 | 55.6% ± 2.4% |
| smart D: grind v slide | 400 | 46.1% ± 2.4% |
| smart D: balanced v slide | 400 | 48.0% ± 2.4% |
| smart D: expansive v slide | 400 | 50.2% ± 2.4% |
| smart D: kick-chase v slide | 400 | 54.3% ± 2.4% |
| smart D: all-out v slide | 400 | 50.5% ± 2.4% |
| fast backs: expansive v rush | 400 | 50.6% ± 2.4% |
| strong pack: grind v rush | 400 | 58.1% ± 2.4% |
| strong pack: balanced v rush | 400 | 50.9% ± 2.4% |
| strong pack: expansive v rush | 400 | 58.3% ± 2.4% |
| strong pack: kick-chase v rush | 400 | 58.6% ± 2.4% |
| strong pack: all-out v rush | 400 | 50.4% ± 2.4% |
| fast backs: expansive v compressed | 400 | 53.4% ± 2.4% |
| strong pack: grind v compressed | 400 | 53.9% ± 2.4% |
| strong pack: balanced v compressed | 400 | 55.6% ± 2.4% |
| strong pack: expansive v compressed | 400 | 53.8% ± 2.4% |
| strong pack: kick-chase v compressed | 400 | 58.1% ± 2.4% |
| strong pack: all-out v compressed | 400 | 55.3% ± 2.4% |
| yardstick 62 v 60 | 1000 | 55.0% ± 1.5% |
| yardstick 65 v 60 | 1000 | 56.9% ± 1.5% |

## Per-side counts — Tight on

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 2.3 | 8.9 | 5.6 | 2.7 | 9.6 | 4.1 | 4.6 | 14.1 | 14.1 |
| grind v slide | opponent | 3.8 | 9.0 | 7.4 | 2.7 | 8.9 | 7.4 | 5.2 | 14.1 | 14.1 |
| grind v rush | tracked | 2.3 | 22.8 | 4.7 | 2.7 | 9.5 | 5.8 | 4.8 | 14.0 | 14.9 |
| grind v rush | opponent | 3.7 | 8.8 | 7.5 | 2.8 | 9.2 | 7.3 | 5.2 | 14.9 | 14.0 |
| grind v compressed | tracked | 1.6 | 6.4 | 5.1 | 2.6 | 9.9 | 5.4 | 4.6 | 13.7 | 14.3 |
| grind v compressed | opponent | 3.6 | 8.8 | 7.2 | 2.8 | 8.7 | 7.1 | 5.2 | 14.3 | 13.7 |
| balanced v slide | tracked | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v slide | opponent | 3.6 | 8.4 | 7.0 | 3.0 | 8.7 | 7.1 | 5.1 | 15.3 | 15.3 |
| balanced v rush | tracked | 3.7 | 21.8 | 5.8 | 3.0 | 8.6 | 9.6 | 5.1 | 15.3 | 15.8 |
| balanced v rush | opponent | 3.8 | 8.6 | 7.3 | 3.1 | 8.7 | 7.2 | 5.0 | 15.8 | 15.3 |
| balanced v compressed | tracked | 2.4 | 6.2 | 6.3 | 2.8 | 8.9 | 8.6 | 5.2 | 14.3 | 15.4 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 3.0 | 8.5 | 7.1 | 5.2 | 15.4 | 14.3 |
| expansive v slide | tracked | 4.6 | 9.1 | 6.9 | 2.9 | 8.5 | 6.9 | 5.1 | 15.1 | 16.0 |
| expansive v slide | opponent | 3.7 | 8.5 | 7.1 | 3.1 | 8.8 | 7.0 | 5.3 | 16.0 | 15.1 |
| expansive v rush | tracked | 4.9 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 5.0 | 16.4 | 15.5 |
| expansive v rush | opponent | 3.7 | 8.5 | 7.1 | 3.0 | 8.6 | 7.2 | 5.1 | 15.5 | 16.4 |
| expansive v compressed | tracked | 3.5 | 6.7 | 6.2 | 2.9 | 8.7 | 8.6 | 4.7 | 14.7 | 15.1 |
| expansive v compressed | opponent | 3.7 | 8.3 | 7.0 | 2.9 | 8.7 | 7.1 | 5.3 | 15.1 | 14.7 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 6.7 | 2.9 | 9.8 | 6.9 | 5.0 | 15.1 | 14.5 |
| kick-chase v slide | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.9 | 6.9 | 5.3 | 14.5 | 15.1 |
| kick-chase v rush | tracked | 2.1 | 21.9 | 5.7 | 3.0 | 9.7 | 9.3 | 5.1 | 15.9 | 14.9 |
| kick-chase v rush | opponent | 3.9 | 8.7 | 7.1 | 2.9 | 8.7 | 7.0 | 5.4 | 14.9 | 15.9 |
| kick-chase v compressed | tracked | 1.0 | 6.4 | 6.3 | 2.9 | 10.0 | 8.9 | 4.8 | 15.0 | 14.3 |
| kick-chase v compressed | opponent | 3.6 | 8.7 | 7.0 | 2.8 | 8.8 | 7.2 | 5.2 | 14.3 | 15.0 |
| all-out v slide | tracked | 6.2 | 8.9 | 7.3 | 3.1 | 8.2 | 7.3 | 5.3 | 15.9 | 15.6 |
| all-out v slide | opponent | 3.5 | 8.4 | 7.1 | 3.0 | 8.5 | 7.0 | 5.0 | 15.6 | 15.9 |
| all-out v rush | tracked | 6.6 | 22.3 | 6.1 | 3.0 | 8.0 | 9.6 | 5.3 | 15.7 | 16.5 |
| all-out v rush | opponent | 3.6 | 8.6 | 7.1 | 3.2 | 8.6 | 7.0 | 5.0 | 16.5 | 15.7 |
| all-out v compressed | tracked | 4.9 | 6.5 | 6.9 | 2.9 | 8.5 | 9.2 | 5.2 | 15.2 | 15.6 |
| all-out v compressed | opponent | 3.6 | 8.2 | 7.0 | 3.0 | 8.7 | 7.0 | 5.1 | 15.6 | 15.2 |
| fast backs: grind v slide | tracked | 2.2 | 8.4 | 6.1 | 2.9 | 9.6 | 4.2 | 4.6 | 15.0 | 16.0 |
| fast backs: grind v slide | opponent | 3.5 | 9.1 | 8.1 | 3.1 | 8.7 | 8.1 | 5.3 | 16.0 | 15.0 |
| fast backs: balanced v slide | tracked | 3.4 | 8.1 | 8.0 | 3.2 | 8.4 | 7.1 | 5.2 | 16.7 | 17.5 |
| fast backs: balanced v slide | opponent | 3.7 | 8.9 | 7.9 | 3.3 | 8.5 | 7.9 | 5.1 | 17.5 | 16.7 |
| fast backs: expansive v slide | tracked | 4.5 | 8.8 | 7.8 | 3.4 | 8.5 | 7.5 | 4.7 | 17.3 | 16.1 |
| fast backs: expansive v slide | opponent | 3.6 | 9.1 | 7.9 | 3.1 | 8.4 | 7.7 | 5.1 | 16.1 | 17.3 |
| fast backs: kick-chase v slide | tracked | 2.1 | 8.0 | 7.6 | 3.2 | 9.5 | 6.8 | 5.0 | 16.3 | 16.2 |
| fast backs: kick-chase v slide | opponent | 3.7 | 8.8 | 7.9 | 3.1 | 8.9 | 7.5 | 5.3 | 16.2 | 16.3 |
| fast backs: all-out v slide | tracked | 5.9 | 8.5 | 8.0 | 3.2 | 8.0 | 7.1 | 5.4 | 16.6 | 17.6 |
| fast backs: all-out v slide | opponent | 3.7 | 8.9 | 7.8 | 3.3 | 8.5 | 7.9 | 5.2 | 17.6 | 16.6 |
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
| smart D: grind v slide | tracked | 2.3 | 8.2 | 5.1 | 2.5 | 9.7 | 3.2 | 4.5 | 13.1 | 13.6 |
| smart D: grind v slide | opponent | 3.8 | 8.9 | 7.2 | 2.6 | 8.9 | 6.4 | 5.1 | 13.6 | 13.1 |
| smart D: balanced v slide | tracked | 3.5 | 7.9 | 6.6 | 2.8 | 8.8 | 5.2 | 5.2 | 14.3 | 15.0 |
| smart D: balanced v slide | opponent | 3.6 | 8.6 | 6.8 | 2.9 | 8.6 | 6.1 | 5.2 | 15.0 | 14.3 |
| smart D: expansive v slide | tracked | 4.6 | 8.7 | 6.3 | 2.8 | 8.7 | 5.3 | 4.8 | 14.7 | 14.7 |
| smart D: expansive v slide | opponent | 3.5 | 8.1 | 6.8 | 2.8 | 8.7 | 6.1 | 5.1 | 14.7 | 14.7 |
| smart D: kick-chase v slide | tracked | 2.1 | 8.4 | 6.5 | 2.9 | 10.1 | 5.4 | 4.7 | 15.0 | 13.2 |
| smart D: kick-chase v slide | opponent | 3.9 | 8.0 | 6.5 | 2.6 | 8.8 | 6.1 | 5.4 | 13.2 | 15.0 |
| smart D: all-out v slide | tracked | 6.2 | 8.6 | 7.0 | 2.9 | 8.3 | 5.6 | 5.4 | 14.8 | 15.1 |
| smart D: all-out v slide | opponent | 3.6 | 8.3 | 6.8 | 2.9 | 8.6 | 6.0 | 5.2 | 15.1 | 14.8 |
| fast backs: expansive v rush | tracked | 4.7 | 22.4 | 6.4 | 3.5 | 8.4 | 9.8 | 4.9 | 18.0 | 18.2 |
| fast backs: expansive v rush | opponent | 3.7 | 9.0 | 7.9 | 3.5 | 8.6 | 7.8 | 5.1 | 18.2 | 18.0 |
| strong pack: grind v rush | tracked | 10.2 | 25.0 | 5.3 | 3.2 | 9.2 | 6.2 | 5.0 | 16.5 | 14.4 |
| strong pack: grind v rush | opponent | 3.4 | 8.1 | 6.7 | 2.8 | 8.7 | 5.6 | 5.3 | 14.4 | 16.5 |
| strong pack: balanced v rush | tracked | 4.0 | 22.5 | 5.9 | 3.1 | 8.5 | 8.9 | 5.3 | 16.2 | 15.4 |
| strong pack: balanced v rush | opponent | 3.5 | 7.9 | 6.6 | 3.0 | 8.8 | 5.7 | 5.0 | 15.4 | 16.2 |
| strong pack: expansive v rush | tracked | 5.0 | 24.0 | 5.9 | 3.1 | 8.6 | 9.2 | 5.1 | 16.1 | 14.6 |
| strong pack: expansive v rush | opponent | 3.5 | 7.9 | 6.4 | 2.8 | 8.7 | 5.5 | 5.2 | 14.6 | 16.1 |
| strong pack: kick-chase v rush | tracked | 2.2 | 22.7 | 5.8 | 3.1 | 9.7 | 8.6 | 5.1 | 15.9 | 14.2 |
| strong pack: kick-chase v rush | opponent | 3.5 | 7.9 | 6.5 | 2.7 | 8.8 | 5.5 | 5.2 | 14.2 | 15.9 |
| strong pack: all-out v rush | tracked | 6.9 | 23.2 | 6.2 | 3.1 | 8.0 | 9.3 | 5.3 | 16.1 | 15.4 |
| strong pack: all-out v rush | opponent | 3.5 | 8.2 | 6.7 | 3.0 | 8.5 | 5.4 | 5.1 | 15.4 | 16.1 |
| fast backs: expansive v compressed | tracked | 3.5 | 6.4 | 7.3 | 3.4 | 8.7 | 9.6 | 4.7 | 17.3 | 16.4 |
| fast backs: expansive v compressed | opponent | 3.5 | 8.7 | 7.7 | 3.1 | 8.5 | 7.7 | 5.2 | 16.4 | 17.3 |
| strong pack: grind v compressed | tracked | 9.5 | 7.5 | 5.8 | 2.9 | 9.3 | 5.6 | 5.0 | 15.1 | 13.7 |
| strong pack: grind v compressed | opponent | 3.4 | 7.9 | 6.5 | 2.7 | 8.8 | 5.7 | 5.1 | 13.7 | 15.1 |
| strong pack: balanced v compressed | tracked | 2.7 | 6.8 | 6.7 | 3.0 | 8.6 | 8.8 | 5.1 | 15.5 | 13.8 |
| strong pack: balanced v compressed | opponent | 3.5 | 7.7 | 6.3 | 2.7 | 8.5 | 5.7 | 5.2 | 13.8 | 15.5 |
| strong pack: expansive v compressed | tracked | 3.7 | 6.8 | 6.5 | 3.0 | 8.8 | 8.8 | 4.8 | 15.3 | 14.2 |
| strong pack: expansive v compressed | opponent | 3.6 | 7.8 | 6.6 | 2.7 | 8.7 | 5.7 | 5.1 | 14.2 | 15.3 |
| strong pack: kick-chase v compressed | tracked | 1.2 | 6.8 | 6.3 | 3.0 | 9.9 | 8.3 | 5.1 | 15.8 | 13.6 |
| strong pack: kick-chase v compressed | opponent | 3.4 | 7.8 | 6.2 | 2.6 | 8.7 | 5.7 | 5.5 | 13.6 | 15.8 |
| strong pack: all-out v compressed | tracked | 4.9 | 7.1 | 7.1 | 2.9 | 8.5 | 8.7 | 5.4 | 15.2 | 14.2 |
| strong pack: all-out v compressed | opponent | 3.6 | 7.7 | 6.2 | 2.7 | 8.6 | 5.7 | 5.0 | 14.2 | 15.2 |
| yardstick 62 v 60 | tracked | 3.6 | 8.6 | 7.5 | 3.1 | 8.7 | 7.1 | 5.0 | 16.0 | 14.9 |
| yardstick 62 v 60 | opponent | 3.5 | 8.4 | 7.1 | 2.9 | 8.6 | 6.7 | 4.9 | 14.9 | 16.0 |
| yardstick 65 v 60 | tracked | 3.6 | 9.0 | 8.0 | 3.2 | 8.7 | 7.3 | 4.8 | 16.8 | 14.8 |
| yardstick 65 v 60 | opponent | 3.6 | 8.2 | 7.4 | 2.9 | 8.6 | 6.5 | 4.7 | 14.8 | 16.8 |

_88 cells in 13642 s._
