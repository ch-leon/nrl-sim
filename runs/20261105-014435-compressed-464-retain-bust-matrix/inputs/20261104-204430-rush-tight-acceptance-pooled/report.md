# Balance: Rush Tight acceptance pooled

grind v rush: 2000 whole matches, consecutive seeds 1–1000 in both orientations. Pooled completed harness runs; original inputs and sample-variance formula are preserved in PROVENANCE.md.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:44:59.449533+00:00 · **pooled** true · **sourceRuns** 20261104-193151-rush-neutral-and-fit-acceptance,20261104-202535-rush-tight-extension-1,20261104-202535-rush-tight-extension-2,20261104-202533-rush-tight-extension-3,20261104-202534-rush-tight-extension-4 · **seedRanges** 1,500,20261104-193151-rush-neutral-and-fit-acceptance,501,625,20261104-202535-rush-tight-extension-1,626,750,20261104-202535-rush-tight-extension-2,751,875,20261104-202533-rush-tight-extension-3,876,1000,20261104-202534-rush-tight-extension-4

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | 48.7% ± 1.1% | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v rush | 2000 | 48.7% ± 1.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v rush | tracked | 2.3 | 22.8 | 4.7 | 2.7 | 9.6 | 5.7 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.3 | 14.7 |
| grind v rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 8.9 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.7 | 14.3 |

_1 cells in 5911 s._
