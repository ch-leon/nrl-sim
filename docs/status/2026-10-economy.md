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

- PR #170, merged. No `GameState` change, no save bump.
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
