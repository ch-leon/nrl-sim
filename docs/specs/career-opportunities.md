# Career opportunities: leagues, assignments and special events

Product design v0.2 · 16 November 2026 (Australia/Brisbane).

Execution update, 18 November: player continuity shipped through
[PR #716](https://github.com/ch-leon/nrl-sim/pull/716), and league selection #574
shipped through [PR #719](https://github.com/ch-leon/nrl-sim/pull/719), merged at
`a448210c`. The live League career includes permanent title unlocks, deliberate
annual entry and retained club cap capacity. [Release evidence](../status/2026-11-league-selection.md)
records independent review, CI/full QA and public confirmation/reload verification.
The normal optional Open Cup, prizes and receipt-backed views are implemented in
[PR #736](https://github.com/ch-leon/nrl-sim/pull/736). The [Open Cup evidence record](../status/2026-11-open-cup.md)
records local verification and the required PR release gates.
Its initial prize values are for testing, with wider #582 balance still open. The first
assignment, Skills Camp, shipped in [PR #742](https://github.com/ch-leon/nrl-sim/pull/742).
The watched/coached individual challenge [#710](https://github.com/ch-leon/nrl-sim/issues/710)
now has an implementation candidate: [Big Mick's rules](individual-challenges.md),
[exact engine and measured tuning](individual-challenge-engine.md), and
[verification evidence](../status/2026-11-individual-challenges.md). Three carry/defend
duels lead to a finite bonus if tied; Showground and a permanently unlocked Invitational
both have annual entry windows, actual player absence, XP and cash receipts, and personal
honours. The [readable Notion guide](https://app.notion.com/p/41d0870d4c44813888c3c05c3b8ad833)
records every mechanic. Further assignments, the distinct small-sided event
[#711](https://github.com/ch-leon/nrl-sim/issues/711), sponsors and gear remain later work.

**Status:** Leon approved the direction and requested this specification. This
records that agreement; event names, numerical balance and unimplemented delivery
slices remain working designs, not separately approved implementation details.
The execution update above identifies what has shipped; it does not claim that
the full opportunities catalogue is delivered or balanced.

Canonical product record: [Notion competition specification](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0).
This repository copy supplies the design to developers alongside the
[technical contract](career-competitions.md), [updated plan](../plans/2026-11-career-competitions.md)
and [delivery evidence](../status/2026-11-career.md). Continue under
[tracker #323](https://github.com/ch-leon/nrl-sim/issues/323).

## 1. Experience and agreed decisions

A believable rugby club lives in a playful Kairosoft-style sporting world.
Build a squad, earn access to harder leagues, choose what to enter each season,
and send players on smaller adventures around the main competition. There is
always something useful or delightful to pursue, without needing to enter everything.

The agreed direction is:

- The coach chooses an eligible main league each season. Winning unlocks harder
  leagues; it does not automatically move the player club into one.
- Main leagues stay believable. Optional cups, unusual formats, eccentric
  opponents and rewards make the wider world playful.
- Competitions open during particular parts of the in-game year. Deadlines and
  overlapping commitments create choices and can mean missing an event that year.
- Send an individual, a selected group or the team to events or training. Players
  away on assignments can miss club matches, creating opportunities for reserves.
- Individual challenges include watching and coaching. Direct-control minigames
  are not the chosen direction.
- Rewards can develop a player and the club: XP, traits, badges, sponsors,
  salary-cap opportunities, honours and access to further events.
- Boots, headgear and other gear with boosts are a later expansion.
- Recurring events, connected invitations, familiar opponents and personal goals
  should keep careers interesting after the first top-league title.

Example: send a reserve prop to Big Mick's challenge, cover his absence at home,
coach him through the rounds, then bring back XP, a champion badge and a sponsor
opportunity. Next season he qualifies for a tougher challenge while his understudy
competes for a permanent league place.

## 2. What changes from the previous plan

| Previous assumption | Revised requirement |
| --- | --- |
| A title automatically promotes the player; finishing last relegates them | A title grants a lasting league unlock. The coach selects next season's eligible main league. Poor results do not erase earned access. |
| A linear three-division climb defines the career | Three strength tiers remain useful prototype content; the catalogue can branch into other leagues and invitations. |
| Every event is a full-club Nines competition | Keep Nines for main leagues and the Open Cup; introduce individual contests, training assignments and small-sided formats through their own scoped rules. |
| The club can never have simultaneous competitive commitments | Its main team still cannot play two fixtures at once. Separate, disjoint player groups may attend an assignment while a legal main team plays. |
| The first five competition families define delivery | Retain those events, and add assignments, a watched individual challenge and a genuinely different team event as planned capabilities. |
| Rewards mainly mean club cash/cap/honours | Include player development, traits, personal badges, sponsors and invitation chains; equipment follows later. |

The v0.1 automatic promotion/relegation rules remain historical prototype context,
not instructions for the revised player career. The first selectable world's AI
allocation and legal fields shipped in #574 under the explicit policy in §10.
Existing finance, player continuity, deterministic results and recovery requirements
continue to apply unless explicitly changed here.

## 3. Choosing leagues and earning access

Working structure: one main league per club per season, plus optional cups and
assignments. Local, Championship and Premier remain starting labels, not a final
catalogue or fixed league count. AU and UK remain regional identities, not difficulty tiers.

At season planning, show all currently available league choices and discoverable
future leagues. Each entry explains its strength, format, dates, eligibility,
budget basis, rewards and what winning unlocks. Strength and eligibility are
different: the coach may enter an unlocked league even when the squad is an underdog.

League access is permanent within that club career once earned. A time-limited
invitation is separate and may require a recent result. An expired registration
window closes this year's entry, not the lasting unlock. Requirements must name
the exact achievement, such as a finals title; a minor premiership is a separate honour.

The coach may stay in an easier league to rebuild or pursue another ambition.
Its published rewards remain appropriate to that level; easier titles cannot
repeatedly grant a first-win upgrade. Do not silently scale opponents up to match
the squad or force a harder league because the club won.

Before confirming, preview the club's projected annual capacity and existing
commitments using the finance system. **Approved 18 November 2026:** choosing an
easier league does not reduce the club's capacity. Higher-tier entry can raise its
base, which remains with the club on later downward moves. Apply this to player
and AI clubs, preserving purchased/earned additions and lawful exact-term
protection. Downward movement grants no new protection. New signings and renewals
still need ordinary cap room. Entry cannot silently release players, rewrite
contracts or charge annual salaries to cash.

Keep at least one accessible entry route each season. Time cannot advance past
the initial league-choice gate without a deliberate valid selection. Once confirmed,
snapshot the field and rules; no mid-season league shopping or rerolled opponents.

The shipped first profile has three eight-club leagues per region, 14 regular
rounds, top-four finals and a 25-slot calendar. A fresh career stops at initial
choice; season end closes the completed year before the next choice. Annual
confirmation applies people/contract updates and accepts the next field once. No cup is
registered implicitly in this League career. These are current authored values,
not a limit on later profiles or proof of wider pacing/balance. Income follows
the selected sporting division independently of retained club capacity.

## 4. A calendar with meaningful trade-offs

Use game time, not real-world dates, login streaks or waiting timers. A calendar
interval is independent of a league round. The existing 25-slot structural
prototype is an input to pacing tests, not a promise about final year length.

| Seasonal window | Example opportunity |
| --- | --- |
| Planning/preseason | Choose the main league, trials, youth festival, beach trip or a training camp |
| Main season | League fixtures, cup dates and short individual assignments |
| Midseason festival | Forward challenge, kicking contest or a small-sided tournament |
| Run-in/finals | Main sporting targets; deliberately costly opportunities to send a star away |
| Season end | Champions invitation, touring event, awards and next-year unlock preview |

Each offer has a registration window, start and return boundary, participant
requirements and an explicit commitment. Show known windows early enough to plan.
Discoverable locked events show their requirements; a mystery invitation may hide
its opponent or flavour until discovery, but never its rules or costs at acceptance.

Three conflicts have different treatment:

1. Two main-team fixtures clash: block entry or offer an explicit legal alternative.
2. The same player is assigned twice: block that selection; name the conflict.
3. An assignment overlaps a club fixture: allow it if the remaining squad can
   meet known lineup requirements, and list the affected fixtures and absentees.

Reserve the full published commitment, including possible later rounds, so an
unexpected cup run does not create an invisible scheduling conflict. Event-specific
early return after elimination must be stated. Registration rechecks availability
atomically; a preview is not a reservation.

Repeat major opportunities in later years. Missing this year's beach event should
create a plan for next season, not permanently remove a large part of the game.
Rest and declining remain valid choices. No obligatory stream of event pop-ups.

## 5. Sending players on assignments

The first approved implementation is [Skills Camp](player-assignments.md), tracked
in [#708](https://github.com/ch-leon/nrl-sim/issues/708). Book one free place in
Weeks 1–4; the player misses the opening league fixture in Week 5 and returns
before Week 6 selection. Its starting award is 70 base XP replacing ordinary
training, with existing progression modifiers and ceilings. Leon chose this
opportunity and requested the early window on 19 November. Implementation and
recovery/balance evidence are in progress; this is not a shipped-feature claim.

An assignment belongs to real player IDs in the existing squad. It does not
create a second copy, transfer their club ownership or generate a replacement star.
Its saved record owns its participants, dates, rules, progress, coaching choices,
return state and reward outcomes.

The player-facing loop is:

1. Discover an opportunity and inspect its requirements, risks and rewards.
2. Choose eligible participants and see who covers their club places.
3. Confirm the commitment after checking fixture clashes and return timing.
4. Continue managing the club; stop at meaningful event/coaching moments.
5. Watch and coach a contest, or receive a concise training progress report.
6. Welcome the players back with a factual result, development and saved honours.

Assignments may last one interval or several. Initial ideas include a specialist
kicking camp, community coaching tour, elite training invitation and sponsor
exhibition alongside competitive events. Exact durations and effects belong to
the event's definition, not to the flavour of a news message.

Away players are unavailable to club selection and other assignments. Enforce this
in manual lineup, auto-pick, bench, training, skip and background result paths.
An assignment's training/recovery policy substitutes for ordinary activity where
applicable; it never gives an extra global weekly tick or duplicate training reward.
Define return timing as an explicit calendar phase before or after fixture selection.

Before departure, cancellation follows the disclosed entry policy. After departure,
each event declares whether recall is possible, when the player returns, and what
is forfeited. Injuries or bans after registration trigger a legal replacement or
withdrawal policy, never a generated stand-in. Protect pending assignment ownership
during a sale/release; the transfer slice must define and enforce the handoff before
allowing it. Terminal failures must return affected players and explain the outcome.

The initial small-sided events use selected groups from the existing squad. A
separate reserve-team simulation is not required.

## 6. Watching and coaching special events

Individual contests must contain short animated action and meaningful coaching
decisions with visible consequences. They are not just a result card or a direct-control
action game. Use skippable introductions, readable opponents and a quick rematch rhythm.

The first implementation is **Big Mick's Break the Line** ([complete rules](individual-challenges.md)):

- Select one player using relevant abilities, traits and current condition.
- Inspect the next opponent and choose an approach such as power, footwork or
  conserving energy. Carry choices are Power through, Change the angle and Controlled
  carry; defence choices are Shoot the hit, Track the hips and Set and wrap. Each has
  a measured reachable title advantage, with published energy costs and odds.
- Watch a short carrying/tackling round; read why it succeeded or failed.
- Coach between rounds in response to the opponent and remaining stamina.
- Complete a finite final/decider and return with the published rewards.

Kicking events use attempt choice and confidence; beach/fives events use lineup,
rotation and combinations. Each format earns its own decisions and presentation.
Sand, crowd, floodlights, eccentric hosts and a podium distinguish events visually.

At a coaching checkpoint, game advancement pauses until the coach chooses or
explicitly selects auto-coach. Fast-forward must not silently miss decisions.
Skipping an action only skips its presentation and stops at the next coaching checkpoint.
Explicitly finishing with auto-coach uses the saved policy and the same simulation;
watching and skipping with identical seeds and choices produce identical outcomes.
Automatic coaching must be viable, without an exclusive watch-only prize.

Save event identity, progress, random state and choices at supported boundaries.
Reloading or replaying a celebration cannot reroll a completed round or award its
prize again. On an incompatible event-engine update, use an explicit recovery
boundary and retain already committed rewards; do not leave a player away forever.

## 7. Working event catalogue and connected opportunities

The Open Cup uses the initial test policy in §10. The remaining names, formats
and rewards below are design candidates. This is a broad catalogue,
not a promise that every row ships together. Each event needs authored rules,
eligibility, calendar load, finite outcomes and measured rewards before activation.

| Event | Entry and distinctive decision | Reward direction / next ambition |
| --- | --- | --- |
| Open Cup | Full club; cross-league knockout and giant-killing opportunities | Round cash, reputation, trophy |
| Sponsor Shield | Short comparable-strength invitational | Sponsor opportunity and a bounded first-title cap entitlement |
| Rising Stars Festival | Youth participation and guaranteed group matches | Player development, academy-labelled cash, real prospect scouting |
| Champions Series | Earned qualification; adapt across a short series | Prestige, honours, a club display |
| Budget Cup / Salary Challenge | Restricted registered squad budget | Recruitment/tactical achievement and prize cash |
| Homegrown Trophy | Club-trained participation | Academy identity and honours |
| Big Mick's Break the Line | One player; country-show carrying/tackling rounds | Substantial individual XP, Personal champion badge, supported club prize and harder playable invitation; sponsor access is a later candidate |
| Sunset Beach Fives | Selected group; sand, short games, limited kicking, lifeguard opponents | Team development, beach trophy, island-circuit invitation |
| Floodlit Fives / Floodlight Cup | Small squad; open space and quick turnarounds under lights | Cash, development, neon trophy, elite edition |
| Golden Boot Island | One kicker; limited attempts, wind and awkward angles | Kicking development, specialist coaching; distinctive boots only after gear ships |
| Fastest on the Field | One runner; heats and an agility final | Development, personal honour, boot-sponsor opportunity |
| Club Skills Relay | Passing, kicking and running roles shared by a group | Shared development and a balanced-squad achievement |
| Legends Invitational / Old Boys' Last Stand | Skilled veterans with limited stamina | Mentor opportunity, classic kit and club history |
| Big Blokes Invitational | Forward-only small-sided eligibility | Forward development and a distinctive sponsor |
| Underdog Express | Travelling event for overlooked/developing players | Reserve-player breakthroughs and invitations |
| Mystery Invitational | Discovered through prior achievements; rules revealed before accepting | Rare opponents, decoration or personal title |
| Training and community assignments | Individual/group development or local appearances | Specialist progress, local support and sponsor relationships |

Community Shield, Derby Trophy, Weekend Festival, Giantkillers Cup, Anniversary
Exhibition and an international invitational remain additional seeds from the
earlier plan. Travel can initially be a stated time commitment and setting;
an international simulated league world is a separate scope decision.

Example chain: local beach festival → island invitation → island circuit →
reigning beach champions. Define the qualifying achievement for each link. Entry
can be a milestone without winning every event; harder main-league unlocks still
follow their explicitly published title requirements.

Recurring named opponents and hosts retain stable identities and honest results.
Never rig a draw, invent a previous win or alter a rival's outcome to force a story.
After completing a chain, retain its history and offer replay, alternate squad,
collection or title-defence goals instead of endlessly inflating enemy stats.

## 8. Rewards, progression and later gear

| Reward | Purpose and boundary |
| --- | --- |
| XP | Develop the recipient through existing progression and fixed potential ceilings. A substantial event award is visible and earned, not unbounded stat growth. |
| Trait | A defined gameplay speciality with prerequisites, compatibility/stacking rules and a documented effect; no arbitrary new stat system. |
| Badge/title | Visible personal or team achievement; cosmetic by default. Any gameplay effect must be declared separately as a trait/effect. |
| Sponsor | A concrete offer or unlock with disclosed terms; accepting an opportunity and receiving money are distinct outcomes. |
| Cash | Existing club currency and reward ledger; no new mandatory event currency. |
| Cap entitlement | Existing annual-cap system, disclosed activation season and duration, career-wide first-win identity and shared earned limits. |
| Honour/display/kit | Lasting club identity in history, grounds or presentation. |
| Invitation/access | Opens a next goal, with permanent unlocks distinct from annual qualification. |
| Gear — later | Boots/headgear with visible, preferably situational boosts. Requires a separate equipment, effect and balance design. |

One event may reward both player and club: the prop gets XP and a badge while
the club receives a sponsor opportunity. Do not promise every type for every event.
Specify first-win and repeat-win rewards before entry. Repeated titles can award
cash, bounded XP and honours, but not stack the same permanent club upgrade.

Reconcile large challenge awards and specialist training with the existing XP
targets and non-league allowance experiment. The previous 20% suggestion is a
hypothesis, not a settled cap that silently cancels an advertised prize. Publish
any limit before entry and measure whether the payout feels worthwhile.

Cap rewards remain capacity, not cash, and use the same finance owner as purchased
upgrades. Reconcile all event sources against a single earned-cap limit rather than
letting each event add its own unlimited allowance. Neither loss nor an expired
sponsor may silently rewrite signed contracts.

The game must remain viable for clubs declining optional events. Novelty prizes
must not make participation compulsory or turn easy repeat events into the best
route to unlimited XP, cash or cap. Gear is not granted as an unusable inventory
item before that feature exists; use an implemented reward or hold that offer back.

## 9. Finding the next fun thing

Extend the existing club and competition screens with an opportunities catalogue,
integrated calendar, assignment details and personal/club histories. Avoid a second
unrelated navigation system. Follow the current supported phone orientation
(landscape since #690), with the existing text-size settings; statuses use words
as well as colour. Career work does not reintroduce portrait gameplay.

Show four useful horizons without presenting four mandatory chores:

- Soon: a challenge or assignment whose entry window is approaching.
- This season: the selected league ambition and optional cup target.
- Longer term: a harder league, invitation chain or trophy collection.
- Personal: a favourite player's badge, speciality or development goal.

An opportunity card shows availability, requirement, dates, participants, expected
opposition, rewards and commitment. Before confirmation, show the concrete squad
and fixture consequences. The calendar and lineup name away players and return dates.
Result screens explain what happened and what it opened; history preserves the
person's achievement through rename, sale and retirement.

Use restrained notifications for registration decisions, coaching moments, returns
and material unlocks. Routine assignment progress belongs on the club screen.
Training reports can be concise; major contests get the spectacle. Let players
browse the catalogue without hiding essential details behind surprise pop-ups.

## 10. Implementation boundaries and unresolved design gates

Historical source audit for the 16 November revision (`85dcd195`): developer-only regional
worlds and Open Cup sporting flow exist; normal selectable league entry, player
assignments, event coaching and rewards described here are not established by
that source. Current delivery is described in the execution update above, not
this historical snapshot.

Reuse the single GameState, persistent club/player registry, versioned definition
snapshots, stable IDs, guarded result finalisation and separate idempotent reward
settlement. Add typed eligibility, unlock and assignment records through the
existing save owner. Individual rounds need stable contest identities; do not fake
them as league fixtures or let them change league statistics.

Main-team fixtures keep their existing collision invariant. Assignment scheduling
adds participant-level reservations, separate event stages and per-player availability.
Do not simply remove the club-level guard to permit overlap. Both flows use one
calendar clock and explicit phases; action at a coaching checkpoint does not age
the world or run training again. Validate IDs, phase order, ownership, dates,
eligibility, choices and award receipts on load/import.

Content defines events; targeted resolvers implement the different formats. Nines
can serve existing cups, but beach/fives and individual contests need their own
specified rules and playback. Do not assume changing on-field player count alone
makes the current match engine support them. No generic plugin framework is required.

The first League career resolves the scoped entry rules below. Remaining event
details must be resolved in their own implementation designs:

| Gate | Required decision before enabling dependent behaviour |
| --- | --- |
| Selectable-league world — implemented in #574 | Staying keeps fields unchanged. An upward choice moves the lowest-ranked AI in each crossed higher field down the vacancy chain; a downward choice moves the highest-ranked AI in each crossed lower field up. Use the original completed fields and published regular standings/frozen tiebreak. These are administrative allocations, not forced player promotion or player transfers; preserve unique membership and disclose movements. Broader invitation/willingness policies remain future design. |
| Calendar profiles — league phases implemented | Initial choice, active calendar, completed-season choice and once-only annual acceptance are implemented for the authored 25-slot League profile. The Open Cup adds a Week 6 registration cutoff and Weeks 7/10/13/16/19. Other registration windows, concurrent-event phase order and wider pacing still require scoped decisions. |
| Finance transition — League rule implemented | Retain highest attained club capacity for player and AI clubs, including purchased/earned additions and lawful exact-term protection. Downward entry creates no new protection. Validate dated commitments before acceptance; income follows sporting division. Future event prices/rewards remain with the finance owners. |
| Open Cup — initial test policy | Free annual enter/decline/change through Week 6; deterministic 24-club or 23-AI draw. A queued withdrawal forfeits the next actual tie on its date. Played-win prizes 1/1/2/3/5× saved sporting match base, +1 reputation per win and +2 more for a played-final title, with the full registered-squad honour. No cap entitlement. Release status is in the Open Cup evidence record. |
| Assignment operations | Recall/withdrawal, injuries, training substitution, return phases and sale/release handling per assignment family. |
| Individual challenge | Round count, abilities, coaching trade-offs, finite decider, auto-coach, recovery and result presentation. |
| Beach/fives | Team size, field/rules, substitutions, fatigue, scheduling and presentation; validate match-engine support before offering entry. |
| Further rewards | Open Cup cash/reputation/honours have an initial supported test policy. Other XP/cash/cap amounts, trait compatibility, sponsor terms, first/repeat payouts and cross-event limits need scoped designs and balance evidence. |
| Gear | Later equipment slots, effects, acquisition, display and interactions; excluded from the first delivery. |

These are explicit delivery gates, not missing approval for the agreed direction.
Existing finance and progression specifications own their mechanics. Recheck their
current approved contracts when implementing; older audit tables are not current policy.

## 11. Delivery slices and acceptance

Deliver as focused issues/PRs under #323, with the existing different-tool checker,
CI/WebKit, QA and phone playtest process. The sequence below was proposed in this
revision and mapped to the tickets in the 17 November execution update above.
No delivery dates or owners are invented.

| Slice | Scope | Done when |
| --- | --- | --- |
| A — Choose a league and a cup | League selection shipped in #719; Open Cup entry/rewards/views implemented in #736; wider integrated balance remains | Win an entry league, unlock a harder one, deliberately stay or move next year, and complete or decline a cup without breaking finances, people or history. |
| B — Send players away | Assignment reservations, absence/return, lineup integration and one training/community opportunity | A player leaves, a reserve covers an overlapping club fixture, the player returns once with the correct result, and reload/skip cannot duplicate effects. |
| C — Watch and coach a challenge | Big Mick's-style individual event, distinct venue, coaching decisions, personal award and a supported club reward | Complete a meaningful animated contest, see the effect of coaching, return with earned rewards and unlock a further goal; auto-coach and recovery work. |
| D — Play a different team event | Beach or floodlit fives, selected travelling group, dedicated rules, recurring opponents and a short invitation chain | The event plays visibly differently from Nines, its absence/calendar costs matter, and success opens a correctly saved next opportunity. |
| E — Broaden the career | Shield/youth/Champions Series, other catalogue events, traits/sponsors/collections | Each added event offers a distinct decision and tested rewards without making every event mandatory. |
| Later — Equip the squad | Separate gear specification and release | Equipment is visible, understandable and balanced against the established trait/progression systems. |

Existing #570/#571/#573/#575 foundations are reusable, not grounds to restart the
project. #574 now delivers unlock/selection/rollover; its league presentation and
validation do not close the broader #578 opportunity views or #582 integrated
league-and-cup balance validation. The Open Cup implements #576 cash/reputation/
honours; future entitlement records and #577 capacity effects remain separate.  #579–#581 remain relevant content with sequencing to be reconciled.
Assignments and bespoke event engines have their own scoped delivery work in
#708/#710/#711; do not silently absorb them into already-reviewed foundation tickets.

For every slice, verify appropriate state transitions and measured player outcomes:

- Permanent league unlocks survive losing, renaming and reload; expired invitations
  do not erase them, and no invalid league choice consumes the season.
- Known overlapping assignments cannot double-book a player or leave an illegal
  main lineup at confirmation. Later injuries and withdrawals have an explained route.
- Watch, skip, auto-coach, save/resume and duplicate delivery preserve results,
  people, time, rewards and ownership; invalid imports preserve the current career.
- First/repeat rewards, simultaneous completions and season rollover settle once.
  Assignment failure/cancellation never traps a player away or pays an unearned title.
- A club declining all optional offers can still play and improve; compare with
  event-heavy, youth-first and easier-league-repeat careers using existing harnesses.
- On a phone, Leon can name a near-term, seasonal and longer-term goal, understand
  an entry trade-off, coach a challenge and find the returning player's achievement.

The revised whole experience is not complete when only the league and Open Cup
work. At least one real assignment, one watched/coached individual contest and
one distinct small-sided event must demonstrate the broader approved direction.
