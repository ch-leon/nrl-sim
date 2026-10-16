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
- Physics time is human-scale (a winger runs ~8 m/s). The **match clock is scaled**:
  a 9:00 Nines half elapses in `HALF_REAL_SECONDS` of sim time (start 180 s → ~6 min per
  match at ×1 plus stoppages). Clock stops for tries, conversions and restarts. ×1/×2/×4/×8
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
  and balancing. Target **< 100 ms per match** (≈ 7,000 ticks × 18 agents).
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
| **2** | **Full match:** scoring (try, conversion, penalty goal, field goal), kick types, errors/loose ball, penalties, restarts, halves, stamina; `MatchResult` output; headless mode; behind a setting | A season plays end-to-end on the new engine; all stats/overlay tests pass |
| **3** | **Balance:** thousands of headless matches; score bands, try/error/penalty rates, home edge, weather effects; calibration tests | Rates within agreed bands; `< 100 ms` headless |
| **4** | **Switch-over:** default on, delete old engine/playback, rewrite ARCHITECTURE §6 | Old code gone; Pages live |
| **5** | Traits/skills as visible moves; Nines extras (#77); Capacitor store builds | Separate issues |

Phases 0–1 are the point: if the prototype isn't fun to watch, nothing after it matters.

## 6. Non-goals (for now)
Mid-match coach calls (#73) ride on this architecture later. Interchanges (#70) and
lineups (#69) wait until phase 2 defines the sheet the live sim consumes. No new art.
