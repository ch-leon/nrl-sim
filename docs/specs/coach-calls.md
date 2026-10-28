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
half-time, after a try). Calls are the moment-to-moment layer on top. *Shipped in N11:* the
coach picks the plan on the Lineup screen; in a live match a half-time card and a **Plan**
chip (from a score to the kick-off) change it, in force from the kick-off and recorded with
the calls (`LiveSim.setTactics`, `plans` by tick). Rivals keep theirs (§6).

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
| **Fresh legs** (#367) | Either way, once a half, while a man on the field is under 0.40 legs and the bench has someone with 0.40 or more | Until the swap | The most tired man (ties by slot) comes off for the freshest bench man, his position group first: at the next play-the-ball where he is free (swapped where he stands), else the next stoppage (he jogs off, as a Rotation swap), else in the sheds at half-time. No dice | The swap is made. Lapses unpaid (and the half's call comes back) if nobody is tired by then; a call still waiting at full time stays unpaid |

40/20 joins the list when 2d brings touch. Calls for the defence never stop a defender
tackling; they change the line, not the contest.

**Limits** (proposed): **one call per set** for the side in possession and one per set
when defending; a call left unused at the end of a set lapses. Fresh legs (#367) is a
bench call: it uses up neither, and is limited to once a half (`calls.freshLegs.perHalf`).
The AI coach never makes it. A chip greys out with the
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
  the calls already made; there is no point to reload to. The record is also written
  every 2 seconds of match time (40 ticks at 20 Hz), and on Save & exit, so a kill
  that never fires `pagehide` loses at most that. Save & exit returns to the club
  with the week still held; Advance Week resumes the match instead of skipping it.
  Export during the hold writes the week-start save and this record, not the
  half-ticked week, so the file is not a way to replay the week on top of itself.
  Export refuses when that week-start save never landed.
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
| 8 | Fresh legs (#367): how often? | Once a half per side (the alternative was once a match) |
| 9 | Fresh legs: unlocked when? | Level 0, with Hit-up and Hold (the alternative was Coach's Office level 1) |
| 10 | Fresh legs: where does it land? | The next play-the-ball where the man is free, else the next stoppage, else the sheds; the Rotation's own swaps at that stoppage skip both men |

## 10. More calls (#396)

**GitHub:** #396 (Wave 4, Leon 28 Oct: "More coach calls") | **Status:** Shipped with the
defaults below.

Five more calls, each mapped onto something the sim already does (no new mechanics), with the
same rules as §3: one call a set each way, a refusal with a reason when it can't apply, its
pop-up and commentary line, and a `CallJudge` verdict by the COACH button. The knobs are in
the tuning reference §20 (`calls.offload`, `calls.gang`, `calls.grubberInsideM`,
`calls.fortyTwentyFromM`, `calls.fortyTwenty`, `calls.penaltyShotMin`, `calls.paid.gangM`), with
the runs that sized them.

| Call | When it can be made (refusal otherwise) | Scope | What it does | Paid off when | Office level |
|---|---|---|---|---|---|
| **Offload** | With the ball, tackles 1–4 ("tackles 1–4" on the last) | The next two carries | The attack plan's `offload` becomes at least 1, +0.5 (about +6 points on a 12% contest, even in a plan that tucks it), and an offload is spilled 4 points more often | It gets away, or the play breaks the line or scores. Not if two carries go by without one, or the ball is lost | 1 |
| **Gang tackle** | Defending | The next two tackles | One more defender commits to the carrier (`commit` +1) and the ruck takes 6 ticks longer to clear (a slower play-the-ball); with a man more in the tackle the edges are thin, so a carrier one-on-one out wide steps his man more often (`stepAgainst` +0.2) | Their two carries make under 10 m, or the defence wins the ball | 1 |
| **Grubber** | With the ball, from tackle 4 ("late in the set"), the ball inside their 25 ("not inside their 25") | This set's last tackle | The last-tackle kick is a grubber for the line or the in-goal; the kicker keeps it for the last (no early kick) and the dummy-half finds him rather than dart | A goal-line drop-out (a repeat set), the ball regathered, dropped, or a try. Not if the ball goes to them (taken, into touch, dead off the attack) or no kick comes | 2 |
| **Take the two / Tap and go** | A penalty his side has won and not yet taken, with the shot at goal at least 35% likely ("too far out"); not the captain's own choice ("the captain's call"); no tap once the siren has gone | This penalty | Overrules the captain: the goal-kicker takes the shot at goal, or the penalty is tapped. One row, two buttons; the captain's own choice shows greyed. Uses neither of the set's calls; one a penalty | Take the two: the goal is over. Tap and go: the set ends in a try or another penalty | 2 |
| **40/20** | With the ball, from tackle 4, the ball behind his own 40 ("not behind your 40") | This set's last tackle | The last-tackle kick goes for touch inside their 20 (the 2d 40/20 aim, without its dice), as far as 35 m goes: from deep it is a kick for touch that falls short. The kicker keeps it for the last and the dummy-half finds him | It finds touch for the 40/20. Not if the ball goes to them or no kick comes | 3 |

The issue asked for Grubber on "the last tackle". With five tackles a set, the last tackle's
ruck is under a second at ×4, so Grubber is on from tackle 4, as Bomb and Run it are, and is
always the last tackle's kick. A call made only after the kicker has the ball on the last may be
too late (his choice is made as he takes it), as for Bomb.

Two of the five were too strong as first drawn, measured with one side calling them whenever
it may (tuning reference §20): Gang tackle won 62% (its bunched line helped the defence, so
"more space out wide" became the edge defender who is easier to step), and 40/20 won 63% (an
aim 26 m from their line from anywhere behind his own 40 is a 60 m kick from deep, so it now
goes as far as 35 m). At the defaults no call wins more than Hold's 55%.

The verdicts read "Grubber: repeat set", "40/20: found touch", "Grubber: missed, their ball",
"Offload: got it away", "Gang tackle: held to +6m", "Take the two: over!", "Tap and go: try!".

**The tray** (`trayRows` in `src/ui/screens/matchOverlay.ts`, pure and tested) never shows more
than 5 rows or 6 buttons, so it fits 667×375, 844×390 and 956×330 without scrolling: the calls
are tiles, two a line (three a line in a wider tray on a short wide phone). Shift left and right
share a row, and so do Take the two and Tap and go. When more are on than fit, the penalty comes
first (it is gone in seconds), then Field goal, Grubber, 40/20, Bomb, Run it, Fresh legs, Kick
early, Hit-up, Shift, Offload, and defending Rush, Hold, Gang tackle. They show in play order.
A later row kind (the kick-off calls, #397) is a new id in that order and priority.

**Decisions (Leon; defaults used).**

| # | Question | Default used |
|---|---|---|
| 11 | Which calls, and their Office levels? | The five above at the levels shown. Cross-field kick and Chip left out for now |
| 12 | Do Hard rivals use the new calls? | No: the AI coach keeps its calls (§6), so rival behaviour and balance don't move |
| 13 | Effect sizes? | A small nudge on an existing knob each, about Rush's or Hit-up's size, in §20 of the tuning reference |

No calls still plays exactly as before: the new calls' state is read only when one is made, the
refusal checks and the tray roll no dice, and both balance fingerprints are unchanged.
