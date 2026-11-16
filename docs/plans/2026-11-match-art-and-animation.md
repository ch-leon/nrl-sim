# Match art and animation improvement plan

Date: 16 November 2026  
Status: stage 1 implemented in [draft PR #697](https://github.com/ch-leon/nrl-sim/pull/697),
tracking [#696](https://github.com/ch-leon/nrl-sim/issues/696). Local functional checks passed;
release validation is in progress. Leon agreed to all five improvement areas.

Stage 2 is implemented under [#698](https://github.com/ch-leon/nrl-sim/issues/698),
on top of the stage-1 candidate; combined validation is in progress. One Sol agent
implemented movement, Luna runs the shared validation, and the main agent reviews
the source, visual result and rendering cost.

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
not a device frame-rate measurement. Separate-tool release review, CI/QA and a
real-phone play-test remain release work.

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
