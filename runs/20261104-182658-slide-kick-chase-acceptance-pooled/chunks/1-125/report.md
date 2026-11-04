# Balance: Slide tuned E kick-chase acceptance 1-125

Kick-chase v Slide with early last-tackle fullback depth: seeds 1–125, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** befed47 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:22:50.393Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 44.4% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 44.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.1 | 8.4 | 5.6 | 2.4 | 9.6 | 6.9 | 4.8 | 2.7 | 0.1 | 1.3 | 0.1 | 12.8 | 14.1 |
| kick-chase v slide | opponent | 3.9 | 8.7 | 7.2 | 2.7 | 8.9 | 7.5 | 4.9 | 1.7 | 0.1 | 0.9 | 0.1 | 14.1 | 12.8 |

_1 cells in 221 s._
