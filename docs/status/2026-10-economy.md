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
