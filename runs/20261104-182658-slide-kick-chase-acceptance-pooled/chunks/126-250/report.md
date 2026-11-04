# Balance: Slide tuned E kick-chase acceptance 126-250

Kick-chase v Slide with early last-tackle fullback depth: seeds 126–250, both orientations, 250 whole matches, one disjoint quarter of the 1,000-match acceptance sample.

**commit** befed47 · **branch** feat/462-slide-counters · **started** 2026-11-04T18:22:53.566Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 44.2% ± 3.1% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 250 | 44.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.3 | 8.5 | 5.7 | 2.4 | 9.8 | 6.7 | 4.9 | 2.7 | 0.1 | 1.2 | 0.0 | 13.0 | 13.9 |
| kick-chase v slide | opponent | 3.9 | 8.6 | 7.2 | 2.7 | 9.1 | 7.3 | 4.9 | 1.7 | 0.2 | 1.0 | 0.2 | 13.9 | 13.0 |

_1 cells in 240 s._
