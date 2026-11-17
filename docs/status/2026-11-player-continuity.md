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

The existing `tests/systems/rivals.test.ts` five-season cohort, seed 2026, ran
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
That deliberate control is not normal-career balance evidence. Before the latest
match-rule integration, its actual UTF-8 save measurements were:

| Entering season | Live people | Retired records | Cumulative births | Save bytes |
| --- | ---: | ---: | ---: | ---: |
| 2 | 308 | 37 | 13 | 336,429 |
| 3 | 303 | 63 | 34 | 440,929 |
| 4 | 304 | 86 | 58 | 457,416 |
| 5 | 307 | 99 | 74 | 470,352 |
| 6 | 310 | 113 | 91 | 483,529 |

Every previous ID remained live or archived after every year. The integration
test logs fresh measurements on the final integrated code; these recorded
numbers identify their source revision rather than claiming invariant balance
values. Independent-tool review, final full checks, browser evidence and CI/QA
are still required before merge.
