import { describe, expect, it } from 'vitest';
import { CONTACT_CASES, caseDuration, contactCaseAt } from '../../../src/labs/art/contactCases';
import { bentContactArm, contactLeg, contactPoseAt, drawContact, standContact } from '../../../src/art/prototype/contact';
import { appearanceFor, HEAD_OPTIONS } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { opaqueBounds } from '../../../src/art/match/players';

const kit = buildKit(0xe6b632, 0x21394a, 'v'); const away = buildKit(0x669ba4, 0xf3eee2, 'hoops');
describe('contact situation artwork', () => {
  it('brings the boot with the hips instead of stretching a planted leg', () => {
    const first = contactLeg([0, 0], [3, 4], [3, 9]);
    const moved = contactLeg([12, 0], [3, 4], [3, 9]);
    expect(moved.foot[0]).toBeGreaterThan(first.foot[0]);
    expect(first.foot[1]).toBe(9); expect(moved.foot[1]).toBe(9);
    const folded = contactLeg([0, 0], [16, 3], [30, 5]);
    expect(folded.foot[1]).toBe(5);
    expect(folded.knee[1]).toBeLessThanOrEqual(folded.foot[1]);
  });
  it('bounds both leg segments through every join, fall, escape and release', () => {
    const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
    for (const { id } of CONTACT_CASES) for (const variant of [0, 1]) for (let t = .6; t < caseDuration(id); t += .025) {
      const state = contactCaseAt(id, t, variant).state!;
      // Include compressed live rucks as well as the slower review choreography.
      for (const releaseTicks of [undefined, 7, 14]) {
        const timed = releaseTicks === undefined || state.resolvedTick === null ? state : {
          ...state, contact: { ...state.contact, releaseTick: state.resolvedTick + releaseTicks },
        };
        const pose = contactPoseAt(timed);
        for (const { pose: p } of [pose.carrier, ...pose.defenders]) {
          for (const [offset, knee, foot] of [[2, p.knee, p.foot], [-2, p.farKnee, p.farFoot]] as const) {
            const hip = [p.hip[0] + offset, p.hip[1]];
            expect(distance(hip, knee)).toBeLessThanOrEqual(5.001);
            expect(distance(knee, foot)).toBeLessThanOrEqual(5.001);
            expect(distance(hip, foot)).toBeLessThanOrEqual(9.501);
            expect(knee[1]).toBeLessThanOrEqual(foot[1] + .001);
          }
        }
      }
    }
  });
  it('keeps arms short through approach, full contact, falls and release', () => {
    const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
    // A far-away target must never make an arm grow to reach it.
    expect(distance([0, 0], bentContactArm([0, 0], [100, 20]).hand)).toBeLessThanOrEqual(9.001);
    for (const { id } of CONTACT_CASES) for (const variant of [0, 1]) for (let t = .6; t < caseDuration(id); t += .05) {
      const pose = contactPoseAt(contactCaseAt(id, t, variant).state!);
      for (const d of pose.defenders) for (const arm of d.arms) {
        expect(distance(arm.shoulder, arm.elbow)).toBeLessThanOrEqual(5.001);
        expect(distance(arm.elbow, arm.hand)).toBeLessThanOrEqual(5.001);
        expect(distance(arm.shoulder, arm.hand)).toBeLessThanOrEqual(9.001);
      }
      for (const d of pose.defenders.filter(d => d.grip >= .999)) {
        expect(Math.min(distance(d.pose.shoulder, pose.carrier.pose.hip), distance(d.pose.shoulder, pose.carrier.pose.shoulder))).toBeLessThanOrEqual(6.5);
      }
    }
  });
  it('keeps one owner, the exact participant count, and no play-the-ball after breaks or steals', () => {
    for (const { id } of CONTACT_CASES) for (let t = .6; t < caseDuration(id); t += .05) {
      const state = contactCaseAt(id, t).state!;
      expect(state).not.toBeNull();
      const pose = contactPoseAt(state);
      expect(pose.defenders.map(p => p.player)).toEqual(state.contact.defenders);
      expect(pose.owner).toMatchObject(state.holder!);
      if (id === 'break' || id === 'steal') expect(pose.ptb).toBe(false);
    }
  });
  it('fits the different falls, joins, releases and escapes for all builds and head silhouettes', () => {
    for (const { id, end } of CONTACT_CASES) for (const build of ['lean', 'athletic', 'stocky'] as const) {
      for (const facing of ['front', 'back'] as const) for (const variation of [0, 1]) {
        for (const t of [.7, end / 20 + .2, end / 20 + .85, caseDuration(id) - .05]) {
          const state = contactCaseAt(id, t, variation).state!;
          const pixels = drawContact(state, p => ({ ...appearanceFor(p.who), build }), p => p.side === 'home' ? kit : away, facing);
          const bounds = opaqueBounds(pixels)!;
          expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
          expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBeLessThan(pixels.h - 1);
        }
      }
    }
    for (const head of HEAD_OPTIONS) {
      const state = contactCaseAt('three', 1.95).state!;
      const pixels = drawContact(state, p => ({ ...appearanceFor(p.who), head }), () => kit);
      expect(opaqueBounds(pixels)!.y1).toBeLessThan(pixels.h - 1);
    }
  });
  it('draws each man at his own height on his feet, with hands and ball riding the carrier (#643)', () => {
    for (const { id } of CONTACT_CASES) for (let t = 0; t <= caseDuration(id); t += .1) {
      const state = contactCaseAt(id, t).state; if (!state) continue;
      const pose = contactPoseAt(state);
      for (const rise of [-2, 2]) {
        const tall = standContact(pose, () => ({ ...appearanceFor('x'), stature: rise }));
        for (const [a, b] of [[pose.carrier, tall.carrier], ...pose.defenders.map((d, i) => [d, tall.defenders[i]!] as const)] as const) {
          expect(b.pose.foot).toEqual(a.pose.foot); expect(b.pose.farFoot).toEqual(a.pose.farFoot);
          const dy = b.pose.head[1] - a.pose.head[1];
          expect(Math.abs(dy)).toBeLessThanOrEqual(2);
          // Upright men take the whole height; nobody grows while lying down.
          if (a.pose.foot[1] - a.pose.shoulder[1] >= 16 && !a.running && !(a.role === 'carrier' && pose.ptb)) expect(dy).toBeCloseTo(-rise);
          if (a.pose.foot[1] - a.pose.shoulder[1] <= 6) expect(dy).toBeCloseTo(0);
        }
        const carrierDy = tall.carrier.pose.shoulder[1] - pose.carrier.pose.shoulder[1];
        if (pose.owner === state.contact.carrier) expect(tall.ball[1] - pose.ball[1]).toBeCloseTo(carrierDy);
        expect(standContact(pose, () => ({ ...appearanceFor('x'), stature: 0 }))).toEqual(pose);
      }
    }
  });
});
