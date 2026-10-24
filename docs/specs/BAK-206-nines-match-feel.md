# BAK-206 — Nines trial + richer match feel (contest, kicks, actors)
**GitHub:** https://github.com/ch-leon/nrl-sim/issues/1 | **Priority:** High | **Work unit:** WU-17 (proposed)

> **Context (2026-10-11):** Quick playtest found match playback boring — sparse on-field events,
> invisible last-tackle kicks, and a cluttered 13-a-side field. This spec is the product +
> technical plan for a **Rugby Nines–style trial** and a richer event model. Agreed
> implementation order is locked in §Phased delivery. Items discussed but deferred live in
> §Backlog (do not lose them).

## Problem
`simulateMatch` (BAK-191) + staging/playback produce a watchable scoreline, but the **texture**
of the match is thin:

1. The engine almost never emits `tackle` (kind exists; runs dominate the log).
2. Last-tackle kicks **already resolve territory** but emit **no kick event**, so playback
   never shows a fifth/sixth-tackle kick.
3. Break rate is low (~10% base); big-hits barely lose ground; no fend / break-tackle path.
4. Thirteen-a-side formations feel cluttered on a Kairosoft-scale field.
5. Player names are mostly cosmetic staging — outcomes are team-aggregate, not actor-driven.

We need a trial that makes matches more exciting to watch **without** rewriting the whole
management loop, and without wiring fitness yet.

## Proposed solution
Trial a **Nines-shaped match presentation + sim**:

- **9 on field** per side (sheet + formation + playback sprites).
- **Shorter sets** (5 tackles, not 6).
- A **per-carry contest** that always produces a visible beat (`tackle`, `big-hit`, `fend`,
  `break-tackle`, or `break`), with metres gained/lost.
- **First-class kicks** (last tackle always; rare early kicks) with types (bomb, grubber,
  find-touch, chip) and chase/contest outcomes.
- **Outcome-tied actor selection** from the on-field roster using position + relevant stats.

Keep: seeded determinism, weather/momentum caps, calibration gates (retuned for Nines),
simulate-then-playback architecture for this ticket. Fitness, injury-from-hits, and live
coach buttons are backlog (§Backlog) — designed not to block this trial.

### Reference: Rugby Nines / Auckland Nines
NRL Nines / Auckland Nines: 9-a-side, more space, faster ball movement. We borrow the
**roster size and open-field feel**, not a full ruleset port (no mandatory 20-min halves,
power plays, or conversion variants in v1). Set length shortens to **5** to match the
faster rhythm.

## Phased delivery (agreed order)

| Phase | Scope | Ships excitement via |
|-------|--------|----------------------|
| **1** | Nines roster + formation + **5-tackle sets** | Space, less clutter, faster set turnover |
| **2** | Emit `tackle` + richer big-hit / fend / break-tackle / break | Contested carries, offensive juice |
| **3** | Visible kick events + types + chase | Last-tackle kicks, bombs, grubbers |
| **4** | Outcome-tied player selection | Names/stats match who actually acted |

Phases 1–2 may land in one PR if ownership stays inside `src/sim/` + `src/world/formation.ts`
+ sheet builders; phases 3–4 can follow immediately. Recalibrate statistical tests after
phase 2 (break rate / score bands will shift).

---

## Phase 1 — Nines roster, formation, shorter sets

### Behaviour
- `ON_FIELD = 9` (replace hard `13` in sheet builders / formation / playback).
- `SET_TACKLES = 5` (engine loop `for tackle 1..SET_TACKLES`).
- `SQUAD_MIN` / bankruptcy floor stay at **13** for club management (bench still exists);
  only the **match sheet** is 9. Document clearly so forfeit rules are not confused.
- Suggested on-field slots (home formation mirrored for away):

| Slot | Role |
|------|------|
| 0 | fullback |
| 1–2 | winger ×2 |
| 3 | centre (one) |
| 4 | five-eighth |
| 5 | halfback |
| 6 | hooker |
| 7 | prop (one) |
| 8 | second-row (one) |

Dropped vs 13s: second centre, second prop, second second-row, lock. Lock metres can be
covered by prop/second-row pull in formation.

### Affected files (phase 1)
- `src/config.ts` — `ON_FIELD`, `SET_TACKLES` (or match-only constants in `engine.ts` /
  `formation.ts` if we want to avoid touching season caps).
- `src/sim/engine.ts` — `teamSheetFromSquad` best-N; set loop length.
- `src/world/formation.ts` — `SLOTS` length 9; retune lanes/pull.
- `src/world/playback.ts` / `src/scenes/MatchScene.ts` — consume `PLAYERS` (already does).
- `src/sim/staging.ts` — rival `generatedRoster` size 9.
- Tests: sheet size, formation `PLAYERS === 9`, set ends by tackle 5.

### Acceptance (phase 1)
- [ ] Player match sheets and formations use exactly 9 per side.
- [ ] Sets end by the 5th tackle (kick or score/turnover earlier).
- [ ] Existing calibration tests updated and green (bands may be retuned — document new bands).

---

## Phase 2 — Tackle contest + offensive outcomes

### Problem in code today
`rollTackle` outcomes are effectively `run | break | error | penalty | big-hit`. The
commented “plain tackle” remainder is renormalised away — **`tackle` is never emitted**.
`run` advances 5–15m with no defensive beat. `big-hit` only advances +2m (no loss of
ground) and sometimes jars the ball.

### Proposed per-carry contest
Each tackle count rolls a **contest** between carrier (attack side) and tackler (defence).
Always emit at least one of:

| Kind | Meaning | Field effect | Primary stats (v1, no new attributes) |
|------|---------|--------------|----------------------------------------|
| `tackle` | Completed tackle / play-the-ball | +0–8m (held) | def strength/stamina vs carrier strength |
| `big-hit` | Dominant contact | **−2–12m** (driven back), momentum to defence | defender strength |
| `fend` | Offload-style fend / keep feet | +8–18m, set continues | carrier strength + skill |
| `break-tackle` | Through the line / broken tackle | +12–25m, set continues | carrier strength + speed |
| `break` | Line break into space | +20–40m; try roll if deep | **speed + skill** (raise base rate vs today) |
| `error` | Knock-on / lost ball (incl. jarred from big-hit) | turnover | skill (inverse), rain mult |
| `penalty` | (keep existing) | tap or shot | unchanged |

**Detail strings** (for commentary/playback): e.g. `detail: 'held' | 'driven' | 'jarred' | 'fend' | 'step'`.

**Big-hit follow-ups (v1):**
- Chance to jar → chained `error` (keep ~25% × rain, tunable).
- Driven-back metres mandatory when hit sticks (no jar).
- Injury-from-hit → §Backlog (not in this ticket).

**Offensive juice:** raise effective break / break-tackle / fend rates so equal teams produce
noticeably more line breaks than today (`BASE_BREAK ≈ 0.10` is too quiet). Retune so
calibration still holds (strong teams win more; equal teams not chaos).

### Event kinds
Extend `MatchEventKind` with `fend` and `break-tackle` (or encode as `break`/`tackle` +
`detail` — prefer **distinct kinds** so playback can attach distinct anims). Update
commentary templates and playback beats accordingly.

### Acceptance (phase 2)
- [ ] Every completed carry emits a contest kind (`tackle` / `big-hit` / `fend` /
      `break-tackle` / `break` / `error` / `penalty`) — no silent “run only” default
      unless `run` is kept as a light carry *before* the tackle beat (optional two-step;
      if used, both must be visible).
- [ ] `big-hit` can lose metres; can still jar into `error`.
- [ ] Equal-team sims over ≥200 seeds show higher mean break-like events than pre-change
      baseline (assert a minimum count or rate).
- [ ] Determinism + win-rate / score-band gates still pass (bands documented).

---

## Phase 3 — Kicks (visible, typed, chase)

### Problem in code today
On set expiry the engine calls `kickDistance`, flips possession, sets receiver `fieldX` —
**no event**. Conversions/PG/FG exist; last-tackle attacking kicks do not appear in the log.

### Behaviour
1. **Last tackle of the set** (tackle === `SET_TACKLES`) without score/turnover → always
   emit a `kick` event, then resolve chase/possession.
2. **Early kick (optional spice):** small chance on tackle 1 (and maybe 2) when
   `fieldX` is awkward or footyIQ-analog (attack/kicking) is high — speculative bomb/chip.
3. **Kick types** via `detail` (or `KickKind` in detail):

| Type | When preferred | Resolution sketch |
|------|----------------|-------------------|
| `find-touch` | Midfield, pin them deep | Territory flip; receiver near own line |
| `bomb` | Attacking half | Contest: chaser (winger/centre speed) vs fullback; catch / knock / try chance |
| `grubber` | Near try-line | In-goal scramble; try / dropout / 20m restart |
| `chip` | Rare, broken field | Similar to bomb, shorter |
| `40-20` | Speculative wide kick early | If rules succeed: attacking scrum/tap in their 20 — **simplify** as possession kept + fieldX≈80 on success; else turnover |

4. Missed `penalty-goal` / `field-goal` must emit an event with `detail: 'missed'` (parity
   with conversion).
5. Goal-line dropout / 20m restart can be `set-start` + `detail: 'dropout' | 'restart'`
   (staging already uses restart/turnover/kick tags — extend).

### New kind
Add `kick` to `MatchEventKind`. Playback: kick anim + ball arc; bomb/grubber chase beats.
Commentary: templates per `detail`.

### Acceptance (phase 3)
- [ ] Every set that expires on last tackle produces a `kick` event before possession flip.
- [ ] At least bomb / grubber / find-touch appear across a large seeded sample (not only one type).
- [ ] Bomb/grubber can create a try or turnover via chase (not territory-only).
- [ ] Missed shots at goal are logged.
- [ ] Playback/commentary handle `kick` (minimal beat OK if full anim trails slightly).

---

## Phase 4 — Outcome-tied player selection

### Behaviour
Move actor choice from pure presentation RNG toward **engine-time** (or staging that
reads the same seeded decision using roster stats):

- Try / break / break-tackle / fend → backs & halves weighted by speed/skill.
- Tackle / big-hit (defender) → forwards weighted by strength.
- Error → weighted toward lower skill / higher fatigue later (fatigue backlog).
- Kick taker → halfback → five-eighth → best kicking skill on field.
- Bomb chase → wingers/fullback by speed.

Store `player` (and optionally `detail` for defender name later) on the event at creation
so commentary and playback share one truth. Staging may still assign `x/y` and absolute
field mapping.

### Acceptance (phase 4)
- [ ] Same seed → same actors (determinism).
- [ ] High-speed players appear disproportionately on `break` / bomb chase in aggregate tests.
- [ ] Kick events name a plausible kicker (HB/FE/skill).

---

## Key interfaces (target contract)

```ts
// config or engine constants
export const ON_FIELD = 9;
export const SET_TACKLES = 5;

export type KickKind = 'find-touch' | 'bomb' | 'grubber' | 'chip' | '40-20';

export type MatchEventKind =
  | 'kickoff' | 'set-start'
  | 'run'              // optional light carry; prefer contest kinds as the visible beat
  | 'tackle' | 'big-hit' | 'fend' | 'break-tackle' | 'break'
  | 'error' | 'penalty'
  | 'kick'             // NEW — attacking / territorial kick
  | 'try' | 'conversion' | 'penalty-goal' | 'field-goal'
  | 'half-time' | 'full-time';

// MatchEvent.detail examples:
// tackle: 'held'
// big-hit: 'driven' | 'jarred'
// kick: KickKind
// conversion | penalty-goal | field-goal: 'good' | 'missed'
// set-start: 'turnover' | 'kick' | 'restart' | 'dropout'
```

`TeamSheet.roster` becomes the **9 on field** (not 13). Aggregates still derived from those 9.

Update `docs/ARCHITECTURE.md` §6 when implementing (event kinds, roster size, set length).

## Affected files (full ticket)
- `src/sim/engine.ts`, `events.ts`, `staging.ts`, `commentary.ts`, `weather.ts` (only if
  momentum kinds expand).
- `src/world/formation.ts`, `playback.ts` (new beats for fend / break-tackle / kick).
- `src/ui/screens/matchOverlay.ts` — ignore unknown kinds safely; show kick lines.
- `src/config.ts` — constants as needed.
- `docs/ARCHITECTURE.md` §6.
- Tests under `tests/sim/*`, `tests/world/formation*` / playback helpers as needed.

## Edge cases & risks
- **Calibration shock:** more breaks + kicks → higher scores. Retune bases; keep BAK-191
  spirit (equal ~fair, 80v40 dominant but not 100%).
- **Playback density:** more events per minute — ensure ×1 length stays watchable (may
  shorten REAL_SECONDS slightly).
- **Architecture freeze for coach buttons:** sim is currently **fully resolved before**
  MatchScene. Live influence needs progressive/branching sim (§Backlog) — do not hack
  fake buttons that cannot change the logged result.
- **Management vs match size:** squad still up to 30; do not change `SQUAD_MIN` silently.

## Out of scope (this ticket)
- Fitness affecting late-match error/break rates (backlog).
- Injury from big hits (backlog).
- Live in-match coach call buttons (backlog — needs architecture change).
- New permanent skill attribute (step/accel) — use speed + skill first.
- True Nines laws (20-min halves, power plays, 2-point tries, etc.).
- Playable finals / season-end UI / retirement / monetisation (season backlog).

## Acceptance criteria (ticket done when)
- [ ] Phases 1–4 complete with tests green and ARCHITECTURE §6 updated.
- [ ] Manual preview: a match shows completed tackles, occasional driven big-hits,
      fends/breaks, and visible last-tackle kicks (bomb/grubber/find-touch variety).
- [ ] Determinism preserved; performance still &lt;50ms per `simulateMatch`.

---

## Backlog — discussed, not in this ticket

Capture so nothing from the 2026-10-11 thread (and prior gap review) gets lost.

### Match sim / feel (next after BAK-206)
| ID | Item | Notes |
|----|------|-------|
| B1 | **Wire `fitness`** into late-match error ↑ / break ↓ | Done — GitHub #6 (t≥60 fitness mods). |
| B2 | **Injury from big-hits** | Done — GitHub #7 (engine emits; matchday applies). |
| B3 | **New skill: step / acceleration** | Only if speed+skill still feel flat after phase 2–4. |
| B4 | **Home advantage** | Done — GitHub #8 (~52–58% home win band). |
| B5 | **Rival `cheapSimScore` ≈ full engine** | Ladder credibility. |
| B6 | **Bench / interchanges** | Even a simple 4-man rotation. |
| B7 | **Sin-bin / professional foul** — *shipped in the live sim (#71, 2026-10-19; tuning reference §22)* | From repeated big-hits or cynical penalties. |
| B8 | **True Nines rules pack** | Shorter halves, scoring variants — optional mode flag. |

### Mid-match coach influence (brainstorm — Leon)
**Idea:** During playback, offer buttons to influence the *next* action, e.g.:

- Go for **40/20** / early bomb
- Attempt **field goal**
- **Run it** vs **kick** on last
- Maybe: short side raid / hard carry (bias next contest weights)

**Architectural constraint:** today `matchday` runs `simulateMatch` → applies ladder →
then MatchScene only plays the frozen log. Buttons that change outcomes require one of:

1. **Progressive sim** — simulate set-by-set (or possession-by-possession) during the
   scene; UI intents feed the next `simulateSet(...)` call; ladder apply moves to
   `match:finished`.
2. **Branching re-sim** — keep a seed checkpoint; on decision, re-roll the remainder
   with an intent flag (harder to keep fair / anti-save-scum).
3. **Pre-match / half-time tactics only** — intents chosen before kickoff or at
   half-time, full sim still once (weaker fantasy, much simpler).

**Recommendation:** ship BAK-206 on the current simulate-then-playback path. Design
coach buttons as a follow-up ticket that introduces `simulatePossession` /
`MatchIntent` and delays `applyResult` until full-time. Do not show impotent buttons
over a frozen log.

Suggested future intents API (illustrative, not binding):

```ts
export type MatchIntent =
  | { kind: 'default' }
  | { kind: 'kick'; kick: KickKind }
  | { kind: 'field-goal' }
  | { kind: 'run-it' }; // bias last tackle against kicking

// Progressive: simulatePossession(state, intent, rng) → events + possessionState
```

### Season / meta loop (from gap review — not match feel)
| ID | Item |
|----|------|
| S1 | Playable finals weeks 25–27 (not rollover cheap-sim only) |
| S2 | Season-end UI / history screen (ladder pos, premiership) |
| S3 | Forfeit when fit &lt; `SQUAD_MIN` + apply result |
| S4 | Age retirement |
| S5 | BAK-205 monetisation decision + optional cosmetic kits behind flag |
| S6 | Tutorial Replay + PWA Install in settings | Done — GitHub #9 |
| S7 | Contract weeks on squad cards; HUD multi-week advance |

### Polish already noted
- Raise break visibility and kick chase spectacle in playback (anims for bomb contest,
  driven tackle backwards). The bomb contest done in N15.3 (#297): the two under a bomb or
  a cross-field kick are ringed as it comes down and the one who takes it lights up, with
  the camera wide and the ball's trail; the break and the driven tackle are N15.6's.
  Traits that fire draw a move of their own (N15.4): the fend's arm, the step's cut,
  Big Boot's wider trail, the Playmaker's line through the man he skips, the Wrecking
  Ball's drive and the Hitman's shock, each only when the event names the trait.
- Commentary lines for fend / break-tackle / kick types. Done in N15.2 (#293): the live
  sim's commentary (`src/match/view/commentary.ts`) has its own lines for every kind it
  emits, each kick type and its outcome among them.

---

## Implementation notes for agents
- Pure TS in `src/sim/**`; no Phaser. Playback/formation may change for sprite count and
  new beats.
- All new randomness through seeded RNG; staging stream stays separate if still used for
  y-drift only.
- Prefer extending `detail` + new kinds over overloaded `run`.
- Recalibrate; do not delete statistical tests — update expected bands with a short
  comment citing this ticket.
- Conventional commit: `feat(BAK-206): ...` per phase or one epic commit series.

## Open questions (resolve during phase 1 if needed)
1. Keep match length at 80 sim-minutes, or trial ~60 for Nines pace?
2. Is `run` kept as a pre-tackle carry event, or removed in favour of contest-only beats?
3. ~~Linear vs GitHub~~ — tracking on GitHub Issues (#1).
