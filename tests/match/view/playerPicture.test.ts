import { describe, expect, it } from 'vitest';
import { playerPicture } from '../../../src/match/view/playerPicture';
import type { PlayerSnap } from '../../../src/match/core/snapshot';
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
});
