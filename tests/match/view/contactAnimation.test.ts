import { describe, expect, it } from 'vitest';
import { advanceContactAnimation, contactApproach, type ContactAnimation } from '../../../src/match/view/contactAnimation';
import { CASE_DEFENDERS, CONTACT_CASES, caseDuration, caseSnapshot, contactCaseAt } from '../../../src/labs/art/contactCases';
import type { PlayerSnap } from '../../../src/match/core/snapshot';

describe('contact animations follow the sim', () => {
  it('admits only actual joiners, in arrival order, with a stable stance', () => {
    let state: ContactAnimation | null = null;
    for (let tick = 0; tick <= 30; tick++) {
      const snap = caseSnapshot('three', tick);
      state = advanceContactAnimation(state, snap);
      if (tick < 12) expect(state).toBeNull();
      else {
        expect(state!.joined.map(j => j.player)).toEqual(CASE_DEFENDERS.slice(0, tick < 19 ? 1 : tick < 24 ? 2 : 3));
        expect(state!.joined[0]!.tick).toBe(snap.contact!.startedTick);
        expect(state!.variant).toBe('square');
      }
    }
    expect(state!.joined.map(j => j.tick - state!.contact.startedTick)).toEqual([0, 7, 12]);
  });
  it('selects the recorded outcome, including late breaks and one-on-one strips', () => {
    for (const [id, seconds, kind, men] of [['low', 1, 'low', 1], ['dominant', .8, 'dominant', 1], ['break', 1.7, 'break', 2], ['steal', .8, 'steal', 1]] as const) {
      const state = contactCaseAt(id, seconds).state!;
      expect(state.kind).toBe(kind); expect(state.joined).toHaveLength(men);
      expect(state.phase === 'escape').toBe(id === 'break' || id === 'steal');
      expect(state.holder?.side).toBe(id === 'steal' ? 'away' : 'home');
    }
  });
  it('does not invent a strip, participant, or animation from proximity in old recordings', () => {
    const strip = caseSnapshot('steal', 12);
    strip.ball.holder = { side: 'home', slot: 4 };
    expect(advanceContactAnimation(null, strip)).toBeNull();
    const old = caseSnapshot('three', 25); delete old.contact;
    expect(advanceContactAnimation(null, old)).toBeNull();
    const offload = caseSnapshot('two', 31); offload.events[0]!.kind = 'offload';
    expect(advanceContactAnimation(contactCaseAt('two', 1.5).state, offload)).toBeNull();
  });
  it('reconstructs the same scene after scrubbing; the approach changes the picture, never the outcome', () => {
    const a = contactCaseAt('three', 1.4); contactCaseAt('steal', 1);
    expect(contactCaseAt('three', 1.4)).toEqual(a);
    const b = contactCaseAt('three', 1.4, 1);
    expect(b.state!.variant).not.toBe(a.state!.variant);
    expect(b.state!.kind).toBe(a.state!.kind);
    expect(b.state!.contact.defenders).toEqual(a.state!.contact.defenders);
    expect(b.state!.holder).toEqual(a.state!.holder);
  });
  it('reads the approach from the first defender against the carrier\'s heading (#674)', () => {
    const man = (x: number, y: number, headX = 1, headY = 0) => ({ side: 'home', slot: 0, x, y, headX, headY, pose: 'run', speed: 0 }) as PlayerSnap;
    expect(contactApproach(man(50, 20), man(51, 20))).toBe('front');
    expect(contactApproach(man(50, 20), man(49, 20))).toBe('behind');
    expect(contactApproach(man(50, 20), man(50, 21))).toBe('side');
    // It is the carrier's heading that counts, not the field: running the other way turns it round.
    expect(contactApproach(man(50, 20, -1), man(49, 20))).toBe('front');
    expect(contactApproach(man(50, 20, 0, 1), man(50, 21))).toBe('front');
    expect(contactApproach(man(50, 20), undefined)).toBe('front');
  });
  it('picks the picture from the outcome and the approach (#674)', () => {
    const at = (id: Parameters<typeof contactCaseAt>[0], variation: number) => contactCaseAt(id, caseDuration(id) - .5, variation).state!.variant;
    expect([0, 1, 2].map(v => at('two', v))).toEqual(['square', 'ankle', 'drag']);
    expect([0, 1, 2].map(v => at('low', v))).toEqual(['square', 'ankle', 'drag']);
    expect([0, 1, 2].map(v => at('dominant', v))).toEqual(['stop', 'square', 'square']);
    expect([0, 1, 2].map(v => at('bump', v))).toEqual(['bump', 'bump', 'bump']);
    expect([0, 1, 2].map(v => at('break', v))).toEqual(['bump', 'bump', 'bump']);
    expect([0, 1, 2].map(v => at('steal', v))).toEqual(['strip', 'strip', 'strip']);
  });
  it('draws the same variant on a seek as playing through, at every tick of every case', () => {
    for (const { id } of CONTACT_CASES) for (const variation of [0, 1, 2]) {
      let folded: ContactAnimation | null = null;
      for (let tick = 0; tick <= caseDuration(id) * 20; tick++) {
        const snap = caseSnapshot(id, tick, variation);
        folded = advanceContactAnimation(folded, snap);
        const fresh = advanceContactAnimation(null, snap);
        if (fresh) expect(fresh.variant).toBe(folded!.variant);
      }
    }
  });
});
