# Next autonomous work plans — October 2026 (N5–N9)

Written 19 Oct 2026 (`main` at `caa3e91`, PR #133) while Leon is travelling and unavailable
until about Thu 22 Oct. Four plans (N5–N8) run in parallel with the match rebuild without
touching match, sim or lab code or the BAK-207/208 specs; one plan (N9) is the match-side
follow-on for after N3 and Phase 3. Each plan is one autonomous session: an ID, a one-line
scope, what it may and may not touch, ordered work items (one PR each), and a copy-paste
session prompt carrying the standing rules.

## Where things stand

- **N1 (match rebuild)** owns BAK-207 Phase 2: 2a–2d shipped (#115, #118, #121, #127,
  #128); next 2e penalties and six-again, 2f weather/injuries/errors, 2g live matches behind a
  setting; then coach calls (#73, spec #126 agreed) and Phase 3 balance (#87). Log:
  `docs/status/2026-10-sprint.md`.
- **The club session** finished its queue (#117, #120, #122, #123) and a QA pass (#129–#133,
  with `npm run e2e:season` and `npm run soak`). Log: `docs/status/2026-10-club.md`.
- **N3 (queued, after 2g):** lineup screen #69, sin-bins #71, coach calls.
- **Needs Leon, off-limits for every plan here:** Phase 4 switch-over (#88) and app-store
  builds (#89).
- **Open issues** are all match-side (#68 tracking, #69–#73, #77, #83–#89, #94, #99). Every
  club-side issue is closed, so N5–N8 open their own issues by REST before each PR (titles
  below), except where an existing issue fits (#77 has club-side parts).

### Two observations from the QA pass, measured here

The club log recorded two things it did not fix: the economy runs away upward, and the
player's club wins very heavily. A headless probe through the real tick pipeline (an idle
manager, **no facilities built**, five seeds) shows why, and that both are club-side inputs,
not match-sim behaviour:

| | Player's best nine (mean overall) | Rival mean (range) | Player's record, margin a game | Money |
|---|---|---|---|---|
| New game | 67–69 | 54–55 (34–78) | — | $200k |
| End of season 1 | 64–68 | 56–58 | 14–20 wins of 24, +7 to +15 | $196k–$217k |
| End of season 3 | 60–67 | 60–63 (47–75) | 12–17 wins, +5 to +8 | $570k–$800k |

- The starting squad (3 star / 10 average / 7 rookie) fields a best nine 13 points above the
  league. With one Training Paddock a 60-overall player gains 8–9 overall in season 1; rivals
  develop only at rollover. Stars in the pool cost four weeks' wages (about $5k for an
  80-overall). None of this is in `src/match/` or `src/sim/`; it lives in `createNewGame`,
  `systems/rivals.ts`, `systems/freeagency.ts` and `config.ts`.
- Money climbs even with nothing built: reputation lifts the gate, board grants and prize money
  arrive every season, and nothing costs more as the club grows (no upkeep, flat wages).
- The rival mean itself drifts from 55 to 62 over three seasons even though
  `RIVAL_LEAGUE_MEAN` is 55 (young players develop +0–5 a season and juniors anchor above the
  weak clubs).

How a rating gap turns into a scoreline is N1's Phase 3 work (70 v 50 wins 20/20 today; §7
wants about 70%). The size of the gap is club work: **N5**.

## How the plans fit together

| ID | Scope (one line) | Code | Runs | Value to phone play-testing |
|---|---|---|---|---|
| **N5** | A league you can lose: the player starts near the league, rivals keep up, stars cost money, difficulty bites | `systems/rivals.ts`, `freeagency.ts`, `contracts.ts`, `core/state.ts` (new game), `data/league.ts`, `config.ts`, `qa/soak.ts` | now, parallel with N1 | highest: a season with something to lose |
| **N6** | Money that matters: upkeep, wages that climb, gates with a roof, a season P&L, difficulty retuned | `systems/economy.ts`, `ui/screens/finance.ts`, `config.ts`, `qa/soak.ts` | now, parallel | high: decisions with a cost |
| **N7** | Phone play-testing surface: build label and update prompt, next-match preview, player page, Guide ("How Nines works"), season review, phone polish | `src/ui/**` (not the match overlay), `fx/pwa.ts`, `vite.config.ts`, title flow | now, parallel | high: the loop is readable and testable |
| **N8** | QA loop: regression after every N1 merge, a save corpus that must keep loading, the playthrough grows (live-match setting, desktop, new screens), CI runs, a phone performance budget | `scripts/e2e-season.mjs`, `src/qa/**`, `tests/**`, `.github/workflows/qa.yml` (new), club-side fixes | now, continuous | protects Leon's save and catches breakage early |
| **N9** | Match side, after N3 and Phase 3: headless < 100 ms, rival rounds on the live sim, sprint follow-ups, golden point, match report, AI coach calls, #94/#99 close-out | `src/match/**`, `systems/fixtures.ts`, `scenes/MatchScene.ts`, overlay | after N3 and Phase 3 | the whole league on one engine |

Start order by value: N5 and N8 first (N8 is a loop and should be watching `main` from the
start, while four sessions merge into it), then N6, then N7. N5 and N6 both
add columns to the soak (`SeasonSample` in `src/qa/soak.ts`): whichever merges first wins and
the other rebases; the changes are additive.

## Standing rules (in every prompt below)

1. **Merge to `main` yourself (squash)** when CI is green and your own checks pass:
   `npx tsc --noEmit`, `npx vitest run`, `npm run build`, and Playwright screenshots at
   **844×390** and a **desktop size (1280×800)** that you have looked at yourself, committed
   under `docs/screenshots/<PR>/`. Chromium is at `/opt/pw-browsers/chromium` (use
   `playwright-core` the way `scripts/e2e-season.mjs` does); **never run `playwright install`**.
2. **Every `GameState` change bumps `SAVE_VERSION`** (`src/core/state.ts`) with one new step
   in `MIGRATIONS` (`src/core/save.ts`) and a test that a save of the previous version loads
   with the defaults filled. If `main`'s `SAVE_VERSION` moved under you (N3's lineup, another
   plan's PR), renumber your step on rebase; never reuse a number.
3. **When something is Leon's call,** choose the simplest reasonable option and mark it
   **"Assumed (needs Leon)"** in the PR body and in your status file.
4. **Log every PR** in your plan's status file, `docs/status/2026-10-<plan>.md`, in the style
   of `docs/status/2026-10-club.md`: what merged, the numbers, every assumption, what is next.
5. **GitHub by REST and the `/ccr/` routes only; GraphQL is blocked.** `gh pr create`,
   `gh pr merge` and `gh pr view` use GraphQL and fail here. Use `gh api`: open a PR with
   `POST repos/ch-leon/nrl-sim/pulls`, read CI with `GET repos/ch-leon/nrl-sim/commits/<sha>/check-runs`,
   merge with `PUT repos/ch-leon/nrl-sim/pulls/<n>/merge -f merge_method=squash`, open issues
   with `POST repos/ch-leon/nrl-sim/issues`.
6. **Pull `main` and rebase often:** N1 merges several times a day. Rebase before opening a
   PR and again before merging.
7. **No model identifiers** in commits, PR titles or bodies, code comments or docs.
8. **Mark anything that needs Leon's go "Needs Leon"** and leave it. Do not plan around
   secrets, payments, accounts or Leon's devices.
9. **Do not change game code outside your plan's "may touch" list**, and never the files in
   "Off-limits" below. If a fix needs one, write it up in the status file and open an issue
   for the owning session instead.

## Off-limits for N5–N8

The match rebuild (N1, then N3) owns: `src/match/**`, `src/sim/**`, `src/world/playback.ts`,
`src/world/formation.ts`, `src/world/readability.ts`, `src/scenes/MatchScene.ts`,
`src/scenes/matchField.ts`, `src/scenes/matchArt.ts`, `src/art/match/**`,
`src/fx/atmosphere.ts`, `src/ui/screens/matchOverlay.ts`, `src/systems/matchday.ts` (2g
rewrites it), `balance/**`, `scripts/balance.ts`, `scripts/balance-log.sh`,
`.github/workflows/balance.yml`, `docs/specs/BAK-207*`, `docs/specs/BAK-208*`,
`docs/specs/coach-calls.md`, `docs/status/2026-10-sprint.md`.

Also leave alone until the owner has merged: the **settings popup** in `src/fx/audio.ts`
(`initAudioUi`; 2g adds the "Live match (beta)" toggle there), anything called **lineup** or a
`GameState.lineup` field (N3, #69), and the Squad screen's structure (N3 opens the lineup
screen from it; adding a tap target to `PlayerCard` is fine).

`src/main.ts` is shared: additive registrations only (one `nav.registerScreen` or one `init…()`
call), never a reorder. The nav bar is full on a landscape phone (#130), so **no new nav
buttons**: open new screens from existing ones (Fixtures, Squad, Finance, "?").

---

## N5 — A league you can lose

**Scope:** the player's club starts near the league, rivals keep up during the season, stars
cost real money, and difficulty changes the fight. Measured with the soak; no match code.

**Why:** see the table above. Leon's play-test is 44–0 in round 1 and 18–6 over a season
regardless of what he does. The sim's margin for a given gap is N1's Phase 3; the gap is ours.

**May touch:** `src/core/state.ts` (`createNewGame` only; no `GameState` shape change unless
noted), `src/data/player.ts`, `src/data/league.ts`, `src/systems/rivals.ts`,
`src/systems/freeagency.ts`, `src/systems/contracts.ts`, `src/systems/morale.ts`,
`src/systems/league.ts`, `src/config.ts` (`DIFFICULTY`, new `LEAGUE`/`PARITY` block),
`src/ui/screens/recruit.ts` (the fee label only), `src/qa/soak.ts`, `scripts/soak.ts`, their
tests, `docs/ARCHITECTURE.md` §4 notes, `docs/status/2026-10-league.md` (new).

**May not touch:** the off-limits list; `teamSheetFromSquad` and the morale modifier inside
`src/sim/engine.ts` (match code; if the morale edge needs capping, do it on the inputs);
`systems/matchday.ts`; balance plans or knobs. State gap targets in rating points, not match
margins: margins come from the old engine until 2g flips the default and will move with
Phase 3.

### Work items (one PR each; open an issue by REST first with the title given)

1. **"Soak: the player's record and the rating gap, per season"** (branch
   `league/soak-parity`). `SeasonSample` gains `wins`, `draws`, `losses`, `marginPerGame`,
   `ladderPosition`, `bestNine` (player), `rivalMean`, `rivalRange`; `scripts/soak.ts` prints
   them; the status file gets the baseline table (20 seeds, idle / managed / idle Hard, 5
   seasons). No game change. Also note the managed mode's signings (how many stars, at what
   fee) since item 4 depends on it.
2. **"New game: the player starts near the league, and the league starts in a band"**
   (`league/new-game-parity`). Recommended: a starting mix whose best nine lands about 2 points
   above the rival mean (one star for a hero, more rookies), rival `strength` values in
   `data/league.ts` re-spread across about 42–70 (a 35 side loses every week; a 78 side runs
   away), and `DIFFICULTY` offsets the player's start (easy +4, hard −4). New games only, so no
   save bump. Update the tests that assert the 3/10/7 mix. **Assumed (needs Leon):** the start
   point and the band.
3. **"Rivals develop in-season and the league mean holds"** (`league/rival-development`).
   A weekly rival development step on their own stream (young players gain a little each week,
   veterans fade, scaled so a mid-table rival keeps pace with one Paddock plus one Gym), and an
   anchor that keeps the league mean at `RIVAL_LEAGUE_MEAN` ± 2 over five seasons (today it
   drifts 55 → 62). Soak before/after in the PR. **Assumed (needs Leon):** the rates.
4. **"Stars aren't free: signing fees by rating and rivals that compete for the pool"**
   (`league/signing-fees`). The signing fee becomes a transfer-style fee that grows with
   overall (reuse `transferFee` = overall² × 10, so an 80-overall costs about $64k, a 55 about
   $30k; `SIGNING_FEE_WEEKS` stays for juniors), with a Scout Office discount; rivals already
   sign weekly, so also let a rival snap up a star the player left in the pool for more than a
   refresh. Unify `marketWage` (defined twice: `contracts.ts`, `rivals.ts`). The Recruit
   screen shows the fee. No save bump. **Assumed (needs Leon):** fee curve, discount.
5. **"Difficulty that bites"** (`league/difficulty`). After 2–4, re-run the soak per difficulty
   and tune `DIFFICULTY` (rival strength ×, wages ×, starting money) so: idle Normal finishes
   mid-table and misses finals most seasons; managed Normal makes finals most seasons and
   wins a premiership now and then; Hard is a fight to keep the board's patience; Easy is
   comfortable. Numbers in the status file. **Assumed (needs Leon):** the targets.
6. **Status file and ARCHITECTURE §4 note** can ride with each PR; finish with a summary
   section like the club log's.

### Session prompt (copy-paste)

```
You are N5, an autonomous session on ch-leon/nrl-sim while Leon is travelling (back about
Thu 22 Oct). Read CLAUDE.md, README.md, docs/ARCHITECTURE.md, docs/status/2026-10-club.md,
docs/status/2026-10-sprint.md and docs/plans/2026-10-next-plans.md (your plan is N5). Keep
your log in docs/status/2026-10-league.md in the style of the club log.

Scope: a league you can lose. The player's best nine starts 13 points above the rival mean
(about 68 v 55), rivals develop only at season rollover while the player trains weekly, and a
star in the pool costs four weeks' wages. Make the player start near the league, rivals keep
up in-season with the league mean holding at RIVAL_LEAGUE_MEAN, stars cost real money, and
difficulty change the fight. Measure everything with npm run soak (src/qa/soak.ts); state
targets in rating points, not match margins (margins are N1's Phase 3 and still come from the
old engine).

Work items, one PR each, in order (open or reuse a GitHub issue by REST first):
1. Soak reports the player's record and the rating gap per season (baseline table in your log).
2. New game: the player's squad starts about 2 points above the rival mean, rival strengths in
   data/league.ts re-spread to about 42–70, DIFFICULTY offsets the start. New games only.
3. Rivals develop in-season on their own RNG stream; the league mean holds at 55 ± 2 over five
   seasons (today it drifts to 62).
4. Signing fees grow with overall (transferFee curve), Scout Office discount, rivals pick up
   stars left in the pool; unify marketWage; Recruit shows the fee.
5. Retune DIFFICULTY against the soak: idle Normal mid-table, managed Normal makes finals
   most seasons, Hard is a fight, Easy comfortable.

You may touch: src/core/state.ts (createNewGame only), src/data/player.ts, src/data/league.ts,
src/systems/rivals.ts, freeagency.ts, contracts.ts, morale.ts, league.ts, src/config.ts,
src/qa/soak.ts, scripts/soak.ts, tests, docs/ARCHITECTURE.md notes, your status file, and
src/ui/screens/recruit.ts for the fee label. Do not touch src/match/**, src/sim/** (including
teamSheetFromSquad), src/systems/matchday.ts, src/world/playback.ts, formation.ts,
readability.ts, src/scenes/Match*, src/art/match/**, src/ui/screens/matchOverlay.ts,
balance/**, the balance scripts and workflow, docs/specs/BAK-207*, BAK-208*, coach-calls.md,
docs/status/2026-10-sprint.md, the settings popup in src/fx/audio.ts, anything named lineup,
or the Squad screen's structure. src/main.ts: additive only. No new nav buttons.

Standing rules:
- Merge to main yourself (squash) when CI is green and your own checks pass: npx tsc --noEmit,
  npx vitest run, npm run build, and Playwright screenshots at 844x390 and 1280x800 that you
  have looked at yourself, committed under docs/screenshots/<PR>/. Chromium is at
  /opt/pw-browsers/chromium (playwright-core, as scripts/e2e-season.mjs does); never run
  `playwright install`.
- Every GameState change bumps SAVE_VERSION with a migration step and a test; renumber on
  rebase if main moved; never reuse a number. (This plan should need no bump.)
- When something is Leon's call, take the simplest reasonable option and mark it
  "Assumed (needs Leon)" in the PR body and the status file. Mark anything that needs his go
  "Needs Leon" and leave it. No secrets, payments, accounts or devices.
- Log every PR in docs/status/2026-10-league.md.
- GitHub by REST and the /ccr/ routes only (GraphQL is blocked): gh api for opening PRs
  (POST repos/ch-leon/nrl-sim/pulls), reading check-runs, merging
  (PUT repos/ch-leon/nrl-sim/pulls/<n>/merge -f merge_method=squash) and opening issues.
- Pull main and rebase often; N1 merges frequently. N6 also edits src/qa/soak.ts: rebase,
  keep both sets of columns.
- No model identifiers in commits, PR titles or bodies, comments or docs.
- Finish with a summary section in your status file: what merged, the before/after soak
  tables, every assumption, and what you would do next.
```

---

## N6 — Money that matters

**Scope:** sinks that scale with the club (facility upkeep, wages that climb with quality and
success), gates with a roof, a season P&L the player can read, and difficulty retuned so money
is a decision again. Measured with the soak.

**Why:** $200k → $1–3M in five seasons even for an idle manager (club log), $800k in three
with nothing built (probe). Gates roughly match wages and everything else is upside. Nothing
costs more as the club grows.

**May touch:** `src/systems/economy.ts`, `src/systems/board.ts` (grants/prize only),
`src/systems/contracts.ts` (renewal asks), `src/systems/events.ts` and `src/data/events.ts`
(cash amounts only), `src/data/facility.ts` (an `upkeep` field), `src/config.ts` (`ECON`,
`BOARD`, `PRIZE`, `DIFFICULTY.wages`), `src/ui/screens/finance.ts`, `src/ui/screens/build.ts`
(the upkeep label only), `src/qa/soak.ts`,
`scripts/soak.ts`, `src/core/state.ts` + `save.ts` for item 5's per-season totals, tests,
`docs/specs/BAK-188-economy.md` (append a "2026-10 retune" section), `docs/status/2026-10-economy.md`.

**May not touch:** the off-limits list; `rivals.ts` wage cap except to scale it in step with
item 3 (coordinate with N5 item 4 through the status files); the HUD's money format.

### Work items

1. **"Soak: money by source, per season"** (`economy/soak-money`). Tally `money:changed`
   reasons per season (wages, sponsor+grant, gate, prize, board grants, event cash, signing
   fees, build/upgrade/move/demolish, upkeep once it exists) into `SeasonSample.finance`,
   print a per-season P&L in `scripts/soak.ts`, and put the baseline in the status file. No
   game change.
2. **"Facility upkeep"** (`economy/upkeep`). Each built facility costs a weekly upkeep from a
   catalog `upkeep` field (default about 1% of build cost a week, ×1.5 at L2, ×2 at L3; a
   grandstand about $1.2k/wk at L1), paid in `applyEconomy` with ledger reason `upkeep`, shown
   as a Finance row and in the Build menu's facility info. No save bump. **Assumed (needs
   Leon):** the rate.
3. **"Wages that climb with quality and success"** (`economy/wages`). Market wage gains a
   super-linear term (so a squad of 70s costs far more than a squad of 55s), renewal asks track
   reputation and the season (a successful club pays more), the rival wage cap scales in step so
   rivals keep signing; `marketWage` lives in one module (N5 item 4 may have done this; rebase).
   No save bump. **Assumed (needs Leon):** the curve.
4. **"Gates with a roof"** (`economy/gates`). Attendance = min(capacity, demand): capacity
   from the Grandstand level (none built = a small hill, about 2,000), demand from reputation,
   recent form and the fixture (a top-eight clash or a derby draws more). Finance's projected
   gate uses the same function. No save bump. **Assumed (needs Leon):** capacities, demand
   weights.
5. **"Season P&L on the Finance screen"** (`economy/season-pnl`). Persist per-season totals by
   source (`GameState.finance`), **bump `SAVE_VERSION`** with a migration (old saves start empty
   for the current season) and a test; Finance shows this season against last, biggest lines
   first, on a phone in two columns.
6. **"Money targets by difficulty"** (`economy/difficulty-money`). With 2–5 in, retune
   `PRIZE`, `BOARD.GRANT_PER_MET`, event cash, `ECON.FORCED_SALE_FLOOR` and
   `DIFFICULTY.wages`/`startingMoney` so, over five soak seasons: idle Normal drifts into the
   red by season 3–4 (a warning, not an instant fire sale); managed Normal grows slowly (about
   $200k → $400k); Hard can go bust; Easy is comfortable. Numbers in the status file.
   **Assumed (needs Leon):** the targets.

### Session prompt (copy-paste)

```
You are N6, an autonomous session on ch-leon/nrl-sim while Leon is travelling (back about
Thu 22 Oct). Read CLAUDE.md, README.md, docs/ARCHITECTURE.md, docs/specs/BAK-188-economy.md,
docs/status/2026-10-club.md, docs/status/2026-10-sprint.md and
docs/plans/2026-10-next-plans.md (your plan is N6). Keep your log in
docs/status/2026-10-economy.md in the style of the club log.

Scope: money that matters. The economy runs away upward ($200k to $1–3M in five seasons even
idle; $800k in three with nothing built): nothing costs more as the club grows. Add sinks that
scale (facility upkeep, wages that climb with quality and success), put a roof on gates, give
the player a season P&L, and retune difficulty so money is a decision. Measure with
npm run soak (src/qa/soak.ts).

Work items, one PR each, in order (open or reuse a GitHub issue by REST first):
1. Soak tallies money:changed reasons per season into SeasonSample.finance and prints a P&L;
   baseline table in your log. No game change.
2. Facility upkeep: a catalog `upkeep` field (about 1% of build cost a week, x1.5 L2, x2 L3),
   paid in applyEconomy with ledger reason `upkeep`; Finance row; Build menu shows it.
3. Wages climb: a super-linear market wage, renewal asks that track reputation and season,
   the rival wage cap scaled in step; one marketWage module (rebase on N5 if it did this).
4. Gates with a roof: attendance = min(capacity by Grandstand level, demand from reputation,
   form and the fixture); Finance's projection uses the same function.
5. Season P&L on Finance: per-season totals by source in GameState.finance (bump
   SAVE_VERSION, migration, test); this season v last, biggest lines first, two columns on a
   phone.
6. Money targets by difficulty: retune PRIZE, board grants, event cash, FORCED_SALE_FLOOR and
   DIFFICULTY so idle Normal drifts into the red by season 3–4, managed Normal grows slowly,
   Hard can go bust, Easy is comfortable. Numbers in your log.

You may touch: src/systems/economy.ts, board.ts (grants/prize), contracts.ts (renewal asks),
events.ts and src/data/events.ts (cash amounts), src/data/facility.ts (upkeep field),
src/config.ts, src/ui/screens/finance.ts and build.ts (upkeep label), src/qa/soak.ts,
scripts/soak.ts, src/core/state.ts and save.ts for item 5, tests, BAK-188 (append a retune
section), your status file. Do not touch src/match/**, src/sim/**, src/systems/matchday.ts,
src/world/playback.ts, formation.ts, readability.ts, src/scenes/Match*, src/art/match/**,
src/ui/screens/matchOverlay.ts, balance/**, the balance scripts and workflow,
docs/specs/BAK-207*, BAK-208*, coach-calls.md, docs/status/2026-10-sprint.md, the settings
popup in src/fx/audio.ts, anything named lineup, or the Squad screen's structure.
src/main.ts: additive only. No new nav buttons.

Standing rules:
- Merge to main yourself (squash) when CI is green and your own checks pass: npx tsc --noEmit,
  npx vitest run, npm run build, and Playwright screenshots at 844x390 and 1280x800 that you
  have looked at yourself, committed under docs/screenshots/<PR>/. Chromium is at
  /opt/pw-browsers/chromium (playwright-core, as scripts/e2e-season.mjs does); never run
  `playwright install`.
- Every GameState change bumps SAVE_VERSION with a migration step and a test; renumber on
  rebase if main moved (N3's lineup and N7's season review also bump); never reuse a number.
- When something is Leon's call, take the simplest reasonable option and mark it
  "Assumed (needs Leon)" in the PR body and the status file. Mark anything that needs his go
  "Needs Leon" and leave it. No secrets, payments, accounts or devices.
- Log every PR in docs/status/2026-10-economy.md.
- GitHub by REST and the /ccr/ routes only (GraphQL is blocked): gh api for opening PRs
  (POST repos/ch-leon/nrl-sim/pulls), reading check-runs, merging
  (PUT repos/ch-leon/nrl-sim/pulls/<n>/merge -f merge_method=squash) and opening issues.
- Pull main and rebase often; N1 merges frequently. N5 also edits src/qa/soak.ts and
  contracts.ts: rebase, keep both.
- No model identifiers in commits, PR titles or bodies, comments or docs.
- Finish with a summary section in your status file: what merged, the before/after P&L tables
  by difficulty, every assumption, and what you would do next.
```

---

## N7 — Phone play-testing surface

**Scope:** the things that make Leon's phone sessions readable and testable: which build he is
on and a clean update, a next-match preview and form guide, a player page, a Guide under "?"
with "How Nines works", a season review at rollover, and a polish pass over every screen at
phone sizes.

**Why:** `main` deploys to Pages after every merge and the service worker swaps itself
mid-session (`registerType: 'autoUpdate'`), so Leon cannot tell which build he is testing and
may be reloaded mid-match. The club loop has grown (events, contracts, finance, kits, rival
squads, move/demolish, multi-week advance) past a seven-step tutorial. Results arrive as a
one-line toast; there is no "who are we playing" view and no end-of-season moment.

**May touch:** `src/ui/**` except `screens/matchOverlay.ts` and the Squad screen's structure;
`src/fx/pwa.ts`; `vite.config.ts`; `scripts/gen-icons.mjs`; the title flow in
`src/core/save.ts` (`showTitleFlow`, label only); `src/systems/league.ts` for pure form/view
helpers; `src/core/state.ts` + `save.ts` for item 5's optional `SeasonRecord` fields; `index.html`
(safe-area CSS); tests; `docs/QA-pwa.md`; `docs/status/2026-10-ux.md`.

**May not touch:** the off-limits list; the settings popup in `audio.ts` (put the build label
on the title screen and the Guide instead); the nav bar's button set (open everything from
existing screens or "?").

### Work items

1. **"Build label and a visible update"** (`ux/build-label-update`). A short build label
   (date + short SHA, from a Vite `define` filled by `git rev-parse` at build time, with a
   fallback) on the title screen and in the Guide; the service worker switches to
   `registerType: 'prompt'` with `onNeedRefresh` → a "New version ready: reload" toast with a
   button, never auto-reloading during a match (`nrl-match-active` on `<body>`). `docs/QA-pwa.md`
   updated. **Assumed (needs Leon):** prompt rather than auto-update.
2. **"Next match preview and a form guide"** (`ux/next-match`). On the Fixtures tab a card for
   the player's next fixture: opponent, home/away, their strength and form (last five, as W/D/L
   dots), their best three (from `RivalClub.squad`), head-to-head this season, the weather if
   set; the Ladder gains a form column. Pure view-model in `systems/league.ts`, tested. No save
   bump.
3. **"Player page"** (`ux/player-page`). Tap any `PlayerCard` (Squad, Recruit, rival squad) →
   a page: portrait, stat bars, traits with their tips, age and position, morale, contract and
   wage, season and career tallies, and the actions that apply (sign / renew / sell / release
   through the existing system functions). Replaces hopping between Squad and Contracts. No
   save bump.
4. **"Guide under ?, with How Nines works"** (`ux/guide`, part of **#77**'s docs ask). "?" opens
   a Guide screen: short pages (Your week · Money · Squad and contracts · Events · Ladder and
   finals · Grounds · **How Nines works**), the build label, and "Replay tutorial". The Nines
   page is a data file (`src/ui/guide/nines.ts`) describing the live sim as shipped (9 a side,
   two 9:00 halves, 5-tackle sets, drop-kick conversions, 5-point bonus-zone tries between the
   posts, unlimited interchange, no scrums, 40/20, touch and drop-outs; six-again and
   penalties when 2e lands) so N1 can keep it current with a one-file PR. The tutorial gets
   steps for News/decisions, Finance and Contracts, keeps Skip. No save bump.
5. **"Season review at rollover"** (`ux/season-review`). On `season:ended`, a modal instead of
   a toast: ladder finish and record, top try scorer, player of the match count, the board's
   verdict and patience, money in v out (N6's P&L if merged), retirements and juniors, the
   rival movers. Needs a few optional fields on `SeasonRecord` → **bump `SAVE_VERSION`**,
   migration, test. **Assumed (needs Leon):** what is on it.
6. **"Phone polish from screenshots"** (`ux/phone-polish-*`, one PR per cluster). Screenshot
   every screen at 844×390, 667×375 and 1280×800 and fix what you see: tap targets ≥ 44 px,
   modals that fit, two-column card grids, HUD legibility, `env(safe-area-inset-*)` on notched
   phones, text that wraps instead of clipping. Presentation only.

### Session prompt (copy-paste)

```
You are N7, an autonomous session on ch-leon/nrl-sim while Leon is travelling (back about
Thu 22 Oct). Read CLAUDE.md, README.md, docs/ARCHITECTURE.md (§1.6 DOM overlay, §7),
docs/QA-pwa.md, docs/status/2026-10-club.md, docs/status/2026-10-sprint.md and
docs/plans/2026-10-next-plans.md (your plan is N7). Keep your log in
docs/status/2026-10-ux.md in the style of the club log.

Scope: the phone play-testing surface. Leon tests the Pages build on his phone and main
deploys after every merge. Give him a build label and a clean update prompt, a next-match
preview and form guide, a player page, a Guide under "?" with "How Nines works" (#77's docs
ask), a season review at rollover, and a polish pass over every screen at phone sizes.

Work items, one PR each, in order (open or reuse a GitHub issue by REST first):
1. Build label (date + short SHA via a Vite define, with a fallback) on the title screen; the
   service worker moves to registerType 'prompt' with a "New version ready: reload" toast that
   never fires during a match (body.nrl-match-active). Update docs/QA-pwa.md.
2. Next-match preview card on the Fixtures tab (opponent, venue, strength, last-five form,
   best three from RivalClub.squad, head-to-head, weather) and a form column on the Ladder.
   Pure view-model in src/systems/league.ts, tested.
3. Player page from any PlayerCard: portrait, stats, traits with tips, contract, morale,
   season and career tallies, and the actions that apply through the existing system functions.
4. Guide under "?": pages for Your week, Money, Squad and contracts, Events, Ladder and finals,
   Grounds, How Nines works (a data file src/ui/guide/nines.ts describing the live sim as
   shipped so N1 can update it), the build label, Replay tutorial; tutorial steps for
   News/decisions, Finance, Contracts.
5. Season review modal on season:ended (finish, record, top scorer, POTM count, board verdict,
   money in v out, retirements, juniors, rival movers); optional SeasonRecord fields with a
   SAVE_VERSION bump, migration and test.
6. Phone polish, one PR per cluster, from your own screenshots at 844x390, 667x375 and
   1280x800: tap targets >= 44px, modals that fit, card grids, HUD legibility, safe-area
   insets, no clipped text.

You may touch: src/ui/** except screens/matchOverlay.ts and the Squad screen's structure
(adding a tap target to PlayerCard is fine), src/fx/pwa.ts, vite.config.ts,
scripts/gen-icons.mjs, showTitleFlow in src/core/save.ts (label only), src/systems/league.ts
(pure view helpers), src/core/state.ts and save.ts for item 5, index.html (safe-area CSS),
tests, docs/QA-pwa.md, your status file. Do not touch src/match/**, src/sim/**,
src/systems/matchday.ts, src/world/playback.ts, formation.ts, readability.ts,
src/scenes/Match*, src/art/match/**, src/ui/screens/matchOverlay.ts, balance/**, the balance
scripts and workflow, docs/specs/BAK-207*, BAK-208*, coach-calls.md,
docs/status/2026-10-sprint.md, the settings popup in src/fx/audio.ts (2g adds a toggle
there), or anything named lineup (N3). src/main.ts: additive only. No new nav buttons: open
new screens from Fixtures, Squad, Finance or "?".

Standing rules:
- Merge to main yourself (squash) when CI is green and your own checks pass: npx tsc --noEmit,
  npx vitest run, npm run build, and Playwright screenshots at 844x390 and 1280x800 that you
  have looked at yourself, committed under docs/screenshots/<PR>/. Chromium is at
  /opt/pw-browsers/chromium (playwright-core, as scripts/e2e-season.mjs does); never run
  `playwright install`.
- Every GameState change bumps SAVE_VERSION with a migration step and a test; renumber on
  rebase if main moved (N3's lineup and N6's season P&L also bump); never reuse a number.
- When something is Leon's call, take the simplest reasonable option and mark it
  "Assumed (needs Leon)" in the PR body and the status file. Mark anything that needs his go
  "Needs Leon" and leave it. No secrets, payments, accounts or devices.
- Log every PR in docs/status/2026-10-ux.md.
- GitHub by REST and the /ccr/ routes only (GraphQL is blocked): gh api for opening PRs
  (POST repos/ch-leon/nrl-sim/pulls), reading check-runs, merging
  (PUT repos/ch-leon/nrl-sim/pulls/<n>/merge -f merge_method=squash) and opening issues.
- Pull main and rebase often; N1 merges frequently. Tell N8 (docs/status/2026-10-qa.md) which
  selectors your new screens use so the playthrough can cover them.
- No model identifiers in commits, PR titles or bodies, comments or docs.
- Finish with a summary section in your status file: what merged, screenshots, every
  assumption, and what you would do next.
```

---

## N8 — QA loop

**Scope:** keep `main` playable on a phone while four sessions merge into it: a regression run
after every match-side merge, a corpus of real saves that must keep loading, a playthrough that
grows with the game (the live-match setting, desktop size, new screens), the same runs in
GitHub Actions, and a phone performance budget. Club-side fixes one PR each; match-side
findings become issues for N1.

**Why:** 2e–2g rewrite `matchday.ts` and the match screen's hand-off, N3 bumps the save, N6 and
N7 bump it again. The tools exist (#133); nobody is running them.

**May touch:** `scripts/e2e-season.mjs`, `scripts/soak.ts`, `src/qa/**`, `tests/**`,
`tests/fixtures/saves/` (new), `.github/workflows/qa.yml` (new), `package.json` scripts,
`docs/QA-pwa.md`, `docs/status/2026-10-qa.md`, plus club-side fixes in the files N5–N7 may touch
(coordinate through the status files; small fixes only). `?e2e` hooks in `src/main.ts` stay
additive.

**May not touch:** the off-limits list. A match-side finding gets an issue titled
`[match] …` with the Flag code or screenshot and nothing else: the sprint log is N1's and is
never edited here.

### Work items

1. **Regression loop** (no PR of its own; recurring). After every merge to `main` that touches
   `src/systems/matchday.ts`, `src/scenes/MatchScene.ts`, `src/main.ts`, `src/core/save.ts` or
   `src/core/state.ts`, and otherwise every ~6 hours: pull, `npm run e2e:season`, `npm run
   soak`, look at the screenshots, triage. Club-side bug → a `qa/…` PR with a test or an e2e
   step that would have caught it. Match-side → a `[match]` issue. Every run gets a row in the
   status file (SHA, steps passed, problems, time).
2. **"Save corpus: real saves that must keep loading"** (`qa/save-corpus`). The playthrough
   dumps `localStorage` slot 1 at four points (after the tutorial, mid-season, after the
   rollover, season 2) to `e2e-output/saves/`; commit two or three as
   `tests/fixtures/saves/v<N>-<point>.json` (about 120 KB each) and add a test that every corpus
   save migrates to `SAVE_VERSION`, passes `checkState`, and plays a season headless. Refresh
   the corpus after each save bump lands (one file per version, never edit an old one).
3. **"The playthrough grows with the game"** (`qa/e2e-grows`, several PRs). A `--size` flag
   (844×390 default, 1280×800), a portrait step that checks the rotate card and that the loop
   sleeps, the **live-match setting once 2g lands** (toggle it where N1 put it, play one match
   through the overlay to Back to Club, skip the step when the setting does not exist yet),
   N7's screens as they land (preview, player page, Guide, season review; selectors from
   `2026-10-ux.md`), and a zero-console-error assertion.
4. **"Playthrough and soak in GitHub Actions"** (`qa/ci-workflow`). `.github/workflows/qa.yml`
   on `workflow_dispatch` and nightly: `npm run soak`, then `npm run e2e:season` with
   `CHROMIUM_PATH` pointing at the runner's preinstalled Chrome (`ubuntu-latest` ships
   `google-chrome`; no download, no `playwright install`), `e2e-output/` uploaded as an
   artifact, a summary in the job. Not on every PR (minutes). **Assumed (needs Leon):** the
   nightly schedule stays on.
5. **"Phone performance budget"** (`qa/perf-budget`). With Playwright CPU throttling ×4 at
   844×390: boot to title (BootScene texture generation), a week advance, a ×4 advance, the
   season rollover, the Pages bundle size. Log a table; fix only obvious club-side hot spots
   (one PR each); anything in the match or scenes → `[match]` issue.

### Session prompt (copy-paste)

```
You are N8, an autonomous QA session on ch-leon/nrl-sim while Leon is travelling (back about
Thu 22 Oct). Read CLAUDE.md, README.md, docs/ARCHITECTURE.md, docs/QA-pwa.md,
docs/status/2026-10-club.md (the QA pass section), docs/status/2026-10-sprint.md and
docs/plans/2026-10-next-plans.md (your plan is N8). Keep your log in
docs/status/2026-10-qa.md.

Scope: keep main playable on a phone while N1 (match), N5 (league), N6 (economy) and N7 (UX)
merge into it. npm run e2e:season and npm run soak exist (#133); run them, grow them, and put
them in CI. Club-side fixes are yours, one PR each with a test or e2e step that would have
caught the bug. Match-side findings (anything under src/match, src/sim, MatchScene, the
overlay, matchday) become GitHub issues titled "[match] ..." with the Flag code or screenshot;
you never fix those and never edit docs/status/2026-10-sprint.md.

Work items:
1. Regression loop, recurring: after every merge to main touching src/systems/matchday.ts,
   src/scenes/MatchScene.ts, src/main.ts, src/core/save.ts or src/core/state.ts, and
   otherwise every ~6 hours: pull, run both tools, look at the screenshots, triage, log a row
   (SHA, steps passed, problems, time).
2. Save corpus: the playthrough dumps slot 1 at four points to e2e-output/saves/; commit two
   or three as tests/fixtures/saves/v<N>-<point>.json with a test that each migrates to
   SAVE_VERSION, passes checkState and plays a season headless. Add a file per new save
   version; never edit an old one.
3. The playthrough grows: a --size flag (844x390 and 1280x800), a portrait rotate-card step,
   the live-match setting once 2g lands (toggle, play a match through the overlay to Back to
   Club; skip if absent), N7's screens as they land (selectors in docs/status/2026-10-ux.md),
   a zero-console-error assertion.
4. .github/workflows/qa.yml on workflow_dispatch and nightly: soak, then e2e:season with
   CHROMIUM_PATH set to the runner's preinstalled google-chrome (no download), e2e-output/
   uploaded as an artifact. Not on every PR.
5. Phone performance budget with Playwright CPU throttling x4 at 844x390: boot to title, a
   week advance, a x4 advance, the rollover, bundle size; table in your log; fix only obvious
   club-side hot spots.

You may touch: scripts/e2e-season.mjs, scripts/soak.ts, src/qa/**, tests/**,
tests/fixtures/saves/, .github/workflows/qa.yml, package.json scripts, docs/QA-pwa.md, your
status file, and small club-side fixes in files N5–N7 may touch (say so in their status
files). ?e2e hooks in src/main.ts stay additive. Do not touch src/match/**, src/sim/**,
src/systems/matchday.ts, src/world/playback.ts, formation.ts, readability.ts,
src/scenes/Match*, src/art/match/**, src/ui/screens/matchOverlay.ts, balance/**, the balance
scripts and workflow, docs/specs/BAK-207*, BAK-208*, coach-calls.md,
docs/status/2026-10-sprint.md, the settings popup in src/fx/audio.ts, or anything named
lineup.

Standing rules:
- Merge to main yourself (squash) when CI is green and your own checks pass: npx tsc --noEmit,
  npx vitest run, npm run build, and Playwright screenshots at 844x390 and 1280x800 that you
  have looked at yourself, committed under docs/screenshots/<PR>/. Chromium is at
  /opt/pw-browsers/chromium (playwright-core, as the e2e script does); never run
  `playwright install` here or in the workflow.
- Every GameState change bumps SAVE_VERSION with a migration step and a test (you should not
  need one; the corpus test guards everyone else's).
- When something is Leon's call, take the simplest reasonable option and mark it
  "Assumed (needs Leon)" in the PR body and the status file. Mark anything that needs his go
  "Needs Leon" and leave it. No secrets, payments, accounts or devices; the workflow uses
  only the default GITHUB_TOKEN.
- Log every PR and every run in docs/status/2026-10-qa.md.
- GitHub by REST and the /ccr/ routes only (GraphQL is blocked): gh api for opening PRs
  (POST repos/ch-leon/nrl-sim/pulls), reading check-runs, merging
  (PUT repos/ch-leon/nrl-sim/pulls/<n>/merge -f merge_method=squash), opening issues, and
  listing merged PRs (GET repos/ch-leon/nrl-sim/pulls?state=closed) to drive the loop.
- Pull main and rebase often; N1 merges frequently.
- No model identifiers in commits, PR titles or bodies, comments or docs.
- Finish (when Leon is back or the queue is dry) with a summary: runs, findings and fixes,
  open [match] issues, the corpus, every assumption.
```

---

## N9 — Match side, after N3 and Phase 3

**Scope:** once 2e–2g, coach calls and sin-bins (N3) and Phase 3 balance (#87) have landed:
the whole league on one engine and the match-side follow-ups that were parked, without the
Phase 4 switch-over (#88) or store builds (#89), which need Leon.

**May touch:** `src/match/**`, `src/systems/fixtures.ts` (`simulateRivalRound`,
`cheapSimScore`), `src/systems/matchday.ts`, `src/scenes/MatchScene.ts`, the overlay, the lab,
`balance/**`, `docs/specs/BAK-207*`, `BAK-208*`, `coach-calls.md`, `docs/status/2026-10-sprint.md`
(continue it) — i.e. N1's ownership, as its successor.

**May not touch:** the old engine's deletion or the default flip (#88); Capacitor (#89); the
Nines kick-off rule without Leon (see Needs Leon).

### Work items

1. **"Headless under 100 ms"** (BAK-207 §3.5). Allocation-free steering and separation (typed
   arrays, no per-tick objects). Every seed's match changes, so: standard plan before and after
   (§7 bands must hold), tuning reference §1–2 updated, a phone timing in the PR.
2. **"Rival rounds on the live sim"** (#77's "rival cheap-sim scores", the living league). With
   1 under budget, `simulateRivalRound` runs `runMatch` for the seven rival fixtures when the
   live-match setting is on (cheap sim stays as the fallback and for fast-forward if a week
   advance exceeds about 1 s on a phone; a Web Worker if needed — **Assumed**). The ladder's
   points for/against are on one scale; rival squads collect real stats and injuries. Soak and
   e2e re-run.
3. **"Sprint follow-ups and stamina knobs"** (BAK-208 §11): territory kicks chased at cruise,
   defensive line speed scaled by `gas.cruise`, per-player legs in the lab, `drainRate` slope
   and fatigue weights overridable by name in the harness; a stamina sweep in the balance-log.
4. **"Golden point in drawn finals"** (#77 extras): a drawn final goes to golden-point extra
   time on the live sim (field goals likely), replacing "through on seeding". **Needs Leon**
   before touching the kick-off-after-a-try rule (2c kept the conceding side kicking off; Nines
   has the scorer kick off).
5. **"Match report at full time"**: a post-match screen from `MatchResult` and the live events
   (scorers and minutes, the try timeline, the stats strip, player of the match, injuries,
   calls that paid off), replacing the one-line toast; works at 844×390.
6. **"AI coach calls and calls unlocked by staff"** (coach-calls §8 step 4): rivals make simple
   calls (field goal when on, rush in their own 20, shift to an overlap) behind a knob, the
   golden test kept with calls off; calls unlocked by the Coach's Office level (#47 board /
   facilities) — the club-side half coordinates with N6's upkeep.
7. **Close-out of #85, #94, #99**: verify each "done when" against the lab and the standard
   plan, write the lab sign-off list, and leave the issues open for Leon to close (**Needs
   Leon**: the sign-off itself).

### Session prompt (copy-paste)

```
You are N9, the match-side session on ch-leon/nrl-sim that follows N1 and N3. Start only when
BAK-207 2e–2g, coach calls (docs/specs/coach-calls.md) and sin-bins (#71) have merged and
Phase 3 (#87) has a report in the balance-log. Read CLAUDE.md, README.md,
docs/ARCHITECTURE.md, docs/specs/BAK-207-live-match-sim.md, BAK-208-match-rules-and-skills.md,
BAK-208-tuning.md, coach-calls.md, balance/README.md, .claude/skills/balance-experiments,
docs/status/2026-10-sprint.md and docs/plans/2026-10-next-plans.md (your plan is N9).
Continue docs/status/2026-10-sprint.md.

Scope: the whole league on one engine and the parked match follow-ups. Not the Phase 4
switch-over (#88) and not Capacitor (#89): both need Leon.

Work items, one PR each, in order, each with lab sign-off screenshots and the standard plan
re-run (report linked in the PR), numbers in BAK-208-tuning.md:
1. Headless under 100 ms: allocation-free steering and separation. Every seed changes, so the
   standard plan before and after must hold the §7 bands; phone timing in the PR.
2. Rival rounds on the live sim: simulateRivalRound runs runMatch for the seven rival fixtures
   when the live-match setting is on, cheap sim as fallback; ladder on one scale; rival stats
   and injuries real; a week advance stays under about 1 s on a phone (Worker if needed,
   Assumed). Re-run npm run soak and npm run e2e:season.
3. Sprint follow-ups (BAK-208 §11) and stamina knobs by name in the harness, with a sweep.
4. Golden point in drawn finals. Needs Leon before changing who kicks off after a try.
5. Match report at full time from MatchResult and the live events, at 844x390.
6. AI coach calls behind a knob (golden test kept with calls off) and calls unlocked by the
   Coach's Office level.
7. Close-out of #85, #94, #99: verify each "done when", write the sign-off list, leave the
   issues for Leon to close.

Standing rules:
- Merge to main yourself (squash) when CI is green and your own checks pass: npx tsc --noEmit,
  npx vitest run, npm run build, the standard balance plan, and Playwright screenshots at
  844x390 and 1280x800 that you have looked at yourself (the lab and the match screen),
  committed under docs/screenshots/<PR>/. Chromium is at /opt/pw-browsers/chromium; never
  run `playwright install`.
- Every GameState change bumps SAVE_VERSION with a migration step and a test; never reuse a
  number.
- Every match-sim number goes in BAK-208-tuning.md and becomes a harness knob; use the
  harness, never throwaway measurement scripts; publish runs to the balance-log branch.
- When something is Leon's call, take the simplest reasonable option and mark it
  "Assumed (needs Leon)" in the PR body and the sprint log. Mark anything that needs his go
  "Needs Leon" and leave it: #88, #89, the Nines kick-off rule. No secrets, payments,
  accounts or devices.
- Log every PR in docs/status/2026-10-sprint.md.
- GitHub by REST and the /ccr/ routes only (GraphQL is blocked): gh api for opening PRs,
  reading check-runs, merging (PUT repos/ch-leon/nrl-sim/pulls/<n>/merge
  -f merge_method=squash) and opening issues.
- Pull main and rebase often; club-side sessions may still be merging.
- No model identifiers in commits, PR titles or bodies, comments or docs.
```

---

## Needs Leon (collected)

- **#88 Phase 4 switch-over** and **#89 app-store builds**: not planned here.
- **Kick-off after a try** (2c kept the conceding side kicking off; Nines has the scorer kick
  off): N9 item 4 waits for the call.
- **N8 item 4:** leaving the nightly QA workflow on.
- **Every "Assumed (needs Leon)"** above becomes a bullet in its plan's status file and PR;
  the biggest are N5's starting strength and band, N6's upkeep and wage curves, N7's switch to
  a reload prompt, and the difficulty targets in N5 and N6.

## Not planned

Monetisation (BAK-205), payments, analytics, accounts, Capacitor, anything on Leon's devices
or needing his secrets. Lineups (#69), sin-bins (#71) and coach calls stay with N3. Grubber
try rate (#72) and the §7 outliers stay with Phase 3.
