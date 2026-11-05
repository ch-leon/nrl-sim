# Acceptance provenance

Fresh official-harness checkpoints retain every seed 1–500 in both orientations for Tight/Compressed. The four other Compressed cells reuse unchanged accepted cell settings from 20261105-015204-compressed-464-b15-o30-matrix; changing the Tight knob cannot affect those attacks. Balanced/Slide (1000 matches) and Balanced/Rush (2000 matches) reuse the preceding unchanged final-range checkpoints from 20261105-013647-compressed-464-final-matrix. Every block has 125 seeds, played both ways. No seed/orientation is discarded. Source plans, metadata, reports and raw JSON are in inputs/.

Eight previously accepted non-balanced Slide/Rush controls and the two unchanged Balanced controls are reused from the balance-log runs listed in meta.json. The reused Slide/Rush controls have no Compressed defence; the four reused Compressed cells have no Tight/Compressed interaction. Every active counter/profile setting matches the final plan. Their active Tight/fit/Slide/Rush settings exactly match the final plan; changed inactive Compressed defaults cannot alter a replay. Tight/Rush retains all 2000 matches from its existing approved extension.

The legacy Compressed flat contact profile is a separate calibration control, never pooled into final acceptance. The enabled profile normalizes the flat baseline and localizes its Contact D-scaled middle advantage to Tight; neutral attacks still receive zero matchup-cell modifiers.

Pooling: M2_i=SE_i²×n_i×(n_i−1). With pooled mean m, M2=Σ[M2_i+n_i×(mean_i−m)²], SE=sqrt(M2/[N×(N−1)]). Tracked statistics use trackedSeeds; legacy counts use seeds. Rates/legs are match-weighted; wrestle seconds are weighted by wrestle counts. ms sums source cell wall times.

The committed full plan reproduces the complete consecutive ranges. All signed totals are checked unrounded in ACCEPTANCE.json.

Selected defaults are recorded in SELECTED_VALUES.json at final source commit 5a1bedc6dd6c2db897180691f857c91ce291503f. TUNED_VALUES.json retains the measurement-source defaults and explicit enabled overrides; those overrides match the selected enabled settings. The final source changes only dormant default tuning and test/documentation expectations from the measured gameplay code. Main updates #496 and #505 do not change the match engine or the fixed flat-squad acceptance inputs.
