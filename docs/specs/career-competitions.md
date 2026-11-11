# Career competitions: execution contract

Version 1, 11 November 2026. Implements the contract deliverable in
[#569](https://github.com/ch-leon/nrl-sim/issues/569), under
[#323](https://github.com/ch-leon/nrl-sim/issues/323). Product intent and the open
event catalogue live in the
[Notion specification](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0).
This file owns the implementation boundaries and prototype configuration. It
does not report that a competition career has shipped or been balanced.

The user authorised execution on 11 November. The numerical settings below are
the initial prototype, not measured balance or a promise about the final game.
Changing them requires updating their definition version and recording why.

## 1. Audited baseline

Source: [9985b290](https://github.com/ch-leon/nrl-sim/tree/9985b290181bbff2080305638963a3b1dfda72a3),
11 November 2026. Recheck current main before each implementation PR.

| Surface | Actual baseline | Implementation consequence |
| --- | --- | --- |
| Player/schema | Six stats, stars, potential ceilings, XP and academy potential are merged; `SAVE_VERSION = 24`. #536/#537/#538/#539/#545 are closed. | Do not rebuild these features or introduce v23 player migration. Preserve IDs, ceilings and XP. |
| Cash/cap | Player `wage` and `contractWeeks` still represent the old weekly economy. #555–#562 are open; finance D1–D5 remain unresolved. | Annual cap is the intended contract, not current runtime. Do not claim paid rewards or salary-cap prizes are complete before their finance prerequisites. |
| Time | `core/time.ts` runs one ordered interval pipeline, including grouped player/rival match holds. | A competition round never starts another training, recovery, contract or event tick. |
| Results | `systems/fixtures.ts:applyResult` changes the ladder without its own duplicate guard; `rivalRound.ts` has a separate result guard. | One fixture finalisation owner must replace these separate acceptance paths before multi-competition playback is active. |
| Live saves | `core/save.ts` refuses held-state writes; exports use the interval-start snapshot plus a live-match sidecar. | Preserve that boundary. A partially applied result/award/XP state cannot become the recovery snapshot. |
| Match identity | Recovery matches season/week/round/home/away; the completion listener compares a smaller subset. | Propagate canonical instance/fixture identity through every completion, skip, worker and recovery path. |
| Knockout | Bounded golden point, then the existing final advances home/higher seed. No shootout exists. | New cups need an explicit finite decider; store advancement separately from the actual score. Legacy finals retain their behaviour until adapted. |
| Events | `events.ts:absWeek` derives elapsed time from season × current season length. | Variable calendars need a monotonic elapsed-interval count; changing template length must not rewrite cooldowns. |
| Validation | `saveValidation.ts` independently bounds the career week and legacy fixture rounds at AU 27 / UK 25. | Keep both checks for legacy/dormant careers; validate active-career slots and competition rounds against their saved definitions. |
| Rival selection | The cheap rival path can generate a strength-based sheet for an unfieldable side. | This cannot silently supply an eligible youth team or a new tournament player. |

The open match-art PR #584 changes presentation/orchestration and QA helpers,
but not core state/save/time at the audit date. Rebase its changes when relevant;
do not rewrite its artwork or duplicate its QA fixes in a career PR.

## 2. Ownership and dependency gates

Keep the existing folders, single JSON-serialisable `GameState`, exported system
operations, ordered hooks, deterministic RNG and offline game loop. There is no
second career store, remote service dependency or generic application framework.

| Owner | Responsibility | Prerequisites / limits |
| --- | --- | --- |
| #570 | Optional competition state, definition snapshots, stable IDs, boundary validation | #536 is merged. Metadata remains dormant until calendar/match integration can run it. |
| #571 | Calendar, monotonic interval time, guarded fixture completion and recovery integration | #570; no new cash policy or promotion implementation. |
| #573 | Regional division definitions and deterministic club/squad setup | #570; #537/#538 are merged. No annual budget guessed from legacy weekly wages. |
| #575 | Open Cup draw, byes, ties and advancement | #571/#573. Emit sporting outcomes; finance settlement is #576. |
| #572 | Real sale destination, ownership, market continuity | #570/#538 and finance #558. No imaginary buyer cash or free sale payout. |
| #574 | Frozen season review, promotion/relegation, integrated rollover | #571/#572/#573 plus #557/#558/#545. No second ageing/board cycle. |
| #576/#577 | Reward ledger, earned-cap entitlement | #559 for fixture cash; #557/#560 for the shared annual cap. |
| #578 | Competition/history views | Its recorded sporting/finance dependencies; follow existing UI conventions and supplied mockups. |
| #579/#580/#581 | Shield, youth festival, later title series | Their recorded prerequisites; do not enable incomplete event rules. |
| #582 | Foundation release proof | Progression #547, finance #562 and the foundation implementation. |

Structural work may proceed while financial tuning is pending. Money, contract
and cap mechanics that depend on it remain disabled rather than approximating
the new rules through the old weekly wage calculation. The existing game remains
playable during this sequence. One focused issue per PR; sequence shared
state/save/time changes even if their functional dependencies differ.

## 3. State, definitions and identity (#570)

Add optional `GameState.competitions` metadata with an internal schema version
and season instances. Its absence means the supported existing single-league
career. Presence alone must not activate a calendar or enable an unsupported
format. Runtime activation belongs to #571/#573 and the local new-career rollout,
not a remote presentation flag.

`src/data/competition.ts` owns pure types and definition/snapshot construction.
The content pack may expose a competition catalogue. Definitions contain:

- Stable ID, definition version, regional pack and display name.
- A discriminated format: league, knockout, group, series or exhibition.
- Explicit stage IDs, round bounds, entrant bounds and calendar-slot bounds.
- Match/venue/eligibility and finite tiebreak policies needed by that format.
- Typed reward declarations. Cash may refer to a named match-base multiplier;
  unspecified finance values cannot become effective amounts.

An instance copies the applicable definition: a catalogue update cannot change
an entered event's match rules, eligibility or promised prize. It records a
stable instance ID, season, entrant club IDs, lifecycle/stage and fixture records.
An optional schedule assignment can be filled later. Lifecycle transitions are
validated operations, not screen-owned object edits. Offered/qualified events
can be entered or declined; scheduled/active events can complete or withdraw;
completed/declined/withdrawn events cannot be re-entered in that season.

A fixture records its own immutable ID, parent competition-instance ID, stage,
round, home/away club IDs, optional assigned calendar slot and status. Store the
actual score separately from `winnerId`/decider. A drawn knockout score with a
published tie-draw winner is legitimate; inventing an extra point is not.
Cancelled/byes do not masquerade as completed played matches.

Generate instance IDs from stable definition/season/ordinal identity, and fixture
IDs from the parent instance plus fixture ordinal. IDs never derive from a club
name, score or assigned date. Use isolated seeded streams for draws and frozen
ordering; metadata factories do not advance the live match RNG.

Club IDs reference the existing canonical career club registry; competition
entrants never copy player objects or become another roster owner. A live player
must remain in exactly one squad or unsigned pool. The future division model
expands that registry rather than generating a fresh squad per competition.

Boundary validation rejects duplicate IDs, unknown/mismatched club references,
self-matches, wrong pack/season, invalid format/stage/round/slot, non-finite
numbers, invalid result/decider/winner combinations and impossible entrant counts.
Validate typed snapshot fields; an arbitrary JSON object is not a rules contract.
Never repair a corrupted bracket by silently rerolling its entrants or results.

### Supported-save transition

Read the actual version when starting #570. At this audit it is v24, so the next
narrow metadata migration is v24 → v25, retaining every existing player and
competition absence. It does not convert a legacy league into a pyramid, change
cash/contracts or construct a new career. Preserve its original through the
current recovery mechanism before writing the upgraded slot. A concurrent merged
schema change requires renumbering and rebasing, never reusing its version.

The approved pre-v24 restart/export boundary stays intact: no v23 → v24 player
migration is added. Corrupted/future imports leave the occupied career unchanged;
normal/developer namespaces remain isolated. AU and UK each need round-trip and
failed-import coverage. Changing dormant metadata does not weaken the live-match
held-save boundary or enable an unsupported loaded format.

## 4. Calendar and exactly-once completion (#571)

Each calendar interval has a slot ID independent of competition round numbers.
One club has at most one fixture in an interval. League and cup may overlap in
the season, but the initial implementation has no same-slot doubleheaders.

The calendar owner selects the slot, runs interval hooks once in their existing
order, holds for player/rival match work, accepts all valid results and completes
the interval once. Reuse the current hold/resume pipeline; do not call
`advanceWeek()` inside a cup or dispatch a second entire hook pipeline for a tie.

Use a monotonic elapsed-interval counter for event cooldowns and expiry. Its
meaning survives season/template changes; do not recalculate old elapsed time as
`(season - 1) × newSeasonLength`. This counter is a #571 schema change, not a
reason for #570 to invent an active second clock.

One guarded finalisation operation accepts canonical instance/fixture identity
and match output. Before any effects, reject stale, cancelled, already completed
or mismatched fixtures. It commits actual result, advancement and once-only
effect identities. Stats, XP, injuries and ladder totals run only through this
operation. Financial effects have a separate idempotent settlement owner (#576):
it consumes the immutable sporting outcome and saved reward policy, writes its
own award receipt, and never replays match finalisation to pay a pending award.
Rejecting a duplicate match result therefore does not prevent a legitimate
unsettled award from being settled once.

Structural developer fixtures may precede finance delivery, but they explicitly
carry no effective financial award. They cannot be offered as a normal paid
competition, fall back to legacy money rules or become retroactive prize claims
after a finance update. Normal entry requires a resolved snapshotted reward
policy and its settlement implementation. If a real award is pending, its saved
intent/identity survives reload and is consumed once by #576, independently of
the completed fixture's duplicate-result guard.

UI callbacks, rival workers, watched matches, skip, fast-forward, forfeits and
recovery use that same operation. The existing unguarded `applyResult` cannot
remain an alternate multi-competition completion route. Store a committed result
or effect receipt before exposing repeatable presentation callbacks.

At a held match, keep saving/exporting the interval-start state plus sidecar.
Extend sidecar matching and snapshot equality with the instance/fixture identity
and slot; include the existing seed, engine identity and match rules. A restart
after an incompatible engine update replays the same fixture from the retained
interval start, not a partially paid/levelled career. Test repeated completion as
well as reload before and after the final committed interval.

Byes, rests, declined events, abandoned/cancelled ties and a series' unused games
produce no appearance income, gate, match XP or invented statistics. Automatic
advance over quiet slots must still honour required interval/event stops.
Preseason slots have explicit hook eligibility: do not accidentally reuse the
legacy `inTrials` filter to suppress all new-career interval work.

## 5. Prototype configuration and structural calibration

Profile `career-3x8-v1`: three divisions within each regional pack, eight clubs per
division, 14 home-and-away rounds. Every division has semi-finals 1 v 4 / 2 v 3
and a grand final. Higher seed hosts a semi-final; grand finals are neutral. One
champion promotes, one last-placed club relegates from the division above; bottom
tier has no disappearance/relegation outside the world. Premier champions stay.
Finishing first earns a distinct minor-premiership honour.

| Slots | Role | Fixtures per participating club |
| --- | --- | --- |
| 1, 4 | Trials; later replaced by a selected preseason event | 2 initially |
| 2, 3 | Preparation/rest; available to the later youth group stage | 0 initially |
| 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 22, 23 | League rounds 1–14 | 14 |
| 7, 10, 13, 16, 19 | Open Cup opening round through final | 0–5 |
| 24, 25 | Division semi-finals, grand final | 0–2 |
| 26–28 | Later Champions Series only | 0–3; stop on two wins |

Every slot 1–25 appears once in the initial template. A finalist without an
opening cup bye can play 14 + 2 + 5 + 2 = **23 matches across 25 intervals**.
Three eight-club divisions have 3 × (8 × 7) = **168 league fixtures**, nine
division finals, 23 ties in a 24-entrant cup and 24 trial fixtures: **224 world
fixtures** if all enter. This is structural arithmetic, not measured playtime or
evidence of good balance. Reduced cup fields right-align their stages to cup
dates, leaving unused early dates as rest.

Data validation must also accept other legal field/round counts; the arithmetic
above is not a licence to embed 8, 14, 25 or 28 in screen logic. Schedules retain
explicit round/stage/slot bounds in their saved profile. Author additional
fictional regional clubs rather than treating AU and UK as ladder ranks.

Standings: points (win 2/draw 1), points difference, points scored, then a
head-to-head points from all regular fixtures between members of the frozen
still-tied group. If still tied, use a seeded ordering frozen before the season.
Do not recursively re-form that cohort or implement head-to-head as a pairwise
sort comparator: three-way ties can otherwise be non-transitive.

For new knockout ties, use the existing bounded golden point, then a seeded
tie-draw ordering fixed at draw creation. Store its winner separately from the
drawn score and label it before entry. No shootout is claimed or added; the
competition policy never changes the match's goals/tries. Record this policy
change when adapting legacy league finals.

## 6. Event eligibility, withdrawal and prizes

The Open Cup admits all willing clubs in the current regional world. For 24
entrants, draw a 32-slot bracket with eight byes and no bye-v-bye tie. Fewer than
two entrants means no event or title reward. Decline is free before draw;
withdrawal after draw resolves unplayed ties under a displayed forfeit policy,
without match XP, gate or appearance income. Already played outcomes stand.

The first cut retains existing Nines lineup/injury rules. Reject ineligible
rosters before match construction; do not use the cheap rival generator to
manufacture missing actual players. The later Rising Stars event registers 13 fit
players with at least seven aged ≤21, five youth starters and two youth bench
players. Voluntary replacements preserve five youth on field; injury/sin-bin
exceptions and free withdrawal are explicit. An all-youth squad is legal.

| Event | Extra reward proposal | Activation / prerequisite |
| --- | --- | --- |
| Open Cup | Actual round wins: 1M / 1M / 2M / 3M / 5M; win reputation and a title honour | Cash needs #559/#576. M is finance's division match-base payment, not legacy weekly wages. Byes pay zero. |
| Sponsor Shield | First title +5% annual base-cap capacity; repeated titles cash/honours | #557/#560/#577; next-season activation, unique club-career reward key. Proposed earned limit 10%; no automatic second 5%. |
| Rising Stars | Academy-labelled cash, scout report on a real unsigned prospect | #539/#544/#545 and #580; no gifted superstar or raised ceiling. |
| Champions Series | Published played-game cash, title/finalist cash and honour | #581 later; no award for unplayed third game or a missing opponent. |

Ordinary fixture income and extra prize income are different award kinds.
Neutral gate allocation and the division basis of M must be snapshotted and
agreed with finance; neither club may receive a duplicated full gate. Reward IDs
include instance, season, recipient, stage and kind. A first-title entitlement
uses an additional persistent career-wide key, so changing division/name cannot
grant it again. Effect receipts and entitlement activation are replay-safe.

Use the finance owner's annual cap and season-indexed commitments. Purchased and
earned percentages are additive against the same division base only if D5
adopts that proposal. The combined limit, currency, relegation/grace and AI rules
are genuine pending inputs. No competition operation charges annual salary to
cash, reprices an active contract or quietly releases a player to fit a limit.

## 7. Integrated rollover

Current baseline order increments counters first, then review snapshot (1),
player/free-agent ageing (5), youth intake (6), sporting/board and rival rollover
(10), tenure (12), final review (15), new goals (20), trip events (25).
This already has owners; adding another rollover pipeline is forbidden.

#574 must freeze the completed season's sporting state before clearing it, settle
due outcomes once, record honours/review, compute all movements from that frozen
snapshot, activate next-season entitlements, age/retire/intake once, transition
contracts and create the next schedule/goals. Refactor the existing hook order
where necessary. Every later hook reads a documented completed-season or
new-season view; do not rely on whichever state a previous hook happened to
overwrite. The optional title series must finish or terminate before this runs.

Keep player IDs and history across club moves. A cancelled/failed sale changes
nothing; an actual sale needs a recorded buyer, fee, available funds and cap
validation from #558. Releasing is the separate finance payout operation and
returns the same person to the durable unsigned population. Market refresh is a
visibility change, not deletion of people or regeneration of their potential.

## 8. Calibration inputs and release evidence

| Input / experiment | Owner | Required evidence |
| --- | --- | --- |
| Annual caps, start cash, fees, release, retained costs and old-career finance treatment | #556–#558 | Recorded D1/D2 decisions and validated accounting; no conversion from guessed wage multipliers. |
| Base match payment M, neutral/byes/trials eligibility, facility mapping | #556/#559 | Published eligibility and income table, losing-club viability and once-only awards. |
| Purchased + earned capacity and relegation commitments | #556/#560/#577 | Combined limits, season timing and player/AI rules; first/repeat-win cases. |
| XP rates and seasonal development | #541/#547, then #582 | Current targets: +3–4 mid-career / +6–8 young high-potential overall under agreed setups, no ceiling breaches. |
| Optional-fixture XP | #547/#582 | Compare no events versus full participation; ≤20% extra baseline match XP is a hypothesis, not an implemented cap or proven value. |
| Shorter schedule and tier strength | #569/#573/#582 | Existing season/progression reports, phone duration and credible failure/recovery after a missed promotion. |

Use the existing soak, personas, QA/save corpus and progression reporting seams.
No throwaway match-sim measurement harness and no retuning live match rules just
to make a new league harder. Report results against a pinned source revision and
separate proposed inputs from measured outputs. At this baseline finance has no
annual-cap implementation and #541/#547 are open, so full career-economy/XP
calibration cannot truthfully be claimed by #569.

The minimum structural checks are template coverage/no club double-booking,
complete home-and-away pairing, 23 decided cup ties, legitimate byes, stable
IDs/snapshots, corrupt-import preservation, one-time finalisation and finite ties.
The foundation release adds actual watch/skip/worker/recovery equivalence,
promotion/rollover and multi-season finance/XP evidence for AU/UK on all supported
difficulties. Test losing/average/recruitment-first/academy-first/cap-first clubs,
with entrants and decliners. Add youth substitution and early-series termination
checks when those formats are enabled.

Run repository-required TypeScript/Vitest/build, PR CI/WebKit and QA gates. A
reviewer using a different tool checks the issue's completion criteria and diff;
a same-tool subagent inspection is useful but does not replace that requirement.
Observe a losing season, cup run and promotion on a phone before enabling the
overlapping-competition prototype by default. Merge still follows AGENTS.md.

## 9. Extension rule

Community Shield, derby aggregate trophy, salary challenge, homegrown cup,
weekend festival, Giantkillers Cup, anniversary exhibition and international
invitational remain design seeds in Notion. No five-event limit is imposed.
Before enabling another event, define its decision, entrants, dates, eligibility,
finite results, reward policy, seasonal XP/load cost and regression proof. Reuse
the shared lifecycle; extra match rules or a wider international world require a
separate scoped specification.
