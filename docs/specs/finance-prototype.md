# Finance prototype contract — FIN v1

For [#556](https://github.com/ch-leon/nrl-sim/issues/556), part of
[#555](https://github.com/ch-leon/nrl-sim/issues/555). Product intent:
[finance](https://app.notion.com/p/4140870d4c448148b6b5c6a940d1cae6) and
[career competitions](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0).

Leon accepted the model for **initial testing on 11 November 2026**. These are
starting rules and adjustable coefficients, not measured balance or launch
sign-off. Source audited: `8b5e34a7fed4d39b1ab57cf03825d64804755524`
(merged competition foundation). Its save version is 27. This contract does
not reserve the next save version.

This slice publishes executable quotes in
[`financeRules.ts`](../../src/data/financeRules.ts), an opening-inventory audit
and this delivery contract. It does **not** enable the finance loop, create
wallets/contracts, settle a result or replace player-facing screens. Those
transactions remain #557–#561; end-to-end balance is #562.

## 1. Decisions and units

| Decision | Initial testing rule |
| --- | --- |
| D1 — Cash/cap and entry | Cash is spendable money; annual player salaries consume registration capacity and never cash. Fresh careers only; no legacy conversion or parallel old-finance career support. |
| D2 — Contracts | One-, two- or three-season fixed-salary deals; no renewal fee; new agreements start after existing promises end. Sign/release prices below are cash, not salary deductions. |
| D3 — Income | Ordinary income belongs to an actually played fixture. Losses receive a guaranteed base, homes add income, performance adds a small bonus. |
| D4 — Investment | Recruitment, facilities, staff and plays cost cash upfront. Retire weekly cash deductions, finance-driven forced sales/bankruptcy and new board borrowing. |
| D5 — Cap growth | Ordinary club cash buys three permanent +5% levels; earned bonuses add against the same tier base. No payment currency/provider is introduced. |

Use integer game-currency units, safe integer balances and explicit rounding.
Cash cannot be spent below zero. Annual salary is a price per **season**, not
per fixture or elapsed interval. Additional events never create salary bills or
extend a contract past its published expiry season. Retuning the prototype must
explicitly version its rules/save boundary; it cannot silently alter saved
promises or promised event rewards.

### Initial profile

| Tier | Annual base cap | Match base M | Bare home extra |
| --- | ---: | ---: | ---: |
| Local | 350,000 | 8,000 | 4,000 |
| Championship | 450,000 | 12,000 | 6,000 |
| Premier | 600,000 | 18,000 | 9,000 |

Player starting cash: Easy 90,000; Normal 60,000; Hard 45,000. These retain the
existing starting-cash multipliers against a new Normal base. Caps, salaries,
fees, payouts, income and cap-upgrade prices do not acquire hidden difficulty
multipliers. Existing football difficulty rules remain owned by their current
systems; this work does not retune the match engine.

## 2. Salary and contract quotes

The initial annual ability curve is 20 times the single existing
`wageForOverall(rating)` curve. That is a fixed unit choice, **not** a conversion
of an existing save or a count of matches. Prices round to the nearest 100.
For illustration, an age-25 player with ordinary potential demands 14,000 at
rating 40, 32,000 at 70 and 78,000 at 90.

Implementation coefficients chosen for this testing profile:

- Age factor: 1.02 through 21, 1.00 through 29, 0.98 through 33, then 0.95.
- Potential headroom is mean ceiling minus mean ability over the position's
  four shown stats. Premium is `clamp((headroom - 10) × 0.002, 0, 0.05)`.
- Welfare's old 10% salary reduction becomes a maximum 3% reduction on a **new
  agreement**. Retain its football/morale effects. No old contract is repriced.
- Retire reputation/season salary inflation and the old morale pricing swing.
  A changed demand should have an ability/age/potential/staff explanation.

Active signed salaries are immutable during their term. Generation creates
actual offers before a fresh world is installed: every starting club must fit
its cap, have legal unique people and use the agreed position/ceiling model.
`openingSalaryOffers` permits at most 5% off each initial market quote, rounding
to whole units, only at this fresh construction boundary. It returns `null` if
that cannot fit. The constructor must reject/rebuild an uninstalled candidate
or correct its authored inputs; it cannot raise the cap or reprice a live team.
Do not call this opening function on promotion, transfer, rollover or import.

### Transactions and timing

- A signing pays one annual market demand upfront, or 25% for a genuine Academy
  prospect. Existing Scout Office discounts apply to this fee only, 10% per
  level up to 30%. The Academy discount is consumed at first signing; it cannot
  reappear whenever the person returns to a shortlist.
- A proposed sale offer is 60% of current undiscounted annual market demand.
  That stays below even the maximum ordinary scouting discount's purchase
  price, preventing immediate ordinary sign/sell profit. Academy development
  returns remain possible from finite annual intake, not refresh generation.
- #572 must find a real buyer with cash, roster and cap room. Debit the buyer,
  credit the seller and move the same player/contract/history atomically. The
  quote alone is not a sale, and no-buyer/cancelled/stale offers change nothing.
- A release costs `min(annual salary, 0.25 × unexpired salary commitment)`.
  Count the unplayed fraction of the current saved calendar plus full remaining
  contract seasons. No signing-fee refund. Insufficient cash or a squad-minimum
  breach refuses the action without changing anything.
- A season deal expires at an explicit season end, after every actual final or
  series. An in-season one-season deal covers the rest of that season; show
  that expiry before signing. Two/three-season deals add one/two full seasons.
- A renewal is queued during the final contract season, costs no cash and starts
  at expiry. Display next-season commitments. Review expiring deals before the
  next season starts; do not automatically replace cheap deals mid-season or
  finance an unaffordable ask with a loan. Unrenewed players become unsigned.

## 3. Cash settlement

Freeze tier M and eligibility in the event/fixture rules. In a cross-tier home
tie use the host tier; in a neutral tie use the lower entrant tier. Both clubs
use that published M. Snapshot applicable facility levels at kickoff, before
any result is accepted.

| Actual fixture | Base per club | Venue extra | Performance | Facility extras |
| --- | --- | --- | --- | --- |
| League, cup, final or series | 1M | Host 0.5M; away zero | Winner 0.1M; draw 0.05M each | As below |
| Neutral played tie | 1M | 0.25M each, an equal share of the 0.5M pool | Same result bonus | Sponsor only |
| Trial | 0.25M | Zero | Zero | Zero |
| Bye, cancellation, unplayed walkover, idle slot | Zero | Zero | Zero | Zero |

A golden-point game counts as one played fixture. A seeded decider preserves
the actual drawn score; use its saved sporting winner for a knockout win bonus.
Unplayed progression does not create ordinary cash, XP or a win payment. A
separate published title award may recognise a valid completed event; #576 owns
that policy, not a fictitious final gate. Fewer than two entrants is no event.

Ordinary income, sporting prizes, reputation, honours and next-season cap
entitlements have distinct stable receipt identities. Extend the common result/
reward boundary, never pay from a report or view. Accepting a sporting result
and committing its receipt should be one state update. Settlement must also be
independently idempotent: an accepted saved result missing its settlement can
be reconciled without replaying stats/XP. Receipt and cash effects commit
together; duplicates, re-open, reload, skip and repeated worker deliveries do
not credit twice. Existing unpaid v27 prototypes do not gain retroactive claims.

## 4. Investments and recurring effects

Retain the twelve-facility catalogue, level-three ceiling and existing football/
progression effects. Keep current non-grandstand construction/upgrade prices for
the first comparison. New upfront grandstand prices are 30,000/60,000/90,000
to enter levels 1/2/3, replacing 120,000/240,000/360,000.

| Income facility | L1 | L2 | L3 | Eligibility |
| --- | ---: | ---: | ---: | --- |
| Sponsor Board | +0.03M | +0.09M | +0.18M | Each actual eligible non-trial fixture |
| Grandstand | +0.15M | +0.45M | +0.90M | Host's actual non-trial fixture, on top of bare 0.5M |

No income is earned merely by waiting. Neutral gate shares do not use either
club's stand. Keep capacity/crowd presentation consistent with the new cash
quote; the old attendance-times-ticket formula is not an additional payment.

Staff appointment prices: Assistant 16,000; Analyst 12,000; Welfare 14,000;
Direct attack 16,000; Width 19,000; Kicking 18,000; Razzle 25,000. Existing
availability, one-role restrictions and play unlocks remain. Releasing a staff
member pays no refund; a replacement costs its appointment fee. There is no
weekly staff wage or staff charge against player cap.

Retain move/demolition mechanics: moving costs 10% of the **new profile's** L1
build price, demolition refunds 30% of actual recorded construction/upgrade
spend. Reusing old catalogue prices could otherwise refund more than was paid.
Undo must atomically restore cash, ownership and all affected commitments once;
the existing offer ends at a match/advance boundary. Cap-upgrade purchases have
a preview/confirmation, not an unrestricted refundable capacity loan.

## 5. Purchased and earned capacity

`cap = current division base × (1 + 0.05 × purchased level + earned allowance)`.
No compounding. Three bought levels mean +15%. Current first-Shield entitlement
adds +5%; reserve a second +5% for a separately designed later achievement.
Thus initially available maximum is +20%, future combined ceiling +25%.

After one completed season, buy at most one level per season. Prices for the
next levels are 5M, 10M and 20M of the division at purchase. Local prices are
40,000/80,000/160,000; Championship 60,000/120,000/240,000; Premier
90,000/180,000/360,000. Purchased capacity applies immediately and persists
through future seasons, promotion and relegation. It never edits a signed salary.

The first Sponsor Shield title activates its permanent +5% from the next season,
once per club career. Repeats grant only their published cash/honours. Use the
same entitlement for AI; no second cap system in competition code. For example,
one bought level plus Shield means a Local cap of 385,000, not 385,875.

AI clubs use the same price, salary/cap and entitlement rules, with one minimal
cash/transfer wallet each. Start that wallet at 60,000; credit actual eligible
ordinary receipts/awards and debit signings, releases and cap purchases. Unspent
funds carry. This is the bounded cash operation needed for real transfers, not a
second facilities/business simulation. Initially AI uses no hidden facility
bonuses. It may buy one level after a completed season when cap usage is at
least 85% and cash covers its price plus a 2M reserve. Validate buyer funds and
future commitments on every deal; cash-rich AI cannot exceed its published cap.

### Relegation and minimum squads

Relegation is not permission to break a signed contract. Preserve pre-movement
deals and give their exact remaining excess a contract-bound temporary allowance.
That allowance shrinks when protected contracts end or depart; it cannot be
spent on stronger new deals. A renewal is a new promise and must fit the base
plus normal purchased/earned allowances. Display protected excess separately.

Maintain the current 13-player registration minimum and pack squad cap (currently
30), not a newly assumed limit. If unavoidable retirement/expiry leaves fewer
than 13 while protected contracts remain, permit only enough low-grade one-season
Academy/emergency deals to reach 13, priced normally and disclosed separately.
Emergency ceiling: no higher than the current pack's ordinary starting depth
target. No exceptional potential, no free top-class replacement, no over-cap
voluntary sale/release that deliberately creates an emergency slot. Injury/bans
still use normal match eligibility/forfeit rules. On departure/expiry of all
protected deals the temporary exception ends; never convert it to a permanent
earned cap prize. #574 owns applying movement from the frozen completed season.

## 6. Fresh saves, state ownership and rollover

The new finance career starts fresh. Bump the actual format when #557 changes
state, reject earlier formats explicitly and reuse existing original export/
restart handling. Do not construct an adapter for old cash, wages, contracts,
facilities, debt or over-cap saves. Do not overwrite a rejected source or an
existing destination when an import is invalid. Preserve normal/developer
namespace isolation and interval-start/live-match recovery.

`GameState.money` remains the player's canonical cash. Rival wallets live with
the canonical rival club records, not copies of rosters. Per-player contracts
own signed salary, start/end season and an optional queued renewal; the market
quote is not another signed salary. Account metadata owns purchased level,
last-purchase season and earned entitlements. Persist a versioned profile and
receipt identities alongside the existing competition/fixture identities. Never
let screens own commitments or turn `money:changed` notifications into cash.

Use the existing tick/season registry; do not add a second season manager.
Current hooks are aging 5, youth 6, fixtures 10, tenure 12, review 15, board 20,
derby 21 and events 25. #574 must reconcile those orders with frozen sporting
results, due awards and movement before enabling multi-season regional play.
Its sequence is settle sporting cash/awards → capture review → compute movement
→ activate next-season allowances → age/retire/intake once → resolve contract
transitions → board objectives → next season's fixtures. No contract can expire
before a pending Champions Series ends. Salaries never tick down as cash costs.

Hold financial mutations during an unresolved interval/advance transaction or
revalidate against its canonical state boundary. Atomic sign/release/sale/upgrade
operations validate the whole cash/cap/roster/season precondition before writing
anything. Cancellation and repeat/stale intents leave all wallets and ownership
unchanged. Receipt-backed payouts can recover independently from sporting stats.

## 7. Current-source impact map

| Current owner/effect | Disposition and delivery |
| --- | --- |
| [state factory](../../src/core/state.ts), 200k Normal cash | #557 replaces with 60k and initializes the new profile/accounts/contracts. |
| [player generation](../../src/data/player.ts), weekly `wage`, interval `contractWeeks` | #557/#558 add explicit annual signed commitments and season expiry. Do not reinterpret an old persisted object. |
| [economy](../../src/systems/economy.ts), wages/upkeep/overhead at tick 30 | Retire deductions and staff cash drain; retain interval ownership. No advance can lower cash just for time passing. |
| Economy weekly sponsor, reputation grants, pre-match gate | #559 replaces with receipt-backed played-fixture base/facility/venue income. No old source remains as a second credit. |
| Economy auto-renewal, board-loan fallback, forced sales | Retire; #558 uses queued fee-free renewals and explicit choices. No financial auto-departure mid-match. |
| [contracts](../../src/systems/contracts.ts), early fee and destructive sell | #558 removes renewal fee; #572 replaces sell with funded real-club movement. Disable destructive sale until that path exists. |
| [free agency](../../src/systems/freeagency.ts), fee-only sign, cash-negative release | #558 requires both cash/cap and atomic release affordability. #572 owns persistent unsigned population; refresh is a shortlist, not replacement generation. |
| [staff](../../src/systems/staff.ts), free hire/weekly wage, 10% ask cut | Upfront prices; 3% new-deal ask benefit; no wage drain. Keep football unlocks/morale effects. |
| [facilities](../../src/data/facility.ts), [placement](../../src/world/placement.ts) | #559 retains levels/effects, replaces specified prices/returns, retires upkeep and records actual spend for refunds. |
| [playbook](../../src/systems/playbook.ts) | Retain finite upfront play purchases and football unlock rules; no passive income or cap effect. |
| [undo](../../src/systems/undo.ts), build/sign/demolish refunds | Preserve bounded undo; add canonical contract/cash restoration. Never refund catalogue prices different from paid prices. |
| [events](../../src/systems/events.ts), money/modifiers and `playerWage` | Audit each card before enabling it. Retire automatic weekly money modifiers and active salary edits. Keep affordable optional one-off choices and nonfinancial football effects; defaults cannot create debt. |
| [board](../../src/systems/board.ts), cash solvency/burn, grants, prize/loan repayment | Retire finance-driven failure/borrowing and duplicate grants/prizes. Sporting/development goals remain; #576 owns published cash honours, #574 owns new-season objectives. Keep #483 parked. |
| [competition calendar](../../src/systems/competitionCalendar.ts), [matchday](../../src/systems/matchday.ts) | Reuse guarded result ownership and holds; #559/#576 settle distinct saved ordinary/prize receipts. Current structural suppressions are not a delivered finance system. |
| [finance](../../src/ui/screens/finance.ts), [contracts](../../src/ui/screens/contracts.ts), [recruit](../../src/ui/screens/recruit.ts) | #561 shows cash, annual cap, next-season commitments, actual upfront prices and post-match receipt. Remove weekly/reserve-eight-wages/runway advice. |
| [title](../../src/ui/title.ts), [guide](../../src/ui/guide/pages.ts), [expansion copy](../../src/ui/expansionCopy.ts), [HUD](../../src/ui/hud.ts) | #561 updates difficulty/onboarding and financial warnings; integrate #489 and preserve #551 portrait checks. |
| [save](../../src/core/save.ts), [validation](../../src/core/saveValidation.ts) | #557 rejects pre-finance versions with retained originals, validates all new nested fields and preserves import destinations. |
| [soak](../../src/qa/soak.ts), [persona policies](../../src/qa/personas/policy.ts) | #562 replaces weekly-wage reserves and bankruptcy success criteria with explicit finance targets; retain seed/difficulty/strategy coverage. |

## 8. Evidence, targets and release gates

Reproduce the static audit with:

```sh
npx vite-node scripts/finance-inventory.ts -- --seeds 20 --out docs/status/2026-11-finance-inventory.json
npx vitest run tests/data/financeRules.test.ts
```

The [inventory](../status/2026-11-finance-inventory.json) quotes 120 opening
worlds and 2,880 club bills (20 seeds × two packs × three difficulties). It runs
**no matches**. One AU Premier roster, Reapers at seed 17, has a 607,200 market
bill against 600,000, repeated across three difficulties. The bounded opening
offer fits it; #557 must actually integrate the construction guard. No player
opening bill is over cap in this sample. These are not 2,880 independent seeds,
and neither opening quotes nor passing unit checks establish multi-season balance.

Initial acceptance targets for the existing #562 harness:

- 100% legal initial club rosters and unique player ownership over at least
  100 seeds per pack/difficulty; deterministic generation/reload parity.
- A 14-round bare Local all-loss season earns 140,000, excluding trials/prizes,
  and can make at least two useful recruitment/development purchases without
  entering an optional competition. No passive cash drain, mandatory cup win or
  finance-driven forced player sale.
- Normal starting player commitments generally use 80–95% of base cap; report
  Easy/Hard separately. Do not silently change targets to hide failures.
- Run five seasons for losing/average/winning and recruitment/development/cap
  strategies in both packs/difficulties. Track money, legal squads, cap usage,
  transfer destinations, contracts, earned/purchased levels and upgrade timing.
- No strategy's mandatory first purchase should dominate the others; report
  first-purchase choice and season-three strength/progression/cash. Training
  retains #547's agreed progression targets; do not retune the match sim.
- No duplicate cash/award, increased cap beyond the ceiling, negative wallet,
  broken signed promise, lost player or unpaid/duplicated played fixture in
  save/import/resume/skip/recovery/rollover cases.
- Financial preview and actual result agree at cash/cap limits. Complete phone
  tests at 390×844, 667×375 and 844×390, plus required CI/WebKit/QA and a checker
  using a different tool. Leon's merge approval remains required.

No five-season result, live finance playtest, normal regional entry or successful
finance migration is claimed here. #557 accounting → #558/#559/#560 operations
→ #561 presentation → #562 acceptance remains the implementation sequence.
Competition transfers #572, promotion #574 and rewards #576/#577 reuse those
owners instead of adding parallel cash/cap/season systems.
