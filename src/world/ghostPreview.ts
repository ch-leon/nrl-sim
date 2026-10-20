// src/world/ghostPreview.ts — the textured placement ghost (GitHub #24). Kept free of
// runtime Phaser imports (types only) so placement.ts stays importable in unit tests.
import type Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config';
import type { FacilityDef, FacilityDefId } from '../data/facility';
import { facilityOrigin } from '../art/grounds/facilities';
import { ensureFacilityTexture } from '../art/grounds';
import { dashSegments, footprintCorners, ghostStyle } from './buildFeedback';

type Pt = { x: number; y: number };

/** Draw a w×h footprint outline (solid or dashed) with Graphics. */
export function strokeFootprint(g: Phaser.GameObjects.Graphics, top: Pt, def: FacilityDef, color: number, dashed: boolean): void {
  const c = footprintCorners(top, def.footprint.w, def.footprint.h, TILE_W, TILE_H);
  g.lineStyle(2, color, 1);
  for (let i = 0; i < 4; i++) {
    const a = c[i]!;
    const b = c[(i + 1) % 4]!;
    if (!dashed) {
      g.lineBetween(a.x, a.y, b.x, b.y);
      continue;
    }
    for (const [p, q] of dashSegments(a, b, 6, 5)) g.lineBetween(p.x, p.y, q.x, q.y);
  }
}

/** Centre of a footprint's ground diamond, given its top vertex. */
export function footprintCentre(top: Pt, def: FacilityDef): Pt {
  const { w, h } = def.footprint;
  return { x: top.x + ((w - h) * TILE_W) / 4, y: top.y + ((w + h) * TILE_H) / 4 };
}

/**
 * Semi-transparent real facility texture that snaps to the grid, tinted green/red,
 * with a solid outline when valid and a dashed outline + ✕ when invalid.
 */
export class GhostPreview {
  private sprite: Phaser.GameObjects.Image;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    defId: FacilityDefId,
    private def: FacilityDef,
    level: 1 | 2 | 3 = 1, // a moved facility keeps its level art (#78)
  ) {
    this.sprite = scene.add.image(0, 0, ensureFacilityTexture(scene, defId, level));
    const o = facilityOrigin(def.footprint, this.sprite.height);
    this.sprite.setOrigin(o.x, o.y);
    this.gfx = scene.add.graphics();
  }

  /** Move to the footprint whose top vertex is `top`, restyle for validity. */
  update(top: Pt, ok: boolean, depth: number): void {
    const style = ghostStyle(ok);
    this.sprite.setPosition(top.x, top.y).setTint(style.tint).setAlpha(style.alpha).setDepth(depth);
    this.gfx.clear().setDepth(depth + 0.1);
    strokeFootprint(this.gfx, top, this.def, style.outlineColor, style.dashed);
    if (style.showCross) {
      const c = footprintCentre(top, this.def);
      this.gfx.lineStyle(4, style.outlineColor, 1);
      this.gfx.lineBetween(c.x - 10, c.y - 10, c.x + 10, c.y + 10);
      this.gfx.lineBetween(c.x - 10, c.y + 10, c.x + 10, c.y - 10);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.gfx.destroy();
  }
}
