# Balance: Slide All-out acceptance pooled

All-out v Slide: 500 distinct seeds, 1–500, both orientations, 1,000 whole matches. Pooled from four disjoint 125-seed runs of the existing balance harness, with identical source, sheets and tuning.

**commit** 28c8054 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:01:34.921Z · **pooledFrom** 20261104-170135-slide-all-out-acceptance-1-125, 20261104-170134-slide-all-out-acceptance-126-250, 20261104-170135-slide-all-out-acceptance-251-375, 20261104-170135-slide-all-out-acceptance-376-500

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | 52.0% ± 1.5% | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| all-out v slide | 1000 | 52.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all-out v slide | tracked | 6.2 | 9.7 | 7.5 | 3.0 | 8.2 | 7.2 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 15.7 | 15.2 |
| all-out v slide | opponent | 3.5 | 8.3 | 6.9 | 2.9 | 8.6 | 7.0 | 5.0 | 1.6 | 0.2 | 0.9 | 0.2 | 15.2 | 15.7 |

_1 cells in 1890 s._

## Seed pooling

The four source harness runs cover seeds **1–125, 126–250, 251–375 and 376–500**, each in both orientations. All 1,000 matches are included. Source plans, metadata, reports and raw results are copied under [chunks](chunks/).

Means are weighted by match count. For a chunk with n matches, M2 = SE² × n × (n − 1); pooled M2 adds those within-chunk values and n × (chunk mean − pooled mean)². Pooled SE = sqrt(M2 / (N − 1) / N). Per-side counts and points share use N=1,000; written-orientation counts use N=500. The runtime above sums the four chunk runtimes.
