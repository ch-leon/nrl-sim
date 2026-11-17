# Player continuity: lifecycle implementation evidence

17 November 2026. This is an implementation checkpoint for #572, not a completed
career release or a claim of balanced long-term progression.

The lifecycle keeps unsigned people across discovery and Academy intakes,
records signing/release/expiry spells, archives actual retirees, and books
signing/release/Undo together with ownership. A queued renewal continues the
same club spell. Academy discounts cannot be restored by an old junior flag.

Rivals now check annual commitments and actual cash rather than the retired
weekly wage ceiling. At rollover they retain existing terms, activate queued
renewals, renew expiring survivors within the annual cap, and recruit actual
unsigned people toward the preferred depth of 18. Generated replacements only
fill unavoidable expiry/retirement vacancies below the registration minimum
of 13. Scholarships have bounded potential, a saved source-vacancy receipt and
no sale/release during their one-season term. Injuries and bans create no people.

## Five-season measurement

At lifecycle commit `0092aac7`, the existing
`tests/systems/rivals.test.ts` five-season cohort, seed 2026, ran
with its existing fixtures, match, discovery, ageing and rival hooks. It does
not include all runtime hooks (notably player economy/Academy), so these are
rival-supply measurements, not a complete career balance result.

| Entering season | Rival depth range | Unsigned | Archived retirees | Cumulative births | Weekly signings | Save bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 17–21 | 12 | 33 | 12 | 6 | 326,982 |
| 3 | 15–20 | 12 | 56 | 24 | 12 | 417,810 |
| 4 | 14–19 | 12 | 79 | 36 | 18 | 424,506 |
| 5 | 13–20 | 12 | 99 | 49 | 24 | 431,626 |
| 6 | 13–21 | 12 | 117 | 61 | 30 | 437,828 |

Thirty weekly moves across fifteen rivals and five seasons is **0.4 signings per
rival per year**, below the old churn expectation of 1–3. Sixty of the births
were ordinary annual intake and one was an emergency minimum repair. The
six-player unsigned reserve and twelve-person annual deficit bound constrain
weekly supply. Annual funded recruits are not included in that weekly counter.
The strength band and varied-champion checks passed.

The old lower recruitment gate depended on repeatedly manufacturing twelve new
unsigned people. The reconciled test requires positive legal recruitment,
retains the upper rate bound and verifies minimum depth, ownership/history and
healthy supply. Separate funded-need cases require a successful legal signing.
No intake, fee or salary curve was increased to make the former churn gate pass.

Save bytes increase because actual retired history is retained. These numbers
also contain the rest of the career state; they are not archive-only sizes.
Do not claim constant save size or discard recorded people to meet the old
churn model. Further multi-seed full-runtime QA remains a separate gate.

## Regression boundaries

Tests cover observer-visible ownership and finance atomicity, exact signing
Undo and refusal after renewal, expiry aged once, continuous renewal history,
rival retirement and reload, old Academy intake retention, no injury/bans
births (including trials), and no emergency repair of a pre-existing voluntary
shortfall. The supported structural calendar remains gated.

The deterministic career stream pins changed because persistent discovery,
stable rival ordering, bounded births and isolated Academy intake change
career outcomes/draws. UI-read versus no-read equality and unchanged surviving
stats/ceilings remain required. No match-engine source was changed.

## Full runtime integration and final review candidate

[PR #716](https://github.com/ch-leon/nrl-sim/pull/716) integrates the independently
reviewed income prerequisite `c2202c12`. The merge changed one deterministic
career fingerprint from the provisional `1950957202` to `3782523015`; both
UI-read/no-read parity checks remain intact and pass. No match rules were edited
by the continuity changes.

Actual registered hooks cover AU and UK sales, the sold ID in the opposing
watched-match roster, unchanged agreements and progression attributes at transfer,
100 refreshes without births, expiry/renewal/retirement and reload. Cross-division
transfers retain the existing next-season waiting gate. Malformed imports leave
an occupied career and its stored bytes untouched.

A normal managed seed2026 run was dismissed after season4 for board objectives,
with no state invariant failures. To exercise five complete years of continuity,
a separate fixture clears the board objectives between annual full-runtime runs.
That deliberate control is not normal-career balance evidence. On the integrated source at `838c0861`, its actual UTF-8 save measurements were:

| Entering season | Live people | Retired records | Cumulative births | Save bytes |
| --- | ---: | ---: | ---: | ---: |
| 2 | 307 | 36 | 11 | 335,505 |
| 3 | 298 | 66 | 32 | 439,373 |
| 4 | 304 | 87 | 59 | 457,736 |
| 5 | 307 | 100 | 75 | 471,488 |
| 6 | 310 | 114 | 92 | 484,895 |

Every previous ID remained live or archived after every year. The integration
test logs fresh measurements on the final integrated code; these recorded
numbers identify their source revision rather than claiming invariant balance
values. TypeScript, production build and all **4,527 tests across 341 files** passed
on the integrated source. The later small-screen sale-panel and focus fixes
receive their own affected-suite/browser checks. Independent-tool review and
exact-head CI/QA remain required before merge.


## Final review follow-up

Claude Code's backend review of `838c0861` found one blocking issue: the
sale preflight rejected a seller whose existing cash balance was negative.
Supported saves and current optional event costs can already produce that state.
The correction permits safe-integer sale receipts to reduce an existing debt,
even when the proceeds do not clear it. It adds no borrowing: the buyer still
needs a nonnegative safe-integer wallet and the full fee. Invalid ownership,
agreements and seller balances now report their actual refusal before searching
for a buyer. Regression cases cover partial/full recovery, conserved cash,
reload, once-only booking, invalid buyers and overflow.

The final sale review uses the screen width for the player, buyer, fee and
unchanged contract; cap details scroll above fixed 44px actions. The production
WebKit `player-sales` regression passes five size/text combinations, including
568×320 Larger, using saved careers and native keyboard confirmation. It checks
Cancel as a no-op, the actual buyer's single payment, unchanged contracts,
unique ownership and reload persistence. Screenshots and the report are CI
artifacts, not committed files. This is targeted browser evidence, not a claim
that the later full PR gates have passed.

The existing small-screen flow additionally caught a renewal notification over
Contracts' sale buttons. The review now sits above ordinary notifications;
the notification remains queued and readable again after Cancel. A real renewal
before sale reproduced the issue, then passed all five production layouts with
retained-notification and button hit-test assertions.
