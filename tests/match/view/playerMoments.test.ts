import { describe, expect, it } from 'vitest';
import { playerPicture } from '../../../src/match/view/playerPicture';
import type { PlayerSnap } from '../../../src/match/core/snapshot';
const p: PlayerSnap = { side: 'home', slot: 0, who: 'captain', x: 50, y: 20, pose: 'kick', headX: 1, speed: 0 };
const holder = { side: 'home' as const, slot: 0 };
describe('big-moment sampling', () => {
  it('strikes when possession leaves the boot, including immediate goal kicks', () => {
    const k = { ...p, poseUntil: 108, kick: { startedTick: 100, strikeTick: 103, untilTick: 108, kind: 'punt' as const } };
    expect([100, 101, 102].map(t => playerPicture(k, k, t, holder, 1).frame)).toEqual([0, 1, 2]);
    expect(playerPicture(k, k, 103, null, 1)).toMatchObject({ frame: 3, possession: false });
    expect(playerPicture(k, k, 107, null, 1).frame).toBe(5);
    expect(playerPicture({ ...k, kick: { ...k.kick, kind: 'grubber' } }, k, 103, null, 1).action).toBe('grubberKick');
    expect(playerPicture({ ...k, kick: { ...k.kick, kind: 'drop', strikeTick: 100 } }, k, 100, null, 1)).toMatchObject({ action: 'dropKick', frame: 3, possession: false });
  });
  it('shows a high take only for the actual successful reception and yields to contact', () => {
    const caught = { ...p, pose: 'catch', caughtTick: 100, aerialCatchTick: 100 };
    expect(playerPicture(caught, caught, 101, holder, 1)).toMatchObject({ action: 'airCatch', lift: 6 });
    expect(playerPicture(caught, caught, 101, null, 1).action).not.toBe('airCatch');
    expect(playerPicture({ ...caught, aerialCatchTick: 99 }, caught, 101, holder, 1).action).not.toBe('airCatch');
    expect(playerPicture({ ...caught, pose: 'tackled' }, caught, 101, holder, 1)).toMatchObject({ action: 'tackled', lift: 0 });
    expect(playerPicture({ ...caught, pose: 'run' }, caught, 106, holder, 1)).toMatchObject({ action: 'carry', lift: 0 });
  });
  it('grounds the actual scorer, then recovers across the sim change to celebrate', () => {
    const scorer = { ...p, pose: 'dive', tryTick: 100, celebrationTick: 100 };
    expect(playerPicture(scorer, scorer, 100, holder, 1)).toMatchObject({ action: 'dive', frame: 0 });
    expect(playerPicture(scorer, scorer, 109, holder, 1)).toMatchObject({ action: 'dive', frame: 5 });
    const up = { ...scorer, pose: 'celebrate' };
    expect(playerPicture(up, scorer, 110, holder, 1)).toMatchObject({ action: 'tryRise', frame: 0 });
    expect(playerPicture(up, up, 119, holder, 1)).toMatchObject({ action: 'tryRise', frame: 5 });
    expect(['fistPump', 'point', 'celebrate', 'kneeSlide']).toContain(playerPicture(up, up, 120, holder, 1).action);
    expect(playerPicture({ ...p, pose: 'down' }, p, 120, null, 1).action).toBe('down');
  });
  it('keeps reactions stable across seeks and assigns no celebration to opponents', () => {
    const friend = { ...p, pose: 'celebrate', celebrationTick: 100 };
    const first = playerPicture(friend, friend, 122, null, 1);
    playerPicture(friend, friend, 144, null, 1);
    expect(playerPicture(friend, friend, 122, null, 1)).toEqual(first);
    const reactions = new Set(Array.from({ length: 9 }, (_, slot) => playerPicture({ ...friend, slot, who: `team-${slot}` }, friend, 122, null, 1).action));
    expect(reactions.size).toBeGreaterThan(1);
    expect(playerPicture({ ...p, side: 'away', pose: 'idle' }, p, 122, null, 1).action).toBe('idle');
  });
  it('reaches all four solo celebrations, the knee slide included, and never the paired chest bump', () => {
    const friend = { ...p, pose: 'celebrate', celebrationTick: 100 };
    const reactions = new Set(Array.from({ length: 60 }, (_, slot) => playerPicture({ ...friend, slot, who: `squad-${slot}` }, friend, 122, null, 1).action));
    expect(reactions).toEqual(new Set(['fistPump', 'point', 'celebrate', 'kneeSlide']));
  });
  it('keeps a fending carrier striding: the legs follow the run cycle, the arm the fend', () => {
    const fend = { ...p, pose: 'fend', poseUntil: 106, speed: 6 };
    const strides = [100, 101, 102, 103].map(t => playerPicture(fend, fend, t, holder, 1));
    for (const picture of strides) expect(picture.action).toBe('fend');
    expect(new Set(strides.map(s => s.strideFrame)).size).toBeGreaterThan(1);
    expect(playerPicture({ ...fend, speed: 0 }, fend, 101, holder, 1).strideFrame).toBe(-1);
  });
});
