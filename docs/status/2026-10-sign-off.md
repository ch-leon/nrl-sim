# Sign-off list: #85, #94, #99 (N9.7, 20 Oct)

Each issue's "done when", checked against `main` on 20 Oct, with the evidence. The issues stay
open: closing them is Leon's call. **Leon** marks what only a person can sign off.

## #85 Phase 1: prototype set — carries, defence, tackle contests, ruck, passing, last-tackle kick

| Done when | Status | Evidence |
|---|---|---|
| Every carry visibly ends in exactly one of: tackle (then ruck), break, error, kick | Met | `tests/match/league/live.test.ts` "every carry ends in a tackle, a break, an error or a kick — and a tackle always plays the ball"; "the ruck runs tackled → down → play-the-ball → dummy-half" |
| The ball is never in an unknown place; the carrier ring always has a target | Met | `live.test.ts` "the ball is always held, in flight or loose-and-collected within a couple of seconds" (finite position every tick, never loose over 5 s); the ring is drawn on the holder and hidden while the ball flies (`tests/match/view/liveView.test.ts`) |
| Pace is continuous: no one stands still for more than ~1 s while the ball is live | Met | New in N9.7: `live.test.ts` "pace is continuous (#85)": over three 5-minute stretches, about 500 short pauses while a carry or pass is on, the longest 0.6 s |
| The player signs off the feel from frame strips and phone play (lab page) against the Kairosoft checklist | **Leon** | The lab (`/#lab`, on the phone at 844×390) and the match screen are live on Pages. The full match has shipped since (Phases 2–4), so this sign-off is now of the live match itself |

**Ready to close** once Leon signs off the feel.

## #99 E: Kick types, catches and scrambles

| Done when | Status | Evidence |
|---|---|---|
| A set can end six different ways by kick, and each is readable | Met | `tests/match/league/kicks.test.ts` "uses the whole kicking game: long, bomb, grubber, chip and cross-field all happen"; `touch.test.ts` "a set can end every way" and the 40/20; field goals in `goals.test.ts`. Each kick names its type on the pop-up and in the commentary (`kicks.test.ts` "names the kick type…"). Since 28 Oct how a kick comes down is named too: TAPS IT BACK!, KNOCK-ON!, LOOSE BALL! and who won the scramble (`kickContest.test.ts`) |
| Bombs are a genuine contest | Met on the default (28 Oct; **Leon** can move it) | A bomb with a chaser and a catcher under it is one draw: won back, spilled or caught, by the chaser's Speed against the catcher's Skill, the height of the kick (Big Boot), a Kick-chase side and rain (`kickContest.ts`, tuning §31). `balance/plans/kick-contest.md` (400 even matches): **one bomb in five contested** (19.7%; one in seven before), **won back 8.2%** (4.0%), **spilled 11.6%** (10.9%). With a Kick-chase side, 24.1%. Default used: about one in five, won back 6–10%, spilled 10–14% |
| Grubbers produce tries at a rate inside §7 | Met (28 Oct) | The grubber chase (25 Oct) and now the race in the in-goal: each side's quickest man to a grubber at rest there, by his time to the ball and a little bounce; the attacker first scores, the defender grounds it for a 20 m restart. Same plan: **0.345 grubber tries a match** between even sides (0.297 before, the change within luck), 0.43 with a Kick-chase side; tries overall 5.73 (§7 4–7). Default used: 0.2–0.4 a match (§12's guardrail is 0.20–0.30) |

**Ready to close** with the defaults above recorded (Leon can still move the bomb and grubber
rates; a defender grounding a grubber stays a 20 m restart, a goal-line drop-out is a follow-up).

## #94 Phase 1.5: make the match exciting (tracking)

| Sub-issue | State |
|---|---|
| A #95 Pop-ups, commentary, lab feed and stats strip | Closed |
| B #96 Contest v2 | Closed |
| C #97 Traits with levels | Closed |
| D #98 Zone tactics and presets | Closed |
| E #99 Kick types, catches and scrambles | **Closes** with the kick-contest PR (above) |
| F #100 Fatigue | Closed |

**Closes with #99.** Nothing else is outstanding: BAK-208's delivery table (§9) has A–F
and F2 shipped, and the sprint follow-ups (N9.3) are in.

## How it was measured

- The harness counts `bombs`, `bombsWon` (regathered by the kicking side), `bombsSpilled`,
  `grubbers`, `grubberTries` and `kickTries` (a try by the kicking side within 12 s of its kick),
  added for this close-out (`src/match/balance/measure.ts`).
- The plan as run is on the `balance-log` branch with its report: `runs/20261020-023321-kicks-close-out/plan.json`
  (experiment plans aren't committed to `main`).
- 28 Oct (#99, the kick contests): `balance/plans/kick-contest.json`, run on `main` (91ef9d2,
  `20261028-172235-kick-contest`) and on the branch (`20261028-180218-kick-contest`); the
  before and after tables are in `balance/plans/kick-contest.md`. `bombsWon` now also counts a
  bomb won in the contest, and the harness counts `scrambles` (a loose ball both sides went for,
  and who came up with it).
