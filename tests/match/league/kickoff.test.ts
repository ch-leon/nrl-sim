// The kick-off (#397): the deeper default, and the kicking side's Short and Long calls.
import { describe, it, expect, afterEach } from 'vitest';
import { FIELD_LENGTH, IN_GOAL } from '../../../src/match/core/field';
import type { Side, SimEvent } from '../../../src/match/core/snapshot';
import { CALL_LABEL, callIsKickoff, callResultText, chipState, type CallVerdict } from '../../../src/match/league/calls';
import { KICKOFF, kickoffLanding, kickoffLineM, pinnedDeep, regatherChance } from '../../../src/match/league/kickoff';
import { LiveSim } from '../../../src/match/league/live';
import { kickoffTarget } from '../../../src/match/league/tactics';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SideSpec } from '../../../src/match/balance/plan';

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const deep0 = KICKOFF.deepDefault;
afterEach(() => {
  KICKOFF.deepDefault = deep0;
});

/** The ball in the air off the boot (the sim keeps it private; the test reads where it will land). */
const flightTo = (sim: LiveSim): { x: number; y: number } | null => {
  const b = (sim as unknown as { ball: { kind: string; to?: { x: number; y: number } } }).ball;
  return b.kind === 'flight' && b.to ? b.to : null;
};

/**
 * The first kick-off of a match, with the kicking side's call (or none): where it
 * was aimed, the kicking side, the events until the receivers' first tackle or a
 * settled call, and the call's verdict.
 */
function firstKickoff(seed: number, call: 'kickoff-short' | 'kickoff-long' | null, home: SideSpec = { rating: 60 }, away: SideSpec = { rating: 60 }) {
  const probe = new LiveSim(sideSheet('H', home), sideSheet('A', away), seed);
  const kicking = other(probe.inPossession);
  const sim = new LiveSim(sideSheet('H', home), sideSheet('A', away), seed, call ? { calls: [{ tick: 1, side: kicking, call }] } : {});
  const events: SimEvent[] = [];
  let to: { x: number; y: number } | null = null;
  let verdict: CallVerdict | undefined;
  while (sim.tick < 2000) {
    sim.step();
    events.push(...sim.tickEvents);
    if (!to && sim.tickEvents.some((e) => e.kind === 'kickoff')) to = flightTo(sim);
    verdict = sim.verdicts[0];
    if (to && (call ? verdict : sim.tickEvents.some((e) => e.kind === 'set-start' || e.kind === 'regather'))) break;
  }
  return { sim, kicking, to: to!, events, verdict };
}

describe('the kick-off depth (#397)', () => {
  it('with the deeper default off, the kick-off is today’s: the receivers’ 24 m line, 16 m high, one draw across', () => {
    for (const j of [0, 0.3, 0.5, 0.99]) {
      for (const rd of [1, -1] as const) {
        for (const skill of [20, 60, 99]) {
          const land = kickoffLanding(null, rd, j, skill, false, false);
          expect(land.to).toEqual(kickoffTarget(rd, j));
          expect(land.peak).toBe(16);
        }
      }
    }
    expect(kickoffTarget(1, 0.5)).toEqual({ x: 24, y: 34 });
    expect(kickoffTarget(-1, 0.5).x).toBe(FIELD_LENGTH - 24);
  });

  it('the deeper default lands on the receivers’ 15–8 m line by the kicker’s Skill: 35–42 m from halfway', () => {
    expect(kickoffLineM(null, 30, true)).toBe(15);
    expect(kickoffLineM(null, 10, true)).toBe(15);
    expect(kickoffLineM(null, 90, true)).toBe(8);
    expect(kickoffLineM(null, 99, true)).toBe(8);
    expect(kickoffLineM(null, 60, true)).toBeCloseTo(11.5);
    for (let skill = 0; skill <= 100; skill += 5) {
      const from = FIELD_LENGTH / 2 - kickoffLineM(null, skill, true);
      expect(from).toBeGreaterThanOrEqual(35);
      expect(from).toBeLessThanOrEqual(42);
      expect(kickoffLineM(null, skill + 5, true)).toBeLessThanOrEqual(kickoffLineM(null, skill, true));
    }
    expect(kickoffLanding(null, 1, 0.5, 60, false, true).peak).toBeGreaterThan(16);
  });

  it('Short goes about 12 m past halfway; Long for the 5 m line and in; dead on the full lands past the dead-ball line', () => {
    expect(FIELD_LENGTH / 2 - kickoffLineM('kickoff-short', 60)).toBe(12);
    expect(kickoffLineM('kickoff-long', 30)).toBe(5);
    expect(kickoffLineM('kickoff-long', 90)).toBe(0);
    const dead = kickoffLanding('kickoff-long', 1, 0.5, 60, true);
    expect(dead.to.x).toBeLessThan(-IN_GOAL);
    expect(kickoffLanding('kickoff-long', -1, 0.5, 60, true).to.x).toBeGreaterThan(FIELD_LENGTH + IN_GOAL);
    expect(pinnedDeep(4)).toBe(true);
    expect(pinnedDeep(15)).toBe(false);
  });

  it('with the deeper default on, a match’s kick-offs go 35–42 m on average (today about 26 m)', () => {
    const avg = (deep: number): number => {
      KICKOFF.deepDefault = deep;
      let sum = 0;
      for (let seed = 1; seed <= 30; seed++) sum += Math.abs(firstKickoff(seed, null).to.x - FIELD_LENGTH / 2);
      return sum / 30;
    };
    expect(avg(0)).toBeCloseTo(26, 5);
    const deep = avg(1);
    expect(deep).toBeGreaterThanOrEqual(35);
    expect(deep).toBeLessThanOrEqual(42);
  }, 60_000);
});

describe('the Short kick-off (#397)', () => {
  it('is regathered 25% of the time with even sides, more with a quicker chaser, less against a surer catcher, kept to 15–40%', () => {
    expect(regatherChance(60, 60)).toBe(0.25);
    expect(regatherChance(80, 60)).toBeGreaterThan(0.25);
    expect(regatherChance(60, 80)).toBeLessThan(0.25);
    expect(regatherChance(100, 0)).toBe(0.4);
    expect(regatherChance(0, 100)).toBe(0.15);
  });

  it('about 25% regathered over 1,000 seeded kick-offs with even sides; a regather is the kicking side’s ball near halfway', () => {
    let won = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const k = firstKickoff(seed, 'kickoff-short');
      expect(k.verdict?.call).toBe('kickoff-short');
      if (k.verdict!.paid) {
        won++;
        expect(k.verdict!.how).toBe('regather');
        const r = k.events.find((e) => e.kind === 'regather')!;
        expect(r.side).toBe(k.kicking);
        expect(k.sim.inPossession).toBe(k.kicking);
        expect(Math.abs(k.to.x - FIELD_LENGTH / 2)).toBeLessThanOrEqual(13);
      } else {
        expect(k.events.some((e) => e.kind === 'regather')).toBe(false);
      }
    }
    expect(won / 1000).toBeGreaterThan(0.21);
    expect(won / 1000).toBeLessThan(0.29);
  }, 120_000);

  it('moves with the chasers’ Speed and the catchers’ Skill', () => {
    const rate = (fast: boolean): number => {
      let won = 0;
      for (let seed = 1; seed <= 200; seed++) {
        // Both sides quick and sure-handed or slow and fumbling: whichever kicks off, its chase meets the other's hands.
        const spec: SideSpec = { rating: 60, stats: fast ? { speed: 90, skill: 30 } : { speed: 30, skill: 90 } };
        if (firstKickoff(seed, 'kickoff-short', spec, spec).verdict!.paid) won++;
      }
      return won / 200;
    };
    expect(rate(true)).toBeGreaterThan(0.33);
    expect(rate(false)).toBeLessThan(0.2);
  }, 60_000);
});

describe('the Long kick-off (#397)', () => {
  it('about 10% dead on the full, a penalty to the receivers at halfway; otherwise taken deep', () => {
    let dead = 0;
    let pinned = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const k = firstKickoff(seed, 'kickoff-long');
      const v = k.verdict!;
      expect(v.call).toBe('kickoff-long');
      if (v.how === 'dead-on-full') {
        dead++;
        expect(v.paid).toBe(false);
        const pen = k.events.find((e) => e.kind === 'penalty')!;
        // Against the kicker (the event names the offender); the receivers have the ball.
        expect(pen.side).toBe(k.kicking);
        expect(pen.detail).toBe('kickoff');
        expect(pen.text).toContain('dead on the full');
        expect(k.sim.inPossession).toBe(other(k.kicking));
        // No sin bin for it.
        expect(k.events.some((e) => e.kind === 'sin-bin')).toBe(false);
      } else {
        const fromLine = k.kicking === 'home' ? FIELD_LENGTH - k.to.x : k.to.x;
        expect(fromLine).toBeLessThanOrEqual(5.01);
        expect(fromLine).toBeGreaterThanOrEqual(-0.01);
        if (v.paid) pinned++;
      }
    }
    expect(dead / 1000).toBeGreaterThan(0.07);
    expect(dead / 1000).toBeLessThan(0.13);
    expect(pinned / (1000 - dead)).toBeGreaterThan(0.8);
  }, 120_000);
});

describe('kick-off calls in the match (#397)', () => {
  it('only the kicking side, only in the break before its kick-off, once', () => {
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 3);
    const kicking = other(sim.inPossession);
    expect(sim.callRefusal(sim.inPossession, 'kickoff-short')).toBe('their kick-off');
    expect(sim.callRefusal(kicking, 'kickoff-short')).toBeNull();
    expect(sim.call(kicking, 'kickoff-long')).toBeNull();
    expect(sim.callRefusal(kicking, 'kickoff-short')).toBe('called');
    // It is neither of the set's calls: Rush is still on.
    expect(sim.callRefusal(kicking, 'rush')).toBeNull();
    while (!sim.tickEvents.some((e) => e.kind === 'kickoff')) sim.step();
    expect(sim.callRefusal(kicking, 'kickoff-short')).toBe('at the kick-off');
  });

  it('may be made after a try, by the side that conceded, and the next kick-off takes it', () => {
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 2);
    while (!sim.finished && !sim.tickEvents.some((e) => e.kind === 'try')) sim.step();
    const scorer = sim.tickEvents.find((e) => e.kind === 'try')!.side!;
    expect(sim.phaseKind).toBe('try');
    expect(sim.callRefusal(scorer, 'kickoff-long')).toBe('their kick-off');
    expect(sim.call(other(scorer), 'kickoff-long')).toBeNull();
    // Still the set's calls aside: the plan's break, not open play.
    expect(sim.callRefusal(other(scorer), 'hit-up')).toBe('not now');
    while (!sim.tickEvents.some((e) => e.kind === 'kickoff')) sim.step();
    expect(sim.tickEvents.find((e) => e.kind === 'kickoff')!.side).toBe(other(scorer));
    while (sim.verdicts.length === 0) sim.step();
    expect(sim.verdicts[0]!.call).toBe('kickoff-long');
    expect(sim.verdicts[0]!.how).not.toBe('lapsed');
  });

  it('are deterministic per seed, and a refused one changes nothing', () => {
    const play = (calls: { tick: number; side: Side; call: 'kickoff-short' | 'kickoff-long' }[]): string => {
      const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 5, { calls });
      const parts: string[] = [];
      while (!sim.finished && sim.tick < 100_000) {
        sim.step();
        for (const e of sim.tickEvents) parts.push(`${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`);
      }
      return parts.join('|');
    };
    const kicking = other(new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 5).inPossession);
    const shortCall = [{ tick: 1, side: kicking, call: 'kickoff-short' as const }];
    expect(play(shortCall)).toBe(play(shortCall));
    const longCall = [{ tick: 1, side: kicking, call: 'kickoff-long' as const }];
    expect(play(longCall)).toBe(play(longCall));
    // The receivers can't call it: the match is the no-calls match to the letter (no dice drawn).
    expect(play([{ tick: 1, side: other(kicking), call: 'kickoff-short' }])).toBe(play([]));
  }, 60_000);

  it('show on the lab chips only while on, and word their result to fit the tag', () => {
    expect(callIsKickoff('kickoff-short')).toBe(true);
    expect(callIsKickoff('bomb')).toBe(false);
    expect(chipState('kickoff-short', null, false, null)).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('kickoff-long', 'their kick-off', true, null).show).toBe(false);
    const v = (call: 'kickoff-short' | 'kickoff-long', paid: boolean, how: string): CallVerdict => ({ side: 'home', call, paid, how, metres: 12 });
    expect(callResultText(v('kickoff-short', true, 'regather'))).toBe('Short kick: regathered!');
    expect(callResultText(v('kickoff-short', false, 'kick'))).toBe('Short kick: they took it');
    expect(callResultText(v('kickoff-long', false, 'dead-on-full'))).toBe('Long kick: dead on the full');
    expect(callResultText(v('kickoff-long', true, 'kick'))).toBe('Long kick: pinned them deep');
    expect(callResultText(v('kickoff-long', false, 'lapsed'))).toBe('Long kick: no kick-off');
    expect(CALL_LABEL['kickoff-short']).toBe('Short kick');
  });
});
