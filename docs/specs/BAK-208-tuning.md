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
>
> **Try before you change.** Every knob on this page can be overridden by name for an
> experiment without touching the code: `wrestle.gripBase`, `fatigue.runCost`,
> `live.carrySpeed`, `contest.broken`, `traits.hitman`, `presets.defence.rush.lineSpeed`
> (`npm run balance -- --list` prints them all with their values). Write a plan with the
> values to try and run it over many seeds — see `balance/README.md`. The Balance workflow
> re-measures the standard suite whenever the match code changes on `main`.

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
| `live.carrySpeed` | `src/match/league/live.ts` | 0.95 | Carrier's top speed multiplier. 0.92 halved the tries; keep ≥ 0.94. |
| `live.burstTicks` | `live.ts` | 16 | After a break, step or fend the carrier sprints (gas permitting) at least this long. The old ×1.15 burst is retired (F2, §10a); `gas.breakBurst` brings it back for experiments. |
| `live.immuneTicks` | `live.ts` | 8 | Can't be tackled this long after beating a man. |
| `live.beatenCooldown` | `live.ts` | 30 | A beaten tackler sits out before committing again. |
| `ROLES` (lane / atk / def / pull / defPull) | `src/match/league/roles.ts` | table | Where each of the nine stands in attack and defence; `pull` is how far the lane slides toward the ball. Hooker `defPull` 0.4 keeps him in the line. |

## 3. The ruck and the set

| Knob | File | Value | Effect |
|---|---|---|---|
| `live.contactTicks` / `live.downTicks` / `live.ptbTicks` / `live.rollTicks` / `live.dhHoldTicks` | `live.ts` | 9 / 10 / 11 / 4 / 6 | Tackle → down → play-the-ball → heel → dummy-half pause. Sum ≈ 2 s per ruck. `live.contactTicks` / `live.downTicks` now apply to a big hit only; a held tackle is the wrestle and its length sets "down" (§11). |
| `live.onsideM` | `live.ts` | 10 | The defensive line stands 10 m off the ruck. |
| `live.markerReleaseTicks` | `live.ts` | 14 | Markers hold at the ruck this long after the heel (× defence preset `markerHold`). Dropped marker tackles from ~50% to ~25%. |
| `live.busyAfterPtb` | `live.ts` | 24 | The tackled man isn't a pass option this long. |
| `live.passCooldown` | `live.ts` | 12 | No new pass this soon after a catch. |
| `live.restartTicks` / `live.restartMaxTicks` | `live.ts` | 40 / 280 | Kick-off waits for everyone to be set, within these bounds. |
| `live.tryTicks` | `live.ts` | 50 | Celebration before the restart. |
| Dummy-half dart (`live.dartChance`) | `live.ts` `stepRuck` | 8% | Chance the hooker runs instead of passing (also when nobody is a pass option). |

Tests: `tests/match/league/live.test.ts`.

## 4. The contest (§4.1)

Baselines at even stats, one-on-one, square — `src/match/league/contest.ts`:

| Knob | Value | Effect |
|---|---|---|
| `contest.bigHit / broken / fend / offload / strip` | 10 / 12 / 7 / 9 / 2 % | Even-stats outcome odds; held is the remainder. |
| `carrierEdge` weights | atk: Str .5 Spd .3 Skl .2 · def: Str .6 IQ .2 Spd .2; logistic ÷ 22 | How stats tilt the contest. |
| Stat swing | bust ±8, fend ±4.5, offload ±5, big hit ∓7, strip ∓1 pts | Over edge 0…1. |
| Two defenders | bust −6, fend −4, offload −3, big hit +4 | Three: −9 / −6 / −5 / +6. |
| Angle | side: fend +5, big hit −4 · behind: bust +4, fend +3, big hit −6 | From `angleFrom` (cos ±0.5). |
| Momentum | ±1 pt bust per m/s, cap ±4 | Carrier speed − tackler speed. |
| Last tackle | big hit +3 | The defence is set. |
| `stepChance` | 10% + (footwork − defence)/200, side +5, behind −5, cap 0.7 | Pre-contact step, one-on-one only. |
| `knockOnChance` | 4% + (50 − Skill)/1000, pressured +4, rain +6, cap 0.5…40% | Catch on a pass. |
| `interceptChance` | 6% + (IQ − 50)/1000, cut-out ×2, cap 1…60% | Defender inside `live.laneM` of the pass line. |

Geometry that feeds it — `live.ts`: `live.engageM` 4.5 (carrier decides), `live.tackleReach` 1.2,
`live.stepRange` 2.6, `live.secondManM` 3.5 (two-man tackle), `live.offloadM` 5 (support in reach),
`live.laneM` 1.5 (intercept lane), `live.driveBack` 2.5 m (big hit), `live.stepJinkM` 1.6 over
`live.stepJinkTicks` 4. `committed` sends 2 defenders, 3 if a third is within 5 m, 4 when the
line is broken (≤ 2 ahead), + defence preset `commit`.

Tests: `tests/match/league/live.test.ts` (contest block).

## 5. Passing and the backline (§4.2)

| Knob | File | Value | Effect |
|---|---|---|---|
| `PASS_SPEED` | `src/match/core/ball.ts` | 16 m/s | Flat pass speed. |
| `pickReceiver` window | `src/match/league/tactics.ts` | depth 0.3–8 m, lateral 2–`MAX_LAT_M` 12 | Score −\|lat − 6\|·(1 − width) − 0.7·depth + prefer. |
| Pass vs carry (`live.passBase`) | `live.ts` `stepPlay` | 30% + Skill/300 (+ Playmaker, + preset) | When engaged, once per possession. |
| `rolePreference` | `live.ts` | halves +1.5 off the ruck (+0.5 else), forwards +1.2 on tackles 1–3, fullback −0.5 (+ preset) | Who the ball goes to. |
| `live.overlapPrefer` / `live.shiftM` | `live.ts` | 0.8 / 20 m | Receivers on the side with the numbers. |
| `live.runOnM` | `live.ts` | 3 m | Receiver runs through the catch point by this much. |
| `live.ruckAdvanceM` | `live.ts` | 3 m (capped at `atk` − 3 per role) | Backline comes up as the ball is heeled. |
| `leadPoint` | `live.ts` | `runOn(v0, ACCEL, vMax, t)`, never ahead of the passer | Where the pass is thrown. |
| `live.catchReach` | `live.ts` | 1.8 m | Receiver must be this close at landing. |
| `live.pressureM` | `live.ts` | 2 m | A defender this close makes the catch pressured. |

Tests: `tests/match/league/flow.test.ts` (catch speed, loose passes, carry speed).

## 6. Kicks and catches (§4.3–4.4)

| Knob | File | Value | Effect |
|---|---|---|---|
| `KICK_SPEED` / `GRUBBER_SPEED` | `ball.ts` | 20 / 13 m/s | Flight speed; a kick is in the air for max(distance ÷ speed, `hangTime(peak)`). |
| `hangTime` | `ball.ts` | 2√(2·peak / 9.81) | Peaks: long 12 (3.1 s), bomb 20 (4 s), cross-field 13, chip 5, kick-off 16, grubber 0.9 (ground). |
| `RUN_CLOSE_M` / `RUN_IT_ZONE_M` / `RUN_IT_CHANCE` / `ATTACK_KICK_M` | `tactics.ts` | 6 / 40 / 20% / 50 m | Run the last inside 6 m; 1 in 5 inside 40; territory beyond 50. |
| `kickWeights(toLine)` | `tactics.ts` | table (§4.4) | Long / bomb / cross-field / grubber / chip weights by zone, × preset `kickBias`. |
| `live.earlyKickM` + preset `earlyKick` | `live.ts` / `presets.ts` | 25 m, 35% Balanced | Early grubber / chip on the second-last tackle. |
| Targets | `tactics.ts` | grubber +3 m in-goal · chip 10–13 m · cross-field 2 m short, far winger · bomb 22–28 m · long 32 m (× Big Boot) | Where each kick lands. |
| `live.kickCatchReach` | `live.ts` | 2.5 m | Whoever is nearest within this takes a kick (nominated man −0.3 m). |
| `live.dropChance` / `live.dropPressured` | `live.ts` | 6% / 18% − (Skill − 50)/300 | Spill under a kick. |
| `live.fullbackDeepM` / `live.fullbackLastM` | `live.ts` | 16 / 24 m | Fullback depth behind the line; he goes to the landing spot as the kicker shapes. |
| `live.chaseThroughM` | `live.ts` | 2 m | Chasers run flat out until this close. |
| Kick-off target | `tactics.ts` | receiving quarter (x 24), ±12 m | Not chased for a regather. |

Tests: `tests/match/league/kicks.test.ts`.

## 7. Traits (§3)

| Knob | File | Value | Effect |
|---|---|---|---|
| `LEVEL_MULT` | `src/data/traits.ts` | I 1.0 · II 1.6 · III 2.2 | Scales every trait's upside. |
| `TRAIT_COUNT_ODDS` | `traits.ts` | avg 55/30/12/3/0.5 · rookie 70/25/5 · star 30/35/23/9/3 % | How many traits a generated player rolls. |
| `LEVEL_TWO_CHANCE` / `FIT_WEIGHT` | `traits.ts` | 25% / ×3 | Level II at generation; position fit weighting. III is trained only. |
| `TRAIT_PTS` (`traits.*`) | `src/match/league/traits.ts` | Dancing Feet .15 · Wrecking Ball .12 · Don't Argue .12 · Offload King .12 · Razzle Dazzle .20 · Finisher .10/.05/.10 · Hitman .12 · Hothead .12 · Pickpocket .08 · Brick Wall .10 · Last Line .10 · Poacher .10 · Gambler .15 · Playmaker pass .10 · Jets speed .08 · Last Line speed .10 · Big Boot dist .10 / acc .15 | Probability points (or multipliers) at level I. |
| `EDGE_COST` (`edge.*`) | `traits.ts` | Hothead +8% busted/stepped · Razzle Dazzle +10% spill | Fixed downsides of the double-edged traits. |
| `FINISHER_M` | `traits.ts` | 20 m | Red zone where the Finisher fires. |
| `live.wreckDriveChance` / `wrestle.wreckFight` | `live.ts` / `wrestle.ts` | 30% / +30% fight per level | Wrecking Ball keeps driving in a held tackle (DRIVE!): more fight in the wrestle. |
| `live.cutOutPerLevelM` / `live.playmakerWidth` / `live.cutOutChance` | `live.ts` | 4 m / 0.25 / 15% per level | Playmaker reach, width bias and deliberate cut-out. |
| Lab `stars` mode | `src/match/lab/sheets.ts` | two level-III fit traits each | Stress test; `#lab?traits=stars`. |

Tests: `tests/data/traits.test.ts`, `tests/match/league/traits.test.ts`.

## 8. Tactics (§5)

All in `src/match/league/presets.ts`: `attackPlan(preset, zone)` and `defencePlan(preset)`
are plain tables (experiments: `presets.attackDefault.*`, `presets.attack.<preset>.base.*` or
`.zones.<zone>.*`, `presets.defence.<preset>.*`) (see §5.1–5.2 of the design doc for the full grid). `zoneOf(toLine)`
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
| `BAR_W` / `BAR_H` / `BAR_LIFT` / `FIGHT_COLORS` | `src/match/view/wrestleBar.ts` | 30 / 5 screen px, 38 world px / green > 50% > yellow > 25% > red | The wrestle bar over the carrier, a pip per man on him. |

Tests: `tests/match/view/popups.test.ts`, `tests/match/lab/stats.test.ts`, `tests/match/view/wrestleBar.test.ts`.

## 10. Legs (§8)

All in `src/match/league/fatigue.ts`; the tank lives on each player in `live.ts`.

| Knob | Value | Effect |
|---|---|---|
| `fatigue.runCost` | 0.00015 per metre | Running drain (~240 m a minute per player). The main lever on when sides go tired. |
| `fatigue.contactCost` | carrier 0.006 · tackler 0.004 | Per contact, any outcome (and per joiner). |
| `fatigue.wrestleCost` | carrier 0.008 per man per s · tackler 0.006 per s | The wrestle's price. |
| `fatigue.recoverWalk` / `fatigue.walkSpeed` | 0.0002 per s under 1.5 m/s | Getting a breather in play. 0.001 cancelled most of the drain. |
| `fatigue.recoverStop` | 0.002 per s | After a try / before a restart. |
| `drainRate` | 1.5 − Stamina/100, clamp 0.6…1.4 | Stamina 50 ×1, 80 ×0.7, 20 ×1.3. |
| `fatigue.workhorseSave` | 0.1 × level mult | Workhorse I ×0.9, II ×0.84, III ×0.78. |
| `fatigue.tiredAt` / `fatigue.spentAt` | 40% / 20% | Tiers; `tiredness` feeds the contest 0 / 0.5 / 1. |
| `fatigue.tiredSpeed` / `fatigue.spentSpeed` | ×0.9 / ×0.8 | Top speed. |
| `fatigue.gassedReset` | 30% | COOKED! (legs under 20%) is announced again only after he gets back above this. |
| `LEGS_ENERGY` | fresh 1 · late 0.38 · spent 0.18 | Lab Legs picker (`#lab?legs=`). |

## 10a. Sprint and gas (§8.2)

`src/match/league/gas.ts` (`gas.*`) and the who-sprints rules in `live.ts` `assignTargets` (`live.*`).

| Knob | Value | Effect |
|---|---|---|
| `gas.cruise` | 0.94 | Pace when not sprinting. **The main lever on tries**: 0.88 gave 3.9 a match between even sides, 0.94 gives 5.0–5.5, 1.0 restores pre-F2 (7.2). |
| `gas.blown` / `gas.recoverAt` | 0.75 / 25% | Pace with the tank empty, until a quarter is back. |
| `gas.tankBase` / `gas.tankPerStamina` | 0.5 + Stamina/18 s | Seconds of sprint: 2.2 / 3.3 / 4.9 at Stamina 30 / 50 / 80. |
| `gas.refillBase` / `gas.refillPerStamina` / `gas.standRefill` | 12 − Stamina/25 s, ×1.5 standing | Empty to full while cruising (× 0.5 + 0.5 × legs). |
| `gas.jetsTank` | 0.4 × level mult | Jets: a bigger tank (I ×1.4, II ×1.64, III ×1.88). |
| `gas.sprintRunCost` / `gas.cruiseRunCost` | ×1.5 / ×0.9 | Legs cost per metre × `fatigue.runCost`. ×0.9 keeps F's drain (39% at full time, F had 40%). |
| `gas.breakBurst` | 1 (off) | Sprint × this right after a break. Measured: no effect on tries. |
| `live.sprintLaneM` / `live.sprintLaneW` | 15 / 3 m | The carrier goes when nobody is this far ahead in his lane. At 6 m he sprinted off every play-the-ball and ran dry on a third of carries. |
| `live.sprintCloseM` | 8 m | A committed defender sprints the last stretch (all of them when the line is broken). |
| `live.supportSprintM` | 10 m | Support within this of the carrier sprints when he does. |
| `live.runDownTicks` | 120 (6 s) | Caught from behind by a sprinting man this soon after breaking: RUN DOWN!. |

Tests: `tests/match/league/gas.test.ts` (the chase: Speed 90 / Stamina 30 caught inside 35 m by Speed 70 / Stamina 80; with Stamina 70 he gets away), `tests/match/view/sprintLayer.test.ts`.

## 11. The wrestle (§8.1)

All in `src/match/league/wrestle.ts`; `live.ts` `stepWrestle` runs it (and `live.joinM`).

| Knob | Value | Effect |
|---|---|---|
| `wrestle.fightBase` / `wrestle.fightSpread` / `wrestle.fightLegs` | 1.1 s / ±25% roll / −50% spent | Carrier's fight; Str /120 and Sta /240 tilt it. |
| `wrestle.gripBase` / `wrestle.joinGrip` | 1.3 s / +0.35 s per joiner | Defenders' grip; Str /150, IQ /300. Lower → more late busts (1.25 gave ~8 a match). |
| `wrestle.holdLegs` | −40% spent | A tired tackler holds and grips less. |
| `wrestle.gang` | ×1 / ×1.5 / ×2 | Drain for one / two / three men (summed holds × this). |
| `wrestle.maxMen` / `live.joinM` | 3 / 6 m | Most in a tackle; free defenders this close come in to help. |
| `wrestle.driveSpeed` | 1.5 m/s × fight left ÷ men | Metres after contact. |
| `wrestle.ruckQuickTicks` / `wrestle.ruckSlowTicks` | 5 / 18 | Ticks down before the play-the-ball … |
| `wrestle.quickS` / `wrestle.slowS` | 0.35 s / 1.2 s | … for a wrestle this short / long (linear between). QUICK PTB! / slow line at the ends. |
| `wrestle.wrestleMaxS` | 3 s | Held at the latest. |

Tests: `tests/match/league/fatigue.test.ts`.

## 12. Balance targets (§7) and how to measure

Per full Nines match (two 9:00 halves), both sides combined, 60-rated teams: tackles
90–120 · line breaks 8–14 · offloads 8–14 · errors 10–16 · kicks 12–18 · tries 5–9 ·
completion 70–80%; stronger team wins ~70% at a 20-point rating gap. Measure with the
balance harness (`balance/README.md`, the `balance-experiments` skill): `npm run balance`
plays whole matches (§13) over many seeds and marks every count against these bands
(completion is not counted yet). The Balance workflow re-runs `balance/plans/standard.json`
on every match-code change to `main`; the Balanced-v-Balanced test in `presets.test.ts`
still pins the coarse bands so a tuning change that breaks them fails CI.

## 13. The match: clock, halves, points (BAK-207 §5.1, 2a)

Two 9:00 halves of real sim time. The clock runs while the ball is in play (play, tackle,
ruck) and stops from a try to the restart kick. At time up the siren sounds and play goes
on until the ball is dead: a tackle completed, a try (after its celebration), a knock-on,
or a man still down from the tackle when the siren goes. Half-time swaps the ends and the
side that received the opening kick-off kicks off the second half.

| Knob | File | Value | Effect |
|---|---|---|---|
| `rules.halfMinutes` | `src/match/league/rules.ts` | 9 | Length of each half (minutes of sim time). |
| `rules.tryPoints` / `rules.conversionPoints` / `rules.fieldGoalPoints` | `rules.ts` | 4 / 2 / 1 | Points for a try, a conversion and a field goal (penalty goals come with 2e). |
| `rules.halfTimeTicks` | `rules.ts` | 60 (3 s) | The break on screen before the second-half kick-off. |
| `rules.halfTimeLegsBack` | `rules.ts` | 0.5 | At half-time each player gets back this share of the legs he has lost (BAK-208 §8.2); his gas tank is filled to his legs. |
| `rules.playOnMaxS` | `rules.ts` | 60 s | After the siren, the half ends at the next dead ball or after this long, whichever is first. |

Measured over the standard plan, 20 whole matches a row (against single 18-minute
stretches with no half-time): even sides end on 52% legs (35%); stamina 30 v 80 ends
36% / 69% (23% / 63%) and fliers v stayers 34% / 69% (19% / 59%), with the fliers
winning 10% instead of none; COOKED! goes from about 5.6 a match to almost none between
even sides. Tries, breaks, tackles and kicks barely move. With four-point tries only,
30% of even matches are drawn; conversions (2c) will split most of them.

Tests: `tests/match/league/match.test.ts`.

## 14. Interchanges (BAK-207 §5.1, 2b; BAK-208 §8.2)

Each side carries a bench of up to four (`TeamSheet.bench`) and a rotation policy
(`TeamSheet.rotation`: off, standard, heavy; standard by default). After a try the coach
takes off his most tired men, most tired first, each for the freshest bench man who is
fresh enough; each jogs to the nearest touchline and the fresh man jogs on from there. At half-time swaps happen in the
sheds after the break's recovery. A tired start finds the bench rested at `recoverCap`.

| Knob | File | Value | Effect |
|---|---|---|---|
| `bench.size` | `src/match/league/bench.ts` | 4 | Players a sheet's bench holds. |
| `bench.recoverPerMin` / `bench.recoverCap` | `bench.ts` | 0.05 / 0.9 | A benched man's legs come back 5% a minute, up to 90%. |
| `bench.jogOffS` | `bench.ts` | 12 s | The man coming off gets this long to reach the touchline; after that the swap is made where he stands. |
| `bench.standard.offBelow` / `.gain` / `.perStoppage` | `bench.ts` | 0.55 / 0.15 / 2 | Standard rotation: off under 55% legs, for a man at least 15% fresher, two at a time. |
| `bench.heavy.offBelow` / `.gain` / `.perStoppage` | `bench.ts` | 0.7 / 0.1 / 3 | Heavy rotation: off under 70%, 10% fresher, three at a time. |

Rival benches are rolled 3 points under the club's starters (`teamSheetFromRival`).

Measured (20 whole matches a row, flat 60-rated squads): legs at full time 52% with no
benches, 71% on standard (about 6.5 swaps a match, both sides), 68% on heavy (about 10:
it swaps men who are only a little tired, for bench men only a little fresher); heavy
against no bench ends 71% / 52% and wins 50% of matches (20% drawn). Stamina 30 v 80 goes
from 36% / 69% legs to 60% / 71% on standard benches (still no wins, 15% drawn) and to
65% / 72% with the Stamina 30 side on heavy, which wins one in five; fliers v stayers
wins 25% (35% drawn) against 10%. COOKED! all but disappears and late busts halve.
Tackles, breaks and kicks barely move; tries between even sides 5.6 → 6.1.

Tests: `tests/match/league/bench.test.ts`.

## 15. Goal kicking (BAK-207 §5.1, 2c; BAK-208 §4.4)

Every try is followed by a conversion: a Nines drop kick by the scoring side's kicker
(slot 5), taken in line with where the try was grounded and as far back as makes the
posts widest (√(near × far upright offsets), between 10 and 35 m). The clock is stopped.
A kick at goal goes over when its sideways error, normal with a spread of `errorDeg` ×
(1 + metres × `errorPerM`) × (1 − (Skill − 60) × `errorPerSkill`) × Big Boot's accuracy
multiplier, falls inside half the angle the uprights make from the spot. Field goals: in
the last `fieldGoalLastS` of the match, with the kicker's side level or a point behind,
when he has the ball within `fieldGoalRangeM` of the posts on tackle 3 or later, he goes
for it `fieldGoalChance` of the time (decided once a set); `chargeDown` of them are
blocked. A miss is a dead ball: the defence restarts with a tap on their 20 (a stand-in
until 2d's dead-ball restarts).

| Knob | File | Value | Effect |
|---|---|---|---|
| `goals.halfPosts` | `src/match/league/goals.ts` | 2.75 m | Half the gap between the uprights. |
| `goals.errorDeg` / `goals.errorPerM` / `goals.errorPerSkill` | `goals.ts` | 5° / 1/40 per m / 1.2% per Skill point | The kick's sideways error (one standard deviation). |
| `goals.minBackM` / `goals.maxBackM` | `goals.ts` | 10 / 35 m | How far out a conversion is taken. |
| `goals.conversionTicks` / `goals.conversionMaxTicks` | `goals.ts` | 30 / 160 | Lining it up once on the spot (1.5 s); the longest the conversion waits for him. |
| `goals.fieldGoalLastS` | `goals.ts` | 180 s | Field goals only in the last three minutes of the match. |
| `goals.fieldGoalMargin.0` / `.1` | `goals.ts` | −1 / 0 | …with the kicker's side level or a point behind. |
| `goals.fieldGoalRangeM` / `goals.fieldGoalFromTackle` | `goals.ts` | 30 m / 3 | …within 30 m of the posts, on tackle 3 or later. |
| `goals.fieldGoalChance` | `goals.ts` | 0.7 | How often he goes for it when it is on (once a set). |
| `goals.chargeDown` | `goals.ts` | 8% | A field goal charged down: a loose ball. |
| `goals.goalTicks` | `goals.ts` | 30 | The celebration after a field goal before the restart. |

Odds from a conversion spot at Skill 60 (Skill 80 / Big Boot I): under the posts 99%;
grounded 9 m off centre 81% (92 / 88); 14 m off 55% (68 / 63); 20 m off 36% (46 / 41);
in the corner 19–25%. Field goal straight in front: 70% from 20 m, 56% from 25 m.

Tests: `tests/match/league/goals.test.ts`.
