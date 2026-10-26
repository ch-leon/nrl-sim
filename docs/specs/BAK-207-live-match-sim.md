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
  2 × 9:00 match is 21,600 ticks, about 650 ms today; see §5.1 decision 5.* *Phase 3, first
  pass (2026-10-19), with every seed's match unchanged:* far body pairs ruled out on the
  squared distance before the exact one, each side's nine kept once, sort keys worked out once:
  834 → 614 ms a match in Node, 385 → 275 ms in desktop Chromium; the balance harness no longer
  builds a snapshot every tick (1.7× faster per match). Thousands of matches are minutes on four
  cores, so sweeps aren't blocked; the < 100 ms target needs allocation-free steering, a rewrite
  that would change every seed's match, left for later.
  *N9.1 (2026-10-19):* no `Math.hypot`, scalar steering and separation, the commit ranking on a
  cost list: about 485 → 300 ms a match in Node, a phone's week tick 2.2 → 1.5 s. The < 100 ms
  target assumed about 7,000 ticks; at 21,600 it needs a coarser step (tuning reference §23;
  Assumed, needs Leon).
  *N10 (2026-10-20):* in a browser no headless match runs on the main thread: the rival round,
  the fast-forwarded match and Skip play in a Worker with byte-identical results, and the
  match scene's art is painted ahead in another. The phone's taps stop freezing; the
  per-match cost is unchanged (ARCHITECTURE §6, `docs/status/2026-10-perf.md`).
  *N15 (2026-10-24):* the view grew layers on the same sim, listed in ARCHITECTURE §6:
  shouts, the kick, the six trait moves, the line-break flash and the big-hit dust, the
  bonus-zone glow, the wrestle bar and the sprint trail. The commentary ticker and the
  instant replay read the same seed a second way. Merged: the bonus zone (#289),
  commentary (#294), kicks landing wide (#301), traits (#309) and the replay (#310).
  Open: the pop-up and contest polish (#312) and this cost note (#313). None of them
  changes `runMatch`'s result. §6's cost line now says the N9.1 figure (about 300 ms in
  Node) and that rival rounds use this sim behind the setting.
- `src/sim/engine.ts` and `src/world/playback.ts`+`staging.ts` are deleted at switch-over
  (~2,500 lines); ARCHITECTURE §6 is rewritten to this contract. *Phase 4 (#88, #162,
  2026-10-19, merged on Leon's go-ahead after a checker review):* those three and
  `world/formation.ts` went; the sheet
  builders moved to `src/match/league/sheets.ts` unchanged; every match is live (the beta
  setting went) and fast-forward plays `runMatch` headless.

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
| **5** | The match as a show: traits as visible moves, the Nines bonus zone, commentary, kicks, a replay | Bonus zone #289, commentary #294, kicks #301, traits #309 and the instant replay #310 are merged. The pop-up and contest polish #312 is open. Capacitor store builds stay #89 and are not started (Needs Leon) |

Phases 0–1 are the point: if the prototype isn't fun to watch, nothing after it matters.

### 5.1 Phase 2 breakdown (#86) — *agreed 2026-10-18*

> **Decided (Leon, 2026-10-18): "go with the recommendations".** Real 9:00 halves, the live
> match screen defaulting to ×4; Nines drop-kick conversions in 2c, the bonus zone left for
> Phase 5 (#77) unless asked for; no scrums; the order below with 2g last; headless speed
> checked on a phone in 2g and made faster in Phase 3.
>
> **Updated (Leon, 2026-10-25):** halves are 7:00. Legs drain and recovery, the sin bin,
> golden point, and the minute windows (field goal, penalty shot, the break rule's late
> lead) keep the same share of the match. The screen plays rucks, tackles, restarts and
> kicks at goal at twice the chosen speed, the half-time card goes on after 4.5 s at
> every speed, and the chosen speed is remembered. The rows below record what shipped
> in October; the current numbers are in the tuning reference.
>
> **Updated (Leon, 2026-10-26, #341):** the half-time card waits for Continue at every
> speed; it no longer goes on by itself.

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
| **2b** — *shipped* | **Interchanges (#70), sim side.** The sheet carries a bench of 4 (the next best fit players from `teamSheetFromSquad`; rivals generate 13). Unlimited interchanges (Nines). A coach rule swaps the most tired player for the freshest bench player at a stoppage when his legs fall under a threshold; the bench recovers 5% a minute up to 90% (§8.2). On the field the two jog past each other at the sideline; "X on for Y" in the commentary. Rotation policy (Off, Standard, Heavy) as a sheet field, defaulting to Standard; the lineup screen (#69) sets it later. | With rotation on, a side's legs in the last 5 minutes beat the same side without it over many seeds; the swap is visible in the lab. |
| **2c** — *shipped* | **Goal kicking: conversions and field goals.** Conversions are Nines **drop kicks**, taken from in front of where the try was grounded, quickly; accuracy from Boot and the kicking stat, distance and angle; a flight to the posts you can see. **Field goal** (BAK-208 §4.4): last 3 minutes, scores level or within 1, inside 30 m; charge-down 8%. **Bonus-zone tries** worth 5 (Leon, 2026-10-19; the in-goal between the posts, as the current Nines rules). | Conversion % and field goals per match in the report; GOAL!/MISSED! pop-ups. |
| **2d** — *shipped* | **Touch, dead ball and drop-outs** (closes most of BAK-208 E, #99). The ball and the carrier can go into touch; long kicks aim for touch; **40/20**; a kick dead in-goal or over the dead-ball line → 20 m restart; a defender tackled in-goal or forcing it dead → goal-line drop-out. Restarts are a play-the-ball **10 m in from touch** for the other side, no scrums. | A set can end every way BAK-208 §4.4 lists and each is readable; kick metres and 40/20s in the report. |
| **2e** — *shipped* | **Penalties and six-again.** Ruck offences (holding down in a long wrestle, slow off the ruck) give **six again** (tackle count back to zero, SIX AGAIN! pop-up); offside (a defender up before the ball is played, more likely with Rush) and high shots (Hothead) give a **penalty**: tap and go, kick for touch (ball back, 10 m restart), or a shot at goal for 2 when in range and it makes sense on the clock and score. Sin bins later (BAK-206 B7). | Penalties and six-agains per match in the report; Rush pays for its line speed in penalties; the choice is shown. |
| **2f** — *shipped* | **Weather, injuries, errors in contact.** Rain → handling (knock-ons, drops), wind → kick distance and goal accuracy; a big hit can injure (as the old engine does); an injured player comes off at the next stoppage through 2b, or plays on hampered with no bench left. Ball lost in contact (a knock-on in the tackle, not just strips). Momentum timeline from the play, as the old engine's. | Weather moves error and goal rates in the report; `MatchResult.injuries` is filled and the club game applies them. |
| **2g** — *shipped* | **Live matches behind a setting.** A "Live match (beta)" setting. At kick-off matchday runs `runMatch` headless for the result, so ladder, stats and injuries are applied exactly as today; the match screen then plays **the same seed live** (deterministic, so what you watch is what was recorded). The overlay, score banners, pop-ups, speed controls and skip all work off the live sim; `match:finished` at full time. The overlay reads the half length from `NINES`. | A whole season plays end to end with the setting on; all stats/overlay parity tests pass against `runMatch`; works on a phone. |

**2a as shipped** (where it differs from the row above): the ball is dead after the siren on
a completed tackle, a try (after its celebration), a knock-on, or when time runs out with a
man still down from a tackle; an intercept or a kick in the air plays on, and 60 s after the
siren the half ends regardless. Momentum is the old engine's (tries, big hits and errors,
decaying each set), not from the score. The set length stays `SET_TACKLES` in `config.ts`,
which the old engine shares; `NINES` (`league/rules.ts`) holds the half length, try points
and the half-time numbers (tuning reference §13). Event minutes are Nines minutes (0–18).
A balance plan without `minutes` plays whole matches; with it, one stretch of that length.
The lab's ⏩ skips to the next half-time or full time. Measured: tuning reference §13.

**2b as shipped:** the bench is `TeamSheet.bench` (up to 4) and the policy
`TeamSheet.rotation` (`league/bench.ts`). Squads bench their next four fit players;
rivals generate four (two forwards, a back, a half) on their own random stream, a little
below the starters, so their starters are unchanged. After a try the coach takes off the
men under his line (standard 55%, two at a time; heavy 70%, three) for bench men at least
15% (heavy 10%) fresher; each jogs to the nearest touchline and the fresh man jogs on
from there, and the restart waits for them (12 s at most for the jog off; after that the
swap is made where he stands). At half-time swaps are made in the sheds, but after the break's recovery few men are
still under the line, so in practice nearly all swaps follow tries (about 6.5 a match
between even sides on standard). A tired start (the lab's late legs, a harness stretch) finds the
bench rested at 90%. The snapshot carries who is in each slot (`who`) and the view puts
the new man's own look on the sprite; an **ON!** pop-up and "X on for Y" mark the swap.
The lab has a **Bench** picker (off / standard / heavy, both sides; `#lab?bench=heavy`);
balance plans take `bench` (0–4) and `rotation` per side. Measured: tuning reference §14.

**2c as shipped:** `league/goals.ts`. The conversion is taken by the scoring side's kicker
(slot 5) after the try celebration, in line with the grounding and as far back as makes
the posts widest; the clock stays stopped, and one is taken even after the siren before
the half ends. Odds come from the angle the uprights make, the distance, Skill and Big
Boot (one roll); the flight shows over or wide. Field goals as BAK-208 §4.4: a miss is a
tap restart for the defence on their 20 until 2d brings dead-ball restarts; a charge-down
is a loose ball. **Bonus zone** (follow-up PR, Leon 2026-10-19): a try grounded in the in-goal
between the posts is worth 5; a carrier over the line with no defender within 5 m goes round
under the posts for it (BONUS TRY! pop-up and banner, `detail: 'bonus'` on the MatchEvent so
the overlay counts five); about one try in twenty is one. GOAL!, MISSED!, FIELD GOAL! and CHARGED
DOWN! pop-ups; `goals.*` knobs; `goals` and `fieldGoals` report columns. About 53% of
conversions go over and draws between even sides fall to about 10% (tuning reference §15).

**2d as shipped:** `league/touch.ts`. The side that touched the ball last loses it. Kicks for
touch from deep (60% from the own 20 down to 15% in the attacking half), out on the full about
one in ten; 40/20 attempts on the last from inside the own 40 (8% of kickers, more with Big Boot
or Playmaker); grubbers can roll dead. Restarts: a **set piece** phase (a stoppage: clock
stopped, interchanges allowed) in which a player walks the ball to the spot and both sides set,
then a play-the-ball (touch, on the full) or a tap (20 m restart, 40/20); a goal-line drop-out
is a kick-off from the try line. Bundled into touch on the touchline; held in his own in-goal
→ drop-out; a defender grounding a kick in his own in-goal → 20 m restart. The missed field goal
now uses the real 20 m restart. Pop-ups TOUCH, INTO TOUCH!, 40/20!, ON THE FULL!, DEAD BALL,
DROP-OUT. Report columns `touchFinds`, `fortyTwenties`, `deadBalls`, `kickMetres`. Measured:
tuning reference §16 (tries between even sides drop about one a match; for Phase 3).

**2e as shipped:** `league/penalties.ts`. Six again at any ruck (0.8%) and after a slow wrestle
(+8%): the count back to zero. Offside as the ball is played (Slide 0.8%, Rush 2%, Compressed
0.6%) and high shots (0.2%, +3% a level of Hothead) are penalties, brought out to 10 m. The
captain shoots for 2 (a drop kick from the mark) when it is likely and late and close or the
half is ending; else taps inside 25 m or kicks for touch and taps 10 m in. Pop-ups PENALTY!
(over the offender), the call (GOING FOR GOAL / TAP AND GO / FOR TOUCH), SIX AGAIN!; pop-ups
over neighbouring players now stack instead of overlapping. The MatchResult carries penalty
goals (`penalty-goal`, good / missed), which the overlay already scores. Measured: tuning
reference §17 (about 2.4 penalties and 2.3 six-agains a match; Rush concedes the most).

**2f as shipped:** `league/weather.ts`. Rain makes every knock-on, spilled kick and ball lost
in contact ×1.6; wind carries territory kicks 12% further (±15% a kick) and spreads goal kicks
1.4× as wide. A held tackle (0.6%) or a big hit (3%) can jar the ball loose, less for a
skilful carrier: a knock-on (SPILLED!). A big hit can hurt the carrier, the old engine's roll
scaled to the live sim's 3½× big hits so a season's injuries stay as they are; he runs at 85%
until the next stoppage, when he comes off first for the freshest bench man (HURT!, "on for
the injured …"), or plays on hampered with nobody left. `runMatch` takes `weather` and
`injuryRate` and returns the injuries by squad id, 1–3 weeks. The lab has a weather picker
(`wx=rain`) and shows the rain or wind on the stadium. The momentum timeline from the play
shipped with 2a. Measured: tuning reference §18.

**2g as shipped:** the setting is a "Live match (beta)" tick box at the top of the Fixtures
screen (`settings.liveMatch`, off unless ticked; old saves read it as off). With it on,
matchday plays the player's match with `runMatch` (same seed, weather and injury rate as the
classic engine would get) and applies ladder, stats and injuries from that result as today;
`match:started` carries the seed, and the Match scene plays the same sheets on the same seed
with `view/livePlayback.ts` in place of the event-log replay: the lab's pop-ups, wrestle bar
and sprint streaks on the stadium's sprites, the overlay, score banners, crowd and FX fed the
same `match:event` stream `runMatch` recorded (a test checks the watched stream equals the
result's events), the overlay's clock off the sim (MM:SS, Nines halves), ×1/×2/×4/×8 starting
at ×4, Skip (plays the rest at once, no pop-ups) and `match:finished` at full time. Rival v
rival matches stay on the classic engine. On this container's software GL the handoff takes
about 0.8 s longer than classic and Skip 1.3–2.2 s (coach calls step 2 since: the week holds at the match and the result comes at full time from the match watched, so no headless match at kick-off; handoff 1.2–1.9 s). **Found:** big rating gaps (rivals in a new
game range from 34 to 69) give blowouts of 100+ (classic: about 50–0); the first Phase 3 item.

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
Mid-match coach calls (#73) ride on this architecture later (shipped 2026-10-19,
`docs/specs/coach-calls.md`). Lineups (#69) waited for Phase 2's sheet and shipped after it
(2026-10-19): `GameState.lineup` holds the nine by slot, the bench and the 2b rotation policy,
and `teamSheetFromSquad` builds the sheet from it with positional fit (ARCHITECTURE §4,
tuning reference §21). Interchanges (#70) are part of Phase 2 (§5.1, 2b). No new art beyond
what a phase needs on the field (a sideline swap, goalposts in flight).
