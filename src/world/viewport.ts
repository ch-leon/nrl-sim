// Pure viewport maths for the resizable canvas (#18). Phaser-free so it is
// unit-tested under node. The canvas fills the window (Scale.RESIZE); scenes use
// these helpers to pick a zoom for the current viewport.

/** Approximate on-screen height of a player sprite at zoom 1 (world px). */
export const PLAYER_WORLD_PX = 20;
/** Smallest player height we accept on any screen (CSS px). */
export const MIN_PLAYER_PX = 16;
/** Shorter viewport side at which the match zooms are authored (1280×800). */
export const REFERENCE_MIN_SIDE = 800;
/** Phones are scaled down at most this far from the authored zoom. */
export const MIN_VIEW_SCALE = 0.8;

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
 * Zoom for a match beat on a given viewport: the authored zoom scaled for the
 * viewport, floored so a player is never smaller than MIN_PLAYER_PX tall.
 */
export function zoomForViewport(baseZoom: number, view: { width: number; height: number }): number {
  const floor = MIN_PLAYER_PX / PLAYER_WORLD_PX;
  return Math.max(floor, baseZoom * viewScale(view));
}

/** Rendered height (CSS px) of a player at `zoom`. */
export function playerPx(zoom: number): number {
  return zoom * PLAYER_WORLD_PX;
}
