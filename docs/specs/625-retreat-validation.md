# Retreat and short-match play-test evidence

**13 November update:** Leon requested normal 2:30 halves and runtime field
selection through Experiments, plus a separate career-balance pass before merge.
The measurements below describe the first fixed-field comparison and remain
valid live-sim measurements. [Current contract](513-short-halves-field-experiment.md).

This page covers the [retreat PR #677](https://github.com/ch-leon/nrl-sim/pull/677).
It was merged by another process on 13 November 2026 at 00:27 UTC.
The short-match and career-balance changes remain held for Leon’s play-test.
The short-field comparison lives in the
stacked [field comparison PR #678](https://github.com/ch-leon/nrl-sim/pull/678);
its evidence is kept in the last two sections, which are marked as #678 only.
The private comparison is https://nrl-sim-match-playtest.code-heroes-3364.chatgpt.site .

## Retreat correction

The seed 1 defect was a non-marker entering `committed()` after a heel without ever
reaching 10m. Per-ruck eligibility now requires physically reaching the fixed
10m line, or the goal line, before defensive involvement. Handovers establish
the new defence before the heel. Already-deep men retain their depth; markers
are protected from Fresh legs. A field-goal charge-down checks the original
nearest defender's eligibility rather than substituting a remote player.

At this historical measurement, the corrected source was `1e3f7efd`; normal rules remained 100m and seven-minute
halves. The suite includes both directions, real goal-line movement, handovers,
bins/substitutions, call settlement at half/full/golden breaks, and the original
seed 1 eligibility invariant. Independent Claude reviews found the edge cases
and reviewed their corrections. Review receipts and CI/QA links are on the PRs.

## Whole-match balance

The standard harness plan ran 40 seeds per scenario before/after retreat; 13
scenarios per run. Counts below are actual totals per 14-minute clock match.

| Neutral 60 v 60 | Mean tries | Mean points | Draws |
|---|---:|---:|---:|
| Main `85dcd195` | 5.725 | 29.425 | 7.5% |
| Corrected retreat `1e3f7efd` | 5.475 | 27.7 | 15% |

These raw means do not establish significance; the full comparison report marks
changes over two standard errors.

- [Main baseline](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203438-standard/report.md)
- [Corrected retreat, with baseline comparison](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203726-standard/report.md)

Spent players now take longer to retreat and can leave space. A whole match
with both teams tired confounds carrier fatigue with that defensive effect.
The fatigue regression therefore isolates a tired/fresh carrier against the
same fresh defenders over matched contest rolls; it retains movement-speed
and contest coverage rather than treating a single whole-match seed as causal.

## Short fields (stacked PR #678 only)

Nothing in this section exists on the #677 branch. The preview source `52030527`
builds on corrected retreat `1e3f7efd`. Each physical field ran 40 seeds in each
of three matchups (neutral, stronger side, stamina gap), with two 2.5-minute
halves. All columns are per actual 5-minute clock match.

| Neutral 60 v 60 | Mean tries | Mean points | Draws |
|---|---:|---:|---:|
| 100m | 1.925 | 10.15 | 12.5% |
| 80m | 2.475 | 12.825 | 12.5% |
| 60m | 3.35 | 17.675 | 10% |

- [100m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203744-20261113-100m-corrected-retreat-short-match/report.md)
- [80m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203746-20261113-80m-corrected-retreat-short-match/report.md)
- [60m report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261112-203748-20261113-60m-corrected-retreat-short-match/report.md)

The 60m prototype has 40/20 off where the zones meet; on 80m the own 40 is halfway.
Kicking distances, fatigue and substitutions have not been compressed or retuned.
Substitutions average 0.025/0.05/0.1 per short neutral match, so this prototype
rarely exercises the bench. That is a play-test limitation, not a released balance
decision. Scoring still falls from the 14-minute baseline; the table gives Leon
a comparison rather than promising the old score distribution.

On #678, build with `npm run build:match-preview`. The build runs the geometry/rules
and full-match regressions under each explicit compile flag before bundling it.
No flag retains production rules and PWA behaviour. Screenshots remain outside git.

## Browser viewing evidence (stacked PR #678 only)

On the published preview's source `52030527`, headless Chromium at 844×390 watched
seed 1 at selected ×1, with no pause, seek or speed change. Timers use elapsed
wall time and exclude the automatic half-time break. All three reached full time
without page errors. This is one seed, not a duration guarantee.

| Field | Half 1 watched | Half 2 watched | Total watched | Score | Tries |
|---|---:|---:|---:|---|---:|
| 100m | 1:57.4 | 2:10.0 | 4:07.4 | 1–0 | 0 |
| 80m | 2:15.8 | 1:59.7 | 4:15.5 | 4–0 | 1 |
| 60m | 2:26.7 | 2:49.7 | 5:16.5 | 10–14 | 5 |

The 60m example exceeds the five-minute target because of scoring/stoppages and
play-on after the siren. It is deliberately retained as the same-clock comparison
for Leon's choice, rather than quietly reducing just its clock.

WebKit at 844×390 also checked all three variant labels and compiled 2.5-minute
rules, 44px play/restart/field controls, portrait pause/timer invalidation, and
a pristine Restart. The comparison page was checked at 390×844. Screenshots are
local/CI artifacts, never committed.
