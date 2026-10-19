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

**Wages (#167).** `wageForOverall` in `data/player.ts`: overall × 15 + 100 plus 2 ×
(points above 55)². 55 $925, 70 $1,600, 85 $3,175. Renewal asks, early and at
contract end, are the market wage for the player's overall today × morale ×
`clubWageFactor` (+25% at reputation 100, +4% for every season after the first). The
rival salary cap is a 20-man squad of 62.5s on the curve ($23,000).

**Gates (#169).** attendance = min(seats, demand); receipts = attendance × $18.
Seats: the hill 2,000, a Grandstand 3,500 / 5,000 / 6,500. Demand = (300 +
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
