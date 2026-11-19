# Individual challenge pure-engine proposal

Implementation contract for issue #710. Leon approved the combined carry/defend format, dates and rewards. The combat parameters below were tuned against the permanent exact-probability and seeded balance runner; the feature is being built and is not live yet.

## Contest and actor data

Three ordered opponents; player carries then defends against each. Both actors score on their own carry: 0 stopped before the marker; 1 reaches the marker but is held; 2 clear breakthrough. Complete all six clashes. Aggregate player points greater than crew points wins; lower loses. On equality, run exactly one bonus player carry against Mick: score 2 wins, 0 or 1 loses. Explain this host-advantage tie rule before entry. The bonus has a normal attack coaching checkpoint.

All actors expose Strength, Speed, Stamina and Footy IQ, even when one is normally hidden on the squad player page. Freeze the actual participant ID, name, relevant stats and traits at departure. The player's real abilities affect the contest; no generated stand-in. These opponents are dedicated named event characters, not fabricated members of real club rosters. One actor snapshot drives UI and engine. No opponent scaling to player strength.

| Opponent | Edition | Strength | Speed | Stamina | Footy IQ | Defends with | Carries with | Traits |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Gaz “The Gate” | Showground | 53 | 34 | 48 | 40 | Set and wrap | Power through | none |
| Danny “Quickstep” | Showground | 35 | 55 | 44 | 43 | Track the hips | Change the angle | none |
| Big Mick | Showground | 51 | 46 | 56 | 49 | Shoot the hit | Power through | none |
| Gaz “The Gate” | Invitational | 67 | 43 | 61 | 51 | Set and wrap | Power through | none |
| Danny “Quickstep” | Invitational | 44 | 69 | 57 | 55 | Track the hips | Change the angle | none |
| Big Mick | Invitational | 65 | 58 | 70 | 63 | Shoot the hit | Power through | Hitman I |

Publish all stats and fixed patterns before entry; preview the exact next pattern at each checkpoint. The same Mick actor and remaining energy defend the bonus carry, using his listed defensive pattern. No counter-picking, generated trait rolls or random opponent actions. Rival stats/patterns belong to a versioned edition definition, not duplicated presentation constants.

## Energy

Use integer energy units 0–100. Every actor starts with `min(100, 60 + floor(3 * stamina / 10))`.

Player action costs: Power 18, Angle 14, Controlled 7; Shoot 18, Track 14, Wrap 7. Apply the same costs to rival actions. Resolve the clash using both actors' energy before the clash; then subtract each actor's corresponding action cost, clamped at zero. Both participating actors pay once per clash. The player recovers 4, capped at their starting energy, after clash 2 and clash 4; opponents do not recover. Each new opponent starts fresh. There is no recovery before the bonus.

Energy effectiveness is `F(E) = (70 + min(30, E)) / 100`: full effect at 30+, declining linearly to 70% at zero. Every action remains selectable. Show before/after energy and fatigue effect in the option preview. Event energy is local to this event; persistent player condition/fitness is not invented. Injury/suspension/assignment eligibility is evaluated separately against actual existing state.

## Action ability and matchup

Freeze integer challenge ratings as `max(1, min(100, floor(rawStat + 0.5)))` from each real player stat; existing training/decline can leave fractional raw stats. Display these exact rounded challenge ratings and identify them as event ratings. Reject non-finite source values rather than substituting a fictional ability. Inputs below are these integers 1–100. The following formulas yield an integer in tenths without floating-point operations:

- Power attack: `A10 = 8 * strength + 2 * footyIQ`.
- Angle attack: `A10 = 7 * speed + 3 * footyIQ`.
- Controlled attack: `A10 = 6 * strength + 4 * footyIQ - 50`.
- Shoot defence: `D10 = 7 * strength + 3 * speed`.
- Track defence: `D10 = 7 * speed + 3 * footyIQ`.
- Wrap defence: `D10 = 6 * strength + 4 * footyIQ`.

Apply fatigue independently: `AF10 = floor(A10 * (70 + min(30, attackerEnergy)) / 100)` and likewise `DF10`. Clamp the unfatigued attack ability at zero before applying fatigue. Matchup values below are whole rating points added to the attacker’s margin; multiply by 10 in computation.

| Attack / defence | Shoot | Track | Wrap |
| --- | ---: | ---: | ---: |
| Power | -4 | +5 | +4 |
| Angle | +6 | -5 | -2 |
| Controlled | -4 | +1 | 0 |

This is a matchup modifier, never a guaranteed counter. Power exploits light/mobile coverage but invites a strong committed hit. Angle punishes the hit but meets tracking coverage. Controlled sacrifices 5 rating points for lower cost and lower variance; it can still break through when substantially better than the defender.

## Traits

Verified existing IDs: `wreckingBall` (Wrecking Ball), `dontArgue` (Don't Argue), `dancingFeet` (Dancing Feet), `hitman` (Hitman). The measured event bonus is `level` whole rating points (1/2/3 at I/II/III): Power receives the strongest of Wrecking Ball or Don't Argue; Angle receives Dancing Feet; Shoot receives Hitman on defence. Do not stack the two Power traits. Traits add after fatigue. Equal Power bonuses credit Wrecking Ball first, a stable declared tie rule. Explain these event-specific magnitudes in the preview; do not claim they are the live match modifiers. All other traits have no clash effect; normal XP traits remain handled by progression settlement. Brick Wall is excluded because its existing meaning requires two tacklers.

## Random distribution and scoring

One integer random sample `j` uniformly distributed over `{-12, -11, ..., 12}` per resolved clash. Exactly 25 equally likely outcomes. The effective jitter scale in tenths is `q = 40` for Shoot, `q = 32` for Track, and `q = 22` for Wrap. Controlled further uses `q = floor(3*q/4)`, yielding 30, 24, or 16. Thus a committed hit creates more clean stops AND breaks; wrapping narrows outcomes toward held carries; Controlled further narrows outcomes.

Compute:

`M10 = AF10 - DF10 + 10*matchup + 10*attackTraitBonus - 10*defenceTraitBonus + q*j`.

Score 2 if `M10 >= 90`; score 1 if `-90 <= M10 < 90`; otherwise score 0. These exact boundaries, including equality, are tested. `P(score=k)` is the number of the 25 `j` values producing k divided by 25. No separate contact, injury, trait-trigger or animation dice. Extreme ability differences can make an outcome certain; do not secretly clamp probabilities to create upsets.

A stable outcome record includes pre/post energies, both actions, unfatigued/fatigued ratings, matchup, credited traits, random sample, margin and score. The UI gets structured reasons, not an invented causal story: e.g. fatigue penalty, successful matchup, trait bonus and final outcome. Animation must represent 0/1/2 honestly.

Derive a stable event seed from career seed and annual event ID, then derive each
clash sample from that seed and clash index, independent of call or policy. Keep
this RNG isolated from the league RNG. Sampling `j` must be uniform; use the repository RNG's documented bounded-integer behavior or rejection sampling. Persist the event seed and each clash's index-derived roll/result atomically before
presenting the animation; validation recomputes the roll from event seed and
clash number. There is no consumed RNG stream. The pure resolver accepts an explicit j for tests and enumeration. Viewing, replaying or skipping consumes no RNG. Fixed plans consume none.

## Exact, finite auto-coach

The objective is title probability, not immediate expected points. At a coaching checkpoint, evaluate the three legal actions using the same 25-outcome distribution the resolver uses. Auto never reads the saved future RNG state/samples. The public distributions, edition, actor snapshots, known opponent actions, score difference and remaining energy are sufficient.

Memoized value function state: `(clashIndex, playerEnergy, currentRivalEnergy, scoreDifference)`. Actor/edition snapshots are fixed inputs outside the key. Remaining sequence determines the relevant opponent and their fixed action. Enumerate each candidate action's 25 j values, transition energy/score, add the between-opponent recovery where relevant, and select the largest mean continuation value. Fold duplicate resulting scores into multiplicities for efficiency. After clash 6: positive difference has value 1; negative 0; zero enters the bonus state. At bonus, value is probability of score 2 with each attack action against Mick's remaining energy. No continuation after bonus.

Performance bound: for one frozen contest, opponent energy is determined entirely by the clash index because every rival action and its energy cost are fixed; it need not be an independent memo dimension. Use `(clashIndex, playerEnergy, scoreDifference)` as the compact key, deriving rival energy from the fixed sequence. There are at most 8 stages (including terminal), 101 integer player energies, and 13 reachable score differences (-6 through +6), hence fewer than 10,504 conservative state slots; stage-specific reachable bounds make the actual count much smaller. Each nonterminal state considers at most 3 actions and 25 j values (75 classifications), then folds them into at most 3 distinct score transitions. This is under 787,800 classifications for even the deliberately loose bound, not 25^7 path enumeration. Cache the three score multiplicities by `(clashIndex, playerEnergy, action)` because score difference does not affect a clash distribution. The bonus can be evaluated only at scoreDifference=0. A memo/counter test should assert fewer than 10,504 value states and 787,800 classifications for each fixed-input initial solve; report actual counts and measured UI computation time on the supported runtime, rather than claiming an unmeasured millisecond budget. Invalidate the cache whenever the frozen actor snapshot, rule version or edition changes. Manual coaching can query from the current state using the same cache.

For equal title probability, maximize expected final regular-clash score margin
(player points minus crew points), so already-decided clashes still pursue a
personal best. Carry both expected values through the same DP; the bonus changes
title probability but does not add to the regular six-clash score. Then tie-break
equally good policies by lower energy cost, then fixed action order Power/Angle/Controlled or Shoot/Track/Wrap. Persist the policy version and the selected actions. Manual and automatic choices enter the identical resolver. Probability arithmetic may use doubles for value calculation with an explicit equality tolerance `1e-12`; outcome computation is integer-only. A future proof-friendly implementation can compare rational/count values since the horizon is at most seven.

Do not precompute the entire random result path when enabling auto: each action/result commits through the normal boundary. Checkpoints pause clock progression. Skip animation advances only presentation; continuing decisions requires an explicitly enabled auto-coach policy.

## Approved entry, scheduling and starting rewards

Leon approved the following starting terms on 19 November, separately from numerical combat tuning: free entry in weeks 1–5, Showground departure/event week 6 and return week 7; Invitational registration in weeks 9–13 and event week 14 unlocked by first title; each edition can be entered once per season (both editions may be entered in the same season); Showground 60 base completion XP plus 60 winner XP and $8,000 winner cash; Invitational 80 plus 80 and $16,000. Rewards are defined per edition and settled once through explicit receipts, existing XP progression preferences and cash/finance prize accounting. Personal honour and earned invitation require real persisted state, not just celebration text.

A week-6 Showground first title unlocks that same season's Invitational registration in weeks 9–13 for the week-14 event. The once-per-season restriction is per edition, not one event total. Terminal recovery returns the player and preserves settled rewards. Training overlap and whether completion XP substitutes for weekly training must be explicitly defined outside this pure engine.

## Verification and proposed balance gates

No balance result is claimed. These ranges are initial acceptance hypotheses to measure before treating these parameters as settled. They may expose a rule problem rather than justify tuning toward a predetermined result.

1. Deterministic correctness: exact same actor snapshots, j sequence and action sequence produce byte-equivalent outcome records through watched/skipped/reloaded paths. Finite maximum seven clashes. Replaying a committed clash never consumes RNG or settles rewards again.
2. Distribution correctness: enumerating all 25 j values exactly matches the resolver; probabilities sum to one; integer energy never goes negative or exceeds starting energy. Test threshold equalities and all trait levels.
3. Coaching correctness: auto uses no RNG input and agrees with brute-force enumeration on shortened horizons. Provide concrete fixtures in which each of the six choices is uniquely optimal (for at least one current score/energy/opponent state); otherwise redesign/remove the dominated option. The initial six choices must not be defended solely by theoretical plausibility.
4. Position reporting: for both editions, report exact auto-coach title probabilities
for real generated players from every position group, preserving actual hidden
stats in the 10–25 band. This is report-only, with no equal-position target. Entry
previews use this same exact calculation for current ratings and recompute it from
the frozen snapshot at departure.
5. Edition difficulty: neutral no-trait balanced players with all four stats 45 should have an exact auto-coach Showground title probability provisionally 30–65%; balanced 60 players 60–90%. A balanced 45 player's Invitational chance should provisionally be below 30%, and balanced 60 Invitational 30–65%. Raising only relevant abilities must not systematically reduce win probability; speed/strength/IQ improvements cannot reduce the optimal value, with fatigue held consistent. Higher stamina cannot worsen the optimal value either.
6. Approach value: compare always-Power/always-Shoot, always-Angle/always-Track, always-Controlled/always-Wrap, a myopic best-next-score policy and full auto across balanced/power/speed/endurance archetypes (e.g. emphasis 60, others 40). Auto must never underperform any tested fixed policy under exact distributions. Proposed practical target: at least 5 percentage points advantage over one plausible naive policy in at least half the measured near-peer cases. No single fixed policy should win every archetype comparison.
7. Pacing: measure tie-break frequency (initial target 10–35% for near-peer actors), frequency of fatigue before Mick, and action selections by clash. If all sensible policies preserve >30 energy throughout, conserving is not earning its place. If nearly all arrive empty, costs are too punitive. Proposed near-peer auto target: 20–50% of runs use at least one low-cost choice; treat as diagnostic, not artificial quota.
8. Trait bound: measure I and III uplift per fitting trait versus identical no-trait actors. Initial target is positive benefit below 10 percentage points per trait at III for near-peer cases; no stacked Power exploit. XP/traits for rewards are outside clash RNG.
9. Reusable runner: add a permanent challenge-engine test/analysis harness that can enumerate exact auto values and simulate reproducible seed sets for competing policies, with actor matrices, edition, policy version and parameter version in its report. Do not use the full-match balance harness as if this is a league match; reuse its reporting conventions where practical. Report seed count/confidence intervals for sampling, and label exact DP results separately. No throwaway balancing scripts.

These gates include intentionally falsifiable requirements: if Controlled or Wrap is dominated, or the fixed patterns make coaching rote, revise the formulas before implementation is considered designed or balanced.

## Measured starting balance — 19 November 2026

The permanent runner is `npx vite-node scripts/qa-individual-challenges.ts -- --strict-balance`. Its report separates exact public probabilities from sampled outcomes and keeps the complete actor/policy matrix, useful-call witnesses, traits, confidence intervals and computation counts.

The first proposed jitter and trait magnitudes produced a difficulty cliff (balanced 45 Showground 14.7%, balanced 60 100%). Widening the contact variation to the values above and reducing the fitting trait bonus corrected that cliff while preserving the action identities. No dates, rewards or opponent ratings changed.

| Actual rounded abilities, all four | Showground exact Auto title | Invitational exact Auto title |
| --- | ---: | ---: |
| 45 | 35.32% | 7.64% |
| 60 | 83.76% | 40.75% |

The 4,096 paired-seed run passed the strict difficulty, six-useful-calls, approach-value, tie pacing and trait-bound checks. All six calls have reachable situations with a strictly better title chance. All 20 near-peer trait comparisons remained below a ten-percentage-point uplift at level III. Exact probabilities fell inside 243 of 250 per-comparison sampled 95% intervals; these are descriptive intervals, not an additional acceptance gate.

Low-cost-call usage is deliberately a diagnostic: only one of five near-peer actors falls in the provisional 20–50% usage band. The balanced-45 actor conserves in about 37% of runs, while speed favours aggressive calls and several other archetypes always use at least one conserving call. There is no artificial action quota.

A small descriptive sample of 18 genuinely generated players used every real challenge ability, including hidden ratings. Mean Showground/Invitational chances were outside backs 79.72%/42.75%, halves 59.94%/23.42%, hookers 66.15%/27.01%, forwards 73.72%/33.90%; these are not population estimates or position-equality targets. The UI must show each entrant's own exact odds.

Largest observed initial solve: 497 decision states and 5,775 classifications; Node time 0.35–4.95 ms. Browser/mobile measurements and full career/recovery checks remain separate release gates.

The strengthened QA also gates seven roll-distribution checks, all 21 pairs of clash indices, and pooled exact-versus-sampled title rates across independent actor/edition seed blocks. A deliberate missing-roll mutation and reused-first-roll mutation both fail the strict CLI. The report separately shows Auto versus the best fixed coach (2.22–11.99 percentage points in near-peer examples) and versus a sensible myopic coach (0.19–2.34 points); the original five-point-over-one-naive-policy gate does not imply five points of lookahead advantage. Margin-only action witnesses are reported separately and do not satisfy the six-useful-calls gate.
