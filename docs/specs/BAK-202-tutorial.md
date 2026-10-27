# BAK-202 — Build tutorial / onboarding flow
**Linear:** https://linear.app/bakinglions/issue/BAK-202/build-tutorial-onboarding-flow | **Priority:** Medium | **Work unit:** WU-15

## Problem
A new player is dropped into the sim with no guidance and cannot discover the core loop
(build → recruit → advance week → match → economy/ladder) unaided. We need a step-by-step
onboarding overlay with hints, skippable at any time and replayable from settings.

## Proposed solution
Add `src/ui/tutorial.ts` (owned by WU-15). A declarative ordered step list drives a
pixel-styled speech-bubble panel rendered into `#ui-root` (DOM overlay, ARCHITECTURE §6). Each
step optionally highlights a UI element by CSS selector using a darkened cutout (a large
`box-shadow` spread on a transparent element positioned over the anchor). Steps advance either
via the bubble's **Next** button or when a specified `bus` event fires (ARCHITECTURE §5).
Progress flag lives in `state.settings.tutorialDone` (ARCHITECTURE §4). It auto-starts on a new
game when `tutorialDone` is false and can be replayed via `startTutorial(true)` wired from the
settings popup. `main.ts` (orchestrator) calls the auto-start check after `newGame`.

## Affected files
- Create: `src/ui/tutorial.ts`
- Test: `tests/ui/tutorial.test.ts` (step-list resolution, advance-listener binding via mocked bus/DOM)
- Modify: `src/main.ts` — auto-start hook; `src/fx/audio.ts` settings popup — "Replay tutorial" button (integration notes; not owned by WU-15)

## Key interfaces & behaviour
```ts
export interface TutorialStep {
  id: string;
  text: string;
  anchor: string | null;                    // CSS selector into #ui-root, null = centered
  advanceOn: 'next-button' | keyof Events;  // Events from src/core/events.ts §5
}

export const STEPS: readonly TutorialStep[]; // the 7 steps below

export function startTutorial(force?: boolean): void; // force ignores tutorialDone
export function isTutorialActive(): boolean;
export function endTutorial(): void;          // sets tutorialDone=true, cleans DOM+listeners
```

Steps (in order):
1. `welcome` — centered, `advanceOn:'next-button'`. Intro + core-loop one-liner.
2. `build` — anchor build-menu button, text "Open Build and place a Training Paddock",
   `advanceOn:'facility:placed'`.
3. `recruit` — anchor recruit nav, "Sign your first player", `advanceOn:'player:signed'`.
4. `squad` — anchor squad nav, "Here's your squad", `advanceOn:'next-button'`.
5. `advance` — anchor the advance-week control, "Advance a week", `advanceOn:'week:advanced'`.
6. `match` — centered, explains match day, `advanceOn:'match:finished'` (Next also allowed).
7. `wrap` — centered, points at money HUD + ladder, `advanceOn:'next-button'`; on advance →
   `endTutorial()`.

Rendering: a fixed-position bubble panel (`.tutorial-bubble`, `image-rendering:pixelated`,
chunky border, monospace) containing `text`, a **Skip** button (always) and, when
`advanceOn==='next-button'`, a **Next** button. When `anchor` resolves to an element, a
`.tutorial-cutout` div is sized/positioned over that element with
`box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` to darken everything else; the anchor is
`scrollIntoView({block:'center'})`-ed before highlighting.

Advance-listener lifecycle (resilience requirement): when a step becomes active, if its
`advanceOn` is a bus event name, bind **one** handler via `bus.on(name, next)`; store the
returned unsubscribe. On leaving the step (advance or skip), call it. Only the current step's
listener is ever bound, so acting "out of order" earlier does nothing. Skip → `endTutorial()`.

Graceful no-op advance: if a step's target feature is unavailable (anchor selector matches
nothing AND its `advanceOn` event can never fire in this build), auto-render a Next button so
the user is never stuck. Detect by: anchor missing after a 500ms retry → treat as centered +
force Next.

## Edge cases & risks
- Out-of-order actions: only current step's listener is bound (see lifecycle) → safe.
- Anchor not yet in DOM (screen not open): retry once after 500ms, else fall back to centered.
- Mobile / small screens: bubble `max-width: min(90vw, 320px)`; anchor `scrollIntoView`.
- Replay from settings while a game with `tutorialDone:true`: `startTutorial(true)` resets to
  step 0 without clearing the flag until completion.
- Never bind duplicate listeners: guard `isTutorialActive()` at `startTutorial` entry.
- Cleanup on `endTutorial`: remove bubble, cutout, and any live bus unsubscribe.

## Acceptance criteria
- Fresh new game (`tutorialDone:false`) auto-starts at step 1; completing step 7 sets
  `tutorialDone:true` (persisted via store/save).
- Skip on any step immediately ends the tutorial and sets `tutorialDone:true`.
- Event-driven steps advance on the real bus event; button steps advance on Next.
- Replay from settings re-runs all 7 steps regardless of prior completion.
- `npm run build` strict passes; step/listener tests green.

## Out of scope
- Persistent contextual tooltips outside the flow, localisation, analytics on completion.

## Since: UI cleanup chunk 2 (#337)

The shipped list has grown from the 7 steps above (News, Finance, Contracts and Lineup came
with #188 and N11). Chunk 2 changed how it runs:

- Each step opens its own screen (`opens`) and frames the control inside it, not only its
  nav tab. Nothing is dimmed: the cutout is a gold frame, and the bubble docks clear of it.
- Build is two steps: tap the Training Paddock row, then "Tap a green spot on the grass",
  framed on the placement bar with the grass undimmed. The build step moves on when the
  bar shows (`until`).
- There is no match step. From `match:started` until the club is back on screen the
  tutorial is hidden, so it never dims or covers a match; it picks up on News after.
- Every bubble is two sentences at most, and the copy names the 5-tab nav (More).
- The iOS "Add to Home Screen" hint waits until the tutorial ends.

## Since #370: three guided taps and first-visit hints

The 11-step tour is now three guided taps (DECISION (Leon)): build a Training Paddock, sign
a player, Advance Week. Each bubble is one sentence with a "1 of 3" counter.

| Old step | Now |
|---|---|
| `welcome` | Dropped: the first tap is the welcome |
| `build`, `place` | Tap 1 (the row in Build, then a green spot on the grass) |
| `recruit` | Tap 2 (the first enabled SIGN under the default rating sort: the best player the club can afford) |
| `squad` | Dropped: the Guide's Squad page covers it |
| `lineup`, `news`, `finance`, `contracts` | A one-line hint the first time each screen opens (`HINTS`) |
| `advance` | Tap 3; the run ends on `week:advanced`, after full time, so nothing draws over the match |
| `wrap` | A club toast when the run completes ("That's the loop…"), not on Skip |

- **Hints** live in `settings.hintsSeen?: string[]` (optional, no save bump). Absent means
  no hints, so every save from before #370 (and any with `tutorialDone: true`) sees nothing
  new. `startTutorial()` writes `[]` (armed); a screen's key is added as its hint shows, so
  each shows once. No hint shows while a guided tap is up.
- **Where a run starts**: `firstStepIndex` skips tap 1 when a Training Paddock already
  stands (a save written mid-run, a replay).
- **Replay tutorial** (Settings, the Guide) runs the three taps again, resets `hintsSeen`
  to `[]`, and offers Next on every tap, since a tap may not be doable in that save.
- **Undo during a tap** (the 5-second Undo, `systems/undo.ts`): `build` and `recruit`
  carry `revertOn` (`facility:removed`, `player:unsigned`). Undoing the paddock or the
  signing brings the run back to that tap. An undone build of something else, with the
  paddock still up, leaves tap 1 done (`tapUndone`).
- **Demo gate (#362)**: tap 3 also ends on `commercial:demoEnded`, so a demo that stops the
  first advance hands the screen to the paywall. With the commercial flag off nothing changes.
- **Install hint**: still waits for the run to end (`whenTutorialDone`), now after week 1.
