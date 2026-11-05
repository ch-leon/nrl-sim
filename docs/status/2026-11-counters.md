# Strategy counters switch-on (#465)

Leon’s 5 Nov acceptance decision requires all eight nonzero neutral cells to
swing **4–6 win-share points paired against dormant main**, flat preset controls
within **42–58%**, and full-fit swings of **9 points or stronger** (9–12 nominal).
Distance from 50% is not the acceptance measurement.

Rush 0.61 passes its neutral target (+4.50pp) and all fifteen round-robin averages
(maximum 52.671429%). The complete 140-case fit-edge 0.065 soak passes Normal
win-rate limits and all invariants but exceeds the Easy managed cash band.
Fit edge 0.06 passes both Easy/Normal managed cash probes and all eight full-fit
cells; its complete actual-default validation is now running.
PR #506 remains draft until all numeric, complete-soak, CI and phone guards pass.
The final before/after tables and permanent raw-run links will replace this
validation checkpoint before the PR is marked ready.

## Selected defaults

| Group | Values |
|---|---|
| Tight | on 1; offloadBase 1; offloadPerFit 9.5 |
| Own fit | on 1; edge 0.06; counterResponse 1 |
| Slide | on 1; expansive 0.08; expansiveFit 0.2; kickChase 0.4; kickChaseFit 0.7; tight 0.025; allOut 0.5; allOutRecovery 3; allOutReset 3 |
| Rush | on 1; carry 0.0005; defenceFit 0.029; kickChase 0.61; allOut 0.1 |
| Compressed | on 1; tight 0.06; tightFit 0.6; expansive 0.09; brokenBase 0; offloadBase 0; commitM 10; commitFit 0.5 |
| Kick-chase preset | base pass +0.04; existing step, early kicks and bomb weights retained |

Neutral calibration at 1,000 matches per cell gives Tight/Slide +5.45pp,
Tight/Compressed −4.75pp, Expansive/Slide −4.15pp,
Expansive/Compressed +5.15pp, Kick-chase/Slide −5.85pp,
Kick-chase/Rush +4.50pp, All-out/Slide +5.10pp and All-out/Rush −4.15pp.
The committed plans now rerun those paired measurements with actual defaults.

For full fit, Leon specified: “Isolate counter + fit; hold Tight rebuild on in
both runs.” The control also holds the independent Kick-chase passing retune
fixed. A fully dormant variant restores the legacy pass −0.05 and Tight off,
so the final tables expose the total change as well. The neutral control restores
legacy pass −0.05 too; immutable dormant-main shares guard against a redefined
baseline. Enabled plan overrides must match the live preset default.

Equal neutral fits preserve cell strength. Unequal-fit response uses cached
starting sheets; Compressed’s additional help reach applies only to a defending
fit advantage. All-out extends the existing receiver recovery window. Every
mechanic uses existing match events and rolls; no new stored stat or RNG call.

## Replay guards and scope

Expansive/Slide is deliberately re-pinned from
`8-10:377:e051c574b7fe72b5` to `10-38:372:0e0dce9822247ec4` because strategy
counters switched on, #465. Balanced/Slide stays
`10-26:350:34ab09d37c3de210`. The final season pin returns to main’s
`3040797444`; UI-read and no-read seasons still agree. These defaults and pins
become the guard after merge. SAVE_VERSION stays **21**. Labs/commercial
flags remain untouched.

`RIVAL_STYLE.packStrength` remains 1.0. Rivals still choose from their own nine;
#322 should reassess style frequencies with the existing heuristic. AI counter
picking is outside this PR. Phone verification opens lineup/plan sheets and plays
to full time at 667×375 and 844×390; screenshots belong only in CI artifacts.
