# Plan: make Speed count for more so Expansive comes back to the band (#322)

Wave 3, bundle 03. Leon gave the go-ahead for an engine change on 28 Oct
(3:35pm UTC+8). That replaces his 25 Oct decision to park the Expansive gap.
**The style thresholds (`RIVAL_STYLE`, tuning §28) stay frozen.** This file
is the plan. Nothing in `src/` changes until Leon signs it off.

## Where it stands

- **Season (N14.2, #321, and the 25 Oct re-soak after the thresholds moved).**
  At a level rating (clubs within 2 points) Expansive won 43%, which is
  −7.5 off even over 107 sides. Against the strength gap it was −6.4 (730
  sides, standard error 1.8). Every other attack was inside 4 points except
  Kick-chase, at +4.3 against strength, which Leon accepted on 25 Oct.
- **Even matches.** Expansive v Balanced at 60 v 60 is 45.0% (presets plan,
  band 45–55%). The preset sits at the bottom edge of its band but is inside
  it. The 25 Oct sweep of Expansive's own preset knobs (edges, offloads,
  passing, width, early kick, cut-out) moved it by about 2 points, which is
  inside luck.
- **Since the last season soak:** the 26 Oct pass raised `pace.extraPerStat`
  from 0 to 0.03. That made top speed 7.2 / 7.8 / 8.4 m/s at Speed 50 / 60 / 70,
  and nobody has re-soaked the season since. The baseline below is a fresh
  soak on `main` at `bc20536`.

**Baseline soak on `bc20536`: running (10 seeds × 3 seasons, Normal, idle and managed, `--live-rivals`). Its tables go here before sign-off.**

## Hypothesis

The gap comes from the squad, not the preset. A club reads as Expansive when
its backs are at least 1.5 Speed points quicker than its own nine
(`RIVAL_STYLE.backsPace`). Its strength is the mean `overallRating` of its
best nine, and that rating gives Speed a weight of 0.20, ahead of Strength
and Stamina at 0.15 each. So an Expansive club's rating has paid for pace
that the match does not pay back. In contact, Speed is 0.3 of the carrier's
edge and 0.2 of the tackler's, against Strength's 0.5 and 0.6. Momentum moves
a bust by 1 point per m/s and stops at 4. The step uses footwork, which is
(Speed + Skill) / 2. Top speed is the one place Speed counts on its own, and
`rating.spread` (0.2) already shrinks the gap in team-wide speed between two
sides. What survives the spread is each side's own shape: quick backs against
their own forwards. Speed has to pay off where that shape plays, which is the
break and the chase.

If this is right, a side with matched overall ratings that trades Strength
for Speed loses more than it should today, and making Speed count for more
lifts it. That shows up in an even-match test long before a season soak would
show it.

## The numbers to change (at most two)

1. **`pace.extraPerStat`** (`src/match/core/body.ts`, tuning §2): 0.03 now.
   This is extra top speed per Speed point away from 60, kept inside 6–9 m/s.
   It counts in chases, edge runs, support play and the cover defence. It is
   already a knob, so no code is needed to sweep it.
2. **Momentum in the contest** (`contestOdds` in
   `src/match/league/contest.ts`, tuning §4): ±1 bust point per m/s of
   carrier speed minus tackler speed, capped at ±4. It is hard-coded today.
   Before any sweep, it is lifted into a named knob group, `momentum.perMs`
   (0.01) and `momentum.cap` (0.04), with the same values. That changes no
   behaviour and adds no dice, so both pins stay where they are, and the
   tests prove it. This is the line-break lever: a quick man arriving at
   speed busts more often.

The candidate change is the smallest one of these, or a pair of them, that
passes the bar. The carrier-edge weights, the step formula, the style
thresholds and every preset table stay as they are.

## Tooling this needs (harness only, no sim behaviour)

- **The `momentum.*` knobs**, as described above.
- **A styled rival squad in the harness.** A scenario side can set
  `"squad": "rival", "style": "expansive"`. Each seed then draws rival squads
  until the nine reads as that attack under the frozen thresholds. That way
  the harness can play an Expansive rival against a level rival, which is
  what the season counts, in about a minute rather than an hour.
- **`npm run soak -- --tune knob=value`**. This applies harness overrides to a
  soak run, so a candidate can be season-soaked before any default changes.
  It is passed on to the `--jobs` child processes.

## Experiment grid

### Stage A: harness (`balance/plans/expansive-speed.json`)

Whole matches with the break rule on both sides, as a rival-v-rival game has
it.

| Scenario | Why | Seeds |
|---|---|---|
| even 60 v 60 (Balanced / Slide) | Guard: home win, points, tries | 200 |
| expansive rival v level rival (track Expansive, both ways) | **The target**: the season's level-rating row in miniature | 200 each way |
| pace for power, matched rating: Speed 70 / Strength 47 v flat 60, Expansive (track, both ways) | What a Speed point is worth against its rating weight | 200 each way |
| expansive v balanced, even 60 | The even-match preset band, 45–55% | 200 each way |
| grind / kick-chase / all-out v balanced, even 60 | No other preset leaves 45–55% | 100 each way |
| 70 v 50 | Guard: the stronger side still wins about 70% | 80 |

Variants: a sweep of `pace.extraPerStat` over [0.03, 0.045, 0.06] crossed
with momentum written as (`perMs`, `cap`): (0.01, 0.04) today, (0.02, 0.06)
and (0.03, 0.08). That gives 9 cells, with the baseline first. Size: roughly
9 × (200 + 400 + 400 + 400 + 600 + 80) ≈ 19,000 matches. At about 0.75 s a
match on 4 cores, that is about 1 hour. If a corner of the grid is clearly
dead after the first 3 variants, it gets dropped.

From stage A, pick the **smallest** variant that brings the Expansive rival
row within 4 points of even without moving the guard rows past ±5%. Then
pick one more as a fallback.

### Stage B: season soak (the measure in #322)

```
npm run soak -- --live-rivals --seasons 3 --seeds 10 --difficulties normal --jobs 4 [--tune …]
```

This is the N14.2 run size. It plays about 10,000 rival-v-rival games and
takes about an hour on 4 cores. It runs on the baseline (done, above) and on
the one or two stage-A picks. If Expansive at a level rating lands within one
standard error of the band edge, the pick is soaked again at 20 seeds.

## Pass bar

All of these must hold for the candidate:

1. **Season, Expansive:** within 4 points of the strength-adjusted mean
   (difference −4.0 to +4.0), **and** 46–54% at a level rating (within 2
   rating points).
2. **Season, every other style:** every attack and defence that is inside
   both measures today stays inside them. Kick-chase (+4.3 against strength,
   accepted on 25 Oct) gets no worse by more than one standard error.
3. **Even matches:** every attack preset against Balanced, and every defence
   against Slide, stays inside 45–55%.
4. **Within ±5% of today:** home win rate, average points a match and tries a
   match, on the even 60 v 60 row and on the season averages (rival-v-rival
   points and tries). The 70 v 50 row stays near 70%.

If no variant on the grid passes, the change does not ship. The PR reports
the grid and says that, and the gap stays parked.

## After sign-off

1. Lift the momentum numbers into knobs (no behaviour change, pins unchanged),
   add the harness style filter and `soak --tune`, then run stage A and
   stage B.
2. Change the default(s). Update the row in `docs/specs/BAK-208-tuning.md`
   (§2 and/or §4), the spec section they came from, and the run links.
3. Re-pin `8-16:346:3436c830c791688a` and `14-14:385:97934f5b337f329e` in
   `tests/match/balance/balance.test.ts` in the same commit, with the reason
   next to each one.
4. Add a seeded CI test: an Expansive rival against a level rival, both ways,
   over a fixed seed set, asserting the band at a level rating. It is
   deterministic, so it is not flaky. It is sized to run in under about 60 s.
5. Save stays at v21. A `liveMatchRecord` stores the fixture, seed, calls and
   tick, not the events. A match that was in progress before the update
   carries on by re-simulating on the new engine, so the score up to the tick
   it saved at can differ from what was on screen. Every earlier tuning pass
   (26 Oct pace slope, the grubber chase) has worked this way. The PR says so.
