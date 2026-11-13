// #642: the bench, the sin bin and the corner posts are drawn with the players' own art.
import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import { CORNER_FLAG_H, CORNER_FLAG_X, drawBinSpot, drawCornerFlag, drawSeatedPlayer, paintBench } from '../../../src/art/match/bench';
import { FOOT, HEIGHT, WIDTH, appearanceFor, drawPrototypePlayer } from '../../../src/art/prototype/player';
import { opaqueBounds } from '../../../src/art/match/players';

const kit = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');
const look = { ...appearanceFor('bench-test', 'prop'), number: 12 };

describe('the bench (#642)', () => {
  it('a seated reserve is a player frame, shorter than him standing, feet on the same row', () => {
    const sit = drawSeatedPlayer(look, kit);
    expect([sit.w, sit.h]).toEqual([WIDTH, HEIGHT]);
    const s = opaqueBounds(sit)!;
    const st = opaqueBounds(drawPrototypePlayer(look, kit, 'idle', 0, 'back'))!;
    expect(s.y0).toBeGreaterThan(st.y0);
    expect(s.y1).toBe(st.y1);
    expect(s.y1).toBeLessThanOrEqual(FOOT + 1);
  });

  it('the painting is the same size whoever sits on it, so a repaint fits its texture', () => {
    const seats = [0, 1, 2, 3, 4].map((i) => ({ x: 400 - i * 18, y: 300 - i * 9 }));
    const empty = paintBench(seats, seats.map(() => null), kit);
    const full = paintBench(seats, seats.map(() => drawSeatedPlayer(look, kit)), kit);
    expect([full.buf.w, full.buf.h, full.x, full.y]).toEqual([empty.buf.w, empty.buf.h, empty.x, empty.y]);
    expect(full.buf.opaqueCount()).toBeGreaterThan(empty.buf.opaqueCount() * 2);
  });

  it('the sin bin and the corner post draw', () => {
    expect(drawBinSpot().opaqueCount()).toBeGreaterThan(30);
    const flag = drawCornerFlag(kit);
    // The post's foot is on its origin row.
    expect(flag.get(CORNER_FLAG_X, CORNER_FLAG_H - 2).alpha).toBe(255);
    expect(flag.get(CORNER_FLAG_X, CORNER_FLAG_H - 1).alpha).toBe(255); // outline under it
  });
});
