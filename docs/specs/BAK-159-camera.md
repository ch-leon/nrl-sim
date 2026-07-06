# BAK-159 — Implement camera pan and zoom (desktop + mobile)
**Linear:** https://linear.app/bakinglions/issue/BAK-159/implement-camera-pan-and-zoom-desktop-mobile | **Priority:** High | **Work unit:** WU-2

## Problem
The isometric grounds are larger than the viewport and static. Players need to pan (mouse drag / touch drag) and zoom (wheel / pinch) to navigate, on both desktop and mobile. Camera must be clamped to the grounds so you can't scroll into the void. Critically, panning must not eat taps intended for tap-to-move (BAK-161) or facility placement (WU-8).

## Proposed solution
A reusable `CameraController` class in `src/world/camera.ts` that attaches to any Phaser scene's main camera (GroundsScene now, MatchScene later). It wires pointer/wheel/pinch handlers, applies scroll and zoom, and clamps to configurable world bounds. It distinguishes drag from tap via an 8px movement threshold: pointer movement under threshold is treated as a tap and passes through (the controller does not `preventDefault`/consume it), so scene-level tap handlers still fire.

## Affected files
- Create `src/world/camera.ts` — `CameraController` class.
- Modify `src/scenes/GroundsScene.ts` — instantiate + configure controller with grounds bounds; expose a way for tap handlers to check `wasDragging()`.
- Test `tests/world/camera.test.ts` — pure clamp + drag-threshold logic (extracted as pure functions; see below).

## Key interfaces & behaviour
Extract the math as pure, Phaser-free functions so it is unit-testable (ARCHITECTURE.md §8), then have the class call them:
```ts
export function clampZoom(z: number, min = 0.5, max = 2.0): number {
  return Math.min(max, Math.max(min, z));
}

// Clamp scroll so the camera view stays within world bounds at the given zoom.
export function clampScroll(
  scrollX: number, scrollY: number,
  view: { width: number; height: number }, zoom: number,
  world: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const vw = view.width / zoom, vh = view.height / zoom;
  const maxX = Math.max(world.x, world.x + world.width  - vw);
  const maxY = Math.max(world.y, world.y + world.height - vh);
  return {
    x: Math.min(maxX, Math.max(world.x, scrollX)),
    y: Math.min(maxY, Math.max(world.y, scrollY)),
  };
}

export function isDrag(dx: number, dy: number, threshold = 8): boolean {
  return Math.hypot(dx, dy) >= threshold;
}
```

Controller:
```ts
export interface CameraOpts {
  world: { x: number; y: number; width: number; height: number };
  minZoom?: number;   // default 0.5
  maxZoom?: number;   // default 2.0
  dragThreshold?: number; // default 8 (px, screen space)
}

export class CameraController {
  constructor(scene: Phaser.Scene, opts: CameraOpts);
  destroy(): void;                 // remove all listeners
  wasDragging(): boolean;          // true if the just-ended interaction exceeded threshold
}
```

Behaviour:
- **Bounds:** call `scene.cameras.main.setBounds(world.x, world.y, world.width, world.height)` and also apply `clampScroll` after every pan/zoom (setBounds alone under-clamps when zoomed out). Compute grounds world bounds in GroundsScene from the iso projection extent of the 20×20 grid (min/max screenX,screenY across corner cells) plus one-tile padding.
- **Desktop pan:** on `pointerdown` record start `(x,y)` and camera scroll. On `pointermove` while down, if `isDrag(totalDx,totalDy)` set an internal `dragging=true` and set `camera.scrollX/Y = startScroll - (pointer.delta / zoom)`, then `clampScroll`. On `pointerup`, keep `dragging` readable via `wasDragging()` until the next `pointerdown`.
- **Touch pan:** single active pointer behaves identically (Phaser unifies pointer events). Enable a second pointer: `scene.input.addPointer(1)`.
- **Wheel zoom (desktop):** on `wheel`, `newZoom = clampZoom(zoom * (deltaY > 0 ? 0.9 : 1.1))`; zoom toward the pointer world position (adjust scroll so the point under the cursor stays fixed), then `clampScroll`.
- **Pinch (mobile):** when two pointers are down, track the distance between them; `zoom *= currentDist / prevDist`, `clampZoom`, anchor to the midpoint, then `clampScroll`. Suspend single-pointer panning while two pointers are active.
- **Tap pass-through:** the controller NEVER stops propagation. Scene tap handlers (BAK-161 / WU-8) guard themselves with `if (camera.wasDragging()) return;`. This is the contract that prevents pan/tap conflicts.

## Edge cases & risks
- Zoom clamp bounds are fixed at 0.5–2.0 per ticket; expose as opts but default to those.
- When zoomed out far enough that the world is smaller than the view, `clampScroll`'s `Math.max(world.x, ...)` keeps `maxX >= minX` so the map stays pinned (centered-ish) instead of jittering.
- Pinch start must record the initial distance on the second `pointerdown`, not on move, to avoid a zoom jump.
- Touch-drag momentum/inertia is not required; 1:1 drag is acceptable for the POC.
- `wasDragging()` must reset on the next `pointerdown` so a genuine subsequent tap is not falsely suppressed.
- `destroy()` must detach listeners so switching scenes (Grounds→Match) doesn't double-bind.

## Acceptance criteria
- [ ] Click-drag pans on desktop; touch-drag pans on mobile; both smooth.
- [ ] Wheel zooms on desktop; pinch zooms on mobile; zoom clamped to 0.5–2.0.
- [ ] Camera cannot scroll outside the grounds bounds at any zoom level.
- [ ] A pointer press+release that moves < 8px is reported as a tap (`wasDragging()===false`) and reaches scene tap handlers; a >8px drag suppresses the tap.
- [ ] `clampZoom`, `clampScroll`, `isDrag` covered by unit tests.
- [ ] Controller is reusable: attaches to an arbitrary scene via its constructor, `destroy()` cleans up.

## Out of scope
Tap-to-move behaviour itself (BAK-161) and placement taps (WU-8) — this ticket only guarantees the pass-through contract. Keyboard/edge-scroll panning. Zoom UI buttons.
