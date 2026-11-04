# Balance: Slide Kick-chase acceptance pooled

Kick-chase v Slide: 500 distinct seeds, 1–500, both orientations, 1,000 whole matches. Pooled from four disjoint 125-seed runs of the existing balance harness, with identical source, sheets and tuning.

**commit** 19397b4 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:40:11.160Z · **pooledFrom** 20261104-174010-slide-tuned-c-kick-chase-acceptance-1-125, 20261104-174017-slide-tuned-c-kick-chase-acceptance-126-250, 20261104-174011-slide-tuned-c-kick-chase-acceptance-251-375, 20261104-174014-slide-tuned-c-kick-chase-acceptance-376-500

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | 47.4% ± 1.5% | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v slide | 1000 | 47.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v slide | tracked | 2.2 | 8.3 | 5.5 | 2.6 | 9.7 | 6.9 | 4.8 | 2.7 | 0.1 | 1.2 | 0.1 | 14.1 | 14.5 |
| kick-chase v slide | opponent | 3.7 | 8.7 | 7.2 | 2.8 | 8.9 | 7.2 | 5.0 | 1.7 | 0.2 | 0.9 | 0.1 | 14.5 | 14.1 |

_1 cells in 1916 s._

## Seed pooling

The four source harness runs cover seeds **1–125, 126–250, 251–375 and 376–500**, each in both orientations. All 1,000 matches are included. Source plans, metadata, reports and raw results are copied under [chunks](chunks/).

Means are weighted by match count. For a chunk with n matches, M2 = SE² × n × (n − 1); pooled M2 adds those within-chunk values and n × (chunk mean − pooled mean)². Pooled SE = sqrt(M2 / (N − 1) / N). Per-side counts and points share use N=1,000; written-orientation counts use N=500. The runtime above sums the four chunk runtimes.
