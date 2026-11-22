import { describe, expect, it } from 'vitest';
import { MOMENT_ACTIONS, drawMomentPlayer, momentPoseAt } from '../../../src/art/match/moments';
import { appearanceFor, HEAD_OPTIONS, drawPrototypePlayer } from '../../../src/art/prototype/player';
import { opaqueBounds } from '../../../src/art/match/players';
import { buildKit } from '../../../src/art/match/kit';
import { add } from '../../../src/art/prototype/tackle';
import { bentContactArm } from '../../../src/art/match/limbs';

const kit = buildKit(0xd2aa34, 0x243444, 'v');
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
describe('big-moment artwork', () => {
  it('keeps both legs and arms within the approved reach, including kicks and horizontal dives', () => {
    for (const action of MOMENT_ACTIONS) for (let frame = 0; frame < 6; frame++) for (const possession of [false, true]) {
      const { pose: p, near, far, lift } = momentPoseAt(action, frame, possession);
      expect(lift).toBeGreaterThanOrEqual(0); expect(lift).toBeLessThanOrEqual(6);
      for (const [offset, knee, foot] of [[2, p.knee, p.foot], [-2, p.farKnee, p.farFoot]] as const) {
        const hip = add(p.hip, offset, 0);
        expect(distance(hip, knee)).toBeLessThanOrEqual(5.001);
        expect(distance(knee, foot)).toBeLessThanOrEqual(5.001);
        expect(distance(hip, foot)).toBeLessThanOrEqual(9.501);
      }
      for (const [offset, hand] of [[3, near], [-3, far]] as const) {
        const a = bentContactArm(add(p.shoulder, offset, 1), hand);
        expect(distance(a.shoulder, a.elbow)).toBeLessThanOrEqual(5.001);
        expect(distance(a.elbow, a.hand)).toBeLessThanOrEqual(5.001);
        expect(distance(a.shoulder, a.hand)).toBeLessThanOrEqual(9.001);
      }
    }
  });
  it('fits every head and build in the existing texture, with both views and possession states', () => {
    for (const action of MOMENT_ACTIONS) for (const head of HEAD_OPTIONS) for (const build of ['lean', 'athletic', 'stocky'] as const) for (const facing of ['front', 'back'] as const) for (let f = 0; f < 6; f++) {
      const pixels = drawMomentPlayer({ ...appearanceFor('captain'), head, build }, kit, action, f, facing, f % 2 === 0, 2);
      const b = opaqueBounds(pixels)!;
      expect(b.x0, `${action}/${head}/${f}`).toBeGreaterThan(0); expect(b.y0).toBeGreaterThan(0);
      expect(b.x1).toBeLessThan(pixels.w - 1); expect(b.y1).toBeLessThan(pixels.h - 1);
    }
  });
  it('joins the landing to recovery, and the high take to the continuing carry', () => {
    expect(momentPoseAt('tryRise', 0, true).pose).toEqual(momentPoseAt('dive', 5, true).pose);
    expect(momentPoseAt('tryRise', 0, true).ball).toEqual(momentPoseAt('dive', 5, true).ball);
    expect(momentPoseAt('tryRise', 5, true).tilt).toBe(0);
    expect(momentPoseAt('airCatch', 5, true).lift).toBe(0);
    const look = appearanceFor('captain');
    for (const gait of [-1, 0, 1, 2, 3, 4, 5]) {
      expect(drawMomentPlayer(look, kit, 'airCatch', 5, 'front', true, gait).data)
        .toEqual(drawPrototypePlayer(look, kit, 'carry', 0, 'front', true, gait).data);
    }
  });
  it('shows open hands clear of the head, with sleeves joining the raised arms to the jersey', () => {
    const darkKit = buildKit(0x583d33, 0x191720, 'sleeves');
    for (const build of ['lean', 'stocky'] as const) for (const frame of [1, 2]) {
      const look = { ...appearanceFor('captain'), build, skin: 0x78513c, stature: 0 };
      const pixels = drawMomentPlayer(look, darkKit, 'bombContest', frame, 'front', false);
      const { pose } = momentPoseAt('bombContest', frame);
      const y = pose.shoulder[1]; // raised shoulder row −2, plus two spare rows in the final texture
      for (const [side, color] of [[1, darkKit.jersey], ...(frame === 2 ? [[-1, darkKit.jerseyShade]] : [])] as const) {
        for (let row = y; row <= y + 3; row++) {
          const shoulder = pose.shoulder[0] + side! * (row <= y + 1 ? 5 : 3);
          expect([shoulder - 1, shoulder, shoulder + 1, shoulder + 2].some(x => pixels.get(x, row).color === color)).toBe(true);
        }
      }
      const hasHand = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
        .some(x => [10, 11, 12, 13, 14].some(row => pixels.get(x, row).color === look.skin));
      expect(hasHand(29, 35)).toBe(true);
      if (frame === 2) expect(hasHand(9, 13)).toBe(true);
    }
  });
});
