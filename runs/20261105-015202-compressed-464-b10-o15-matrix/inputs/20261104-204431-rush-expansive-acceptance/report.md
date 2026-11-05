# Balance: Rush Expansive acceptance

expansive v rush: 1000 whole matches, consecutive seeds 1–500 in both orientations. Pooled completed harness runs; original inputs and sample-variance formula are preserved in PROVENANCE.md.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:44:58.786037+00:00 · **pooled** true · **sourceRuns** 20261104-193151-rush-neutral-and-fit-acceptance · **seedRanges** 1,500,20261104-193151-rush-neutral-and-fit-acceptance

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | 51.4% ± 1.5% | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| expansive v rush | 1000 | 51.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |

_1 cells in 2940 s._
