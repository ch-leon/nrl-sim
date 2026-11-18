# Skills Camp delivery evidence

19 November 2026. Issue [#708](https://github.com/ch-leon/nrl-sim/issues/708).
Baseline `6b1cfa76145f8b399c4ce2c97e194fdfabcacdb7`. This is an implementation
candidate; final independent review, PR checks, full QA and deployment remain
release gates. The [specification](../specs/player-assignments.md) and
[plan](../plans/2026-11-19-player-assignments.md) define the approved scope.

## Approved first opportunity

Leon chose Skills Camp and accepted the proposed starting terms, asking for
earlier access. Book from Week 1 through Week 4. One real player misses the first
league fixture in Week 5 and returns before Week 6. One free place per season;
70 base XP replaces ordinary weekly training, with existing age/trait modifiers,
potential ceilings and point-spending rules. The club's cap capacity is unchanged.

Automatic cover preserves the coach's preferred team. Explicit replacements
change that preference. The club rechecks fitness, bans and legal cover before
departure; failed departure cancels with a reason and no reward. A booked player
or required cover must have the booking cancelled before disposal. Completion,
actual development and return share one durable interval settlement.

## Evidence collected

- The complete local Vitest suite passed: 385 files, 5,149 tests. TypeScript and
  the production build also passed. These local checks supplement the required
  exact-head PR and QA workflows below.
- Claude reviewed the design, then the selection/progression foundation. Its
  blocking manual-replacement finding was reproduced and fixed for both the
  player-list and slot-to-slot interaction. Claude's focused follow-up approved
  that foundation. This is not a final implementation verdict.
- Genuine v33 AU/UK Week 4 and held Week 5 fixtures were captured from the
  unchanged baseline. Independent regeneration reproduced all six files; original
  trial replay and held fixture/seed recovery were checked before implementation.
  [Hashes, capture method and driver](../../tests/fixtures/saves/v33-assignments/README.md).
- `npx vite-node scripts/qa-player-assignments.ts` runs 20 actual paired careers:
  both packs, Easy/Normal/Hard, starter/bench/reserve, plus saved manual and QA
  manual spending. Each pair starts from the same genuine source and plays the
  same trial and opening fixture with real simulation. It checks exact interval
  counts, legal cover, participant ownership, progression, ceilings, receipts,
  save/load and repeated delivery. Results are written to
  `e2e-output/player-assignments/report.json` and included in the full QA workflow.
- WebKit covers public Week 1 discovery, phone and desktop booking/cancellation,
  large text, keyboard focus, an actual club match with cover, interrupted-match
  reload, save-failure recovery and retry, manual spending, persistent reports, a missed legacy window and the
  portrait rotation cover. Screenshots and reports stay in CI/local artifacts,
  not Git. Run `npm run e2e:webkit -- --player-assignments-only`.

## Starting reward observations

The initial 20-pair run passed. Its actual participants were aged 18–20 and 35–36,
with no home facilities or XP-boosting traits. Young starters received 105 camp
XP versus 75–82.5 from staying in those matches; young bench players received
105 versus 45. Veteran reserves received 17.5 versus 2.5. Focused progression
tests separately cover prime age, stacked traits, home-facility exclusion,
banked points, fractional ceilings and manual/automatic fallback.

The trade-off includes sporting outcomes. In the UK Normal starter pair, the
actual match changed from a 12–0 win to a 0–11 loss with the camper absent, and
two-interval cash changed from $14,800 to $14,000. Both finance paths reconciled
their own saved match receipts. This is a deterministic example, not a measured
win-rate effect. The source seed and small opening-season sample do not establish
long-term optimal strategy or whole-career balance; #582 remains open.

## Release gates

Final implementation review, exact-head TypeScript/Vitest/build, required PR
WebKit shards and aggregate, full QA, and deployed-commit verification will be
recorded in the release PR. No wider assignment catalogue, coached individual
contest, gear or sponsor system is claimed complete by this first camp.
