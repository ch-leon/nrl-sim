import { describe, expect, it } from 'vitest';
import { playerPicture } from '../../../src/match/view/playerPicture';
import type { PlayerSnap } from '../../../src/match/core/snapshot';
import { LIVE } from '../../../src/match/league/live/knobs';
const p: PlayerSnap = { side: 'home', slot: 0, who: 'captain', x: 40, y: 20, pose: 'run', headX: 1, headY: -.6, speed: 6, caughtTick: 100 };
describe('live player presentation', () => {
  it('catches during forward movement and tucks into a carry, with stable direction', () => {
    const holder = { side: 'home' as const, slot: 0 };
    expect(playerPicture(p, p, 101, holder, 1)).toMatchObject({ who: 'captain', action: 'catch', possession: true, facing: 'back' });
    expect(playerPicture(p, p, 105, holder, 1).action).toBe('carry');
    expect(playerPicture(p, p, 105, null, 1)).toMatchObject({ action: 'run', possession: false });
    expect(playerPicture(p, p, 105, holder, -1).left).toBe(true);
  });
  it('does not advance a paused picture or reassign possession after a strip', () => {
    const picture = playerPicture(p, p, 106, null, 1);
    playerPicture(p, p, 220, null, 1);
    expect(playerPicture(p, p, 106, null, 1)).toEqual(picture);
    expect(playerPicture(p, p, 106, { side: 'away', slot: 0 }, 1).possession).toBe(false);
  });
  it('keeps the catch gait in step with a carry while the hands tuck independently', () => {
    const holder = { side: 'home' as const, slot: 0 };
    const frames = [100, 101, 102, 103].map(t => playerPicture(p, p, t, holder, 1));
    expect(frames.map(f => f.frame)).toEqual([0, 1, 3, 5]);
    expect(new Set(frames.map(f => f.strideFrame)).size).toBeGreaterThan(1);
    for (const tick of [100, 101, 102, 103]) {
      const carry = playerPicture({ ...p, caughtTick: 1 }, p, tick, holder, 1);
      expect(playerPicture(p, p, tick, holder, 1).strideFrame).toBe(carry.strideFrame);
    }
    expect(playerPicture({ ...p, speed: 0 }, p, 101, holder, 1).strideFrame).toBe(-1);
  });
  it('waits for the actual pickup, then scoops over the available dummy-half hold', () => {
    const dh = { ...p, pose: 'dummyHalf', caughtTick: 110, poseUntil: 120 };
    const holder = { side: 'home' as const, slot: 0 };
    expect(playerPicture(dh, dh, 108, null, 1)).toMatchObject({ frame: 0, possession: false });
    expect(playerPicture(dh, dh, 110, holder, 1)).toMatchObject({ frame: 0, possession: true });
    expect(playerPicture(dh, dh, 110 + LIVE.dhHoldTicks - 1, holder, 1).frame).toBe(5);
    const sample = playerPicture(dh, dh, 112, holder, 1);
    playerPicture(dh, dh, 300, null, 1);
    expect(playerPicture(dh, dh, 112, holder, 1)).toEqual(sample);
  });
  it('finishes the heel and pass follow-through before their simulation deadlines', () => {
    const holder = { side: 'home' as const, slot: 0 };
    const ptb = { ...p, pose: 'ptb', poseUntil: 100 + LIVE.ptbTicks };
    expect(playerPicture(ptb, ptb, 100, holder, 1).frame).toBe(0);
    expect(playerPicture(ptb, ptb, ptb.poseUntil - 1, holder, 1).frame).toBe(5);
    for (const duration of [5, 9]) {
      const passer = { ...p, pose: 'pass', caughtTick: 100, poseUntil: 100 + duration };
      expect(playerPicture(passer, passer, 100, null, 1)).toMatchObject({ frame: 0, possession: false });
      expect(playerPicture(passer, passer, 100 + duration - 1, null, 1).frame).toBe(5);
    }
  });
});
