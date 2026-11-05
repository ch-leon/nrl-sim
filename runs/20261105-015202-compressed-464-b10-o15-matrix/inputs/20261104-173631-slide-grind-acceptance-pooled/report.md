# Balance: Slide Tight acceptance pooled

Tight v Slide: 500 distinct seeds, 1–500, both orientations, 1,000 whole matches. Pooled from four disjoint 125-seed runs of the existing balance harness, with identical source, sheets and tuning.

**commit** 9fce051 · **branch** feat/462-slide-counters · **started** 2026-11-04T17:17:48.542Z · **pooledFrom** 20261104-171748-slide-tuned-b-grind-acceptance-1-125, 20261104-171750-slide-tuned-b-grind-acceptance-126-250, 20261104-171748-slide-tuned-b-grind-acceptance-251-375, 20261104-171748-slide-tuned-b-grind-acceptance-376-500

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 54.7% ± 1.5% | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 54.7% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.2 | 11.4 | 6.0 | 2.9 | 9.5 | 4.3 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 15.4 | 13.9 |
| grind v slide | opponent | 3.5 | 8.5 | 7.1 | 2.7 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 0.9 | 0.1 | 13.9 | 15.4 |

_1 cells in 4281 s._

## Seed pooling

The four source harness runs cover seeds **1–125, 126–250, 251–375 and 376–500**, each in both orientations. All 1,000 matches are included. Source plans, metadata, reports and raw results are copied under [chunks](chunks/).

Means are weighted by match count. For a chunk with n matches, M2 = SE² × n × (n − 1); pooled M2 adds those within-chunk values and n × (chunk mean − pooled mean)². Pooled SE = sqrt(M2 / (N − 1) / N). Per-side counts and points share use N=1,000; written-orientation counts use N=500. The runtime above sums the four chunk runtimes.
