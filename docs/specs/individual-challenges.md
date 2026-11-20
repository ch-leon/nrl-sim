# Individual challenges — Big Mick's Break the Line

Approved starting design for #710, 19 November 2026. Implementation baseline `008c7cee`.
The approved career-opportunities direction requires animated, watchable and
coachable individual contests. Leon selected a combination of the proposed
three-opponent gauntlet and alternating running/defending duels. Leon approved the dates and starting reward values below and instructed
implementation on 19 November. Numeric combat tuning remains subject to the
published proof gates; this document alone does not enable an event. Skills Camp remains governed by its existing specification.

Readable reference: [Big Mick’s Break the Line — rules, coaching and rewards](https://app.notion.com/p/41d0870d4c44813888c3c05c3b8ad833).
The Notion guide preserves the full product contract and numerical appendix;
keep it reconciled with measured tuning and release status.

## Player experience

Enter a real squad player into a playful showground contest. Face three distinct
rivals, carrying once and defending once against each. Coach before each of the
six short clashes; watch a recognisable approach, collision and escape or stop.
Everyone completes all three duels, so an early setback still leaves decisions.
The running score and shared energy create a reason to change tactics.

Use fictional rivals and the game's existing generated athletes, with a rope-lined
lane, scoring marker, bunting, spectators and Big Mick as host/final opponent.
No direct movement, aiming, reaction tapping or decision timer. Introductions and
presentation may be skipped. Preserve existing match presentation and saves.

## Event discovery and reminders

Follow-up requested 20 November after Leon missed Showground registration:
[#751](https://github.com/ch-leon/nrl-sim/issues/751),
[implementation plan](../plans/2026-11-20-event-reminders.md).
The main club grounds expose an Events summary and list with direct access to
the existing booking dialogs. League retains its event cards. The list shows
open, booked, played, locked and missed opportunities; a missed entry explains
when it returns. Deadlines come from the current career records and rules.

Showground closes after Week 5, Invitational after Week 13; the shared reminder
also covers Skills Camp after Week 4 and Open Cup before Week 7. An advance
that would close an unentered opportunity offers review or explicit continuation
without entering. Fast-forward also checks opportunities that open during its
run. Intentional continuation is scoped to that run, not a permanent dismissal.
Existing due-contest decisions retain priority. No automatic booking, deadline
extension, reward change or save migration is part of this follow-up.

## Approved entry, rewards and next goal

| Term | First edition | Mick's Invitational |
| --- | --- | --- |
| Eligibility | Active AU/UK League career, all positions, fit/unbanned real owned player and legal cover | Same, plus a permanently earned first-edition title |
| Registration | Weeks 1–5 inclusive | Weeks 9–13 inclusive |
| Away | Week 6; back before Week 7 | Week 14; back before Week 15 |
| Price/frequency | Free, one completed entry per club per season | Free, one completed entry per club per season |
| Development | 60 base XP for completion, another 60 for a title | 80 base XP for completion, another 80 for a title |
| Club purse | $8,000 for a title; no loss prize | $16,000 for a title; no loss prize |
| Personal honour | Cosmetic Break the Line Champion badge on a win | Cosmetic Mick's Invitational Champion badge on a win |
| Lasting goal | Winning permanently unlocks the playable Invitational, including that year's Week 14 window | Defend the title next season; retain repeat wins and personal best |

These are test values, not balance acceptance. Both dates are ordinary league
fixtures in the current 25-slot calendars. Purse values are fixed across game
difficulties and league tiers, not multiplied by the club's current division. One player can attend camp and later
contests when intervals do not overlap. All known reservations contribute to legal
cover and transfer checks. Preview the actual missed fixture and named cover.

Each event replaces that interval's normal weekly training XP, rather than adding
to it. Apply existing age/XP-trait modifiers, ceiling-aware spending and the club focus/manual-spending settings at return;
no home-facility XP boost. Do not grant direct stats. Title cash
uses a shared pure prize-credit helper extracted from the existing competition
reward owner: update cash and the matching season prize book together. Store the
receipt on the challenge, never fabricate a fixture or add an Open Cup ledger
entry. Any post-publish money notification carries `booked: true` to avoid booking
the finance delta twice. First and repeat annual titles have
the same advertised payout; first-time badge/unlock effects are idempotent. Qualification belongs permanently
to the club, so a different eligible player can represent it at the Invitational;
the personal badge stays with its winner. Replays
and reopened reports pay nothing. No salary-cap change, sponsor, gear or permanent
trait grant is included.

Cancel freely before departure, and rebook within the window. Recheck eligibility
and cover on departure; failure cancels with a reason and no reward. Once started,
finish manually or explicitly auto-coach. No ordinary recall or entry reroll. The
participant remains away until the single advertised club interval settles, even
if the contest has finished. At the due week a booked entry stops advance and offers Start contest or Withdraw.
Start rechecks fitness/cover and saves departure; Withdraw saves a terminal
cancellation with ordinary activity and no event reward. No silent auto-departure
or elapsed interval occurs at this decision. No new random injury/ban; event energy is local to the
contest. Ordinary weekly recovery, discipline, decline, contracts and economy run
once when the club week runs.

## Contest contract

The player carries first, then defends against the same rival; repeat for three
rivals. Every carry scores 0 for being stopped short, 1 for reaching the scoring
marker but being held, or 2 for a clean breakthrough. Sum the player's three carry
scores against the rivals' three carry scores. Higher total wins.

A tie has exactly one bonus player carry against Mick: a clean breakthrough wins;
otherwise the host retains the title. Publish this rule before entry. Maximum
seven clashes, no unbounded sudden death. The bonus uses remaining energy.
If the title is mathematically decided early, say so; remaining clashes still
count toward personal best scoring margin (player points minus crew points) for
that player and edition. Keep raw scores in each receipt for history; auto-coach
does not separately optimize raw player points. Offer the same explicit
Auto-coach control; never pretend a decided clash can reverse the title.

Attacking calls: Power through, Change the angle, Controlled carry. Defensive
calls: Shoot the hit, Track the hips, Set and wrap. Every call needs a useful
matchup or score/energy situation in measured tests. Risky contact may win a stop
but concede a break; wrapping may protect a lead by conceding ground rather than
a breakthrough. Conservation still attempts to score or defend.

Expose all four relevant abilities (strength, speed, stamina, footy IQ) in the
event comparison, including those usually hidden on a position's player screen.
Snapshot the same displayed values used by the engine. Admission is open to all
positions, not a promise of equal aptitude: clearly identify this as a physical
challenge that suits stronger carriers/tacklers, show every entrant's actual
ratings and the exact auto-coach title-chance estimate for those ratings, and
measure results for all position groups. Recompute the estimate from the frozen
actor snapshot at departure; never use the hidden seeded rolls in an estimate.
Do not boost hidden stats, scale opponents to the entrant or silently exclude a
position. Viable auto-coach means competitive decisions for that entrant, not a
guaranteed title for every athlete. Rival ratings are authored
per edition, never scaled to the selected player. Publish each rival's tendencies
and upcoming call before the coach commits; opponents cannot secretly counterpick
after a choice. Existing trait effects, if included, must be explicitly mapped and
shown; unrelated match traits must not acquire invented effects.

Use one pure, versioned seeded engine. Freeze player/opponent identities, abilities,
applicable traits, edition, rules, opponent plan and initial seed at departure.
Maintain event energy across all clashes with bounded fatigue effects. Explanation
text must describe actual inputs and consequences, never imply an unmodelled effect.
The [pure-engine proposal](individual-challenge-engine.md) specifies the exact
integer formulas, authored opponents, trait mappings and policy tables. These
parameters must pass the comparison tests below before release.

## Watching, skipping and auto-coach

At a checkpoint, show next rival, role, score, energy, the last explanation and
three approach trade-offs. A selected call is explicitly committed with Watch clash.
Save the call and its deterministic outcome before starting animation. If saving
fails, stay on the same checkpoint with no committed choice or visible new result.

Watching uses a compact score/role header, readable central lane and pause/skip
controls. A short 4–6 second sequence shows approach, actual contact and outcome.
Skip action skips only presentation and stops at the next coaching checkpoint.
An explicitly selected, saved Auto-coach policy supplies subsequent choices, one
verified command per clash, with control available at the next checkpoint.
A separate Finish with auto-coach confirmation may resolve all remaining clashes
into one owned, verified candidate. It uses the same policy/resolver and cannot
silently happen through normal advancing. It
uses the same visible inputs and cannot inspect future RNG rolls. Auto-coach must
be viable; no exclusive watching prize. Allow return to manual at a saved checkpoint.

The scoped controls here clarify the broader career-opportunities wording: Skip
action never supplies a choice; Finish with auto-coach explicitly does.

Reloading during animation replays the same committed clash or resumes its next
checkpoint; it never rerolls. Pausing, coaching, presentation, reports and podiums
never advance the world, train players, apply money or change ownership. Scene
cleanup and old callbacks cannot affect a newly loaded career.

## Persistence, club play and settlement

Keep one GameState. Add a separate typed `individualChallenges` collection rather
than putting a new shape into camp-only `assignments`. Preserve camp's serialized
records and runtime-only away validation. Add a shared availability/reservation
facade to union absences and enforce interval overlap and aggregate cover.

Challenge phases are booked, coaching (with committed rounds), ready-for-interval,
completed, and cancelled/interrupted. Coaching and ready-for-interval are valid
saved week-boundary states. Departure and each choice use owned, verified writes
before installation, following the existing camp confirmation ownership pattern.

Between durable coaching checkpoints, ordinary club management can remain open:
lineup/tactics, facilities, recruiting, other-player development and training
preferences follow existing rules. Exclude the participant from selection, defer
his manual point spending until return, and block his disposal, retargeting and
cover-destroying moves. Recheck legal cover before the club interval starts.
Allow a saved return-to-club/resume route without treating that as cancellation.

Freeze only event inputs, not the whole career. Each round command rebuilds from
the current owned state and preserves permitted management edits; stale previews
refresh before another deliberate commit. Animation callbacks never reinstall a
captured career snapshot. Settings, export and changing careers stay available
with existing ownership protections.

The pre-advance decision gate stays separate from structural validation and
held-interval release checks. Fast-forward returns a dedicated decision stop with
a resume action; advancing never simulates clashes itself. Ready-for-interval
replay remains advanceable.

A required coaching decision blocks every advance path, including fast-forward
and raw advance helpers. Stopping must not falsely count an elapsed week. Once
all clashes are committed, normal advancement runs the advertised club interval
without the participant. Its atomic settlement returns the player and applies XP,
cash, personal honour and qualification exactly once. Rest/forfeit outcomes also
settle correctly. The podium labels rewards as earned but payable on return; the
receipt is final only after the club interval settles. Tear down the challenge
scene before the normal match scene starts. Final write failure retains the exact retryable candidate and
original checkpoint, with no partial award.

A parked club match preserves the exact ready-for-interval challenge checkpoint.
Extend parked-replay protection to refuse both gameplay writes and false success
side effects until the existing interval owner resumes. Once authenticated replay
owns the interval, retain normal held-match management semantics; challenge
commands remain closed, and the participant remains absent until settlement. A parked sidecar paired with a booked/coaching challenge on its due week is an
inconsistent import/recovery pair and must be refused without overwriting either.
Normal match
sidecars remain match-only; the challenge never fabricates a club fixture, emits
match result events or uses match playback as its simulation authority.

The local verified save remains the immediate commit authority. The native iPhone
mirror remains asynchronous best-effort storage, not an acknowledged second
transaction for existing game writes. For every newly committed challenge outcome (manual, individual auto-coached
clash, or Finish batch), require an acknowledged matching native slot payload
before revealing the outcome on iOS. A failure/timeout offers retry or leave/export while preserving
the locally committed result; reload resumes this unrevealed boundary and never
selects a replacement call. Merely waiting for `idle()` is insufficient because
it also resolves after failures. While that acknowledgement is pending, block
further challenge commands and club advance; reconstruct this gate on reload
before exposing a committed result or starting a ready interval. Keep every async
completion bound to the current slot, namespace, installation and saved revision.
Web/Android retain verified local writes.
A locally rejected/no-op checkpoint must never be queued as accepted
native recovery truth; correct the mirror acceptance seam and test failure then
restart. Preserve ordering and namespace/slot identity, and do not claim that a
local save proves the native write has completed.

Bump the save format from v34 without retroactive trips or rewards. Reject new
challenge fields claimed by older formats before legacy migration early returns.
Validate records, revisions, finite round count, phase/cursor, ownership history,
award basis, event seed and replay-consistent outcomes. Each stored clash includes
its index-derived roll, recomputed from event seed and clash number on validation;
there is no action-consumed RNG stream. Derive XP receipt limits from the edition
policy and existing progression modifiers, not camp's fixed maximum. Keep historical names/IDs and
awards after rename, sale, retirement and fixture pruning.

Personal badges derive from settled challenge receipts by stable player ID, not
a duplicate mutable player badge field. Historical fixture validation uses the
authored round for the event date (Week 6 round 2; Week 14 round 7), not camp's
round-1 assumption.

Version the event engine separately, with an explicit active/retired registry.
A newly introduced engine version also bumps the save format so older builds
refuse it safely. Store structured explanations with committed outcomes. Retain the first pure engine for compatible
old checkpoints. Unknown future save/engine formats are refused without replacing
the destination career. If a known engine can no longer execute new clashes but its validator is retained,
provide an owned Resolve interruption command at a loaded coaching boundary: retain committed history/effects, return
the player once, cancel unearned awards and explain the interruption. Ready-for-interval records settle their already validated committed result, even
if gameplay for that known engine was retired. Retain known-version validators;
retirement is not permission to trust unverifiable receipts. Never accept
malformed state by labelling it an engine mismatch, and never strand an away player.

Derive the event seed from career seed and stable annual event identity, never
mutable world RNG or booking revision. Each clash uses an index-derived roll,
independent of call/policy. Previews enumerate public probability distributions;
they do not consume or inspect the seeded result stream. Importing a deliberately
older exported career remains an intentional rollback, not an anti-cheat boundary;
ordinary reload of the latest committed slot cannot reroll a clash.

## Implementation boundaries

- Pure contest/rules and deterministic auto-coach policy are independent of Phaser,
  storage and the global clock.
- Lifecycle/validation owns booking, snapshots, committed rounds, absence,
  settlement, honour and qualification. Presentation is read-only apart from
  invoking guarded commands.
- A dedicated ChallengeScene reuses PlayerFrameCache, MatchActor, MatchContactLayer
  and MatchArtRegistry, with a small pure committed-round animation adapter. Do not
  subclass MatchScene or construct a LiveSim. Properly release actors, timers,
  DOM overlays and scene-owned textures.
- Existing League cards, player pages, lineup labels and history expose the trip,
  award and invitation. No new top-level navigation system.
- Repository issue #710 owns this slice; broader #582 balance remains open. Existing
  reward and presentation prerequisites are reused where actually implemented;
  a sponsor/cap/gear framework is not silently added.

## Required proof

1. Same seed, snapshots and choices produce the same outcome when watched, skipped,
   auto-coached under the same policy or reloaded at every boundary.
2. All six role choices are meaningful across published opponent/stat/energy
   scenarios. Compare fixed-call policies and auto-coach over a reusable seeded
   runner; measure title/tie rates, energy, duration and progression against staying.
   Also report exact auto-coach title chances for real generated players in every
   position group, retaining their actual off-role stats, in both editions. No
   equal-win-rate target or artificial position normalization is implied.
3. Exactly six clashes plus at most one bonus; no early elimination or silent
   decision under normal fast-forward. Coaching does not tick the world.
4. Stale previews, duplicate taps, prior installations, different slots/namespaces,
   read-only/no-op/failed storage and native mirroring never duplicate effects.
5. One real player remains owned, legally absent from all club selection/stat/XP
   paths, then returns once. Cover preferences, deliberate edits, transfer/Undo
   guards, trial injury cancellation and camp/contest combinations remain lawful.
6. First/repeat wins, lost events, unlocked Invitational entry, manual XP spending,
   ceilings, retirement history and incompatible-engine recovery are exercised.
7. Real animated action and explanation are readable at 568×320, 667×375 and
   844×390, including Larger text, keyboard and portrait rotation. Phone evidence
   includes actual coaching differences, refresh during action, club cover, return
   and the playable next goal. Screenshots belong in artifacts, not commits.
8. Independent Claude design and implementation reviews; required typecheck,
   Vitest/build, all WebKit groups/aggregates and full QA; verify the deployed
   commit and live journey before claiming release.
