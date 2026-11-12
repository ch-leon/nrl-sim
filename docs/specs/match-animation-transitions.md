# Match animation transitions — item 3

Status: integrated release candidate, 11 November 2026, tracked with item 4 in
[issue #588](https://github.com/ch-leon/nrl-sim/issues/588). The approved
character/contact baseline shipped in [PR #584](https://github.com/ch-leon/nrl-sim/pull/584).
The release PR records checks against that newer source. The local prototype
results and source-isolation notes below describe the earlier review build.

## Goal and scope

Recognise your players and understand the play instantly. Connect the approved
poses through catching, ruck recovery and distribution, keeping the approved
heads, identities, close contact and short limbs.

Done when a receiver keeps his stride as he tucks the ball, the carrier visibly
recovers before playing it, and the dummy-half waits for the actual ball before
scooping and passing. Pause, seek and speed changes must reproduce the same poses.
The sim remains the authority for movement, participants, timing and possession.

## Changes

- `playerPicture` samples handling progress separately from the running cycle.
  The four-tick receiving beat now progresses from reach to tuck; its final pixels
  match the normal carry at the same stride. Pass follow-through uses the actual
  pose deadline and ends on the normal running pixels. Stationary players plant
  their feet instead of cycling the running pose.
- During the existing ground/release interval, the contact carrier rises into
  the body and ball anchors of the first play-the-ball frame. The head rotates
  upright with the body. Recovery fits quick and slow rucks; no extra wait is
  added. Breaks and steals keep their existing continuation.
- A shared ruck painter covers ball placement, the backwards heel and dummy-half
  pickup. Pickup stays crouched while the real ball rolls, then rises from the
  actual catch tick over the sim's holding interval. There is no early ball in
  the hands and no delayed release.
- The approved leg and arm solvers moved unchanged to `src/art/match/limbs.ts`,
  shared by contact and ruck poses. Legs remain at most 5 px per segment / 9.5 px
  reach, arms 5 px per segment / 9 px reach. Both boots follow the hips within
  those limits.
- The existing 512-frame CPU cache now includes the independent stride frame.
  Scene textures are still reused rather than allocated for each pose.

### Body language (#626 wave 3)

- **The line gets ready (#665).** While a carrier is in `ptb` or the dummy half
  is over the ball, every opponent standing still (`idle`, feet planted) more
  than 5 m from the ball drops into `ready` (`ruck.ts`): the brace crouch on wide
  feet, palms open in front, bouncing a pixel on the toes every four ticks
  (frames 0–1, phased by slot). In the dummy half's last three ticks with the
  ball the line rises (frame 2); once the pass is away they are idle again. The
  5 m keeps the markers (1.8 and 3.6 m in front of the mark) as they were; the
  attack, runners and the sin-binned are unaffected. `pictureContext` reads the
  ruck once per snapshot, so the frame is a pure function of the tick.
- **Exhaustion in the body (#666).** `tiredLevel` reads `legs` and `blown` on the
  legs bar's bands (`legsBand`, `fatigue.tiredAt` / `spentAt`), so bar and body
  agree: 1 when tired, 2 when spent or blown. A tired man's run, carry and stand
  keep the hips (and so the legs' reach) but sink the shoulders and head by one
  pixel per level and lean him forward; the bob loses its lift into flight, and
  spent his arms pump half as far. Spent or blown and standing still (feet
  planted, no ball, not in the bin, not set in the line) he goes hands on knees,
  `blowing` (`moments.ts`): two frames, the back heaving every six ticks. A
  blown sprinter slumps as he slows. The picture carries `tired`, which joins the
  frame-cache key only when set, so a fresh man's frames and key are unchanged.

No engine, save, appearance assignment, rules, odds, fatigue or RNG changes.
The earlier ordinary-player art study keeps its old frame API; `/#lab` and career
matches are the authority for reviewing these new transitions. The contact study
also uses the updated recovery and play-the-ball poses.

## Review and validation

The standalone comparison shows the same real seed-1 passage from tick 110 on
both versions, at a fixed simulation clock. It is a visual comparison, not a
measurement of device frame rate. Watch the first ruck, the next distribution,
and the later second tackle; use half speed to inspect the joins.

Meaningful regressions cover continuing catch stride, pixel-identical ends of
catch/pass, actual pickup ownership, pause/seek sampling, cache keys, bounded
ruck limbs and carrier recovery across seven-, fourteen- and twenty-two-tick
rucks. Existing contact checks still cover all joins, outcomes and builds.

`scripts/e2e-live-art.mjs` now locates actual catch, pickup and pass moments as
well as contacts. It checks paused and replayed pixels for every player at those
transitions, one ball, phone layout, career playback and texture cleanup.

Run from this worktree:

```sh
npx tsc --noEmit
npx vitest run
npm run build
npm run preview -- --host 0.0.0.0 --port 4174
E2E_URL=http://localhost:4174/ CHROMIUM_PATH=/usr/bin/chromium E2E_OUT=/tmp/nrl-transitions/browser-production node scripts/e2e-live-art.mjs
```

Local results on 11 November 2026: typecheck and production build passed; all
3,046 tests in 249 files passed. Production Chromium checks passed at 1280×800
and 844×390, including actual catches, pickup and passes, per-player pause/seek
consistency, a career match and stable 59-texture scene restarts. The offline
comparison passed play/pause, synchronized seeking, half speed and 390-pixel
stacked layout checks. Safari/device review, different-tool review and the
repository's CI/QA gates remain release work.

## Source isolation and continuation

Worktree: `/workspace/nrl-sim-transitions`, branch `prototype/match-transitions`.
Local baseline commit: `d3c1f1f`, source tree
`721cd0f3db64b138fa5bee04442b53c403f81c3b`. This is exactly the approved source
from `nrl-match-art-astra-handover.zip`, checkpointed locally for a clean diff.
The original `/workspace/nrl-sim` and its release bundle are untouched.

Apply only the transition diff after the approved art has been integrated. Do
not replace the release session's subsequent fixes with this entire worktree.
Resolve any overlap against its reviewed code, particularly the art sampler and
contact painter. A new model/session does not count as the required independent
different-tool review.

Item 4 is complete and included in the same release candidate: see
[kicks, aerial catches, tries and celebrations](match-big-moments.md).
Portraits, grounds characters and an appearance editor remain later.
