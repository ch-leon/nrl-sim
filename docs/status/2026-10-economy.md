# Economy work log — October 2026 (N6)

Autonomous run while Leon is travelling (plan N6 in `docs/plans/2026-10-next-plans.md`,
on the `plans/2026-10-next` branch: money that matters). Scope: sinks that scale with
the club (facility upkeep, wages that climb with quality and success), gates with a
roof, a season P&L the player can read, and difficulty retuned so money is a decision
again. Measured with `npm run soak`; no match code.

Every decision marked **Assumed (needs Leon)** is also listed in that PR's body.

## #161 Soak: money by source, per season

- PR #163, merged. No game change.
- `SeasonSample.finance` (`src/qa/soak.ts`) tallies every `money:changed` delta of the
  season into one of eleven lines (`FINANCE_LINES`): wages, sponsor + grant, gates,
  finals prize money, board grants, event cash (card choices and the money modifiers
  such as merch royalties, matched by their labels from the deck), transfers (signing
  fees and sales), contracts (early renewals and releases), facilities (build, upgrade,
  move, demolish), upkeep (once it exists) and other (anything new, so it shows rather
  than vanishes). `classifyReason` maps a ledger reason to its line.
- The rollover's prize money and board grants count for the season they close. At every
  rollover the soak checks that the lines add up to the balance's movement, so a write
  that skips the ledger is a problem, not a mystery.
- `npm run soak` prints a season P&L by mode and difficulty under the per-season table;
  `--json` carries the tallies per run.
- Verified: tsc, vitest (the classifier, the tally against the balance, idle v managed
  lines), build, the full soak (20 seeds × 5 seasons × 3 modes plus old saves v1–v8, no
  problems, 27 s), Playwright at 844×390 and 1280×800 (`docs/screenshots/161/`: the
  Finance screen as it is today, the "before" for the P&L work).
- Assumed (needs Leon): the eleven lines and which reasons land in each (signing fees
  and sales together as transfers; renewals and releases together as contracts).

### Baseline (main at #159, 20 seeds, 5 seasons)

$k a season, averaged over the runs that reached the season (an idle club's run ends
when the board sacks it: 15 of 20 reach season 4 on Normal, 4 reach season 5).
Contracts, upkeep and other are zero in every row (the soak manager never renews early,
releases or sells; there is no upkeep yet) and are left out. Money = the balance at the
rollover; a new game starts with $200k ($100k on Hard).

| mode | season | runs | wages | sponsor+grant | gates | prize | board | events | transfers | facilities | net | money |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| idle | 1 | 20 | −454 | +41 | +417 | +21 | +37 | +13 | 0 | 0 | **+74** | $274k |
| idle | 2 | 20 | −397 | +50 | +477 | +2 | +19 | +12 | 0 | 0 | **+163** | $437k |
| idle | 3 | 20 | −356 | +52 | +493 | +4 | +20 | +12 | 0 | 0 | **+225** | $662k |
| idle | 4 | 15 | −325 | +55 | +513 | +4 | +19 | +14 | 0 | 0 | **+280** | $947k |
| idle | 5 | 4 | −331 | +63 | +570 | +4 | +19 | +10 | 0 | 0 | **+335** | $1,344k |
| managed | 1 | 20 | −537 | +44 | +528 | +136 | +45 | +6 | −98 | −48 | **+75** | $275k |
| managed | 2 | 20 | −617 | +81 | +861 | +133 | +30 | +7 | −357 | 0 | **+138** | $413k |
| managed | 3 | 20 | −743 | +113 | +1,159 | +145 | +45 | +6 | −142 | 0 | **+583** | $996k |
| managed | 4 | 20 | −779 | +134 | +1,333 | +139 | +30 | +5 | −99 | 0 | **+762** | $1,758k |
| managed | 5 | 20 | −802 | +133 | +1,335 | +141 | +30 | +9 | −41 | 0 | **+805** | $2,564k |
| idle Hard | 1 | 20 | −551 | +41 | +409 | +3 | +11 | +13 | 0 | 0 | **−74** | $26k |
| idle Hard | 2 | 20 | −449 | +42 | +416 | 0 | +8 | +11 | 0 | 0 | **+27** | $53k |
| idle Hard | 3 | 7 | −388 | +44 | +433 | 0 | +15 | +10 | 0 | 0 | **+115** | $235k |
| idle Hard | 4 | 1 | −384 | +49 | +466 | 0 | +15 | +22 | 0 | 0 | **+169** | $483k |

What it says:

- **Gates are the biggest line and the only one that grows.** An idle Normal club takes
  $417k at the gate in season 1 (about $35k a home game at reputation 30–36, no
  grandstand) and $570k by season 5 as its reputation drifts to the high 40s. Its wage
  bill goes the other way, $454k to $331k, as the starting squad ages, retires and is
  topped up with juniors on rookie wages. The club does nothing and its net goes from
  +$74k to +$335k a season.
- **Success is paid twice and costs nothing.** The managed club's reputation reaches 97
  and its gates $1.3M a season (about $88k a home game on the hill, no grandstand
  built), with $140k of prize money on top. Its wage bill is $800k for a squad of
  85-overall players: only 1.8× the idle club's for a side 35 points better, because the
  market wage is linear (overall × 15 + 100). It spends what it likes on stars
  ($357k in season 2) and still banks $600–800k a season.
- **Everything else is small.** Sponsor + grant is $41–134k a season (reputation × $50 a
  week plus a Sponsor Board nobody in the soak builds), board grants $19–45k, event cash
  about $10k. Prize money matters only to a finals side.
- **Hard already loses money in season 1** (−$74k on wages × 1.3 from $100k), then
  recovers once the squad has aged into cheaper players; the lowest balance seen was
  −$68k, which is under the forced-sale floor.
- Nothing costs more as the club grows: no upkeep, no wage curve, no gate ceiling. The
  next four items add each of those, and the last retunes the small lines by difficulty.

## #164 Facility upkeep

- PR #166, merged. No `GameState` change, no save bump.
- Every catalog entry (`src/data/facility.ts`) has an `upkeep`: its weekly running cost
  at level 1, 1% of the build cost (Paddock $80, Weights Room $150, Video Room $180,
  Physio $220, Canteen $120, Sponsor Board $100, Grandstand $1,200, Academy $600,
  Coach's Office $300, Scout Office $250, Medical Bay $350, Team Gym $400), ×1.5 at L2
  and ×2 at L3 (`UPKEEP_LEVEL_MULT`, `facilityUpkeep`). A fully upgraded Grandstand runs
  at $2,400 a week, about $65k a season.
- `weeklyUpkeep(state)` in `economy.ts` sums it over the grounds; `applyEconomy` pays it
  right after wages with ledger reason `upkeep` (wages → upkeep → income → gate →
  contracts → bankruptcy). Not scaled by difficulty.
- Finance: an Upkeep row under the wage bill, counted in the net and the burn, and an
  Upkeep column in the six-week ledger. Build menu: "$80/wk upkeep" beside each cost.
  Facility popup: "Upkeep $80/wk · L2 $120/wk" so an upgrade's running cost is known
  before it is bought.
- Verified: tsc, vitest (catalog rates, the level multipliers, `weeklyUpkeep`, the
  tick's order and reasons, the Finance summary and ledger), build, the full soak (no
  problems), Playwright at 844×390 and 1280×800 (`docs/screenshots/164/`: build menu,
  facility popup, Finance).
- Assumed (needs Leon): the 1% rate and the ×1.5 / ×2 level steps; upkeep is the same
  on every difficulty; the popup shows the next level's upkeep rather than the upgrade
  button carrying it.

### Soak, upkeep line only (20 seeds; nothing else moved)

The soak's managed manager builds a Paddock and a Gym (upkeep $480 a week together);
the idle managers build nothing, so they are unchanged.

| mode | season 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| managed: upkeep | −$13k | −$13k | −$13k | −$13k | −$13k |
| managed: net before → after | +75 → +46 | +138 → +141 | +583 → +530 | +762 → +750 | +805 → +788 |
| managed: money | $246k | $387k | $917k | $1,667k | $2,455k |

Upkeep is the sink that scales with the grounds, not the fix for the runaway: two
cheap training facilities cost $13k a season against gates of $0.5–1.3M. It bites a
club that builds the expensive things (a Grandstand at L3 and an Academy together are
about $100k a season), which is the point: from here a building has to earn its keep.

## #167 Wages that climb with quality and success

- PR #168, merged. No `GameState` change, no save bump: stored wages stay as they are
  until the next renewal; new games and new signings are on the new curve at once.
- `wageForOverall` in `data/player.ts` (the one `marketWage`, which contracts and rivals
  still re-export): the old straight line (overall × 15 + 100) plus `WAGE_PREMIUM` (2)
  × (points above `WAGE_PREMIUM_FROM`, 55)² a week. 55 $925, 60 $1,050, 70 $1,600,
  80 $2,550, 85 $3,175, 90 $3,900: a squad of 70s costs 1.7× a squad of 55s, a squad of
  85s 3.4×. Below 55 nothing changes, so depth players and juniors cost what they did.
- Renewal asks (`contracts.renewalWage(p, club)`) are the market wage for the player's
  overall today, moved by morale as before, times `clubWageFactor`: +25% at reputation
  100 (nothing at the baseline, 30, and below; `CONTRACTS.RENEW_REP_PREMIUM`) and +3% for
  every season after the first (`RENEW_SEASON_INFLATION`). The Contracts screen's Renew
  button and the economy's automatic renewal at contract end both ask this (the
  automatic one used to be the old wage ± a drift by overall, so the curve never reached
  a player who stayed).
- The rival salary cap (`RIVAL_WAGE_CAP`) is now what a 20-man squad of 62.5-overall
  players costs on the curve, $23,000. Probed over 20 new games: the flat $21,000 under
  the straight line left 240 of 300 rivals with room to sign a 65; $23,000 on the curve
  leaves the same 240, and the soak's rival mean (56.0–57.1) and range (41–69) are
  unchanged, so rivals sign as they did.
- Verified: tsc, vitest (the curve's values and monotonicity, the club factor by
  reputation and season, early and automatic renewals at the ask, one `marketWage`), build,
  the full soak (no problems), Playwright at 844×390 and 1280×800
  (`docs/screenshots/167/`: Contracts with the asks, Recruit with the wages).
- Assumed (needs Leon): the curve (a premium from 55, squared); +25% at reputation 100
  and +3% a season; 62.5 for the cap; renewals priced at today's overall rather than
  the old wage; trained-up players on an old wage now fall under `MORALE.LOW_PAY_RATIO`
  sooner (they want the pay rise), which is the existing morale rule doing its job.

### Before → after (20 seeds; upkeep in, before this PR → after)

| | before | after |
|---|---|---|
| A new game's wage bill | $16.8k a week | $18.1k a week (+8%; the hero star) |
| Idle Normal: wages S1 / S5 | −$454k / −$331k | −$490k / −$391k |
| Idle Normal: net S1, money S3 | +$74k, $662k | +$38k, $545k |
| Managed: wages S1 / S3 / S5 | −$536k / −$737k / −$805k | −$581k / −$1,180k / −$1,275k |
| Managed: net S1 / S3 / S5 | +$46k / +$530k / +$788k | +$2k / −$37k / +$24k |
| Managed: money S1 → S5 | $246k → $2,455k | $202k → $280k |
| Managed: best nine S5, premierships S5 | 88.6, 100% | 83.2, 70% |
| Managed: signings S2 | 6.3 at 81 overall, $326k | 4.4 at 79, $209k |
| Idle Hard: net S1, money S1, sacked by S2 | −$74k, $26k, 70% | −$130k, −$30k, 90% |

- **The managed club now lives within its means.** By season 3 its squad of 80s costs
  $1.2M a season, every dollar the gate brings in, and it stops hoarding: $200k →
  $280k over five seasons, which is the plan's "grows slowly" already. It still wins
  (the match margin for a 23-point gap is N1's Phase 3), but it can no longer buy six
  stars a season on top of a Paddock and a Gym.
- **Idle Normal still gains**: wages +$36k a season is not enough against $417k of
  gates. Gates are the next PR.
- **Idle Hard is now in the red at the end of season 1** on wages × 1.3: the fire-sale
  floor is close, and item 6 will set where it should sit.

## #169 Gates with a roof

- PR #171, merged. No `GameState` change, no save bump.
- `homeGate(state, fixture)` in `economy.ts`: attendance = min(capacity, demand), receipts
  = attendance × $20. Capacity is `ECON.CAPACITY` by Grandstand level: the hill holds
  2,000, a stand 3,500 / 5,000 / 6,500. Demand = (300 + reputation × 30) × form ×
  occasion: form is 1 ± 25% across the last five results (`recentForm`, five wins +25%,
  five losses −25%, from the matches before the round); the occasion is ×1.2 for a
  top-eight opponent (by the ladder, once it has played) and ×1.5 for a home final. A
  new club at reputation 30 draws 1,200 ($24k a game); the hill sells out from
  reputation 57; a top club at 97 draws 3,200, 4,000 on a winning run, and fills a
  stand at its second level. `gateReceipts` is `homeGate` for the current fixture, and
  the Finance screen's projected next home gate is the same function, with a new
  Crowd row ("1,140 of 2,000 seats", or "Sold out · 2,000 seats" when a bigger stand
  would earn more). The Grandstand's Build blurb now says seats, not "+50% attendance".
- The old `GRANDSTAND_ATTEND_MULT` is gone: a stand no longer multiplies the crowd, it
  seats it.
- The soak's managed manager gained two habits (Assumed, needs Leon): it builds a
  Grandstand, then upgrades it, whenever the next home gate is sold out and $60k is left
  after paying (`MANAGED.STAND_RESERVE`), and it signs a star only while the weekly net
  after that wage stays above −$3k (`BURN_ALLOWED`; a season's home gates spread over
  its weeks, economy functions only). Without the second rule a manager that reads the
  bank balance alone signs its way into a wage bill the hill can't pay.
- Verified: tsc, vitest (the roof by level, demand by reputation, form from the last
  five, the big match and the home final, the projection and the crowd label), build,
  the full soak (no problems), Playwright at 844×390 and 1280×800
  (`docs/screenshots/169/`: Finance with the Crowd row, the Build menu).
- Assumed (needs Leon): the capacities, 300 + 30 × reputation, ±25% form, ×1.2 for a
  top-eight opponent, ×1.5 for a home final; no derbies (the league has no geography);
  the ticket price stays $20; the managed manager's two new rules.

### Before → after (20 seeds; wages in, before this PR → after)

A first cut at 400 + 35 × reputation left an idle Normal club gaining +$6k to +$143k
a season: at reputation 30–48 it never reaches the roof, so the roof alone changes
nothing for it, and only the demand level does. 300 + 30 × reputation is the number
below.

| | before | after |
|---|---|---|
| A new club's gate (reputation 30, neutral form) | $29k a game, 1,450 | $24k a game, 1,200 |
| Idle Normal: gates S1 / S3 / S5 | +$417k / +$497k / +$569k | +$321k / +$357k / +$389k |
| Idle Normal: net S1 / S2 / S3 / S4 | +$38k / +$132k / +$175k / +$210k | −$58k / +$5k / +$38k / +$61k |
| Idle Normal: money S1 / S3 / S5 | $238k / $545k / $1,207k | $142k / $194k / $518k |
| Managed: gates S1 / S3 / S5 | +$521k / +$1,099k / +$1,279k | +$443k / +$1,002k / +$1,260k |
| Managed: stand built, its upkeep S5 | never, $13k | by season 2, upgraded to L3 by 4; $60k |
| Managed: facilities S1–S5 | −$48k once | −$48k / −$90k / −$144k / −$126k / −$54k |
| Managed: net S1 / S3 / S5 | +$2k / −$37k / +$24k | +$63k / +$33k / +$9k |
| Managed: money S1 → S5 | $202k → $280k | $263k → $405k |
| Managed: best nine S5, premierships S5 | 83.2, 70% | 83.4, 100% |
| Idle Hard: net S1, money S1 | −$130k, −$30k | −$185k, −$85k |

- **The roof is a success tax, and the stand is an investment.** The managed club
  sells out the hill in its second season, builds a Grandstand and upgrades it twice
  (about $720k over four seasons, plus $60k a season to run), and its gates reach
  $1.26M against a $1.38M wage bill: it finishes five seasons at $405k, the plan's
  "grows slowly". It still wins everything (the margin for a 25-point gap is Phase 3's).
- **Idle Normal loses $58k in season 1 and then creeps back up**: its wage bill falls
  $100k over five seasons as the starting squad retires and juniors arrive on rookie
  wages, while its reputation drifts from 36 to 48 (+2 for every board objective met,
  "solvent" among them) and lifts the gate $70k. From $200k it ends season 1 at $142k
  and season 3 at $194k: not yet "into the red by season 3–4". Item 6 has the lines
  that do the rest (the reputation grant, board grants, prize and event cash, the
  ticket price).
- **Idle Hard is bust in season 1** (−$185k on wages × 1.3 from $100k): item 6 must
  soften Hard, not sharpen it.

## #172 Season P&L on the Finance screen

- PR #175, merged. **Save v9 → v10**: `GameState.finance`, the club's books by season.
- `FINANCE_LINES` and `SeasonFinance` live in `core/state.ts`: twelve lines (wages,
  upkeep, sponsor, grant, gates, prize money, board grants, events, transfers,
  contracts, facilities, other), one entry per season, oldest first. `createNewGame`
  opens season 1's; the v9 → v10 migration gives an old save an empty entry for the
  season it is in (`emptyFinance`), with a test.
- `registerFinanceSystem()` in `economy.ts` (registered from `main.ts`, additively, and
  by the soak) books every `money:changed` delta on its line (`classifyReason`, moved
  here from the soak) in the current season's entry, opening it on the first
  movement. The rollover pays the finals prize money and the board grant after the
  season counter has moved on but in week 1, so those two lines at week 1 close the
  season just played. Nothing depends on the order listeners fire in: a first cut
  opened the new entry on `week:advanced`, and the autosave, which subscribes first,
  wrote a season-2 save with only season 1's entry, so week 1 was booked to the wrong
  season (caught by the save corpus, which now holds three v10 saves from the phone
  playthrough). The economy now
  books the Sponsor Board and the reputation grant as two lines (`sponsor`, `grant`)
  instead of one `sponsor+grant` movement; the weekly ledger on the screen still
  shows them together as Income.
- Finance: a "Season P&L · S2 v S1" panel under the weekly numbers: one row per line
  with money on it in either season, biggest this season first, this season and last
  in two columns, a bold Net row at the foot; "Nothing booked yet" before the first
  week. `seasonPnl(state)` is the pure view-model.
- The soak keeps its own tally from the bus and now checks the game's books against
  it line by line at every rollover (less what a save loaded mid-season had already
  booked): a difference is a problem. 100 seasons across the three modes, the
  old-save runs (v1–v9) and the save corpus (v9 and v10) all agree.
- Verified: tsc, vitest (the booking of each line, the season boundary with a prize paid
  during the rollover, a save with no books, a real week tick against the ledger, the
  migration, the view-model's ordering and nets), build, the full soak (no problems),
  Playwright at 844×390 and 1280×800 (`docs/screenshots/172/`: Finance in season 2
  with last season beside it).
- Assumed (needs Leon): the twelve lines and their labels; every season is kept (twelve
  numbers a season, so a save grows by about 200 bytes a season); Sponsor and Grant
  booked apart; the panel sits under the weekly numbers, above the board's objectives.

## #176 Money targets by difficulty

- PR #180, merged. No `GameState` change, no save bump. The spec gains a "2026-10
  retune" section (`docs/specs/BAK-188-economy.md`) with every number in one place.
- A probe (in memory, not committed) swept eleven candidate tunings through the soak
  at 12 seeds × 5 seasons × idle and managed × every difficulty, printing per row the
  share of runs in the red, under the forced-sale floor, and sacked. The ticket price
  alone could not do it: a cut that puts an idle club into the red takes three times
  as much from a managed club (its gates are three times bigger) and sinks it too;
  the managed club's edge is prize money, the reputation grant and seats, so those
  were kept or trimmed lightly and the pressure spread over several small lines.
- What changed (`config.ts`, `data/events.ts`):
  - `ECON.TICKET_PRICE` $20 → $18; `REP_GRANT_PER_POINT` $50 → $40 a point a week;
    `FORCED_SALE_FLOOR` −$50k → −$100k, so the red is a warning before a fire sale.
  - `BOARD.GRANT_PER_MET` $15k → $10k. `PRIZE` unchanged: a finals side has earned it.
  - The cards' cash offers trimmed by about 40%: billboard $8k → $5k, merch $12k → $7k
    or $1.5k → $900 a week, clinics $5k → $3k, pizza $3k → $2k a win, food truck $400 →
    $250 a week, the fine $1k → $600. Costs unchanged.
  - `CONTRACTS.RENEW_SEASON_INFLATION` 3% → 4% a season.
  - `DIFFICULTY.hard`: starting money ×0.5 → ×0.75 ($150k), wages ×1.3 → ×1.15.
    Rivals ×1.1, injuries ×1.4 and the −4 start are unchanged; Easy and Normal are
    untouched (Normal stays the identity).
- Verified: tsc, vitest (the tests that encoded the old grant, ticket, floor and
  billboard amounts now read the constants), build, the full soak on every
  difficulty (no problems), Playwright at 844×390 and 1280×800
  (`docs/screenshots/176/`: a new Hard game at $150,000 and its Finance screen).
- Assumed (needs Leon): all of the above, and the targets as read below.

### After (20 seeds, five seasons; `npm run soak -- --difficulties easy,normal,hard`)

Money is the balance at each rollover, averaged over the runs that reached the season
(a sacked club's run ends). "red" and "bust" are from the 12-seed probe on the same
settings: the share of runs below zero at the rollover, and the share that touched
the −$100k floor during the season.

| mode | S1 | S2 | S3 | S4 | S5 | sacked by S3 / S5 |
|---|---|---|---|---|---|---|
| idle Easy | $296k | $395k | $560k | $751k | $927k | 0% / 20% |
| managed Easy | $287k | $364k | $403k | $405k | $335k | 0% / 0% |
| idle Normal | $84k | $30k (42% red) | $53k (36% red, 10% bust) | $146k | $264k | 40% / 100% |
| managed Normal | $211k | $318k | $352k | $361k | $347k | 0% / 10% |
| idle Hard | −$79k (100% red) | −$122k (bust) | – | – | – | 100% by S2 |
| managed Hard | $33k (50% red) | $72k | $85k | $84k | $81k | 40% / 40% |

Season P&L, idle and managed Normal ($k; before = #172 in, after = this PR):

| | wages | grant | gates | prize | board | events | transfers | facilities | upkeep | net |
|---|---|---|---|---|---|---|---|---|---|---|
| idle S1 before → after | −490 → −490 | +41 → +33 | +321 → +289 | +21 → +21 | +37 → +25 | +13 → +8 | 0 | 0 | 0 | −58 → **−116** |
| idle S2 | −436 → −436 | +50 → +40 | +354 → +318 | +6 → +6 | +20 → +10 | +11 → +7 | 0 | 0 | 0 | +5 → **−55** |
| idle S3 | −409 → −354 | +53 → +42 | +357 → +300 | +4 → +3 | +21 → +11 | +11 → +8 | 0 | 0 | 0 | +38 → **+11** |
| managed S1 | −509 → −502 | +43 → +35 | +443 → +400 | +110 → +116 | +45 → +30 | +5 → −3 | −14 → −4 | −48 → −48 | −13 → −13 | +63 → **+11** |
| managed S3 | −947 → −857 | +105 → +87 | +1,002 → +935 | +121 → +133 | +44 → +30 | +4 → −3 | −102 → −82 | −144 → −156 | −50 → −52 | +33 → **+35** |
| managed S5 | −1,380 → −1,201 | +132 → +106 | +1,260 → +1,089 | +139 → +106 | +30 → +18 | +5 → −3 | −63 → −31 | −54 → −36 | −60 → −61 | +9 → **−14** |

Against the plan's targets:

- **Idle Normal drifts into the red by season 3–4 (a warning, not a fire sale): about
  met, a season early.** From $200k it loses $116k in season 1 and $55k in season 2;
  four runs in ten are below zero at the end of season 2, a third at the end of
  season 3, and one in ten touches the −$100k floor. The board sacks 40% by season 3
  (the solvent objective is missed in the red) and all by season 5. The survivors
  recover from season 3, because a broke club's players walk at contract end and the
  juniors who replace them are cheap: the money problem turns into a football problem,
  which is what the board is for. No setting of these lines keeps an idle club sinking
  through season 4 without also sinking the managed one.
- **Managed Normal grows slowly ($200k → $400k): met.** $211k → $361k by season 4,
  $347k at five, with a squad of 80s that costs $1.2M a season against $1.1M of gates:
  it builds and upgrades its stand, signs two stars a season, and ends about where it
  started plus a stand.
- **Hard can go bust: met.** An idle Hard club is under water at the end of season 1
  and through the floor in season 2; a managed Hard club is in the red half the time,
  banks $30–85k, makes the eight six seasons in ten and loses 40% of its managers by
  season 3. With the old half-money, ×1.3 Hard both went bust in season 1.
- **Easy is comfortable: met.** An idle Easy club banks $100–190k a season and is a
  top-six side for four seasons; the managed one wins everything on $290–400k.

## Summary

All six items merged in order: #163 (the soak's P&L, #161), #166 (facility upkeep,
#164), #168 (wages that climb, #167), #171 (gates with a roof, #169), #175 (the
season P&L on Finance, #172) and #180 (money targets by difficulty, #176). `GameState`
changed once (v9 → v10: `finance`, the club's books), with a migration, a test and
three v10 saves in the corpus. Each PR carried tsc, vitest, build, the full soak and
Playwright screenshots at 844×390 and 1280×800 under `docs/screenshots/<issue>/`.
Every "Assumed (needs Leon)" item is listed above, in its PR body, and below.

### Before → after, 20 seeds, five seasons (main at #159 → main with all six)

Money at the rollover, averaged over the runs that reached the season. "Before" Easy
rows are from the league log's #148 table (same seeds, main at #153).

| mode | before: S1 / S3 / S5 | after: S1 / S3 / S5 | sacked by S5 before → after |
|---|---|---|---|
| idle Easy | $479k / – / $2,400k | $296k / $560k / $927k | 20% → 20% |
| managed Easy | $320k / – / $2,900k | $287k / $403k / $335k | 0% → 0% |
| idle Normal | $274k / $662k / $1,344k | $84k / $53k / $264k | 100% → 100% (40% by S3, was 30%) |
| managed Normal | $275k / $996k / $2,564k | $211k / $352k / $347k | 0% → 10% |
| idle Hard | $26k / $235k / $483k (S4) | −$79k / bust in S2 / – | 90% by S3 → 100% by S2 |
| managed Hard | $97k / $446k / $1,500k | $33k / $85k / $81k | 10% by S2 → 40% by S3 |

The season P&L ($k), idle Normal in season 1 and the managed club in season 5:

| | wages | upkeep | sponsor + grant | gates | prize | board | events | transfers | facilities | net |
|---|---|---|---|---|---|---|---|---|---|---|
| idle S1 before | −454 | 0 | +41 | +417 | +21 | +37 | +13 | 0 | 0 | **+74** |
| idle S1 after | −490 | 0 | +33 | +289 | +21 | +25 | +8 | 0 | 0 | **−116** |
| managed S5 before | −802 | 0 | +133 | +1,335 | +141 | +30 | +9 | −41 | 0 | **+805** |
| managed S5 after | −1,201 | −61 | +106 | +1,089 | +106 | +18 | −3 | −31 | −36 | **−14** |

What changed, in one line each: a squad of 85s costs 3.4× a squad of 55s instead of
1.8×, and renewals ask today's price; every building has a running cost; a crowd has
to fit in the ground, and only a stand (which costs money to build and run) lifts
the roof; the small lines and Hard are retuned; and the player can read a season's
books against last season's.

### Every assumption (needs Leon)

- #161: the lines of the books and which ledger reasons land in each (signing fees
  and sales together as transfers; early renewals and releases together as contracts).
- #164: upkeep 1% of the build cost a week at L1, ×1.5 at L2, ×2 at L3; the same on
  every difficulty; the popup shows the next level's upkeep on its own line.
- #167: the wage curve (a premium of 2 × (points above 55)²); +25% on renewal asks at
  reputation 100 and +4% a season (3% at #167, 4% since #176); the rival cap at a
  20-man squad of 62.5s; automatic renewals priced at today's overall; trained-up
  players on an old wage fall under `MORALE.LOW_PAY_RATIO` sooner.
- #169: seats 2,000 / 3,500 / 5,000 / 6,500; demand 300 + 30 × reputation, ±25% on
  form, ×1.2 for a top-eight opponent, ×1.5 for a home final; no derbies; the soak
  manager's $60k stand reserve and $3k-a-week burn allowance.
- #172: the twelve lines and labels; Sponsor and Grant booked apart; every season
  kept; the panel's place on the screen.
- #176: ticket $18, reputation grant $40 a point, board grant $10k, the cards' cash
  trimmed by about 40%, prize money unchanged, the floor −$100k, Hard on three-quarters
  of the money and wages ×1.15; the targets as read in that section.

### Needs Leon

- **Idle Normal is in the red a season early and recovers from season 3**, because a
  broke club's players walk at contract end and juniors on rookie wages replace them.
  No setting of the small lines keeps an idle club sinking through season 4 without
  sinking the managed one too; the one sink that would (a flat club overhead: staff,
  travel, insurance, the same for every club) is outside the plan's list.
- **The managed club still wins 90–100% of premierships** on every difficulty with a
  best nine in the high 70s to low 80s; the margin for that gap is N1's Phase 3.
- **The Sponsor Board** returns $3,000 a week for $10,000 and $100 a week of upkeep:
  it pays for itself in four weeks and nothing in the soak builds it. It is the best
  investment in the game by a mile; a reputation-scaled or capped return would fit the
  rest of this economy.
- **Easy** still banks about $150k a season idle ($927k by season 5). Comfortable as
  asked; Easy wages ×0.9 would keep it comfortable without the pile.
- The weekly ledger on the Finance screen stamps the rollover's prize money and board
  grant as "S2 W1 · Other" (it records by the clock at the time), while the season
  books put them in season 1. A display nit for whoever next touches Finance.
- `docs/ARCHITECTURE.md` §4's `GameState` listing does not show `finance` (the file
  was outside this plan's list).
- The "Unsettled at a rival" card still quotes four weeks' wages for a rival's star
  (N5's note); on the new curve that is $13k for an 85-overall who would cost $64k from
  the pool.
- The phone playthrough's new `coach-call` step (#165) timed out once waiting for a
  call chip on the live match in a run here; everything else passed. Match side.

### What I would do next

1. Re-run `npm run soak -- --difficulties easy,normal,hard` after Phase 3 moves the
   margins: prize money and finals gates are a third of a top club's income, so a
   league where the managed club loses now and then changes its books.
2. A flat club overhead (about $1,500 a week, scaled by difficulty) as the sink that
   makes an idle club keep sinking; then ease the ticket price back toward $20.
3. Hand the season books to N7's season review (`state.finance` is the hook) and the
   history screen.
4. Cap or scale the Sponsor Board's return, and let the Finance screen say what a
   stand would earn before it is built (the Crowd row already says "sold out").
5. If Leon wants training slowed (N5's question), re-measure here first: slower
   training means lower renewal asks, which is the managed club's biggest line.
