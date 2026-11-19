# Individual challenges — implementation and release evidence

19 November 2026. Issue [#710](https://github.com/ch-leon/nrl-sim/issues/710),
[PR #745](https://github.com/ch-leon/nrl-sim/pull/745).
Implementation baseline `008c7cee`. Release candidate: full final review, CI, QA,
merge and deployed verification must be recorded in the PR before calling it live.

## What the coach can do

Enter one real player in Big Mick's Break the Line during Weeks 1–5. At Week 6,
start deliberately or withdraw. Carry then defend against Gaz, Danny and Mick,
with a coaching choice and animated clash each time. Scores are 0/1/2; a tied
six-clash total gets exactly one bonus carry that must break through to win.
The showground scene uses actual player art, scoreboard, pause and Skip controls.
Skip does not make the next choice. Auto handles one checkpoint; confirmed Finish
resolves the remainder. Both use the same engine as manual coaching.

The entrant is unavailable for that week's club fixture. The next interval returns
them with 60 base completion XP, another 60 for a title, and $8,000 title cash.
The title also records a personal honour and permanently unlocks a real Invitational
booking in Weeks 9–13, event Week 14, return before Week 15: 80+80 base XP and $16,000.
Both editions are free and independently annual. XP uses existing age/trait modifiers,
ceilings and the spending/focus preference on return, replacing weekly training.
No new injury rolls, sponsor mechanics, gear or cap changes are included.

The [complete product contract](../specs/individual-challenges.md),
[engine and measured tuning](../specs/individual-challenge-engine.md) and
[readable Notion companion](https://app.notion.com/p/41d0870d4c44813888c3c05c3b8ad833)
contain the exact controls, opponent profiles, dates, rewards and recovery rules.

## Checkpoint and migration evidence

Each choice and its result are verified in the career before revealing animation.
The club clock does not tick while coaching. iOS additionally acknowledges the exact
native slot payload; unavailable, failed or timed-out acknowledgements preserve a
retryable local result and block new outcomes. Existing normal native saves stay
best-effort. This is tested with actual storage bridge fakes, not a physical iPhone.

Save v35 keeps camp records separate. Historical versions reject injected challenge
fields before migration; genuine v34 AU/UK checkpoints and in-progress Week 6/14
matches are captured under `tests/fixtures/saves/v34-challenges` with source, driver,
hashes and repeatable real-simulation provenance. Awards and badges derive from
validated receipts, survive renamed/sold/retired players and do not replay twice.

## Local verification

- Pure engine/policy and strengthened statistical QA: 20 focused tests passed.
  The strict runner tests indexed roll marginals and independence, pooled sampled
  versus exact odds, six useful calls, tier difficulty, coaching value and traits.
  Deliberate biased-roll, reused-roll and missing-policy-recovery mutations fail.
- Six paired production career scenarios passed: both packs and editions, all three
  difficulties, starter/bench/reserve, manual/auto point spending and manual/auto/
  Finish coaching, including genuine prior-title qualification and camp coexistence.
- WebKit journeys cover 568×320 manual coaching/reload/portrait and all six calls,
  667×375 UK Auto/manual/Finish, and 844×390 Larger text plus actual same-season
  qualification and Invitational completion. Screenshots belong in CI artifacts.
- Native checkpoint scoped Claude review approved; engine QA findings were addressed.
  Final review and aggregate checks are separate, mandatory release gates below.

## Independent review follow-ups

Claude's full-feature review approved the candidate with four non-blocking findings.
The follow-up removes repeated historical policy solves without trusting mutable
objects, shares the tolerant saved-match recovery parser with slot classification,
rounds fractional XP receipts to two decimals and displays the actual cover refusal.
Regression tests cover more than sixteen distinct historical contestants, changed
saved evidence, truncated/legacy sidecars and the two player-facing explanations.

The first frozen full local suite passed 5,412 tests across 409 files. Its initial
remote QA passed challenge/camp careers, balance, the multi-season soak and career
agency, but match hand-off took 1,081 ms against the unchanged 1,000 ms performance
budget. Final-head checks and review outcomes belong in the PR, including any
required follow-up; this document does not represent a deployment receipt.

## Reproduce

```sh
npx tsc --noEmit
npx vitest run
npm run build
npx vite-node scripts/qa-individual-challenges.ts -- --strict-balance
npx vite-node scripts/qa-individual-challenge-careers.ts
npm run e2e:webkit -- --individual-challenges-only
```

The QA workflow retains both event balance and paired-career reports alongside the
existing Skills Camp, soak and playthrough artifacts. The screens WebKit shard
includes the individual-challenge journeys. Broader #582 balancing remains open.

## Release gates

The PR must record exact-head independent Claude approval, green `check`, all
`webkit (<group>)` shards and `webkit` aggregate, full QA, and the deployed build
receipt. The public try-it route is League → Big Mick's Break the Line.
