# Player assignments implementation plan

19 November 2026. Issue #708. Baseline `6b1cfa76`; branch `codex/player-assignments`.

**Goal:** A coach books a real player into Skills Camp during Weeks 1–4, plays
the opening league match in Week 5 with cover, and gets the same player back
before Week 6 with one durable development report. One free place per season;
70 base XP replaces ordinary training and uses existing progression ceilings.
The [approved specification](../specs/player-assignments.md) owns the rules.

**Architecture:** Keep squad ownership intact and supply contextual absence to
selection. Store versioned annual assignment records alongside competitions.
Use the existing verified League interval checkpoints for departure, held-match
recovery and atomic return. Introduce save v34 only in the complete release.
No new clock, match format, currency, gear or direct stat grant.

Use focused tests before each behavior change. Root owns integration, commits
and delivery. Delegate bounded implementation and independent spec review;
Claude Code provides different-tool read-only review of immutable snapshots.

## 1. Temporary availability foundation

Change `systems/lineup.ts` and its manual/automatic selection helpers to accept
optional absence by player ID while retaining the full squad for ownership.
Preserve starter/bench/captain/kicker preferences under automatic cover. Explicit
coach edits keep existing semantics. Harden `match/league/sheets.ts` to validate
supplied selections against eligible players. In `systems/stats.ts` and
`systems/matchday.ts`, restrict name-only effects to frozen match participants;
`applyMatchXp` already has this restriction. Add regression tests for absent
starters, bench and roles, manual changes, undersized squads and namesakes.

Validate focused lineup/sheets/stats/matchday/training tests and typecheck. Obtain
spec review and Claude review before building the lifecycle on this foundation.

## 2. Annual records, progression and lifecycle

Add authored Skills Camp rules and typed records with strict structural and
full-state validation. Derive an untouched offer; materialise one annual row on
booking, with monotonic revision for cancellation/rebooking. Snapshot dates,
fixture, participant, focus and reward policy; retain historical outcome names
and IDs after transfers/retirement. Preserve records at annual acceptance.

Implement shared cover projection using medical recovery before kickoff and
discipline after matches. Participant must be fit/unbanned before departure.
Use the same projection for previews, departure, roster disposal and advance
risk. Guard transfers, direct release and signing Undo at quote and commit.

Register departure before training; replace ordinary XP while retaining veteran
decline once. Award 70 base XP without home facilities at interval settlement,
using the existing automatic/manual spending owner and effective-focus rules.
Record actual XP, newly earned points, prior banked points spent, remaining points
and actual stat gains. Return and award in the same durable candidate.

Thread explicit trusted running-interval validation through clock/playability;
imports always use strict boundary admission. Reject forged new fields before
the legacy v33 early-return migration. Migrate old saves to empty assignments.
Test start/final write failures, exact retry/export, held recovery, cancellation,
forfeit, annual renewal, duplicate callbacks and malformed records.

## 3. Booking, cover and return UI

Follow the guarded Open Cup confirmation/save pattern. Show dates, player role,
named cover, actual XP estimate, focus and cancellation terms; stale previews
require another confirmation. Add one unobtrusive card in existing League/club
surfaces, player/lineup absence labels and a persistent return report. Hide focus
in saved manual mode and disclose automatic fallback when no focus was booked.
Do not introduce another top-level navigation system.

Add keyboard/large-text/landscape-phone journeys and native/hosted checks. A
watched Week 5 match must visibly exclude the camper, then show return and the
same saved receipt on reopening/reload. Keep screenshots outside Git.

## 4. Evidence and delivery

Capture genuine baseline v33 Week 4 and held Week 5 AU/UK saves with original
sidecars; keep provenance. Retain late Week 10/11 captures for expired-offer
migration. Run actual paired camp/decline AU/UK careers across supported
difficulties, starter/bench/reserve, age/traits/facilities and automatic/manual
spending. Compare actual receipts, appearance/training XP, legal cover, finances,
clock counts and ceilings. Label controlled terminal outcomes separately.

Update `docs/hub/features.md`, roadmap, competition plan, issue and canonical
Notion with verified status. Broader #582 balance remains open. Run typecheck,
full Vitest and production build. Resolve independent Claude findings, open one
PR with evidence and checker verdict, and run required CI/WebKit and full QA.
Merge only after all required checks and independent approval; verify deployed
commit and the live journey before reporting the feature as available.
