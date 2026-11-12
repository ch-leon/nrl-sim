# Retreat and short-match play-test evidence

These are unmerged draft changes: [retreat PR #677](https://github.com/ch-leon/nrl-sim/pull/677)
and [field comparison PR #678](https://github.com/ch-leon/nrl-sim/pull/678).
Leon must play-test before either merges. The private comparison is
https://nrl-sim-match-playtest.code-heroes-3364.chatgpt.site .

## Retreat correction

The seed1 defect was a non-marker entering `committed()` after a heel without ever
reaching 10m. Per-ruck eligibility now requires physically reaching the fixed
10m line, or the goal line, before defensive involvement. Handovers establish
the new defence before the heel. Already-deep men retain their depth; markers
are protected from Fresh legs. A field-goal charge-down checks the original
nearest defender’s eligibility rather than substituting a remote player.

The corrected source is `1e3f7efd`; normal rules remain 100m and seven-minute
halves. The suite includes both directions, real goal-line movement, handovers,
bins/substitutions, call settlement at half/full/golden breaks, and the original
seed1 eligibility invariant. Independent Claude reviews found the edge cases
and reviewed their corrections. Review receipts and CI/QA links are on the PRs.

## Whole-match balance

The standard harness plan ran 40 seeds per scenario before/after retreat; 13
scenarios per run. Counts below are actual totals per 14-minute clock match.

| Neutral 60 v60 | Mean tries | Mean points | Draws |
|---|---:|---:|---:|
| Main85dcd195 | 5.725 | 29.425 | 7.5% |
| Corrected retreat1e3f7efd | 5.475 | 27.7 | 15% |

These raw means do not establish significance; the full comparison report marks
changes over two standard errors.

- [Main baseline](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203438-standard/report.md)
- [Corrected retreat, with baseline comparison](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203726-standard/report.md)

Spent players now take longer to retreat and can leave space. A whole match
with both teams tired confounds carrier fatigue with that defensive effect.
The fatigue regression therefore isolates a tired/fresh carrier against the
same fresh defenders over matched contest rolls; it retains movement-speed
and contest coverage rather than treating a single whole-match seed as causal.

## Short fields

Final preview source52030527 includes corrected retreat1e3f7efd. Each physical
field ran 40 seeds in each of three matchups (neutral, stronger side, stamina
gap), with two2.5-minute halves. All columns are per actual5-minute clock match.

| Neutral 60 v60 | Mean tries | Mean points | Draws |
|---|---:|---:|---:|
| 100m | 1.925 | 10.15 | 12.5% |
| 80m | 2.475 | 12.825 | 12.5% |
| 60m | 3.35 | 17.675 | 10% |

- [100m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203744-20261113-100m-corrected-retreat-short-match/report.md)
- [80m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203746-20261113-80m-corrected-retreat-short-match/report.md)
- [60m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203748-20261113-60m-corrected-retreat-short-match/report.md)

The60m prototype has 40/20 off where the zones meet; on80m the own40 is halfway.
Kicking distances, fatigue and substitutions have not been compressed or retuned.
Substitutions average0.025/0.05/0.1 per short neutral match, so this prototype
rarely exercises the bench. That is a play-test limitation, not a released balance
decision. Scoring still falls from the14-minute baseline; the table gives Leon
a comparison rather than promising the old score distribution.

Build with `npm run build:match-preview`. The build runs the geometry/rules and
full-match regressions under each explicit compile flag before bundling it.
No flag retains production rules and PWA behavior. Screenshots remain outside git.
