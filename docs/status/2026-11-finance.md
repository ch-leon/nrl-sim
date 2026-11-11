# Simplified finance delivery

Product: [Notion](https://app.notion.com/p/4140870d4c448148b6b5c6a940d1cae6).
Tracker: [#555](https://github.com/ch-leon/nrl-sim/issues/555).

## #556 — prototype contract and executable quotes

Leon accepted the starting model for testing on 11 November 2026: fresh careers,
club-cash cap upgrades, no weekly cash bills, fixed annual salaries and bounded
purchased/earned capacity. The [contract](../specs/finance-prototype.md) records
D1–D5, the current-source impact map, exact implementation coefficients, state/
transaction/rollover ownership and measurable targets. Finance runtime and UI
remain with #557–#562; this slice changes no live career's money or contracts.

FINANCE_PR_LINK publishes headless quotes with meaningful money/cap/eligibility
checks and the [static inventory](2026-11-finance-inventory.json). Across 20 seeds,
both packs and three difficulties, 120 worlds yielded 2,880 club market bills.
Every starting player roster fits Local's proposed cap in this sample. The AU
Premier Reapers roster at seed 17 quotes 607,200, repeated across the three
difficulty rows; a bounded opening offer fits it. This is one roster repeated,
not three independent failures. #557 must integrate construction admission.

Fifteen dedicated checks cover losing-season ordinary income, neutral shares,
unplayed/trial exclusions, bounded cap composition, salary/fee/release quotes,
ordinary resale margin and bounded opening offers. No matches or multi-season
balance were run by the inventory; no live finance playtest is claimed.

Required TypeScript/full unit/build, PR CI/WebKit/QA and review in a different
tool remain separate evidence. No merge or final numerical balance is claimed.
