# Balance: Rush Kick-chase acceptance pooled

kick-chase v rush: 1000 whole matches, consecutive seeds 1–500 in both orientations. Pooled completed harness runs; original inputs and sample-variance formula are preserved in PROVENANCE.md.

**commit** 26f466a · **branch** feat/463-rush-counters · **started** 2026-11-04T21:08:43.958803+00:00 · **pooled** true · **sourceRuns** 20261104-205756-rush-kick-0-39-acceptance-1,20261104-205756-rush-kick-0-39-acceptance-3,20261104-205758-rush-kick-0-39-acceptance-2,20261104-205758-rush-kick-0-39-acceptance-4 · **seedRanges** 1,125,20261104-205756-rush-kick-0-39-acceptance-1,251,375,20261104-205756-rush-kick-0-39-acceptance-3,126,250,20261104-205758-rush-kick-0-39-acceptance-2,376,500,20261104-205758-rush-kick-0-39-acceptance-4

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 55.1% ± 1.5% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 1000 | 55.1% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 22.0 | 6.5 | 3.2 | 9.6 | 9.4 | 5.0 | 2.5 | 0.4 | 1.2 | 0.4 | 16.7 | 15.2 |
| kick-chase v rush | opponent | 3.6 | 8.6 | 7.1 | 2.9 | 8.7 | 6.9 | 5.4 | 1.6 | 0.1 | 0.9 | 0.1 | 15.2 | 16.7 |

_1 cells in 2346 s._
