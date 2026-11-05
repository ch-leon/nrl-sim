# #465 main baseline soak

Command: `npm run soak -- --difficulties easy,normal,hard --jobs 4`.

20 seeds, 5 planned seasons, idle/managed on all three difficulties; 120 fresh cases plus saves v1–20. Careers sacked early stop as the existing harness specifies. Original console tables and full per-season P&L remain in `soak-main.log`; full inputs/results in `soak-main.json`. No problems or forfeits.

| Difficulty | Mode | Wins | Games | Win % | Mean final cash |
|---|---|---:|---:|---:|---:|
| easy | idle | 1642 | 2376 | 69.108 | $1,290,528.95 |
| easy | managed | 2083 | 2400 | 86.792 | $1,045,515.25 |
| normal | idle | 1135 | 2040 | 55.637 | $665,151.85 |
| normal | managed | 1831 | 2304 | 79.470 | $538,439.85 |
| hard | idle | 693 | 1464 | 47.336 | $196,824.85 |
| hard | managed | 1525 | 2064 | 73.886 | $182,415.95 |
