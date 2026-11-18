# Optional Open Cup entry implementation plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` to implement the already-authorised feature task by task. This plan is the next checkpoint after the reward foundation; no renewed product permission is needed.

**Goal:** Let normal AU/UK League careers choose an annual Open Cup, play or withdraw, receive the published rewards once, and retain a factual trophy history.

**Architecture:** Add a saved seasonal offer/decision and activation record around the existing Open Cup draw, calendar, match hooks and reward foundation. Draw at the registration deadline; preserve the single canonical club/player world. Use strict normal-career transactions and receipt-backed views rather than a second tournament or finance system.

**Tech Stack:** TypeScript, Vitest, existing Vite/Phaser application, DOM screen helpers, WebKit journeys and save/import infrastructure.

---

## Authority, baseline and dependency

Audited against `8d7d9c5d` on 18 November 2026, with save version 32. Read [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md), [the hub](../hub/README.md), [career opportunities](../specs/career-opportunities.md) and [career competitions](../specs/career-competitions.md).

The user explicitly approved free registration from season start until before Week 7, matches in Weeks 7/10/13/16/19, and 1M/1M/2M/3M/5M plus reputation and trophy as starting test values. This is implementation authority, not acceptance of long-term balance. The whole optional-cup feature is authorised, not only its foundation.

Depends on [the reward foundation plan](2026-11-18-open-cup-rewards.md). Claude approved its final R1/R2 corrections on 18 November; the implementation must prove those recovery and migration requirements. This document supersedes that plan's earlier pending-product-question wording; it does not bypass its financial correctness gates.

Coordinate the schema before coding: the foundation proposes 32→33. If foundation and activation ship together, add activation within 33. If the foundation ships separately first, activation needs the next version, expected 34, and a fresh inspection of its actual schema/migration. Do not allocate competing version-33 meanings.

## Published product contract

| Topic | Initial supported behaviour |
| --- | --- |
| Eligibility | Normal marked AU/UK League career after deliberate league acceptance; whole club under existing Nines rules. |
| Entry | Free; available at season start through Week 6, including migrated eligible saves before the deadline. |
| Choice | Freely change enter/decline before the deadline; persist current choice and last-choice receipt. No answer expires without entry. |
| Draw | Freeze once when Week 6 closes; never disclose opponents or byes on preview/confirmation. |
| AI field | All other canonical regional clubs enter, following existing CPP06 policy; the AI cup proceeds when the player declines/expires. |
| Commitment | Publish all five possible dates, Weeks 7/10/13/16/19; no conflicting main-team fixture; elimination releases later dates. |
| Cash | Actual played round wins earn 1M/1M/2M/3M/5M; bye and forfeit earn no round prize. |
| M | Existing frozen FIN-04 fixture match base: host sporting division; lower entrant base at neutral final. Retained club cap does not determine M. |
| Reputation | +1 per actual played win, plus +2 for the played final title, using existing bounds and saved actual applied deltas. |
| Trophy | Played-final-only title honour, each event once; final-time registered full squad IDs/names, including reserves. |
| Withdrawal | After draw, save a withdrawal that forfeits the next actual player tie on its date; no ordinary match income, match XP or round prize. |
| Forfeited final | Sporting bracket still has a winner; no title cash/reputation/honour under the initial played-final-only reward policy. Publish this before entry. |
| Later seasons | A new offer every annual accepted league entry; prior choice never silently re-enters the player. |

No cap entitlement, contract repricing, forced release, assignment, small-sided format, equipment, invitation chain or unrelated UI redesign belongs in this slice. Existing retained capacity and sporting-division income remain unchanged.

## Saved contract and API boundaries

Create `src/data/openCupEntry.ts` for the plain saved types and structural validation. Add an optional, explicitly versioned `openCupEntry` field to `CompetitionCareerState`; normal activation requires it, while old inert/prototype sporting snapshots remain distinct.

The record owns a stable offer identity, season, profile identity/version, copied cup definition/reward template, all potential dates, deadline, canonical eligible club IDs and deterministic draw provenance. Keep its current `choice` (`unanswered`, `enter`, `decline`) separate from lifecycle (`open`, `drawn`, `unavailable`) and resolution (`entered`, `declined`, `expired`, `legacy-window-missed`).

Each successful choice stores the offer ID, season, choice and decision slot as `lastChoice`; unchanged re-submission is idempotent. The deadline stores its resolved choice, instance identity and activation provenance. A withdrawal stores request slot and, once fulfilled, exact forfeited fixture/result identity. Historical honour evidence is owned by reward receipts, not this current-season offer.

Use fixed draw provenance: `leagueCareer.scheduleSeed`, saved definition ID/version, season and ordinal zero. Never consume `state.rngSeed`, choose a new seed on confirmation, or derive randomness from money, results or action timing. Entrants are canonical IDs sorted before the existing shuffle; reload/retry produces the same draw.

Define these small APIs in the named new modules; each returns detached data and never writes storage directly:

```ts
// systems/openCupEntry.ts
function createOpenCupOffer(state: GameState): GameState;
function previewOpenCupEntry(state: GameState): OpenCupEntryPreviewResult;
function chooseOpenCupEntry(state: GameState, selection: OpenCupChoice): OpenCupEntryResult;
function closeOpenCupRegistration(state: GameState): GameState;
function requestOpenCupWithdrawal(state: GameState, selection: OpenCupWithdrawal): OpenCupEntryResult;
function resolveOpenCupWithdrawal(state: GameState): GameState;
// systems/openCupEntryCommit.ts
function confirmOpenCupChoice(selection: OpenCupChoice): OpenCupEntryConfirmationResult;
function confirmOpenCupWithdrawal(selection: OpenCupWithdrawal): OpenCupEntryConfirmationResult;
```

`OpenCupChoice` carries `offerId`, `choice: 'enter' | 'decline'` and `previewKey`. `OpenCupWithdrawal` carries `offerId` and `previewKey`. Preview keys cover the source state and saved offer; confirmation re-previews before mutation. Result unions follow `leagueEntry.ts`, distinguishing stale, unavailable, invalid, held, quarantine and storage refusals.

Preview displays dates, eligibility, current decision, fee, reward rules and possible commitment. It neither generates a draw nor creates a fixture/prize promise. At draw, the saved definition contains the foundation's explicit supported executable policies; unsupported/mixed execution metadata remains rejected.

### Lifecycle assertions

| Source | Action/boundary | Required result |
| --- | --- | --- |
| Initial league choice | Inspect cup | No activation or draw; league choice remains required. |
| Accepted league, Week 1 | Create offer | Open/unanswered, saved template, no opponent. |
| Open, Week 1–6 | Enter/decline | Current choice and last receipt change; no draw or cash movement. |
| Open, Week 6 held | Choice/withdraw callback | Refused; checkpoint and match remain owned by the interval. |
| Open/enter, Week 6 closes | Resolve deadline | One 24-club draw plus matching activation. |
| Open/decline, Week 6 closes | Resolve deadline | One 23-AI-club draw, player declined. |
| Open/unanswered, Week 6 closes | Resolve deadline | One 23-AI-club draw, player expired. |
| Drawn/entered | Queue withdrawal | Saved request; original entrant list and prior results unchanged. |
| Withdrawal pending, current tie | Pre-match hook | Opponent wins by forfeit; zero/ineligible receipts, no player match job. |
| Withdrawal pending, bye/rest date | Pre-match hook | Keep waiting; do not invent a fixture or result. |
| Completed cup | Repeat result/render/reload | No duplicate effect; same saved honour. |
| Legacy window missed | Advance current season | No cup instance; normal league closes. |
| Any completed season | Accept next league | Fresh unanswered offer, new season identity, preserved policy template. |

Both current and previous season activation records must remain provable while their instances survive. Use one current offer plus a bounded retained-activation collection inside `openCupEntry`; do not overwrite the only source evidence when the next offer is created. Honour receipts remain independently permanent after sporting retention expires.

## File ownership

| Files | Change |
| --- | --- |
| New `src/data/openCupEntry.ts`; `src/data/competition.ts` | Offer/choice/activation/withdrawal schema and cross-evidence validation. |
| New `src/systems/openCupEntry.ts` | Pure offer, preview, choice, deadline and withdrawal operations. |
| New `src/systems/openCupEntryCommit.ts`; `src/core/time.ts` | Save-before-install actions and an owned-interval guard. |
| `src/systems/leagueEntry.ts`, `src/systems/leagueAnnualEntry.ts` | Create first/annual offers only with accepted League entry; preserve template. |
| `src/data/leagueSchedule.ts` | Preserve its league/trial-only owner; expose saved inputs if needed, not a second cup draw. |
| `src/systems/fixtures.ts`, `src/systems/openCupCareer.ts` | Deadline hook and due withdrawal integration; reuse existing round advancement. |
| `src/core/state.ts`, `src/core/save.ts`, `src/core/saveValidation.ts`, `src/systems/leagueEntryValidation.ts` | Coordinated version/migration; activation-backed normal admission and strict prize consistency. |
| Foundation `src/data/competitionRewards.ts`, `src/systems/competitionRewards.ts`, `src/systems/matchIncome.ts`, `src/systems/competitionCalendar.ts` | Reuse promise/receipt settlement; authorise only recorded normal activations, not all executable imports. |
| New `src/ui/screens/openCupEntry.ts`; `src/ui/screens/fixtures.ts`, `src/ui/screens/leagueSelection.ts` | Entry surface and existing League navigation/confirmation refresh. |
| `src/systems/leagueSeasonView.ts`, `src/ui/screens/matchReport.ts`, `src/ui/screens/history.ts` | Cup lifecycle labels, read-only reward breakdown and receipt-backed trophies. |
| `scripts/e2e-webkit/screens/openCupEntry.mjs`, `scripts/e2e-webkit.mjs` | Public entry/reload/withdrawal/history journey in required WebKit runs. |

## Task 1 — Offer and activation data

- [ ] Add `tests/data/openCupEntry.test.ts` with exact valid open/drawn/unavailable cases and corruption cases for extra fields, duplicate identities, wrong season/club/profile, unsupported template, altered deadline and mismatched choice/draw.
- [ ] Add a normal-admission test proving executable definitions alone are insufficient: offer, resolved decision, saved supported template and activation must agree. Reject a foreign retained executable instance even when the current offer is valid.
- [ ] Implement the record and its pure validator; check canonical entrants, template policy completeness, draw provenance and withdrawal result evidence.
- [ ] Route those cross-evidence checks through `validateCompetitions`, using a signature `validateOpenCupEntry(value, competitions, context)` with its saved competition data and existing pack/season/week/club context. This path must run under `validateInput`/`isPlayableLeagueCareer` before interval publication; do not put the checks solely in cached `leagueCareerStateProblem` admission. Test a corrupted deadline draw is rejected before replacing the saved checkpoint.
- [ ] Retain current and previous activation evidence needed by retained instances; permanently retained honour receipts keep their self-contained source evidence after those instances are pruned.
- [ ] Run `npx vitest run tests/data/openCupEntry.test.ts tests/core/competitionState.test.ts`; require red-before-implementation then green, including inert legacy reward definitions.

## Task 2 — Choices, deterministic closure and annual offers

- [ ] Add `tests/systems/openCupEntry.test.ts`: AU/UK offers, enter→decline→enter, idempotent repeat, stale preview, initial-choice rejection and absent/malformed offer rejection.
- [ ] Create both initial and annual offers inside `acceptLeagueEntry`, after its initial/annual state candidate is built and before its final `leagueCareerStateProblem(candidate)` call. Annual schedule preparation supplies the saved inputs; neither commit adapter nor UI callback adds an offer afterward. Reuse saved match rules, lineup/calendar and reward template; do not call the developer season-one constructor unchanged.
- [ ] At `fixtures-finals-next` (order `TICK_ORDER.ladder + 1`), close registration when `state.week + 1` reaches the saved deadline, then use existing `prepareOpenCup`. Closure stays inside the owned Week 6 transaction, before publishing Week 7.
- [ ] Call `drawOpenCup` once with current slot 6, immutable seed, season, ordinal zero and prior instances. Enter includes the player; decline/unanswered excludes them. Save activation and draw together; never install only one.
- [ ] Require a resolved activation/draw at Week 7 for enabled seasons. A missing draw is corruption, not a load-time repair. `legacy-window-missed` is an explicit exemption, never a retroactive AI cup.
- [ ] Test unchanged league fields/cap/deals, 24/23 entrants, no preview RNG changes, no reroll from unrelated RNG activity, deterministic reload and different annual identities.
- [ ] Test annual offer/template persistence after moving leagues, including saved rules surviving catalogue edits and no automatic re-entry. Run `npx vitest run tests/systems/openCupEntry.test.ts tests/systems/leagueEntry.test.ts tests/data/leagueSchedule.test.ts`.

## Task 3 — Safe public actions and withdrawal

- [ ] Add `tests/systems/openCupEntryCommit.test.ts` using the real storage seam: held interval, synchronous interval callback, quarantine, pending durable save, stale installation/slot/namespace, quota failure and readback failure must leave the source unchanged.
- [ ] Export `leagueIntervalInProgress()` from `time.ts`, checking the owned interval as well as held work. `weekHeld()` alone is false during early synchronous hooks; `leagueIntervalSaveHeld()` alone is false before source state changes.
- [ ] Implement both commit adapters following `confirmLeagueEntry`: guard, re-preview, detached candidate, strict validation, ownership recheck, `saveIfChanged`, then install and notify. Refuse `pendingLeagueSaveProblem()`; never displace its checkpoint or parked match.
- [ ] Do not copy `clearLiveMatch(slot)` or `commitUndo()` from the League entry adapter. Cup choices/withdrawal do not own retirement of those records; test that both remain untouched on success and refusal.
- [ ] Add withdrawal cases before the first tie, during an opening bye, after a played win, after elimination and after completion. Reject no-longer-active withdrawal; never remove the player from the frozen entrant list.
- [ ] Integrate `resolveOpenCupWithdrawal` after pre-match round preparation, before order-40 player/rival jobs. On the actual next player fixture date, call `finaliseCalendarFixture(..., true, { kind: 'open-cup-withdrawal', offerId })` with the opponent winning by `FORFEIT_SCORE`. Its entry check sees the unchanged valid pending request, not prematurely fulfilled evidence.
- [ ] Record fulfilment in the same candidate as the result and zero/ineligible receipts. Keep the entire cup scheduled/active for AI; do not set its instance status to `withdrawn` or cancel other ties.
- [ ] Extend `finaliseCalendarFixture` with only that optional typed fulfilment argument. After assembling the result candidate but before its internal `validateCompetitions`, verify the pending offer/request, exact current player tie and opponent-forfeit winner, then add only that request's fulfilment evidence. Reject unrelated instance/offer/fixture/result targets. This is a narrow evidence step, not an arbitrary state-mutating callback or a weaker entry check.
- [ ] If a due withdrawal receives an unchanged result state, throw and block/quarantine the owned interval before the normal match or cleanup hooks can run. Otherwise commit the complete candidate through the foundation-extended `commitMatchState`, including ordinary/prize records, wallets, reputation and withdrawal evidence; never use the existing pre-match hook's competitions-only `setState` for this result.
- [ ] Add regressions proving pending-request input passes the entry guard, result and fulfilment validate together, a forced no-op blocks without playing/recovery-forfeiting the tie, and all zero/ineligible receipts survive installation and reload.
- [ ] A bye keeps withdrawal pending until an actual player tie exists. Preserve previous results and earned rewards. Do not fake a different week to finalise a future fixture.
- [ ] Run `npx vitest run tests/systems/openCupEntryCommit.test.ts tests/systems/leagueCareerCallbacks.test.ts tests/systems/openCupCareer.test.ts`; assert no player match job, match XP, played income or round prize for withdrawal.

## Task 4 — Migration and strict normal settlement

- [ ] Inspect the foundation's final reviewed version/schema first. Reuse its checked-in baseline files in `tests/fixtures/saves/league-career/`; never regenerate v32 baselines using the new builder.
- [ ] Before migration implementation, finish the root's extra AU/UK Week 6/7/19 captures at `8d7d9c5d` using the documented `scripts/qa-league-career.ts` production runner. Its existing outputs cover initial/accepted/closed states; add only snapshot observation at the required settled weeks in the baseline capture harness, without changing game behaviour. Validate every capture with the old importer/League validator, and document revision, recipe, file names and byte counts in `tests/fixtures/saves/README.md`.
- [ ] Use the genuine baseline Week 6 save plus its matching `league-career/live-matches/v32-{au,uk}-week-6.json` sidecar for held migration evidence. Both pairs were captured at real baseline kick-off and independently imported/reopened with their original fixture and seed; provenance and exact envelope construction are in the fixture README. Any additional mutated recovery cases must be labelled derived and cannot replace these captures.
- [ ] Extend `tests/core/leagueCareerMigration.test.ts` for AU/UK initial-choice, active Weeks 1/6/7/19, next-season-choice and a held Week 6 checkpoint with its existing match sidecar.
- [ ] Handle marked old saves before `save.ts`'s marked-League early return: it bypasses generic `MIGRATIONS`. Validate raw old-version structures and exact absence of new fields before transforming; then enforce all prior strict League invariants and full new admission on the detached candidate. Version substitution alone is not validation.
- [ ] Coordinate with the reviewed foundation's additive-schema exclusion list: reject presence, including empty/null values, of fields impossible in the declared old format. Keep old sporting, history, people, finance, cap and no-repair checks intact; do not silently normalise them.
- [ ] For an initial-choice save, defer offer activation until league acceptance. For a valid active pre-deadline save, add an offer without a draw. At/after deadline mark unavailable this season; for next-season-choice create the offer only on annual acceptance.
- [ ] Preserve raw backup bytes, money, RNG, contracts, cap, population, old definitions and results. Never convert old reward metadata into executable promises, rewrite an existing cup or infer a historical prize.
- [ ] A migrated held Week 6 match resumes normally; registration actions remain guarded, and unanswered entry expires as that interval closes. No mandatory prompt interrupts the match.
- [ ] If activation follows a shipped v33 foundation, add explicit v33→34 tests as well as the complete v32→current chain. Normal-namespace executable imported cups require valid activation proof; developer/unmarked imports remain outside normal activation.
- [ ] Normal League accepted results must already have complete settled ordinary/prize receipts. Still-scheduled fixtures may carry valid pre-result promises. Reject accepted-but-pending, missing and forged reward evidence; do not use developer reconciliation to repair normal imports or close.
- [ ] Verify normal result callbacks atomically expose score, wallet, reputation, receipts and trophy. Financial failure quarantines the owned interval and preserves checkpoint/sidecar; no cancellation fallback, payout notification or stale callback may turn failure into a result.
- [ ] Run `npx vitest run tests/core/leagueCareerMigration.test.ts tests/core/save.test.ts tests/core/saveRecovery.test.ts tests/systems/leagueCareerCallbacks.test.ts tests/systems/competitionRewards.test.ts`.

## Task 5 — Entry, reports and trophy history

- [ ] Add one Open Cup card to the existing League/calendar surface; open a focused entry dialog. Follow [SuperCOOKED](../specs/ui-supercooked.md) Phase 0 `tokens.ts`/`dom.ts` components and existing League/history/report patterns; do not reskin unrelated screens.
- [ ] Before closure show fee, dates, full possible commitment, deadline, current choice and the published rewards/withdrawal rules. Enter/decline controls can change until closure; closed, expired and legacy-unavailable states explain when entry returns.
- [ ] Show no opponent/bye before draw. After draw show actual schedule/status and queued withdrawal explicitly: the next tie is forfeited on its date, not already played. Existing `leagueSeasonView` remains the fixture owner.
- [ ] Display reward formula and actual resolved amounts separately. Before a fixture promise exists, state the M basis; do not present a preview estimate as guaranteed cash. Reports show saved ordinary income and extra prize breakdown separately.
- [ ] Read trophies only through foundation `competitionHonours`; show season, cup, champion and the saved full registered squad. Retired/transferred players retain saved names/IDs, without being recreated in any roster.
- [ ] Add `tests/ui/screens/openCupEntry.test.ts`; extend `tests/ui/screens/matchReport.test.ts`, `tests/ui/screens/history.test.ts` and `tests/systems/leagueSeasonView.test.ts`. Repeated render/open/reload must not mutate state, pay money or create honours.
- [ ] Browser journey: public New Game→League confirmation→enter/change choice→reload→Week 7 draw→play/withdraw→report/history→next-season offer, plus decline/expiry and migrated-late-save cases. Check phone portrait/landscape, keyboard focus, stale refresh and storage-error text.
- [ ] Run the affected node tests and the new WebKit journey; save screenshots to CI artifacts/PR evidence only.

### Minimum end-to-end evidence

Use baseline saves for migration evidence and normal public setup for activation evidence. Tests may inject deterministic scores through existing fixture hooks; they must not bypass registration, deadline, result settlement or annual admission.

| Journey | Evidence to assert |
| --- | --- |
| AU entered title | 24 entrants; frozen byes; correct five round policy amounts; one final trophy with final-time squad. |
| UK declined | Player league still plays; 23 AI entrants; AI final and prize settlement complete once. |
| Unanswered | No forced UI gate; expiry at close of Week 6; no player cup fixture. |
| Repeated choice | Reload preserves the last successful choice; deadline draw independent of earlier choices. |
| Withdrew after win | Prior cash/reputation retained; next tie unplayed; no extra prize; remaining bracket completes. |
| Opening bye then withdrawal | No bye payout/XP; forfeiture attaches to the later real tie only. |
| Migrated Week 7 | No retroactive AI/player cup; next season offers normally. |
| Final-time transfer | Honour uses saved final-time IDs/names; later transfer/retirement does not edit the trophy. |
| Corrupt imported activation | Reject before installation; original slot and export remain available. |
| Failed second rival award | No partial result/award publication; quarantine preserves the durable checkpoint. |

For each outcome compare ordinary income with prize income separately, and compare cap accounts/contracts before and after cup-only changes. A final at a neutral venue uses the lower sporting-division M even when either club retains higher cap capacity.

The read-only UI test snapshots state before opening entry, report and trophy screens twice, then checks equality after each render. Use saved receipt IDs/amounts as expected data; never call reconciliation from presentation code.

## Task 6 — Whole-feature proof and documentation

- [ ] Extend `tests/systems/openCupCareer.test.ts` to normal storage with the real fixture hooks: player title, early elimination, opening bye, withdrawal, unanswered/declined AI-only cup and seeded drawn-score winner in both regions.
- [ ] Complete two seasons with changed league choice; prove unique annual draws/prize promises, once-only honours, exact annual people work, unchanged retained capacity, no duplicate fees/income/XP and no extra calendar intervals.
- [ ] Include typed financial failure, repeated watched/worker delivery, grouped rival failure, quota/readback retry and reload replay. No repair/forfeit recovery should mask a failed normal result transaction.
- [ ] Update `docs/specs/career-competitions.md`, `docs/specs/career-opportunities.md`, `docs/plans/2026-11-career-competitions.md`, `docs/hub/features.md` Recently added and `docs/hub/roadmap.md`. Replace “no cup registration”/“pending offer values” only where this feature actually ships; retain wider balance and other-event work as open.
- [ ] Run `npx tsc --noEmit`, `npx vitest run`, `npm run build`; require all pass. Obtain independent-tool review against this done-when contract, green `check`, every `webkit (<group>)` shard, `webkit` aggregate and full QA before merge.
- [ ] Give Leon the live build link and one line: “Enter or decline the Open Cup before Week 7, then check its draw, rewards and trophy history.” Record deployment/play-test separately from code/test completion.

## Done when

A normal AU or UK League career can change its free cup choice before Week 7, receive exactly one fixed seasonal draw at closure, complete or withdraw from the cup while AI continue, and see exactly-once saved rewards and permanent full-squad trophy evidence. Old supported saves migrate without retroactive fixtures/prizes, strict normal transaction guarantees survive failures/reload, annual offers recur, and independent review plus required CI/QA are green. The initial prize values remain starting test values, not a balance sign-off.
