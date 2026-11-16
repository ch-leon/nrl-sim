# Match art and animation improvement plan

Date: 16 November 2026  
Status: stage 1 implemented in [draft PR #697](https://github.com/ch-leon/nrl-sim/pull/697),
tracking [#696](https://github.com/ch-leon/nrl-sim/issues/696). Local functional checks passed;
release validation is in progress. Leon agreed to all five improvement areas.

Stage 2 is implemented in [draft PR #699](https://github.com/ch-leon/nrl-sim/pull/699),
tracking [#698](https://github.com/ch-leon/nrl-sim/issues/698),
on top of the stage-1 candidate; local validation passed. One Sol agent
implemented movement, Luna runs the shared validation, and the main agent reviews
the source, visual result and rendering cost.

Stage 3 is implemented in [draft PR #701](https://github.com/ch-leon/nrl-sim/pull/701),
tracking [#700](https://github.com/ch-leon/nrl-sim/issues/700), on top of stage 2;
local functional validation passed. Leon's explicit review policy: leave every PR open and
unmerged; Leon reviews before merging. This overrides the repository's automatic
merge convention for this work. Keep the staged PRs as drafts.

Stage 4 handling presentation is implemented in [draft PR #703](https://github.com/ch-leon/nrl-sim/pull/703),
tracking [#702](https://github.com/ch-leon/nrl-sim/issues/702), on top of stage 3.
This presentation pass connects pickup, release and reception, and prepares the
actual receiver once the engine has launched his pass. A pre-release call still
requires the separate earlier commitment described below: dummy-half controls,
set plays and dart/pass choices currently resolve at release. No guessed call
or new gameplay decision is part of this visual change.

Stage 5 starts with a bounded kicks, aerial takes and try finishes pass under
[#704](https://github.com/ch-leon/nrl-sim/issues/704), on top of stage 4. It carries
the same support, weight and continuous handoffs into the existing moment painters.
Wider officials, crowd, reactions, weather and full-match consistency remain
subsequent stage-5 work; this first pass does not complete the entire stage.

Make an ordinary passage of rugby league enjoyable to watch. Players should have
weight, the ball should be easy to follow, and tackles should make sense without
commentary. Keep the game's playful pixel-art character and make the improvement
obvious at phone size.

## Approach

Work through the stages below in order. Use the existing Match Lab, art lab,
renderer and replay tools. Each stage produces something visible in a running
match. Build on the existing running, contact, handling and reaction work.

Leon requested economical delegation: use bounded subagent tasks with short
briefs, a capable coding model for coupled art/render changes and a lighter model
for simple palette work. The main agent coordinates, integrates and reviews.
Share verification results and run full checks once on the combined candidate.

Use one real 20–30-second passage as the reference throughout: dummy-half pickup,
pass, moving catch, change of direction, tackle, recovery and play-the-ball.
Choose it from the current engine and retain its seed and tick range. Additional
short lab cases cover actions missing from that passage. Compare the same passage
before and after visual changes; refresh the reference explicitly if an intended
simulation change alters the play.

## 1. Establish the look and a simple authoring workflow

- Refine three representative players: lean, athletic and stocky, in two opposing
  kits. Improve shoulders, torso shading, hands and the ball's separation from
  the body. Try a modest proportion adjustment that gives actions more room while
  keeping recognisable faces and heads.
- Quiet the grass texture and background contrast so players lead the picture.
  Keep clear field markings, crisp kit colours and consistent grounded shadows.
- Add side-facing and turning key poses to the existing front/back artwork.
  Start with the directions that improve ordinary play most.
- Make key poses and timing easy to edit in the existing painters. Use a small
  layered sprite sheet where hand-drawn frames give a better result, retaining
  procedural kit colours and player identity. Integrate only what the first
  sequence needs; let that establish the asset format.

**Done when:** the revised cast, ball and pitch read better in the running phone
view, and a key pose can be revised and previewed without changing match logic.

If budget is available, give a pixel animator this cast and the reference passage
as a focused brief. Their first deliverables are movement and contact key poses.
Proceed with the existing tools while that is arranged.

## 2. Make everyday movement feel physical

- Improve the existing jog and sprint cycles, keeping stride tied to distance.
- Add acceleration lean, braking steps, planted turns and defensive shuffles.
- Separate body facing from travel direction where a defender watches the ball
  while moving sideways or retreating. Use existing movement and ball facts.
- Let hips, shoulders and head turn in sequence. Give each action the frames and
  timing it needs rather than forcing every action through six equal beats.

**Done when:** a player can start, sprint, turn and stop convincingly at normal
speed, and defenders reposition with readable footwork. Check both directions
and all three builds in the reference match.

## 3. Make tackles the strongest animation in the game

- Polish a complete one-defender tackle first: approach, brace, impact, struggle,
  fall, release, get-up and play-the-ball.
- Plant feet during the struggle; show weight transfer through knees, hips and
  shoulders; make the landing sharp and the recovery continuous.
- Extend that treatment to existing low tackles, dominant hits, side drags,
  ankle taps, tackle breaks and strips. Give each its own clear silhouette.
- Improve two- and three-defender contact through arm placement, body layering
  and staggered arrival/release. Keep the carrier and possession readable.
- Tune existing impact sound and effects to the physical contact frame.

**Done when:** the main tackle outcomes are distinguishable with labels hidden,
and the full contact-to-ruck sequence works without conspicuous sliding or pose
jumps. Participants and outcomes continue to come from the simulation.

## 4. Connect handling and show intention

- Refine pickup → pass → catch → carry while preserving footwork and momentum.
  Rotate the torso into the pass and keep hands aligned with actual ball release.
- Show a receiver preparing his hands, a defender bracing and a runner planting
  before a change of direction when the simulation supports that action.
- The engine currently chooses a receiver as the pass leaves. Add a short
  preparation window with an explicit intended receiver where necessary; expose
  that commitment to the renderer and cancel it if contact or lost possession
  interrupts the pass. Coordinate this with the existing attack-shape work and
  [receiver-call issue #672](https://github.com/ch-leon/nrl-sim/issues/672).
- Treat earlier passing commitment as a gameplay change: use the existing balance
  harness to check passing, errors and attacking outcomes. Keep visual changes
  driven by existing facts separate from that behaviour change.

**Done when:** the complete reference passage feels connected and its preparation,
release, reception and contact are understandable at ×1 with commentary hidden.
This is the first major playable milestone: the quality standard for the rest.

## 5. Carry that quality across the match

- Apply the improved directions, proportions and timing to kicks, aerial catches,
  try finishes, celebrations, fatigue, errors and walk-offs.
- Give kicks readable preparation and follow-through; connect aerial take to
  landing and carry, and try grounding to recovery and celebration.
- Bring officials and nearby crowd artwork into the refined visual style. Tune
  existing crowd reactions, sound and camera emphasis to support the play.
- Check the result across contrasting kits, player appearances, group contact,
  interchanges and weather. Adjust the existing cache only if profiling shows a
  real need after the new frames are in use.

**Done when:** a whole career match maintains the reference passage's quality,
including ordinary phases and major moments, with readable action at normal and
fast playback speeds.

## Delivery and checks

Use small, coherent PRs with a plain “done when” from the stages above. Reconcile
them with [match watchability #626](https://github.com/ch-leon/nrl-sim/issues/626)
and its existing issues before creating duplicates. Keep this plan and the hub
current as work lands. The main review points are the complete reference passage
and a full career match; make routine art and implementation decisions as we go.

Reuse the existing pause/seek, possession, contact, texture and browser checks.
Add focused regressions for new intent/cancellation behaviour and meaningful
animation boundaries. Run the repository's required typecheck, tests, build,
independent review and CI/QA for release. Compare performance before and after on
the same phone, aiming for steady 60 fps at normal speed and responsive fast
playback. Desktop emulation checks layout; the actual phone settles visual quality
and performance. Keep comparison images and clips outside git.

Stage 1 implementation: revised cast and side/turn views by a GPT-6.1 Sol subagent;
pitch/background clarity by a GPT-6 Luna subagent; integration and review by the
main agent. Reference: seed 1, ticks 43–643, on baseline `ed6b643`.

The existing painter now owns small editable torso grids and handling key poses.
The new side profile is selected for horizontal movement after both snapshots
agree; existing front/back artwork supplies the turning views. Shared contact,
ruck and kick art keeps its existing views. Art Lab exposes Side view for ordinary
poses and the head gallery. This establishes the authoring format using existing
tools; an imported sheet is optional when a future clip benefits from one.

Local validation: TypeScript and production build passed; 4,323 tests in 320 files
passed; production Chromium live-art and big-moment checks passed, including a
career match, actual contact/handling/kick/try phases, pause/seek, ball ownership
and texture cleanup. The first 1,200 ticks of seed 1 produced identical events to
the baseline. In that sample, frame-cache misses rose from 11.56% to 17.89%, its
peak stayed at 768 entries, and texture count stayed at 68. This is cache telemetry,
not a device frame-rate measurement. Stage-1 CI `check`, all WebKit shards and their aggregate, and Android
build passed. Separate-tool release review, QA and a real-phone play-test remain
release work. On-demand QA dispatch was unavailable in this session (GitHub API
returned Forbidden).

Stage 2 uses seven small movement poses in the existing painter: acceleration,
braking, two planted cuts, two shuffles and backpedalling. Ordinary jogging and
sprinting have revised leg/support frames. Starts, stops and defensive steps use
four distance-linked support/transfer beats; cuts use two planted beats. Head and
shoulder offsets leave the hips over the supporting foot. Nearby slow defenders
face the real ball while travelling across or away from it.

The view derives movement from the displayed snapshot pair, with no animation
history to lose on pause or seek. An optional snapshot `attacking` field projects
existing engine state so ball-facing defence continues through flight and loose
balls; legacy snapshots use available holder/ruck context. No match decisions,
RNG, save schema or recovery-engine revision changed. Shared contact, ruck and
kick painters keep their own choreography. Art Lab exposes a Footwork control.

Stage-2 validation: typecheck/build and all 4,336 tests in 322 files passed.
Production Chromium live-art and big-moment checks passed, including career
playback, contact/handling, ball ownership, kicks, high catches and tries. Every
new movement state repeated identical pixels while paused and after seeking away
and back. Art Lab's seven Footwork choices and Side view passed at 844×390 without
browser errors or horizontal overflow. Across seed 1's first 1,200 ticks, 20 events
and 12 sampled full snapshots exactly matched stage 1, excluding the new
`attacking` projection.

The same 22-second seed-1 passage from tick 43 was measured sequentially in
production Chromium at 844×390 and ×1, with no concurrent tests/builds: stage 1
averaged 59.3 fps (p95 16.8 ms, longest 50 ms); stage 2 averaged 59.8 fps
(p95 16.7 ms, longest 33.4 ms). Neither had a frame over 100 ms. These desktop
samples show no obvious added stutter; they do not establish phone performance.
In the separate 1,200-tick cache sample, misses rose from 17.89% to 34.49%; the
cache stayed capped at 768 and textures at 68. No cache expansion was introduced.
The previous whole-career performance-budget failures remain open. Stage-2 CI
and Android builds passed. QA, different-tool review and a real-phone play-test
remain release checks, followed by Leon’s review before any merge.

Stage 3 keeps the shared contact painter and recorded lifecycle. Settled wrap
soles stay planted while hips and shoulders absorb arrivals. An editable fall
curve gives the landing a faster final descent and one settling beat; a free
palm and knee support the recovery into play-the-ball. Defenders clear their
hands and rise at different points within the existing release window. Torso,
hand and sole shading makes the support points clearer, and gripping arms are
painted before the carrier's ball panels. Existing impact/audio timing remains
aligned with the recorded resolution event.

The live layout retains a fixed ordinary-contact pivot instead of cancelling
hip motion by translating the whole group. Escapes still cancel the authored
run-out because their world travel already comes from the simulation. Recovery
and positional release finish on `releaseTick - 1`, the last visible shared
frame. This fixes the handoff to ordinary player sprites, including quick rucks.
Before/after seed-1 samples cover one defender (ticks 776–809), two (140–157)
and three (393–402). Their previous 9–24 px horizontal defender jumps at PTB
became 0–1 px; the carrier stayed in place. No simulation decisions, positions,
events, RNG, save format or release deadlines were changed.

Stage-3 local checks: typecheck/build and all 4,341 tests in 323 files passed.
Production Chromium live-art and big-moment checks passed, covering career
playback, real contact participants/outcomes, ball ownership, handling, kicks,
tries, phone layout, scene restart and bounded textures/cache. The final shared
frames of all three sampled tackles repeated exact pixels after pause and seek.
The new geometry tests cover support stability in world layout, bounded limbs,
both directions, ball-panel visibility, staggered release, escape travel and
terminal handoff in five-, seven- and fourteen-tick rucks. One Sol agent built
the change; Luna ran the combined validation; the main agent reviewed the diff,
pose sheets and live-match comparisons.

Sequential production Chromium measurements of the unchanged reference passage
(seed 1 from tick 43, 22 seconds, 844×390 at ×1, agents idle) averaged 59.6 fps
before and 59.4 fps after. Both had p95 frame time 16.8 ms and no frame over
100 ms; longest frames were 33.4 ms and 50 ms respectively. Both reached tick
475 with identical cache counters (2,639 hits / 1,545 misses), peak 768 entries
and 68 textures. This desktop sample shows no material added stutter; real-phone
performance and the earlier whole-career budget concerns remain open. Stage-3
CI and Android builds passed. QA, different-tool review, phone play-test and
Leon's review remain pending.

Stage 4 connects dummy-half pickup to carry, rotates the torso through release,
and gives the actual incoming recipient two preparation poses over his continuing
stride. A free defender approaching the current carrier can brace before contact.
Catch, pass and aerial landing finish on their continuing carry/run poses, with
fatigue retained. The painter and flight renderer share the same ball anchors;
the flight correction follows the receiver's displayed, interpolated position.
Only the ball sprite moves: field position, shadow, lift and kick paths retain
their existing behavior.

Optional snapshot flight metadata identifies the actual recipient, including an
interceptor, and records the source's posture at launch. It survives expiration
of the passer's pose without guessing a receiver or depending on playback history.
Preparation is limited to the final eight ticks of an existing pass, with no
duplicate ball; contact, dead phases, stale identities and expired flights cannot
revive it. No match decisions, RNG calls, save format or simulation timing changed.
Earlier receiver commitment and pre-release calls remain separate gameplay work
under #672/#649. One Sol agent implemented the change; Luna ran shared validation;
the main agent reviewed the source, pose sheets and production comparisons.

Stage-4 typecheck/build and all 4,354 tests in 325 files passed. Focused regressions
cover actual recipients and interceptions, launch metadata lifetime, planted and
tired pose transitions, painted ball anchors, fractional interpolation and the
real seed-1 passes at ticks 178–183 and 195–211. Production Chromium live-art and
big-moment checks passed, including career playback, actual contact/handling,
single-ball ownership, kicks, high takes, tries, reactions, phone layout, scene
restart and bounded textures/cache. Ten pinned pickup/release/preparation/catch/
carry frames repeated exactly after pause and seek, without browser errors.

The same 22-second production Chromium passage (seed 1 from tick 43, 844×390,
×1, other agents idle) averaged 58.2 fps before and 58.6 fps after. Both had
p95 frame time 16.8 ms and no frame over 100 ms; longest frames were 50.0 ms and
50.1 ms. The samples reached ticks 473 and 474 respectively. Cache counters were
2,625 hits / 1,540 misses before and 2,516 / 1,672 after; both remained capped at
768 entries and 68 textures. This desktop sample shows no material added stutter;
real-phone performance and the earlier whole-career budget concerns remain open.
Stage-4 CI and Android builds passed. QA, different-tool review, phone play-test
and Leon's review remain release checks. On-demand QA dispatch remains unavailable through
this session's GitHub API (Forbidden). All four staged PRs remain open, draft
and unmerged. The next visual pass is stage 5's kicks, aerial takes and try finishes.
