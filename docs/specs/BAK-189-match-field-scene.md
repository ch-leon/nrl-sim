# BAK-189 — Build isometric match field scene
**Linear:** https://linear.app/bakinglions/issue/BAK-189/build-isometric-match-field-scene | **Priority:** High | **Work unit:** WU-11

## Problem
Match simulations (BAK-191) have no visual home. We need a dedicated isometric field scene (`'Match'`) that renders a rugby league field in the same iso projection as the club grounds but is visually distinct from it, tints player dots with home/away kit colours, and frames a camera on the whole field. It must expose the hooks that WU-12 playback (BAK-194) needs: a field-coordinate mapper and a lifecycle that returns to the Grounds scene.

## Proposed solution
Add `src/scenes/MatchScene.ts` (scene key `'Match'`). Render the field as an iso grid (~30 long × 18 wide) built from generated `field-tile` / `field-line` textures (ARCHITECTURE.md §7 — no binary assets), with striped 10m bands, white try-lines, darker in-goal areas, and a halfway line. Create 13 player-dot `Image`s per team tinted from `TeamSheet.colors`, plus a `ball` sprite. Reuse the existing iso helpers in `src/world/iso.ts` (do NOT modify) and the `CameraController` (`src/world/camera.ts`) for framing/slow-pan. Expose `fieldToWorld(fx, fy)` so playback can position sprites from sim field coords. A DOM 'Back to Club' button returns to Grounds.

## Affected files
- Create `src/scenes/MatchScene.ts` — scene key `'Match'`, field render, dots, ball, camera, `fieldToWorld`.
- Modify `src/scenes/BootScene.ts` — generate `field-tile`, `field-line`, `ball` textures (§7 keys).
- Modify `src/main.ts` (orchestrator-owned) — register `MatchScene` in the scene list. If unable to touch, report BLOCKED for that line only.
- Reuse (do NOT modify) `src/world/iso.ts` (`gridToScreen`, `depth`), `src/world/camera.ts` (`CameraController`).

## Key interfaces & behaviour
Field dimensions & keys:
```ts
const FIELD_LONG = 30;  // iso tiles along field length (try-line to try-line + in-goal)
const FIELD_WIDE = 18;  // iso tiles across width
// Texture keys (generated in BootScene): 'field-tile', 'field-line', 'ball'
```
Field-tile texture: two green shades alternating every ~3 tiles (~10m band) for stripes; in-goal rows use a darker green; `field-line` is a thin white diamond overlay used for try-lines and halfway. Colours: grass-light `#3f8b39`, grass-dark `#357a2f`, in-goal `#28601f`, line `#f5f5f5`. Distinct from Grounds (which uses `tile-grass #3a7d34`) by the striping + line overlays + no dirt/path tiles.

Scene lifecycle:
```ts
interface MatchSceneData { home: TeamSheet; away: TeamSheet; result: MatchResult; }
class MatchScene extends Phaser.Scene {
  init(data: MatchSceneData): void; // store home/away/result on the scene
  create(): void;                   // build field, dots, ball, camera, DOM button
  // Map sim field coords (fx 0-100 length, fy 0-100 width) to Phaser world x/y.
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
}
```
`fieldToWorld`: convert normalized field coords to fractional grid cells then project:
```ts
fieldToWorld(fx, fy) {
  const gx = (fx / 100) * (FIELD_LONG - 1);
  const gy = (fy / 100) * (FIELD_WIDE - 1);
  return gridToScreen(gx, gy); // iso.ts accepts fractional coords
}
```
Dots: `this.homeDots: Phaser.GameObjects.Image[]` (len 13) using a small generated `particle-square`/`ball`-style dot or a tinted circle image; `img.setTint(colorToInt(home.colors[0]))`, away `away.colors[0]`. Initial loose formation lines (halves/forwards spread across width, backs deeper) positioned via `fieldToWorld`. Ball: single `ball` sprite at centre. Depth via `iso.depth(gx, gy, 1)` so sprites sit above the field.

Camera: instantiate `CameraController` bound to the whole-field world bounds so the full field fits (compute bounds from the four corner projections, add padding). Framing is fixed with a **slow auto-pan following ball x**: in `update()`, ease camera `scrollX` toward the ball's world x (`Phaser.Math.Linear(cam.scrollX, targetX, 0.02)`), clamped by the controller. No user pan/zoom required in match view (controller clamp still applies).

Return flow: mount a DOM 'Back to Club' button (via `src/ui/dom.ts` `button()`), on click → `bus.emit('match:finished', ...)` then `this.scene.start('Grounds')` and remove the button. (During normal playback BAK-194 emits `match:finished`; the button is the manual/early exit.)

## Edge cases & risks
- **iso.ts is read-only:** must not modify it; rely on it accepting fractional grid coords (it uses plain arithmetic, so fractions work).
- **Off-canvas field:** negative `screenX` for wide cells — apply the same centering offset pattern as Grounds (scene container offset or camera centre-on-bounds).
- **Tint on grayscale source:** the dot texture must be near-white/gray so `setTint` shows the true kit colour; a pure-colour texture would tint wrong.
- **DOM button leak:** remove the 'Back to Club' button in `shutdown()`/on click so it doesn't persist into Grounds (DOM overlay survives scene switches per §7).
- **Distinctness AC:** stripes + white lines + in-goal shading are what make it visually distinct from Grounds — verify in preview.
- **Camera jitter:** ease factor small (0.02) and `roundPixels` on to avoid shimmering during auto-pan.

## Acceptance criteria
- [ ] The field renders in isometric view with try-lines, in-goal areas, sidelines/edges, 10m stripes, and a halfway line.
- [ ] The match field is visually distinct from the club grounds scene (striping + lines + no dirt/path).
- [ ] Home and away player dots are tinted with the correct `TeamSheet.colors[0]` values.
- [ ] Camera frames the whole field and slow-pans following ball x without leaving world bounds.
- [ ] `fieldToWorld(0,50)`/`fieldToWorld(100,50)` map to opposite try-line ends (manual/preview check + a pure helper unit if extracted).
- [ ] 'Back to Club' button returns to `'Grounds'` and emits `match:finished`.

## Out of scope
Player/ball animation, event-to-position sync, celebrations, camera shake (all BAK-194). Scoreboard/stats/commentary overlay (BAK-196). Weather/particle visuals (BAK-201). Real pixel-art sprites (dots are placeholders; replace by texture key later).
