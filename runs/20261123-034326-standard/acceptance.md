# Goal-line stands (#657)

Simulation and harness commit `24081b4c`. The [standard report](report.md) uses the current 2 × 2:30 whole matches and compares with [main `58524bb8`](../20261122-235848-standard/report.md). No ordinary count change was flagged beyond noise.

## Frequency and endings

A stand begins on the third straight set the same side starts inside the opposition 20 m. Starts in the table count every set that starts inside the 20 m. Counts are from each row's written orientation.

| Sample | Inside-20 starts | Matches with a stand | Stand endings |
|---|---:|---:|---|
| Standard whole matches, all scenarios | 1,341 | 6/720 (0.83%) | Four tries, two errors |
| Standard whole matches, even 60 | 42 | 0/20 | None observed |
| Historical 2 × 7:00, even 60 | 402 | 0/80 | None observed |
| Historical 2 × 7:00, Kick-chase v Compressed | 328 | 1/60 (1.67%) | One held-up ball |

No observed passage remained unfinished. The separate standard six-minute late-legs stretch had 42 inside-20 starts and no stands in 20 stretches. The one-sided 95% binomial upper bound for a stand in the neutral historical fixture is 3.68% per match from zero observations in 80 matches. The disabled variant in the [focused report](../20261123-034327-goal-line-stands-657/report.md) supplies the comparison for scoring and other match balance. It has no stand telemetry.

## Historical §7 targets

The historical even-60 row runs the same 80 seeds with stands enabled and disabled. The harness stores legacy event counts at its five-minute reference pace, so the table recovers the match counts from unrounded results using 14/5. Completion is already a percentage. Kick-chase v Compressed returned 5.2167 enabled and 5.1167 disabled tries per historical match over 60 seeds per row.

| Metric | §7 band | Enabled | Disabled |
|---|---:|---:|---:|
| Tackles | 117–163 | 144.3500 | 144.4250 |
| Line breaks | 10–19 | 13.8625 | 13.6125 |
| Offloads | 6–11 | 7.4375 | 7.3250 |
| Errors | 8–12 | 9.7750 | 9.7000 |
| Kicks | 16–25 | 16.6250 | 16.9375 |
| Tries | 4–7 | 4.8125 | 4.8500 |
| Completion | 70–80% | 72.61% | 72.84% |
| Grubber tries | 0.20–0.30 | 0.2250 | 0.2750 |
| Grubber repeat sets | 0.05–0.30 | 0.0625 | 0.0625 |
| Grubber drop-outs | 0–0.15 | 0 | 0 |

## Preset points shares in standard

Each row contains 200 matches, 100 in each orientation. A win is one point and a draw a half-point. Every preset is within the signed §7 band of 42–58%.

| Preset matchup | Main | Goal-line stands |
|---|---:|---:|
| Grind v Balanced | 53.75% | 53.75% |
| Expansive v Balanced | 55.50% | 56.50% |
| Kick-chase v Balanced | 48.75% | 48.75% |
| All-out v Balanced | 50.00% | 50.00% |
| Rush v Slide | 50.50% | 50.50% |
| Compressed v Slide | 50.00% | 49.75% |
