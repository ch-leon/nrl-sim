// #673: the ground's scoreboard and the floodlights coming on.
import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import { BOARD_TEX_H, BOARD_TEX_W, boardColor, drawBoardFace, drawScoreboard, flashWord, scoreboardOrigin } from '../../../src/art/match/scoreboard';
import { LIGHTS_FLICKER_MS, floodlightRamp, lightsOnMs } from '../../../src/art/match/atmosphere';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { CENTRE, FOOT, HEIGHT, WIDTH } from '../../../src/art/prototype/player';
import { cameraWorldBounds } from '../../../src/art/match/stadium';

const home = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');
const away = kitFromColors(['#1b1d22', '#2d3436'], 'dark-side');
const colors = [boardColor(home), boardColor(away)] as const;
const same = (a: { data: Uint8ClampedArray }, b: { data: Uint8ClampedArray }): boolean => a.data.every((v, i) => v === b.data[i]);

describe('the scoreboard (#673)', () => {
  it('shows the score: a point more is a different picture, the same score the same one', () => {
    const a = drawScoreboard({ tags: ['RED', 'WOL'], score: [4, 0] }, colors);
    const b = drawScoreboard({ tags: ['RED', 'WOL'], score: [4, 0] }, colors);
    const c = drawScoreboard({ tags: ['RED', 'WOL'], score: [10, 0] }, colors);
    expect([a.w, a.h]).toEqual([BOARD_TEX_W, BOARD_TEX_H]);
    expect([c.w, c.h]).toEqual([BOARD_TEX_W, BOARD_TEX_H]);
    expect(same(a, b)).toBe(true);
    expect(same(a, c)).toBe(false);
  });

  it('flashes the scorer’s word, lit and unlit beats differing', () => {
    expect(flashWord(4)).toBe('TRY!');
    expect(flashWord(5)).toBe('TRY!');
    expect(flashWord(2)).toBe('GOAL');
    const on = drawBoardFace({ tags: ['RED', 'WOL'], score: [4, 0], flash: { word: 'TRY!', side: 'home', on: true } }, colors);
    const off = drawBoardFace({ tags: ['RED', 'WOL'], score: [4, 0], flash: { word: 'TRY!', side: 'home', on: false } }, colors);
    const score = drawBoardFace({ tags: ['RED', 'WOL'], score: [4, 0] }, colors);
    expect(same(on, off)).toBe(false);
    expect(same(off, score)).toBe(false);
  });

  it('a dark side’s tag still reads on the black face', () => {
    expect(boardColor(away)).not.toBe(away.jersey);
  });

  it('never overlaps a player, wherever on the ground he stands or jumps, and is inside the camera’s world', () => {
    const offsetX = fieldOffsetX();
    const o = scoreboardOrigin(offsetX);
    const board = { x0: o.x, y0: o.y, x1: o.x + BOARD_TEX_W, y1: o.y + BOARD_TEX_H };
    for (let fx = -12; fx <= 112; fx += 2) {
      for (let fy = -12; fy <= 112; fy += 2) {
        const w = fieldToWorldPoint(fx, fy, offsetX);
        // His frame, mirrored either way, lifted for a high take (6 px).
        const p = { x0: w.x - Math.max(CENTRE, WIDTH - CENTRE), x1: w.x + Math.max(CENTRE, WIDTH - CENTRE), y0: w.y - FOOT - 6, y1: w.y + HEIGHT - FOOT };
        const overlap = p.x0 < board.x1 && p.x1 > board.x0 && p.y0 < board.y1 && p.y1 > board.y0;
        expect(overlap, `${fx},${fy}`).toBe(false);
      }
    }
    const cam = cameraWorldBounds(offsetX);
    expect(board.y0).toBeGreaterThan(cam.y);
    expect(board.x1).toBeLessThan(cam.x + cam.width);
  });
});

describe('the floodlights come on (#673)', () => {
  it('each bank is off until its turn, stutters, then warms up to full by lightsOnMs', () => {
    expect(floodlightRamp(0, 0)).toBe(0);
    expect(floodlightRamp(100, 1)).toBe(0);
    const stutter = [0, 1, 2, 3, 4].map((k) => floodlightRamp(((k + 0.5) / 5) * LIGHTS_FLICKER_MS, 0));
    expect(stutter.some((v) => v === 0)).toBe(true);
    expect(stutter.some((v) => v > 0)).toBe(true);
    let last = 0;
    for (let ms = LIGHTS_FLICKER_MS; ms <= lightsOnMs(3); ms += 50) {
      const v = floodlightRamp(ms, 0);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
    for (const bank of [0, 1, 2]) expect(floodlightRamp(lightsOnMs(3), bank)).toBeCloseTo(1);
    expect(lightsOnMs(3)).toBeLessThan(4000);
  });
});
