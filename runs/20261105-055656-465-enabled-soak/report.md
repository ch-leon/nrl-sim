# #465 enabled full season soak

The identical command ran on pre-switch main and the frozen `9e93548` defaults:
`npm run soak -- --difficulties easy,normal,hard --jobs 4` (JSON output added).
Each completed **120 fresh careers** (20 seeds × idle/managed × three difficulties)
and **20 migrated-save cases, versions 1–20**, with **zero problems and forfeits**.
Fresh careers plan five seasons; the unchanged harness stops careers sacked early.
Every input case remains included; tables show the actual seasons played. Cash is
the mean balance at each career's end, including early endings, not survivors only.

Main baseline (`e8b88be`):

| Difficulty | Mode | Careers | Seasons played | Wins/games | Win % | Mean final cash | Cash SE |
|---|---|---:|---:|---:|---:|---:|---:|
| Easy | idle | 20 | 99 | 1642/2376 | 69.108 | $1,290,528.95 | $102,516.34 |
| Easy | managed | 20 | 100 | 2083/2400 | 86.792 | $1,045,515.25 | $124,085.42 |
| Normal | idle | 20 | 85 | 1135/2040 | 55.637 | $665,151.85 | $139,193.72 |
| Normal | managed | 20 | 96 | 1831/2304 | 79.470 | $538,439.85 | $96,362.23 |
| Hard | idle | 20 | 61 | 693/1464 | 47.336 | $196,824.85 | $119,574.97 |
| Hard | managed | 20 | 86 | 1525/2064 | 73.886 | $182,415.95 | $66,588.79 |

Enabled (`9e93548`):

| Difficulty | Mode | Careers | Seasons played | Wins/games | Win % | Change (points) | Mean final cash |
|---|---|---:|---:|---:|---:|---:|---:|
| Easy | idle | 20 | 99 | 1651/2376 | 69.487 | +0.379 | $1,380,891.40 |
| Easy | managed | 20 | 100 | 2160/2400 | 90.000 | +3.208 | $1,202,138.15 |
| Normal | idle | 20 | 87 | 1147/2088 | 54.933 | -0.704 | $626,959.75 |
| Normal | managed | 20 | 100 | 1979/2400 | 82.458 | +2.988 | $662,419.10 |
| Hard | idle | 20 | 60 | 703/1440 | 48.819 | +1.483 | $152,830.05 |
| Hard | managed | 20 | 86 | 1582/2064 | 76.647 | +2.762 | $303,383.55 |

Both Normal management modes meet the ±3-point guard: idle −0.704 and managed
+2.988 (the unrounded managed change is +2.987847 points). Money stays within
baseline variability: each enabled mode's mean final balance is inside the main
mean ±2 main standard errors. Paired cash shifts are all below 1.22 paired SE:

| Difficulty | Mode | Mean cash change | Paired SE | Change / paired SE |
|---|---|---:|---:|---:|
| Easy | idle | $+90,362.45 | $75,844.32 | +1.191 |
| Easy | managed | $+156,622.90 | $129,358.44 | +1.211 |
| Normal | idle | $-38,192.10 | $61,743.76 | -0.619 |
| Normal | managed | $+123,979.25 | $148,173.18 | +0.837 |
| Hard | idle | $-43,994.80 | $84,449.34 | -0.521 |
| Hard | managed | $+120,967.60 | $117,443.75 | +1.030 |

The original per-season win/finance tables and every case remain in the raw logs
and JSON. [Main run](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-031629-465-main-soak/report.md)
and [enabled run](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-055656-465-enabled-soak/report.md).
The enabled evidence is also in [Actions 41977143745](https://github.com/ch-leon/nrl-sim/actions/runs/41977143745).
The rejected initial switch-on raised Normal managed from 79.47% to 87.75%; a
later scale-12 candidate still rose 3.400 points. Scale 8 satisfies the guard
while retaining 6+ strong-pack offloads and the full-fit counter target.
