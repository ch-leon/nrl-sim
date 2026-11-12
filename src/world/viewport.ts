// Pure viewport maths for the resizable canvas (#18). Phaser-free so it is
// unit-tested under node. The canvas fills the window and is rendered at the
// screen's pixel density (#627, world/density.ts); scenes use these helpers to
// pick a zoom for the current viewport.
//
// Units: a viewport is measured in CSS px. A camera zoom is in canvas px per art
// px, and the canvas has `density` canvas px to each CSS px, so zoom / density is
// the size of an art pixel in CSS px.

/** Approximate on-screen height of a player sprite at zoom 1 (world px). */
export const PLAYER_WORLD_PX = 20;
/**
 * Smallest player height the match zooms to (CSS px). ×1, 20 px, reads too small
 * (#627), so a 1× screen keeps ×2 on a phone; a 3× phone goes to ×1.33 (27 px).
 */
export const MIN_PLAYER_PX = 24;
/** Shorter viewport side at which the match zooms are authored (1280×800). */
export const REFERENCE_MIN_SIDE = 800;
/** Phones are scaled down at most this far from the authored zoom: ×2 becomes ×1.5. */
export const MIN_VIEW_SCALE = 0.75;
/**
 * The canvas is never rendered denser than this (fill rate: 4× the pixels at 2×, 9×
 * at 3×; #627's perf run at 3× missed seven budgets). A denser screen renders at a
 * whole fraction of its ratio, so the browser's own upscale is a whole number too
 * and art pixels stay uniform: a 3× phone renders at 1.5 and is shown at ×2.
 */
export const MAX_DENSITY = 2;

// The density the canvas is rendered at, set by the boot (world/density.ts). 1 in
// node, so the pure maths that read it by default behave as on a 1× screen.
let current = 1;

/**
 * Canvas px per CSS px for a screen's devicePixelRatio: the ratio itself up to
 * MAX_DENSITY; past it, the ratio over the smallest whole number that brings it
 * under (3 → 1.5), so each canvas px is a whole number of device px. At least 1.
 */
export function densityFor(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 1) return 1;
  return Math.max(1, devicePixelRatio / Math.ceil(devicePixelRatio / MAX_DENSITY - 1e-9));
}

/**
 * A WebGL renderer string for a software rasteriser (Chrome's SwiftShader, Mesa's
 * llvmpipe/softpipe, Windows' Basic Render Driver): no GPU, so the canvas renders at
 * 1× (world/density.ts). A real phone's GPU, or a browser that masks the name, is not.
 */
export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer);
}

/** Canvas px per CSS px the game is rendered at now. */
export function screenDensity(): number {
  return current;
}

/** Record the density the canvas now renders at (world/density.ts, and tests). */
export function setScreenDensity(density: number): void {
  current = densityFor(density);
}

/** A camera's zoom in CSS terms: how many CSS px an art px covers. Screen-sized overlays scale by 1 / this. */
export function cssZoom(cam: { zoom: number }): number {
  return cam.zoom / current;
}

/** The canvas's backing size for a CSS-px viewport at `density`: whole canvas px. */
export function backingSize(view: { width: number; height: number }, density: number): { width: number; height: number } {
  return { width: Math.max(1, Math.round(view.width * density)), height: Math.max(1, Math.round(view.height * density)) };
}

export function isPortrait(view: { width: number; height: number }): boolean {
  return view.height > view.width;
}

/**
 * Multiplier applied to the authored match zooms for a viewport. Large screens
 * keep the authored zoom (1); small ones pull in slightly less so more of the
 * pitch is visible, but never below MIN_VIEW_SCALE.
 */
export function viewScale(view: { width: number; height: number }): number {
  const side = Math.min(view.width, view.height);
  return Math.min(1, Math.max(MIN_VIEW_SCALE, side / REFERENCE_MIN_SIDE));
}

/**
 * Zoom for a match beat on a CSS-px viewport rendered at `density`: the authored
 * zoom scaled for the viewport, snapped to a whole number of canvas px per art px
 * (the nearer one; on a tie the wider, to show more of the field), and raised if
 * that would leave a player under MIN_PLAYER_PX. Pixel art only stays crisp when
 * every art pixel is the same whole number of device pixels: at 1.75 some draw
 * double-width and some single, and with players moving every frame that pattern
 * crawls, which reads as blur (BAK-207). So a 1× screen has ×1, ×2, ×3; a 2× screen
 * also ×1.5 and ×2.5; a 3× screen (density 1.5) ×1.33 and ×2.67 (#627).
 */
export function zoomForViewport(baseZoom: number, view: { width: number; height: number }, density = 1): number {
  const want = baseZoom * viewScale(view) * density;
  const snapped = Math.ceil(want - 0.5);
  const floor = Math.ceil((MIN_PLAYER_PX / PLAYER_WORLD_PX) * density - 1e-9);
  return Math.max(1, snapped, floor);
}

/** Rendered height (CSS px) of a player at camera `zoom` on a canvas at `density`. */
export function playerPx(zoom: number, density = 1): number {
  return (zoom / density) * PLAYER_WORLD_PX;
}
