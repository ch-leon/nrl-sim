# Optional Open Cup — delivery evidence

Updated 19 November 2026. This records the normal AU/UK League Open Cup slice,
under #576 and the Open Cup portion of #578. It does not close the wider event
catalogue, future cap entitlements or #582 balance work.

## Current status

Implemented in [PR #736](https://github.com/ch-leon/nrl-sim/pull/736), including the independently reviewed backend at
`92512cdd` and the spec- and Claude-approved entry/report/trophy presentation.
The PR owns the final CI, full QA, checker and deployment receipts. Local proof
below does not substitute for those gates, and the PR stays draft until they pass.
Latest main through `c3848962` is integrated, including manual point spending.
TypeScript and the 184-test training/matchday/save-validation/normal-cup integration
run passed after that merge.
No intermediate reward-only save format is released: the combined feature uses
save version 33.

## Approved behaviour

- Free annual entry, decline or change through Week 6; registration closes before
  Week 7. Dates are Weeks 7, 10, 13, 16 and 19. Missing entry means sitting out
  that season, while the 23 other regional clubs continue their cup.
- The saved deterministic draw has 24 entrants when the player enters and 23
  otherwise. No opponent or bye is exposed before closure.
- Withdrawal after draw forfeits the next actual player tie on its date. An
  opening bye waits for a real tie; earlier rewards remain and the bracket continues.
- Actual played round wins pay extra cash of 1M/1M/2M/3M/5M, +1 reputation per
  win and +2 more for a played-final title, subject to existing reputation bounds.
  The title honour retains the winner’s full registered squad at the final. Byes, cancellations and forfeits pay no prize.
- M is FIN-04's saved host sporting-division match base, using the lower entrant base
  at a neutral final. Cup cash is separate from ordinary fixture income and has
  no effect on retained club cap capacity or main-league unlocks.
- These are user-approved starting values for testing, not accepted balance.
  New prize versions must preserve existing promises and historical receipts.

## Reviewed checkpoints

| Checkpoint | Evidence |
| --- | --- |
| Reward data contract `be2df76f` | Independent Claude approval; exact promise and receipt validation. |
| Pure settlement `5acce13d` | Independent Claude approval; once-only atomic cash/reputation/honours and persistent registered squads. |
| Match runtime `47903823` | Independent spec and Claude approval; watched, worker, rival and recovery paths; financial failure keeps the saved checkpoint. |
| Normal entry/migration `92512cdd` | Independent spec and Claude approval. Preview-time ownership, sidecar removal, historical prize basis and competing-import rollback fixes were independently reproduced and verified. |

The backend regression run passed **5,058 tests across 375 files** before five
additional review tests. The final two-file addition passed **42 tests** in both
implementer and root runs; TypeScript and diff checks passed. The affected backend
run passed **1,378 tests across 58 files**. These are checkpoint results, not the
final UI/CI/release gate.

Thirteen genuine version-32 saves and two real held Week-6 match sidecars were
captured from `8d7d9c5d`; [fixture provenance](../../tests/fixtures/saves/README.md)
records their source and construction. Derived corruption/inert-cup cases are
labelled separately. Backend season journeys use explicitly labelled controlled
scores through the existing result hooks; they are not visual playthrough evidence.

The final presentation implementation passed **89 affected tests** and TypeScript.
Independent spec review passed **71 tests** across entry, reports, history and
season views after fixing entry terms, neutral gate labels, dialog focus return,
actual repeated report opens, and reduced/empty historic brackets.

The complete local regression suite passed **5,081 tests across 376 files** before
two additional historic-bracket regressions. The final entry suite passed all ten
tests independently, including both additions and the missed-window copy fix.
The production build passed. Native WebKit passed **all 10 journeys**, with **zero page
errors**, including public AU/UK creation, change/reload, deadline draw, controlled
played title and annual offer, withdrawal after a win, decline/expiry, the genuine
old Week-7 save, desktop, phone text sizes and the existing portrait rotate cover.
The report and trophy views were opened repeatedly and checked at larger text.
Root inspected the actual entry, bracket, AI champion, payment and squad screenshots.

A separate **actual production simulation** produced an 11–4 player cup win and
its saved $8,000 prize. The title/rollover presentation journey uses labelled
controlled scores through the real kickoff, result, calendar, save and settlement
owners. Its Local neutral final separately recorded **$10,800 ordinary income**,
**$40,000 extra prize** and **+3 reputation**, with all 20 registered names in the
trophy. This is functional proof, not a win-rate or multi-season balance conclusion.
The new browser section is registered in the required `screens` WebKit shard;
its screenshots and report are CI artifacts, never committed assets.

## Release gates

[PR #736](https://github.com/ch-leon/nrl-sim/pull/736) records the final head, independent checker verdict,
`check`, all four `webkit` shards and aggregate, and the full QA run. Only after
those pass can the change merge under AGENTS.md. The PR also records deployment
verification and the public play-test link. Its `e2e-webkit-screens` artifact owns
the screenshots and JSON report; they are not committed to the repository.

Notion's canonical competition page is reconciled with the actual delivered scope
and release evidence after these gates, preserving wider balance and later events
as open work.
