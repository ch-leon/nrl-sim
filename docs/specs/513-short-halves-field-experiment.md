# Short halves and field-length experiment

Leon requested this revision on 13 November 2026: 2.5-minute halves, a normal
100m field, and 100m/80m/60m choices in the existing Experiments section. These
replace the separate-build-only delivery in draft PR #678. Keep the short-match and separate career-balance PRs held
for his play-test; do not merge. Retreat PR #677 was merged by another process
on 13 November; this candidate includes it.

## Design

Normal matches use 2:30 clock halves. The original viewing target remains about
2–2.5 actual minutes per half at selected ×1; stoppages and play-on can vary it.
Use the existing career smart pace. The measured 40-seed neutral means from the
first experiment were 10.15, 12.825 and 17.675 combined points on 100m/80m/60m.
Do not silently retune scoring or fatigue to force these results.

Experiments has a field-length selector, 100m selected by default. Its preference
is browser-local alongside the other experiment settings, never a career rule.
An explicit Apply action saves/readbacks the preference and reloads the game
between matches, using the existing live/parked/resumable/advance guard. This
freezes geometry before simulation and stadium modules initialise. An active
match cannot change dimensions. Reset all returns to 100m and refreshes when
needed. Storage failure reports failure without applying a partial change.

Main-thread simulation, skip/background/replay workers and stadium art workers
must use the same frozen length. Keep Vite's inline worker URLs; convey the
validated length in worker names, preserving existing names at 100m. Include
field length in match recovery identity so a record from another field cannot
silently replay. Bump the retreat engine revision before integration.

Preserve physical metre units, 68m width, 10m retreat, goal/touch/dead-ball geometry
and kickoff formation. Disable 40/20 at 60m where its zones meet. Keep ordinary
kicking distances, bins, fatigue and substitutions unchanged as prototype limits.

## Implementation plan

- [x] Add red tests for strict/default field preference parsing, worker bootstrap,
  persistence/readback failure and transition guards. Implement a small DOM-free
  field-settings helper and frozen field resolver; wire Experiments selector and
  reset. Verify `npx vitest run tests/labs` and typecheck.
- [x] Add red Worker/name/recovery parity tests, then update all four worker entry
  points and engine identity. Build and check actual browser Worker snapshots and
  art extents under all three selections, not only mocked workers.
- [x] Change normal half length to 2.5; inspect the full suite before adapting
  clock-sensitive mechanics fixtures. Keep explicit historical-duration fixtures
  where they test scoring or whole-match mechanics, and separately test the real
  default duration. Do not introduce a hidden global test override or lower
  balance thresholds just to pass.
- [x] Resolve the existing WebKit counter-report witness failure against the new
  clock/trajectories while retaining real loss/counter assertions.
- [x] Run default and 80m/60m browser matches, selection/reload/reset/recovery,
  save unchanged/invalid-value/storage-blocked cases, portrait/landscape controls,
  timing and scoring. Re-run the existing balance harness if simulation semantics
  change, otherwise preserve previous run attribution and confirm parity.
- [ ] Independent Claude review, typecheck, complete unit suite, production build,
  PR CI/WebKit and QA. Update hub/spec/PR description around the final feature.
  Publish one private candidate with the existing Experiments UI; keep unmerged.
