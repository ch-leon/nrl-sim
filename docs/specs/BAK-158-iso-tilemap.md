# BAK-158 — Render isometric club grounds tilemap
**Linear:** https://linear.app/bakinglions/issue/BAK-158/render-isometric-club-grounds-tilemap | **Priority:** Urgent | **Work unit:** WU-2

## Problem
We need the club grounds to render as an isometric grid of pixel tiles so facilities and characters have a world to live in. There is no iso projection helper, no tile textures, and no grid renderer yet. Depth sorting must be correct so later sprites (characters, facilities) layer properly.

## Proposed solution
Add `src/world/iso.ts` — pure, Phaser-free iso math (grid↔screen, depth) with unit tests. Generate tile textures at boot in `BootScene` via `Graphics.generateTexture()` (ARCHITECTURE.md §4/§7 — no binary assets). Render a `GRID_W × GRID_H` (20×20) grounds in `GroundsScene` from a 2D `number[][]` tile array using `Image` sprites placed with `iso.gridToScreen`, depth-sorted by `iso.depth`.

**Explicit decision (deviates from ticket wording):** the ticket says "Load tileset using a tilemap (JSON format)". Per ARCHITECTURE.md §4, we do NOT use Tiled/JSON tilemaps or binary tilesets. Tiles are generated textures and the ground is a hand-rolled render from an in-memory 2D array. This is the chosen POC approach and is authoritative over the ticket's JSON wording.

## Affected files
- Create `src/world/iso.ts` — iso math + depth helpers.
- Modify `src/scenes/BootScene.ts` — generate tile textures (`tile-grass`, `tile-dirt`, `tile-path`, `tile-highlight-ok`, `tile-highlight-bad`) then `this.scene.start('Grounds')`.
- Modify `src/scenes/GroundsScene.ts` — build tile array, render iso grid.
- Modify `src/main.ts` (orchestrator-owned) — register `GroundsScene` in the scene list. If unable to touch `main.ts`, report BLOCKED for that line only.
- Test `tests/world/iso.test.ts` — round-trip + depth ordering.

## Key interfaces & behaviour
`src/world/iso.ts` — matches ARCHITECTURE.md §7 projection exactly (`screenX=(gx-gy)*TILE_W/2`, `screenY=(gx+gy)*TILE_H/2`, depth=screenY):
```ts
export interface Point { x: number; y: number; }        // screen px
export interface Cell  { gx: number; gy: number; }      // grid coords

export function gridToScreen(gx: number, gy: number): Point {
  return { x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) };
}

// Inverse projection. screenToGrid(gridToScreen(gx,gy)) rounds back to (gx,gy).
export function screenToGrid(sx: number, sy: number): Cell {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
}

// Draw/sort order. Objects sitting on a tile pass layer=1 to sit above the floor.
export function depth(gx: number, gy: number, layer = 0): number {
  return (gx + gy) * (TILE_H / 2) + layer;
}

export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
}
```

Tile texture generation (BootScene helper) — 2:1 diamonds `TILE_W×TILE_H` (64×32). Draw a filled diamond via `Graphics.fillPoints([{x:32,y:0},{x:64,y:16},{x:32,y:32},{x:0,y:16}], true)` with a 1px darker outline for grid definition, then `gfx.generateTexture(key, TILE_W, TILE_H)`; destroy the Graphics after. Colours: grass `#3a7d34`, dirt `#8a6a3a`, path `#b9a06a`, highlight-ok `#4caf50` @ 0.5 alpha, highlight-bad `#e53935` @ 0.5 alpha. `fence` from the ticket is deferred (no §7 texture key exists) — noted in Out of scope.

`GroundsScene` tile map — enum-ish tile ids to keys:
```ts
enum Tile { Grass = 0, Dirt = 1, Path = 2 }
const KEY: Record<Tile, string> = { 0: 'tile-grass', 1: 'tile-dirt', 2: 'tile-path' };
```
`create()`: build `tiles: Tile[][]` sized `GRID_H` rows × `GRID_W` cols (default Grass; a couple of Path/Dirt cells for visual variety). For each `(gx,gy)`: `const p = gridToScreen(gx, gy); const img = this.add.image(p.x, p.y, KEY[tiles[gy][gx]]); img.setOrigin(0.5, 0); img.setDepth(depth(gx, gy));`. Center the map by offsetting the camera (see BAK-159) or by adding a scene-level container offset of `+GRID_H*TILE_W/2` on x so negative screenX cells stay on-canvas.

Origin note: with `setOrigin(0.5, 0)` the diamond's top vertex anchors at the projected point, matching the depth formula (larger gx+gy draws lower and later). Store the tile array on the scene as `this.tiles` for later WUs (placement/path) to read; do not export a shared grid module here.

## Edge cases & risks
- Off-by-half errors: `screenToGrid` MUST invert `gridToScreen` for integer cells — the round-trip test guards this.
- Depth ties (equal gx+gy) are fine for floor tiles; objects must add `layer` to avoid z-fighting with the tile they stand on.
- Negative `screenX` for cells where gy>gx: handled by the centering offset — without it the left half of the map is off-canvas.
- Generating textures every boot is cheap but must happen in BootScene `create()` before starting Grounds, else missing-texture placeholders render.
- 60fps: 400 static `Image`s is trivial; avoid per-frame re-sort — depths are set once at create.

## Acceptance criteria
- [ ] A 20×20 isometric grid renders in the browser with tiles aligned, no gaps or overlaps.
- [ ] `gridToScreen`/`screenToGrid` round-trip for all integer cells in bounds (unit test).
- [ ] `depth()` orders cells so higher gx+gy draw in front; `layer` lifts objects above their tile (unit test).
- [ ] Tile textures are generated in BootScene (no binary assets, no Tiled JSON).
- [ ] Scene runs at 60fps on desktop.

## Out of scope
Camera pan/zoom (BAK-159), character/pathing (BAK-161), facility placement + highlight interaction (WU-8), `fence` tile texture, and any tile editing UI.
