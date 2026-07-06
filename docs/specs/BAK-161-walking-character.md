# BAK-161 — Add walking pixel character with basic pathing
**Linear:** https://linear.app/bakinglions/issue/BAK-161/add-walking-pixel-character-with-basic-pathing | **Priority:** Urgent | **Work unit:** WU-2

## Problem
We need one pixel character walking around the iso grounds to validate the movement + animation pipeline end to end: generated spritesheet, tap-to-move, grid pathfinding around obstacles, and correct iso depth sorting so the character layers in front of/behind tiles and (later) facilities.

## Proposed solution
Generate a placeholder 16×16 character with idle + walk frames for 4 directions (n/e/s/w) in BootScene. Add a pure A* pathfinder `src/world/path.ts` over a walkability grid with a `setBlocked(x,y,blocked)` API (facilities in WU-8 mark tiles unwalkable). In GroundsScene, tap-to-move: convert the tap to a grid cell via `iso.screenToGrid`, run A* from the character's cell to the target, then step the sprite tile-by-tile, playing the walk animation for the current step direction and idle when stopped. Depth follows `iso.depth(gx,gy,1)` so the character sits above its tile and sorts correctly against others.

## Affected files
- Create `src/world/path.ts` — A* pathfinder + walkability grid + `setBlocked`.
- Modify `src/scenes/BootScene.ts` — generate `char-idle-<dir>` and `char-walk-<dir>-<frame>` textures; register walk animations.
- Modify `src/scenes/GroundsScene.ts` — spawn character, tap-to-move handler, per-frame movement + depth update.
- Test `tests/world/path.test.ts` — A* correctness, obstacle avoidance, no-path case, `setBlocked`.

## Key interfaces & behaviour
Directions and texture keys per ARCHITECTURE.md §7 (`dirs: n/e/s/w`):
```ts
export type Dir = 'n' | 'e' | 's' | 'w';
// texture keys: `char-idle-${dir}`, `char-walk-${dir}-${frame}` (frame 0..N-1)
```
Generated art (BootScene): 16×16 per frame. Idle = 1 frame per dir (a simple coloured body block with a facing marker pixel). Walk = 4 frames per dir (bob/leg offset). Draw with Graphics, `generateTexture(key,16,16)`. Register Phaser anims: key `walk-<dir>` from the 4 walk frames at ~8fps, loop; idle is a static texture set via `setTexture('char-idle-'+dir)`.

`src/world/path.ts` — pure TS, no Phaser (ARCHITECTURE.md §1):
```ts
export class WalkGrid {
  constructor(width: number, height: number);   // all cells walkable initially
  setBlocked(x: number, y: number, blocked: boolean): void;
  isWalkable(x: number, y: number): boolean;     // false if out of bounds or blocked
}

export interface PathNode { x: number; y: number; }

// 4-connected A* (Manhattan heuristic). Returns [] if no path (incl. start blocked
// or target blocked). Path INCLUDES the target and EXCLUDES the start cell.
export function findPath(
  grid: WalkGrid, start: PathNode, target: PathNode,
): PathNode[];
```
Use 4-connected movement (matches iso n/e/s/w facing cleanly; no diagonal corner-cutting to reason about). Heuristic: Manhattan. Ties broken by lower f then insertion order for determinism.

Direction from step: given step `(dx,dy)` in grid space, map to `Dir`:
```ts
// grid +x = 'e' direction, +y = 's' (screen-down), etc. — chosen to match iso layout
function stepDir(dx: number, dy: number): Dir {
  if (dx > 0) return 'e'; if (dx < 0) return 'w';
  if (dy > 0) return 's'; return 'n';
}
```

GroundsScene character behaviour:
- Spawn: `this.char = this.add.sprite(p.x, p.y - 8, 'char-idle-s')` where `p = gridToScreen(startGx,startGy)`; `setOrigin(0.5, 1)` so feet sit on the tile; store `charCell = {gx,gy}`; set `char.setDepth(iso.depth(startGx,startGy,1))`.
- Build a `WalkGrid(GRID_W, GRID_H)`; mark any non-walkable tiles blocked (none yet; facilities call `setBlocked` later — expose the grid on the scene).
- Tap handler (guarded by camera): `if (camera.wasDragging()) return;` then `const cell = screenToGrid(worldX, worldY); if (!inBounds || !grid.isWalkable) return; this.path = findPath(grid, charCell, cell);`.
- Movement: each update, tween/lerp the sprite toward the next path node's screen position at a fixed speed (e.g. 120px/s). On reaching a node, pop it, set `charCell`, update facing + play `walk-<dir>`, and `setDepth(iso.depth(charCell.gx,charCell.gy,1))`. When path empties, switch to `char-idle-<lastDir>` and stop the anim.
- Convert tap coords with the camera-aware world point (`pointer.worldX/worldY`) so panning/zoom don't offset the target.

## Edge cases & risks
- Tap on the character's current cell → empty path → stay idle (no error).
- Tap on a blocked/out-of-bounds cell → ignore.
- No path (fully walled target) → `findPath` returns `[]`; character stays put.
- Depth must recompute per tile step, not once — otherwise the character clips through tiles as it walks "up" the grid.
- Tap/pan conflict: MUST consult `camera.wasDragging()` (BAK-159 contract) or every pan ends in an unwanted move.
- Determinism of A* matters if used in tests; fixed tie-breaking keeps `findPath` output stable.
- `setOrigin(0.5,1)` + the `-8` spawn nudge keep feet on the diamond top; keep origin consistent with depth layer=1.

## Acceptance criteria
- [ ] Character walks smoothly to the tapped/clicked tile along an A* path.
- [ ] Animation switches correctly: `walk-<dir>` while moving, `char-idle-<dir>` when stopped, facing the travel direction.
- [ ] Character avoids blocked cells (verify by marking a wall via `setBlocked` and confirming the path routes around it).
- [ ] Depth sorting correct: no clipping through tiles as the character moves across the grid.
- [ ] `findPath` unit tests cover a clear path, obstacle avoidance, target-on-start, and no-path returning `[]`.
- [ ] `WalkGrid.setBlocked` toggles walkability and is respected by `findPath`.

## Out of scope
Multiple characters / crowd sim, 8-direction art, diagonal movement, facilities actually blocking tiles (WU-8 calls `setBlocked`), path smoothing, and any NPC AI.
