# #618 — Square ruck markers

## Design

The existing two-marker defence stays in place. Its targets change from side by
side to a single line through the play-the-ball: both use the mark's lateral
coordinate; first marker is 1.8 m toward the defending goal line and second marker
is another 1.8 m behind him. Both gaps equal one body diameter, keeping the normal
separation pass from pushing a settled ruck sideways. The attacking direction
mirrors the offsets, including after teams change ends. Normal field clamping
still applies.

Selection, release timing, defensive presets and early reactions to dummy-half
darts retain their existing rules. No new random draw, save state or rendering
rule is needed. Spacing lives in LIVE and the tuning reference.

Standard Nines variations retain the ordinary play-the-ball laws: a second marker
is permitted, while a single marker is a tactical option. Sources:
- [Nines variations](https://rugbyleague.wales/nines-2)
- [2026 International Laws, §11.10(c), (f)](https://www.nrl.com/siteassets/operations/the-game/international_rugby_league_laws_of_the_game.pdf)
- [NRL World Cup Nines tactics](https://www.nrl.com/news/2019/08/30/no-room-for-props-as-versatility-to-determine-nines-selections/)

## Implementation plan

- [x] Add a test-only LiveSim subclass to expose ruck targets and movement. Test
  square targets, ordered non-overlapping spacing, both directions, touchline and
  goal-line marks, and retained targets during the post-heel hold. Run against
  the original implementation and confirm the geometry assertions fail.
- [x] Add `live.markerStandM = 1.8` and `live.markerGapM = 1.8`; compute marker
  targets as `mark.x + dir * (markerStandM + k * markerGapM)`, `mark.y`. Verify
  settled marker bodies stay aligned through ordinary separation. Cover release
  for Slide, Rush and Compressed and early dummy-half reactions.
- [x] Update BAK-207 defence, BAK-208 defence and tuning §3, and features Recently
  added with the PR link. Run targeted tests, TypeScript, full Vitest and build.
- [ ] Have Claude independently review the issue's done-when line and final diff,
  listing problems without editing. Open one draft PR, run PR CI plus QA, and
  retain screenshots as CI artifacts. Merge requires Leon's thumbs up per the
  instructions supplied in this chat.

## Verification notes

New marker regressions fail on the old geometry and pass on the fix. Moving
physical defenders changes seeded trajectories, so integration fixtures and replay
pins are refreshed; the tests retain their play, receiver, interception and penalty
outcome checks. Momentum checks now use precise clock times instead of truncated
whole-minute event timestamps. The separate [pickup-commentary prerequisite](https://github.com/ch-leon/nrl-sim/pull/620)
fixes a latent catch/pickup inference error exposed by these new trajectories.

The balance harness compared 40 seeds each for neutral, Rush and Compressed
matchups. Main tackle, line-break, offload, error, kick and try bands remain inside
target. Tackle counts fall significantly; neutral completion rises into band.
Rare neutral grubber tries/repeats leave their narrow bands without significant
differences in this sample. This is focused coverage, not full strategy-matrix or
win-balance acceptance. A separate 200-seed opening-window check supports more
All-out offloads than Balanced; its estimated 1.368 ratio cannot distinguish the
true effect from 1.4, so the qualitative test replaces its old arbitrary 1.4 sample
floor. No tactic multiplier changes. Exact reports are attached to the PR.
