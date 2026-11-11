import { describe, expect, it } from 'vitest';
import { ruckPoseAt } from '../../../src/art/match/ruck';
import { CONTACT_CASES, contactCaseAt } from '../../../src/labs/art/contactCases';
import { CONTACT_X, CONTACT_FOOT, contactPoseAt } from '../../../src/art/prototype/contact';
import { CENTRE, FOOT } from '../../../src/art/prototype/player';
import { add } from '../../../src/art/prototype/tackle';

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
describe('ruck transitions', () => {
  it('keeps the approved short limbs during placement, heel and pickup', () => {
    for (const action of ['ptb', 'dummyHalf'] as const) for (let frame = 0; frame < 6; frame++) {
      const { pose: p } = ruckPoseAt(action, frame);
      for (const [offset, knee, foot] of [[2, p.knee, p.foot], [-2, p.farKnee, p.farFoot]] as const) {
        const hip = add(p.hip, offset, 0);
        expect(distance(hip, knee)).toBeLessThanOrEqual(5.001);
        expect(distance(knee, foot)).toBeLessThanOrEqual(5.001);
        expect(distance(hip, foot)).toBeLessThanOrEqual(9.501);
        expect(foot[1]).toBe(35);
        expect(knee[1]).toBeLessThanOrEqual(foot[1]);
      }
    }
  });
  it('recovers into the same body and ball anchors as the play-the-ball, including quick rucks', () => {
    const ready = ruckPoseAt('ptb', 0);
    const targetHead = add(ready.pose.head, CONTACT_X - CENTRE, CONTACT_FOOT - FOOT);
    const targetBall = add(ready.ball, CONTACT_X - CENTRE, CONTACT_FOOT - FOOT);
    for (const { id, end, outcome } of CONTACT_CASES) {
      if (outcome === 'strip' || outcome === 'break-tackle') continue;
      for (const variant of [0, 1]) for (const duration of [7, 14, 22]) {
        const state = contactCaseAt(id, end / 20 + .05, variant).state!;
        const releaseTick = state.resolvedTick! + duration;
        const at = (tick: number) => contactPoseAt({ ...state, tick, contact: { ...state.contact, releaseTick } });
        const last = at(releaseTick - 1); const readyPose = at(releaseTick);
        expect(distance(last.carrier.pose.head, targetHead)).toBeLessThan(4);
        expect(Math.abs(last.carrier.tilt)).toBeLessThan(10);
        expect(readyPose.carrier.pose.head).toEqual(targetHead);
        expect(readyPose.ball).toEqual(targetBall);
        expect(Math.abs(readyPose.carrier.tilt)).toBe(0);
        // The head actually rises during the release; it does not teleport at PTB.
        expect(last.carrier.pose.head[1]).toBeLessThan(at(state.resolvedTick! + Math.floor(duration * .4)).carrier.pose.head[1]);
      }
    }
  });
});
