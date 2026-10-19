import { describe, it, expect } from 'vitest';
import {
  ghostStyle,
  constructionFrame,
  constructionDuration,
  upgradeFrame,
  scaleAbout,
  footprintCorners,
  dashSegments,
  SCAFFOLD_MS,
  POP_MS,
  UPGRADE_FLASH_MS,
  GHOST_OK_TINT,
  GHOST_BAD_TINT,
} from '../../src/world/buildFeedback';

describe('ghostStyle', () => {
  it('tints green when valid and red when invalid', () => {
    expect(ghostStyle(true).tint).toBe(GHOST_OK_TINT);
    expect(ghostStyle(false).tint).toBe(GHOST_BAD_TINT);
  });
  it('differs by more than colour: invalid is dashed with a cross, valid is not', () => {
    const ok = ghostStyle(true);
    const bad = ghostStyle(false);
    expect(ok.dashed).toBe(false);
    expect(ok.showCross).toBe(false);
    expect(bad.dashed).toBe(true);
    expect(bad.showCross).toBe(true);
    expect(ok.alpha).toBeGreaterThan(0);
    expect(ok.alpha).toBeLessThan(1);
  });
});

describe('constructionFrame', () => {
  it('shows only scaffolding for ~1.5s', () => {
    const f = constructionFrame(SCAFFOLD_MS - 1, false);
    expect(f.phase).toBe('scaffold');
    expect(f.buildingAlpha).toBe(0);
    expect(f.scaffoldAlpha).toBe(1);
    expect(constructionFrame(0, false).scaffoldAlpha).toBe(0);
  });
  it('pops in with squash and stretch, then settles at scale 1', () => {
    const mid = constructionFrame(SCAFFOLD_MS + POP_MS * 0.25, false);
    expect(mid.phase).toBe('pop');
    expect(mid.buildingAlpha).toBe(1);
    expect(mid.scaleX).toBeGreaterThan(1);
    expect(mid.scaleY).toBeLessThan(1);
    const later = constructionFrame(SCAFFOLD_MS + POP_MS * 0.75, false);
    expect(later.scaleX).toBeLessThan(1);
    expect(later.scaleY).toBeGreaterThan(1);
    expect(constructionFrame(SCAFFOLD_MS + POP_MS, false)).toEqual({
      phase: 'done', buildingAlpha: 1, scaffoldAlpha: 0, scaleX: 1, scaleY: 1,
    });
  });
  it('is skipped entirely under reduced motion', () => {
    expect(constructionDuration(true)).toBe(0);
    expect(constructionFrame(0, true).phase).toBe('done');
    expect(constructionFrame(0, true).buildingAlpha).toBe(1);
    expect(constructionDuration(false)).toBe(SCAFFOLD_MS + POP_MS);
  });
});

describe('upgradeFrame', () => {
  it('flashes at full strength as the art swaps, then fades out', () => {
    expect(upgradeFrame(0, false).flashAlpha).toBe(1);
    expect(upgradeFrame(UPGRADE_FLASH_MS / 2, false).flashAlpha).toBeCloseTo(0.5);
    expect(upgradeFrame(UPGRADE_FLASH_MS, false).done).toBe(true);
  });
  it('shows no flash under reduced motion', () => {
    expect(upgradeFrame(0, true)).toEqual({ flashAlpha: 0, done: true });
  });
});

describe('footprintCorners / dashSegments', () => {
  it('gives the diamond corners of a footprint', () => {
    const [t, r, b, l] = footprintCorners({ x: 0, y: 0 }, 2, 2, 64, 32);
    expect(t).toEqual({ x: 0, y: 0 });
    expect(r).toEqual({ x: 64, y: 32 });
    expect(b).toEqual({ x: 0, y: 64 });
    expect(l).toEqual({ x: -64, y: 32 });
  });
  it('breaks an edge into dashes with gaps', () => {
    const segs = dashSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 2);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
    expect(segs[2]![1].x).toBe(10);
    expect(dashSegments({ x: 1, y: 1 }, { x: 1, y: 1 }, 2, 2)).toEqual([]);
  });
});

describe('scaleAbout', () => {
  it('is the identity at scale 1 and keeps the anchor fixed', () => {
    expect(scaleAbout({ x: 10, y: 20 }, { x: 10, y: 50 }, 1, 1)).toEqual({ x: 10, y: 20 });
    // anchor itself never moves
    expect(scaleAbout({ x: 50, y: 50 }, { x: 50, y: 50 }, 2, 0.5)).toEqual({ x: 50, y: 50 });
  });
  it('squashing pulls the top vertex toward the anchor', () => {
    expect(scaleAbout({ x: 0, y: 0 }, { x: 0, y: 100 }, 1, 0.8).y).toBeCloseTo(20);
  });
});

import { demolishFrame } from '../../src/world/buildFeedback';

describe('demolishFrame (#78)', () => {
  it('is the construction played backwards, ending with the building gone', () => {
    const total = SCAFFOLD_MS + POP_MS;
    expect(demolishFrame(0, false).buildingAlpha).toBe(1);
    expect(demolishFrame(100, false)).toEqual(constructionFrame(total - 100, false));
    expect(demolishFrame(total - 50, false).phase).toBe('scaffold');
    expect(demolishFrame(total, false)).toMatchObject({ phase: 'done', buildingAlpha: 0 });
    expect(demolishFrame(0, true)).toMatchObject({ phase: 'done', buildingAlpha: 0 });
  });
});
