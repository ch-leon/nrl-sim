import { describe, expect, it } from 'vitest';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { drawMomentPlayer, momentPoseAt } from '../../../src/art/match/moments';
import { drawPrototypePlayer, appearanceFor, HEAD_OPTIONS, FOOT, CENTRE } from '../../../src/art/prototype/player';
import { bentContactArm } from '../../../src/art/match/limbs';
import { add } from '../../../src/art/prototype/tackle';
import { buildKit } from '../../../src/art/match/kit';
import { opaqueBounds } from '../../../src/art/match/players';
import { PlayerFrameCache } from '../../../src/scenes/matchPlayers';

const kit = buildKit(0xd2aa34, 0x243444, 'v'), base = appearanceFor('captain');
const kicks = ['kick', 'grubberKick', 'dropKick', 'teeKick'] as const;
const cheers = ['celebrate', 'fistPump', 'point', 'kneeSlide'] as const;
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);

describe('connected big-moment poses (#704)', () => {
  it('plants the support sole and lowers the kicking boot before the last visible recovery beat', () => {
    for (const action of kicks) {
      const poses = [0, 1, 2, 3, 4, 5].map(f => momentPoseAt(action, f, f < 3).pose);
      for (const p of poses) expect(p.farFoot).toEqual([15, 35]);
      expect(distance(poses[3]!.foot, poses[4]!.foot)).toBeLessThanOrEqual(6);
      expect(distance(poses[4]!.foot, poses[5]!.foot)).toBeLessThanOrEqual(5);
    }
    expect(momentPoseAt('kick', 3).pose.foot[1]).toBeLessThan(momentPoseAt('grubberKick', 3).pose.foot[1] - 4);
    expect(momentPoseAt('dropKick', 2, true).ball[1]).toBeGreaterThan(momentPoseAt('kick', 2, true).ball[1]);
  });
  it('returns the last kick frame to continuing run or settled idle without a ball, in every build/view/fatigue', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const facing of ['front', 'back', 'side'] as const) for (const tired of [0, 2]) for (const gait of [-1, 0, 2, 5, 8]) {
      const look = { ...base, build };
      const travel = drawPrototypePlayer(look, kit, gait < 0 ? 'idle' : 'run', 0, facing, false, gait, tired);
      for (const action of kicks) {
        const live = drawLivePlayer(look, kit, action, 5, facing, false, gait, tired);
        expect(live.data).toEqual(drawMomentPlayer(look, kit, action, 5, facing, false, gait, tired).data);
        // The empty tee owns only the final ground rows; the player's recovery is identical.
        expect(action === 'teeKick' ? live.data.subarray(0, (FOOT - 1) * live.w * 4) : live.data)
          .toEqual(action === 'teeKick' ? travel.data.subarray(0, (FOOT - 1) * travel.w * 4) : travel.data);
        expect(live.opaqueCount()).toBeGreaterThan(0);
      }
      if (gait < 0) {
        const breathing = drawPrototypePlayer(look, kit, 'idle', 1, facing, false, -1, tired);
        expect(Math.abs(opaqueBounds(travel)!.y0 - opaqueBounds(breathing)!.y0)).toBeLessThanOrEqual(1);
      }
    }
  });
  it('loads the aerial landing by one pixel, retaining the actual carry silhouette, ball anchor and foot phase', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) for (const facing of ['front', 'back', 'side'] as const) for (const tired of [0, 2]) {
      const look = { ...base, build, head };
      for (const gait of [-1, 0, 3, 8]) {
        const landing = drawLivePlayer(look, kit, 'airCatch', 4, facing, true, gait, tired);
        const end = drawLivePlayer(look, kit, 'airCatch', 5, facing, true, gait, tired);
        const carry = drawLivePlayer(look, kit, 'carry', 0, facing, true, gait, tired);
        expect(end.data).toEqual(carry.data);
        expect(opaqueBounds(landing)!.y0).toBe(opaqueBounds(end)!.y0 + 1);
        expect(opaqueBounds(landing)!.y1).toBe(opaqueBounds(end)!.y1);
        expect(opaqueBounds(landing)!.x0).toBeGreaterThan(0);
        expect(opaqueBounds(landing)!.x1).toBeLessThan(landing.w - 1);
      }
    }
  });
  it('uses a supported palm/knee rise and a shared body, hands and ball at all four solo celebration entries', () => {
    for (const f of [1, 2]) {
      const p = momentPoseAt('tryRise', f, true);
      const palm = bentContactArm(add(p.pose.shoulder, -3, 1), p.far).hand;
      expect(Math.abs(palm[1] - 35)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.pose.farKnee[1] - 35)).toBeLessThanOrEqual(2);
    }
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const facing of ['front', 'back', 'side'] as const) for (const possession of [false, true]) for (const stature of [-2, 2]) {
      const look = { ...base, build, stature };
      expect(drawLivePlayer(look, kit, 'dive', 5, facing, possession).data)
        .toEqual(drawLivePlayer(look, kit, 'tryRise', 0, facing, possession).data);
      const risen = drawLivePlayer(look, kit, 'tryRise', 5, facing, possession);
      for (const action of cheers) {
        const first = drawLivePlayer(look, kit, action, 0, facing, possession);
        expect(first.data).toEqual(risen.data);
        if (!possession) expect(Array.from(first.data).filter((v, i) => i % 4 === 0 && v === 255 && first.data[i + 1] === 255 && first.data[i + 2] === 255).length).toBe(0);
      }
    }
  });
  it('keeps the empty tee at its posts side through the last pose while the body turns, and keys that local flip', () => {
    const cache = new PlayerFrameCache({ home: kit, away: kit }, undefined, 2);
    const teeXs = (pixels: ReturnType<typeof drawLivePlayer>, left: boolean) => {
      const xs: number[] = [];
      for (let y = 0; y < pixels.h; y++) for (let x = 0; x < pixels.w; x++) if (pixels.get(x, y).color === 0xf08a24) xs.push((x + .5 - CENTRE) * (left ? -1 : 1));
      return xs.sort((a, b) => a - b);
    };
    for (const postsLeft of [false, true]) {
      const before = drawLivePlayer(base, kit, 'teeKick', 4, 'front', false, -1);
      const after = drawLivePlayer(base, kit, 'teeKick', 5, 'back', false, -1, 0, 0, undefined, true);
      expect(teeXs(after, !postsLeft)).toEqual(teeXs(before, postsLeft));
      expect(teeXs(after, !postsLeft).length).toBeGreaterThan(0);
    }
    const pic = { who: 'kicker', action: 'teeKick' as const, frame: 5, facing: 'side' as const, left: false, possession: false, strideFrame: -1 };
    const same = cache.get('home', pic), turned = cache.get('home', { ...pic, teeFlip: true });
    expect(turned.data).not.toEqual(same.data);
    expect(cache.get('home', { ...pic, teeFlip: true })).toBe(turned);
    const idle = cache.get('home', { ...pic, action: 'idle' });
    expect(teeXs(idle, false)).toHaveLength(0); expect(cache.size).toBe(2);
  });
});
