// A line break is clean or half (#638): the view's call, never the sim's count.
import { describe, it, expect } from 'vitest';
import { CLEAN_BREAK_M, HALF_BREAK, isCleanBreak, shownBreak } from '../../../src/match/view/lineBreak';
import { popupFor } from '../../../src/match/view/popups';
import { contestMarkFor } from '../../../src/match/view/contestLayer';
import { KeyMoments } from '../../../src/match/view/livePlayback';
import { Commentator } from '../../../src/match/view/commentary';
import type { PlayerSnap, Snapshot, SimEvent } from '../../../src/match/core/snapshot';

const P = (side: 'home' | 'away', slot: number, x: number, y = 34, headX = side === 'home' ? 1 : -1): PlayerSnap => ({ side, slot, x, y, pose: 'run', headX, speed: 5 });
/** Home carries towards +x from x=50; the away line is `behind` m behind him, bar one man `gap` m ahead. */
function pic(gap: number | null, behind = 30): Snapshot {
  const players = [P('home', 1, 50), P('home', 2, 44), P('home', 3, 40)];
  for (let i = 0; i < 12; i++) players.push(P('away', i + 1, 50 - behind - i));
  if (gap !== null) players.push(P('away', 13, 50 + gap));
  return { tick: 1, players, ball: { x: 50, y: 34, lift: 0, holder: { side: 'home', slot: 1 } }, label: '', events: [] };
}
const brk: SimEvent = { tick: 1, kind: 'line-break', text: 'x', side: 'home', slot: 1, player: 'Sam Smith' };

describe('clean and half line breaks', () => {
  it('is clean when the nearest unbeaten defender is far, or there is none', () => {
    expect(isCleanBreak(brk, pic(CLEAN_BREAK_M + 4))).toBe(true);
    expect(isCleanBreak(brk, pic(null))).toBe(true);
  });
  it('is half with a defender inside the margin ahead, and men behind do not count', () => {
    expect(isCleanBreak(brk, pic(CLEAN_BREAK_M - 2))).toBe(false);
    expect(isCleanBreak(brk, pic(8))).toBe(false);
    expect(isCleanBreak(brk, pic(null, 3))).toBe(true);
  });
  it("reads the carrier's direction, so an away break towards -x is judged the same", () => {
    const snap: Snapshot = { ...pic(null), players: [P('away', 1, 50), P('home', 1, 50 - 6)] };
    expect(isCleanBreak({ side: 'away', slot: 1 }, snap)).toBe(false);
    snap.players[1] = P('home', 1, 50 - 25);
    expect(isCleanBreak({ side: 'away', slot: 1 }, snap)).toBe(true);
    snap.players[1] = P('home', 1, 50 + 6);
    expect(isCleanBreak({ side: 'away', slot: 1 }, snap)).toBe(true);
  });
  it('a carrier not in the picture is half', () => {
    expect(isCleanBreak({ side: 'home', slot: 9 }, pic(30))).toBe(false);
  });
  it('shownBreak marks only half breaks and leaves the sim event alone', () => {
    expect(shownBreak(brk, pic(30))).toBe(brk);
    const half = shownBreak(brk, pic(5));
    expect(half.detail).toBe(HALF_BREAK);
    expect(brk.detail).toBeUndefined();
    const other: SimEvent = { ...brk, kind: 'tackle' };
    expect(shownBreak(other, pic(5))).toBe(other);
  });
});

describe('what a half break gets', () => {
  const half = shownBreak(brk, pic(5));
  it('no pop-up, and a clean break gets LINE BREAK!', () => {
    expect(popupFor(half)).toBeNull();
    const p = popupFor(brk)!;
    expect(p.word).toBe('LINE BREAK!');
    expect(p.big).toBe(true);
  });
  it('no key moment, no flash', () => {
    const k = new KeyMoments();
    k.note(half);
    expect(k.cap({ half: 1, seconds: 60 }, 9)).toBeNull();
    k.note(brk);
    expect(k.cap({ half: 1, seconds: 60 }, 9)).toBe(1);
    expect(contestMarkFor(half, pic(5))).toBeNull();
    expect(contestMarkFor(brk, pic(30))).not.toBeNull();
  });
  it('a plain line, not the big call', () => {
    const c = new Commentator(7, { home: 'Larrikins', away: 'Rovers' });
    const plain = c.line(half);
    expect(plain).toContain('Sam Smith');
    expect(plain).not.toMatch(/line break|through the line|!/i);
  });
});
