# BAK-208 — Match tuning reference

**Companion to** `BAK-208-match-rules-and-skills.md` (the *why* and the design numbers) and
`BAK-207-live-match-sim.md` (the architecture). This page is the *where*: every knob the
live match sim exposes, its current value, what moving it does, and how to check the
result. Keep it in step with the code: when a constant changes, change the row.

> **How to tune.** 1. Find the knob below and change it in its file. 2. Run the test file
> named in its section (`npx vitest run tests/match/league/<file>.test.ts`) — each mechanic
> has tests that assert the *direction* of its effect and the §7 balance bands, so a bad
> number fails before it ships. 3. Watch it in the lab (`/#lab`, see README): pick teams,
> seed, Skills and the H / A tactics; **⚑ Flag** a moment to pin it. 4. Record the new
> number in the design doc's section and here.

## 1. Clock and field

| Knob | File | Value | Effect |
|---|---|---|---|
| `TICK_MS` | `src/match/core/engine.ts` | 50 (20 Hz) | Sim step. Everything below in "ticks" is multiples of this. |
| `RUN_SPEEDS` | `engine.ts` | ¼ ½ 1 2 4 | Lab playback speeds. |
| `FIELD_LENGTH` / `FIELD_WIDTH` / `IN_GOAL` | `src/match/core/field.ts` | 100 / 68 / 10 m | Pitch. Engine field points (0..100) map onto it. |
| `SET_TACKLES` / `ON_FIELD` | `src/config.ts` | 5 / 9 | Nines: five-tackle sets, nine a side. |

## 2. Bodies and movement

| Knob | File | Value | Effect |
|---|---|---|---|
| `MIN_SPEED` / `MAX_SPEED` | `src/match/core/body.ts` | 6 / 9 m/s | Top speed from the Speed stat (1 → 6, 100 → 9). |
| `ACCEL` | `body.ts` | 9 m/s² | Acceleration and braking cap. Drives the run-on lead (§5 below). |
| `BODY_RADIUS` | `body.ts` | 0.9 m | Separation radius (nobody stands inside anyone). |
| `CARRY_SPEED` | `src/match/league/live.ts` | 0.95 | Carrier's top speed multiplier. 0.92 halved the tries; keep ≥ 0.94. |
| `BURST` / `BURST_TICKS` | `live.ts` | ×1.15 / 16 | Speed burst after a break, step or fend. |
| `JETS_BURST_TICKS` | `live.ts` | 60 | Burst length for a Jets player (3 s). |
| `IMMUNE_TICKS` | `live.ts` | 8 | Can't be tackled this long after beating a man. |
| `BEATEN_COOLDOWN` | `live.ts` | 30 | A beaten tackler sits out before committing again. |
| `ROLES` (lane / atk / def / pull / defPull) | `src/match/league/roles.ts` | table | Where each of the nine stands in attack and defence; `pull` is how far the lane slides toward the ball. Hooker `defPull` 0.4 keeps him in the line. |

## 3. The ruck and the set

| Knob | File | Value | Effect |
|---|---|---|---|
| `CONTACT_TICKS` / `DOWN_TICKS` / `PTB_TICKS` / `ROLL_TICKS` / `DH_HOLD_TICKS` | `live.ts` | 9 / 10 / 11 / 4 / 6 | Tackle → down → play-the-ball → heel → dummy-half pause. Sum ≈ 2 s per ruck. |
| `ONSIDE_M` | `live.ts` | 10 | The defensive line stands 10 m off the ruck. |
| `MARKER_RELEASE_TICKS` | `live.ts` | 14 | Markers hold at the ruck this long after the heel (× defence preset `markerHold`). Dropped marker tackles from ~50% to ~25%. |
| `BUSY_AFTER_PTB` | `live.ts` | 24 | The tackled man isn't a pass option this long. |
| `PASS_COOLDOWN` | `live.ts` | 12 | No new pass this soon after a catch. |
| `RESTART_TICKS` / `RESTART_MAX_TICKS` | `live.ts` | 40 / 280 | Kick-off waits for everyone to be set, within these bounds. |
| `TRY_TICKS` | `live.ts` | 50 | Celebration before the restart. |
| Dummy-half dart | `live.ts` `stepRuck` | 8% | Chance the hooker runs instead of passing (also when nobody is a pass option). |

Tests: `tests/match/league/live.test.ts`.

## 4. The contest (§4.1)

Baselines at even stats, one-on-one, square — `src/match/league/contest.ts`:

| Knob | Value | Effect |
|---|---|---|
| `BASE.bigHit / broken / fend / offload / strip` | 10 / 12 / 7 / 9 / 2 % | Even-stats outcome odds; held is the remainder. |
| `carrierEdge` weights | atk: Str .5 Spd .3 Skl .2 · def: Str .6 IQ .2 Spd .2; logistic ÷ 22 | How stats tilt the contest. |
| Stat swing | bust ±8, fend ±4.5, offload ±5, big hit ∓7, strip ∓1 pts | Over edge 0…1. |
| Two defenders | bust −6, fend −4, offload −3, big hit +4 | Three: −9 / −6 / −5 / +6. |
| Angle | side: fend +5, big hit −4 · behind: bust +4, fend +3, big hit −6 | From `angleFrom` (cos ±0.5). |
| Momentum | ±1 pt bust per m/s, cap ±4 | Carrier speed − tackler speed. |
| Last tackle | big hit +3 | The defence is set. |
| `stepChance` | 10% + (footwork − defence)/200, side +5, behind −5, cap 0.7 | Pre-contact step, one-on-one only. |
| `knockOnChance` | 4% + (50 − Skill)/1000, pressured +4, rain +6, cap 0.5…40% | Catch on a pass. |
| `interceptChance` | 6% + (IQ − 50)/1000, cut-out ×2, cap 1…60% | Defender inside `LANE_M` of the pass line. |

Geometry that feeds it — `live.ts`: `ENGAGE_M` 4.5 (carrier decides), `TACKLE_REACH` 1.2,
`STEP_RANGE` 2.6, `SECOND_MAN_M` 3.5 (two-man tackle), `OFFLOAD_M` 5 (support in reach),
`LANE_M` 1.5 (intercept lane), `DRIVE_BACK` 2.5 m (big hit), `STEP_JINK_M` 1.6 over
`STEP_JINK_TICKS` 4. `committed` sends 2 defenders, 3 if a third is within 5 m, 4 when the
line is broken (≤ 2 ahead), + defence preset `commit`.

Tests: `tests/match/league/live.test.ts` (contest block).

## 5. Passing and the backline (§4.2)

| Knob | File | Value | Effect |
|---|---|---|---|
| `PASS_SPEED` | `src/match/core/ball.ts` | 16 m/s | Flat pass speed. |
| `pickReceiver` window | `src/match/league/tactics.ts` | depth 0.3–8 m, lateral 2–`MAX_LAT_M` 12 | Score −\|lat − 6\|·(1 − width) − 0.7·depth + prefer. |
| Pass vs carry | `live.ts` `stepPlay` | 30% + Skill/300 (+ Playmaker, + preset) | When engaged, once per possession. |
| `rolePreference` | `live.ts` | halves +1.5 off the ruck (+0.5 else), forwards +1.2 on tackles 1–3, fullback −0.5 (+ preset) | Who the ball goes to. |
| `OVERLAP_PREFER` / `SHIFT_M` | `live.ts` | 0.8 / 20 m | Receivers on the side with the numbers. |
| `RUN_ON_M` | `live.ts` | 3 m | Receiver runs through the catch point by this much. |
| `RUCK_ADVANCE_M` | `live.ts` | 3 m (capped at `atk` − 3 per role) | Backline comes up as the ball is heeled. |
| `leadPoint` | `live.ts` | `runOn(v0, ACCEL, vMax, t)`, never ahead of the passer | Where the pass is thrown. |
| `CATCH_REACH` | `live.ts` | 1.8 m | Receiver must be this close at landing. |
| `PRESSURE_M` | `live.ts` | 2 m | A defender this close makes the catch pressured. |

Tests: `tests/match/league/flow.test.ts` (catch speed, loose passes, carry speed).

## 6. Kicks and catches (§4.3–4.4)

| Knob | File | Value | Effect |
|---|---|---|---|
| `KICK_SPEED` / `GRUBBER_SPEED` | `ball.ts` | 20 / 13 m/s | Flight speed; a kick is in the air for max(distance ÷ speed, `hangTime(peak)`). |
| `hangTime` | `ball.ts` | 2√(2·peak / 9.81) | Peaks: long 12 (3.1 s), bomb 20 (4 s), cross-field 13, chip 5, kick-off 16, grubber 0.9 (ground). |
| `RUN_CLOSE_M` / `RUN_IT_ZONE_M` / `RUN_IT_CHANCE` / `ATTACK_KICK_M` | `tactics.ts` | 6 / 40 / 20% / 50 m | Run the last inside 6 m; 1 in 5 inside 40; territory beyond 50. |
| `kickWeights(toLine)` | `tactics.ts` | table (§4.4) | Long / bomb / cross-field / grubber / chip weights by zone, × preset `kickBias`. |
| `EARLY_KICK_M` + preset `earlyKick` | `live.ts` / `presets.ts` | 25 m, 35% Balanced | Early grubber / chip on the second-last tackle. |
| Targets | `tactics.ts` | grubber +3 m in-goal · chip 10–13 m · cross-field 2 m short, far winger · bomb 22–28 m · long 32 m (× Big Boot) | Where each kick lands. |
| `KICK_CATCH_REACH` | `live.ts` | 2.5 m | Whoever is nearest within this takes a kick (nominated man −0.3 m). |
| `DROP_CHANCE` / `DROP_PRESSURED` | `live.ts` | 6% / 18% − (Skill − 50)/300 | Spill under a kick. |
| `FULLBACK_DEEP_M` / `FULLBACK_LAST_M` | `live.ts` | 16 / 24 m | Fullback depth behind the line; he goes to the landing spot as the kicker shapes. |
| `CHASE_THROUGH_M` | `live.ts` | 2 m | Chasers run flat out until this close. |
| Kick-off target | `tactics.ts` | receiving quarter (x 24), ±12 m | Not chased for a regather. |

Tests: `tests/match/league/kicks.test.ts`.

## 7. Traits (§3)

| Knob | File | Value | Effect |
|---|---|---|---|
| `LEVEL_MULT` | `src/data/traits.ts` | I 1.0 · II 1.6 · III 2.2 | Scales every trait's upside. |
| `TRAIT_COUNT_ODDS` | `traits.ts` | avg 55/30/12/3/0.5 · rookie 70/25/5 · star 30/35/23/9/3 % | How many traits a generated player rolls. |
| `LEVEL_TWO_CHANCE` / `FIT_WEIGHT` | `traits.ts` | 25% / ×3 | Level II at generation; position fit weighting. III is trained only. |
| `TRAIT_PTS` | `src/match/league/traits.ts` | Dancing Feet .15 · Wrecking Ball .12 · Don't Argue .12 · Offload King .12 · Razzle Dazzle .20 · Finisher .10/.05/.10 · Hitman .12 · Hothead .12 · Pickpocket .08 · Brick Wall .10 · Last Line .10 · Poacher .10 · Gambler .15 · Playmaker pass .10 · Jets speed .08 · Last Line speed .10 · Big Boot dist .10 / acc .15 | Probability points (or multipliers) at level I. |
| `EDGE_COST` | `traits.ts` | Hothead +8% busted/stepped · Razzle Dazzle +10% spill | Fixed downsides of the double-edged traits. |
| `FINISHER_M` | `traits.ts` | 20 m | Red zone where the Finisher fires. |
| `WRECK_DRIVE_CHANCE` / `WRECK_DRIVE_M` | `live.ts` | 30% / 0.6 m per level | Wrecking Ball drives through a held tackle (DRIVE!). |
| `CUT_OUT_PER_LEVEL_M` / `PLAYMAKER_WIDTH` / `CUT_OUT_CHANCE` | `live.ts` | 4 m / 0.25 / 15% per level | Playmaker reach, width bias and deliberate cut-out. |
| Lab `stars` mode | `src/match/lab/sheets.ts` | two level-III fit traits each | Stress test; `#lab?traits=stars`. |

Tests: `tests/data/traits.test.ts`, `tests/match/league/traits.test.ts`.

## 8. Tactics (§5)

All in `src/match/league/presets.ts`: `attackPlan(preset, zone)` and `defencePlan(preset)`
are plain tables (see §5.1–5.2 of the design doc for the full grid). `zoneOf(toLine)`
splits at 80 / 60 / 40 / 20 m. `rivalTactics(club)` fixes a rival's style from its id and
strength. Lab: H / A pickers, `#lab?hatk=…&hdef=…&aatk=…&adef=…`.

Tests: `tests/match/league/presets.test.ts` (direction of each preset, §7 bands for Balanced).

## 9. Readability (§6)

| Knob | File | Value | Effect |
|---|---|---|---|
| `POPUP_MS` / `POPUP_BIG_MS` | `src/match/view/popups.ts` | 1200 / 1700 ms | Pop-up life. |
| `SLOWMO_MS` / `SLOWMO_FACTOR` | `popups.ts` | 320 ms × 0.3 | Slow-motion beat on big moments (bust, big hit, strip, intercept, regather, try). |
| `WORDS` / `KICK_WORDS` / `TRAIT_COLOR` | `popups.ts` | table / `#d9a5ff` | What is shouted, and the trait line's colour. |
| `BASE_LIFT` / `DRIFT` / `POOL` | `src/match/view/popupLayer.ts` | 40 px / 12 px / 6 | Pop-up placement over the player and how many at once. |
| `CLOSEUP_MS` | `src/match/lab/scene.ts` | 1500 ms | Camera close-up on a big moment. |
| `ZOOM_DEFAULT` / `ZOOM_CLOSE` / `ZOOM_WIDE` | `src/world/readability.ts` | 2 / 3 / 2 (integers) | Camera zooms; integers keep the pixels crisp. |
| Stats strip window | `src/match/lab/stats.ts` `WINDOW_TICKS` | 5 min | `last m:ss · T · Brk · Off · Err · K · Try · Skill`. |

Tests: `tests/match/view/popups.test.ts`, `tests/match/lab/stats.test.ts`.

## 10. Balance targets (§7) and how to measure

Per full Nines match (two 9:00 halves), both sides combined, 60-rated teams: tackles
90–120 · line breaks 8–14 · offloads 8–14 · errors 10–16 · kicks 12–18 · tries 5–9 ·
completion 70–80%; stronger team wins ~70% at a 20-point rating gap. Until Phase 2 adds
the clock, measure per 3 minutes with a throwaway vitest file that steps `LiveSim` over
10–20 seeds and tallies `snapshot().events` by kind (see the "Measured" blocks in PRs
#105–#108 for the pattern); the Balanced-v-Balanced test in `presets.test.ts` pins the
coarse bands so a tuning change that breaks them fails CI.
