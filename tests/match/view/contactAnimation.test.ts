import { describe, expect, it } from 'vitest';
import { advanceContactAnimation, type ContactAnimation } from '../../../src/match/view/contactAnimation';
import { CASE_DEFENDERS, caseSnapshot, contactCaseAt } from '../../../src/labs/art/contactCases';

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
        expect(state!.variant).toBe(0);
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
  it('reconstructs the same scene after scrubbing and varies stance without changing the outcome', () => {
    const a = contactCaseAt('three', 1.4); contactCaseAt('steal', 1);
    expect(contactCaseAt('three', 1.4)).toEqual(a);
    const b = contactCaseAt('three', 1.4, 1);
    expect(b.state!.variant).not.toBe(a.state!.variant);
    expect(b.state!.kind).toBe(a.state!.kind);
    expect(b.state!.contact.defenders).toEqual(a.state!.contact.defenders);
    expect(b.state!.holder).toEqual(a.state!.holder);
  });
});
