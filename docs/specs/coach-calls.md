# Coach calls during the match (#73) — spec
**GitHub:** #73 | **Status:** Agreed 2026-10-19 (all seven decisions in §9 as recommended) |
**Builds on:** BAK-207 (live sim), BAK-208 §5 (zone tactics) and §11 ("Coach calls during play")

> Written from #73, BAK-206 §Backlog and BAK-208 §11. **Decided (Leon, 2026-10-19): all seven
> recommendations in §9 taken as written.** Built after BAK-207 2g (it needs the live match
> screen), before or alongside Phase 3, behind a setting that is on by default if it reads
> well on screen.

## 1. What the player gets

During his own match, a small row of chips along the bottom of the match screen lets him
nudge **what his side does next**. A call is a nudge, not a joystick: it changes the odds of
the next play or set, the players still decide with their stats, and it can fail. When the
call takes effect it shows as a pop-up over the player it went through (**SHIFT LEFT!**,
**HIT-UP!**) and a line in the commentary; the stats strip counts the calls that paid off.

Presets (BAK-208 §5) stay the plan for the match and are changed at the breaks (kick-off,
half-time, after a try). Calls are the moment-to-moment layer on top.

## 2. Why this is now simple

#73 was written against the old engine, where the whole match was rolled before the screen
opened and buttons could change nothing; it proposed splitting the engine into
`simulatePossession` steps. The live sim (BAK-207) already *is* a step-by-step match: the
screen draws the sim as it runs. So a call is just an **input to the running sim** at a tick:

```ts
// league/calls.ts (proposed)
export type CoachCall =
  | 'hit-up' | 'shift-left' | 'shift-right'            // attack, the next play
  | 'kick-early' | 'run-it' | 'bomb' | 'field-goal'    // attack, this set's kick
  | 'rush' | 'hold';                                    // defence, the next set
export interface CallInput { tick: number; side: Side; call: CoachCall }
// LiveSim.call(side, call): queued, takes effect at the next decision it applies to.
```

Same seed + same list of calls ⇒ the same match, so a match is fully described by
`{ seed, sheets, calls[] }`. That one fact answers replays, Flag codes, saving and resuming,
and save-scumming (§5).

## 3. The calls (v1)

Each call maps onto numbers the sim already has (the zone plan, `AttackPlan` / `DefencePlan`
in `league/presets.ts`, and the last-tackle kick call), merged on top of the preset for its
scope. No new mechanics.

| Call | When it can be made | Scope | What it does (proposed numbers) | Paid off when |
|---|---|---|---|---|
| **Hit-up** | In possession | Next carry off the ruck | First receiver is a forward (`hitUps` +2), `pass` −0.3, `step` 0.3, `offload` ×0.5: tuck it and take the line on | Carry gains ≥ 3 m after contact, or a quick play-the-ball |
| **Shift left / right** | In possession | Next play | Receiver preference to that side (overlap preference on that side ×2), `width` +0.4, `cutOut` +0.25, `edges` +1 | The ball reaches the edge and the set gains ≥ 15 m, or a try |
| **Kick early** | Tackles 3–4 | This set | The kicker kicks on the next tackle he gets the ball: grubber / chip inside 25 m, territory beyond | The kick is regathered, forces a dropout (2d), or gains ≥ 30 m |
| **Run it** | Tackle 4+ | This set | `kickCall = 'run'` on the last | The set ends in a try or a penalty |
| **Bomb** | Tackle 4+ | This set | The last-tackle kick is a bomb | Regathered, dropped, or a try off it |
| **Field goal** | Only when 2c's field-goal rule is on (last minutes, close, in range) | This set | The kicker drops for goal on the next tackle he has it | Over |
| **Rush** | Defending | Next set | Defence plan = Rush for one set | Tackle behind the advantage line, intercept, strip or error |
| **Hold** | Defending | Next set | Defence plan = Compressed for one set | Set ends with < 25 m gained |

40/20 joins the list when 2d brings touch. Calls for the defence never stop a defender
tackling; they change the line, not the contest.

**Limits** (proposed): **one call per set** for the side in possession and one per set
when defending; a call left unused at the end of a set lapses. A chip greys out with the
reason when it can't apply ("not your ball", "field goal: not in range").

## 4. On screen

- A chip row bottom-centre on the match screen, above the speed controls; on a phone on its
  side, 4–6 chips of 44 px, icon + short word. Only the calls that make sense now are lit
  (in possession: Hit-up, ◀ Shift, Shift ▶, then Kick early / Run it / Bomb late in the set;
  defending: Rush, Hold).
- Tap: the chip glows (queued). When it takes effect: pop-up over the player
  (**HIT-UP!**, **SHIFT LEFT!**, **RUSH!**), commentary line ("Coach calls the shift left"),
  chip greys for the rest of the set.
- Calls stay available at every speed. **Skip** plays the rest headless with no more calls.
- The lab gets the same chips for both sides (`?calls=1`), and Flag codes carry the call list
  so a moment with calls can be replayed.

## 5. When the result counts (this changes 2g)

BAK-207 2g plans to run the match headless at kick-off to get the result, apply it, and
then play the same seed live — which only works while the live match can't differ from the
headless one. With calls it can. So when calls ship:

- **The match on screen is the match.** The result (ladder, money, injuries, morale, player
  stats) is applied once, at `match:finished`, from the live sim's own `MatchResult`.
  Rival-v-rival fixtures keep the quick sim.
- **Saving mid-match:** the save keeps `{ fixtureId, seed, calls[], tick }` for a match in
  progress (a few hundred bytes). Reopening the game resumes the match: re-simulate to that
  tick with the same calls (deterministic), then carry on. Recommended over forfeiting (harsh
  on a phone that gets killed in the background) and over auto-simming the rest.
- **Save-scumming** is not possible: reloading resumes the same match at the same tick with
  the calls already made; there is no point to reload to.
- 2g as planned is fine for the first release without calls; the coach-calls PR moves result
  application to full time.

## 6. Rival coaches

Rivals already have a coach: their presets read per zone (BAK-208 §5). Giving them calls
too (same API, simple rules: field goal when on, rush in their own 20, shift toward an
overlap) keeps it fair but changes every rival match. Recommended for v1: **no AI calls**, so
a match with no calls from the player plays exactly as `runMatch` does today, which gives
the golden test below; AI calls as a later balance lever.

## 7. Tests (acceptance)

- **Golden:** with no calls, the live match equals `runMatch` (events, score, stats) for
  100 seeds.
- **Determinism:** the same seed and call list give the same `MatchResult`; resuming from a
  saved `{ seed, calls, tick }` reaches the same full time as playing straight through.
- **Each call moves its outcome** over many seeds in the balance harness (a `calls` field on
  a scenario: "always shift left on tackle 2", "rush every defensive set"): Hit-up more
  forward carries and fewer passes; Shift more edge carries on that side; Rush more big hits
  and more busts conceded; Field goal more attempts late.
- **Results apply once**, at full time, and a resumed match applies them once.

## 8. Build order (after Phase 2)

1. `league/calls.ts` + `LiveSim.call()`; harness `calls`; lab chips. Measured, no game UI. *Shipped (tuning reference §20).*
2. Results at full time + resume from `{ seed, calls, tick }` (with 2g's live matches). *Shipped: the week holds at the match (`ctx.hold()` / `resumeWeek()`).*
3. Match-screen chips, pop-ups, commentary, "calls that paid off" in the stats strip. *Shipped behind a "Coach calls" setting, on by default (the tick box beside Live match): chips bottom-right, what makes sense now, the call's pop-up and commentary line. "Paid off" counting followed (`CallJudge`, tuning reference §20): a line in the commentary when a call pays off and "Calls paid off 2/5 / –" in the stats strip.*
4. AI coach calls; calls unlocked by the Coach's Office. *Shipped in N9.6: rival coaches' calls behind `calls.ai.on` (off, so no calls still plays as `runMatch`); the player's chips by Coach's Office level (tuning reference §20).*

## 9. Decisions (Leon, 2026-10-19: all as recommended)

| # | Question | Decision |
|---|---|---|
| 1 | Scope of a call: the next play, or the whole set? | Per call, as in §3: plays for Hit-up / Shift, sets for kicks and defence |
| 2 | Limit: one per set, a cooldown, or N per half? | One per set each way (simple, readable) |
| 3 | The v1 list (§3): too many, too few? | §3's eight; 40/20 with 2d |
| 4 | Rivals make calls too? | Not in v1 (keeps "no calls = runMatch") |
| 5 | Results applied at full time instead of kick-off | Yes, when calls ship |
| 6 | Quit / killed mid-match | Resume from `{ seed, calls, tick }` |
| 7 | Are calls free, or unlocked (coaching staff, facilities)? | Free for v1; unlocks later |
