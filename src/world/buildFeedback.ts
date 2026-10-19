// src/world/buildFeedback.ts — pure (Phaser-free) maths for build feedback (GitHub #24):
// the placement ghost's look per validity, and the construction / upgrade timelines.
// The Phaser glue lives in ./buildFx.ts. Everything here is presentation only: it
// never touches GameState, so state timing is unchanged by the animation.

export const GHOST_OK_TINT = 0x6bff8a;
export const GHOST_BAD_TINT = 0xff5a5a;

export interface GhostStyle {
  /** Multiply tint for the facility sprite. */
  tint: number;
  alpha: number;
  /** Footprint outline colour. */
  outlineColor: number;
  /** Dashed outline + a ✕ marker when invalid — readable without colour. */
  dashed: boolean;
  showCross: boolean;
}

/** Ghost look for a placement validity: green solid vs red dashed with a ✕. */
export function ghostStyle(ok: boolean): GhostStyle {
  return ok
    ? { tint: GHOST_OK_TINT, alpha: 0.6, outlineColor: GHOST_OK_TINT, dashed: false, showCross: false }
    : { tint: GHOST_BAD_TINT, alpha: 0.5, outlineColor: GHOST_BAD_TINT, dashed: true, showCross: true };
}

/** Prefers-reduced-motion, read the same way as src/fx/atmosphere.ts. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const SCAFFOLD_MS = 1500;
export const POP_MS = 320;
export const UPGRADE_FLASH_MS = 450;

export interface BuildFrame {
  phase: 'scaffold' | 'pop' | 'done';
  /** Opacity of the finished building (0 while the scaffold is up). */
  buildingAlpha: number;
  /** Opacity of the scaffolding overlay. */
  scaffoldAlpha: number;
  scaleX: number;
  scaleY: number;
}

const DONE: BuildFrame = { phase: 'done', buildingAlpha: 1, scaffoldAlpha: 0, scaleX: 1, scaleY: 1 };

/** Total visual length of a construction. Reduced motion skips it entirely. */
export function constructionDuration(reduced: boolean): number {
  return reduced ? 0 : SCAFFOLD_MS + POP_MS;
}

/** Construction frame at `elapsed` ms: ~1.5s scaffold, then a squash-and-stretch pop. */
export function constructionFrame(elapsed: number, reduced: boolean): BuildFrame {
  if (reduced || elapsed >= SCAFFOLD_MS + POP_MS) return DONE;
  const t = Math.max(0, elapsed);
  if (t < SCAFFOLD_MS) {
    // Scaffold fades in over the first 15%, building not yet visible.
    return {
      phase: 'scaffold',
      buildingAlpha: 0,
      scaffoldAlpha: Math.min(1, t / (SCAFFOLD_MS * 0.15)),
      scaleX: 1,
      scaleY: 1,
    };
  }
  const p = (t - SCAFFOLD_MS) / POP_MS; // 0..1
  // Squash (wide + short) -> stretch (narrow + tall) -> settle, damped.
  const wobble = Math.sin(p * Math.PI * 2) * (1 - p);
  return {
    phase: 'pop',
    buildingAlpha: 1,
    scaffoldAlpha: 1 - Math.min(1, p * 3),
    scaleX: 1 + 0.12 * wobble,
    scaleY: 1 - 0.18 * wobble,
  };
}

/**
 * Demolition frame (GitHub #78): the construction played backwards. The building
 * wobbles, vanishes behind scaffolding that then fades away; once done the
 * building is fully transparent and the sprite can go.
 */
export function demolishFrame(elapsed: number, reduced: boolean): BuildFrame {
  const total = SCAFFOLD_MS + POP_MS;
  if (reduced || elapsed >= total) return { ...DONE, buildingAlpha: 0 };
  return constructionFrame(total - Math.max(0, elapsed), false);
}

export interface UpgradeFrame {
  /** Scaffold flash opacity: full as the new art swaps in, then fading out. */
  flashAlpha: number;
  done: boolean;
}

/** Upgrade frame: a short scaffold flash that covers the art swap and fades away. */
export function upgradeFrame(elapsed: number, reduced: boolean): UpgradeFrame {
  if (reduced || elapsed >= UPGRADE_FLASH_MS) return { flashAlpha: 0, done: true };
  return { flashAlpha: 1 - Math.max(0, elapsed) / UPGRADE_FLASH_MS, done: false };
}

type Pt = { x: number; y: number };

/** Screen-space corners of a w×h footprint whose top vertex is `top` (TILE_W/TILE_H sized). */
export function footprintCorners(top: Pt, w: number, h: number, tileW: number, tileH: number): [Pt, Pt, Pt, Pt] {
  return [
    top,
    { x: top.x + (w * tileW) / 2, y: top.y + (w * tileH) / 2 },
    { x: top.x + ((w - h) * tileW) / 2, y: top.y + ((w + h) * tileH) / 2 },
    { x: top.x - (h * tileW) / 2, y: top.y + (h * tileH) / 2 },
  ];
}

/** Dash segments along a→b (for the invalid ghost's dashed outline). */
export function dashSegments(a: Pt, b: Pt, dash: number, gap: number): [Pt, Pt][] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const out: [Pt, Pt][] = [];
  if (len === 0 || dash <= 0) return out;
  const at = (d: number): Pt => ({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
  for (let d = 0; d < len; d += dash + gap) out.push([at(d), at(Math.min(len, d + dash))]);
  return out;
}

/**
 * Position that makes a sprite scale about `anchor` (the footprint centre) rather
 * than its own origin, so a squash keeps the building's base on its tiles.
 */
export function scaleAbout(
  pos: { x: number; y: number },
  anchor: { x: number; y: number },
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: anchor.x - (anchor.x - pos.x) * sx, y: anchor.y - (anchor.y - pos.y) * sy };
}
