# Match balance — October 2026 (N13)

## Shorter halves (25 Oct)

Halves went from 9:00 to 7:00 so a watched match is shorter. The golden even
Balanced / Slide match (seed 1, no break rule) moved on purpose, from
`8-14:495:67db8b634c5a2e73` to `6-7:362:e959099a69ffd994`. The siren comes earlier,
legs drain and recover ×9/7, and the minute windows (field goal 180 s → 140 s,
the AI coach's early hold 60 s → 47 s, a penalty shot's "late" 300 s → 233 s,
sin bin 5 → 4, golden point 5 → 4, a late lead from minute 15 → 12) are a
different match on the same seed. The pin is the new match, not a slipped hash.
The sprint tank was left alone: a sprint is still a few seconds.

Count bands in the harness are the old bands ×7/9, rounded (tries 4–7, tackles
117–163, and the rest in tuning §12). Completion stayed 70–80%. Even 60 v 60
over 20 seeds scored 6.15 tries a match on 9:00 halves and 4.05 on 7:00 (the
length alone would suggest about 4.8). That 4.05 sits on the bottom of the new
band. It was left there: the per-minute rate was not pushed back up.

Screen only, so the golden match does not include them: dead time (ruck and
play-the-ball, tackle, restart and kick-off, set piece, conversion, try, penalty,
field goal) plays at twice the chosen speed, eased over 0.4 s; the half-time
card goes on after 4.5 s at every speed unless it is tapped; the chosen speed
is kept on the save (v20), and an old save still starts at ×4.

Presets, `balance/runs/20261025-080627-presets` on `c6770da`, 200 seeds both
ways (400 matches). Side win, 45–55% is the band:

| Preset | Side win | |
|---|---:|---|
| Grind | 44.8% | 0.2 under. Standard error on 400 matches is about 2.5 points, so this is not a miss a knob change can honestly fix. |
| Expansive | 50.2% | in |
| Kick-chase | 53.0% | in |
| All-out | 47.3% | in |
| Rush | 44.8% | same as Grind |
| Compressed | 47.8% | in |

No preset knob was moved. Grind's offloads are 4.5, under the new 6–11 band; that is the style (it was already under the old 8–14). Completion sits at 68–72%, a shade under 70 on the expansive, all-out and rush rows, as it did on 9:00 halves. A half-time change from Grind to Expansive still offloads more (6.7 against 4.9 over 40 matches).

Soak, `npm run soak -- --difficulties easy,normal,hard --jobs 4` on `c6770da`. 20 seeds × 5 seasons × idle and managed × Easy, Normal and Hard, plus one 2-season managed run of each old save (v1–v19; the v20 playback-speed migration adds the nineteenth). **139 runs, no problems, forfeits none.** About 20 minutes on 4 jobs. No prize, gate or difficulty factor was moved. Hard's prize and grant stay ×1.2, Easy's prize and grant ×0.85 and gate ×0.96, Normal ×1.

Season 5, against the 24 Oct matrix on `6f9d323` (that table stays in `docs/status/2026-10-qa.md`). Money is the balance at the rollover.

| | Record | Pos | Top 8 | Prem | Sack | Money | 24 Oct money |
|---|---|---:|---:|---:|---:|---:|---:|
| idle Easy (20) | 15.3-1.2-7.5 | 3.0 | 90% | 35% | 5% | $1,080k | $1,186k (19) |
| managed Easy (20) | 20.7-0.3-3.1 | 1.1 | 100% | 65% | 5% | $798k | $1,124k |
| idle Normal (11) | 12.9-1.2-9.9 | 6.7 | 64% | 18% | 45% | $817k | $748k (11) |
| managed Normal (19) | 18.8-0.7-4.5 | 1.3 | 100% | 37% | 16% | $417k | $581k (19) |
| idle Hard (4) | 16.3-0.5-7.3 | 2.0 | 100% | 0% | 0% | $687k | $883k (5) |
| managed Hard (13) | 16.8-1.2-6.0 | 1.6 | 100% | 15% | 15% | $209k | $304k (11) |

Shorter matches score fewer points, so prize and gate dollars are lower. Season-1 gates / prize, idle: Easy +$391k / +$40k (was +$405k / +$60k), Normal +$355k / +$34k (was +$375k / +$46k), Hard +$320k / +$22k (was +$339k / +$35k). Managed season 1: Easy +$469k / +$87k, Normal +$451k / +$74k, Hard +$404k / +$63k. Easy's mean balance is still above Normal's in every season (idle season 5 $1,080k against $817k; managed $798k against $417k).

In the red is a season-end balance below zero. Managed Easy: 2 of 20 careers end there. Managed Normal: 4 of 20 end there, and 3 of the 19 who reach season 5 are negative at that rollover. Managed Hard: 7 of 20 end there. That is more than 1 in 16 managed runs. The factors were left as they are: the miss is fewer points on a shorter match, not a retune of the economy.

A phone (844×390, touch, no taps) watched one match at the default ×4 in 3 min 21 s, siren at 14:00, and one at ×8 in 1 min 38 s. The half-time card went on by itself after 4.5 s both times. The aim was about 3½–4 minutes at ×4; 3:21 is a little under that, and the dead-time pace was not raised to close the gap. Commentary is 12.8px and stays on the screen without an ellipsis. At ×4 a line is the bright one for about half a second (median); at ×8 about a quarter of a second, with the dimmed line above holding the previous one. Held upright, the rotate card covers the match and the clock stays put (00:16, then 00:29 once it is sideways again).

## N13

The live match sim's knobs, measured with the harness (`npm run balance`, `balance/README.md`).
N13 item 1 is the presets. N13.5 is the break rule (below). Later items (grubbers, completion,
the 20-point gap, the home edge, stamina) are still to come.

N15.4 (traits you can see) adds an optional `toSlot` on a cut-out event in `src/match/league/live.ts`
(this plan's file): the receiver's slot, so the view can draw the line. The sim does not
read it, no dice changed, and that line did not move the golden match. The 25 Oct cut above did.

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
rule. N14 turns the rule on for rivals. N14.2's season (10 seeds × 3, Normal,
10,354 rival games) changed a plan 2.51 times a match. Still more than 4 points
off, and left for a later sweep: at a level rating Grind +5.7 and Expansive
−6.9; against strength Expansive −5.7, Kick-chase +4.5, All-out +5.3.
Compressed, which was +6.4 before the rule, is now +0.1. No preset was moved.

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
