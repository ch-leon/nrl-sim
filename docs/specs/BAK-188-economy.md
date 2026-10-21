# BAK-188 — Implement economy system (wages, sponsors, gate receipts)
**Linear:** https://linear.app/bakinglions/issue/BAK-188/implement-economy-system-wages-sponsors-gate-receipts | **Priority:** High | **Work unit:** WU-10

## Problem
The club needs a weekly income/expense loop: deduct every contracted player's wage,
add Sponsor Board passive income (if built) plus a reputation base grant, add
Grandstand match-day gate receipts on home-game weeks (scaled by attendance,
reputation, and Grandstand level), decrement contracts and handle renewals/expiry,
and handle bankruptcy (warnings and forced player sales). This runs as the economy
tick (order 30, ARCHITECTURE §5), after training/injuries and before the match.

## Proposed solution
Add `src/systems/economy.ts` with `applyEconomy(state, rng?)` (order 30) plus pure
helpers for each income/expense path and the bankruptcy cascade. Add an `ECON`
tuning block to `src/config.ts`. Uses `getCurrentFixture` (BAK-184) to detect home
weeks, `club.spendMoney`/credit helpers (`src/data/club.ts`), and emits
`money:changed`, `bankruptcy:warning`, and `ui:notify` events (§5). Fully
deterministic; unit-tested per path plus the bankruptcy cascade.

## Affected files
- Create: `src/systems/economy.ts`
- Modify: `src/config.ts` (add `ECON` constants block)
- Test: `tests/systems/economy.test.ts`

## Key interfaces & behaviour
`src/config.ts` — add:
```ts
export const ECON = {
  SPONSOR_PER_LEVEL: 3_000,       // × Sponsor Board level, if built
  REP_GRANT_PER_POINT: 50,        // × reputation, weekly base grant
  TICKET_PRICE: 20,               // $ per attendee
  ATTEND_BASE: 500,               // base attendance
  ATTEND_PER_REP: 40,             // × reputation
  GRANDSTAND_ATTEND_MULT: 0.5,    // × grandstand level, as (1 + mult×level)
  BANKRUPTCY_WARN: 0,             // balance < 0 → warning
  FORCED_SALE_FLOOR: -50_000,     // balance < this → forced sales
  FORCED_SALE_MORALE_HIT: 10,     // squad-wide morale −10 per forced sale
} as const;
```

`src/systems/economy.ts`:
```ts
import type { GameState } from '../core/state';

// Σ of every squad player's weekly wage.
export function weeklyWages(state: GameState): number;

// SPONSOR_PER_LEVEL × sponsorBoardLevel (0 if unbuilt) + REP_GRANT_PER_POINT × reputation.
export function weeklyIncome(state: GameState): number;

// On a home-game week only: attendance × TICKET_PRICE.
// attendance = (ATTEND_BASE + reputation × ATTEND_PER_REP)
//              × (1 + GRANDSTAND_ATTEND_MULT × grandstandLevel).
// Returns 0 on away/bye weeks. Uses getCurrentFixture to detect home venue.
export function gateReceipts(state: GameState): number;

// Decrement contractWeeks for all squad; handle expiry (renew or depart, below).
export function tickContracts(state: GameState): GameState;

// Bankruptcy cascade: while money < FORCED_SALE_FLOOR, auto-release highest-paid
// player (NO payout), notify, and apply squad-wide morale −10. Emits warnings.
export function handleBankruptcy(state: GameState): GameState;

// Tick hook order 30. Runs: wages (deduct, may go negative) → income → gate →
// contracts → bankruptcy. Emits money:changed per net movement.
export function applyEconomy(state: GameState): GameState;
```
Behaviour:
- **Wages:** deduct `weeklyWages` via `club.spendMoney(w, 'wages')`, allowed to push
  `money` negative (bankruptcy handles the rest). Emits `money:changed {delta:-w}`.
- **Income & gate:** credit `weeklyIncome + gateReceipts` with reasons `'sponsor+grant'`
  and `'gate'`; each emits its own `money:changed`.
- **Facility level lookups:** `sponsorBoardLevel` / `grandstandLevel` = the `level`
  of the built facility with that `defId` (`sponsorBoard` / `grandstand`), else 0.
  DefIds must match the BAK-168 catalog exactly.
- **Contracts (`tickContracts`):** decrement `contractWeeks` by 1 for all squad.
  On reaching 0: player demands renewal at `newWage = round(wage × (1 + drift))`
  where `drift = (overallRating(p) − 60) / 200` (clamped to [−0.15, +0.25]).
  If affordable at the moment of renewal (`money >= newWage × 4`), auto-renew:
  set `wage = newWage`, `contractWeeks = 52`. Else the player departs to
  `freeAgents` (removed from squad), `ui:notify info`. Deterministic — no RNG.
- **Bankruptcy:**
  - `money < BANKRUPTCY_WARN (0)` → emit `bankruptcy:warning {balance}` and
    `ui:notify {kind:'danger'}` (once per tick).
  - `money < FORCED_SALE_FLOOR (−50_000)` → repeatedly remove the current
    highest-`wage` squad player (no payout), emit `ui:notify danger`, apply
    squad-wide `morale −= FORCED_SALE_MORALE_HIT` (clamped ≥1), and recompute until
    `money >= FORCED_SALE_FLOOR` or squad reaches `SQUAD_MIN` (stop selling below the
    minimum to keep a fieldable team). Forced-sold players go to `freeAgents`.
  - Fieldable means fit (QA finding 19): a fit player can go only while more than
    `SQUAD_MIN` are fit, an injured one while the squad is over `SQUAD_MIN`; of those
    who can go, the highest-paid is sold. Before, a squad sold down to 13 with two
    injured had 11 fit and forfeited its next match.
  - N12.5: the warning comes after the sales and names them
    (`bankruptcy:warning {balance, forcedSales}`); the toasts keep their order. A
    multi-week advance stops on the crossing into the red, on a forced sale and when
    the balance first passes the floor, not on every week's warning
    (`core/advanceRules.ts`, `debtStop`).
  - N14.3: **one sale a week**, not "until money ≥ floor" (the loop never got there: a
    sale pays nothing, so it always sold down to `SQUAD_MIN` in one tick). A club under
    the floor sinks in steps and the advance stops each week with the name.
  - N14.3: a renewal the club can't afford goes on a **board loan** (`boardLoan.owed`,
    at most `BOARD.LOAN_CAP` $50k): at contract end the four weeks' wage, or an early
    renewal's fee, comes in on the board's line (`board loan`). It is repaid in full at
    the rollover, after the prize and before the board judges the season (so a club is
    not "solvent" on borrowed money), on the same line (`board loan
    repaid`). The Contracts screen says "on a board loan"; the Finance P&L notes it
    under the board's row.
  - N14.3: before a round the club would forfeit (fewer than `SQUAD_MIN` fit), the
    Academy **calls up** juniors to make the side (`systems/youth.ts`,
    `callUpJuniors`). They are generated at the Academy's level (no Academy: the lowest
    band) and signed at the junior wage to the season's end; there is no fee. A
    forfeit is left only for a full squad (`SQUAD_CAP`).
- Order within `applyEconomy` is fixed: wages → income → gate → contracts →
  bankruptcy, so a home gate can rescue the club before forced sales trigger.

## Edge cases & risks
- Empty squad → wages 0; income/gate still apply.
- Home detection: `gateReceipts` returns 0 unless the current fixture's `homeId`
  is the player club — away and bye/finals-skip weeks yield no gate.
- Morale clamp floor is 1 (matches §4 range); repeated forced sales won't underflow.
- Forced-sale loop must terminate: it stops at `SQUAD_MIN` even if still under floor
  (club stays in debt but playable) — tested to avoid infinite loops.
- Renewal affordability is checked at renewal time, sequentially, so earlier renewals
  can consume funds and push later players to depart — order is squad array order
  (deterministic).

## Acceptance criteria
- [ ] `applyEconomy` deducts total wages and credits sponsor + rep-grant income each week.
- [ ] Sponsor income = `3000 × level` only when a Sponsor Board is built; 0 otherwise.
- [ ] Gate receipts apply only on home weeks and scale with Grandstand level and
      reputation per the formula (exact-value test).
- [ ] Contracts decrement weekly; expired contracts auto-renew if affordable else the
      player moves to `freeAgents`.
- [ ] `money < 0` emits `bankruptcy:warning` + a danger notify.
- [ ] `money < −50_000` forces sale of the highest-paid player (no payout) with a
      squad-wide morale −10, repeating until above the floor or at `SQUAD_MIN`.
- [ ] Every income/expense path and the bankruptcy cascade have deterministic unit tests.

## Out of scope
- Facility catalog data / defIds (BAK-168) and training effects (BAK-180).
- Free-agent pool refresh and signing (BAK-179) — this ticket only *pushes*
  departed/sold players into `freeAgents`.
- UI screen for finances (HUD money display is WU-5 / BAK-163).

## 2026-10 retune (N6: money that matters)

Measured with `npm run soak` and logged in `docs/status/2026-10-economy.md`. The
spec above is the original loop; this is what changed and why. Every number is
**Assumed (needs Leon)**.

**Why.** With nothing costing more as the club grew, an idle club went from $200k to
$1–3M in five seasons: gates rose with reputation, wages were linear in rating and
fell as the squad aged, and every other line was upside.

**The club's books (#161, #172).** `GameState.finance` keeps one entry a season with
twelve lines (`FINANCE_LINES` in `core/state.ts`): wages, upkeep, sponsor, grant,
gate, prize, boardGrant, events, transfers, contracts, facilities, other. Every
`money:changed` reason maps to a line (`economy.classifyReason`); the Finance screen
shows this season against last, biggest lines first; the soak checks the books against
its own tally at every rollover. Save v10.

**Upkeep (#164).** Each facility has an `upkeep` a week at level 1 (1% of its build
cost; a Grandstand $1,200), ×1.5 at L2 and ×2 at L3, paid after wages with reason
`upkeep`.

**Running costs (N12.3, #264).** `ECON.OVERHEAD_WEEKLY` $1,500 a week (staff, travel,
insurance) × the difficulty's `overhead` (Easy ×0.8 $1,200, Normal $1,500, Hard ×1.2
$1,800), the same whatever the club has built or signed, paid every week after upkeep
(wages → upkeep → running costs → sponsor → grant → gate) with reason `overhead`: about
$40k a season on Normal, the one cost an idle club cannot shed as its squad ages into
cheap juniors. The books' thirteenth line, `overhead` ("Running costs"; save v17, which
books 0 for every season an older save kept). The Finance screen counts it in the weekly
net, the burn and the runway, and the ledger gives it a column.
The ticket goes back to $20 with it (#176 had cut it to $18). On the matrix soak the
running costs at $18 left the managed clubs deeper in the red than before (Normal 73% and
Hard 83% of runs at season 5), while at $20 they end better off than with neither change
and an idle club ends about where it was. Neither price keeps an idle Normal club sinking:
a flat cost takes as much from the managed club as from the idle one, and on the live sim
the idle club out-earns the managed one by about $140k a season from season 2
(`docs/status/2026-10-season.md`).

**Wages (#167).** `wageForOverall` in `data/player.ts`: overall × 15 + 100 plus 2 ×
(points above 55)². 55 $925, 70 $1,600, 85 $3,175. Renewal asks, early and at
contract end, are the market wage for the player's overall today × morale ×
`clubWageFactor` (+25% at reputation 100, +4% for every season after the first). The
rival salary cap is a 20-man squad of 62.5s on the curve ($23,000).

**Gates (#169).** attendance = min(seats, demand); receipts = attendance × $20 (N12.3;
$18 from #176). Seats: the hill 2,000, a Grandstand 3,500 / 5,000 / 6,500. Demand = (300 +
reputation × 30) × form (last five results, ±25%) × occasion (a top-eight opponent
×1.2, a home final ×1.5). `homeGate` is the one function the tick and the Finance
projection share.

**The small lines (#176).** Ticket $18 (was $20); reputation grant $40 a point a week
(was $50); board grant $10k an objective met (was $15k); the cards' cash offers
trimmed by about 40% (billboard $5k, merch $7k or $900 a week, clinics $3k, pizza
$2k a win, food truck $250 a week, the fine $600); prize money unchanged (a finals
side has earned it); the forced-sale floor −$100k (was −$50k), so the red is a
warning before a fire sale. Hard: three-quarters of the starting money and wages
×1.15 (was half and ×1.3; with the roof on gates that went bust in season 1).

**Where it lands (20 seeds, five seasons, the soak's idle and managed managers).**
Idle Normal is in the red for about four runs in ten by seasons 2–3 and the board
has sacked half by season 3; the survivors recover as the squad ages into cheaper
players. Managed Normal grows from about $190k to $370k and ends around $330k with a
squad of 80s costing $1.2M a season against $1.1M of gates. Idle Hard is bust in
season 1 and sacked by season 2; managed Hard is a fight for the board's patience,
in the red half the time. Easy stays comfortable.

**The rival-unsettled card's fee (N12, #247).** The "Unsettled at a rival" card
quotes `freeagency.signingFee` for the rival's star (overall² × $10 × the age factor,
less the Scout Office's 10% a level), the fee the Recruit screen charges, instead of
four weeks' wages: about $13k for an 85-overall who costs $64k from the pool.

**The pool follows the league (N12, #247).** `freeagency.poolTarget` = `LEAGUE.MEAN`
− `LEAGUE.POOL_BELOW` (3), so 52 at a new club (a level club's first-grader), plus
`POOL_POINTS_PER_BIAS` (25) points per unit of scouting bias: a Scout Office +3 a
level, an Academy +2.5 a level, reputation +1 for every 10 points above the baseline
of 30 (+7 at 100, a little off below it). Each agent's own target is that, rounded,
plus two rolls of ±`FREE_AGENT_SPREAD` (8); `generatePlayerAround` does the rest. The
opening pool uses it too. Academy prospects and departed players are kept as they
were. Measured through the real refresh (300 seeds), mean overall and the 65+ share:
a new game's pool 60 and 15% → 52 and 4%; a refresh at reputation 30, 50 and 8% → 52
and 4% (70+ 2.5% → 0.2%); at reputation 100, 61 and 36% → 59 and 24% (70+ 30% → 8%);
with a Scout Office and an Academy at L3 at reputation 100, 79 → 76. The mean of a
refresh barely moves; its shape does: the old rookie / average / star rolls made a
bump of 42s, a bump of 60s and a tail of stars, now it is one bell around the target.
Rivals sign from the same pool: over a first season (the same probe) they take 3.2
players of 65+, was 6.4. In the soak (Easy and Normal, 20 seeds × 5 seasons, against
`main` at 3b9ff6d) the rival mean at the end of the regular season is 0.1–0.5 lower
(season 5: 56.9 → 56.4; in seasons 4 and 5 the strongest rival is about 64, was
65–68). The managed manager finds fewer stars to buy, so signs cheaper and banks more:
managed Normal ends season 5 at $385k (was $39k), managed Easy at $561k (was $26k).

**Easy wages (N12, #247).** `DIFFICULTY.easy.wages` ×0.85 → ×0.9: about $20k a season
more in wages. Idle Easy's season net, averaged over five seasons, +$121k → +$115k; the
rest of the way to N12's "Easy idle under $100k a season" is left to item 7.

**The Sponsor Board (N12, #247).** `ECON.SPONSOR_BASE` $150 + `SPONSOR_PER_REP` $10 ×
reputation a week, at most `SPONSOR_CAP` $1,000, × the level step every facility uses
(1 / 1.6 / 2.2); `economy.sponsorReturn`. It replaces a flat `SPONSOR_PER_LEVEL`
$3,000 a level, which paid the $10,000 build back in 3.4 weeks. Now, net of its $100
upkeep, L1 pays back in 29 weeks at reputation 30 ($450 a week), 15 at 60 ($750) and
11 at 100 ($1,000, capped from 85); the whole L3 board ($60k) in 76, 41 and 30 weeks.
The Build menu, the facility popup and the Guide's Money page quote it at the club's
reputation. Nothing in the soak builds a Sponsor Board, so the soak does not see it.

**The cascade (N14.3).** One forced sale a week, a board loan for a renewal in debt (up to
$50,000 a season, repaid at the rollover), and an Academy call-up before a forfeit. In the
matrix soak (20 seeds × 5 seasons) forfeits went from up to 16 a season (idle Hard season
3) to none in any mode. Most had not been debt: expiries and retirements left fewer than
13 fit. The numbers are in `docs/status/2026-10-living.md` (N14.3).
