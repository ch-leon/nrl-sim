# #625 retreat fix and #513 pre-merge match comparison

Leon approved fixing defensive retreat first, then playable 100m, 80m and 60m
versions. Target: 4–5 minutes of watching at ×1. Nothing in this task may merge
before his play-test; retain draft PRs even when review and CI pass.

## Architecture

Retreat state belongs to the current ruck: retain its fixed legal retreat line,
track which non-markers still owe a retreat, and release each after physically
reaching that line. Pending defenders continue towards it and cannot commit or
make contact. The defensive line can advance normally for defenders already
onside. Preserve marker hold/dart behavior; clamp legal retreat to the defending
goal line. Clear stale obligations on possession/restart/half changes and handle
handovers, sin bins and substitutions. Do not wait for the whole defence or move
players instantly. No RNG draw or save format change is necessary.

The experimental comparison is a separate stacked PR/build. Use one validated,
build-time preview configuration (allowed lengths 100/80/60m; 2.5-minute halves),
with no preview setting retaining today's 100m/7-minute defaults. Constants must
be resolved before simulation/Worker startup. Keep field width 68m, body and
player metre units, 10m retreat and marker spacing the same across variants.
Update physical midpoint/kickoff placements, boundary decisions and normalized
snapshot projection consistently. Render the correct physical field geometry
and markings. Test kick-zone rules on short fields, avoiding degenerate 40/20
zones. Do not silently tune contact odds or speed to obtain desired scores.

Serve three separate bundles behind a small comparison page, using the existing
match lab and identical seeded fixtures, with speed ×1. Label length, half length
and draft status. Record actual elapsed watching time per half excluding manual
pause/half-time wait; retain scoring and compare with harness measurements.
Preview hosting is separate from the live GitHub Pages build. Keep PWA caches
and preview save/state separate from the production game.

## Implementation and verification

- [x] Add failing retreat regressions (known seed1 case, both directions, release,
  markers, goal-line exception, restart/possession and unavailable players).
  Implement eligibility plus movement in `live/base.ts`, `live/contact.ts`,
  `live/positioning.ts`, `live/play.ts`/`restarts.ts` as needed. Run targeted tests.
- [ ] Run full checks on the corrected 100m baseline, refresh trajectory-dependent
  fixtures while retaining behavioral coverage; isolate restoration/fatigue checks
  from changed whole-match trajectories, and measure via the existing balance
  harness. Independent Claude review lists problems without editing. Draft PR625.
- [ ] In a stacked preview branch, implement validated preview config, metre-space
  field geometry/projection and midpoint/kick fixes. Add regression coverage for
  default identity and all three field lengths. Build all variants and verify
  real browser matches, clocks, halves, restarts, touch, tries and conversions.
- [ ] Add the comparison page and viewing-time evidence. Run harness plans across
  three fields with 2.5-minute halves, retain actual match totals (the report's
  default columns normalize to14 minutes). Check fatigue/substitution effects
  and disclose prototype limits rather than retuning unasked mechanics.
- [ ] Run TypeScript, full Vitest, production builds, independent review and PR CI
  plus QA. Screenshots stay in CI artifacts or outside git. Update hub Recently
  added/roadmap with draft PR links. Publish private preview links and retain
  both PRs as drafts for Leon's play-test. Never merge in this task.
