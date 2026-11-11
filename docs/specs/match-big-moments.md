# Match big moments — item 4

Status: integrated release candidate, 11 November 2026, tracked by
[issue #588](https://github.com/ch-leon/nrl-sim/issues/588). The character/contact
baseline shipped in [PR #584](https://github.com/ch-leon/nrl-sim/pull/584).
Items 3 and 4 now build on that released source (`35bdf67`), preserving its
subsequent fixes and progression/save work. The release PR records the combined
candidate's checks and publication status; prototype evidence below is historical.

## Goal and scope

Make kicks, high takes and scored tries immediately readable with the approved
characters. Keep persistent faces, proportions and short limbs. The animation
follows the sim's actual ownership, deadlines and outcomes; it never rolls or
predicts a winner.

Done when the kick clearly reaches the strike on the real release tick, a
successful high reception has a distinct airborne take and landing, and the
scorer grounds the ball, recovers and celebrates without an abrupt pose change.
Teammates can react differently without inventing a paired interaction.

## Implementation

- `moments.ts` paints punts, low grubber stabs, drop kicks, high takes, scored
  dives, recovery and individual celebrations. It reuses the approved head
  painter and short arm/leg solvers. Dives rotate the body and face together;
  turf flecks mark the slide. All images fit the existing 44×40 texture.
- The kick sampler uses real start, strike and unlock ticks. Frames before the
  strike keep the ball embedded in the holder's hands; the strike and follow-
  through use the real flying ball. Immediate goal kicks begin at the strike,
  without adding a wind-up or postponing the flight.
- Successful non-bouncing kick receptions are explicitly tagged at the three
  existing success paths: ordinary landing, won bomb contest, and won short
  kick-off. Ground grubbers, spills and other players get no high-catch tag.
  A six-beat take/landing follows the winner only while he still holds the ball;
  new contact interrupts it. Its final frame matches the continuing carry.
- High catches and celebratory hops lift only the actor image, by up to six
  world pixels. Shadows, possession rings, depth and simulation coordinates
  stay on the turf. No texture allocation is needed for height changes.
- The try phase identifies the actual scorer and his scoring side. The first
  ten ticks show the dive/grounding; the next ten bridge the sim's change from
  `dive` to `celebrate` with a rise. The scorer then joins the celebration.
  Teammates choose stable fist-pump, pointing or arms-up reactions from player
  identity and try time. No extra RNG, invented chest-bump partner or opponent
  celebration is introduced. The holder keeps the only rendered ball.

## Snapshot contract and compatibility

`PlayerSnap` adds optional `kick`, `aerialCatchTick`, `tryTick` and
`celebrationTick` presentation fields. Kick/try facts are derived during
`snapshot()` from current state. Only `aerialCatchTick` is retained on the player,
written after a successful catch and read solely by snapshot/render code.
An old tag cannot affect a later pass or pickup because it must match the current
`caughtTick`, real holder and allowed pose. Older records lacking the new fields
retain ordinary pose sampling.

No movement, rules, contest probabilities, timing knobs, match RNG, saves or
appearance assignments change. The frame cache remains bounded at 512 CPU
frames, with one reusable GPU texture per actor. Pause and seek sample from the
snapshot alone; no wall-clock animation state is accumulated.

## Review

`match-moments-comparison.html` is a standalone offline comparison with shared
play/pause, scrub and speed controls and selectable scenarios. Both sides show
actual seed-1 moments from the same simulation ticks, in a closer camera view:

| Scenario | Event tick |
| --- | ---: |
| Kick-off / punt motion | 43 |
| High reception | 120 |
| Grubber | 1979 |
| Try, recovery and reactions | 2099 |
| Drop-kick conversion | 2209 |
| Another try and personal reactions | 7317 |

The before version is the completed item-3 source (`ff0b1dd`). Captures advance
the real game at a fixed simulation clock, with camera framing held for a useful
comparison. They are visual evidence, not a device frame-rate benchmark. The
production browser checks also exercise the ordinary camera and phone layout.

## Validation

The new art tests cover all moment actions, six frames, eleven heads, three
builds, front/back views, bounded limbs and exact landing/recovery joins. Sampler
tests cover actual strike timing, an immediate goal kick, ownership changes,
contact interruptions, the scorer's recovery, personal reactions and replay.
A real-engine test checks kick/reception/try facts and confirms repeated
presentation reads do not alter the match.

The baseline comparison sampled every snapshot for seeds 1, 7 and 42 over
10,000 ticks each. After removing only the four new presentation fields, all
positions, headings, poses, possession, ball trajectories, events, clocks and
scores matched the previous version exactly (30,000 matching ticks).

`scripts/e2e-moments.mjs` finds real moments rather than forcing outcomes and
checks pause/seek pixels, actor height versus grounded shadow/ring, one ball,
cache/texture stability and phone layout. The existing `e2e-live-art.mjs` also
checks contacts, transitions, texture cleanup and a real career match.

```sh
npx tsc --noEmit
npx vitest run
npm run build
npm run preview -- --host 0.0.0.0 --port 4176
E2E_URL=http://localhost:4176/ CHROMIUM_PATH=/usr/bin/chromium E2E_OUT=/tmp/nrl-moments/browser-production node scripts/e2e-moments.mjs
E2E_URL=http://localhost:4176/ CHROMIUM_PATH=/usr/bin/chromium E2E_OUT=/tmp/nrl-moments/live-browser node scripts/e2e-live-art.mjs
```

Local results on 11 November 2026: typecheck and production build passed;
all 3,054 tests in 252 files passed. Both production Chromium scripts passed,
including actual moments, per-player pause/seek consistency, grounded shadows,
one ball, phone layouts and a real career match. Scene restart kept 59 textures.
The offline comparison passed all six clips, shared seeking, play/pause, half
speed and 390-pixel stacked layout checks. This is not a deployed build.
Safari/device testing, different-tool review and the repository's CI/QA gates
remain release work.

## Integration

The transfer bundle supplies an item-4-only patch on `ff0b1dd`, and a cumulative
items-3-and-4 patch on the approved art source tree
`721cd0f3db64b138fa5bee04442b53c403f81c3b` (local checkpoint `d3c1f1f`). Choose the
patch matching the integration branch; do not apply both. Check applicability
and reconcile any release-session fixes rather than overwriting that branch.
The manifest records and verifies both patch paths to the same final source tree.

The original playable-build handover was completed in PR #584. Issue #588 owns
publication of these follow-ups. Portraits, grounds characters and an appearance
editor remain outside this animation pass.
