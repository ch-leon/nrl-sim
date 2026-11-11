# Match player art and live integration

The approved character art and close-contact poses render in career matches
and `/#lab`. [Release PR #584](https://github.com/ch-leon/nrl-sim/pull/584) records
the independent review, final-candidate checks and verified deployment. The
validation notes below retain the original local handoff evidence.
`/#artlab` preserves the isolated studies,
loaded before career setup or storage, including the previous-art comparison.

Leon approved the baseline including the leg correction on 11 November 2026 and
requested a playable build in a new Astra session. Continue with the
[release handover](../handoffs/match-art-playable-build.md). Transition polish
and big-moment animation work follow that release and phone play-test.

## Live match integration

- `MatchScene` paints stable player identities in reusable 44×40 textures. Kicks,
  fends, dummy-half pickups and celebrations share the approved head proportions.
  Catches keep the running legs, then tuck into a carry after four simulation ticks.
- `LiveView` draws only the carrier and defenders named by the sim in a shared
  contact layer. Arrivals follow recorded join ticks. Low tackles, dominant hits,
  wraps, breaks and legal one-on-one steals follow the recorded result, with
  deterministic cosmetic variation. Real field movement remains authoritative.
- Falls and releases fit the actual ruck duration. Defenders return to their real
  positions before play-the-ball; breaks and steals return to individual movement
  after four ticks. Possession is drawn once, in the holder's hands, with a separate
  sprite for a flying or loose ball.
- Contact snapshots include join, result, phase and release timing. Skipped display
  frames, replay, seeking and resume do not need to have observed the first hit.
  Old recordings without contact references use individual character poses.
- Appearance uses the existing player ID mapping and follows interchanges.
  Simulation-tick frame selection keeps pauses and replays consistent. The CPU
  frame cache is capped at 512; each fixture owns one texture per player and one
  contact texture, all freed at scene shutdown.

Contest odds, RNG, movement, fatigue and strip rules are unchanged. Portraits and
grounds characters remain a later art pass. The larger head catalogue stays
available in the art study; existing careers retain their assigned hair and colours.

## Review

Run `npm run dev`, then open `http://localhost:5173/#artlab`. Compare the same
carry, pass, catch, contact, landing and play-the-ball in the current and proposed
art. Both panels use the same actors, clock, carrier path, kit colours and pitch.
During contact, the prototype uses a shared coordinate space for both bodies so
the defender's hands stay at the carrier's chest at every camera size.
The proposed sprites have a taller silhouette; both use the same integer pixel
scale (2× normally, 3× close up).

Choose the receiver's build, hair/headwear, beard and wrist tape. The head strip
is also clickable. Turn players switches front/back views. Beat buttons pause
at an action; the scrubber, replay, speed and Pass now controls allow closer
inspection. Arrow keys move the attacking lane. Reduced motion starts paused.

Study 02 uses larger three-quarter faces, with two readable eyes, broader hair
shapes and visibly padded headgear. Ponytail and flat top join the original nine
head choices. The receiver now keeps moving through the catch, tucking into the
carry after 0.2 seconds instead of holding until the next staged beat.
Neutral two-pixel mouths have stronger contrast than cheek shading, including a
small skin gap in beards; expressions remain reserved for a future animation pass.

**Nine-player test** shows a fixed illustrative cast in the same kit, with no
names or possession markers. Play/pause, scrub, turn, close up and comparison
still work. Change positions rearranges the same characters without changing
their looks. This cast is authored for the study; it does not assign new hair or
colours to existing career players.

**Study 03 / Tackle replay** loops the approach through play-the-ball. A single
pose clock drives the plant, contact, wrap, backward drive, descent, grounded
hold and release. The defender clears the carrier before play-the-ball. Heads
and appearance mappings use the approved Study 02 artwork. Pixel frames are
cached at 20 fps; keyframe sampling is deterministic when scrubbing or changing
speed. This first coordinated sequence remains available as **Original wrap**.
This sequence records the first visual review, before live integration.

**Study 04 / Tackle situations** adds two- and three-defender tackles, a quick low
stop, a dominant hit, a late tackle break, a one-on-one ball steal and an upright
wrestle. The standalone export now opens here with Current and Prototype visible:
side by side on desktop, stacked on a phone, using the same scenario and clock.
Current uses the existing sprite artwork in this rehearsal, not a live-match recording.
Outcome and follow-through buttons,
slow motion, scrubbing and two deterministic footwork/landing variations let each
situation be reviewed at phone size. The carrier stays visible between the high,
low and far-side defenders. Heads tilt with falls; release is staggered. Breaks
and steals run on without a play-the-ball, and the possession marker follows the
new holder on a steal.

These are authored rehearsal snapshots, not recordings of live matches. They
exercise the same exact-participant contract now exposed by `LiveSim`:

- `Snapshot.contact` names the carrier, actual joiners in arrival order, their
  appearance identities and the contact's starting tick.
- Contact outcome events carry the same references, including the final group
  on a late break or completed tackle. A strip names its single defender.
- `advanceContactAnimation` folds those snapshots, preserving join times and
  selecting from the recorded result. A short completed one-man hold can use
  the low-tackle artwork; it is a visual subtype, not a new simulation outcome.
- The current ball holder remains authoritative. Unknown legacy contact data
  falls back to ordinary player art; the view never infers participants from
  distance or rolls another outcome. The visual variation uses a stable hash,
  not the match RNG.

The snapshot/event additions are render metadata only. Fends, offloads, contact
errors, touch and scoring in contact use individual character poses; the shared
contact selector cancels on unsupported outcomes.

**Study 05 / Close contact** brings the defender's shoulder into the runner's
chest or hips during the grip. Torso overlap is intentional; heads tuck beside the
runner, and some of each defender can be hidden during the collision. Arms have
two short bent segments and a maximum reach, including while joining or releasing,
so they cannot stretch across a gap. The carrier absorbs each actual arrival
through the trunk and knees with planted feet. Dominant hits recoil more sharply,
and completed tackles drop into a quicker, tighter landing. The outcome, join
order and possession still come from the same snapshots. Current/Prototype
comparison remains the default.

**Footwork correction:** contact poses now constrain each thigh and shin to five
world pixels and total reach to 9.5, matching the normal character's proportions.
The standing contact keyframes lower the hips and upper body by four pixels,
removing the previous taller stance when a tackle starts. A boot
slides toward the moving hip once its planted position is out of reach, preserving
its ground height. The knee follows its authored bend continuously and stays above
the sole while falling. This applies to both legs on the carrier and every actual
joiner, after posture and docking, in the study and live matches. Close body
contact, appearance, ownership and simulation timing are preserved.

For a standalone HTML artifact, with fonts and artwork included:

```sh
node scripts/export-art-preview.mjs /tmp/nrl-art-preview.html
```

## Compatibility and scope

- `appearanceFor(id)` preserves the existing 12-entry look mapping. Extra body,
  tape and boot choices use a separate, version-labelled hash. Extending the new
  head catalogue does not change legacy assignments.
- New heads are preview overrides; there is no save migration or career editor.
- The renderer paints only requested frames, cached by the scene, rather than an
  atlas containing every possible cosmetic combination.
- Eleven head options, three builds, two three-quarter views (mirrored for left),
  and dedicated carry, brace, wrap and grounded poses are covered here.
- Portraits, grounds characters and a persistent appearance editor remain later work.

## Validation

`tests/art/prototype/player.test.ts` checks legacy identities, distinct looks,
frame bounds across 3,564 combinations, continuously moving catches, possession
through the passage, and stable identities through the recognition loop.
`scripts/e2e-art.mjs` checks the controls, unchanged current-art baseline, save
isolation, both studies, the tackle loop, reduced motion and three viewport sizes.
`tests/art/prototype/tackle.test.ts` checks joint continuity, maintained contact,
release, possession and frame bounds across heads, builds and viewing directions.
Point `E2E_URL` at the dev
or production preview server and set `CHROMIUM_PATH` to the browser executable.
Screenshots are written outside source control under `E2E_OUT`.

`tests/match/view/contactAnimation.test.ts` checks exact arrivals, outcome selection,
possession transfers, deterministic variation and old-recording fallback.
`tests/art/prototype/contact.test.ts` checks ownership, participants, continuation
after breaks/steals and sprite bounds across the new situations. The live-sim
tests check participant references against actual snapshots and verify that extra
render reads do not change seeded matches. Browser checks include all seven cases,
variation, and portrait/landscape layouts down to 360 pixels wide.

Contact-art regression checks also enforce short arms and close torso contact
through every situation, movement variation, fall and release.
They now cover both leg lengths and knee height at every sampled contact phase,
including compressed seven- and fourteen-tick live rucks and boot movement with
the hips.

`tests/art/match/livePlayer.test.ts` covers the remaining match poses and bounded
frame caching. Player-picture and live-view tests cover running catches, facing,
interchanges, participant visibility and single possession rendering. Live-sim
tests compare fresh snapshot selection with selection across consecutive ticks.
`scripts/e2e-live-art.mjs` runs real seeded matches, checks contacts and possession,
pause/seek consistency, desktop and phone layouts, scene texture cleanup, and the
career-match route. `E2E_RECORD=1` captures a real match passage at ×1.

Local verification on 11 November 2026: typecheck and production build passed;
all 3,039 tests in 248 files passed, including the leg-reach regression checks.
Chromium checks passed against the production
preview at 1280×800 and 844×390, including real two- and three-defender contacts,
breaks, steals and career playback. Scene restart kept the texture count at 59.
WebKit could not be installed here (browser-download hosts returned 403), so
Safari verification, independent review and CI/QA remain required before release.
