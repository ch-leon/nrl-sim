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
| `MIN_SPEED` / `MAX_SPEED` | `src/match/core/body.ts` | 6 / 9 m/s | Bounds on top speed from the Speed stat. |
| `pace.extraPerStat` | `body.ts` | 0.03 m/s | Added per Speed point away from 60, then clamped to 6–9 m/s. The old slope was 0.03; the middle slope is now 0.06, with Speed 60 unchanged at 7.8 m/s. |
| `ACCEL` | `body.ts` | 9 m/s² | Acceleration and braking cap. Drives the run-on lead (§5 below). |
| `BODY_RADIUS` | `body.ts` | 0.9 m | Separation radius (nobody stands inside anyone). |
| `live.separatePasses` / `live.decideEveryTicks` | `live.ts` | 2 / 1 | How many times a tick bodies are pushed apart, and how often players re-pick targets: speed knobs, §23. |
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
| `contest.bigHit / broken / fend / offload / strip` | 10 / 12 / 7 / 12 / 2 % | Even-stats outcome odds; held is the remainder. Offload 9 → 12% in Phase 3 (with `live.offloadM` 5 → 7 m: 2.5 offloads a match → about 10, §7 8–14). |
| `carrierEdge` weights | atk: Str .5 Spd .3 Skl .2 · def: Str .6 IQ .2 Spd .2; logistic ÷ 22 | How stats tilt the contest. |
| Stat swing | bust ±8, fend ±4.5, offload ±5, big hit ∓7, strip ∓1 pts | Over edge 0…1. |
| Two defenders | bust −6, fend −4, offload −3, big hit +4 | Three: −9 / −6 / −5 / +6. |
| Angle | side: fend +5, big hit −4 · behind: bust +4, fend +3, big hit −6 | From `angleFrom` (cos ±0.5). |
| `momentum.perMs` / `momentum.cap` | ±1 pt bust per m/s, cap ±4 | Carrier speed − tackler speed (`MOMENTUM`). Named knobs since #322. |
| Last tackle | big hit +3 | The defence is set. |
| `stepChance` | 10% + (footwork − defence)/200, side +5, behind −5, cap 0.7 | Pre-contact step, one-on-one only. |
| `knockOnChance` | 4% + (50 − Skill)/1000, pressured +4, rain +6, cap 0.5…40% | Catch on a pass. |
| `interceptChance` | 6% + (IQ − 50)/1000, cut-out ×2, cap 1…60% | Defender inside `live.laneM` of the pass line. |

Geometry that feeds it — `live.ts`: `live.engageM` 4.5 (carrier decides), `live.tackleReach` 1.2,
`live.stepRange` 2.6, `live.secondManM` 3.5 (two-man tackle), `live.offloadM` 7 (support in reach; 5 before Phase 3),
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
| `KICK_SPEED` / `GRUBBER_SPEED` | `ball.ts` | 20 / 12 m/s | Flight speed; a kick is in the air for max(distance ÷ speed, `hangTime(peak)`). Grubber was 13; 12 gives the chase a step. |
| `hangTime` | `ball.ts` | 2√(2·peak / 9.81) | Peaks: long 12 (3.1 s), bomb 20 (4 s), cross-field 13, chip 5, kick-off 16, grubber 0.9 (ground). |
| `RUN_CLOSE_M` / `RUN_IT_ZONE_M` / `RUN_IT_CHANCE` / `ATTACK_KICK_M` | `tactics.ts` | 6 / 40 / 20% / 50 m | Run the last inside 6 m; 1 in 5 inside 40; territory beyond 50. |
| `kickWeights(toLine)` | `tactics.ts` | table (§4.4) | Long / bomb / cross-field / grubber / chip weights by zone, × preset `kickBias`. |
| `live.earlyKickM` + preset `earlyKick` | `live.ts` / `presets.ts` | 25 m, 35% Balanced | Early grubber / chip on the second-last tackle. |
| Targets | `tactics.ts` | grubber: inside 16 m, 3 m into the in-goal, else 8 m short; aimed on a winger's lane · chip 10–13 m · cross-field 2 m short, far winger · bomb 22–28 m · long 32 m (× Big Boot) | Where each kick lands. |
| `live.kickCatchReach` | `live.ts` | 2.5 m | Whoever is nearest within this takes a kick (nominated man −0.3 m). |
| `live.dropChance` / `live.dropPressured` | `live.ts` | 6% / 18% − (Skill − 50)/300 | Spill under a kick. |
| `live.fullbackDeepM` / `live.fullbackLastM` | `live.ts` | 16 / 24 m | Fullback depth behind the line; he goes to the landing spot as the kicker shapes. |
| `live.chaseThroughM` | `live.ts` | 2 m | Chasers run flat out until this close. |
| `live.grubberChaseFromM` | `live.ts` | 24 m | Inside this, the wingers start the grubber chase on the second-last tackle. The fullback joins once the kick is aimed. 28 m (25 Oct, first cut) put a try on too many of them. |
| `live.grubberChaseDepthM` | `live.ts` | 10 m | The chase does not sit closer than this to the try line until the kick is aimed. |
| `live.grubberChaseLeadM` | `live.ts` | 3 m | How far in front of the ball the chase may lead before the kick is aimed. 4 m (25 Oct, first cut) did the same. |
| Kick-off target | `tactics.ts` / `kickoff.ts` | receiving quarter (x 24), ±12 m, peak 16 | Not chased for a regather. `kickoff.deepDefault` 0 keeps this; 1 is the deeper default (#397, row below). |
| `kickoff.deepDefault` / `kickoff.deep` (#397) | `kickoff.ts` | 0 (off) · receivers' 15 m line at Skill ≤ 30 to 8 m at ≥ 90, peak 18 | The deeper default kick-off: 35–42 m from halfway (a real one goes 35–45 m), the kicker's Skill picking the depth, the same one draw across. Off until stage 2 of #397 re-pins the match fingerprints. |
| `kickoff.short` (#397) | `kickoff.ts` | 12 m past halfway, peak 20 · regather 25% + 0.5%/pt (best of the 3 nearest chasers' Speed − the catcher's Skill), 15–40% | The Short kick-off call. One draw, only when called. A regather is the kicking side's ball near halfway; a miss is theirs about 12 m from halfway. Measured: 25% over 1,000 even kicks (`kickoff.test.ts`). |
| `kickoff.long` (#397) | `kickoff.ts` | receivers' 5 m line at Skill ≤ 30 to the try line at ≥ 90, peak 20 · dead on the full 10% (3 m past the dead-ball line) · paid off inside 10 m | The Long kick-off call. One draw, only when called. Dead on the full is a penalty to the receivers at halfway (no sin bin). |

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

**Whole matches, Phase 3** (no change made): a club's own generated traits against the same
club with none, 160 matches each both ways round (`20261019-172234-club-traits-whole-match`):
the traited side wins 54% (Reapers, 70), 61% (Mariners, 52), 47% (Larrikins, 42) — an edge,
with team strength still deciding. Every man with two level-3 traits ("stars", the lab's
showcase) wins 84% (`20261019-172010-traits-whole-match`).

Tests: `tests/data/traits.test.ts`, `tests/match/league/traits.test.ts`.

## 8. Tactics (§5)

Current Expansive engagement pass delta (`presets.attack.expansive.base.pass`):
**−0.10**, was 0. Width 0.28, edges +0.8, cut-out 0.02 (0.01 own 20),
offload ×1.3 (0.8 own 20) and early kick 0.18 stay fixed. Measurements and
remaining open items: `docs/status/2026-10-balance.md`.

All in `src/match/league/presets.ts`: `attackPlan(preset, zone)` and `defencePlan(preset)`
are plain tables (experiments: `presets.attackDefault.*`, `presets.attack.<preset>.base.*` or
`.zones.<zone>.*`, `presets.defence.<preset>.*`) (see §5.1–5.2 of the design doc for the full grid). `zoneOf(toLine)`
splits at 80 / 60 / 40 / 20 m. `rivalTactics(club)` fixes a rival's style from its id and
strength. Lab: H / A pickers, `#lab?hatk=…&hdef=…&aatk=…&adef=…`.

**Rush, Phase 3:** busts conceded `presets.defence.rush.broken` 0.05 → **0.11**. Rush beat
Slide 59% over 160 matches (and a coach calling Rush every set won 66%); swept against busts
conceded and the offside rate (`20261019-153211-rush-balance`), Rush now goes 49–50% both ways
round over 240 (`20261019-153630-rush-confirm`): more big hits, many more busts conceded, more
offside penalties. A coach's Rush or Hold call now also sets the offside rate, as the preset
does (it had kept the side's own).

**All-out, Phase 3:** at equal strength each preset against Balanced / Slide over 60 whole
matches (`20261019-165751-presets-whole-match`): Grind 53%, Expansive 47%, Kick-chase 48%,
Rush 48%, Compressed 58% (Balanced v Balanced 57%; one standard error is ~6%) — and All-out
**33%**. A third of contenders (65+) play it. Swept (`20261019-165954-all-out-sweep`): passing
and red-zone early kicks were what cost it; `presets.attack.all-out.base.pass` 0.2 → **0.15**
(Expansive's) and `.earlyKick` 0.45 → **0.3** take it to 41% over 300 matches both ways round
(`20261019-170217-all-out-confirm`) and 44% over 200 (`20261019-170618-all-out-sweep-2`, where
width, cut-outs and offloads moved nothing beyond luck). Still a little below even: the
offloads and the width cost a few balls more than they make.

**N13 (the 45–55% band):** even 60 v 60, calls and the AI coach off, 200 matches each way
(`balance/plans/presets.json`, run `20261024-063629-presets`; one standard error about 2.5
points). Before that pass Compressed won 64% and Expansive 35% (run `20261024-061333-presets-before`,
same 400 matches, on `35afd04`). After:

| Preset | Before | After | What moved |
|---|---:|---:|---|
| Grind | 49.2% | 49.2% | unchanged |
| Expansive | 35.0% | 46.2% | pass +0.15 → 0, cut-out 0.08 → 0.02 (own 20 0.03 → 0.01, so it stays under the new base), width 0.35 → 0.28, early kick 0.30 → 0.18 |
| Kick-chase | 46.5% | 46.5% | unchanged here; step 0.9 → 1 in N13.5 once the other side changes plan (§30) |
| All-out | 38.0% | 54.8% | pass +0.15 → 0, offload ×1.6 → ×1.5, cut-out 0.12 → 0.03, width 0.45 → 0.35, early kick 0.30 → 0.15. 54.8% is seeds 1–200; five blocks of 400 pool to 48.3% (see `docs/status/2026-10-balance.md`) |
| Rush | 57.2% | 49.8% | line speed 6.5 → 6.2 m/s (busts stayed at +0.11: 0.115 already fell to about 45%) |
| Compressed | 64.0% | 49.0% | pull ×1.4 → ×1.1, markers ×1.2 → ×1.05, busts −0.04 → −0.02, step-against −0.02 → +0.03 |

Styles still read as their names (Grind offloads about 6 and completes about 72%, Expansive
about 11 offloads, All-out about 13, Kick-chase kicks about 24, Rush about 34 big hits and
80 breaks, Compressed still bunches). A Grind side that switches to Expansive at half-time
offloads more (5.9 → 8.6 over 40 matches). **Assumed (needs Leon):** the band, and these
numbers. The full before/after is in `docs/status/2026-10-balance.md`.

Tests: `tests/match/league/presets.test.ts` (direction of each preset, §7 bands for Balanced).

## 9. Readability (§6)

| Knob | File | Value | Effect |
|---|---|---|---|
| `POPUP_MS` / `POPUP_BIG_MS` | `src/match/view/popups.ts` | 1200 / 1700 ms | Pop-up life. |
| `SLOWMO_MS` / `SLOWMO_FACTOR` | `popups.ts` | 320 ms × 0.3 | Slow-motion beat on big moments (bust, big hit, strip, intercept, regather, try). |
| `WORDS` / `KICK_WORDS` / `TRAIT_COLOR` | `popups.ts` | table / `#d9a5ff` | What is shouted, and the trait line's colour. |
| `BASE_LIFT` / `DRIFT` / `POOL` | `src/match/view/popupLayer.ts` | 40 px / 12 px / 6 | Pop-up placement over the player and how many at once. |
| `TRAIT_FONT_PX` / fade | `popupLayer.ts` | 16 / 13 px (big / small shout); shout fades from 66% of its life, the trait line from 82% | The trait line under a shout ("DON'T ARGUE II"). Was 14 / 11 px, fading with its shout (#348 M9: small and faded on a phone). |
| `BANNER_MS` / `BANNER_DOCK_MS` | `src/ui/screens/matchOverlay.ts` | try 3200 / kick 2400 ms; docks after 1000 ms | The score banner pops in over the field, then docks as a strip under the scoreboard for the rest of its life (#348 M7). In the colours the side wears on the pitch. |
| `KIT_CLASH_MIN` / `RING_MIN_DELTA` | `src/art/match/kitClash.ts` | 30 / 30 (CIE76 ΔE) | A fixture's kits are compared colour by colour, each weighted by how much of the player sprite it covers. Under 30 the away side wears its alternate strip, or a generated clash strip when the alternate is no better (#340). Each player stands on a ring (`TEAM_RING_W` 15 px, `MatchScene.ts`) in a kit colour picked to be at least 30 from the other side's ring and clear of the grass. A test plays every club pairing, every player palette and every designer alternate. |
| `CLOSEUP_MS` | `src/match/lab/scene.ts` | 1500 ms | Camera close-up on a big moment. |
| `ZOOM_DEFAULT` / `ZOOM_CLOSE` / `ZOOM_WIDE` | `src/world/readability.ts` | 2 / 3 / 2 (integers) | Camera zooms; integers keep the pixels crisp. |
| Stats strip window | `src/match/lab/stats.ts` `WINDOW_TICKS` | 5 min | `last m:ss · T · Brk · Off · Err · K · Try · Skill`. |
| `BAR_W` / `BAR_H` / `BAR_LIFT` / `FIGHT_COLORS` | `src/match/view/wrestleBar.ts` | 30 / 5 screen px, 38 world px / green > 50% > yellow > 25% > red | The wrestle bar over the carrier, a pip per man on him. |
| `FRAME_MARGIN` | `src/match/view/kickLayer.ts` | 76 top / 120 bottom / 40 left / 160 right, screen px | A kick goes wide (N15.3): the band its framing holds the landing, the kicker and the top of the flight in, clear of the scoreboard, the ticker and the speed buttons and the Stats panel. The zoom is the widest whole number from the beat's down to 1 that holds them; when they cannot all fit at 1, the landing first (and `LANDING_INSET`, 40 px, in from the band's edges: room for the men under it), then the kicker, then the top as far as it goes. At 844×390 nearly every kick goes from 2 to 1; at 1280×800 most fit at 2 and only the centre moves. On a phone a long kick holds its landing but loses the kicker about half the time. **Assumed (needs Leon)**: how far it widens. |
| `KICK_OUT_PER_S` / `KICK_BACK_PER_S` | `kickLayer.ts` | 6 / 8 per s | Zoom and pan ease out to a kick (95% in 0.5 s) and back (whole again inside `KICK_RETURN_MS`); the pan's speed cap is lifted for both (`KICK_PAN_MAX_PX_PER_MS`, 1e6). **Assumed (needs Leon)**: the return time. |
| `KICK_HOLD_MS` / `KICK_RETURN_MS` | `kickLayer.ts` | 200 / 800 ms (real) | The framing holds this long after the catch or the bounce, then has this long to get back: back within a second. **Assumed (needs Leon)**: the return time. |
| `TRAIL_FADE_MS` | `kickLayer.ts` | 900 ms (real) | The ball's trail fades out after the kick comes down. **Assumed (needs Leon)**: the trail's look. |
| `CONTEST_M` | `kickLayer.ts` | 9 m | A bomb's or cross-field kick's contest is drawn from the top of its flight: the nearest man of each side within 9 m of where it lands, a ring each in his side's colours; the one who takes it gets a white ring that grows, the others' fade. **Assumed (needs Leon)**: the contest's look. |
| `SKID_LIFT_M` | `kickLayer.ts` | 0.12 m | A grubber's hop that comes down under this leaves a skid mark. **Assumed (needs Leon)**: the skid's look. |
| `TRAIT_MOVE_MS` | `src/match/view/traitLayer.ts` | 1000 ms (real) | How long a trait's move stays up (N15.4): the fend's arm, the step's cut, the cut-out line, the drive, the shock. It fades over the last 280 ms. At ×4 and ×8 (`TRAIT_FAST_FROM`, `TRAIT_FAST_HOLD` 2) it stays up twice as long, and the match eases for `TRAIT_SLOW_MS` 420 ms at factor `TRAIT_SLOW_FACTOR` 0.4, so the camera does not run past it. **Assumed (needs Leon)**: a second, and the longer hold at the fast speeds. |
| `CUT_NEAR_M` / `CUT_END_M` | `traitLayer.ts` | 2.5 m / 0.4 m | A Playmaker's line goes through the teammate nearest him who is within 2.5 m of the line and at least 0.4 m clear of either end. The man beside the ball, not a trailer closer to the line. |
| `trailStyle` | `kickLayer.ts` | plain 5/3 px white; Big Boot 9/5 px `#d9a5ff` | Big Boot's trail is wider and in the trait colour. The kick is already longer in the sim. **Assumed (needs Leon)**: the look. |
| `REPLAY_SECONDS` / `REPLAY_OFFER_MS` / `REPLAY_TICKS` | `src/match/view/replay.ts` | 8 s / 8000 ms / 160 ticks | A try's replay (N15.5): a small **Replay try** chip docked under the scoreboard (#348 M5) counts down eight real seconds; the count stops, and the chip hides, while the half-time card, a sheet or the full-time report is open (#341). Tapping re-simulates the 160 ticks before the try and plays them at ×1. One replay per try. **Assumed (needs Leon)**: eight seconds, one each, ×1. |
| `REPLAY_ZOOM` | `replay.ts` | 1 | The replay's camera, centred on the ball. Wider than the match's 2; the same floor a kick's framing uses. **Assumed (needs Leon)**: how wide. |
| `REPLAY_BLOCK_MS` | `replay.ts` | 300 ms | The re-sim on the main thread, when no Worker is there, may block the page this long. The Worker path times only the hand-off. |
| `POPUP_EDGE` / `POPUP_HALF_W` / `POPUP_LINE_H` / `POPUP_GAP` | `src/match/view/popups.ts` | 8 / 64 / 22 / 2 screen px | A pop-up is clamped inside the camera (N15.6, finding 4). The text hangs up from its anchor; at ×8 a 40 px lift over a man near the top used to leave the screen. Two shouts pulled onto the same edge drop apart by `POPUP_GAP`; a trait line stays on its shout. **Assumed (needs Leon)**: the inset. |
| `CONTEST_MS` / `DRIVE_DUST_M` / `BREAK_SPAN_M` | `src/match/view/contestLayer.ts` | 800 ms / 1 m / 12 m | A big hit puffs dust a metre behind the carrier (the sim already drove him `LIVE.driveBack`, 2.5 m; the view does not move him again). A line break flashes across 12 m of the defensive line, on the point where it broke, not on the sprinter's feet as he runs off it. It fades over the last 280 ms. **Assumed (needs Leon)**: the look, and that the shove is the big hit rather than a new metre of wrestle. |

Tests: `tests/match/view/popups.test.ts`, `tests/match/lab/stats.test.ts`, `tests/match/view/wrestleBar.test.ts`, `tests/match/view/kickLayer.test.ts`, `tests/match/view/traitLayer.test.ts`, `tests/match/view/replay.test.ts`, `tests/match/view/contestLayer.test.ts`.

## 10. Legs (§8)

All in `src/match/league/fatigue.ts`; the tank lives on each player in `live.ts`.

| Knob | Value | Effect |
|---|---|---|
| `fatigue.runCost` | 0.00015 × 9/7 per metre | Running drain. Was 0.00015 on a 9:00 half; ×9/7 keeps the same share of a 7:00 half as tired. The gas tank (seconds of a sprint) is not scaled. |
| `fatigue.contactCost` | carrier 0.006 × 9/7 · tackler 0.004 × 9/7 | Per contact, any outcome (and per joiner). Scaled with the half, 2026-10-25. |
| `fatigue.wrestleCost` | carrier 0.008 × 9/7 per man per s · tackler 0.006 × 9/7 per s | The wrestle's price. Scaled with the half. |
| `fatigue.recoverWalk` / `fatigue.walkSpeed` | 0.0002 × 9/7 per s under 1.5 m/s | Getting a breather in play. 0.001 cancelled most of the drain. Scaled with the half. |
| `fatigue.recoverStop` | 0.002 × 9/7 per s | After a try / before a restart. Scaled with the half. |
| `fatigue.drain.offset` / `.perStamina` / `.min` / `.max` | 1.5 − Stamina × 0.01, clamp 0.6…1.4 | The drain rate `drainRate`: Stamina 50 ×1, 80 ×0.7, 20 ×1.3. `perStamina` is how much Stamina matters (§25). |
| `fatigue.contest.*` | carrierBust / carrierFend / carrierOffload / tacklerBigHit 0.1 · tacklerBust 0.06 | Fatigue weights in the contest recipe (`contest.ts`): a tired carrier −0.1 × tiredness on bust, fend and offload, a tired tackler −0.1 on the big hit and +0.06 to the carrier's bust. |
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

The 26 Oct tuning pass also checks the neutral 60 v 60 guardrails: about
5–6 total tries and 0.20–0.30 grubber tries a match. The report exposes
grubber outcomes and flags those tries, repeat sets at 0.05–0.30, and
drop-outs at 0–0.15. Repeat/drop-out band edges remain provisional; see
`docs/status/2026-10-balance.md`. These rare counts print to three decimals.

Per full Nines match (two 7:00 halves), both sides combined, 60-rated teams: tackles
117–163 · line breaks 10–19 · offloads 6–11 · errors 8–12 · kicks 16–25 · tries 4–7 ·
completion 70–80%; stronger team wins ~70% at a 20-point rating gap. The count bands
were the 9:00-half bands ×7/9, rounded, on 2026-10-25, so a shorter match is not marked
low just for being shorter. Completion is a rate and did not move. Measure with the
balance harness (`balance/README.md`, the `balance-experiments` skill): `npm run balance`
plays whole matches (§13) over many seeds and marks every count against these bands.
**Completion** (`completion`, a share, not scaled for a stretch) is the side's sets not ended
by its own error (knock-on, spilt kick, loose pass), an intercept or strip against it, or a
penalty against it; a kick, a try or a handover on the last completes a set, and six-again
starts a new one (`LiveSim.sets` / `setsCompleted`; counting rolls no dice). Measured
(standard plan `20261019-174119-standard`): 66–70% across the scenarios, even sides 68.2%,
a shade under the 70–80% band; left as is (errors are in their band at 12.7). After the
grubber chase, eased to a 24 m start and a 3 m lead (25 Oct,
`20261025-150020-grubber-ease-confirm`, 80 seeds) even sides complete 70.8%
and score 5.4 tries (grubber tries 0.25). The longer chase
(`20261025-140642-loose-ends`) completed 69.3% and scored 5.6, and a 70-rated
side beat a 50-rated side 69% of the time. Completion
on the eased even row is 70.8%, and tries are inside 4–7. The Balance workflow re-runs `balance/plans/standard.json`
on every match-code change to `main`; the Balanced-v-Balanced test in `presets.test.ts`
still pins the coarse bands so a tuning change that breaks them fails CI.

**Line breaks** (Phase 3) are their own count: in open play the carrier gets
`live.lineBreakM` (1 m) goal-side of every defender but the last man, once per stretch of
play until the next tackle or stoppage. The sim emits `line-break` (the contract's `break`:
season stats and Player of the Match count it). The harness column `lineBreaks` carries the
§7 band; `breaks` counts every beaten tackler (busts, fends, steps) and has no band. Measured
(standard plan, run `20261019-140935-standard`): about 19 a match between even sides
(15–27 across the plan), above the band; the count adds no dice, so no match changed.

| Knob | File | Value | Effect |
|---|---|---|---|
| `live.lineBreakM` | `src/match/league/live.ts` | 1 m | How far goal-side of all but the last man counts as a line break (a measure, not play). |

**Tackles and the band** (Phase 3): between even sides the sim made about 196 tackles a
match, a tackle every 5.5 s of game clock. A real NRL match runs at about 7.5 s a tackle of
game clock (some 640 tackles in 80 minutes) and close to 5 s of ball in play; 90–120 in 18
minutes is 9–12 s a tackle, slower than the real game. The play-the-ball was quick (tackle to
ball played about 2.2 s, NRL about 3 s). Slowed to 3 s, tackles come down to about 170 and
kicks to 20 with tries in the band, but a slower game is less tiring and the legs tuning (§8,
§10a) and the tactics tests were set on the old tempo; a 4.5 s ruck still gives 141 tackles
and drops tries to 4 (tempo sweep `20261019-141554-tempo-2`). **Assumed (needs Leon), 2026-10-19:**
the tempo stays and the bands move to it: tackles 150–210, line breaks 13–24, kicks 20–32
(the old bands scaled ×1.67 low, ×1.75 high; per tackle the sim's line breaks and kicks were
already in them). `BANDS` in `src/match/balance/report.ts` marks the new ones.

## 13. The match: clock, halves, points (BAK-207 §5.1, 2a)

Two 7:00 halves of real sim time (was 9:00; Leon, 2026-10-25, so a watched match is
shorter). The clock runs while the ball is in play (play, tackle,
ruck) and stops from a try to the restart kick. At time up the siren sounds and play goes
on until the ball is dead: a tackle completed, a try (after its celebration), a knock-on,
or a man still down from the tackle when the siren goes. Half-time swaps the ends and the
side that received the opening kick-off kicks off the second half. The measurements in
this section were taken on 9:00 halves.

The rules are the content pack's (#361): the AU pack's values are in `src/content/au.ts`,
and `NINES` in `src/match/league/rules.ts` is that same object, so the knob names are as they were.

| Knob | File | Value | Effect |
|---|---|---|---|
| `rules.halfMinutes` | `src/content/au.ts` (`NINES`, `rules.ts`) | 7 | Length of each half (minutes of sim time). Was 9. |
| `rules.tryPoints` / `rules.conversionPoints` / `rules.fieldGoalPoints` | `au.ts` | 4 / 2 / 1 | Points for a try, a conversion and a field goal (penalty goals come with 2e). |
| `rules.halfTimeTicks` | `au.ts` | 60 (3 s) | The break on screen before the second-half kick-off. |
| `rules.halfTimeLegsBack` | `au.ts` | 0.5 | At half-time each player gets back this share of the legs he has lost (BAK-208 §8.2); his gas tank is filled to his legs. |
| `rules.playOnMaxS` | `au.ts` | 60 s | After the siren, the half ends at the next dead ball or after this long, whichever is first. |

Measured over the standard plan, 20 whole matches a row (against single 18-minute
stretches with no half-time): even sides end on 52% legs (35%); stamina 30 v 80 ends
36% / 69% (23% / 63%) and fliers v stayers 34% / 69% (19% / 59%), with the fliers
winning 10% instead of none; COOKED! goes from about 5.6 a match to almost none between
even sides. Tries, breaks, tackles and kicks barely move. With four-point tries only,
30% of even matches are drawn; conversions (2c) bring that to about 10% (§15).

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
| `bench.recoverPerMin` / `bench.recoverCap` | `bench.ts` | 0.05 × 9/7 / 0.9 | A benched man's legs come back this much a minute, up to 90%. Was 0.05, which reaches the cap across 18 minutes; ×9/7 reaches it across 14. |
| `bench.jogOffS` | `bench.ts` | 12 s | The man coming off gets this long to reach the touchline; after that the swap is made where he stands. |
| `bench.standard.offBelow` / `.gain` / `.perStoppage` | `bench.ts` | 0.55 / 0.15 / 2 | Standard rotation: off under 55% legs, for a man at least 15% fresher, two at a time. |
| `bench.heavy.offBelow` / `.gain` / `.perStoppage` | `bench.ts` | 0.7 / 0.1 / 3 | Heavy rotation: off under 70%, 10% fresher, three at a time. |

Rival benches are rolled 3 points under the club's starters (`teamSheetFromRival`).

Swaps happen only at a stoppage, with one exception: the coach's Fresh legs call (#367,
§20) may swap a man where he stands at a play-the-ball. A man brought on by it counts as
already swapped at that stoppage, so the rotation's own swaps there skip him and his bench man.

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
| `goals.fieldGoalLastS` | `goals.ts` | 140 s | Field goals only in the last 2:20 of the match. Was 180 s, the last sixth of 18:00. |
| `goals.fieldGoalSoonExtraS` | `goals.ts` | 47 s | An AI coach holds his attack call this long before a field goal is on. Was 60; 60 × 7/9, rounded. |
| `goals.fieldGoalMargin.0` / `.1` | `goals.ts` | −1 / 0 | …with the kicker's side level or a point behind. |
| `goals.fieldGoalRangeM` / `goals.fieldGoalFromTackle` | `goals.ts` | 30 m / 3 | …within 30 m of the posts, on tackle 3 or later. |
| `goals.fieldGoalChance` | `goals.ts` | 0.7 | How often he goes for it when it is on (once a set). |
| `goals.chargeDown` | `goals.ts` | 8% | A field goal charged down: a loose ball. |
| `goals.goalTicks` | `goals.ts` | 30 | The celebration after a field goal before the restart. |
| `rules.bonusTryPoints` | `au.ts` | 5 | A try grounded in the **bonus zone**, the in-goal between the posts (Nines; the line counts). |
| `goals.bonusClearM` | `goals.ts` | 5 m | Over the line, the carrier goes round under the posts while no defender is this close; with one closer he grounds it where he is. |
| `goals.bonusMaxTicks` / `goals.bonusDeadM` | `goals.ts` | 50 (2.5 s) / 2 m | …for at most this long, and grounds it before he is this close to the dead-ball line. |

Odds from a conversion spot at Skill 60 (Skill 80 / Big Boot I): under the posts 99%;
grounded 9 m off centre 81% (92 / 88); 14 m off 55% (68 / 63); 20 m off 36% (46 / 41);
in the corner 19–25%. Field goal straight in front: 70% from 20 m, 56% from 25 m.

Measured (standard plan, 20 whole matches a row): about 53% of conversions go over
(3.5 of 6.6 tries between even sides; 7.4 of 11.1 for 70 v 50, whose tries come more
central); field goals are rare, about one match in ten, as in real Nines. Draws between
even sides fall from 30% with four-point tries only to about 10%. Nothing else moves
beyond luck except where the extra stoppages give legs back (fewer swaps in 70 v 50).

**Bonus zone** (Leon, 2026-10-19: in with 2c; current Nines rule). Measured (standard plan,
20 whole matches a row, run `20261019-111110-standard`): 0.3 bonus tries a match between
even sides (of 6.5), 1.0 for 70 v 50 (of 11.3), 0.5–0.8 elsewhere; nothing else moves
beyond luck. Sweep of `goals.bonusClearM` (run `20261019-111152-bonus`): 3 m doubles them
for the stronger side (1.9 a match); 7 m changes nothing. Overlay and banner count five
(**BONUS TRY!**); `bonusTries` report column.

Tests: `tests/match/league/goals.test.ts`.

## 16. Touch, dead ball and restarts (BAK-207 §5.1, 2d; BAK-208 §4.4)

The side that touched the ball last loses it when it leaves the field. **Touch** (a kick
bouncing out, a loose ball, a carrier bundled out): a play-the-ball for the other side,
level with where it went out, 10 m in from touch and at least 10 m off a try line.
**On the full**: the same, level with where it was kicked. **40/20**: a kick from inside the
kicker's own 40 that bounces out inside the other side's 20 — a tap for the kicking side
instead. **Dead** (over the dead-ball line or into touch-in-goal) off the attack, or a kick
grounded by the defender in his own in-goal: a tap on the defence's 20 m line. Dead off the
defence, or a defender held in his own in-goal: a goal-line drop-out (kicked from the middle
of his try line, 38 ± 6 m). A set piece is a stoppage: the clock stops and the coaches can
interchange (§14). All of it is `src/match/league/touch.ts`, played out in `live.ts`.

| Knob | File | Value | Effect |
|---|---|---|---|
| `touch.findTouch.own20` / `.ownHalf` / `.midfield` / `.attackingHalf` / `.redZone` | `src/match/league/touch.ts` | 0.6 / 0.5 / 0.35 / 0.15 / 0 | How often a territory kick goes for touch, by the kicker's zone (else to the fullback as before). |
| `touch.touchInsideM` / `touch.touchScatterM` | `touch.ts` | 4 / 5 m | A touch-finder aims to land 4 m in, ± 5 m (× Big Boot accuracy): past the line is out on the full (about one in ten). |
| `touch.touchRollM` | `touch.ts` | 9 m | A touch-finder rolls on 9–13 m after it lands (other kicks 4–8 m). |
| `touch.fortyTwenty` / `touch.fortyTwentyTrait` | `touch.ts` | 0.08 / 0.2 | On the last inside his own 40, the 40/20 attempt rate, plus this per level of Big Boot or Playmaker. |
| `touch.fortyTwentyLandM` / `touch.fortyTwentyInsideM` | `touch.ts` | 26 / 3 m | Where a 40/20 attempt lands: 26 m from the line, 3 m in from touch. |
| `touch.grubberLongM` | `touch.ts` | 6 m | A grubber runs on up to this far past its spot; past the dead-ball line it is dead. Was 9; with a spot 3 m into the in-goal, 6 keeps a close-in grubber short of the dead-ball line. |
| `touch.grubberInfield` | `touch.ts` | 0.4 | Share of the grubber's aim pulled back from the chasing winger toward the kicker (0 = on the winger). |
| `touch.grubberMissM` | `touch.ts` | 14 m | Scatter either side of that lane. |
| `touch.restartInM` / `touch.restartFromLineM` | `touch.ts` | 10 / 10 m | Restarts 10 m in from touch and at least 10 m off a try line. |
| `touch.bundleNearM` / `touch.bundle` / `touch.bundleBigHit` | `touch.ts` | 1.2 m / 0.4 / 0.7 | A carrier held (smashed) this close to the touchline is bundled into touch this often. |
| `touch.groundNearM` / `touch.groundDeepM` | `touch.ts` | 8 / 3 m | A defender with a kick in his own in-goal grounds it if an attacker is this close or he is this deep; else he runs it out. |
| `touch.setMinTicks` / `touch.setMaxTicks` | `touch.ts` | 30 / 200 | A set piece waits 1.5–10 s for the players to set (and any interchange). |
| `touch.dropOutM` / `touch.dropOutSpreadM` | `touch.ts` | 38 / 12 m | How far a goal-line drop-out goes. |

Measured (standard plan, 20 whole matches a row, run `20261019-113030-standard`), per match
between even sides: 3.0 kicks find touch, 0.45 go out on the full, 0.1 are 40/20s, 0.2
carriers are bundled out, 2.7 dead balls (20 m restarts), 0.4 drop-outs; kicks win about
640 m a match (about 26 m a kick that ends with the other side's ball). **The cost:** tries
between even sides 5.7 → 4.8 a match over 40 seeds (2 standard errors; run
`20261019-113119-2d-tries`), from grubbers that now roll dead and defenders grounding them
in-goal (each about half a try) and territory kicks pinning sides back; left for the Phase 3
balance pass (with #72, the grubber try rate). More stoppages mean more interchanges
(5 → 7 a match).

Tests: `tests/match/league/touch.test.ts`.

## 17. Penalties and six-again (BAK-207 §5.1, 2e)

**Six again** for ruck offences: a small chance at any play-the-ball (a defender lying in or
slow off the ruck), more after a slow wrestle (a tackler holding down). The tackle count goes
back to zero, even on the last (no handover). **Penalties**: offside as the ball is played (by
the defending side's preset: Rush most) and high shots (rare; a Hothead more). The penalty is
brought out to 10 m from the line. The captain's call (`choosePenalty`): **the shot at goal**
(a Nines drop kick, 2 points; from the mark) when it is at least 60% to go over and either the
last 233 seconds with his side no more than 6 behind and no more than 1 ahead, or the half ending
(20 s or the siren); else **tap and go** inside 25 m, or **kick for touch** (25 m × Big Boot
distance, never inside their 10) and a tap 10 m in from touch. A missed penalty goal is dead: a
20 m restart. After the siren only the shot keeps the half alive. Shown as **PENALTY!** over the
offender, the call over the taker (**GOING FOR GOAL**, **TAP AND GO**, **FOR TOUCH**), **SIX
AGAIN!** over the tackler; the commentary says why. Sin bins later (BAK-206 B7).

| Knob | File | Value | Effect |
|---|---|---|---|
| `penalty.ruckSixAgain` | `src/match/league/penalties.ts` | 0.008 | Six again at any play-the-ball. |
| `penalty.holdDown` | `penalties.ts` | 0.08 | Extra six-again chance after a slow wrestle (≥ 1.2 s). |
| `penalty.offside.slide` / `.rush` / `.compressed` | `penalties.ts` | 0.008 / 0.02 / 0.006 | Offside as the ball is played, by the defence preset. |
| `penalty.highShot` / `penalty.highShotHothead` | `penalties.ts` | 0.002 / 0.03 a level | A high shot in a made tackle. |
| `penalty.goalPoints` | `penalties.ts` | 2 | A penalty goal. |
| `penalty.shotMin` / `.shotLateS` / `.shotBehind` / `.shotAhead` / `.shotHalfEndS` | `penalties.ts` | 0.6 / 233 s / 6 / 1 / 20 s | When the captain takes the shot. `shotLateS` was 300 (the last five minutes of 18:00); 300 × 7/9, rounded. |
| `penalty.tapInsideM` | `penalties.ts` | 25 m | Else: tap inside this, kick for touch beyond. |
| `penalty.captainIq` | `penalties.ts` | 0.004 | The captain (N11, §29): the shot needs this much less likelihood per point of Footy IQ above `captainIqMid`, more below. |
| `penalty.captainIqMid` | `penalties.ts` | 60 | The Footy IQ at which the captain moves nothing (a sheet naming no captain reads as this). |
| `penalty.captainHotheadM` | `penalties.ts` | 8 m | A Hothead captain taps from this much further out, per level. |
| `penalty.touchGainM` | `penalties.ts` | 25 m | A penalty kick for touch gains this (× Big Boot distance). |
| `penalty.minTicks` / `penalty.maxTicks` | `penalties.ts` | 40 / 220 | The kick for touch is taken once the kicker is on his mark, 2–11 s. |

Measured (standard plan, 20 whole matches a row, run `20261019-124914-standard`), per match:
2.35 penalties (1.7 offside, 0.65 high shots) and 2.3 six-agains between even sides; slide v
rush 3.0 penalties, the Rush side conceding 1.85 to Slide's 1.15. Calls: mostly for touch
(1.9), some taps (0.45); shots at goal are rare (late and close only). Tries between even
sides 5.55. The extra dice reshuffle every seed; nothing else moves beyond luck.

Tests: `tests/match/league/penalties.test.ts`.

## 18. Weather, injuries and the ball lost in contact (BAK-207 §5.1, 2f)

The match's weather (`MatchResult.weather`, rolled by matchday as today: 60% clear, 25% rain,
15% wind) now changes the play. **Rain**: every pass knock-on, every spilled kick and every
ball lost in the tackle is ×1.6. **Wind**: territory kicks carry 12% further, give or take 15%
a kick, and goal kicks (conversions, field goals, penalty goals) spread 1.4× as wide. **Ball
lost in contact**: a held tackle or a big hit can jar the ball loose, a knock-on (SPILLED!;
the other side's ball), less for a skilful carrier. **Injuries**: a big hit can hurt the
carrier (the old engine's roll on injury risk and Injury Prone, × the difficulty's rate,
scaled to the live sim's 3½× big hits); he plays on at 85% pace (HURT!) until the next
stoppage, when the coach takes him off first for the freshest man on the bench, whatever the
rotation; with nobody left he plays on hampered. Injured men never come back on. `runMatch`
returns the injuries (1–3 weeks, by squad id), which matchday applies as it does today.

| Knob | File | Value | Effect |
|---|---|---|---|
| `weather.rainHandling` | `src/match/league/weather.ts` | 1.6 | Rain: knock-ons, spilled kicks, ball lost in contact ×. |
| `weather.windKick` / `weather.windJitter` | `weather.ts` | 1.12 / 0.15 | Wind: territory kicks (and penalty kicks for touch) carry ×, ± a share per kick. |
| `weather.windGoalSpread` | `weather.ts` | 1.4 | Wind: goal kicks' aim error ×. |
| `weather.lostHeld` / `weather.lostBigHit` | `weather.ts` | 0.006 / 0.03 | Ball lost in a made tackle / a big hit. |
| `weather.lostSkill` | `weather.ts` | 0.0001 a point | Less for each point of the carrier's Skill over 50. |
| `weather.injuryBase` / `weather.injuryPerRisk` | `weather.ts` | 0.005 / 0.036 | Injury on a big hit: base + risk/100 × perRisk (the old engine's 0.015 / 0.1, scaled). |
| `weather.injuryProne` | `weather.ts` | 1.4 | × for an Injury Prone carrier. |
| `weather.hurtSpeed` | `weather.ts` | 0.85 | A hurt man's top speed × until he comes off. |

Rain's break penalty in the old engine (breaks ×0.8) is not carried over: rain shows in the
handling instead.

Measured (weather plan, 60 whole matches a row, run `20261019-132027-weather`), even 60 v 60
per match: errors 13.6 clear, **20.9 rain**, 12.3 wind; balls lost in contact 1.65 / 2.8 /
1.5; conversions 55% clear, 50% rain, **44% wind**; kick metres 574 clear, **621 wind**
(rain 509: fewer long kicks get away). Injuries 0.15–0.33 a match (the old engine 0.31; the
standard plan 0.1–0.55 by scenario). The standard plan (run `20261019-131950-standard`): errors
up about 2 a match (the ball lost in contact), still inside §7; nothing else beyond luck.

Tests: `tests/match/league/weather.test.ts`.

## 19. How much a rating gap counts (BAK-207 Phase 3, #87)

Every contact, sprint, step and pass leans to the better player, and over a match's two
hundred contacts the leans compound: with the sheets as written a 10-point gap won 97% and a
20-point gap every match, 70 v 35 by about 19 tries (the §7 target is about 70% at 20).
Before a match each side's stats are moved together toward the match average, keeping
`spread` of the gap between the sides: a 20-point gap plays as 4. Every player keeps his
edge over his teammates (a side's star still beats its weakest man by as much), and two
weak sides still play like weak sides (the move is toward the two sides' own average).

The opening kick-off is now a seeded coin toss: home always received it before, and between
even sides home then won only a third of matches (80 matches with away receiving: 50%).

| Knob | File | Value | Effect |
|---|---|---|---|
| `rating.spread` | `src/match/league/spread.ts` | 0.2 | Share of the gap between the sides' average stats that is kept (1: as written). |

Measured (run `20261019-135855-spread-confirm`, 80 whole matches a row; before: `20261019-134245-gaps`):

| Matchup | Stronger side wins, before → after | Tries, before → after |
|---|---|---|
| 60 v 60 | home 33% → 54% (the coin toss) | 5.5 → 5.6 |
| 70 v 50 / 50 v 70 | 100% → 74% / 81% | 11.3 → 5.7 |
| 70 v 35 | 100% → 93% | 18.5 → 5.9 |
| Stingrays (68) v Larrikins (35) | 100% → 90% | 18.2 → 6.3 |
| Wolves (71) v Crocs (60) | — → 60% | — → 5.4 |

The sweep (`20261019-135126-spread-2`, 40 a row): 0.3 gave 95% at a 20-point gap, 0.25 84%,
0.2 72%, 0.15 69%. Team-wide stat gaps all count for less, by design: in the standard plan
stamina 30 v 80 now goes 40% to the low-stamina side (was 10%), fliers v stayers 30% (was
35%), and 70 v 50 lost 6 tries a match. The legs mechanic test plays its sheets as written.

**Difficulty in the match (N12.2).** On Hard the player's rival plays with an edge, on Easy he
gives one away: `rivalEdge` rating points on every stat of every one of the rival's players,
starters and bench, added **after** the spread (`edgeSheets` in `spread.ts`, clamped to 1–100,
so each man keeps his edge over his teammates). `matchday.ts` names the rival's end and the
points (`rivalEdge`) and the live sim applies them (`LiveOptions.difficultyEdge`, carried by
the match on screen, its resume and fast-forward alike). Added before the spread the edge would
keep a fifth. Until N12.2 the difficulty multiplied the rival sheet's aggregates (×1.1 Hard,
×0.92 Easy, `scaleSheet`), which the live sim never reads: it changed no match (run
`20261020-114213-difficulty-scale`, three identical rows; a unit test in `matchday.test.ts`).
The strength-built fallback (a rival short of nine fit) gets the same edge on its generated
players. Normal has none, so its matches are exactly as they were: the standard plan's seven
cells are identical to the run before (`20261021-075107-standard` and, after the rebase onto
`main` at ea12527, `20261021-091408-standard` at f919d13, against `20261021-014058-standard`;
`git diff 6718006 ea12527` touches nothing under `src/match`, `src/sim`,
`src/systems/matchday.ts` or `src/data`, only `src/config.ts`, N12.3's overhead field and
ticket price, which no match reads). Rival-v-rival rounds (§24) have no difficulty.

| Knob | File | Value | Effect |
|---|---|---|---|
| `difficulty.hard.rivalEdge` | `src/config.ts` (`DIFFICULTY`) | +0.5 | Rating points on every stat of Hard's rival, after the spread. A point moves the player's even-rated win rate about 6 points. |
| `difficulty.easy.rivalEdge` | `src/config.ts` (`DIFFICULTY`) | −2 | The same for Easy's rival (negative: he plays weaker). |
| `difficulty.normal.rivalEdge` | `src/config.ts` (`DIFFICULTY`) | 0 | Normal: no edge, the match as before. |

**Target (Assumed, needs Leon):** against a rival level with his best nine, the player wins
about 8 points less on Hard than on Normal and about 8 more on Easy (N12, re-baselined in
`docs/status/2026-10-season.md`: the soak puts Normal at 58% within ±5 rating points, so about
50% and 66% there). Read in the harness, where Normal stands at 55%: each seed a new game's
squad on that difficulty through its opening lineup against a rival's generated squad level
with its best nine, both ways round (`balance/plans/difficulty.json`, a scenario per
difficulty; `difficulty-sweep.json` sweeps the edge).

The sweep (`20261021-042801-difficulty-sweep`, seeds 1–150, 300 matches a row, ±2.9; the
player's win rate and margin a game, a draw not a win):

| Edge (Hard +n, Easy −n) | Hard | Easy |
|---|---|---|
| none (before) | 49.7%, +0.3 | 51.0%, +1.4 |
| 0.5 | 45.3%, +0.1 | 56.3%, +3.2 |
| 1 | 41.7%, −1.3 | 56.0%, +3.6 |
| 1.5 | 40.7%, −3.4 | 59.3%, +4.7 |
| 2 | 35.7%, −3.9 | 61.0%, +6.2 |
| 3 | 31.7%, −5.4 | 66.0%, +8.3 |

With no edge, Hard's and Easy's new-game squads already win about 4 points less than
Normal's against a level rival (below), so Hard's rival needs half a point and Easy's two.
Confirmed on fresh seeds (`20261021-081159-difficulty`, seeds 1001–1200, and
`20261021-082512-difficulty-2001`, the same plan on 2001–2200; 800 matches a difficulty, ±1.8):

| Difficulty | Player win, no edge | Player win, the edge | Against Normal | Margin a game |
|---|---|---|---|---|
| Easy (−2) | 51.0% | **63.6%** | **+8.4** | +1.6 → +5.4 |
| Normal (0) | 55.2% | 55.2% | — | +2.6 |
| Hard (+0.5) | 50.9% | **47.9%** | **−7.3** | +1.9 → +0.9 |

Tests: `tests/match/league/spread.test.ts` (the spread; the edge: bench included, clamped,
every man's edge over his teammates kept, none on Normal); `tests/systems/matchday.test.ts`
(the aggregates never played; Hard's rival stronger after the spread, Easy's weaker, Normal's
untouched; the fast-forwarded match plays the same edge; the fallback sheet);
`tests/systems/difficulty.test.ts`; `tests/match/balance/balance.test.ts` (squad-built sides,
the knob by name); kick-off tests in `live.test.ts`, `match.test.ts`.

## 20. Coach calls (#73, `docs/specs/coach-calls.md` step 1)

A call is an input to the running sim at a tick (`LiveSim` option `calls`, or `call(side, c)`):
the same seed and calls give the same match, and no calls plays exactly as before (same
results, byte for byte). One call a set each way: one while the side has the ball, one while
it defends; a new set (the ball changes hands, or the count goes back) frees both. Play calls
(Hit-up, Shift) last until the next tackle; the rest last the set. Each call is announced
(`coach-call`, the call's name as a pop-up over the man it goes through). Calls refused now
say why ("not your ball", "one call a set", "tackles 3–4", "late in the set", "not in range").

| Knob | File | Value | Effect |
|---|---|---|---|
| `calls.hitUp.hitUps` / `.pass` / `.step` / `.offload` | `src/match/league/calls.ts` | +2 / −0.3 / at most 0.3 / ×0.5 | Hit-up: the forwards take it on, fewer passes, steps and offloads. |
| `calls.shift.width` / `.cutOut` / `.edges` / `.sidePrefer` | `calls.ts` | +0.4 / +0.25 / +1 / +2 | Shift left / right: width and the edges, receivers on the called side preferred (left is +y going +x). |
| `calls.kickEarlyFrom` | `calls.ts` | 2 | Kick early from this many tackles (3–4): grubber or chip inside 25 m, a long kick beyond. |
| `calls.lastFrom` | `calls.ts` | 3 | Run it / Bomb from this many tackles: the last-tackle call is run or bomb. |
| `calls.paid.hitUpM` / `.shiftM` / `.kickM` / `.rushM` / `.holdM` | `calls.ts` | 3 / 8 / 30 / 8 / 15 m | When a call paid off (the stats line, the commentary): a hit-up's play gains 3 m; a shift's 8 m (or breaks the line, or scores); a kick early or bomb gains 30 m (or is regathered, dropped, forces a drop-out, finds a 40/20, or scores); a rushed set's furthest tackle under 8 m, a held set's under 15 m (or the attack turns it over). Run it pays off on a try or a penalty to them, Field goal when it's over. Display only: the match is the same. |

Rush and Hold set the defence to Rush or Compressed for the set; Field goal is offered only
when the 2c field-goal rule is on, and then the kicker drops for goal.

**The AI coach and the Coach's Office (N9.6).** A rival coach can make his own calls (`LiveSim`
/ `runMatch` option `aiCoach`, the sides that have one; the game gives every rival coach one
when `calls.ai.on`, which is off, so a match with no calls still plays as `runMatch`). His
rules roll no dice, and the same refusals as the player's chips apply: a field goal when one is
on (and in the last minutes of a close match he saves his attack call for it); a shift toward
an overlap; Rush when defending near his own line. The player's chips are unlocked by his
Coach's Office (the best one built): none built, Hit-up and Hold; level 1 adds Shift left /
right and Rush; level 2 Kick early and Run it; level 3 Bomb and Field goal (#396 added Offload and
Gang tackle at 1, Grubber, Take the two and Tap and go at 2, 40/20 at 3: "More calls" below). The lab's `ai=1`
gives both coaches the AI; the harness's `aiCoach` scenario field names the sides (absent, both
when `calls.ai.on`).

| Knob | File | Value | Effect |
|---|---|---|---|
| `calls.ai.on` | `calls.ts` | 0 | 1 gives every rival coach (both in a rival-v-rival match, the player's opponent) his own calls. |
| `calls.ai.overlap` | `calls.ts` | 2 | Shift when the attack has this many more men than the defence on one side of the ball. |
| `calls.ai.rushOwnM` | `calls.ts` | 20 m | Rush when defending this close to his own line. |
| `CALLS.unlocks` | `calls.ts` | Hit-up, Hold, Fresh legs · +Shift ×2, Rush, Offload, Gang tackle · +Kick early, Run it, Grubber, Take the two, Tap and go · +Bomb, Field goal, 40/20 | The calls each Coach's Office level adds (index = level; #396's calls in "More calls" below). Not a number, so not a harness knob. |

Measured (`20261020-021804-ai-coach-calls`, 120 whole matches a row, one side's coach on the AI):
about 23 calls a match, 5 of them paying off; between even sides the AI side wins 51% (no AI:
50%); the 50 against a 70 holds the favourite to 70% (75% with no AI), inside about one standard
error; tries 5.9 → 5.5 a match (Rush near his own line). Overlap 1 calls 33 a match and wins 44%
(shifting at any overlap costs), overlap 3 calls 8 and changes little; Rush from 35 m concedes
more busts (26 v 23). So the AI coach is fair rather than strong at 2 / 20 m, and stays off
(`calls.ai.on` 0) until a balance pass turns it on.

**Calls that paid off** (`CallJudge` in `calls.ts`, spec §3's last column; run
`20261019-164411-calls-paid-off`, 12 whole matches a row, one side making the same call
whenever it may): Kick early 65%, Rush 65%, Hold 74%, Hit-up 29%, Shift 23%, Bomb 10%, Run it
6%. The spec's 25 m for Hold paid off 88% of the time (run `20261019-163753-calls-paid-off`;
sets in this sim gain little: the tempo question in the sprint log), so it is 15 m; Rush and
Shift had no metres in the spec. A rushed or held set the other side never ran (called as it
ended) lapses unpaid. The judging rolls no dice: in that run every count but `callsPaid` was
identical across the threshold variants.

**Is a call a free win?** (run `20261019-153804-calls-strength-3`, 100 whole matches a row, even
sides, one side making the same call whenever it may; no calls: home 51%): Rush 53%, Hold 55%,
Kick early 52%, Bomb 47%, Shift left 46%, Hit-up every play **36%** (the forwards taking every
carry costs). None wins much by being spammed; Hit-up is a call for the moment.

Measured (run `20261019-145023-coach-calls`, 20 whole matches a row, one side making the same
call whenever it may, even 60 v 60): Run it kicks 20.8 → 10.7 a match (and that side wins 25%:
never kicking costs); Kick early 20.8 → 32.4; Rush big hits 26 → 32.6 and busts conceded
22.9 → 30.9; Hold busts conceded 22.9 → 17.4 and line breaks 19.8 → 16.5; Hit-up fewer steps
and offloads and line breaks 19.8 → 17.3; Field goal is rarely available (0.1 a match).

**Fresh legs (#367).** A bench call: neither attack nor defence, made with or without the
ball, and it uses up neither of the set's calls. Once a half per side (golden point gets its
own), unlocked at level 0, never made by the AI coach. It is on offer while a man on the
field (not in the bin, not already going off) has legs under `offBelow` and an uninjured bench
man has at least `onAtLeast`; refused, it says "no one’s tired yet", "bench is spent" or "used
this half". The pick (`pickFreshLegs` in `bench.ts`), made when it lands: the man with the
fewest legs under the line (ties by slot) for the freshest bench man at or above it, from his
position group first (forwards: hooker, prop, second-row, lock; halves; outside backs), ties
by bench index. Where it lands: the next play-the-ball where that man is free (not playing the
ball, the tackler, a marker, the dummy-half, holding it or locked), swapped where he stands;
else the next stoppage, where he jogs off as a rotation swap does and the rotation's own swaps
skip him and his bench man; else in the sheds at half-time, picked on first-half legs. It pays
off when the swap is made (`interchange` with detail `fresh-legs`, then `call-paid`). If
nobody is tired any more when it could land (his man went to the bin, or got his legs back),
it lapses unpaid and the half's call comes back; a call still waiting at full time stays
unpaid. It rolls no dice, and with no call made nothing about the match changes (both
fingerprint pins hold).

| Knob | File | Value | Effect |
|---|---|---|---|
| `calls.freshLegs.offBelow` | `calls.ts` | 0.4 | On offer while a man on the field has fewer legs than this (the same line as `fatigue.tiredAt`, but its own number, so moving it leaves the contest alone). |
| `calls.freshLegs.onAtLeast` | `calls.ts` | 0.4 | …and an uninjured bench man has at least this. |
| `calls.freshLegs.perHalf` | `calls.ts` | 1 | Calls a side may make a half (0 switches it off: "used this half"). |

Measured (`balance/plans/fresh-legs.json`, run `20261027-173315-fresh-legs`, 40 whole matches
a row, even 60 v 60, the home coach calling it whenever he may; and run
`20261027-173402-fresh-legs-squads`, game-built player v rival squads). How often it is on
offer, out of two halves a match: at 0.40, **0.23 calls a match on standard rotation** (0.33
with game squads) and 0.75 with rotation off (0.85); at 0.55, about 1.45 on either (1.65).
Standard rotation already takes men off under 0.55 at every stoppage, so a man under 0.40 is
rare. Paid: 0.15 of 0.23 and 0.60 of 0.75 at 0.40, 1.38 of 1.45 at 0.55 (the rest made in
the last seconds of the match). Subs a match (both sides) 3.02 → 3.40 on rotation off, 4.78 →
4.67 on standard (it gets in ahead of a rotation swap). No starred change to tries, legs or
the home win; with no call every row is identical to its no-call twin.

The harness takes calls per scenario (`"calls": { "home": [{ "call": "rush" }] }`, optionally
`"tackle": 2`) and counts `coachCalls`; the lab shows chips for either coach with `#lab?calls=1`.
Tests: `tests/match/league/calls.test.ts`, `tests/match/league/freshLegs.test.ts`.

**More calls (#396; spec `coach-calls.md` §10).** Offload (level 1, with the ball on tackles 1–4,
the next two carries), Gang tackle (level 1, defending, the next two tackles), Grubber (level 2,
from tackle 4 inside their 25), Take the two / Tap and go (level 2, a penalty won in range, over
the captain's choice; neither of the set's calls) and 40/20 (level 3, from tackle 4 behind his own
40 and in reach of their 20). Refusals: "tackles 1–4", "not inside their 25", "not behind your
40", "out of reach of their 20", "the kick’s away", "no penalty", "one call a penalty", "too far
out", "the captain’s call", "the siren’s gone". None rolls a die it would not
roll anyway, and no state they add is read without a call: no calls plays as before (both
fingerprints unchanged). The AI coach doesn't make them.

| Knob | File | Value | Effect |
|---|---|---|---|
| `calls.offload.offload` / `.spill` | `calls.ts` | +0.5 / +0.04 | Offload: the plan's `offload` becomes at least 1 plus this (about +6 points on a 12% contest, even in a plan that tucks it, offload 0), and an offload pass is spilled this much more often. |
| `calls.offload.plays` / `.beforeTackle` | `calls.ts` | 2 / 4 | Offload lasts this many carries, and is made with fewer than this many tackles done (tackles 1–4). |
| `calls.gang.commit` | `calls.ts` | +1 | Gang tackle: one more defender commits to the carrier (the defence plan's `commit`). |
| `calls.gang.downTicks` | `calls.ts` | 6 ticks | …the ruck takes this much longer to clear (a slower play-the-ball; the tacklers lie on too). |
| `calls.gang.stepAgainst` | `calls.ts` | +0.2 | …and with a man more in the tackle the edges are thin: a carrier one-on-one steps his man this much more often (the defence plan's `stepAgainst`, as Rush). |
| `calls.gang.tackles` | `calls.ts` | 2 | Gang tackle lasts this many tackles. |
| `calls.grubberInsideM` | `calls.ts` | 25 m | Grubber is on with the ball this close to their line (from tackle 4, `calls.lastFrom`); the last-tackle kick is a grubber. |
| `calls.fortyTwentyFromM` | `calls.ts` | 60 m | 40/20 is on with the ball at least this far from their line (behind his own 40), from tackle 4. |
| `calls.fortyTwenty.reachM` / `.scatter` | `calls.ts` | 35 m / 0.6 | The called 40/20 lands `touch.fortyTwentyLandM` (26 m) from their line, but no further from the kicker than this (× Big Boot distance × the wind); scattered this much × his accuracy (the sim's own 40/20 attempt: 0.6). It is offered only in reach: the ball no further from their line than 20 + `touch.touchRollM` (the shortest roll on) + this, 64 m for a kicker with no Big Boot in no wind. A kick the last carry took out of reach is said as a kick for touch. |
| `calls.penaltyShotMin` | `calls.ts` | 0.35 | Take the two / Tap and go are offered on a penalty won when the shot at goal from the mark is at least this likely ("too far out"). |
| `calls.paid.gangM` | `calls.ts` | 10 m | Gang tackle paid off when its two tackles give up less than this (or the defence wins the ball). Display only. |
| `CALLS.unlocks` | `calls.ts` | +Offload, Gang tackle · +Grubber, Take the two, Tap and go · +40/20 | #396's calls by Coach's Office level (1, 2, 3), in the full list in the row above. Not a number, so not a harness knob. |

With Grubber or 40/20 called, the kicker keeps the ball for the last tackle (no early kick on
tackle 4), the dummy-half gives it to him when he is free instead of rolling for a dart, and the
call sets his kick even when it comes after his own choice, until the kick is struck ("the kick’s
away"). A 40/20 pays off only on touch inside their 20 (not a regather, a drop or a drop-out off
it).

**Sized by** `balance/plans/experiments/20261028-more-calls*.json` (balance log), even sides,
200 seeds both ways round (400 matches a row), the home coach making the one call whenever he
may. First drawn, Gang tackle won **62.3%** (run `20261028-115519-more-calls`; no calls 48.3%)
and 40/20 **63.0%**. Gang tackle's strength is the extra man (without it 51.2%; one tackle
instead of two 57.5%; no slower ruck 59.3%, run `20261028-120334-more-calls-gang`), and bunching
its line (`pull` ×1.2 → 2) made it stronger, 68–70%, so "more space out wide" became the edge
step: +0.16 57.0%, +0.25 43.5% (run `20261028-121151-more-calls-gang2`). 40/20 aimed 26 m out
from anywhere behind his own 40 is a 60 m kick from deep; capped at 32 m it won 45.8% but found
the 40/20 on 2% of calls, at 38 m 54.8%, at 44 m 58.0% (runs `20261028-120027-more-calls-4020`,
`20261028-121503-more-calls-4020b`). At 35 m (run `20261028-121735-more-calls`) it won 54.8%, offered
anywhere behind his own 40 (7.3 calls a match, most of them out of reach); offered only in reach
(review of #405), it is on half as often.

At the defaults (run `20261028-133951-more-calls`; Offload, Gang tackle and the penalty pair play
exactly as in `20261028-121735-more-calls`):

| Called whenever he may | Calls a match | Paid off | His side wins | Moved (both sides, a match) |
|---|---:|---:|---:|---|
| No calls | – | – | 48.3% | – |
| Offload | 24.9 | 7.7 | 47.3% | offloads 7.4 → 8.9 |
| Gang tackle | 24.3 | 18.0 | 51.2% | line breaks 14.9 → 13.7, steps 14.3 → 21.5, tries 5.1 → 4.8 |
| Grubber | 4.1 | 1.1 | 42.3% | grubbers 2.0 → 3.3, dead balls 1.2 → 1.7 |
| 40/20 | 3.7 | 0.09 | 52.5% | touch finds 1.9 → 2.7, 40/20s 0.1 → 0.2 |
| Take the two | 0.13 | 0.06 | 46.3% | – (on offer about once in eight matches) |
| Tap and go | 0.07 | 0.01 | 48.5% | – |

None is a free win beyond Hold's 55% (above); spamming Grubber costs. The penalty pair is rarely
on: most penalties are not in range, or the captain already took the choice the coach would.
Tests: `tests/match/league/moreCalls.test.ts`.

## 21. Positional fit and the lineup (#69)

The coach picks nine starters by formation slot and a bench of four (`GameState.lineup`,
the Lineup screen); the rotation policy of §14 is part of it. A man out of position plays
below his rating: every stat on his roster entry is scaled by his fit for the slot, so the
sim sees the lesser player he is there, and the screen shows that rating. Related positions
(the small cost): fullback, winger and centre with each other; the two halves; five-eighth
and fullback; halfback and hooker; prop, second-row and lock with each other; hooker and
lock. Auto pick tries every fit man in every slot and takes the pairings best rating first,
so a natural keeps his slot ahead of a better man moved there unless the gap is wide
(a 65 lock, with no slot of his own in Nines, beats a 50 natural winger at 52). Rival
coaches auto-pick the same way, so both sides pay for a man out of position. These are
not harness knobs (`sideSheet` builds flat sheets with a natural in every slot).

| Knob | File | Value | Effect |
|---|---|---|---|
| `FIT.same` | `src/systems/lineup.ts` | 1 | A man in his own position keeps his rating. |
| `FIT.related` | `lineup.ts` | 0.92 | A related position (centre ↔ winger, the two halves, prop ↔ second-row…). |
| `FIT.unrelated` | `lineup.ts` | 0.8 | Anything else (a prop at halfback). |

Measured: the standard plan is unchanged by construction (flat sheets); run
`20261019-190113-standard` on this branch matched the previous run within luck.

Tests: `tests/systems/lineup.test.ts`, `tests/systems/matchday.test.ts` (the lineup is the
side that runs out), `tests/core/save.test.ts` (v10 → v11).

## 22. Sin bins and professional fouls (#71; BAK-206 B7)

A penalty can send the offender to the sin bin for `bin.minutes` of match clock (four: the
same share of a 14-minute match as five was of 18; not the thirteen-a-side ten; the issue's "10 sim-minutes" was written for an
80-minute match). The chance: a small one anywhere, more for a high shot, more inside the
offender's own 20 (a professional foul, the infringement that stops a try) and more again
for every earlier penalty his side conceded there (repeated infringements), plus a little
per level of Hitman and Hothead; a side never has two men off at once. He jogs to the
nearest touchline and stands there (**SIN BIN!** over him, "X is sent to the sin bin —
…" in the commentary, the lab's label reads `8 v 9`); his side plays a man short, and a
stand-in takes his duties (the five-eighth kicks for the halfback, the prop plays
dummy-half for the hooker, a winger drops back for the fullback). A defence a man short
is stretched: busts and steps against it are a little more likely on top of the gap in
the line. When the clock says so he runs back on (**BACK ON**, "… is back from the sin
bin"). The bin counts against him in the player stats (`sinBins`) and for Player of the
Match. The roll is made on every penalty whatever the chance, so bins turned off with
the knobs play the same match as the default until a bin would have happened.

| Knob | File | Value | Effect |
|---|---|---|---|
| `bin.minutes` | `src/match/league/sinbin.ts` | 4 | Match clock a binned man sits out (carries over half-time). Was 5; 5 × 7/9 ≈ 3.9, and 4/14 is the same share as 5/18 within a point. |
| `bin.base` | `sinbin.ts` | 0.05 | A penalty anywhere else is a bin this often… |
| `bin.redZone` / `bin.redZoneM` | `sinbin.ts` | 0.25 / 20 m | …one inside the offender's own 20 this often… |
| `bin.repeat` | `sinbin.ts` | 0.2 | …plus this per earlier penalty his side conceded in its own 20. |
| `bin.highShot` | `sinbin.ts` | 0.3 | A high shot. |
| `bin.hitman` / `bin.hothead` | `sinbin.ts` | 0.05 / 0.05 a level | More for a Hitman or a Hothead. |
| `bin.maxOut` | `sinbin.ts` | 1 | Men a side can have in the bin at once. |
| `bin.shortBroken` / `bin.shortStep` | `sinbin.ts` | 0.06 / 0.08 | Against a defence a man short: extra bust and step chance. |

Measured (`balance/plans/sin-bins.json`, 40 whole matches a row, run `20261019-194128-sin-bins`):
**0.2–0.3 bins a match** (even 60 v 60 0.3, slide v rush 0.3, 70 v 50 0.2, Stingrays v Crocs
0.3), about one match in four. The swing, taken while exactly one side is a man short
(`shortMin`, `binSwing`; spells with both sides short count for neither) on the
every-penalty-a-bin variant (1.6–2.6 bins a match, 6–8 minutes short): **4.5 points a
five-minute bin** between even sides, 4.9 slide v rush, 6.0 at 70 v 50, 5.5 Stingrays v
Crocs; at the default rate the same ratio reads 2–7 on a few bins a match (noise). Bins off
on the same dice: nothing else moves beyond luck (tries, line breaks, errors, home win
within a point or two). Standard plan: see the PR.

Tests: `tests/match/league/sinbin.test.ts`.

## 23. Headless speed (N9.1; BAK-207 §3.5)

What a match costs to play without a screen (fast-forward, the harness, and next the rival
rounds). The sim's vector maths no longer calls `Math.hypot` (the square root of the sum of
squares, several times faster), steering and separation work in plain numbers and build one
new position or velocity each, `clampToGround` hands back the same point when it is already on
the field, and the tackle commit ranks defenders on a cost list instead of a Map. Every seed
changes (the square roots differ in the last bits), so matches reshuffle; over 60 whole
matches nothing moves beyond luck (`20261019-230203-offloads-check` on main against
`20261019-230253-offloads-check`), and the standard plan holds the §7 bands
(`20261019-230121-standard` against `20261019-230040-standard`).

| Knob | File | Value | Effect |
|---|---|---|---|
| `live.decideEveryTicks` | `src/match/league/live.ts` | 1 | Players re-pick their targets every this many ticks (1 = 20 Hz). 2 is about a fifth faster but costs about a sixth of the line breaks and All-out's edge (38% v 48% against Balanced; `20261019-225416-decide-rate`), so it stays at 1. |
| `live.separatePasses` | `live.ts` | 2 | Times a tick bodies are pushed apart. 1 saves little and costs about a sixth of the points. |

| | main | N9.1 |
|---|---|---|
| A whole match headless, Node, one core (bundled) | about 485 ms | about 300 ms |
| A week's tick, phone (CPU ×4, 844×390, `npm run e2e:perf`) | 2,154 ms | 1,467 ms |
| Skip to full time, phone | 5,436 ms | 4,394 ms |

**The < 100 ms target is not met** (Assumed, needs Leon). BAK-207 set it for a match of about
7,000 ticks, some 14 µs a tick; a real 2 × 9:00 match is 21,600 ticks, and the sim now runs
at about 14 µs a tick. A 100 ms match needs a coarser sim step (10 Hz, with every tick-counted
length re-timed) or fewer men moved per tick, which changes how the game plays.

## 24. Rival rounds and the cheap rival sim (N9.2)

**One scale.** The cheap sim that plays rival-v-rival fixtures (`cheapSimScore`,
`src/systems/fixtures.ts`) now scores on the live sim's scale, so the ladder reads the same
whichever engine played a match. Between rival clubs the live sim scores about 15 a side (30 a
match), wins by about 10, has no home edge, and the stronger side wins about 65% at a 12-point
strength gap and 75% at 25 (run `20261019-235506-rival-scores`, 30 whole matches each way round
for 12 pairings, gaps 2–28; the harness now counts `points` and `margin`). The old cheap sim
scored about 18 a side, gave home 2 points, and the stronger side won nearly every time at 25.
Re-measured after N9.3's kick chase (`20261020-014111-rival-scores`): 30.6 a match and a margin
of 10.5 (were 30.2 and 10.6), so `CHEAP` stays.

| Knob | File | Value | Effect |
|---|---|---|---|
| `CHEAP.base` | `src/systems/fixtures.ts` | 0.5 | A side's score before the dice. |
| `CHEAP.gap` | `fixtures.ts` | 0.17 | Points per point of strength over the other side (75% at a 25-point gap). |
| `CHEAP.home` | `fixtures.ts` | 0 | Home side's extra points (the live sim has none). |
| `CHEAP.spread` | `fixtures.ts` | 29 | Each side adds a whole number 0..this (mean 14.5; a margin of about 10). |

**On the live sim.** With *Rival matches on the match engine* on (`settings.liveRivals`, off by
default; Fixtures screen), an interactive week plays the seven rival fixtures with `runMatch` —
each side its own fit squad through its coach's auto-pick (#69, #74), one seed each from
`rngSeed`, the week's weather — in a Web Worker (`src/systems/rivalWorker.ts`) while the player
watches his own match. The week holds until both are in (holds now count, `core/time.ts`).
Results go through `applyResult`; the rivals' injuries land on their squads and their players'
games, tries, tackles and line breaks on their records. Fast-forward keeps the cheap sim.
**How long it takes (#216):** at phone speed (page at CPU ×4 and the Worker's own time ×4,
844×390) the round lands about 30 s after Advance Week; Skip reaches full time in about 8 s, so
the week stays held about 20 s after Back to Club. A desktop takes about 5–7 s. If the Worker
fails, can't take the jobs, answers short or not within `RIVAL_WORKER_TIMEOUT_MS` (120 s,
`rivalRound.ts`), the missing matches are played on the main thread; the round is never dropped.
Tests: `tests/systems/rivalRound.test.ts`, `tests/systems/fixtures.test.ts` (the cheap sim's
scale).

## 25. Sprint follow-ups and the stamina knobs (N9.3; BAK-208 §8, §8.2, §11)

The F2 follow-ups. The kicking side **sprints after an attacking kick** (bomb, grubber, chip,
cross-field) and **cruises after a territory kick**; the winger nearest an attacking kick's
landing joins the chase. The defensive line moves up at its preset's speed × `gas.cruise` /
`live.lineCruiseRef`, so the line slows with the runners when cruise comes down. The drain
rate's Stamina slope and the contest's fatigue weights are knobs (§10). The lab draws a
**legs bar under every player** (`src/match/view/legsLayer.ts`: green, amber under
`fatigue.tiredAt`, red under `fatigue.spentAt`). No default moved.

| Knob | File | Value | Effect |
|---|---|---|---|
| `live.territoryChaseSprint` | `src/match/league/live.ts` | 0 | 1 sends the chasers after a territory kick at a sprint too (before N9.3). |
| `live.wingerChase` | `live.ts` | 1 | The winger nearest an attacking kick joins its chase (0 = only the two nearest and the kicker). |
| `live.lineCruiseRef` | `live.ts` | 0.94 | The cruise the presets' line speeds were set at; the line moves at × `gas.cruise` / this. |
| `fatigue.drain.*`, `fatigue.contest.*` | `fatigue.ts` | §10 | The drain's Stamina slope; the contest's fatigue weights. |

**Kick chase** (`20261020-004010-kick-chase`, 120 whole matches a row, even 60 v 60, Slide v
Rush, Kick-chase v Balanced): nothing beyond luck in tries, breaks, kicks or completion
against the old chase (all sprint, no winger) or either change alone. Rush still concedes about
twice Slide's penalties (2.1 v 1.1 a match) under every variant; the 30-seed unit test had
dipped on luck and now plays 60.
The standard plan's 20-seed stars, checked over 120 matches against the old chase
(`20261020-013006-kick-chase-on-the-standard`): line breaks in Expansive v Grind and goals are
luck; **dead balls are real and small**, +0.3 a match between even sides and +0.6 in 70 v 50
(2.7 → 3.4): a territory kick chased at cruise is grounded or rolls dead before a chaser gets
there more often. Tries move by +0.4 at most (inside luck).

**Stamina sweep** (`20261020-004440-stamina-sweep`, 60 whole matches a row, `fatigue.drain.perStamina`
0.005 / 0.01 / 0.015 × `gas.cruise` 0.88 / 0.94, even 60 v 60 and Stamina 30 v 80):

| | perStamina 0.005 | 0.01 (now) | 0.015 |
|---|---|---|---|
| Legs at full time, 30 v 80 (cruise 0.94) | 67% / 68% | 73% / 74% | 75% / 82% |
| Stamina 30 side's win %, 30 v 80 (cruise 0.94) | 37% | 43% | 40% |
| Interchanges a match, even sides | 12.8 | 5.5 | 0.3 |

| Tries a match | cruise 0.88 | 0.94 (now) |
|---|---|---|
| even 60 v 60 (perStamina 0.01) | 5.3 | 5.7 |
| Stamina 30 v 80 | 5.3 | 6.4 |

- **The bench hides Stamina.** With Standard rotation the low-Stamina side is subbed back to
  the same legs at full time (73% v 74%); only a steeper slope (0.015) opens a gap (75% v 82%),
  and it does so by shrinking everyone's drain at Stamina 60 (×0.6, the floor), which nearly
  stops the bench (0.3 swaps a match). The slope and the offset move together: a steeper slope
  wants a higher offset to keep Stamina 50 at ×1. Kept at 0.01 for the Phase 3 pass.
- **Cruise can come down further now.** 0.88 cost 1.1 tries a match at F2 (5.0 → 3.9); with
  the line following cruise it costs 0.3–1.1 (5.7 → 5.3 between even sides). Kept at 0.94.

## 26. Golden point in drawn finals (N9.4)

A final (rounds past `SEASON_ROUNDS`) level at full time on the live sim goes to **golden
point**: a short break with no legs back and no swaps, ends swapped, a kick-off by the side that
kicked off the match, and the next score wins it. A try ends it on the spot (no conversion); so
does a penalty goal or a field goal. Field goals are on from the first second (the usual last-
140-seconds rule is off) and a penalty shot reads golden point's own clock. Still level when golden
point is up, it stays a draw and the higher seed goes through, as before. `runMatch` / `LiveSim`
take `goldenPoint`; matchday sets it for the player's finals, the rival jobs for live rival
finals. The cheap sim (fast-forward, or rival matches off the match engine) keeps the
higher-seed rule. Who kicks off after a try is unchanged (Leon's call).

| Knob | File | Value | Effect |
|---|---|---|---|
| `rules.goldenPointMinutes` | `src/content/au.ts` (`NINES`, `rules.ts`) | 4 | Length of golden point; play runs on after its siren to the next dead ball. 0 = no golden point. Was 5; 4/14 is the same share as 5/18. The "still level after 5 minutes" row below was measured on the old length. |
| `rules.goldenPointBreakTicks` | `au.ts` | 40 (2 s) | The break between full time and golden point. |

Measured (`20261020-014632-golden-point`, 120 whole finals a row; the harness's `finals`
scenario flag, counts `goldenPoint`, `goldenPointWon`, `draws`):

| | even 60 v 60 | 65 v 55 |
|---|---|---|
| Level at full time (go to golden point) | 7.5% | 4.2% |
| Still level after 5 minutes | 0.8% (1 in 120) | 0% |
| Still level after 10 minutes | 0% | 0% |
| Field goals a match, golden point off / on | 0.02 / 0.05 | 0.03 / 0.04 |

Five minutes decides about nine golden points in ten, about two in five of them by a field goal.

## 27. The coach's plan (N11)

The player picks his side's attack and defence presets (§5) on the Lineup screen
(`Lineup.tactics`, save v14; Balanced / Slide by default and for older saves) and the team
sheet carries them. In a live match he changes them at the breaks: the **half-time card**
(the score, each side's legs, the calls paid off, the two rows of presets) holds the match
until Continue, at every speed (#341, 2026-10-26: it used to go on by itself after 4.5 s,
often while the coach was still reading it); the
**Plan** chip shows from a score until the kick-off (and before the opening kick-off). A change
is an input like a call (`LiveSim.setTactics`, `plans: { tick, side, tactics }[]`), refused
outside a break ("at the breaks"; never mid-set, never at a goal-line drop-out) and in force
from the kick-off, with a line in the commentary. It is kept in the live match record, so a
resumed match and `runMatch` with the same `plans` play the same match. No change plays
exactly as before (tests). Rivals do not change plans (coach calls §6). No new match knobs:
the presets' numbers are §5's.

The screen around that card (2026-10-25; none of these change the sim):

| Knob | File | Value | Effect |
|---|---|---|---|
| Half-time card | `src/ui/screens/matchOverlay.ts` | waits for Continue | No timer (#341). It sits above every match control and the toasts (z 65, under a dialog), Continue is pinned to its foot so it stays on screen at 667×375, and the Replay try chip hides under it. Was `HALF_TIME_CARD_MS` 4500 ms; before that 8 s, only at ×4 and above. |
| `playbackPace` | `src/match/view/livePlayback.ts` | ×2 on ruck, tackle, restart, set-piece, conversion, try, penalty, goal | Dead time plays at twice the chosen speed. Open play, half-time and full time stay at the chosen speed. The ruck includes the play-the-ball; a set piece is a tap restart. |
| `PACE_BLEND_MS` | `livePlayback.ts` | 400 ms | The pace eases between ×1 and ×2 (exponential). A 16 ms frame barely moves, so a phase change does not lurch. |
| `LIVE_DEFAULT_SPEED` / `settings.playbackSpeed` | `livePlayback.ts` / `state.ts` | ×4 / saved 1, 2, 4 or 8 | The buttons remember the last speed (save v20). An old save, or any other value, plays at ×4. |

What each preset does when the player picks it (even 60 v 60, the preset side at home
against Balanced / Slide, 40 whole matches a row, `20261020-062508-presets-whole-match-n11`;
counts are both sides):

| Preset | Wins | Offloads | Kicks | Breaks | Big hits | Tackles |
|---|---|---|---|---|---|---|
| Balanced / Slide (both) | 43% (10% drawn) | 9.7 | 21.4 | 61.2 | 23.9 | 191.6 |
| Grind | 45% | **5.9** | 24.1 | 54.8 | 26.0 | **200.4** |
| Expansive | 38% | **12.8** | 21.6 | 59.3 | 25.1 | 180.6 |
| Kick-chase | 48% | 8.0 | **23.5** (609 m) | 60.5 | 26.2 | 196.1 |
| All-out | 33% | **14.4** | 20.8 | 59.5 | 24.1 | 181.4 |
| Rush (defence) | 53% | 10.1 | 22.2 | **79.8** | **32.8** | 193.4 |
| Compressed (defence) | 65% | 8.6 | 22.9 | **52.6** | 25.9 | 196.6 |

Both ways round over 160 matches a row (`20261020-062700-n11-presets-confirm`; one standard
error about 4 points): **Compressed wins about 61%** of even matches against Slide (64% at home,
60% away), **All-out about 37%**, **Expansive about 35%**. With the player picking, Compressed
is a dominant pick and Expansive and All-out are traps: raised as #241 (the plan tables are
not N11's to change). N13 retuned the tables into the 45–55% band (§8, run
`20261024-063629-presets`): Grind 49.2%, Expansive 46.2%, Kick-chase 46.5%, All-out 54.8%,
Rush 49.8%, Compressed 49.0%, each over 400 even matches both ways. The standard plan's preset rows
(`grind v balanced` and the five beside it, 100 seeds both ways) keep that reading on every
match-code change.

## 28. Rival styles from their squads (N11)

A rival's attack and defence presets follow from the nine it would field that week (its
coach's auto-pick of its fit players), each unit against the side's own average so it reads
the same at any strength (`rivalTactics`, `src/match/league/presets.ts`). In order: a half
(five-eighth or halfback) with **Big Boot** or **Playmaker** → Kick-chase; backs quicker than
the side → Expansive; a pack stronger than the side → Grind; a contender with none of those →
All-out; else Balanced. Defence: a strong pack → Rush; a nine whose stamina is above its other
stats → Compressed; else Slide. Derived, not stored: re-read from the squad as it stands, so an
injury or a signing changes it at once. The next-match card ("They play Balanced · Rush"), the rival's squad
page and the ladder's form column (`BAL·RSH`) show it. A strength-built sheet (fewer than nine
fit) keeps the old style from club identity. These are game-side mapping numbers, not match
knobs: the harness sets each scenario's tactics directly, so they are not overridable by name.

| Knob | File | Value | Effect |
|---|---|---|---|
| `RIVAL_STYLE.backsPace` | `src/match/league/presets.ts` | 1.5 | Backs' mean Speed above the nine's → Expansive. Was 0.5; that bar caught backs who were barely quicker, and those sides lost (#322). |
| `RIVAL_STYLE.packStrength` | `presets.ts` | 1.0 | Forwards' mean Strength above the nine's → Grind. Was 2.5; only a clearly heavy pack qualified, so the season record was the pack's (#322). |
| `RIVAL_STYLE.allOutFrom` | `presets.ts` | 65 | Club strength from which a side with no other mark goes All-out. |
| `RIVAL_STYLE.rushPack` | `presets.ts` | 2 | Forwards' Strength above the nine's → Rush. |
| `RIVAL_STYLE.compressedStamina` | `presets.ts` | 1 | The nine's Stamina above the mean of its other four stats → Compressed. |

The mix over eight generated leagues (120 rivals, before the Grind threshold came down from
3 to 2.5): attack Balanced 61, Kick-chase 28, Expansive 16, All-out 9, Grind 6; defence Slide
67, Rush 30, Compressed 23. Until N11 a squad-built rival played Balanced / Slide, so
every match against one changes. Soak at this change (20 seeds, `--jobs 4`): no problems; idle
Normal season 1 14.6-0.6-8.9, 5.1th, top eight 80% (13.7-1.0-9.4, 5.5th, 80% on `main` at
e713900, within seed luck).

**Over a season (#249).** `npm run soak -- --live-rivals` plays the rival rounds on the live sim
and scores each style in rival-v-rival games against what its strength gaps alone predict (the
mean score of every side with the same gap, in 2-point bands; `styleTable`, `src/qa/soak.ts`).
10 seeds × 1 season × idle, managed and idle Hard, 5,179 games (both sides of each counted):

| Attack | Sides | Score | Expected | Difference |
|---|---|---|---|---|
| Balanced | 3,443 | 49% | 48% | +1.0 |
| Kick-chase | 2,941 | 58% | 54% | **+4.4** |
| Expansive | 2,096 | 39% | 48% | **−9.6** |
| Grind | 1,528 | 52% | 46% | **+5.5** |
| All-out | 350 | 51% | 63% | **−12.8** |

| Defence | Sides | Score | Expected | Difference |
|---|---|---|---|---|
| Slide | 5,362 | 47% | 51% | **−3.8** |
| Rush | 3,102 | 50% | 48% | +2.6 |
| Compressed | 1,894 | 57% | 51% | **+6.4** |

Bold is beyond two standard errors after allowing for the runs sharing seeds (0.7–2.7 points as
printed, which assume independent games; the three runs on a seed share it, so up to √3 times
that). Rush is beyond two printed errors but not after that allowance: borderline. The errors are
still a little optimistic: a club plays many of these games, and whatever makes it good beyond
its strength carries across them. The expected score takes no account of home ground (roughly
even across styles), uses `club.strength` as the week began (not the nine after injuries), and
the games leave out the grand final (the rollover week) and any finals tie made in the week it
is played. So styles do win and lose beyond
luck over a season, the same way round as head to head (§27, #241): Compressed strong, Expansive
and All-out weak. A style here is also a squad (quick backs pick Expansive), so the difference
mixes the preset with what the squad is like beyond its strength; §27's even-rated head-to-head
is the clean measure of the preset. Raised on #241, not tuned here (the plan tables are not N11's).

**With the break rule (N14.2).** The same soak now plays those games with the rule on both
sides, counts the plan changes as each result lands (not stored on the fixture), and also
prints wins ÷ games for clubs that began the week within 2 points. A style more than 4 points
from even there, or more than 4 from the strength-adjusted mean above, is logged for N13 and
not moved. 10 seeds × 3 seasons on Normal, 10,354 games: 2.51 plan changes a
match. At a level rating Grind +5.7 and Expansive −6.9. Against strength
Expansive −5.7, Kick-chase +4.5, All-out +5.3. The full table is in
`docs/status/2026-10-living.md`.

**25 Oct (#322).** Those two were the squad, not the plan: a 0.5 pace bar made
almost any slightly quicker back line Expansive, and only a pack 2.5 stronger
than its own nine ground it out. `backsPace` is 1.5 and `packStrength` is 1.0.
The even-match preset band was not moved to chase the season (Grind and Rush
were already just under 45% on 7:00 halves, and the grubber chase brought every
preset inside 45–55% without a table change). The season measure after the
thresholds is in `docs/status/2026-10-balance.md`.

## 29. The goal-kicker and the captain (N11)

The coach names a goal-kicker and a captain on the Lineup screen (`Lineup.kicker`,
`Lineup.captain`, save v15; select a starter, then **Kicker** or **Captain**, and tap again for
the default). The team sheet carries them as roster ids (`kickerAndCaptain`, sheets.ts): his
picks when they are in the nine, else the defaults — the half with the best Skill as he plays
(any man when there is no half) and the starter with the best Footy IQ. Rivals take the same
defaults.

In the live sim the named kicker takes the **conversions and penalty goals** while he is on
the field (`goalKicker`); off it (binned, swapped off) the slot-5 kicker does, as before. A
**field goal** is his or the slot-5 kicker's, whoever has the ball when it is on. Kick-offs,
drop-outs, kicks in play and a penalty kicked for touch stay with the slot-5 kicker. The **captain**
makes the penalty call (§17): his Footy IQ shifts the shot threshold (`captainIq` per point
from `captainIqMid`: IQ 80 shoots at 52% likely, IQ 40 at 68%) and each Hothead level taps
from 8 m further out. A sheet naming neither (the balance harness, a strength-built rival)
plays exactly as before: the slot-5 kicker and a neutral captain (tested). The standard plan
is unchanged by construction; the game's matches change, since every squad-built sheet now
names its defaults.

Measured in tests (even 60 v 60, the fullback named kicker): over 40 seeds he takes nearly
every conversion and penalty goal (the rest fall to slot 5 while the interchange has him off)
and Skill 95 converts more than 10 points better than Skill 25; over 20 seeds the side kicks in
play as much as before, the fullback no more than unnamed, and field goals still come.

## 30. The break rule (N13.5, #316)

A side's plan can change at half-time and after a try. The rule lives in
`src/match/league/breaks.ts` and the sim calls it from `live.ts` when the break
opens (`endHalf`, and `score` once the phase is the try). It does not run on a
penalty goal or a field goal. No dice of its own: a match that names no side
is the match it was. The golden even Balanced / Slide match (seed 1) is
`8-16:346:3436c830c791688a`. It was `14-16:355:a3624c324e9bb503` on the longer
grubber chase, `6-7:362:e959099a69ffd994` after halves went to 7:00, and
`8-14:495:67db8b634c5a2e73` on 9:00 halves. Easing the chase moved it; the pin
is the new match.
It moved on purpose on 2026-10-25: the siren, the rescaled legs and the rescaled
windows make seed 1 a different match. See `docs/status/2026-10-balance.md`.

The harness turns it on per side (`breakRule: ["home"]` or `["away"]` on a
scenario; `breakRuleSides` on `runMatch`). With `bothWays` the named side stays
the side as written, so `away` is the opponent of a tracked home preset. An
in-process caller can pass its own function (`LiveOptions.breakRule`); the
worker, a resume and a replay only carry the side list and use
`defaultBreakRule`. A coach's own `PlanInput` on a later tick overwrites the
rule. The golden-point break is treated as half-time.

**Assumed (needs Leon):** the thresholds, Kick-chase's neighbours (open goes to
Expansive, tighten goes to Grind), Compressed as the tight end of defence, and
that two tries conceded in a row open the plan even when the side is still ahead.

| Knob | File | Value | Effect |
|---|---|---|---|
| `breaks.downBy` | `breaks.ts` | 8 | Points behind at half-time: one step more open. |
| `breaks.concededRun` | `breaks.ts` | 2 | Tries conceded in a row, at a break: one step more open. Beats the late-lead tighten. |
| `breaks.upBy` | `breaks.ts` | 12 | Points ahead at a break: one step tighter. |
| `breaks.tightenFromMinute` | `breaks.ts` | 12 | A lead only tightens from this minute. A Nines match is 2 × 7:00, so this is the last two minutes. Was 15 (the last three of 18:00); 15 × 7/9 ≈ 11.7, rounded. |

Attack, tight to open: Grind → Balanced → Expansive → All-out. Defence: Compressed → Slide → Rush. Already at the end of the line, the step does nothing and the plan stays.

**Even sides.** The rule on one side of an even 60 v 60, 200 seeds both ways
(`balance/plans/break-rule.json`, run `20261024-134002-break-rule`): that side
wins **50.2%** (6.5% drawn). Two standard errors of even at 400 matches is
about 5 points, so the rule alone is not an 8-point edge. N14's AI-coach
decision uses that number.

**Presets, the rule on the other side** (the rival). Same run, then Kick-chase
remeasured after its step moved (`20261024-135701-kick-chase-step-confirm` on
seeds 1–200, `20261024-135245-kick-chase-step` on seeds 10001–10200). Wins are
on points. 45–55% is the band.

| Preset | No rule (N13.1) | Rule on, step 0.9 | Rule on, after |
|---|---:|---:|---:|
| Grind | 49.2% | 48.3% | unchanged |
| Expansive | 46.2% | 45.3% | unchanged |
| Kick-chase | 46.5% | 43.0% and 41.8% | **48.8%** and **45.5%** (step 0.9 → 1) |
| All-out | 54.8% | 51.2% | unchanged |
| Rush | 49.8% | 46.8% | unchanged |
| Compressed | 49.0% | 49.0% | unchanged |

Kick-chase's two blocks with step 0.9 were both under the band (pool 42.4% over
800 matches). Sweeping its own knobs (`20261024-134815-kick-chase-sweep`, then
the step run above): early kick, territory and a pass of 0 did not move the
wins beyond luck; offload ×1.1 did, and cut the kick metres. Step 1.0 is
Balanced's step. On the low block it wins 45.5% with kicks still about 24 and
offloads still inside 8–14; on seeds 1–200 it wins 48.8%. Pool of the two
blocks, **47.2%**. Kick metres on seeds 1–200 fell 22.6, beyond luck, because
more one-on-ones are stepped instead of being carried into a long kick. The
bombs are the same bias. **Assumed (needs Leon):** that step, and leaving the
other presets on the N13.1 tables.

