# Impact interchanges (#664)

The [standard plan](report.md) compares gameplay commit `eb7f6784` with [main at `58524bb8`](../20261122-235848-standard/report.md). Twelve standard scenarios run whole five-minute matches. The six-minute late-legs scenario is a separate stretch. In the 720 whole matches in the written orientation, the harness counted 49 substitutions, including injury replacements. The standard comparison flagged no event-count changes beyond noise.

## What rotating buys a coach

Even flat 60-rated teams both carry four reserves. One uses standard rotation, the other switches automatic rotation off. Injury replacements remain possible. Each row tracks the rotating team over 120 fixed seeds played in both orientations (240 results). The control sets `bench.impact.uses=0` so both variants use the same bench-side route and recovery. An additional neutral scenario has standard rotation on both sides. [Matched rotation plan and raw results](../20261123-085604-impact-rotation-664/report.md)

| Match length | First two involvements | Wins | Draws | Losses | Win rate | Points share, half per draw |
|---|---|---:|---:|---:|---:|---:|
| 5 min | Enabled | 92 | 56 | 92 | 38.3% | 50.00% |
| 5 min | Disabled | 92 | 56 | 92 | 38.3% | 50.00% |
| 14 min | Enabled | 123 | 9 | 108 | 51.25% | 53.125% |
| 14 min | Disabled | 126 | 11 | 103 | 52.5% | 54.79% |

In the current five-minute game the sample was exactly even between the two rotation policies. At 14 minutes the rotating side took more than half the available points both ways. The impact mechanic itself produced no measurable win advantage in this comparison.

## Match balance

BAK-208 §7 defines its neutral event bands over two seven-minute halves. The harness stores counts per five minutes, so the table uses unrounded means multiplied by 14/5 for counts and keeps completion as recorded. The original 80 matched seeds put grubber tries one score above the upper band with impact enabled. A separate 200-seed sample, starting at seed 10001, compares the complete feature, the same bench route with zero charges, and the previous interchange mechanic. [Independent-seed report](../20261123-090830-impact-interchange-holdout-664/report.md)

| Neutral metric | §7 band | First 80 enabled | First 80 same route, zero charges | Next 200 enabled | Next 200 same route, zero charges | Next 200 original interchange |
|---|---:|---:|---:|---:|---:|---:|
| Tackles | 117–163 | 143.55 | 143.65 | 143.435 | 143.34 | 143.35 |
| Line breaks | 10–19 | 13.85 | 13.8125 | 14.285 | 14.145 | 14.175 |
| Offloads | 6–11 | 7.425 | 7.2875 | 7.345 | 7.52 | 7.32 |
| Errors | 8–12 | 9.95 | 9.95 | 10.085 | 10.065 | 10.12 |
| Kicks | 16–25 | 16.8375 | 17.025 | 16.57 | 16.705 | 16.605 |
| Tries | 4–7 | 4.95 | 5.075 | 5.2 | 5.325 | 5.35 |
| Completion (%) | 70–80 | 72.3211 | 72.6305 | 72.1245 | 72.2414 | 72.134 |
| Grubber tries | 0.20–0.30 | 0.3125 | 0.3625 | 0.31 | 0.33 | 0.295 |
| Grubber repeat sets | 0.05–0.30 | 0.05 | 0.05 | 0.06 | 0.05 | 0.055 |
| Grubber drop-outs | 0–0.15 | 0 | 0 | 0 | 0 | 0 |

The follow-up counted 62 grubber tries in 200 complete matches with the feature, 66 with only the new interchange route, and 59 on the original interchange. The proposed 0.20–0.30 band tops out at 60 tries in 200. The small difference is unresolved. The match-contact change leaves the kicking parameters in place.

## Standard preset points shares

Each preset plays 100 matches in each orientation. All six fall inside the signed 42–58% band. [Standard report](report.md)

| Preset matchup | Main | Impact interchanges |
|---|---:|---:|
| grind v balanced | 53.75% | 54.00% |
| expansive v balanced | 55.50% | 54.75% |
| kick-chase v balanced | 48.75% | 49.25% |
| all-out v balanced | 50.00% | 49.25% |
| rush v slide | 50.50% | 49.75% |
| compressed v slide | 50.00% | 49.25% |

The separate 70 v 50 yardstick returned 12/20 outright wins for the stronger side, compared with 12/20 on main. The spec gives about 70% as a guide.
