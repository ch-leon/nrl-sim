# UI: Broadcast Quiet

The game's UI system, from the design handoff "Broadcast Quiet" (landscape phone,
844×390). Goals: less clutter, one clear place to look, one primary action per
screen. It covers the club home and grounds, Build, Squad (list / lineup /
player / recruit), League, the Office screens (finance, staff & board, history)
and the whole match flow (live, log states, coach calls, half-time, full time,
report). Screens the handoff did not draw (title, tutorial, news, decisions,
contracts, kit, guide, settings, season review, rival squad, sacked, toasts,
placement bar, update bar, rotate card) follow the same rules and tokens.

Where it lives:

- Tokens, base components (buttons, segmented control, sheets, tables, dock,
  Office sheet, decisions chip, toasts): `src/ui/dom.ts` (`CSS`, `segmented()`,
  `dock()`, `screenHead()`, `backButton()`).
- Fonts: `src/ui/fonts.ts`, self-hosted from `@fontsource` so the installed app
  has them offline.
- The dock: `src/ui/hud.ts` (status block, PLAY WEEK, decisions chip) and
  `src/ui/nav.ts` (tabs, Office).
- Each screen's own styles stay with the screen.

The mocks are in `docs/screenshots/broadcast-quiet/`. The data in them is
placeholder; the screens show the real game state, and keep every feature the
screen had (traits, training focus, the next-match preview, …) in the new look.

## Global layout rules (apply to every screen)
- **Background**: the club grounds (iso canvas) or the match pitch is **always visible**. No screen fully replaces it, except the match report (a full sheet over a dimmed pitch).
- **Dock**: the **only** navigation (see `Dock.dc.html`).
  - Position: `left 12, right 12, bottom 12`; height 64; radius 16; bg `rgba(14,22,48,.97)`; padding `0 8 0 14`.
  - Left: status block. Bank in Plex Mono 15/600 #fff; below it "WEEK 2/27 · S1" in Barlow Condensed 13/600, letter-spacing .06em, #9aa6c7. Then a 1×36 divider (#26325c).
  - Tabs: CLUB · SQUAD · LEAGUE · BUILD · OFFICE. Each is 44 tall, padding 0 12, Barlow Condensed 16/600, letter-spacing .06em, #c9d1ea. Active tab: bg #1f2b55, radius 10, colour #f4d03f, weight 700. An alert is an 8px #e0574a dot after the label.
  - Right: **PLAY WEEK ▸**. Height 50, radius 12, bg #f4d03f, text #0e1630, Barlow Condensed 19/700, letter-spacing .04em. Sub-line "v Darwin · away" in Plex Sans 12/500. Optional ▾ split (40 wide, left border `rgba(14,22,48,.25)`) for multi-week advance.
  - The dock **never moves or changes layout** between screens.
- **Menu sheets**: the content of every tab opens as a navy sheet **above the dock**.
  - Position: `top 12, left 12, right 12, bottom 88`; radius 16; bg `rgba(14,22,48,.97)`; padding 10 14; `overflow:hidden`.
  - Long lists scroll **inside** the sheet (`flex:1; min-height:0; overflow-y:auto`); the header row stays fixed.
- **Sub-navigation inside a sheet**: segmented control. Track #1b264a, radius 10, padding 3, gap 4. Items 36–38 tall, padding 0 12–14, Barlow Condensed 15–16. Selected item: bg #f4d03f, text #0e1630, 700, radius 8.
- **One yellow primary action per screen.** Secondary buttons: bg #1f2b55, white text. Destructive: bg #1f2b55, text #f0a39b.
- **Disabled stays visible and says why** (e.g. "Need $18k more" in #f4d03f; the tile at 55% opacity). Don't silently grey things out or hide them.
- **Tap targets ≥ 44px.**

## Screens

Each screen's mock is `docs/screenshots/broadcast-quiet/<id>_<name>.png` (rendered from the design file at 844×390).

### 3a Club home
- Grounds fill the screen, with the dock at the bottom.
- **Decisions chip**, top-left (top 12, left 16). Height 44, radius 12, bg `rgba(14,22,48,.95)`, shadow `0 4px 14px rgba(0,0,0,.35)`.
  - Contents: "2 DECISIONS" (Barlow Condensed 15/700, #f4d03f), then the top item ("Sponsor offer due wk 3", 13px #c9d1ea), then a REVIEW button (34 tall, #1f2b55, radius 8).
  - Hide the chip when there are no decisions.
- Nothing else sits on top of the grounds.

### 3b Facility popup (tap a building)
- Right-side card: `top 12, right 12, bottom 88`, width 320. It keeps the building visible.
- **Header**: name (Barlow Condensed 22/700) and a ✕ (36×36, #1f2b55).
- **Level pips**: 28×6 each, filled #f4d03f, empty #26325c, followed by "2/3" in Mono.
- **Body**: effect line, then upkeep line.
- **Primary**: "UPGRADE TO L3 · $42,000", full width, 48 tall, yellow.
- **Secondary row**: MOVE · $2,500 and DEMOLISH +$9k (in #f0a39b). Demolish keeps the existing two-tap confirm.

### 3c Build menu
- **Header**: "BUILD" plus the hint "Pick one, then place it on the grounds". Category segmented control: ALL / TRAINING / CLUB.
- **Grid**: 3 columns, gap 6; the grid scrolls.
- **Tile**: bg #1b264a, radius 10, padding 8 10.
  - Name: Barlow 17/700.
  - Cost, right-aligned: Mono 13/600, #f4d03f.
  - Effect: 12px #c9d1ea.
  - Meta (upkeep · footprint): 11px #9aa6c7.
- **Can't build**: opacity .55, and the meta line turns #f4d03f with the reason.

### 3d Squad list
- **Header**: segmented SQUAD / LINEUP / RECRUIT, then "24 players · cap $1.21M / $1.40M", then a SORT ▾ button on the right.
- **Table columns**: `32px 1fr 52px 44px 130px 64px`, i.e. # · PLAYER · POS · OVR · FITNESS · TO.
  - Column headers: Barlow 13/600, .08em, #9aa6c7.
  - Rows: min-height 30, top border #1f2b55, 13px.
- **Fitness**: a 72×5 bar on #1f2b55, followed by the %. Bar colour: ≥85 #3fbf6a, ≥65 #e8a33a, otherwise #d9534f.
- **Injury/knock note**: inline after the name, 11px #f0a39b.
- Tapping a row opens 3f.

### 3e Lineup
- **Header**: segmented control (LINEUP selected) · "9/9 picked · rated 74 · 22/24 fit" · PLAN: BALANCED · RUSH (opens the 3r sheet) · AUTO PICK.
- **Left column**: a BENCH strip (4 tiles), then a mini-pitch in 3 rows (forwards / spine + edges / fullback).
  - Slot tile: 72×44, radius 6, bg #1b264a. Shows slot + rating on line 1 and surname on line 2.
  - Rating colour: amber #e8a33a = out of position; red bg #5a2430 = injured.
  - Selected slot: 2px #f4d03f ring.
  - Role badges (C = captain, K = kicker): 11px #f4d03f, top-right of the tile.
- **Right column (270px)**: "FOR 2ND ROW: TAP A PLAYER" and a candidate list re-sorted for the selected slot.
  - Rows are 40 tall and show name, meta, rating, and a "where" chip: current slot, B1–B4 (#3a6ea5), or OUT (#b03a2e).
  - Unavailable rows are at .55 opacity.

### 3f Player
- Three columns: `230 / 1fr / 200`.
  - **Left**: ◂ SQUAD back button, 64px portrait slot, name, position · age · number, overall and fitness tiles, contract line.
  - **Middle**: stats rows (label · 6px bar · value · weekly gain in #6fd896).
  - **Right**: role toggles (GOAL-KICKER / CAPTAIN, ON in #f4d03f), primary RENEW · $38,000, and SELL in #f0a39b.

### 3g Recruit
- **Header**: segmented control (RECRUIT selected) and the line "Free agents · window open 3 more weeks · cap room $190k".
- **Columns**: `1fr 52 40 44 84 84 96`, i.e. PLAYER · POS · AGE · OVR · FEE · WAGE · action. Rows are 44 tall.
- **Action button**: SIGN (yellow) or "NEED $18k" (#1b264a / #9aa6c7) when unaffordable.

### 3h League
- Two columns, `1.5fr / 1fr`.
- **Ladder**: columns `24 1fr 30 30 30 44 34` (pos, club, P, W, L, +/−, PTS); rows 25 tall.
  - User's club: "★ " prefix, bg #24346b, bold.
  - Finals cut-off: a 1px dashed #f4d03f line under 4th.
- **Fixtures**: rows 38 tall, bg #141d3a, radius 8, showing round · opponent · H/A · result.
  - Result colours: W #6fd896, L #f0a39b, NEXT #f4d03f, future #9aa6c7.
- This replaces separate Fixtures and Ladder tabs.

### 3i Office menu (replaces "More")
- Pop-up sheet: `left 12, right 12, bottom 84`, over a dimmed grounds view (`rgba(5,9,22,.35)`).
- Active tab label: "OFFICE ▴".
- **Grid**: 4 columns. Tiles are 64 tall, #1b264a, radius 10.
  - Name: Barlow 18/700.
  - Status line: 12px. Use #f4d03f if it needs attention, otherwise #9aa6c7.
- **Items**: Finance, Staff & Board, News, History, Kit & colours, Guide, Settings, Save & quit.

### 3j Finance
- **Left column (250)**: 3 key tiles.
  - NET WEEKLY (AVG), large Mono, in #6fd896 or #f0a39b.
  - NEXT HOME GATE.
  - A contracts-expiring alert with VIEW ▸.
- **Right column**: segmented THIS WEEK / SEASON P&L / LEDGER, then line items (28 tall, Mono values, +green / −red) and a Net total row with a 2px #26325c top border.

### 3k Staff & Board
- **Left (280)**: BOARD · SEASON 1, a patience bar (3/5), and objective rows with status (ON TRACK #6fd896 / AT RISK #f4d03f).
- **Right**: staff rows (52 tall), each with role + name + wage and its effect line. Button: HIRE (yellow) or RELEASE (#1f2b55 / #f0a39b).

### 3l History
- Header summary line, then a table: `60 80 70 60 1fr 120 80` (season, finish, W–L, pts, player of season, net, BOOKS button).
- Best finish is in #f4d03f.

### 3m Live match (**key screen**)
- **Score bug**, top-left (top 12, left 16): radius 8, shadow.
  - Per team: a 6px colour stripe (home #f4d03f, away #2f8a46), the 3-letter code (Barlow 19/700; "★" marks the user's team), and a 36×44 score box (#1b264a, Mono 20/600).
  - Then the clock block: bg #f4d03f, Mono 16 time + "1H"/"2H".
  - Optional 4px possession bar underneath, as the team-colour split.
- **Commentary strip (log = line)**: bottom 78, centred, width 560, height 40, radius 8, bg `rgba(14,22,48,.95)`.
  - Contents: a "LIVE" tag (yellow), the latest event on one line (14px, ellipsis), and "FULL LOG ▴" on the right.
  - Tapping it sets the log to full.
- **Bottom row** (left 16, right 16, bottom 12, gap 8):
  1. **COACH**: 56 tall, radius 14, #0e1630.
     - Badge: "3 CALLS" (yellow) when calls are available.
     - "THEIR BALL" (#1b264a / #9aa6c7) when they aren't. **The button never disappears**, so the row never shifts.
  2. **LOG toggle**: 56 tall, a 28×16 switch + "LOG". On = #f4d03f track, knob right. Off = #26325c, knob left.
  3. Spacer.
  4. **Speed pill**: radius 28. Contents: ❚❚, 1× / 2× / 4× / 8× (selected = yellow pill), a divider, SKIP ▸▸.
- **Full log (log = full)**: right panel, `top 12, right 12, bottom 80`, width 330.
  - Header: MATCH LOG (yellow) and ✕.
  - Filter chips: ALL / SCORING / YOUR CALLS.
  - Scrolling event rows: time in Mono #9aa6c7, then text. Tries in #f4d03f/600; your calls with their outcome in #6fd896.
- **Stats**: no permanent stats panel. Tapping the score bug opens stats (same layout as the 3t stats column).

### 3n Log hidden + try banner
- With the log hidden, only the score bug and bottom row show on the pitch.
- **Try banner**: below the score bug (top 66, left 16), height 56.
  - "TRY": Barlow 34/700 italic on yellow.
  - Then scorer name (20/700) and "TEAM · +4" (14, #c9d1ea).
  - Shown about 3s. **It shows even when the log is hidden.**
  - Same pattern for other key moments: penalty goal, field goal, sin bin.

### 3o Coach calls open
- Tray above the Coach button: `left 16, bottom 80`, width 360, #0e1630, radius 14.
- **Header**: "YOUR BALL · TACKLE 2" (yellow) and "Match keeps playing".
- **Call rows**: 44 tall, #1f2b55. Call name (Barlow 18/700) on the left, plain-English effect (12px #c9d1ea) on the right.
- **Only calls available now are listed.** A footer line says when the others unlock: "Kick early from tackle 3 · Bomb, Run it from tackle 4".
- Coach button state: "COACH ▾" with a 2px yellow inset ring.
- The match does **not** pause.

### 3r Half-time / game plan sheet
- Bottom sheet, height 296, top radius 22, #0e1630. The pitch is dimmed behind it.
- **Header**: HALF-TIME (yellow), score, a one-line summary, and an opponent-tendency note on the right.
- **Segmented rows**:
  - ATTACK: Balanced / Expansive / Direct / Kick & chase.
  - DEFENCE: Hold / Rush / Slide.
  - BENCH: Off / Standard / Heavy.
- **Footer**: an explainer of the selected option, then primary START 2ND HALF ▸.
- **The same sheet opens from Lineup → PLAN before kick-off.**

### 3s Full time
- Centred card, 540 wide, #0e1630, radius 18.
- **Header**: "FULL TIME · ROUND 2" with a result tag (WIN BY 6 in #2d8a4a).
- **Score**: 42 Mono, then "v Opponent".
- **Effect chips**: ladder move, gate, injuries (injuries in #f0a39b).
- **Player of the match**: a row with a 44px initials badge.
- **Buttons**: REPORT (secondary) and **BACK TO CLUB ▸** (primary).

### 3t Match report
- Full sheet (inset 12) over the dimmed pitch. Two columns, `1fr / 340`.
- **Left**:
  - Result tag.
  - Both teams, each with a colour stripe, name and score, and a line of tries with minutes and goals.
  - A one-sentence italic summary.
  - Plan-change disclosure.
  - Primary BACK TO CLUB.
- **Right**: stat rows (34 tall), each with home value, label, a 4px split bar, and away value.

## Interactions & state
- **Log mode** `'line' | 'hidden' | 'full'`, default `'line'`.
  - The LOG toggle switches line ↔ hidden.
  - Tapping the strip sets full; ✕ in the full log returns to line.
  - **Persist** the mode across matches (prototype key `nrlsim.logMode`; save `full` as `line`).
  - Key-moment banners still show when the log is hidden.
- **Coach**: the badge count = calls legal at this tackle. Tap to open the tray; tap a call to apply it, close the tray and log it with its outcome.
- **Sheets**: tapping the active tab or the dimmed area closes the sheet. Only one sheet is open at a time.
- **Speed**: the selected speed persists for the match. SKIP goes to the next break (half-time / full time).
- **Disabled items** always render, with the reason in place of the action.
- **Transitions** (suggested): sheets slide up 180ms ease-out; banners fade/slide in 150ms and out after 3s.

## Design tokens
- **Surfaces**: navy #0e1630 · panel #141d3a · raised #1b264a · button #1f2b55 · divider/track #26325c · user-row highlight #24346b
- **Text**: #ffffff · secondary #c9d1ea · muted #9aa6c7
- **Accent**: #f4d03f, with #0e1630 text on it
- **Team colours**: home #f4d03f · away #2f8a46
- **Status**: positive #6fd896 · negative #f0a39b · alert dot #e0574a · win tag #2d8a4a · injured tile #5a2430 · bench chip #3a6ea5
- **Fitness**: #3fbf6a · #e8a33a · #d9534f
- **Overlays**: sheet `rgba(14,22,48,.97)` · dim `rgba(5,9,22,.35–.55)`
- **Shadows**: `0 4px 14px rgba(0,0,0,.35)` for floating chips/HUD · `0 6px 20px rgba(0,0,0,.4)` for trays/popovers · `0 12px 40px rgba(0,0,0,.4)` for modals
- **Radii**: 6 tile · 8 button/strip · 10 button/tile · 12 chip/primary · 14 tray/match buttons · 16 sheet/dock · 18 modal · 22 bottom sheet · 28 pill
- **Spacing**: 4 / 6 / 8 / 10 / 12 / 16 / 24. Screen insets are 12 (sheets/dock) and 16 (match HUD).
- **Type**:
  - **Barlow Condensed** (500/600/700, 700 italic for TRY) for labels, buttons, headings, tabs. Usually caps with letter-spacing .04–.08em.
  - **IBM Plex Sans** (400/500/600) for body, 12–15px.
  - **IBM Plex Mono** (500/600) for every number: scores, money, clock, ratings.
  - All three are on Google Fonts.

## Assets
- No new icons. Glyphs used: ▸ ▾ ▴ ◂ ✕ ❚❚ ★
- The portrait slot on 3f shows the player's generated portrait.
