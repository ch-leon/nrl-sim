# Match balance — October 2026 (N13)

The live match sim's knobs, measured with the harness (`npm run balance`, `balance/README.md`).
N13 item 1 is the presets. Later items (grubbers, completion, the 20-point gap, the home
edge, stamina, the break rule) are still to come; this file starts with item 1.

Every decision taken without a fresh word from Leon is marked **Assumed (needs Leon)**.

## N13.1 Presets back in balance (24 Oct)

The stopped branch `match/presets-balance` was never on the remote. The local commit it
would have held (a scenario's own match count, a tracked side, both ways round, and a
golden Balanced / Slide match) is on this branch instead, and the numbers below were
measured with it.

**The band.** Each tactical preset wins 45–55% of even matches against Balanced (attack)
or Slide (defence). **Assumed (needs Leon):** the band itself, from the N13 plan, and the
table values that land inside it. Styles should still read as their names. Calls and the
AI coach are off. Even 60-rated sides, whole matches, 200 seeds each way (400 matches;
one standard error about 2.5 points). Wins are on points; a draw is not a win.

Before is `20261024-061333-presets-before` on `35afd04` (home and away played as separate
rows, then pooled). After is `20261024-063629-presets` (`balance/plans/presets.json`).

| Preset | Before | After | Inside 45–55% |
|---|---:|---:|---|
| Grind | 49.2% | 49.2% | yes, unchanged |
| Expansive | 35.0% | 46.2% | yes |
| Kick-chase | 46.5% | 46.5% | yes, unchanged |
| All-out | 38.0% | 54.8% | yes, the top of the band |
| Rush | 57.2% | 49.8% | yes |
| Compressed | 64.0% | 49.0% | yes |

Draws after, same 400 matches: Grind 6.0%, Expansive 5.8%, Kick-chase 6.0%, All-out 3.8%,
Rush 3.8%, Compressed 5.2%.

**What moved** (`src/match/league/presets.ts`, spec §5.1–5.2, tuning §8):

- Expansive: pass +0.15 → 0, cut-out 0.08 → 0.02, width 0.35 → 0.28, early kick 0.30 → 0.18.
  Offload stays ×1.3 and the edges stay +0.8, so it still throws more than Grind.
- All-out: pass +0.15 → 0, offload ×1.6 → ×1.5, cut-out 0.12 → 0.03, width 0.45 → 0.35,
  early kick 0.30 → 0.15. It still offloads the most.
- Rush: line speed 6.5 → 6.2 m/s. Busts stayed at +0.11. A tenth more (0.115) already
  dropped the win rate to about 45%, and 0.13 to about 42%, so the line speed is the lever
  that lands near half without giving up the rush.
- Compressed: pull ×1.4 → ×1.1, markers ×1.2 → ×1.05, busts −0.04 → −0.02, and
  step-against −0.02 → +0.03 so the open edges can be stepped. Line speed stays 4.5.
- Grind and Kick-chase were already inside the band and were left alone.

**They still play like their names** (after, counts are both sides, the matchup as written):

| Preset | Offloads | Kicks | Breaks | Big hits | Completion |
|---|---:|---:|---:|---:|---:|
| Grind | 5.7 | 24.2 | 57.0 | 26.3 | 71.5% |
| Expansive | 11.4 | 22.2 | 58.6 | 27.1 | 68.3% |
| Kick-chase | 8.0 | 24.0 | 58.5 | 26.4 | 70.3% |
| All-out | 13.0 | 21.7 | 60.0 | 26.8 | 68.8% |
| Rush | 10.3 | — | 80.5 | 33.8 | — |
| Compressed | 7.9 | — | 58.8 | 25.8 | — |

A Grind side that changes to Expansive at half-time offloads more than one that stays
(5.9 → 8.6 over 40 matches, same plan). The golden even Balanced / Slide match (seed 1)
is unchanged: `8-14:495:67db8b634c5a2e73`.

The standard plan carries the same six rows at 100 seeds both ways, so the next match-code
change reports the band again. Rival-style results over a whole season are N14.2, not this
item.

**Open.** All-out at 54.8% is inside the band and within a point of the top of it; another
400 matches could print a 56. Expansive and Kick-chase sit near the bottom (46%). Neither
was pushed further: softer Expansive (less width, an earlier kick, fewer edges) did not
win more games, and Kick-chase was already inside without being made to kick less.
