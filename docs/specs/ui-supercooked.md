# UI: SuperCOOKED (Big Coach)

The game's new look and the screen reworks that go with it. It replaces the
colours, type and several layouts in `docs/specs/ui-broadcast-quiet.md`; where
this file is silent, Broadcast Quiet still holds (layout grid, dock behaviour,
sheet behaviour, interactions).

- **Mockups:** `docs/design/supercooked/*.html`, one per approved screen. Open
  `docs/design/supercooked/index.html` to see them all. They are static, drawn at
  the reference size 844×390 (landscape phone), and every value in them (colours,
  sizes, radii, copy) is the spec. **The data in them is placeholder**: names,
  money and stats come from game state as they do today.
- **Source canvas:** the Claude design canvas "Big Coach × SuperCOOKED" (Leon has
  the link). The mockups are an export of it.
- **Scope:** look and layout only. No sim, economy or save-format changes (one
  exception: manual point spending, §7 #1). Keep storage keys, `data-*` test
  hooks and the accessibility attributes the screens already set (aria-current,
  aria-pressed, roles); add them to anything new.

## Before you start: the code wins on *what*, the design wins on *how*

The mockups were drawn from the code as it was around 16 Nov 2026. Features have
kept moving since, so some screens won't match exactly. **Never break, remove or
fake functionality to make a screen match a mockup.**

- **Check what changed first.** Before each phase, read the commits and merged PRs
  since 16 Nov 2026 that touch the files in that phase, and the screens as they
  are now. Treat the current code as the truth about what exists.
- **The mockup shows something the game no longer has** (a button, a stat, a
  field, a tab): leave it out. Don't rebuild it, stub it or show placeholder data.
- **The game has something the mockup doesn't show** (a new button, line, state,
  warning or setting): keep it, working, and place it using the nearest pattern
  in §4 and the rules in §3. A feature that exists is never dropped for space;
  move it to a tab, a sheet or a ⋯ menu, but keep it reachable.
- **The mockup and the code disagree on how something works** (a rule, a
  number, a label, an order): the code's behaviour wins. Restyle it; don't
  change it.
- **Mockup data is placeholder.** Every name, number and line of copy that comes
  from state must come from state. Only fixed UI copy (button labels, headings,
  empty states) comes from the mockups, and only where it still describes what
  the code does.
- **No new game logic** unless this spec says so explicitly (only §7 #1). If a
  screen seems to need logic the game doesn't have, show what exists and list it.
- **Tests guard behaviour.** If a change makes a behaviour test fail, the change
  is wrong, not the test. Only layout/markup assertions may be updated, and each
  one is named in the PR.
- **Report every deviation.** Each PR ends with a section "Didn't match the
  spec": what you left out, kept, moved or couldn't follow, and why. When unsure,
  keep the feature working and ask in that section; don't guess.

## Contents

1. [Build order](#1-build-order)
2. [Tokens, fonts, brand](#2-tokens-fonts-brand)
3. [Rules](#3-rules)
4. [Shared components](#4-shared-components)
5. [Screens](#5-screens)
6. [Screens with no mockup](#6-screens-with-no-mockup)
7. [Open questions](#7-open-questions)

---

## 1. Build order

One PR per phase. Each phase leaves the game playable and the existing tests
(including the layout checks) green: update a test only where this spec changes
what it checks, and say so in the PR.

| Phase | What | Mockups |
|---|---|---|
| **0 Foundations** | Tokens, fonts, brand, `dom.ts` base CSS (buttons, segmented, sheets, dock, radii), shared components in §4 | `00`, `01` |
| **1 Squad & player** | Squad pitch view (Lineup merges into it), list view, swap, bench/reserves, recruit, player page tabs | `30`–`37` |
| **2 Match** | Live HUD, coach calls tray, half-time sheet, full time, report | `40`–`44` |
| **3 Club** | Club home, building popup, build menu, league | `20`–`23` |
| **4 Office** | Office sheet, finance, staff & board, news, history, kit, decision | `50`–`56` |
| **5 App** | Loading, title/slots, new club in 3 steps, tutorial, weekly summary, season review, settings, sacked; paywall reskin only | `10`–`15`, `60`–`64` |
| **6 The rest** | Screens with no mockup, built from the parts (§6) | — |

Phase 0 alone should make every screen look on-brand (colours and type), before
any layout work.

---

## 2. Tokens, fonts, brand

### Colour: `src/ui/tokens.ts` → `COLOR_TOKENS`

`dom.ts` writes these out as `--nrl-*`; change the values, keep the keys.

| Key | Was | Now | Note |
|---|---|---|---|
| navy | `#0e1630` | `#0b1220` | sheets, cards' page |
| panel | `#141d3a` | `#121a2e` | tiles, cards |
| raised | `#1b264a` | `#1a2540` | portrait slots, pressed, score boxes |
| button | `#1f2b55` | `#1a2540` | secondary buttons |
| line | `#26325c` | `#222c45` | borders, dividers |
| me | `#24346b` | `#1a2540` | your row; add a 3px inset accent bar on the left |
| sheet | `rgba(14,22,48,.97)` | `rgba(11,18,32,.98)` | |
| text | `#ffffff` | `#ffffff` | |
| text2 | `#c9d1ea` | `#c8cdd8` | |
| muted | `#9aa6c7` | `#8f98ab` | |
| accent | `#f4d03f` | `#ff6b1a` | the one primary per screen |
| onAccent | `#0e1630` | `#0b1220` | |
| pos | `#6fd896` | `#14c38e` | good, gains, wins |
| neg | `#f0a39b` | `#ff8a3d` | watch, losses, destructive text |
| alert | `#e0574a` | `#ff3b1f` | alert dots, injured/out |
| win | `#2a8346` | `#14c38e` | **navy text on it**, not white |
| fitGood / fitOk / fitBad | greens/amber/red | `#14c38e` / `#ff8a3d` / `#ff3b1f` | |
| home / away | `#f4d03f` / `#2f8a46` | accent / `#14c38e` | team stripes |
| injured, bench, out | unchanged | | |

**New token:** `ink: '#05070d'` for the dock, title, loading, setup and the
match bars. **Pill tints:** status pills use the colour at 12% on the background
with a 45% border (see `00-shared-parts`).

### Type: `src/ui/fonts.ts` (self-hosted @fontsource, so the app works offline)

| Role | Was | Now | Use |
|---|---|---|---|
| Labels | Barlow Condensed | **Oswald** 500/600/700, caps, 0.04–0.12em | buttons, tabs, labels, names on cards |
| Body | IBM Plex Sans | **Inter** 400/500/600 | sentences, list text |
| Numbers | IBM Plex Mono | **JetBrains Mono** 500/700 | money, clock, small numbers, codes |
| Display | — | **Archivo Black**, caps, −0.02em | screen titles, big numbers, scores, TRY, the wordmark |

### Shape and space

- Radii: **16** sheets, dock, cards · **14** tiles, stat tiles · **12** popups' inner cards, slot cards · **10** buttons · **8** tabs inside a segmented control · **6** chips and tags · pills and dots fully round · **18** dialogs · **22** bottom sheet top corners.
- Spacing stays 4 / 6 / 8 / 10 / 12 / 16 / 24. Screen insets 12 (sheets, dock).
- Touch targets ≥ 44px.

### Brand: `src/brand.ts`

```ts
name: 'Big Coach',
shortName: 'BigCoach',
titleText: 'BIG COACH',
parentBrand: { name: 'SuperCOOKED', show: true },
colors: { ..., app: '#05070d' },     // background/primary/text follow the tokens
exportSlug: 'big-coach',
```

The wordmark is text, not a logo: **BIG** in white, **COACH** in accent, Archivo
Black. The parent line reads "A **SUPER**COOKED GAME" (COOKED in accent). The
disclaimer stays as it is.

---

## 3. Rules

1. **One orange button per screen**: the next thing to do. When a sheet has its own primary (player page, building popup, news with decisions, kit), Play Week turns navy (`raised` background, white text) for as long as the sheet is open.
2. **Disabled stays visible and says why**, in amber (`neg`): "Need $18k", "Rep 50 needed", "Renew opens in his last season". The control drops to ~45–55% opacity.
3. **Destructive** = amber text on a navy button, and two taps (as today). Never orange.
4. **Numbers:** money, clock, ratings and small numbers in JetBrains Mono; hero numbers (scores, a stat tile, the finish) in Archivo Black.
5. **Player rating is five stars in half steps, no number**, on player cards and the player page (`starsForOverall`). Tables may show the number beside the stars.
6. **Only a player's four stats for his position group appear anywhere** (`shownStats`). Never the hidden ones.
7. **Status colour always comes with a word**: green good, amber watch, red bad.
8. **Tabs inside a sheet:** the selected one is white with navy text. Orange only for a screen's main switch (Squad / Recruit).
9. **Copy:** second person, short, plain; the coach's voice. "Cooked" is earned (a loss, the sack), not decoration.
10. **No new terminology.** Use words the game already uses or plain English. Don't add labels, ratings or jargon a player would have to learn (e.g. the brand book's verdict words).
11. Every screen must still work at 667×375 and with Large/Larger text (#371), as today.

---

## 4. Shared components

Build these once in Phase 0 (in `dom.ts` or a new `src/ui/parts.ts`) and use them everywhere. Mockups `00-shared-parts` and `01-more-shared-parts`.

| Part | What it is | Data |
|---|---|---|
| Buttons | primary (accent), secondary (raised), outline (1px white 30%), destructive (raised + amber text), disabled + reason line | |
| Segmented control | `panel` track, radius 10, padding 2–3; selected white (in a sheet) or accent (screen switch) | existing `segmented()` |
| Status pill | dot + word, tinted (§2) | fitness, morale, injury |
| Stars | five ★, half steps; filled white, empty `#3a4566` | `starsForOverall`, `potentialStars` |
| Stat tile | label, big Archivo number, 6px bar: fill = current, faint = ceiling; accent border + label when it's the training focus | `p.stats`, `p.ceilings`, `state.training.focus` |
| Player card | portrait slot (34px), surname, stars, position code, fitness dot, C/K tag | `portraitDataUrl`, `fitnessPct`, roles from `sideRoles` |
| Screen header | ◂ back (where you came from), Archivo title, one line of context, controls right | existing `screenHead()`, `backButton()` |
| Toast | bar colour = kind, optional Undo with countdown; coach lines with a "Coach" tag in italics | `toasts.ts` |
| Confirm dialog | title, one line, two buttons, primary on the right | decisions-before-advance, start over, delete, release, open everything, long advance |
| Placement bar | replaces the dock while placing a building: name, hint, Cancel, Build here | `placementBar.ts` |
| Rotate card | "Turn your phone sideways" + wordmark | `orientation.ts` |
| Empty state, locked tile | see `01` | |
| Dock | ink, radius 16; status block (cash, "CASH · WK n/27"); tabs Oswald 15, current = raised fill + accent text + 2px accent underline; Play Week right; alert = 8px round red dot | `nav.ts`, `hud.ts` |

---

## 5. Screens

Each row: mockup → current source → what changes. Anything not listed keeps today's behaviour.

### Squad and player (Phase 1)

- **`30-squad-pitch`** → `screens/squad.ts`, `screens/lineup.ts`
  - Squad opens on a **pitch view**: the starting nine in four lanes (Forwards, Halves, Outside backs, Fullback; follow `LINEUP_SLOTS`) as player cards, the bench (4) on the right.
  - Header: Squad / Recruit switch (accent), "9/9 picked · n fit · n carrying knocks", **Pitch / List** toggle, **Auto pick**.
  - The **Lineup segment goes away**: the pitch *is* the lineup. Tap a card to open his page; long-press or a "Swap" affordance starts a swap (see `32`). The plan (game plan) moves to the pre-match plan sheet (§6).
- **`31-squad-list`** → `screens/squad.ts`: grouped by position group, each group with its own four stat columns (`shownStats` order); portrait, name + trait chips, position, stars, the four stats (focus stat in accent, 80+ green, his lowest grey), fitness dot + %, IN SIDE (shirt number, BENCH, —). Sort stays.
- **`32-squad-swap`** → `screens/lineup.ts`: the picked card gets an accent ring, the rest dim to 50%. The bench panel becomes "Swap {slot}": candidates best fit first, each tagged **fits** (green) / **plays it** / **out of position** (amber) and where he comes from (RESERVE / BENCH / NOW 5/8). Tap to swap, ✕ to cancel.
- **`33-squad-reserves`**: the right panel has **Bench n / Reserves n** tabs; reserves scroll as the same cards.
- **`34-recruit`** → `screens/recruit.ts`: header has the window, cash and cap room; filter by position group with counts; rows show portrait, name, age + headline trait or "Grows to ★★★★" (green, from `potentialStars`, juniors/young), position, stars, fee, cap per season, and an outline **Sign** button; if he can't be signed, the button turns amber and says why ("Need $18k").
- **`35/36/37-player-*`** → `screens/player.ts`. One sheet, three tabs:
  - **Header (always):** ◂ back, name, "Position · age · #n", fitness pill and morale pill (colour from §3.7), rating as five stars.
  - **Stats:** his four stats as big stat tiles (focus stat in accent); the faint bar is the ceiling (`p.ceilings`). Footer: where he plays ("Starting halfback") and **Spend n point(s)** as the one primary, shown only when `unspentPoints > 0`. Manual spending is decided: see §7 #1 for how it works.
  - **Traits:** a card per trait: name, level as three pips (I–III), what it does, "On the pitch: …" (`traitTip`).
  - **Deal:** goal-kicker and captain switches (starters only, as today); contract card ("Ends season n", "$X a season on the cap"), **Renew** (disabled with the reason until his last season) and **Release** (destructive, priced).
  - **Moved off the page:** XP bar and level text, potential text, morale reasons, injury-risk word, season and career tallies. Keep them reachable later if wanted, but not on the first view.
  - **Sell** ("No buyer") is hidden until there is a buyer.
  - Free agents: Deal shows Sign instead. A rival's player: read-only, no Deal actions.
- **Decided in Phase 1 (Leon, 18 Nov):**
  - Plan, Plays and the training focus sit in a **⋯ menu** at the right of the Squad header (pitch and list), each opening what it did before.
  - The player page has a **fourth tab, Record**: level and XP, potential, morale and its reasons, injury risk, season and career tallies, club history.
  - The list view has **no To / Wage / Morale columns**; the contract-ending dot stays on the name, and the figures are on the player page's Deal tab and in Contracts.
  - The pitch is opened as the `lineup` screen and the list as `squad`, so links, hints and the dock that lead to the Lineup still land on it.

### Match (Phase 2)

- **`40-match-live`** → `screens/matchOverlay.ts`, `hud.ts`
  - **Score bar** top centre: home stripe, code (★ for yours), score box, clock + half, score box, code, away stripe.
  - Under it, a small **ball-state chip**: "Your ball · tackle 2" / "Their ball".
  - **Moment banners** (TRY, penalty goal, field goal, sin bin) sit under the chip.
  - **One bottom bar:** Coach (accent, with the number of calls available), the latest commentary line (tap opens the full log), then pause / speed (one cycling button) / skip.
  - The **LOG on/off switch goes**: the log is just "tap the line to open, ✕ to close". Keep persisting the log mode.
- **`41-match-coach-calls`**: tray above the bar. Header: ball and tackle, "1 call this set · match keeps playing". Big 2-column tiles of **only the calls legal now** (name + one-line effect), set plays from the Playbook as tiles with a SET PLAY tag and the IQ check. Footer: "Next: … from tackle n" (`coachCallsText`).
- **`42-match-half-time`**: bottom sheet. Score and a one-line read first, the opponent's tendency on the right, then Attack / Defence / Bench as three segmented rows (white selected), a line explaining the picked option, the plays line, and **Start 2nd half ▸**. The same sheet is the pre-match plan sheet (§6).
- **`43-match-full-time`**: centred card. Result tag, big score, one line, three effect pills (ladder move, gate, injuries), player of the match with portrait and stars, Report (outline) and **Back to club ▸**.
- **`44-match-report`**: both teams with tries and goals, a one-line story, the plan change, **Back to club ▸**; right column five stats with split bars (home white, away green) and **All stats ▸** for the rest.
- **Built in Phase 2 on the build plan's defaults** ([ui-supercooked-phase-2-plan.md](ui-supercooked-phase-2-plan.md) Q2–Q5; one PR for the phase, as asked):
  - The report's five are possession, line breaks, tackles, errors and big hits: completion, run metres and missed tackles are not tracked by the match. Kicks, scrambles won and calls paid off are behind All stats.
  - No Bench row at half-time: the bench is fixed once the match starts. The pre-match Game plan keeps it, and its primary reads **Save plan**.
  - The LOG switch is gone; a stored `'hidden'` log mode reads as the line.
  - The full-time card's three stat rows are gone (they are in the report).
  - Speed is one button that cycles 1× → 2× → 4× → 8×.
  - The ball chip keeps the tackle count for both sides ("Their ball · tackle 3/5"); the read at half-time is the score line, plus where the other side goes when behind once the Analyst is hired.

### Club (Phase 3)

- **`20-club-home`** → `screens/clubHome.ts`: grounds clear; one decisions card top-left (count badge in accent, the top item, Review). The dock's money is labelled **CASH**.
- **`21-building-popup`** → `screens/build.ts` (facility popup): name + ✕, level as three bars, **Now / Next level** boxes side by side (the effect values), upkeep line "on the salary cap", **Upgrade to Ln · $X**, then Move and Demolish.
- **`22-build`** → `screens/build.ts`: All / Training / Club; tiles show name, price (accent), one plain line of what it does, footprint and upkeep on the cap. Built: "BUILT · Ln · tap it on the grounds". One-only already built: amber "ONE ONLY · ALREADY BUILT".
- **`23-league`** → `screens/fixtures.ts` and the ladder: ladder with last-5 form as lettered dots (W green, L amber), your row highlighted, dashed accent line under the finals cut; right column **next opponent card** (home/away, their stars, ladder spot, record, last meeting), then your run of fixtures.
- **Built in Phase 3** (what the code has decides what shows):
  - No facility has upkeep, so the cards and tiles show none. The building card keeps "No recurring upkeep", and the Build tiles say "one-off cost".
  - CASH is a small word before the money, and the week stays "WK 2/27 · S1": the season stays on show, and the dock's tabs keep their room.
  - The next-opponent card opens the full preview (the NEXT row still does too). On a phone on its side it is one line, their name and when.
  - The ladder keeps its W and L columns, and its form column hides under 760px wide, as before.

### Office (Phase 4)

- **`50-office`** → `nav.ts` Office sheet: all real tiles (Finance, Contracts, Staff & Board, Coach calls, Playbook, News, History, Kit & colours, Guide, Settings, Save & quit) in 4 columns; a tile that wants you gets an accent dot and accent status line.
- **`51-finance`** → `screens/finance.ts`: left: Salary cap tile (used / cap, bar, next season), Next home gate, Contracts (accent when any are due, View ▸). Right: This week / Season P&L / Ledger. This week = cash in lines and Net, plus the note that wages, upkeep and staff come off the cap, not cash.
- **`52-staff-board`** → `screens/board.ts`: patience as five pips; each objective a card with one status chip; staff rows with wage and Hire (outline) / Release (destructive); the attack coach as four choice buttons with wages, locked ones saying why.
- **`53-news`** → `inbox.ts`: filter (All/Info/Good/Alert); the decisions banner on top with **Review** as the primary; feed grouped by week; dot colour = kind; coach lines with the Coach tag in italics; contract rows keep their Contracts button.
- **`54-history`** → `screens/history.ts`: summary line, Seasons / Records; each season a card row (best finish highlighted green), Review and Books buttons.
- **`55-kit`** → `screens/kit.ts`: big home and away previews left; club name + Rename, home pattern and trim, away jersey and trim on the right; Club default and **Save kit**.
- **`56-decision`** → `decisions.ts`: "Decision · 1 of n", title, the deadline line, story, coach line, then the choices as three big cards, each with its **Sure** and **n% risk** lines as tinted pills.
- **Built in Phase 4** (what the code has decides what shows):
  - The Finance note says what the game does: player wages sit on the salary cap; cash pays signing fees, staff (their fee and their wage, in the running costs) and buildings. It hides on a phone on its side, where This week's lines need the room.
  - Staff rows keep the code's words ("Analyst · $12,000 once", "wages paid with running costs") and add the week's wage beside the button. The attack coach's choices show the wage and the one-off fee on two lines.
  - The coach's lines in News keep his portrait and his name (as the tag), with the line in italics.
  - History keeps its Retired players and Trophies tabs. The best finish is green and its card ringed green, with no "· best" word.
  - The Kit screen keeps three previews (home, alternate, card), and swatches stay 44px tap targets (round, not 28px).
  - On a decision, the green **Sure** pill shows only beside a risk; a choice with no gamble has the plain pill, gain or cost.

### App (Phase 5)

- **`10-loading`**: wordmark, parent line, thin accent progress bar, what it's doing ("LOADING TOWNS…"), one tip at the bottom. Shown while assets and the town list load.
- **`11-title-save-slots`** → `title.ts`: wordmark and "CLUB MANAGER" left; three slot cards right. The most recent save gets the only primary (**Continue ▸**); other saves get an outline Continue; empty slots **New club**; export/delete live behind a **⋯** menu per slot. Import save at the foot.
- **`12/13/14-new-club-*`** → `title.ts` setup, split into **three steps** with a step bar and ◂ Back on each:
  1. **Town:** one big search ("Where's your club from?") with the offline town list as results.
  2. **Club:** club name, ground, your name; main and second colour (faded = blocked, with the reason); live jersey preview.
  3. **Start:** club summary card with Edit, difficulty as three big cards (Easy tagged FIRST CAREER on a first career), the "played before" tick box, **Start season ▸**.

  Picking a town still pre-fills the names and safe colours.
- **`15-tutorial-step`** → `tutorial.ts`: the screen dims; the target keeps its place and gets an accent ring and glow; the bubble has "1 OF 3", the line, Skip tutorial (Next when replaying).
- **`60-weekly-summary`** → `weekSummary.ts`: title "Week n" + coach line; four blocks (Training, Money, Injuries & bans, Board with a status pill); Close and **Play week n ▸**.
- **`61-season-review`** → `screens/seasonReview.ts`: finish banner (big finish, how it ended, one line), History and **Carry on ▸**; then the season in two label/value columns.
- **`62-settings`** → settings in `fx/audio.ts`: left: volume, mute, coach calls, play out rival matches, slow down for big moments; right: text size, weekly summary, save tools (Export, Import, Replay tutorial), disclaimer. Developer settings and Open everything stay where they are.
- **`63-sacked`** → `screens/board.ts`: red "SACKED · END OF SEASON n" tag, "You're **cooked.**", the reason, four career tiles, the save-kept line, **New club ▸**.
- **`64-paywall-placeholder`** → `screens/paywall.ts`: **reskin only for now**: tokens, fonts, buttons. The layout will be redone; prices stay from `src/commercial/prices.ts`.
- **Built in Phase 5** (what the code has decides what shows):
  - The only full-screen loading screen is the one shown while a League career is set up ("Preparing your leagues…"); it gets the wordmark, an indeterminate bar (the set-up reports no progress) and one of the game's first-visit hints as the tip. The town list loads while the Town step is already up, so "Loading offline towns…" is that step's status line, not a screen.
  - Slot cards show the season and week but no ladder position (the save summary doesn't carry it). Behind each save's ⋯: the recovery and original exports, New club over that season, and the two-tap Delete.
  - The three setup steps are built at once and one is shown, so every field keeps its value. Club keeps the code's field order (club, your name, ground) and the drawn player in the kit as its preview; touch swatches stay 44px. Start adds the Career mode switch (Classic / League), which the mockup doesn't show; its summary card names the town, not a region. "Start over" is destructive (amber on navy) and stays in the bottom row.
  - The tutorial's "1 OF 3" pill sits in the button row: a header row would push the copy past the unscrolled-fit check (#208). No "Your assistant" header or pointer arrow: the coach's name labels the line.
  - The weekly summary's button stays "Play week ▸": nothing gives a reliable next week number across trials and the season rollover. Its lines are the code's own words, set as name and detail.
  - The season review keeps every row it had; with no finals result its line reads "Finished nth".
  - Settings has more than the mockup (Spend points myself, Team letters, Names file, Install, Open everything, Developer settings). Under 400px tall it lays out in four columns of three rows with the hints hidden, so every row and the main controls stay above the dock; the rest scrolls.
  - The sacked card puts the club's name in the reason sentence; its four tiles come from the sacked summary.

---

## 6. Screens with no mockup

Build these from the parts in §4 and the nearest mockup. Keep their content as today.

| Screen | Build it like |
|---|---|
| Contracts (`screens/contracts.ts`) | Screen header + Recruit-style rows (portrait, name, stars, ends, cap per season) with Renew / Release |
| Coach calls page (`screens/coachCalls.ts`) | Screen header + Build-style tile grid grouped by Coach's Office level; locked groups say what unlocks them |
| Playbook (`screens/playbook.ts`) | Same as Coach calls; plays as tiles with style, when, and the IQ check |
| Guide (`ui/guide/`) | Screen header + News-style list of topics, each opening a plain text page |
| Pre-match plan sheet (Lineup → Plan) | The half-time sheet, titled "Game plan", primary **Save plan** |
| Rival squad (`screens/rivalSquad.ts`) | The squad pitch view in their kit, read-only (no swap, no auto pick); cards open the read-only player page |
| Expansion intro (`expansionIntro.ts`) | Season review layout with one **Carry on ▸** |
| History records + season books | Finance-style label/value rows and tables inside History |
| Finance Season P&L and Ledger tabs | The This week list style; tables in JetBrains Mono |
| Decisions-before-advance, long advance | The confirm dialog |
| Update prompt, newer-save message | Toast or confirm dialog |

- **Built in Phase 6** (what the code has decides what shows):
  - The pre-match plan sheet was built in Phase 2 (§5 Match), so Phase 6 left it alone.
  - Contracts stays a table (the e2e flow and the hold-still logic read it), in the Recruit look: portrait in the kit, name over a muted line, position, stars with the rating, weeks left, cap, then Renew / Release / Sell. A Renew that can't go keeps its label and says why in amber on the row. Weeks left stay in weeks, not "Ends season n".
  - Rival squad opens on the pitch (the side the match would pick for them, in their kit, read-only, with Bench and Reserves beside it) and keeps the old list one tap away (Pitch / List), with Edit club and the club editor. Rivals have no stored captain or kicker, so no C or K tags.
  - The expansion intro is the season review's banner with the bank as its big number ("IN THE BANK"), Skip intro and one orange **Carry on ▸**; the coach's lines sit under it as ruled rows. "Let's get to work" stays as the button's tooltip.
  - Coach calls group the calls by Coach's Office level, each group with an Unlocked / Locked pill and, when locked, "Opens with Coach's Office n"; a group opens together, so the reason is on the group, not on each tile. Playbook plays are tiles with the IQ check as a pill beside the "Needs:" line; only the first Buy the club can afford is orange. The attack coach card and "Other coaches' plays" look as they did.
  - The Guide is a topic list beside the open page on a wide window (its tab hooks stay); under 560px wide it is one or the other, with ◂ Topics. Replay tutorial moved into its header.
  - History's Records rows, Retired players, Trophies and the season books use the Finance label/value rows and table; Season P&L and Ledger use the This week rules with JetBrains Mono figures. Row heights are unchanged.
  - The long-advance question is the confirm dialog (title, one line, Cancel and Play); it is now modal, where before the dock stayed usable behind it. The decisions-before-advance ask keeps its list and ✕, in the confirm dialog's look, with **Answer now** the primary on the right.
  - The update prompt is a toast-style bar with Reload as its primary. The newer-save message stays the title's own notice on the slot (it is title-screen text, Phase 5's file), not a toast.

---

## 7. Open questions

Decide these before or during the phase noted; until then use the default.

| # | Question | Phase | Default |
|---|---|---|---|
| 1 | **Decided: players can spend level points by hand.** Tap **Spend n points**: the stat tiles get a **+**; each tap puts one point into that stat, up to its ceiling (a tile at its ceiling shows "At ceiling" and no +). Done or ✕ closes it; unspent points stay banked. The coach opts in with Settings › "spend points myself": while it is on, points bank until spent by hand; while it is off, the training focus spends them as they are earned, as before. | 1 | **Decided (Leon, 18 Nov): opt-in.** The game spent points by focus the moment they were earned and had no manual spend (only the persona harness's), so a Settings switch "spend points myself" (`settings.spendPointsMyself`, off by default) makes points bank for the player page; off, the focus spends them as today, banked ones included at the next award. Logic: `spendPoint` / `spendSquadPoint` / `setSpendPointsMyself` in `src/systems/training.ts`, in its own PR before Phase 1; the switch and the Spend button come with Phase 1. Was: first check whether the code already has a manual spend (the persona playtesters had "manual point spending"); if so, wire to it. If not, add the smallest function that does exactly the above, in its own PR before Phase 1, with tests, and don't change how many points a level gives or how the focus spends them. |
| 2 | **Decided: no verdict labels.** The brand book's LOCK / ELITE / MID / FADE / COOKED / RAW words are not used anywhere in the game: they'd be extra terms for players to learn. | — | Don't build them. |
| 3 | Half-time "read" and opponent tendency lines need a rule. | 2 | Use the Analyst's existing rival-switch info when hired; otherwise show only the score line |
| 4 | Match report's five stats (possession, completion, run metres, line breaks, missed tackles). | 2 | Use these |
| 5 | Recruit: fee equals one season's salary, so FEE and CAP/SEASON could be one column. | 1 | Keep both |
| 6 | Paywall redesign and real prices. | 5 | Reskin only |
| 7 | Building Move cost and Demolish refund in the popup are placeholders. | 3 | Use the game's values |
