# Persistent players and funded transfers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution and orchestration are already authorised; do not ask Leon to approve this plan again.

**Goal:** Complete [#572](https://github.com/ch-leon/nrl-sim/issues/572): real funded sales, durable unsigned players, truthful club histories and retirement records, with one owner per live player across refresh, transactions, rollover and reload.

**Architecture:** Keep the existing player squad, rival squads and `freeAgents` as the only live player owners. Add ID-only market discovery state, player club spells and compact retired records, and route ownership changes through pure transition helpers before one store commit. Reuse the integrated annual-finance contracts, wallets, cap checks and ledger boundary; do not introduce a second money or season system.

**Tech Stack:** TypeScript, existing synchronous GameState/event bus, Vitest, Vite, existing WebKit/QA harnesses. No new runtime dependency.

---

## Starting boundary and sequencing

The source audit for this plan is `origin/main` at `f4650217`. At that revision:

- Annual contracts, rival cash and cap accounts exist; `SAVE_VERSION` is 28.
- `sellPlayer` always refuses. `saleOfferQuote` already supplies the approved 60% offer formula.
- `refreshFreeAgents` destroys ordinary unsigned players and generates 12 replacements every four weeks.
- Youth rollover removes old unsigned juniors; retirement removes players without a durable archive.
- `events.signRivalPlayer` transfers a rival player on a new contract and needs reconciliation with the funded-transfer boundary.
- Structural division careers remain developer-only and stop at next-season setup. They must remain gated after this work.

**Stack on the exact #695 head first.** Its income changes overlap `state.ts`, save/version handling, economy, fixtures and rival wallets. The parent has created the implementation worktree at `.claude/worktrees/player-continuity` on #695 head `1dd…`, whose actual format is v29; six baseline suites passed 121 tests. Verify the full head with `git rev-parse HEAD` there before source edits. This allows draft implementation while independent different-tool review runs; it does not claim #695 is approved or merged. Choose the next actual save version on this integrated base; **this plan does not reserve v29**. If the #695 head changes during review, rebase and resolve its format before publishing. Preserve its receipts and never credit a sale through the match-income path.

**Immediate builder assignment:** Tasks 1–3 form the first bounded implementation batch: installed ownership/history types, compact archive, additive migration, durable unsigned pool and visible shortlist IDs. Start there in `player-continuity`; do not concurrently edit sale/lifecycle/UI files. The later tasks are sequential continuation of the same #572 PR, not permission to expand into #574. A passed first batch is an intermediate foundation, not completion of #572.

References: approved [career opportunities v0.2](../specs/career-opportunities.md), [finance prototype contract](../specs/finance-prototype.md), current [career technical contract](../specs/career-competitions.md), and the live #572 acceptance criteria. Older forced promotion language is superseded. This PR does not implement league choice, unlocks, assignments, event prizes or structural next-season activation.

Issue completion requires: a confirmed sale has one actual owner at the funded buyer; that player can face the former club; failed/cancelled/stale sales leave state unchanged; refresh, ageing, retirement and reload preserve identity and history. Include real UI and save integration, not only a sale helper.

## Concrete implementation decisions

### Ownership, history and market data

Create `src/data/playerCareer.ts` for serialisable types and validation, and `src/systems/playerCareer.ts` for pure ownership/history operations. Do not add a parallel map of full live Players.

```ts
export interface CareerDate { season: number; week: number }
export type ClubArrival = 'opening' | 'observed' | 'signing' | 'transfer' | 'emergency';
export type ClubDeparture = 'transfer' | 'release' | 'expiry' | 'retirement';
export interface ClubSpell {
  clubId: string;
  start: CareerDate;
  arrival: ClubArrival;
  // An observed start is the earliest known date, not an invented signing.
  end?: CareerDate;
  departure?: ClubDeparture;
  transferFee?: number; // Paid on arrival only; never itself a money receipt.
}
export interface PlayerCareerHistory {
  spells: ClubSpell[];
  // Once true, an old Academy flag cannot restore a first-signing discount.
  academyDiscountUsed: boolean;
}
export interface RetiredPlayerRecord {
  id: string;
  name: string;
  age: number;
  position: Player['position'];
  retiredAt: CareerDate;
  career: Player['career'];
  history: PlayerCareerHistory;
  stats: Player['stats'];
  ceilings: Player['ceilings'];
  traits: Player['traits'];
  xp?: number;
  level?: number;
  unspentPoints?: number;
}
export interface PlayerPopulation {
  schemaVersion: 1;
  shortlistIds: string[];
  retired: RetiredPlayerRecord[];
  nextPlayerOrdinal: number;
  lastMarketIntakeSeason: number;
  lastAcademyIntakeSeason: number;
}
```

Add `Player.clubHistory?: PlayerCareerHistory` for compatibility with low-level generators. Require it on every installed canonical live Player in the new save format. Add required `GameState.playerPopulation: PlayerPopulation`. An unsigned player's final spell must be closed; an owned player's final spell is open and names its actual owner. A fresh unsigned person has no club spell. Do not give them a fictitious former club or use `joinedSeason` as proof of an unknown historical signing.

Migration adds an `observed` open spell at the current saved date for each currently owned person. Retain existing `joinedSeason` for its present tenure behavior; no invented transfer history. Set `academyDiscountUsed` true for people already owned, people marked `departed`, and ordinary unsigned players; a genuinely unsigned junior with no departure keeps false. Preserve all existing IDs, agreements, cash, receipts, rival identities and original recovery bytes. A player's known transfer into the player club sets `joinedSeason` to the new season so a former spell cannot grant uninterrupted-tenure rewards. Stable club IDs make history survive renames.

`freeAgents` is the durable unsigned population. `shortlistIds` is the currently discovered market list, not another owner. Existing UI `recruitShortlist` remains the four-card advice layer, computed from the discovered list rather than the entire population. “Show all” means all currently scouted players. All known currently unsigned Academy prospects and the player's own released/expired people remain accessible alongside the rotating list; derive that pinned set from history/Academy provenance, not a second copied array.

### Bounded population policy

These are implementation bounds for #572, not a claim of balanced multi-season economics:

1. Preserve the initial 12 unsigned players created by the existing fresh-career constructor.
2. Every four weeks choose up to 12 ordinary unsigned IDs without replacement, using a deterministic market-only seed derived from saved season/week and a stable ID-sorted candidate list. Refresh creates **zero** players and changes no ability, age, potential, club ownership or match RNG. Repeated refresh at the same date returns the same IDs.
3. At annual intake, after expiry and retirement, add only enough ordinary newcomers to bring the non-Academy unsigned count up to 12, never more than 12 that year. Mark `lastMarketIntakeSeason` in the same commit. No generation just because a player opens/reopens Recruit or buys a Scout Office.
4. Keep the existing Academy intake of 3/4/5 people per year by Academy level; retain previous unsigned intakes and mark `lastAcademyIntakeSeason` atomically. Older unsigned Academy people remain real people; their first-signing discount cannot be restored after any prior club spell.
5. Rival replacement first tries actual eligible unsigned people through funded signings. Generate only the remaining unavoidable retirement/expiry vacancies below the 13-player minimum, using the existing finance emergency terms. Do not top every rival back to 20 with manufactured recruits.
6. Emergency intake is limited to actual registration vacancies after unavoidable expiry/retirement, and only enough to reach 13. Injuries/bans use normal lineup/forfeit rules. Voluntary sales/releases cannot create an emergency vacancy; keep their minimum checks. Generated emergency players use the finance contract's low depth-level ability/potential and one-season scholarship restriction; no free resale proceeds.
7. New people use `career-person:<ordinal>` IDs allocated from `nextPlayerOrdinal`, skipping any collision with live or retired IDs. The counter and person commit together. Existing IDs never change. Initial generators may retain their current IDs; wrap later generated people at the admission boundary.
8. Never delete unsigned people to meet a hard array cap. Age all live people once per season and retire through the existing hard age limit. Births are bounded per year; live lifespan is bounded. Retired storage is compact per person and accumulates honestly across the career rather than silently evicting history. Measure save size in the integration test and report it; do not claim total save size is constant.

Keep structural career market ticks and future season activation disabled. Pure operations and validators support canonical clubs across divisions, and structural setup initialises history metadata. #574 will call the established lifecycle once when its rollover is implemented.

### Sale policy and transaction boundary

Only actual persistent rival clubs may buy. Choose among legal buyers deterministically by positional need first, then improvement at that position, then stable club ID. A buyer must need the position or improve its existing position depth; do not make every rich club buy every offered player. This is a bounded default AI policy, not dynamic negotiation.

Use the existing `saleOfferQuote(salaryDemand(player))`. Preserve the exact current deal and queued renewal. Check annual commitment for every covered current/future season against the buyer's published cap; the seller's protected capacity does not travel with the person. Reconcile the seller's protection after departure. Require seller registration minimum, buyer squad maximum, nonnegative safe-integer wallets and current ownership. Block transfers during a held match/week and of a scholarship-restricted emergency player. There are no assignment records in this slice; do not add speculative assignment abstractions.

```ts
export interface SaleOffer {
  playerId: string;
  sellerId: string;
  buyerId: string;
  fee: number;
  season: number;
  week: number;
  // Stable canonical serialisation of the displayed person's identity,
  // deal/renewal, demand inputs, history length and scholarship status.
  playerFingerprint: string;
}
export type SalePreview =
  | { ok: true; offer: SaleOffer; buyerCommitments: { season: number; used: number; cap: number }[] }
  | { ok: false; reason: string; message: string };
export type SaleTransition =
  | { ok: true; state: GameState; offer: SaleOffer }
  | { ok: false; reason: string; message: string };
export function quotePlayerSale(state: GameState, playerId: string): SalePreview;
export function applyPlayerSale(state: GameState, offer: SaleOffer): SaleTransition;
export function confirmPlayerSale(offer: SaleOffer): SignResult;
```

Place these in `src/systems/playerTransfers.ts`; `contracts.sellPlayer` becomes an adapter requiring the confirmed offer, with UI callers updated. `quotePlayerSale` is read-only and uses no RNG. `applyPlayerSale` revalidates the quoted buyer, same person/deal/price/date and all capacity/funds constraints. If the quoted offer became stale, refuse; never silently substitute a different buyer or new price. Validating a manually altered offer uses the same deterministic quote and checks the displayed tuple/fingerprint, not trust in the UI.

Commit cash, both ownership arrays, histories, lineup cleanup, cap protection and player finance ledger together. The checked #695 head already defines `money:changed` with `booked?: boolean` and `stamp?: { season: number; week: number }`; its finance listener skips booked events. Use `booked: true` for the already-committed transfer notification and the current date stamp. Do not add a second `recorded` flag or reuse a match-income receipt identity. Never call `earnMoney` or `spendMoney` between ownership changes. Do not suppress the money event: QA independently reconciles event deltas against finance books.

Offers are ephemeral view state and disappear on reload; durable history plus changed ownership makes repeated confirmation fail without additional money. A failed or cancelled offer produces no receipts, time ticks, RNG changes or player-history entries.

## File responsibilities

| Files | Responsibility |
| --- | --- |
| New `src/data/playerCareer.ts` | History/population types, date/spell/archive validation; no store access. |
| New `src/systems/playerCareer.ts` | Canonical ownership lookup, start/end spell, retire/archive, shortlist resolution, deterministic newcomer admission. |
| New `src/systems/playerTransfers.ts` | Pure sale quote/revalidation/transition and thin store adapter. |
| `src/core/state.ts`, `src/core/save.ts`, `src/core/saveValidation.ts` | Shape, constructor, one additive migration, nested/cross-owner validation. |
| `src/data/divisions.ts`, `src/systems/divisionCareer.ts`, `src/systems/fixtures.ts` | Install complete history in fresh normal/regional worlds; integrate lifecycle without enabling structural rollover. |
| `src/systems/freeagency.ts`, `src/ui/recruitShortlist.ts`, `src/ui/screens/recruit.ts` | Persistent population, ID discovery and current accessible market. |
| `src/systems/contracts.ts`, `src/systems/cap.ts`, `src/systems/economy.ts`, `src/core/events.ts` | Shared contract/finance adaptation; preserve integrated #695 settlements. |
| `src/systems/rivals.ts`, `src/systems/aging.ts`, `src/systems/youth.ts`, `src/systems/stats.ts` | Actual lifecycle, funded AI moves, bounded intake, truthful review totals. |
| `src/systems/events.ts`, `src/systems/undo.ts`, `src/data/club.ts` | Close existing ownership bypasses and reversible signing history. |
| `src/ui/screens/contracts.ts`, `src/ui/screens/player.ts`, `src/ui/screens/rivalSquad.ts` | Actual sale confirmation and readable current/former club history. |
| `src/qa/soak.ts`, `src/qa/personas/policy.ts`, `src/qa/personas/metrics.ts` | Use discovered market when emulating the player; track identities/ownership/finance honestly. |
| `docs/hub/features.md`, `docs/hub/roadmap.md`, career/finance status | Shipped scope and verification evidence. |

No match-engine or competition allocator edits are required. Different workers may inspect independent areas, but one implementer should own state/save and transaction integration; do not edit these shared files concurrently.

## Task 1: Integrated base and failing continuity fixtures

**Files:** Create `tests/helpers/playerCareer.ts`; create `tests/systems/playerCareer.test.ts`; inspect integrated `src/core/state.ts`, `src/core/save.ts`, `src/systems/rivals.ts`, and #695 tests.

- [ ] Confirm the implementation worktree is stacked on exact #695 head and record its full commit and actual save version at the top of the draft implementation PR. Read its money-event and wallet hooks. Formal checker approval may remain pending during this draft work. Check a clean worktree before edits; preserve all parent-authored docs.
- [ ] Add a repeatable fixture using the real constructors, with AU/UK pack preparation in test setup:

```ts
export function careerFixture(seed = 572): GameState {
  createNewGame('Continuity test', seed);
  initLeague(getState());
  return structuredClone(getState());
}
export function livePlayerIds(s: GameState): string[] {
  return [...s.squad, ...s.freeAgents,
    ...s.league.clubs.flatMap(c => c.squad ?? [])].map(p => p.id);
}
```

- [ ] Write failing tests that installed people have matching owner histories and refresh preserves the population:

```ts
it('refresh changes discovery without replacing unsigned people', () => {
  const s = careerFixture();
  setState(s);
  const before = structuredClone(s.freeAgents);
  refreshFreeAgents(s, makeRng(8));
  expect(getState().freeAgents).toEqual(before);
  expect(new Set(getState().playerPopulation.shortlistIds).size)
    .toBe(getState().playerPopulation.shortlistIds.length);
});
```

- [ ] Run `npx vitest run tests/systems/playerCareer.test.ts`. Expect failure for missing population/history or replaced unsigned IDs; do not accept unrelated constructor failures as the red test.
- [ ] Keep the purposeful failing test local until Task 2/3 makes its scope pass; commit coherent passing batches and keep the PR draft until all dependent tasks are green.

## Task 2: History primitives, population state and additive migration

**Files:** Create `src/data/playerCareer.ts`, `src/systems/playerCareer.ts`, `tests/core/playerCareerSave.test.ts`; modify `src/core/state.ts`, `src/core/save.ts`, `src/core/saveValidation.ts`, `src/data/divisions.ts`, `src/systems/divisionCareer.ts`, `src/systems/fixtures.ts`.

- [ ] Add the data contracts above and implement pure helpers with these boundaries:

```ts
export function ownerOf(s: GameState, playerId: string): string | 'unsigned' | undefined;
export function openClubSpell(p: Player, clubId: string, date: CareerDate,
  arrival: ClubArrival, fee?: number): Player;
export function closeClubSpell(p: Player, date: CareerDate,
  departure: ClubDeparture): Player;
export function archiveRetirees(s: GameState, players: readonly Player[],
  date: CareerDate): GameState;
export function observedHistory(p: Player, owner: string | 'unsigned',
  date: CareerDate): PlayerCareerHistory;
export function validatePlayerPopulation(s: GameState): string | null;
```

`ownerOf` must reject duplicate ownership rather than returning the first match. `archiveRetirees` is called only after removal from live ownership and rejects live/archive collisions; repeated identical retirement is a no-op. Opening a spell requires no open prior spell; closing requires exactly one. Helpers return new objects and do not mutate passed arrays or consume RNG.

- [ ] Add tests for duplicate owners across player/rival/unsigned arrays, mismatched open spell, unsigned open spell, chronology, unknown club ID, archive/live collision, repeated archive and rename. Reject fake history attached to an older format before migration.
- [ ] Implement the **next actual** save migration from the integrated format: initialise observed histories, shortlist from current unsigned IDs, empty archive, zero/first unused new-person ordinal and intake markers at the current season. No backdated intake or recreated retired people. Keep the established pre-finance cutoff and recovery-original behavior.
- [ ] Initialise fresh owned players with `opening` spells and fresh unsigned with no spells. Cover normal `initLeague` and regional `createDivisionWorld`; a fresh game before league initialisation must validate.
- [ ] Run `npx vitest run tests/core/playerCareerSave.test.ts tests/core/save.test.ts tests/core/saveValidation.test.ts tests/data/divisions.test.ts tests/systems/divisionCareer.test.ts tests/core/state.test.ts`. Expected: migration preserves cash/deals/IDs/receipts, malformed imports do not replace an occupied save, structural gates remain intact.
- [ ] Commit the state and migration boundary with its tests.

## Task 3: Durable unsigned population and real shortlist refresh

**Files:** Modify `src/systems/freeagency.ts`, `src/systems/playerCareer.ts`, `src/ui/recruitShortlist.ts`, `src/ui/screens/recruit.ts`; tests `tests/systems/freeagency.test.ts`, `tests/systems/playerCareer.test.ts`, `tests/ui/recruitShortlist.test.ts`, `tests/ui/recruitScreen.test.ts`.

- [ ] Add pure visible-list and discovery helpers:

```ts
export function discoveredFreeAgents(s: GameState): Player[];
export function refreshMarketShortlist(s: GameState): GameState;
export function intakeUnsignedMarket(s: GameState): GameState;
```

Resolve shortlist IDs against current unsigned ownership; derive pinned own alumni and unsigned Academy people; deduplicate by ID. Refresh uses a stable sorted ID list and a local market seed, never `state.rngSeed`. Intake follows the 12-person annual deficit bound and records its marker in the same next state.

- [ ] Write tests for two refreshes at one date, input-order independence, known alumni visibility, signed IDs removed from visible results, no generated players during 100 refreshes, unchanged ability/ceilings and match RNG, once-only annual intake, and zero intake when the durable ordinary pool already contains 12 people.
- [ ] Make `refreshFreeAgents` the existing adapter to shortlist refresh. Keep `freeAgencyTick`'s structural guard. Update Recruit “Show all” counts and recommendations to use discovered people, with language such as “Scouted players” and the next discovery date. The canonical `signPlayer` API may accept any actual unsigned ID for an explicit event/operation; the normal player UI/QA policies use discovered candidates.
- [ ] Run `npx vitest run tests/systems/playerCareer.test.ts tests/systems/freeagency.test.ts tests/ui/recruitShortlist.test.ts tests/ui/recruitScreen.test.ts`. Expected: no unsigned identity loss or invisible automatic replacement, existing recommendation ordering remains deterministic.
- [ ] Commit market persistence and discovery changes.

## Task 4: Read-only sale quotes and complete eligibility tests

**Files:** Create `src/systems/playerTransfers.ts`, `tests/systems/playerTransfers.test.ts`; inspect `src/systems/rivals.ts`, `src/systems/cap.ts`, `src/data/financeRules.ts`.

- [ ] Define the sale interfaces above. Implement explicit buyer choice without random rolls. Use positional need/improvement and stable club ID; do not release another player automatically to make room for a sale.
- [ ] Write the first failing acceptance example:

```ts
it('quotes a funded real buyer without mutating the career', () => {
  const s = careerFixture();
  const before = structuredClone(s);
  const result = quotePlayerSale(s, s.squad[0]!.id);
  expect(s).toEqual(before);
  if (!result.ok) return; // Separate funded fixture below must exercise success.
  expect(s.league.clubs.some(c => c.id === result.offer.buyerId && c.squad)).toBe(true);
  expect(result.offer.fee).toBe(saleOfferQuote(salaryDemand(s.squad[0]!)));
});
```

Also construct an explicitly funded buyer fixture: retain its real club ID, give it legal weaker players at the offered position, a free roster place, sufficient current/future cap room and `cash = fee`. Assert `ok === true`; do not let the conditional example above substitute for success coverage.

- [ ] Add table cases for fee−1 funds, exact fee funds, full roster, no positional need, seller at 13, unknown person, same-club buyer, missing wallet/account, absent/expired deal, queued-renewal over-cap, seller protection not transferable, insufficient headroom only in the final contract year, scholarship restriction and held-week adapter rejection.
- [ ] Run `npx vitest run tests/systems/playerTransfers.test.ts tests/systems/cap.test.ts tests/data/financeRules.test.ts`. Expect each refusal without mutation; quote iteration order cannot change chosen buyer.
- [ ] Commit quote logic and refusal coverage.

## Task 5: Atomic transfer commit, funded rival poaching and finance events

**Files:** Modify `src/systems/playerTransfers.ts`, `src/systems/contracts.ts`, `src/systems/events.ts`, `src/systems/economy.ts`, `src/core/events.ts`; tests `tests/systems/playerTransfers.test.ts`, `tests/systems/contracts.test.ts`, `tests/systems/events.test.ts`, `tests/systems/economy.test.ts`.

- [ ] Add failing transaction assertions to the explicitly funded fixture:

```ts
expect(applied.ok).toBe(true);
if (!applied.ok) throw new Error(applied.message);
expect(applied.state.money - before.money).toBe(offer.fee);
expect(beforeBuyer.cash! - afterBuyer.cash!).toBe(offer.fee);
expect(livePlayerIds(applied.state).filter(id => id === offer.playerId)).toHaveLength(1);
expect(afterBuyer.squad!.find(p => p.id === offer.playerId)!.deal).toEqual(beforePlayer.deal);
expect(applyPlayerSale(applied.state, offer).ok).toBe(false);
```

Compare age/stats/traits/ceilings/XP/level/tallies field-by-field as well. Only club spell, tenure and membership-related fields may change. Verify seller lineup/captain/kicker references are removed through existing lineup resolution; do not invent a replacement player.

- [ ] Build one pure next state containing both wallets, both rosters, history, seller cap protection and transfers ledger. Check overflow before adding the credit. `confirmPlayerSale` reads the current store, refuses a held week, applies this reducer and calls `setState` once, then emits already-recorded money and notification events.
- [ ] Register a `state:changed` observer in tests that checks every observed snapshot: no state contains both credited seller and unremoved player, or debited buyer without ownership. Register finance and external money observers together: ledger/event net must agree once. Test a listener-triggered save roundtrip of the committed state.
- [ ] Change event recruitment from a rival to the same ownership/contract-preserving funded transfer primitive, with the player as buyer and actual rival as seller. Keep authored event fee where its accepted offer explicitly states one; do not charge a second ordinary signing fee. Revalidate rival minimum, player cap in all contract years and both wallets. Remove the prior generic event fee debit for this path to prevent double payment; unsuccessful event recruitment leaves no fee/history change. Preserve the existing event's no-replay boundary.
- [ ] Test stale buyer funds, player stats/demand, deal/renewal, season/week and ownership independently. Cancellation is simply dropping the offer; the before state remains byte-equal.
- [ ] Run `npx vitest run tests/systems/playerTransfers.test.ts tests/systems/contracts.test.ts tests/systems/events.test.ts tests/systems/economy.test.ts` plus the integrated #695 receipt suite. Expected: exact cash conservation for club-to-club transfers and no duplicate finance booking.
- [ ] Commit atomic sale and event ownership integration.

## Task 6: Signing/release/expiry histories and safe Undo

**Files:** Modify `src/systems/freeagency.ts`, `src/systems/cap.ts`, `src/systems/economy.ts`, `src/systems/undo.ts`, `src/data/club.ts`; tests `tests/systems/deals.test.ts`, `tests/systems/freeagency.test.ts`, `tests/systems/undo.test.ts`, `tests/systems/playerCareer.test.ts`.

- [ ] Signing appends a real spell, consumes the Academy discount when appropriate, removes shortlist ownership references and retains prior history. Release/expiry close the current spell, move the same person to unsigned ownership and preserve all career attributes. A queued renewal activates without closing/reopening the club spell. Keep existing release price/refusal semantics.
- [ ] Make the transaction+ledger approach from Task 5 apply to the changed sign/release operations; do not leave observers seeing a fee charged before a player moves. Audit `data/club.addPlayer/removePlayer` call sites and prevent a canonical person from being silently inserted/dropped without the ownership helper. Do not rewrite unrelated facility code.
- [ ] Extend signing Undo to capture only the affected person's pre-sign state/history, shortlist position and relevant lineup. Undo must check the current signed player's contract/history still matches that signing; if sold, renewed, released or otherwise changed, it refuses. Restore that person's original data once while preserving unrelated later moves/cash/history. Preserve existing match/advance/reload expiration.
- [ ] Test the complete loop:

```ts
const before = structuredClone(getState());
signWithUndo(playerId);
expect(ownerOf(getState(), playerId)).toBe('player');
expect(undoNow()).toBe(true);
expect(ownerOf(getState(), playerId)).toBe('unsigned');
expect(getState().freeAgents.find(p => p.id === playerId))
  .toEqual(before.freeAgents.find(p => p.id === playerId));
expect(getState().money).toBe(before.money);
expect(undoNow()).toBe(false);
```

Use the verified exported signing adapter `signWithUndo`; assert current shortlist membership restores without undoing another person's discovery/signing. Add renewal-then-Undo refusal and sign/sell/Undo refusal.
- [ ] Run `npx vitest run tests/systems/deals.test.ts tests/systems/freeagency.test.ts tests/systems/undo.test.ts tests/systems/playerCareer.test.ts tests/systems/playerTransfers.test.ts`. Expected: no restored discounts, double refunds, discarded unrelated changes or open spells for unsigned people.
- [ ] Commit lifecycle transaction and Undo integration.

## Task 7: Once-only ageing, retirement and bounded replenishment

**Files:** Modify `src/systems/aging.ts`, `src/systems/youth.ts`, `src/systems/rivals.ts`, `src/systems/fixtures.ts`, `src/systems/stats.ts`, `src/systems/playerCareer.ts`; tests `tests/systems/aging.test.ts`, `tests/systems/youth.test.ts`, `tests/systems/rivals.test.ts`, `tests/systems/playerCareer.test.ts`.

- [ ] Keep the existing age/retirement probability functions. For the player/unsigned hook, close spells for retirees and archive compact records in the same commit as removing live people. Expiry occurs before ageing, so an expired person is aged once from unsigned ownership.
- [ ] Return retired people from rival rollover in addition to counts, then archive them at the state-owning caller. Preserve surviving rival people and history. Reconcile rival deal expiry/renewal before new offers. Do not reprice surviving deals or clone a top-class player from club strength.
- [ ] Replace automatic rival replenishment to the old preferred size with funded recruitment from actual unsigned people followed only by bounded emergency-minimum repair. Reuse #695 wallet debits. Rival release pays its lawful payout before moving the person to unsigned ownership; if unaffordable, do not release or perform the dependent signing. Remove old weekly wage-cap eligibility from actual transactions; use the integrated annual contract checks.
- [ ] Change youth intake to retain previous unsigned juniors, admit exactly the existing bounded annual count and set the saved marker. Add market intake after all retirement/expiry processing, then refresh discovery. Use stable club ordering and isolated intake streams so presentation/reload cannot perturb identities.
- [ ] Emergency repair must record its scholarship restriction and source vacancy receipt. If the integrated finance code lacks a saved restriction, add a narrow optional `Player.emergencyDealEndSeason` field and validate it against the scholarship term; expiry or an ordinary renewal ends it. Sale/release cannot create payouts from this grant. Do not apply temporary cap protection to an ordinary new signing.
- [ ] Add tests for an expiring player aged exactly once, a renewing player with one continuous spell, retired unsigned and rival people archived once, old unsigned juniors retained, 100 refreshes with zero births, one annual intake despite repeat delivery, no injury/ban-generated people, no voluntary-sale emergency farm, a legal low-grade 13th emergency player after unavoidable loss, and deterministic rival funded moves.
- [ ] Run `npx vitest run tests/systems/aging.test.ts tests/systems/youth.test.ts tests/systems/rivals.test.ts tests/systems/playerCareer.test.ts tests/systems/fixtures.test.ts tests/ui/screens/seasonReview.test.ts`. Expected: genuine retirement/intake review counts, no second ageing cycle and no unchanged-player regeneration. If a named test file differs on the integrated base, locate its current equivalent with `rg --files tests/systems` and use that actual path.
- [ ] Commit once-only lifecycle and population bounds.

## Task 8: Sale confirmation and visible personal history

**Files:** Modify `src/ui/screens/contracts.ts`, `src/ui/screens/player.ts`, `src/ui/screens/rivalSquad.ts`; tests `tests/ui/screens/contracts.test.ts`, `tests/ui/screens/player.test.ts`, `tests/ui/rivalClubEditor.test.ts`, new `tests/ui/playerTransfers.test.ts`.

- [ ] Replace “NO BUYER” with actual offer state when available. First tap previews buyer name, fee, unchanged contract/renewal, seller cap freed and buyer commitment check. Final explicit confirmation submits that exact offer. No buyer shows the real refusal; cancel closes the preview and performs no write.
- [ ] Update a stale preview from a refused confirmation without accepting changed terms automatically. Double tap/Enter can complete at most one move. Distinguish Release's cost from Sell's income; do not add an unrestricted sale Undo.
- [ ] Render club spells in the existing player view for player-owned, rival-owned and unsigned people. Show observed history as “At this club when records began”; do not display it as a known signing date. Make compact retired records readable from existing history navigation without pretending the person is selectable.
- [ ] Add DOM tests for buyer/fee/cap text, keyboard confirmation, cancel, stale offer, successful ownership update and history surviving club/player rename. Ensure the existing text-size settings and portrait layout can show the preview without hiding confirmation.
- [ ] Run `npx vitest run tests/ui/playerTransfers.test.ts tests/ui/screens/contracts.test.ts tests/ui/screens/player.test.ts tests/ui/recruitScreen.test.ts`. Expected: UI submits quoted terms only and never announces success on refusal.
- [ ] Commit complete player-facing flow and history presentation.

## Task 9: Integration proof, documentation and independent review

**Files:** Create `tests/systems/playerContinuityIntegration.test.ts`; modify `src/qa/soak.ts`, `src/qa/personas/policy.ts`, `src/qa/personas/metrics.ts` as needed for discovered-market access; update `docs/hub/features.md`, `docs/hub/roadmap.md`, `docs/status/2026-11-career.md`, `docs/status/2026-11-finance.md`.

- [ ] Register the actual runtime hooks and run an AU/UK scenario: sign a discovered person, cancel one offer, confirm another sale, play against the actual buyer with that ID, refresh repeatedly, expire/renew deals, roll seasons, retire and reload. Capture live ID union, retired ID union, ownership, spells, progression attributes, wallet/ledger totals and save byte size at each boundary. For a sold player to appear in a match, deliberately set a healthy eligible buyer lineup; do not rely on random AI selection.
- [ ] Add a cross-division pure-transfer scenario using real structural world clubs. The player retains its division and the buyer retains its division; transferred people are not duplicated in league/cup snapshots. Advance the structural season to its existing waiting gate and prove #572 does not activate another season or migrate a supported normal career into structural mode.
- [ ] Import bad duplicate ownership, unknown shortlist ID, overlapping/invalid spell, forged retired/live collision and invalid counter/marker data into an occupied slot. Assert rejection preserves original bytes and current career. Save/resume after a successful sale must retain one buyer owner and exact balances; an old offer cannot pay again.
- [ ] Run targeted integration first: `npx vitest run tests/systems/playerContinuityIntegration.test.ts tests/core/playerCareerSave.test.ts`. Then required checks once on the final implementation:

```sh
npx tsc --noEmit
npx vitest run
npm run build
```

- [ ] Run the existing appropriate WebKit groups and QA workflow on the PR. CI must show `check`, all required `webkit (<group>)` shards and the `webkit` aggregate green. Capture phone evidence at 390×844, 667×375 and 844×390; screenshots belong in PR/CI artifacts, not commits.
- [ ] Update Recently added with the actual funded transfer/continuity behavior and link the implementation PR. Leave league choice/unlocks and assignments pending. Report population/save-size measurements and any QA balance limitation instead of silently changing annual intake or fees to make a test pass.
- [ ] Request a **different-tool** checker against #572's done-when and the final diff. A second Codex agent is useful implementation review but does not satisfy the repository's independent-tool approval. Address findings, rerun affected checks and obtain the exact checker verdict required by AGENTS.md.
- [ ] Follow the repository merge workflow only after its CI/checker gates. Playtest instruction: “Sell a player, find him at the named buyer, then open his club history and try recruiting an older unsigned player after the market refresh.” Provide the actual live build link only when that build is deployed; do not present a branch as live.

## Risks and bounded exclusions

- #695 review can change wallet APIs, event recording and save format. Draft work may proceed on its exact head; resolve upstream revisions before final verification and never parallelise competing state migrations.
- Existing event recruitment, Undo, generic add/remove helpers and QA managers can bypass a carefully written sale helper. Tasks 5/6/9 explicitly audit and cover them.
- Per-player history reflects evidence available from its introduction. Migration cannot reconstruct unrecorded prior clubs or retirees.
- A durable unsigned population changes market supply. Twelve-player discovery and bounded annual intake are measurable initial limits; validate a five-season sample rather than claiming the old churn balance still applies.
- Emergency generation must be bounded for #572's real-population acceptance. Reuse the finance owner's minimum-only, low-potential, no-proceeds terms at the touched admission boundaries; do not redesign its salary curve, cap protection, match eligibility or broader economy. If deeper unrelated emergency behavior needs redesign, record a separate finding rather than absorbing it into this PR.
- Saved retirement history grows with career length. Compact records preserve identity; arbitrary history deletion is not an acceptable memory optimisation.
- Structural divisions still lack full selected-league rollover. #572 provides reusable continuity and tests existing boundaries; it does not claim #574 or the full approved career experience complete.

## Plan self-review

- [x] #572 ownership, real buyer, failed/cancelled/stale sales, refresh persistence, history, retirement, reload, finance and UI each map to a task.
- [x] Current annual-finance rules override the stale local pre-finance audit.
- [x] #695 sequencing is explicit and no save version is reserved.
- [x] Generation is finite per year; refresh is read/discovery work; no live person is deleted to keep a list short.
- [x] State/save/transaction ownership is sequential, with no shared-file parallel edits.
- [x] Independent different-tool check, CI/WebKit/QA and deployed playtest remain distinct from local unit success.
