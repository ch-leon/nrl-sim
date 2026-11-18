# Match art and animation improvement plan

Date: 16 November 2026  
Update, 17 November: the approved presentation stack (#705), whistle cleanup
(#706) and receiver preparation (#707) are merged. Both latest PRs passed every
unit/browser CI shard and Android build; the combined main build deployed to
GitHub Pages at `f465021`. Separate QA, physical-phone playtesting and whole-career
performance work remain open. Leon authorized the next small build: forward pods
and edge shifts under #649, alongside the existing spread, with balance evidence
and normal-speed footage. Back-door options and decoys follow later. New PRs remain
open for review. Earlier candidate notes below describe their implementation history.

The combined-main check exposed one integration fixture: the whistle regression
still generated seed 45 at its pre-receiver-change timing. [PR #714](https://github.com/ch-leon/nrl-sim/pull/714)
keeps its rendering assertions on four recorded real-match snapshots, independently
of future gameplay changes. It is a separate test-only candidate.

[PR #715](https://github.com/ch-leon/nrl-sim/pull/715) prepares the first ordinary
forward pods and edge shifts during contact. Seed 1 supplies real settled edge
and pod examples at ticks 173 and 6861; pods are uncommon in that match. The
[standard comparison](https://github.com/ch-leon/nrl-sim/blob/376b01241d10c7945feb83f4ff89061fa64a5ba9/runs/20261117-055458-standard/report.md)
records existing target gaps and changed gameplay metrics. A larger
[off/on comparison](https://github.com/ch-leon/nrl-sim/blob/376b01241d10c7945feb83f4ff89061fa64a5ba9/runs/20261117-060048-shapes-win-rate-check/report.md)
measured Expansive wins at 42.3% off versus 37.5% on, with 20.8% versus 18.9%
draws over 800 tracked games each. The report does not significance-test its
tracked win column. One bounded
[alternative mix](https://github.com/ch-leon/nrl-sim/blob/2176cd724a715c7d7b0869d739032dce375b4c84/runs/20261117-060952-shapes-expansive-width/report.md)
(spread 5, pod 1, edge 2) measured 36.0% wins and was rejected; defaults remain
spread 2, pod 1, edge 5. A
[held-out replication](https://github.com/ch-leon/nrl-sim/blob/c238f24b44ada0750ed0d04cf0dbbbf8d050cf6f/runs/20261117-093550-shapes-replication-control/report.md)
on seeds 401–800 reversed the initial drop: wins were 38.1% off and 40.6% on.
Together, the two samples give 40.2% off versus 39.1% on over 1,600 games each.
This does not prove balance parity; it does not justify retuning to the initial
sample. Defaults remain unchanged. Leon approved merging #714/#715 on 17 November;
the branches integrate the newer career work before their final checks. The PRs
record the merge outcome. Back-door passing and support runs are next; their new
PR stays open for review.

## Pause handoff — 17 November 2026

Leon approved merging #714 and #715, then asked to finish up and pause at his
usage limit. Both integrated heads passed every CI group and aggregate; #715
also passed Android. #714 merged at `2b88ef3`; #715 merged at `2bdb86b`.
Integration preserved the new career work and updated the combined season RNG
checksum to `119391389`, with both UI-read/no-read parity checks retained.

[PR #722](https://github.com/ch-leon/nrl-sim/pull/722) is an **unfinished, unmerged
draft**, saved on `feat/match-back-door`. Fourteen focused checks, typecheck and
diff checks pass. The new option preserves ordinary pass choices/odds and
handling; its OFF switch preserves #715's match hash and 842 post-kickoff RNG
draws. Full-suite, balance and browser validation remain outstanding.

The bounded default Lab seeds 1–6 produced no genuine back-door witness.
Seed 5 has a real half-to-fullback pass at tick 4322, but its lead remains 0.90 m
behind the half. One through-running/sprint adjustment did not establish physical
readiness; no odds, weights or geometry threshold was relaxed. Resume with the
lead's readiness **before dummy-half run-on**, then prove ordinary play and
validate. No further agent work was scheduled during that pause.

## Resumed back-door support — 18 November 2026

Leon resumed agent work. The candidate integrates current main, including the
SuperCOOKED UI handoff documents. Starting the forward's run as the ball is heeled
fixes the readiness problem with seven positioning lines and no new tuning
values, receiver preference, pass odds or defender-deception bonus. Gameplay
source for the initial on/off comparison was `a9a9c35`.

Default Lab seed 5 now supplies the real passage: heel 4291, DH-to-half pass
4301/catch 4309, half-to-fullback pass behind the forward 4322/catch 4330. The
forward is 1.29 m ahead at launch; the shape ends at 4331. Focused coverage steps
the lead through readiness in both directions, preserves ordinary alternatives
and cancellation, checks snapshot isolation and pause/seek replay, and retains
the exact preceding simulation/RNG fingerprint when the feature is off.

Separate agents handle fixture maintenance, production browser footage and the
standard on/off harness comparison. The main agent reviews the code and visual
evidence. The [published comparison](https://github.com/ch-leon/nrl-sim/blob/8de8313c8990ffb0e8caa84d51814e95af8e00aa/runs/20261118-031501-back-door-on-off-standard/report.md)
contains all 13 standard scenarios with ON as baseline and OFF as the variant.
The six preset rows use 100 seeds in both orientations (200 tracked games per
setting); their raw win rates remain below 45% with both settings, with draws
reported separately. Expansive versus Balanced is 36.5% wins / 20.5% draws ON and
37.5% / 20.0% OFF. Several match-count targets also remain low in both arms.
This does not complete #649's balance acceptance or prove parity; no defaults
were retuned. PR #722 stays open and unmerged for Leon. Separate QA workflow,
different-tool review and physical-phone sign-off remain release checks.

Production Chromium confirms the actual default-team launch/catch metadata and
repeats both snapshots and rendered actor positions/textures after pause/seek at
4301, 4309, 4322 and 4330. The 844×390 layout has no horizontal overflow and the
passage raises no page errors. The reproduction link is
`/#lab?seed=5&tick=4291`, using the Lab's default teams.
The PR records the final test/CI outcome and normal-speed clip. Hash and
live-match fixtures follow the changed simulation without weakening the UI-read
RNG parity, penalty-choice or capped loss-reason assertions.

### Fullback receives on the sweep

Leon marked up the labeled seed-5 clip to show the fullback running out from
depth before catching wide. The earlier `c30f8ba` version kept the close catch
and steered the fullback outward afterward. The revised route starts the
fullback's run as the tackled player gets up and sets the forward outside the
half. The fullback receives at pace outside the lead through the existing
receiver choice, backwards pass and catch checks.

Default Lab seed 5 retains the heel at 4291, DH pass at 4301 and second launch
at 4322. The fullback catches at 4338 around field (84.1, 13.6), 10.4 m outside
the lead and moving about 7.5 m/s. The marked sketch puts the catch around
(83.7, 17.0). The simulated catch is about 3.4 m farther out. Seed 4 catches on
the other edge at 5003. The focused regressions cover both attacking directions,
legal flight, continued receiver motion, ordinary interruptions, replay and
the feature-off fingerprint.

The earlier test and CI records through `288bfd2` and published on/off comparison
at `a9a9c35` predate the wide reception. PR #722 remains open and unmerged.
[PR #722](https://github.com/ch-leon/nrl-sim/pull/722)

Status: stages 1–4 presentation and the first stage-5 pass are implemented in
five linked PRs. Leon reviewed the clip and approved merging on 17 November
2026; the full stack merged through #705 at `f9f1641`. Wider stage-5 consistency
work and QA/phone validation remain.

Stage 1 is implemented in [PR #697](https://github.com/ch-leon/nrl-sim/pull/697),
tracking [#696](https://github.com/ch-leon/nrl-sim/issues/696). Local functional checks passed;
release validation is in progress. Leon agreed to all five improvement areas.

Stage 2 is implemented in [PR #699](https://github.com/ch-leon/nrl-sim/pull/699),
tracking [#698](https://github.com/ch-leon/nrl-sim/issues/698),
on top of the stage-1 candidate; local validation passed. One Sol agent
implemented movement, Luna runs the shared validation, and the main agent reviews
the source, visual result and rendering cost.

Stage 3 is implemented in [PR #701](https://github.com/ch-leon/nrl-sim/pull/701),
tracking [#700](https://github.com/ch-leon/nrl-sim/issues/700), on top of stage 2;
local functional validation passed. Leon's 17 November approval supersedes the
earlier instruction to keep the reviewed stack open and unmerged.

Stage 4 handling presentation is implemented in [PR #703](https://github.com/ch-leon/nrl-sim/pull/703),
tracking [#702](https://github.com/ch-leon/nrl-sim/issues/702), on top of stage 3.
This presentation pass connects pickup, release and reception, and prepares the
actual receiver once the engine has launched his pass. A pre-release call still
requires the separate earlier commitment described below: dummy-half controls,
set plays and dart/pass choices currently resolve at release. No guessed call
or new gameplay decision is part of this visual change.

Stage 5 starts with a bounded kicks, aerial takes and try finishes pass in
[PR #705](https://github.com/ch-leon/nrl-sim/pull/705), tracking
[#704](https://github.com/ch-leon/nrl-sim/issues/704), on top of stage 4. It carries
the same support, weight and continuous handoffs into the existing moment painters.
Wider officials, crowd, reactions, weather and full-match consistency remain
subsequent stage-5 work; this first pass does not complete the entire stage.

Make an ordinary passage of rugby league enjoyable to watch. Players should have
weight, the ball should be easy to follow, and tackles should make sense without
commentary. Keep the game's playful pixel-art character and make the improvement
obvious at phone size.

The next stage-5 pass, [PR #706](https://github.com/ch-leon/nrl-sim/pull/706),
addresses [#688](https://github.com/ch-leon/nrl-sim/issues/688):
the player in the sin bin must fade with his side at the whistle, from his existing
seat, and return with the restart. Review also found retained tackle artwork,
carrier markers and bin/gas/fatigue indicators after the players disappeared,
plus a fade that stopped one interpolation tick short. The candidate clears those
layers for the break and restores live pictures when seeking back.
Officials, benches and the crowd already use
compatible proportions and kit colours; clear/rain/wind screenshots did not justify
another asset change. Keep this pass focused on those demonstrated continuity
problems and full-match verification. Earlier receiver commitment follows in its
own gameplay PR under #672; it is not part of the whistle cleanup.

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

The separate receiver-preparation candidate, [PR #707](https://github.com/ch-leon/nrl-sim/pull/707)
for #672, commits ordinary dummy-half
pass/dart decisions four ticks before the existing release, with no extra delay.
The exact intended recipient raises one arm over the normal distance-linked gait.
Manual/coach instructions and invalid identity, eligibility or possession cancel
the commitment; scripted distribution keeps its existing release-time path.
The call describes intention, so an interception or spill can still prevent the
catch. This deliberately supersedes the issue's literal promise of always naming
the eventual catcher. Zero preparation lead retains the old decision timing for
comparison, and the recovery-engine revision changes because seeded outcomes can
change. Balance results and browser evidence belong in the candidate PR.

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

The first stage-5 candidate keeps the kicking support sole planted, brings the
boot down through a recovery beat, and returns the final kick frame to the
player's current direction, distance-linked stride and tired posture. A stopped
kicker settles into idle, allowing the ordinary one-pixel breathing difference.
The goal-kick tee remains on its posts side through the last kick pose, even if
the player turns; a single terminal-only cache bit handles that local reflection.

The aerial catch's penultimate frame loads the continuing carry by one pixel,
then releases into that same silhouette with fatigue and foot phase retained.
Try recovery uses explicit palm, knee and crouch poses instead of floating the
whole body upright. The scorer enters his existing celebration at its settled
first beat; knee slides drop once and hold. Teammates retain their individual
loop phases. The real seed-8 dive-to-rise (2127→2128) and rise-to-celebration
(2137→2138) seams now have identical cached pixels. Aerial take 120→carry 126,
actual kick deadlines, interruptions, legacy snapshots, both directions and
the empty tee's world position have focused regressions.

One Sol agent built this pass; the main agent reviewed the source, transition
tests and before/after pose sheets. Typecheck and 54 focused tests passed before
the source freeze. Luna runs the shared full validation. No simulation code,
event clocks, possession rules, RNG, save format or cache capacity changed.
This is the first part of stage 5; wider presentation consistency remains open.

Stage-5 first-pass local checks: all 4,363 tests in 326 files and the production
build passed. Production Chromium live-art and big-moment checks passed, covering
career playback, actual contact/handling, one ball, grounded shadows/rings, phone
layout, scene restart and bounded textures/cache. Seed-8 baseline/candidate event
identities and ticks matched: punt 43, aerial take 120, grubber 1299, try 2118,
goal routine 2232 / strike 2262, and error reaction 4971.

Additional paused/replayed traces used the actual previous/current snapshots and
the last kick-pose tick, not the end of the ball flight: punt 47→48, grubber
1303→1304 and tee kick 2269→2270. They preserved exact playback, ball ownership
and the expected terminal pose. The aerial catch and both try seams also passed.
Brief actual ×4 playback crossed each kick, high-take and try boundary without
browser errors. Evidence and reusable capture helpers stay outside git under
`/tmp/nrl-moments/`.

Sequential production Chromium measurements of the reference passage (seed 1
from tick 43, 22 seconds at 844×390 and ×1, other agents idle) averaged 59.1 fps
before and 58.4 fps after. Both had p95 frame time 16.8 ms, longest frame 50 ms,
and no frame over 100 ms. Both reached tick 473 with identical cache counters
(2,509 hits / 1,671 misses), peak 768 entries and 68 textures. This short desktop
sample showed no extra long frames; it does not settle phone performance or the
earlier whole-career budget concerns. The Android build passed on the source
commit; final-head CI, QA, different-tool review, phone play-test and Leon's
review remain release checks. On-demand QA dispatch remains unavailable through
this session's GitHub API (Forbidden). All five PRs remain open, draft and
unmerged. The next pass is consistency across the rest of the match presentation.


## Approved stack integration — 17 November 2026

Leon watched the big-moment clip and approved merging the stack. The five original
PR heads have green CI (including all WebKit shards/aggregate) and Android builds.
The separate QA workflow and different-tool code review remain unverified; QA API
access still returns Forbidden. Merge approval is recorded separately from those
checks, and real-phone/whole-career performance work remains open.

Main advanced to `7559f53` with weighted receivers, last-tackle options, held-up
outcomes and contact/referee/pause fixes. Integrating those commits required no
product source changes. Two regression fixtures now follow the current real
sequences: seed-1 passes 175→181 and 193→209; seed-8 try 4856, with recovery seams
4865→4866 and 4875→4876. The painted-ball and exact-pixel assertions remain intact.
The 121 affected focused checks and typecheck passed. Full combined validation
and the merge outcome are recorded in PR #705. The stack lands together through
that PR so main receives the validated combination at once. Earlier open/draft notes above describe the prior
review hold, which the recorded approval replaces.
