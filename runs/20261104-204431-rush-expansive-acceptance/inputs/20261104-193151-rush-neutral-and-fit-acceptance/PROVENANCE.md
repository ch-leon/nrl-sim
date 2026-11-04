# Measurement provenance

Original metadata is preserved. The flat rows started on 8ac3403. Later runtime
changes in b0f353e only tune Kick-chase/All-out cells (neither attack appears in
this run), and skip computing Carry when Rush is disabled. Enabled Rush uses the
same Carry formula. These neutral and fit rows therefore replay identically on
b0f353e. The attached implementation diff records those changes.

Flat rows use seeds 1–500 in both orientations (1,000 whole matches). Fit rows
use task 1 sheets and sampling: seeds 1–200 in both orientations (400 matches),
with pack strength 80/45 or backs speed 80. The harness resumes the fit rows after
the flat rows; completed flat results are retained unchanged.

The combined rerun plan is balance/plans/counters-rush.json on 086042f.
