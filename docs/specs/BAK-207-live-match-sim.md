# BAK-207 — Live match simulation (replaces simulate-then-playback)
**GitHub:** tracking issue linked below | **Priority:** Highest | **Status:** Agreed 2026-10-16

> **Decision (2026-10-16):** the match is the product. Pause feature work on the club loop
> and rebuild the match as a single live simulation that the renderer draws, instead of a
> pre-rolled event log that playback acts out. Everything else in the game (club, squad,
> season, art, overlay, pop-ups) stays. This spec is the brief for that rebuild.

## 1. Why the current match can't get there

`simulateMatch` (BAK-191) rolls the whole match up front into ~130 events, like a
scoresheet, and `PlaybackController` (BAK-194) acts them out, guessing everything the
scoresheet doesn't say. Measured on `main` after #82:

| Symptom the player sees | Cause in the architecture |
|---|---|
| Players bunch, drift, "teleport" into position | The engine has **no sideways positions**: every event is `y: 50`. All lateral movement is invented by playback. |
| "Sometimes he gets tackled, sometimes he doesn't" | ~30 of ~100 carries per match end in `fend` / `break-tackle` / `break` and the engine **never records how that carry ended**. The next event just starts with a new runner. |
| Stop–start pacing | Events are 0.5–1.5 sim-minutes apart → at ×1 they land anywhere from **0.9 s to 3.7 s** apart (p10/p90), while each animation beat is ~1–1.5 s. Players stand, then lurch. |
| Wrong player does the thing | The engine names a player; playback picks **whichever sprite is nearest**. |
| Every improvement is a patch | Ruck holds (#82), kick holds (#30) and formation retargets exist only to make animation fit the scoresheet. We are at the ceiling of that approach. |

Reference quality bar: Kairosoft *Basketball Club Story* — players always moving, the ball
always visibly owned, every possession resolving on screen, special moves popping.

## 2. Decision: stack and layering

**Keep TypeScript + Phaser + Vite.** The stack is not the blocker; the architecture is.
Reasons: everything built here can be run, unit-tested and screenshotted in CI and in
agent sessions; the player tests on a phone via GitHub Pages a minute after merge; the
club game, art and ~900 tests carry over. A Unity/Godot switch would throw those away and
lose the fast feedback loop that this rebuild depends on.

**App stores:** wrap the web build with **Capacitor** (iOS/Android) when the match is
right. Phaser games ship this way routinely; the PWA already exists. Not part of this spec
beyond keeping the build static and offline-capable.

**Reusable across sports:** the new sim is pure TypeScript with **no Phaser imports**,
split so a second sport replaces the rules layer and the renderer skin only:

```
src/match/
  core/      sport-neutral: fixed-step clock, seeded rng, entities + steering,
             ball flight/bounce, contest resolution, event log, replay/flag codes
  league/    rugby league (Nines) rules: phases, roles, formations, carrier/defence
             AI, tackle → ruck → play-the-ball, scoring, restarts, MatchResult output
  view/      Phaser: draws core state with interpolation; reuses current sprites,
             anims, field art, camera, name tags, carrier ring, score banners
  lab/       dev page: pick teams/seed, play/pause/step/slow-mo/scrub, Flag button
```

If a native engine is ever wanted, `core/` + `league/` port as plain logic; the tuning
and behaviours are the asset, not the framework.

## 3. Core design

### 3.1 Clock
- **Fixed timestep** `TICK_MS = 50` (20 Hz). All decisions and physics run per tick; the
  view interpolates between the last two ticks, so rendering frame rate never changes
  outcomes.
- Physics time is human-scale (a winger runs ~8 m/s). ~~The match clock is scaled: a 9:00
  Nines half elapses in `HALF_REAL_SECONDS` of sim time.~~ *Decided (§5.1, decision 1):*
  the clock is real sim time, two 9:00 halves, which is what BAK-208's §7 targets and fatigue
  tuning already assume. Clock stops for tries, conversions and restarts. ×1/×2/×4/×8
  only change how much sim time passes per real frame.
- **Deterministic:** own RNG (`makeRng`), no `Math.random`, no `Date`. Same seed + sheets
  ⇒ identical tick stream. This is what makes replay, flagging and balancing possible.

### 3.2 Entities
- 9 players per side: `pos` (metres, field 100×68 plus in-goals), `vel`, `facing`,
  `role` (slot), live `stats` from the team sheet roster (speed, strength, skill,
  tackling, kicking, fitness → stamina drain), `state` (idle/run/tackled/down/ptb/…).
- Movement: seek/arrive steering with per-player max speed and acceleration, separation
  so players never overlap, and facing from velocity.
- Ball: `held(by)` | `pass(from, to, t)` | `kick(flight, chaser)` | `loose(bouncing)`.
  The ball **always has a state**; the carrier ring and camera follow it.

### 3.3 Phases (league/)
`kickoff → open → tackle-contest → ruck (ptb → dummy-half) → open … → last-tackle kick →
catch/chase → open` plus `error/loose → scramble`, `try → celebration → conversion →
restart`, `penalty (tap or goal)`, `field-goal`, `half-time`, `full-time`.

Every transition is a thing that physically happens on the field; nothing is implied.

### 3.4 Decisions
- **Carrier:** run line toward the gap between the two nearest defenders; when a defender
  closes inside `ENGAGE_M`, choose by stats + situation: carry into contact, step/fend,
  pass to support running a line, offload in the tackle, or kick (last tackle, or
  attacking kicks: grubber near the line, bomb from range). Dummy-half: pass to the first
  receiver or dart from the ruck.
- **Support:** two runners hold lines either side of the carrier; wingers stay wide;
  fullback trails.
- **Defence:** line holds 10 m back from the ruck and re-forms each tackle; two markers
  at the ruck; line slides with the ball; defenders inside `RUSH_M` of the carrier commit;
  a tackle is **attempted** when within reach.
- **Contest:** tackler strength+tackling vs carrier strength+evasion+momentum → `held`,
  `big-hit` (driven back), `broken` (carrier continues), `fend`, `offload`. Each result is
  a visible, physically-played beat with the same actors the decision named.
- **Traits/skills** (backlog BAK-206) plug in here as decision weights and pop-ups
  ("STEP!", "OFFLOAD!") — the hook is designed in from the start.

### 3.5 Output and compatibility
- `runMatch(home, away, opts): MatchResult` — the **same `MatchResult` shape** as today
  (score, events, stats, weather, momentum, injuries), so season, ladder, player stats,
  overlay and score banners keep working unchanged. `MatchEvent`s are emitted from the
  sim as they happen (with real `x`/`y`).
- **Headless mode:** the same sim run to completion without a view, for AI-vs-AI fixtures
  and balancing. Target **< 100 ms per match** (≈ 7,000 ticks × 18 agents). *A real
  2 × 9:00 match is 21,600 ticks, about 650 ms today; see §5.1 decision 5.*
- `src/sim/engine.ts` and `src/world/playback.ts`+`staging.ts` are deleted at switch-over
  (~2,500 lines); ARCHITECTURE §6 is rewritten to this contract.

## 4. Feedback tooling (built first, used throughout)
- **Lab page** (`/#lab`): pick home/away/seed, play, pause, **step one tick**, slow-mo,
  scrub back (re-simulate from seed to tick). Works on a phone.
- **Flag button** on the lab and on real matches: captures `seed`, `tick`, sheets hash
  and a one-line note into a code (`nrl1:<seed>:<tick>:<note>`) copied to the clipboard.
  Pasted into chat, the agent replays to that exact tick and renders frame strips.
- Agent sessions post **frame strips** (contact sheets) for sign-off at each phase.

## 5. Phased delivery

| Phase | Scope | Done when |
|---|---|---|
| **0** | This spec; `core/` clock + rng + entities + steering + ball; lab page with play/pause/step/scrub; Flag code | Lab shows 18 players moving smoothly to targets at 20 Hz on a phone |
| **1** | **Prototype set:** carries, support lines, defence line + markers, tackle contests, ruck → ptb → dummy-half, passing, last-tackle kick + chase; existing sprites | Player signs off the feel on frame strips + phone play |
| **2** | **Full match:** scoring (try, conversion, penalty goal, field goal), kick types, errors/loose ball, penalties, restarts, halves, stamina; `MatchResult` output; headless mode; behind a setting. Split into seven PRs in §5.1 | A season plays end-to-end on the new engine; all stats/overlay tests pass |
| **3** | **Balance:** thousands of headless matches; score bands, try/error/penalty rates, home edge, weather effects; calibration tests | Rates within agreed bands; `< 100 ms` headless |
| **4** | **Switch-over:** default on, delete old engine/playback, rewrite ARCHITECTURE §6 | Old code gone; Pages live |
| **5** | Traits/skills as visible moves; Nines extras (#77); Capacitor store builds | Separate issues |

Phases 0–1 are the point: if the prototype isn't fun to watch, nothing after it matters.

### 5.1 Phase 2 breakdown (#86) — *agreed 2026-10-18*

> **Decided (Leon, 2026-10-18): "go with the recommendations".** Real 9:00 halves, the live
> match screen defaulting to ×4; Nines drop-kick conversions in 2c, the bonus zone left for
> Phase 5 (#77) unless asked for; no scrums; the order below with 2g last; headless speed
> checked on a phone in 2g and made faster in Phase 3.

**Where the live sim is today** (after BAK-208 A–F2): kick-offs, sets of five, tackles and
the wrestle, rucks, handovers, passes and knock-ons, five kick types, catches and loose
balls, tries (counted, no points), legs and gas. It plays forever: no clock, no halves, no
full time, no touch or dead ball, no penalties. It runs only in the lab; real matches still
use the old engine and playback. Headless, an 18-minute match takes about 650 ms on one
core.

**Ground rules for every PR below:** one PR each, with lab sign-off like BAK-208; numbers go in
`BAK-208-tuning.md` and become harness knobs; the standard balance plan is re-run on each and
the report linked in the PR. The match is **Nines** (#77: one ruleset, no Classic toggle).

| PR | What | Done when |
|---|---|---|
| **2a** — *shipped* | **Clock, halves, points, full time, `runMatch`.** Two 9:00 halves of real sim time (the length §7 and the fatigue tuning already assume; see Decisions). The clock stops from a try to the restart. **Half-time:** ends swap, everyone gets back half the legs he has lost and a full tank (BAK-208 §8.2), the side that received first kicks off. **Full time:** the siren goes, play runs on until the ball is next dead (tackle, try, turnover). Points: try 4 (conversions come in 2c). `runMatch(home, away, { seed, weather }) → MatchResult` with the **same shape as today**: score, events (mapped as the lab already does), possession, tackles, errors, tries; weather passed through; injuries empty and momentum from the score for now. One rules config (`NINES` in `league/`) holds the half length, points and set length. The harness measures **whole matches** (`minutes` gives way to halves) and judges wins on points. Lab: clock and score in the readout, a "skip to half-time" button. | A seeded match starts with a kick-off, has a half-time and ends at full time; the same seed gives the same `MatchResult`; the overlay accumulator test passes on `runMatch` output; standard plan re-run. |
| **2b** | **Interchanges (#70), sim side.** The sheet carries a bench of 4 (the next best fit players from `teamSheetFromSquad`; rivals generate 13). Unlimited interchanges (Nines). A coach rule swaps the most tired player for the freshest bench player at a stoppage when his legs fall under a threshold; the bench recovers 5% a minute up to 90% (§8.2). On the field the two jog past each other at the sideline; "X on for Y" in the commentary. Rotation policy (Off, Standard, Heavy) as a sheet field, defaulting to Standard; the lineup screen (#69) sets it later. | With rotation on, a side's legs in the last 5 minutes beat the same side without it over many seeds; the swap is visible in the lab. |
| **2c** | **Goal kicking: conversions and field goals.** Conversions are Nines **drop kicks**, taken from in front of where the try was grounded, quickly; accuracy from Boot and the kicking stat, distance and angle; a flight to the posts you can see. **Field goal** (BAK-208 §4.4): last 3 minutes, scores level or within 1, inside 30 m; charge-down 8%. **Bonus-zone tries** worth 5 if Leon wants them now (#77; zone per the current Nines rules). | Conversion % and field goals per match in the report; GOAL!/MISSED! pop-ups. |
| **2d** | **Touch, dead ball and drop-outs** (closes most of BAK-208 E, #99). The ball and the carrier can go into touch; long kicks aim for touch; **40/20**; a kick dead in-goal or over the dead-ball line → 20 m restart; a defender tackled in-goal or forcing it dead → goal-line drop-out. Restarts are a play-the-ball **10 m in from touch** for the other side, no scrums. | A set can end every way BAK-208 §4.4 lists and each is readable; kick metres and 40/20s in the report. |
| **2e** | **Penalties and six-again.** Ruck offences (holding down in a long wrestle, slow off the ruck) give **six again** (tackle count back to zero, SIX AGAIN! pop-up); offside (a defender up before the ball is played, more likely with Rush) and high shots (Hothead) give a **penalty**: tap and go, kick for touch (ball back, 10 m restart), or a shot at goal for 2 when in range and it makes sense on the clock and score. Sin bins later (BAK-206 B7). | Penalties and six-agains per match in the report; Rush pays for its line speed in penalties; the choice is shown. |
| **2f** | **Weather, injuries, errors in contact.** Rain → handling (knock-ons, drops), wind → kick distance and goal accuracy; a big hit can injure (as the old engine does); an injured player comes off at the next stoppage through 2b, or plays on hampered with no bench left. Ball lost in contact (a knock-on in the tackle, not just strips). Momentum timeline from the play, as the old engine's. | Weather moves error and goal rates in the report; `MatchResult.injuries` is filled and the club game applies them. |
| **2g** | **Live matches behind a setting.** A "Live match (beta)" setting. At kick-off matchday runs `runMatch` headless for the result, so ladder, stats and injuries are applied exactly as today; the match screen then plays **the same seed live** (deterministic, so what you watch is what was recorded). The overlay, score banners, pop-ups, speed controls and skip all work off the live sim; `match:finished` at full time. The overlay reads the half length from `NINES`. | A whole season plays end to end with the setting on; all stats/overlay parity tests pass against `runMatch`; works on a phone. |

**2a as shipped** (where it differs from the row above): the ball is dead after the siren on
a completed tackle, a try (after its celebration), a knock-on, or when time runs out with a
man still down from a tackle; an intercept or a kick in the air plays on, and 60 s after the
siren the half ends regardless. Momentum is the old engine's (tries, big hits and errors,
decaying each set), not from the score. The set length stays `SET_TACKLES` in `config.ts`,
which the old engine shares; `NINES` (`league/rules.ts`) holds the half length, try points
and the half-time numbers (tuning reference §13). Event minutes are Nines minutes (0–18).
A balance plan without `minutes` plays whole matches; with it, one stretch of that length.
The lab's ⏩ skips to the next half-time or full time. Measured: tuning reference §13.

After Phase 2: Phase 3 (balance, with the harness on whole matches) and the lineup screen (#69).

**Decisions (as proposed; all taken as recommended, see above):**
1. **Match length.** Two 9:00 halves of real sim time (recommended): §7, the harness and the
   fatigue tuning already assume it; at ×1 a match takes 18 minutes to watch, about 4½ at ×4.
   The old playback took 5 minutes at ×1. The other way is a scaled clock (shorter halves of sim
   time, the clock running fast), which would mean retuning legs and gas and rescaling every §7
   target. Recommended: real halves, and the live match screen defaults to ×4 with ×1 a tap away.
2. **Conversions as Nines drop kicks** and **bonus-zone tries worth 5** (#77) built into 2c now,
   or plain conversions now and the Nines extras in Phase 5. Recommended: drop kicks now
   (it is the same work either way); bonus zone your call.
3. **No scrums:** touch, knock-ons and forward passes restart with a play-the-ball for the other
   side. Recommended.
4. **Order.** As listed: 2a then 2b (the rest of the legs story, while it is fresh), then the rules,
   and 2g last. 2g can move up to right after 2c if you would rather play real matches on the live
   sim sooner, with fewer rules.
5. **Headless speed.** The §3.5 target (< 100 ms) assumed about 7,000 ticks; a real 2 × 9:00 match
   is 21,600 ticks and takes about 650 ms today. That is fine for the player's own match (rivals
   use the quick score), and 2g checks it on a phone; making it fast enough to play rival games on
   the live sim is Phase 3 work.

## 6. Non-goals (for now)
Mid-match coach calls (#73) ride on this architecture later. Lineups (#69) wait for Phase 2's
sheet; interchanges (#70) are part of Phase 2 (§5.1, 2b), with the rotation policy set by the
coach rule until the lineup screen exists. No new art beyond what a phase needs on the field
(a sideline swap, goalposts in flight).
