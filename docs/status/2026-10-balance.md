# Match balance — October 2026 (N13)

The live match sim's knobs, measured with the harness (`npm run balance`, `balance/README.md`).
N13 item 1 is the presets. N13.5 is the break rule (below). Later items (grubbers, completion,
the 20-point gap, the home edge, stamina) are still to come.

N15.4 (traits you can see) adds an optional `toSlot` on a cut-out event in `src/match/league/live.ts`
(this plan's file): the receiver's slot, so the view can draw the line. The sim does not
read it, no dice changed, and the golden Balanced / Slide match is the same string.

Every decision taken without a fresh word from Leon is marked **Assumed (needs Leon)**.

## N13.5 The break rule (24 Oct, #316)

The rule is in the sim and off unless a match names the sides. A player watching a
match sees nothing new until N14 turns it on for the rival. Full knobs and the
assumed choices: tuning §30. Short version, even 60 v 60, 200 seeds both ways,
wins on points:

The side that has the rule wins **50.2%** (6.5% drawn). That is inside two
standard errors of even (about 5 points at 400 matches), so the rule alone is
not the 8-point edge N12.2 used for difficulty. N14 should turn Hard's AI coach
on, and leave Normal and Easy off. **Assumed (needs Leon).**

Each preset against Balanced or Slide, with the rule on the other side:

| Preset | No rule (N13.1) | Rule on the rival |
|---|---:|---:|
| Grind | 49.2% | 48.3% |
| Expansive | 46.2% | 45.3% |
| Kick-chase | 46.5% | 48.8% and 45.5% |
| All-out | 54.8% | 51.2% |
| Rush | 49.8% | 46.8% |
| Compressed | 49.0% | 49.0% |

Kick-chase at the old step (0.9) won 43.0% on seeds 1–200 and 41.8% on seeds
10001–10200, both under the band (pool 42.4% over 800). Step 1.0, which is
Balanced's step, wins 48.8% and 45.5% on those same blocks (pool **47.2%**).
Kicks stay about 24 a match and the bomb bias is unchanged. Kick metres on
seeds 1–200 fell 22.6, beyond luck. The other presets were left on the N13.1
tables. **Assumed (needs Leon):** the thresholds (8 down at half-time, two
tries in a row, 12 up after minute 15), Kick-chase opening to Expansive and
tightening to Grind, Compressed as the tight defence, a conceded run beating a
late lead, and this step.

Runs: `20261024-134002-break-rule`, `20261024-135701-kick-chase-step-confirm`,
`20261024-135245-kick-chase-step`. The plan is `balance/plans/break-rule.json`.
The golden even match is unchanged, because no side in that match is given the
rule. No club file and no QA file: the club does not pass the option yet.

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

- Expansive: pass +0.15 → 0, cut-out 0.08 → 0.02 (own 20 0.03 → 0.01), width 0.35 → 0.28, early kick 0.30 → 0.18.
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

**Open.** All-out at 54.8% is the seeds 1–200 block, inside the band and within a point of
the top of it. That block is the high one, not the rate. The same tables on later blocks of
400 matches: seeds 201–400 **48.5%**, 401–600 **45.5%**, 601–800 **49.0%**, and an
independent block on seeds 10001–10200 **43.8%** (below the band). Pooled, 966 wins in
2000 matches, **48.3%** (one standard error about 1.1 points). All-out sits near the middle.
A single block of 400 can still print outside 45–55%; it did not print above 55% on the
fresh seeds. The knobs were left as the sign-off set them: chasing the low block up would
aim a 48% rate at the top of the band. Expansive and Kick-chase sat near 46% on seeds
1–200 (49.8% and 47.5% on seeds 10001–10200). Softer Expansive was not pushed further on
the sign-off pass. Own 20's cut-out had been left at 3% after the base came down to 2%, so
an Expansive side cut out more from its own 20 than anywhere else; it is 1%, under the base.
Remeasured after that, Expansive won 46.5% on seeds 1–200 and 49.5% on seeds 10001–10200.
