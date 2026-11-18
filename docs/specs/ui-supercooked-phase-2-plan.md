# SuperCOOKED Phase 2 (Match): build plan

How to build Phase 2 of [ui-supercooked.md](ui-supercooked.md): the live match HUD,
coach calls tray, half-time sheet, full time and match report (mockups `40` to `44` in
`docs/design/supercooked/`). The spec says what each screen should look like. This
plan says where that lands in the code as it is on main after Phase 0 (`8d7d9c5d`,
18 Nov 2026), what the mockups assume that the game does not have, and what must not
break. Where the two differ, the spec's rule holds: the code wins on *what*, the
design wins on *how*.

Written before Phase 1. Re-read the files below when you start: Phase 1 moves the
Lineup plan sheet, and anything else merged since may have moved line numbers.

## What Phase 2 actually touches

`src/ui/hud.ts` has no match HUD (the spec's §5 names it; it is the club dock). The
match UI is all DOM, in three files. Only the pitch is Phaser.

| Mockup | Code today |
| --- | --- |
| `40` live HUD | `mountMatchOverlay` and `OVERLAY_CSS` in `src/ui/screens/matchOverlay.ts`; the pause / speed / skip pill in `MatchScene.mountPlaybackControls` |
| `41` coach tray | `MatchScene.mountCoach` and `refreshCallChips`; pure helpers in `matchOverlay.ts` (`trayRows`, `trayWithLocked`, `coachBadge`, `callsUnlockLine`, `playCaption`) |
| `42` half-time sheet | `showPlanCard` in `matchOverlay.ts`, opened by `MatchScene.openPlanCard`; the pre-match twin is `.nrl-lineup-plan` in `src/ui/screens/lineup.ts` |
| `43` full time | `showFullTime` and `REPORT_CSS` in `src/ui/screens/matchReport.ts` |
| `44` report | `openMatchReport` in `matchReport.ts`; `statTable` in `matchOverlay.ts` (shared with the in-match stats sheet) |

The match lab (`/#lab`) extends `MatchScene`, so it gets the same HUD, tray and
sheets. It has no full-time card or report.

## Three PRs, in this order

The spec says one PR per phase. Phase 2 touches roughly 2,500 lines across four test
shards, and it splits cleanly along file lines, so this plan proposes three PRs (Q1).
Each leaves the game playable and on-brand.

1. **2a Full time and report** (`43`, `44`). All in `matchReport.ts`. Smallest and most isolated.
2. **2b Plan sheets** (`42` and the pre-match "Game plan" sheet from §6). After Phase 1 has merged, because Phase 1 moves the pre-match sheet.
3. **2c Live HUD and coach tray** (`40`, `41`). They share the bottom bar and cannot be split. Largest, and the one most of the browser checks ride on.

## Rules for all three

- **Keep every class name, `data-*` hook, id and aria attribute** on these screens. Restyle through CSS and move elements; do not rename. The WebKit checks, `e2e-season` and the Labs "Skip set" button all find the match UI by `.nrl-mo-*` and `data-*`.
- **Do not rename or move these `MatchScene` methods:** `mountPlaybackControls`, `openSheet`, `mountCoach`, `trayOpen`, `makeCall`, `playTiles`, `trayTapWaits`, `shutTrayCalled`, `trayChanged`. `tests/ui/screens/matchScreenPolish.test.ts` reads the source between them.
- **Tests that assert CSS text or markup** (`matchScreenPolish`, `fitViewport`, `pressHover`, `motionTokens`, parts of `matchReport` and `matchupRead`) may be updated where the spec changes what they check. Name each one in the PR. Behaviour tests (overlay writes, accumulator, tray logic, banner, log feed, report helpers) stay green untouched.
- **Type size.** Phase 0 draws Oswald at 88% and Inter at 95%. Leon's decision (18 Nov, PR #724): when a screen is rebuilt, size its type to the mockup and note any spot that cannot match.
- **Colour.** Match bars, tray and banner use `--nrl-ink`, which no match CSS uses yet. Score boxes use `panel`; numbers follow §3.4.
- **Safe areas.** The centred score bar and the bottom bar keep `--nrl-safe-*`.
- **Nothing timed.** Add no countdowns, auto-advance or wait timers. The half-time sheet waits for the player at every speed, as today. Existing timers (banner life, the Replay chip) stay as they are.
- **Sizes.** Every screen holds at 568x320, 667x375, 844x390 and 956x330, at Normal, Large and Larger text.

## 2a Full time and report

**Full time (`43`).** Restyle `showFullTime`:

- Head: the round label from `r.round` (a stage and date in League careers, not always "Round n") and the result tag as a tinted pill. Keep `.nrl-rp-tag[data-kind]`, and keep it absent when the headline is null.
- Score row: club names either side, score in Archivo Black. Keep the count-up and its reduced-motion path.
- One line under the score: the first line of `r.summary` when there is one. The mockup's coach-voice line is not generated anywhere; do not write a generator.
- Pills: gate ("Shared gate" in League careers, home games only), injuries (two, then "+n more injured"), the note chip, and the ladder move. The ladder pill keeps arriving after the week finishes, as today: the ladder has not moved at the whistle. These pills have no dot, so add a dotless variant beside `statusPill` in `src/ui/parts.ts`.
- Player of the match: the data is a name and a team. For your own player, look him up in the squad by name and show his portrait (`portraitDataUrl`) and stars (`starsEl`). If the name does not match exactly one player, or he is a rival, keep today's initials badge and no stars. Stat line stays `fmtPotmShort`.
- Buttons: Report (outline), **Back to club ▸** (primary). Keep `data-report` and `data-back-to-club`.
- The three stat rows on the card today (possession, line breaks, tries) go: they are in the report, one tap away (Q5).

**Report (`44`).** Restyle `openMatchReport`:

- Left: title and result pill; a card per team (stripe, name, tries with minutes and the bonus mark, goals, field goals, sin bin and injured lines, score); the story (`r.summary`, `r.note`); plan changes; the player of the match line; "Why did I lose?"; **Back to club ▸**.
- Plan changes: one plain line when there is one change, today's folded list when there are more.
- Right: "The numbers" with split bars (home white, away `pos` green) through `statTable`, which also restyles the in-match stats sheet. Show five rows, then **All stats ▸** opens the rest in place.
- The five rows: the spec's §7 #4 lists possession, completion, run metres, line breaks and missed tackles. `MatchResult.stats` has possession, tackles, errors and tries; line breaks are counted from events. **Completion, run metres and missed tackles do not exist.** Show possession, line breaks, tackles, errors and big hits, and put kicks, scrambles won and calls paid off behind All stats (Q2).

## 2b Plan sheets

**Half-time (`42`).** Restyle `showPlanCard`: Archivo title, score and "v Opponent" in the header; the read on the left; the opponent's tendency in a card on the right; Attack and Defence as segmented rows (white selected); the hint line; the plays line; the primary.

- The read (§7 #3): today's `planSummary` line. When the Analyst is hired (`hasStaff(state, 'analyst')`), add `whenBehindLine` for the opponent. No generated coach line.
- Tendency: the rival's current plan, as today.
- Keep on each option: the fit stars and best man (`data-fit`; a test counts eight). Keep the "What's working" line (`data-working`), the refusal when a pick is not allowed, and the "Golden point ▸" and "Change the plan" variants.
- **No Bench row at half-time.** The bench setting is fixed once the match starts (`rotation` is read-only in the live sim, and `setTactics` changes attack and defence only). Changing it mid-match would be new game logic. Leave the row out (Q3).

**Pre-match "Game plan" (§6).** Give the sheet Phase 1 leaves behind the same look by sharing the half-time sheet's CSS, title it "Game plan", and label its primary **Save plan**. It keeps its Bench row, which works there, and its hooks (`data-plan`, `data-plan-done`, `data-rotation`, `data-plays`).

## 2c Live HUD and coach tray

**Score bar (`40`).** `.nrl-mo-scoreboard` moves from top-left to top-centre: ink, stripes at the outer ends, codes (★ on yours), Archivo score boxes, clock in JetBrains Mono over the half label. Keep the GP and FT labels.

- It stays a button that opens the stats sheet (`aria-expanded`, `#nrl-mo-stats`).
- Keep the momentum line and the FINAL / DERBY tag, attached to the bar.
- Moving it shifts things anchored to it: the stats sheet, the tray's `--nrl-mo-board` offset, the Replay chip and the toast lane. Check each.

**Ball-state chip.** The tackle chip (`.nrl-mo-tackle`) gains whose ball it is: "Your ball · tackle 3", "Their ball · tackle 3", and today's last-tackle state. The data is already there (`inPossession`, `controlTackle`). Keep both sides' tackle counts; the mockup's bare "Their ball" drops information the game shows.

**Banner.** Restyle only. Keep every kind (try, goal, field goal, missed, sin bin, golden point). Leave out the mockup's "2nd of the day".

**Bottom bar.** One ink bar: Coach, the commentary line, then pause / speed / skip.

- Coach: accent button. Keep every `coachBadge` state ("2 calls · 1 play", "No calls", "Their ball", the call just made), restyled; the mockup's bare number covers only one of them.
- Commentary: `.nrl-mo-strip` moves into the bar as a button with the red dot and "Log ▴". Tapping it opens the full log (filters and ✕ as today).
- **The LOG on/off switch goes** (spec). A stored `'hidden'` in `nrlsim.logMode` must read as `'line'`, or those players lose the line with no way back. Stop writing `'hidden'`; keep the key (Q4).
- Speed: one button that cycles 1× → 2× → 4× → 8×. Keep `.nrl-mo-speed` and put the current speed in `data-speed`; keep `data-slow` / `data-slowed` for the big-moment slowdown. Browser checks that tap `[data-speed="8"]` need a "tap until" helper.
- Pause still opens the pause sheet. Skip keeps its two taps.
- Keep, re-anchored to the new bar: the Plan ▸ chip after a try, the call-result tag (it reads the strip's position), the Replay chip and tag, and the Labs "Skip set" button (its CSS targets `.nrl-mo-controls` and `.nrl-mo-bar`).

**Coach tray (`41`).** A restyle; the logic is already what the mockup shows. The tray lists only calls that are legal now, and set plays already carry the IQ check.

- Ink, radius 16, two-column tiles. Tiles are 64px at the reference size where they fit and never under 44px. The tray must not scroll at any size (an existing check; it is tight at 667x375).
- Set plays: accent border and a SET PLAY tag, in line with the calls. Keep the `data-tray-plays` container.
- Header: "Your ball · tackle n" and "1 call this set · match keeps playing".
- Tile copy stays `CALL_TILE` and `playCaption`; they were cut to fit.
- Footer: `callsUnlockLine` in `matchOverlay.ts`. (The spec names `coachCallsText`, which is the Coach calls page.)
- Keep: locked tiles, the kick-off, penalty and shift pairs, "Nothing to call right now.", the tap-settle guard, the lit tile, the 1× cap while open, and Coach hidden when coach calls are off.
- Open state: the white ring from the mockup, without "▾" (a test pins that it is absent).

## Checks before each PR is ready

```bash
npx tsc --noEmit
npx vitest run
npm run build
npm run e2e:webkit -- --group match
npm run e2e:webkit -- --group screens
npm run e2e:webkit -- --group text
npm run e2e:webkit -- --group portrait
npm run e2e:season
npm run e2e:perf
```

All four WebKit groups exercise the match UI. `e2e:season` and `e2e:perf` are not in
PR CI (they run in the QA workflow) and both use match selectors, so run them locally
for 2c. Open `/#lab` and check the HUD, tray and plan sheet there too.

Each PR ends with "Didn't match the spec". Known entries, so they are agreed up
front: the report's three missing stats; no Bench row at half-time; the read is the
score line plus the Analyst line; the ladder pill arrives after the week; no "2nd of
the day"; rival player of the match keeps initials; goals show a count, not the
kicker's name; no run metres on the player of the match; no "▾" on Coach; badge and
tile copy stay the code's.

## Questions for Leon

| # | Question | Default |
| --- | --- | --- |
| 1 | Three PRs (2a, 2b, 2c), not the spec's one PR per phase? | Three |
| 2 | Report stats: completion, run metres and missed tackles are not tracked. Show the five that exist, or track the missing three first? | Show what exists. Tracking them is match-sim work for its own PR, outside this phase. |
| 3 | Half-time Bench row: leave out, since the bench cannot change mid-match? | Leave out |
| 4 | Removing the LOG switch removes the option to hide the commentary line. OK? | Yes, as the spec says |
| 5 | Full-time card drops its three stat rows (they stay in the report)? | Yes, as the mockup shows |
