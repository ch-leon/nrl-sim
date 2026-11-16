import { describe, expect, it } from 'vitest';
import { contactLayout, BUMP_TICKS, type ContactPoint } from '../../../src/match/view/contactLayout';
import { contactPlayerKey } from '../../../src/match/view/contactAnimation';
import { contactCaseAt, caseDefinition, CASE_CARRIER, CASE_DEFENDERS } from '../../../src/labs/art/contactCases';
import { CONTACT_X, CONTACT_FOOT } from '../../../src/art/prototype/contact';
import { ruckPoseAt } from '../../../src/art/match/ruck';
import { CENTRE, PAINT_FOOT } from '../../../src/art/prototype/player';
import type { Point } from '../../../src/art/prototype/tackle';

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const points: ContactPoint[] = [CASE_CARRIER, ...CASE_DEFENDERS].map((player, i) => ({ player, x: 500 + i * 14, y: 300 + i * 2 }));
const sole = (layout: NonNullable<ReturnType<typeof contactLayout>>, p: Point): Point => [layout.x + (p[0] - CONTACT_X) * (layout.left ? -1 : 1), layout.y + p[1] - CONTACT_FOOT];

describe('contact world layout (#700)', () => {
  it('keeps settled wrap soles planted after layout while hips/shoulders absorb each real arrival', () => {
    for (const id of ['wrap', 'two', 'three'] as const) for (const left of [false, true]) {
      const planted = new Map<string, readonly Point[]>();
      let shouldersMoved = false, previousShoulder: Point | undefined;
      for (let tick = 15; tick < caseDefinition(id).end; tick++) {
        const state = contactCaseAt(id, tick / 20).state!;
        const layout = contactLayout(state, points, left)!;
        for (const actor of [layout.pose.carrier, ...layout.pose.defenders]) {
          const joined = state.joined.find(j => contactPlayerKey(j.player) === contactPlayerKey(actor.player));
          if (joined && state.tick - joined.tick < 3) continue;
          const key = contactPlayerKey(actor.player), soles = [sole(layout, actor.pose.foot), sole(layout, actor.pose.farFoot)];
          const first = planted.get(key);
          if (first) soles.forEach((p, i) => expect(distance(p, first[i]!)).toBeLessThan(.001));
          else planted.set(key, soles);
        }
        if (previousShoulder && distance(previousShoulder, layout.pose.carrier.pose.shoulder) > .1) shouldersMoved = true;
        previousShoulder = layout.pose.carrier.pose.shoulder;
      }
      expect(shouldersMoved).toBe(true);
    }
  });
  it('finishes carrier recovery and every defender handoff by the final shared tick, even in five/seven-tick rucks', () => {
    const ready = ruckPoseAt('ptb', 0);
    for (const id of ['wrap', 'low', 'two', 'three', 'dominant'] as const) for (const left of [false, true]) for (const duration of [5, 7, 14]) {
      const source = contactCaseAt(id, caseDefinition(id).end / 20 + .05).state!;
      const releaseTick = source.resolvedTick! + duration;
      const state = { ...source, tick: releaseTick - 1, phase: 'ground' as const, contact: { ...source.contact, releaseTick } };
      const layout = contactLayout(state, points, left)!;
      expect(layout.pose.carrier.pose.head).toEqual([ready.pose.head[0] + CONTACT_X - CENTRE, ready.pose.head[1] + CONTACT_FOOT - PAINT_FOOT]);
      expect(layout.pose.ball).toEqual([ready.ball[0] + CONTACT_X - CENTRE, ready.ball[1] + CONTACT_FOOT - PAINT_FOOT]);
      expect(Math.abs(layout.pose.carrier.tilt)).toBe(0);
      for (const defender of state.contact.defenders) {
        const last = layout.feet.find(p => contactPlayerKey(p.player) === contactPlayerKey(defender))!;
        const actual = points.find(p => contactPlayerKey(p.player) === contactPlayerKey(defender))!;
        expect(last.x).toBe(actual.x); expect(last.y).toBe(actual.y);
      }
      expect(contactLayout({ ...state, tick: releaseTick, phase: 'ptb' }, points, left)).toBeNull();
    }
  });
  it('stages releases within their recorded window without changing the participants or deadline', () => {
    const source = contactCaseAt('three', 1.7).state!;
    const releaseTick = source.resolvedTick! + 14;
    const state = { ...source, tick: releaseTick - 4, phase: 'ground' as const, contact: { ...source.contact, releaseTick } };
    const layout = contactLayout(state, points, false)!;
    expect(layout.pose.defenders.map(d => d.player)).toEqual(source.contact.defenders);
    const delta = layout.feet.slice(1).map((p, i) => distance([p.x, p.y], [points[i + 1]!.x, points[i + 1]!.y]));
    expect(new Set(delta).size).toBeGreaterThan(1);
    expect(state.contact.releaseTick).toBe(releaseTick);
  });
  it('cancels only the authored escape run-out because the sim supplies the actual travel', () => {
    for (const id of ['break', 'bump', 'steal'] as const) for (const left of [false, true]) {
      const source = contactCaseAt(id, caseDefinition(id).end / 20 + .05).state!;
      for (let age = 0; age < (id === 'steal' ? 4 : BUMP_TICKS); age++) {
        const layout = contactLayout({ ...source, tick: source.resolvedTick! + age }, points, left)!;
        expect(layout.pose.carrier.pose.hip[0]).toBe(CONTACT_X);
        expect(layout.feet[0]!.x).toBe(points[0]!.x);
        expect(layout.pose.owner).toMatchObject(source.holder!);
      }
    }
  });
});
