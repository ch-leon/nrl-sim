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
| A set can end six different ways by kick, and each is readable | Met | `tests/match/league/kicks.test.ts` "uses the whole kicking game: long, bomb, grubber, chip and cross-field all happen"; `touch.test.ts` "a set can end every way" and the 40/20; field goals in `goals.test.ts`. Each kick names its type on the pop-up and in the commentary (`kicks.test.ts` "names the kick type…") |
| Bombs are a genuine contest | **Leon** (measured) | `20261020-023321-kicks-close-out` (120 whole matches, even 60 v 60): 4.4 bombs a match; the kicking side wins 3% back and the catcher spills 11%, so about one bomb in seven is contested. With a Kick-chase side, 5.5 bombs, 14% contested. Whether that is "genuine" is a feel call |
| Grubbers produce tries at a rate inside §7 | **Not met** | Tries overall are inside §7 (5.9 a match, band 5–9), but grubbers barely produce them: 2.5 grubbers a match and **0.008 grubber tries** (one in about 300 grubbers) between even sides, 0.06 with a Kick-chase side. Since 2d, a grubber that isn't regathered rolls dead or is grounded in-goal by a defender (sprint log, 2d: "about one try a match"). §7 has no grubber-specific band. A follow-up for the Phase 3 pass: the chaser's race to a grubber in the in-goal |

**Not ready to close:** the grubber criterion is not met, and the bomb contest needs Leon's
judgement.

## #94 Phase 1.5: make the match exciting (tracking)

| Sub-issue | State |
|---|---|
| A #95 Pop-ups, commentary, lab feed and stats strip | Closed |
| B #96 Contest v2 | Closed |
| C #97 Traits with levels | Closed |
| D #98 Zone tactics and presets | Closed |
| E #99 Kick types, catches and scrambles | **Open** (above) |
| F #100 Fatigue | Closed |

**Closes with #99.** Nothing else is outstanding: BAK-208's delivery table (§9) has A–F
and F2 shipped, and the sprint follow-ups (N9.3) are in.

## How it was measured

- The harness counts `bombs`, `bombsWon` (regathered by the kicking side), `bombsSpilled`,
  `grubbers`, `grubberTries` and `kickTries` (a try by the kicking side within 12 s of its kick),
  added for this close-out (`src/match/balance/measure.ts`).
- Plan `balance/plans/experiments/20261020-kicks-closeout.json`; run on the `balance-log` branch.
