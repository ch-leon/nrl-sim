# League selection and permanent unlocks implementation plan

> **For agentic workers:** Use the subagent-driven-development skill (approved agent workflow), with the three ownership stages below executed sequentially. Steps use checkboxes. Codex implements; Claude independently checks the issue and diff. A Codex subagent review does not replace the different-tool checker.

**Goal:** Complete #574 as an explicitly selected new-game League career: choose the first league, play real seasons, earn permanent access by winning a finals title, and deliberately stay, move up or move down each year without losing the club's people or contracts.

**Architecture:** Add optional `competitions.leagueCareer` progression to the existing structural calendar, with an explicit `isPlayableLeagueCareer` guard. Extend the existing match finalisation and finance owners. Separate a pure season close from an atomic next-season acceptance; extract pure transforms from current season-hook owners instead of invoking a second hook pipeline from the UI. Legacy single-league careers and the isolated structural developer prototype retain their existing entry and storage boundaries.

**Tech stack:** TypeScript, existing Phaser/DOM UI, Vitest, Playwright WebKit and repository QA harnesses.

---

## Scope, evidence and decisions

**Paused checkpoint, 17 November:** Leon requested a usage pause. Foundation,
annual owners and action clock have independent Claude approvals. Season close is
implemented through `fdf0cfa3` and passed spec review, but Claude requested changes
for non-final post-hook candidate validation before installation/autosave. Fix and
re-review that first; annual confirmation and UI remain unimplemented. See the
[resume notes and evidence](../status/2026-11-league-selection.md). PR #719 stays
draft. Leon resumed this work on 18 November, authorizing the close correction,
league confirmation and UI with continued agent orchestration and Claude review.

**18 November close correction:** `9f7a7756` resolves the post-hook validation P2;
independent spec review and Claude `SEASON CLOSE REVIEW: APPROVE` passed. Candidate
settlement/cursor and close output validate before publication. Typecheck/build
passed; 4,714/4,715 full-suite tests passed, with the lone file-watcher control
passing separately with local file-event access. Saved-snapshot schedules and
atomic entry are next. Leon subsequently approved retained club capacity on 18 November, as recorded below.

Baseline inspected: `03812a1618b80fbc1348bd6b0966b3df704e9b7a`, branch `codex/league-selection-unlocks`, save version 30. Read `AGENTS.md`, `CLAUDE.md`, `docs/hub/`, `docs/specs/career-opportunities.md`, `docs/specs/career-competitions.md` and `docs/plans/2026-11-career-competitions.md`. The opportunities specification supersedes historical forced promotion/relegation. Numerical tuning and optional events remain separate work.

Done means the complete fresh AU and UK playable loop, including production new-game entry and reload, not merely progression helpers or a developer toggle. Initial content remains three eight-club regional leagues, 14 home-and-away rounds, top-four finals and the authored 25-slot year. Use saved definition bounds in logic and UI rather than hardcoding those numbers. AU and UK are regions, not difficulty ranks. Existing profile strength means 44/54/64 are generation targets, not guaranteed future opposition ratings.

Approved product rules:

- Initially Local is eligible; Championship and Premier are visible with their exact title requirements.
- Only a recorded completed league final grants the adjacent harder league's permanent unlock. A final officially decided by forfeit counts, including the existing recovery-forfeit result; the receipt preserves its decider. A result that was abandoned or withdrawn does not count. A minor premiership is a separate recorded honour. Withdrawn, cancelled or missing finals never imply a title.
- Stable definition/division IDs identify access. Club/league renaming, repeated titles, a poor season, moving down and reloading never remove or duplicate access.
- The player may choose any earned league, including a previously earned non-adjacent destination. Movement between non-adjacent leagues uses adjacent AI vacancy steps.
- No forced promotion or relegation, and no strength scaling to follow the player.
- Entry is deliberate and required before any time advancement. Previewing is read-only; confirming revalidates the current state. Once accepted, opponents and rules stay fixed for the year.
- Wider event registration, new title cash prizes, cap reward entitlements and global economy/XP tuning are outside this slice. Show only implemented rewards and ordinary match income. Never promise proposed Open Cup/Shield money or import legacy top-eight finals awards into this format.

### Decision dependencies

**Approved 18 November: retain club capacity.** Leon chose: “Yes—keep the club’s capacity; league choice doesn’t reduce it.” For League careers, each club retains its highest attained base-cap tier: entry into a higher tier can raise it, but choosing or being allocated to an easier league never lowers it. Apply this to player and AI clubs. Preserve purchased levels, earned additions, receipt IDs, cash and exact existing protection. New signings and renewals still require ordinary room under the club's retained capacity. No new protection is granted merely for downward movement. This supersedes the draft lower-league reduction/grandfathering alternatives; legacy cap helpers and previously lawful protected terms retain their existing contracts. Show the club's projected capacity separately from the chosen league's competition rank.

**AI allocation working policy:** staying causes no shuffles. When the player moves up, the lowest-ranked AI in each crossed higher league moves down one tier into the vacancy chain. When the player moves down, the highest-ranked AI in each crossed lower league moves up. Choose every participant from the original completed fields, ordered by published regular standings including the saved frozen-order tiebreak; stable club ID is only a defensive fallback for missing positions. Partly played or withdrawn fields use completed regular fixtures and that same frozen order; never choose a club already selected for another step. AI movement is administrative allocation, not an earned player unlock or a transfer of players. Encode this as an explicit allocation policy in the saved selection context and disclose the resulting movements. AI allocation uses the same retained club-capacity rule; downward allocation grants no new protected terms. This is the implementation policy for the first selectable world; record it in the technical contract and test the field invariants before activation. Neither player nor AI downward entry reduces capacity or grants new contract protection.

### Critical implementation seams

Retained capacity separates `capAccount.tier` from sporting division rank. Marked
League fixture M and gate/sponsor projections must read saved current division
membership using one shared pure basis helper, retaining existing host/neutral,
trial and facility formulas. Frozen kickoff receipts and legacy/unmarked flows
remain unchanged; easier leagues do not inherit higher match payments from cap
capacity. The confirmation writer owns receipt/annual logic; an independent-file
income task owns this basis/display correction, reviewed together before UI.

`createDivisionWorld` and trial construction hardcode season 1 and generate people: extract schedule-only construction for later years. Existing structural rollover increments counters and runs aging/youth/tenure, while cap/fixtures/board/events skip work: never feed historical waiting saves into the new lifecycle. `protectedIds` can leak protection into renewals; bind protection to signed terms. Reuse existing `matchIncome` kickoff promises/receipts. Audit calendar finance/training/read-model consumers before activation.

## File ownership and recommended contracts

All three stages form one cohesive #574 PR; commit each for independent exact-range review, then review and validate the final head before merge. Names below are proposed APIs, not claims that exports already exist. Keep each owner focused. Stage 1 owns types/validation/pure helpers; Stage 2 owns lifecycle and owner refactors; Stage 3 owns capability activation, bootstrap and presentation. Do not run these three writers concurrently against shared state/save/time files.

- New `src/data/leagueCareer.ts`: strict progress/close/receipt types and validation; new `src/systems/leagueSelection.ts`: pure access, allocation, all-years obligations and previews; new `src/systems/leagueCareer.ts`: close/accept orchestration.
- `src/data/divisions.ts` and `src/systems/divisionCareer.ts`: reusable schedule/trials, one-time fresh world, preserved DEV wrapper.
- Existing competition/calendar/world, state/save/time/advance and annual system owners: persistent phase validation, universal gates and atomic shared transforms.
- New `src/ui/screens/leagueSelection.ts`; existing title/bootstrap/review/fixture/finance/history/guide/HUD: deliberate entry and truthful read models.

Suggested shape (adjust names in one place before dependent stages, not ad hoc at call sites):

```ts
// Source season remains unchanged while awaiting an annual selection.
type EntryPhase = 'initial-choice' | 'active' | 'next-season-choice';
type LeagueCapacityPolicy = 'retain-attained-tier-v1';
interface LeagueAccess {
  leagueId: string;
  earnedFrom?: LeagueTitleReceipt; // self-contained source/target league, final identity, sides, score, winner and decider
}
interface LeagueCloseFacts {
  id: string; // stable profile + completed season identity
  season: number;
  leagues: Array<{
    leagueId: string; instanceId: string;
    standings: Array<{ clubId: string; position: number }>;
    championId?: string; finalFixtureId?: string; minorPremierId?: string;
  }>;
}
interface LeagueProgress {
  version: 1;
  scheduleSeed: number; // immutable uint32 saved at world construction
  initialFields: Record<string, string[]>; // authored initial membership snapshot; no live-pack rebasing
  clubId: string; // persistent owning club identity
  phase: EntryPhase;
  access: LeagueAccess[];
  close?: LeagueCloseFacts;
  accepted?: { season: number; leagueId: string; receiptId: string; allocationPolicy: string; movements: LeagueMovement[] };
}
interface CommitmentYear {
  season: number; committed: number; cap: number;
  protectedAmount: number; unprotectedExcess: number;
}
interface EntryRequest {
  targetLeagueId: string;
  expectedSelectionKey: string;
}
```

The selection key binds source season/close ID, progress, current roster and every signed term, all affected AI rosters/accounts, field-policy version, target definition snapshot and finance policy. A canonical stable serialisation is sufficient; this is a stale-preview check, not a security token. A preview must include the exact fields and dates that acceptance will produce. Use the immutable saved scheduleSeed and isolated labels containing profile/season/league identity; never consume state.rngSeed to preview an option. Preserve the historical season-1 seed labels exactly during extraction; season 2 onward includes the season in each fixtures/standings/trials stream. Display the updated quote if any bound input changed.

Recommended pure APIs: `leagueAccessFromClose(progress, close, divisions)`, `allocateLeagueFields(world, close, playerId, targetLeagueId)`, `commitmentYears(players, account, firstSeason)`, `previewLeagueEntry(state, requestWithoutKey)`, `closeLeagueSeason(state)` and `acceptLeagueEntry(state, request)`. Preview/accept return a discriminated success/problem result; failure returns the original state without RNG advancement or notifications. The entry-acceptance store wrapper validates a detached candidate, persists it through `saveIfChanged(candidate)` while no week is held, then installs it once and notifies. A failed write leaves the live pending state untouched; no accepted event, annual notice or sidecar cleanup occurs. Existing save ownership remains authoritative. Season close belongs to the already-settled interval: install its in-memory closed gate even if saving fails, so no subsequent click replays that interval; retry persistence without repeating sporting outcomes. Acceptance still requires successful persistence before any annual state becomes live. Initial acceptance does not run annual people work.

## Stage 1 — inactive state, progression, allocation and schedule foundation

**Boundary:** No production activation or change to unmarked DEV admission/rollover. Add an explicit fail-closed refusal for every new leagueCareer marker in load/import/install and structuralAdvanceProblem until the new lifecycle is complete. Preserve original bytes on refusal. Direct-state advancement must also refuse the marker in DEV. No UI can activate unfinished state; helpers and strict schema validation are tested directly.

### Task 1. Add strict progression state and absence-preserving migration

Files: new `src/data/leagueCareer.ts`; modify `src/data/competition.ts`, `src/core/state.ts`, `src/core/save.ts`, `src/core/saveValidation.ts`; tests `tests/core/competitionState.test.ts`, `tests/core/save.test.ts`, new `tests/data/leagueCareer.test.ts`.

- [x] Write a table-driven failing validator test for wrong phase/season, duplicate access IDs, unknown league, wrong region, title receipt without a completed final, and invalid acceptance identity. Existing ordinary and dormant metadata saves remain valid.
- [x] Add optional League progress metadata with explicit version. Absence means existing behaviour. Allocate the next unused save version (31 at this baseline), and keep `LAST_PRE_FINANCE_VERSION = 27` unchanged.
- [x] Add v30 migration that leaves ordinary and old structural careers without progress. Preserve original slots with the current recovery mechanism. Do not infer titles/access from old review text, legacy `premiership` booleans or missing fixtures.
- [x] Bind current division instance pointers and retained title sources to their exact definition IDs and seasons. Initial choice places the player in the starting field. Validate the initial membership snapshot against complete canonical coverage and field sizes; season-1 acceptance has no movements and exactly those fields. For later acceptance, recompute the declared allocation from retained previous-season fields and require exact movements and current field membership.
- [x] Validate source references and mode/state relationships. A syntactically valid new field does not itself authorise production runtime.

| Progress phase | Calendar/counters | Required evidence |
| --- | --- | --- |
| initial-choice | active; calendar and state season 1; week 1 | no close or acceptance; no played fixture |
| active | active; same calendar/state season; week within slots | accepted current season/league; previous close only if season > 1 |
| next-season-choice | awaiting-next-season; calendar and state retain completed season; week equals final calendar slot; elapsed intervals include its settlement | current close and acceptance; all required current competitions terminal |

Unmarked old DEV awaiting-next-season retains its existing calendar = state season - 1, week 1 rules. Validate phase relationships in both directions. Keep only current and most recently completed competition instances after acceptance; prune settled match-income records to the same window only after reconciling all source-year promises, and preserve cap receipt IDs; permanent title receipts are self-contained and immutable, cross-checked against a retained instance when present and internally validated after pruning. Compact factual career history/honours survive separately.

- [x] Run `npx vitest run tests/data/leagueCareer.test.ts tests/core/competitionState.test.ts tests/core/save.test.ts`; expect all pass, including untouched legacy round trips and failed-import preservation.
### Task 2. Derive access, legal fields and all-years cap previews

Files: new `src/systems/leagueSelection.ts`; new `tests/systems/leagueSelection.test.ts`; reuse `competitionLadder`, `activeSalary`, `commitment`, `publishedCap`, `tierForRank`.

- [x] Add failing cases for title versus minor premiership, repeated title, renamed division, withdrawn final, missing next tier, and permanent access after losses/downward choice.
- [x] Implement access by stable league ID using factual completed finals. Record source and target league, season/instance/final identity, final sides, champion, score and decider; union with existing access and stop at the highest tier. Validate real walkover and recovery-forfeit finals, as well as withdrawal. Test access after historical-instance pruning.
- [x] Implement allocation over original fields. Upward travel takes the lowest AI from each crossed higher field; downward travel takes the highest AI from each crossed lower field. Exclude the player and previously selected AI; use published frozen standings order, with stable ID only for a defensive missing-position fallback. Test a tied field where frozen order differs from alphabetical ID. Return movement records for disclosure, not player roster copies.
- [x] Assert every canonical club occurs exactly once, each field keeps its authored count, the player appears in the requested field, and staying changes no membership. Cover both directions across one and two tiers with tied standings and shuffled registry input. Assert exact AI identities and movement lists, including a downward best-ranked club that is not alphabetically first; league sizes alone cannot prove correct allocation.
- [x] Enumerate every season from target season through the greatest existing deal/renewal end season for the player and affected AI. Calculate actual salaries, target base cap and existing purchased/earned capacity. Stage 1 explicitly reports protectionBasis as deferred: its raw excess is not a final registration ruling. Stage 2 computes lawful term-bound protection before any quote can authorise entry. Do not use `capTotals.next` as the complete future obligation check.
- [x] The foundation kept the then-unresolved downward policy explicit. This historical checkpoint is superseded by the 18 November retained-capacity decision.
- [ ] Replace draft selected-tier projection with retained attained-tier projection for player and AI accounts, remove the policy-pending refusal, and test down/stay/up with existing purchased/earned additions, exact protection and future renewals. Never project unimplemented future prizes.
- [x] Run `npx vitest run tests/systems/leagueSelection.test.ts tests/systems/cap.test.ts`; verify pure previews preserve a deep snapshot and RNG even on rejection.
### Task 3. Extract deterministic season-only schedules

Files: `src/data/divisions.ts`, `src/systems/divisionCareer.ts`; tests `tests/data/divisions.test.ts`, `tests/systems/divisionCareer.test.ts`.

- [x] Capture fixed-seed AU/UK DEV characterization from baseline 03812a16 before accepting the refactor: full state hash or equivalent manifest covering IDs, pairings, tie orders, trial/cup draws, people and RNG. Compare extracted season-1 output exactly.
- [x] Write failing season-2/season-3 cases with existing named clubs, existing people and explicit chosen fields. Assert fixture/instance IDs include the target season, no roster/deal/wallet/history change, same seed gives the same fixtures, season 2 and season 3 draws differ at a fixed witness seed, and a second preview never changes the next live RNG draw.
- [x] Extract `buildDivisionSchedule(profile, pack, season, fields, seed)` and a trial builder that accepts the same season. Reuse `divisionPairings`, `createCompetitionInstance`, `competitionFixtureId` and frozen standings order. Return instances/metadata only; never generate people.
- [x] Make fresh-world construction call the builder at season 1 while preserving its existing public behaviour and DEV restrictions. Later acceptance calls only schedule construction.
- [x] Validate complete home/away coverage, stage slots, no double bookings, legal finals placeholders and known clubs. Without an enabled cup, its five windows remain explicit quiet intervals; do not register a paid cup implicitly.
- [x] Run `npx vitest run tests/data/divisions.test.ts tests/systems/divisionCareer.test.ts tests/systems/competitionCalendar.test.ts` and `npx tsc --noEmit`.
- [x] Review the stage diff for accidental runtime enablement, then make the focused foundation commit. Stage 2 starts only after this boundary is reviewed.
- [x] Before annual acceptance, add a saved-snapshot schedule adapter. Clone the
  current saved division definitions, calendar and per-division trial templates;
  reuse canonical pairing/seed/ID functions without reading today's content
  catalogue. Test AU/UK later years, custom saved rules/dates, deterministic complete
  fields, unchanged people/RNG and byte-identical initial acceptance. Refuse
  inconsistent or missing required snapshots instead of inventing replacements.

Stage 1 checkpoint: Claude approved the inactive foundation at `6241a47b` after two review rounds; separate spec review passed. This is not a final #574 checker verdict. The earlier `e8a82fce` QA workflow passed; its CI match shard had one labs-controls timeout under investigation.

## Stage 2 — resumable two-phase lifecycle and shared annual owners

Checkpoint: the extracted aging, expiry, youth and checked rival population owners,
exact signed-term protection and v31-to-v32 migration passed spec review and Claude's
`ANNUAL OWNERS REVIEW: APPROVE` at `05153331`. The effective action clock passed
independent spec review and Claude's `ACTION CLOCK REVIEW: APPROVE` at `29810f76`.
Marked-career contracts, transfers, undo, management displays and generic finance
events now share the calendar date; planning books into the upcoming year while
the source-year cursor stays unchanged. All 4,663 tests and production build passed
at that exact head. The reviewed Labs harness fix from main was merged at `d7151b69`.
Season close passed spec and Claude review at `9f7a7756`; Task 4 is complete at
that checkpoint. Acceptance orchestration in Task 5 remains unfinished.
Foundation and annual-owner checkpoints passed all CI check and WebKit
gates; final integrated QA and production activation remain later steps.

**Boundary:** Still no normal-new-game activation. Replace Stage 1's blanket in-memory advancement refusal with the tested new phase gates only when the new lifecycle is ready. Normal load/import/install admission remains denied until Stage 3. Old structural saves remain isolated and follow their existing prototype path. New lifecycle tests may construct explicitly marked candidates without making those candidates accepted normal imports.

### Task 4. Close once and persist the choice gate

Files: new `src/systems/leagueCareer.ts`; `src/core/time.ts`, `src/core/advance.ts`, `src/core/advanceRules.ts`, `src/data/competitionCalendar.ts`; new `tests/systems/leagueCareer.test.ts`, existing time/advance/autosave tests.

- [x] Write failing tests that end the last required league final through the existing result boundary, then assert unchanged season counter, player ages, youth ordinal/count, tenure, contracts, club wallets and RNG while the selection gate is open.
- [x] Keep `calendar.mode: 'structural'` and add the explicit validated `competitions.leagueCareer` marker. New League-career awaiting-choice state keeps the completed source-year cursor; initial choice is separately validated. `isPlayableLeagueCareer` checks this supported progression contract. Unmarked old structural careers retain their existing namespace guard and cursor rules.
- [x] Before consuming imported progression, require one canonical division instance per definition/season in the retained window, and match retained season-1 membership to initialFields. This closes the nonblocking foundation-review ambiguity around unreferenced duplicate league instances.
- [x] At final interval settlement, reconcile all source-year fixture promises before incrementing the season, freeze standings/final/minor facts, write history/honours and union access once. An existing promise for an exact canonical cancelled fixture resolves with a zero receipt through the ordinary income owner: the finance contract already classifies cancellations as unplayed. Do not invent a sporting result or settle a missing/mismatched source. Persist a close identity and the review facts needed across reload; avoid module-only `before` snapshots as the only evidence.
- [x] A playable League career closes only after its final calendar interval; if all competitions end or withdraw early, remaining authored quiet intervals still run once. This preserves the published year and annual contract fractions. The unmarked DEV early-resolution path stays unchanged. Move only sporting close work into this phase. Run no expiry, annual ageing, youth, rival development, tenure, schedule regeneration or next-season board goals. Save the durable gate before presenting the review/chooser. Emit season:ended once at close, carrying the completed year; acceptance does not emit it again.
- [x] Gate `advanceWeek`, `advanceWeeks`, `advanceUntil`, watched completion, worker completion and resume paths on phase. A final held match may finish its current interval once; stale callbacks cannot start another interval or award a second title. Fast-forward must stop promptly with a choice-required result, not spin through a requested week count.
- [x] Test reload before/after close, repeated close, duplicated final callbacks, stale prior-season callbacks, all advance entry points and initial-choice no-op. Assert object equality/RNG equality on rejection.
### Task 5. Extract annual transforms and accept atomically

Files: `src/systems/aging.ts`, `youth.ts`, `rivals.ts`, `stats.ts`, `economy.ts`, `board.ts`, `cap.ts`, `fixtures.ts`; `src/systems/leagueCareer.ts`; corresponding existing owner tests and new lifecycle tests.

- [ ] Extract pure state-in/state-out owners used by existing legacy hooks and the new lifecycle: player expiry, player/free-agent ageing/archive, youth/emergency vacancies, rival annual population, tenure, completed review/board outcome and new board objectives. Preserve legacy hook order/behaviour in regression tests. Helpers return notifications as data; do not emit or call `setState` while building a candidate.
- [ ] Before annual work, re-run preview against the current close/rosters/terms/fields/policy. Reject a stale key, locked target, unsupported policy, illegal field or unresolved competition without a single live mutation.
- [ ] On a detached candidate, calculate destination accounts and permitted term protection, increment season once, expire/activate signed terms, age/archive people, perform bounded youth intake, roll each rival once, apply tenure, rebuild schedule and ladder, generate appropriate next-season goals, and finish the durable review. Track the required expiry/retirement losses so emergency scholarships fill only genuine vacancies below the minimum.
- [ ] Store the validated pre-annual obligation quote and opponent strength as the acceptance receipt; record retirement/intake/AI-renewal changes separately after annual processing. Do not imply that pre-annual commitments equal post-annual totals.
- [ ] Use the saved phase/acceptance receipt to prevent duplicate acceptance, recording the accepted calendar start interval so active and closed cursor counts can be checked exactly against the cumulative clock. Validate the complete candidate (competition/world coverage, one owner per person, finance, dates, lineups and all affected caps), then persist the candidate successfully before installing it once. `save()` returning void is not persistence proof. Add quota/unreadable-slot failure and retry cases. A failure after any candidate transform still leaves the live state, RNG, money and side effects untouched.
- [ ] Correct ID-only protection by freezing salary/start/end of protected signed terms. Migrate v30 protected player IDs to the exact signed terms that justified their existing protection across player and AI accounts; preserve ordinary current legality without granting future renewals inherited protection. The correction is shared by legacy and League careers. The visible protected-over-cap figure now reports the excess actually covered (90 ordinary + 20 protected against 100 displays 10), while new signing room still counts the whole bill. Bounded youth-intake exhaustion now discards the whole candidate instead of keeping a partial intake; document this reliability correction. When v30 has already leaked an ID allowance into a renewal and the original term is unavailable, preserve the currently observed protected term through its end, record no invented older provenance, and prevent inheritance by the next renewal. Preserve the published foundation checkpoint's v31 save shape: use an explicit v31→v32 observed-term migration and require term-based validation from v32. The foundation is not deployed, but its draft build can still write ordinary/DEV saves; do not assume those bytes never existed. Keep v30→v31 additive/no-op. For League allocation, retain club capacity instead of creating protection on a downward move; pre-existing lawful protection still follows exact terms. Test repeated renewals, expiry to unsigned, transfer, emergency terms and future commitments two or more seasons away. Never reset purchased/earned capacity, cash, receipt IDs or existing salaries on tier changes.
- [ ] Adapt completed board/reputation facts to the actual eight-club field and final stages. Use existing owners, never old top-eight assumptions or the legacy finals prize calculation. For the marked mode's finish goal, scale the existing reputation/difficulty target against its original 16-club reference, multiply by the selected field size, round and clamp to 1 through field-size-minus-one. Use the same reference in AU and UK so region does not change board difficulty; the legacy generator remains unchanged. This gives a normal reputation-30 eight-club side a top-five goal rather than automatic top-eight success. Rival and derby objectives must belong to the selected field. Ordinary played-match cash remains in `matchIncome`; no new title cash, board grant or cap reward is activated for this mode. Review objective outcomes and reputation without importing the legacy grant payout.
- [ ] Add one effective contract/action clock for playable calendar careers: active play uses actual calendar length; annual planning uses the target year without advancing stored season/time. Quotes and commits for signing, renewal, sale, release and undo must use the same clock and explicit finance/history stamp. Existing queued renewals are the effective term in that target year; planning actions must not expire a new one-year signing before it starts. Legacy trials/countdown remain unchanged. Derive structural display weeks from signed terms rather than replayable decrements.
- [ ] Validate lawful existing protected terms separately from room for a new promise. Preserve emergency protection when staying; ordinary unprotected obligations must fit while exact protected terms can survive. New promises cannot spend protected excess. Player and AI league movement retain their attained cap tier and existing exact protection; downward movement creates no new allowance. Test a 90 ordinary + 20 protected bill against a 100 cap and expiry/renewal/transfer removal of protection.
- [ ] Keep old structural `awaiting-next-season` saves out of this acceptance API. They have already run some annual work. Leave them loadable/exportable only under the existing DEV namespace and preserve originals. If a later task offers their conversion, it must first persist a validated partial-lifecycle receipt and run only the missing owners; it cannot send them through the fresh two-phase acceptance. This plan does not silently convert or claim continued play for those historical prototypes.
- [ ] Test fresh AU/UK years 1→2→3; title/stay, title/up, poor year/stay, unlocked/down and return up; min/max fields and cap paths; signed renewals/expiry/retirees; bounded population; wallet and match-income continuity; all failure paths. Add assertions that each surviving person ages once and each annual owner executes once.
- [ ] Run focused owner/lifecycle tests, `npx tsc --noEmit`, then commit the reviewed lifecycle stage. Production activation still waits for complete annual invariants and validation of the approved retained-capacity rule.

## Stage 3 — production activation, readable entry and release evidence

### Task 6. Activate only explicitly opted-in new careers

Files: `src/ui/title.ts`, `src/main.ts`, `src/systems/divisionCareer.ts`, `src/systems/competitionCalendar.ts`, `src/core/save.ts`, `src/core/saveValidation.ts`, `src/core/season.ts`; tests title/save/recovery and new League runtime integration tests.

- [ ] Add an explicit New Game choice between the existing career and League career. Preserve the existing setup screens and loading transition; pass a typed choice into bootstrap. Ordinary Continue never converts a running save.
- [ ] Construct the regional world exactly once after pack selection, in the initial-choice phase. Show Local eligible and the other two locked. Starting an ordinary career continues through the existing `createNewGame`/`initLeague` path. The playable regional constructor must admit a bounded opening unsigned pool (reuse the fresh game's 12 opening unsigned people with canonical admission/IDs); the developer prototype's empty pool and already-stamped intake receipt would otherwise prevent all first-year recruiting. Never regenerate a market on preview or entry.
- [ ] Add named runtime predicates for legacy, isolated prototype and playable League calendar. Audit every `hasStructuralCalendar` call listed above and every direct calendar/mode access. Schedule/result adapters operate on both supported calendar types; prototype-only refusals remain prototype-only. Finance/annual/board owners use the explicit playable capability.
- [ ] Change normal load/import admission only for fully validated playable progress snapshots, including the complete initial/active/closed/accepted invariants. Unmarked old structural imports remain rejected outside DEV; malformed appended markers are rejected. Corrupt/future/wrong-pack/unsupported-format imports preserve the occupied save and its original recovery data.
- [ ] Audit interval hooks and clocks: trial slots explicitly choose training/recovery/economy eligibility, quiet slots advance interval work once, fixture completion never adds an extra weekly tick, and ordinary salaries never become cash deductions. Keep unsupported event offers gated; adapt free-agency cadence/contract display to the calendar and retain bounded births.
- [ ] Keep held-match interval-start save/sidecar matching, fixture IDs and accepted entry identity coherent. Reload at initial gate, annual gate, first accepted interval and held match must resume the same phase/opponent.
### Task 7. Deliver the complete selection and review UI

Files: new `src/ui/screens/leagueSelection.ts`; `src/ui/screens/seasonReview.ts`, `fixtures.ts`, `finance.ts`, `history.ts`, `src/ui/guide/pages.ts` and existing HUD/nav owner discovered at implementation; new `tests/ui/screens/leagueSelection.test.ts`, existing relevant UI tests.

- [ ] Render eligible and locked league cards from one pure preview. Show current choice, permanent-access reason, exact required finals title for locked options, actual strength range/mean of proposed opponents, complete opponent field, Nines format/field/finals size and dates from saved slots.
- [ ] Detail the target annual base cap, purchased/earned additions, every covered signed-obligation season, protected terms if applicable, entry-blocking reasons, ordinary match income basis, title/minor honours and the precise adjacent unlock. State when no extra title cash/cap prize exists.
- [ ] Show affected AI allocations and administrative movement policy before confirmation. Selecting a card only previews; one clear Confirm league button accepts with the selection key. A stale preview redraws and requires a fresh deliberate confirmation.
- [ ] Initial entry cannot be skipped into play. Annual review offers Choose next league; closing/reopening either view preserves the gate. The normal League/HUD navigation must reopen unresolved selection after reload, and Play Week explains the required choice.
- [ ] Keep locked choices discoverable, underdog strength separate from eligibility, and show the permanent unlock even when the player chooses to stay. Do not label a title as automatic promotion or a losing year as relegation.
- [ ] Replace League-career legacy labels (Prototype slot, 24/22 regular rounds, top eight, QF/SF/GF arithmetic) with actual saved stage/date facts in fixture, review, board and help surfaces used by this path. Preserve legacy text for existing careers.
- [ ] Test normal/large/larger text, focus/keyboard/touch targets, scrolling and no colour-only eligibility indication. Confirm button and financial blocking reason stay reachable in short landscape viewports.
### Task 8. Prove the actual loop and publish reviewable evidence

Files: new `scripts/e2e-webkit/screens/leagueSelection.mjs`; register it in `scripts/e2e-webkit.mjs` and the existing relevant shard; extend existing QA/season harness rather than add a throwaway simulator; `docs/hub/features.md`, `docs/hub/roadmap.md`, and a focused `docs/status/2026-11-league-selection.md` evidence report.

- [ ] Browser test begins at the real production New Game screen, chooses League career, selects an AU/UK location, reads the initial preview, confirms Local, and reaches a real fixture. A helper-created saved state is insufficient evidence for bootstrap.
- [ ] Use deterministic supported test fixtures to reach annual close, then exercise the real UI for title unlock → stay, next year → move up, and an earned downward choice under the approved retained-capacity policy. Reload at each gate and after acceptance. Confirm history and cap preview match the saved receipts.
- [ ] Run a real played/skip fixture and multi-season QA for both regions. Prove final identity, once-only cash, contract transition, bounded population, stable player/club ownership, deterministic fields and no automatic player movement. Include one losing year and no optional-event entry. Wider balance conclusions remain #562/#582 work; report measured outcomes without claiming balance approval.
- [ ] Run browser checks at 844×390, 667×375 and 568×320 plus normal/large/larger text. Capture selection, locked explanation, obligations, review/unlock and accepted schedule screenshots in PR/CI artifacts, never commits.
- [ ] Run required local checks exactly:

```bash
npx tsc --noEmit
npx vitest run
npm run build
npm run e2e:webkit -- --group screens
npm run e2e:season
```

- [ ] Update hub Recently added and roadmap with the actual candidate PR link and scope, not a claim that the candidate is deployed. Record revision, commands, outcomes, any unsupported legacy DEV continuation and remaining finance/progression tuning.
- [ ] Have Claude review the final issue acceptance criteria and diff independently. Address findings, rerun affected checks, obtain `CHECKER VERDICT: APPROVE`, and observe green `check`, every `webkit (<group>)`, `webkit` aggregate and QA workflow on the PR. Do not claim done or merge solely from agent assertions.
- [ ] Following the repository merge/deploy process, verify the live build revision before giving Leon `https://ch-leon.github.io/nrl-sim/` and one play-test line: “Start a League career, win a title, then choose whether to stay or enter the unlocked league.”

## Completion boundary

Stage 1 is ready independently. Retained club capacity is approved; implement and independently review that rule alongside AI allocation before enabling its effects. Do not activate production with only helper tests: completion requires the real new-game path, deliberate initial/annual selection, factual permanent unlocks, exact preview, deterministic complete fields, all-years cap checks, once-only resumable annual work, persistent people/contracts/cash, legacy/prototype isolation, AU/UK multi-season evidence, landscape/larger-text browser coverage, independent Claude approval and final CI/QA gates. Wider balance and optional events remain separate.
