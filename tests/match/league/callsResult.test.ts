// tests/match/league/callsResult.test.ts — what each call did (#366). The judge
// reports the ground a call made (rounded, from where it was made, toward the
// side attacking then) and what decided it, paid or not; the tag by the chips
// words it from the copy table in calls.ts. The judging itself is unchanged.
import { describe, it, expect } from 'vitest';
import { CALL_RESULT, CALLS, COACH_CALLS, CallJudge, callResultText, type CallVerdict } from '../../../src/match/league/calls';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { CallInput } from '../../../src/match/league/calls';

const ev = (kind: string, side: 'home' | 'away', detail?: string): SimEvent => ({ tick: 1, kind, text: '', side, ...(detail ? { detail } : {}) });
const v = (over: Partial<CallVerdict> & Pick<CallVerdict, 'call'>): CallVerdict => ({ side: 'home', paid: false, metres: 0, how: 'gain', ...over });

describe('the judge reports metres (#366)', () => {
  it('for a paid and an unpaid shift call, toward the side attacking', () => {
    const j = new CallJudge();
    j.make('home', 'shift-left', 'home', 1, 40);
    const [paid] = j.observe([], 40 + 17.6, true, false);
    expect(paid).toEqual({ side: 'home', call: 'shift-left', paid: true, metres: 18, how: 'gain' });
    expect(CALLS.paid.shiftM).toBeLessThan(18);

    j.make('home', 'shift-right', 'home', 1, 50);
    const [unpaid] = j.observe([], 53.2, true, false);
    expect(unpaid).toEqual({ side: 'home', call: 'shift-right', paid: false, metres: 3, how: 'gain' });

    // Attacking the other end: metres still count forward.
    j.make('away', 'shift-left', 'away', -1, 70);
    expect(j.observe([], 60, true, false)[0]!.metres).toBe(10);
    // Driven back: no gain, not negative.
    j.make('away', 'shift-left', 'away', -1, 70);
    expect(j.observe([], 74, true, false)[0]!.metres).toBe(0);
  });

  it('a hit-up its carry, a kick call its kick, and what decided the rest', () => {
    const j = new CallJudge();
    j.make('home', 'hit-up', 'home', 1, 40);
    expect(j.observe([], 46, true, false)[0]).toMatchObject({ paid: true, metres: 6, how: 'gain' });
    j.make('home', 'kick-early', 'home', 1, 40);
    j.observe([ev('kick', 'home')], 40, false, false);
    expect(j.kicked('home', 34.4)[0]).toMatchObject({ paid: true, metres: 34, how: 'kick' });
    j.make('home', 'bomb', 'home', 1, 70);
    j.observe([ev('kick', 'home')], 70, false, false);
    expect(j.observe([ev('regather', 'home')], 90, false, false)[0]).toMatchObject({ paid: true, how: 'regather' });
    j.make('away', 'rush', 'home', 1, 30);
    expect(j.observe([ev('error', 'home')], 32, false, false)[0]).toMatchObject({ side: 'away', paid: true, how: 'error' });
    j.make('away', 'hold', 'home', 1, 30);
    j.observe([], 36, true, false);
    expect(j.observe([], 36, false, true)[0]).toMatchObject({ paid: true, metres: 6, how: 'set-end' });
  });

  it('the live sim keeps every verdict, paid and not, without touching the match', () => {
    const H = sideSheet('H', { rating: 60 });
    const A = sideSheet('A', { rating: 60 });
    const calls: CallInput[] = [];
    const sim = new LiveSim(H, A, 7, { length: { halves: 1, halfMinutes: 4 }, calls });
    while (!sim.finished) {
      for (const c of ['shift-left', 'rush'] as const) if (sim.callRefusal('home', c) === null) calls.push({ tick: sim.tick + 1, side: 'home', call: c });
      sim.step();
    }
    expect(sim.verdicts.length).toBeGreaterThan(3);
    expect(sim.verdicts.filter((x) => x.paid).length).toBe(sim.callsPaid.home + sim.callsPaid.away);
    expect(sim.verdicts.some((x) => !x.paid)).toBe(true);
    for (const x of sim.verdicts) expect(Number.isInteger(x.metres) && x.metres >= 0).toBe(true);
    // The same match from the record: the channel is not an event.
    const replay = runMatch(H, A, { seed: 7, length: { halves: 1, halfMinutes: 4 }, calls: structuredClone(calls) });
    expect(replay.events.some((e) => (e.kind as string) === 'call-result')).toBe(false);
  });
});

describe('the result tag’s copy (#366)', () => {
  it('covers every call', () => {
    for (const c of COACH_CALLS) {
      expect(typeof CALL_RESULT[c], c).toBe('function');
      for (const how of ['gain', 'kick', 'set-end', 'try', 'line-break', 'error', 'intercept', 'regather', 'drop-out', 'penalty', 'field-goal']) {
        for (const paid of [true, false]) {
          const text = callResultText(v({ call: c, paid, how, metres: 7 }));
          expect(text.length, `${c} ${how}`).toBeGreaterThan(0);
          expect(text.length, `${c} ${how}: ${text}`).toBeLessThanOrEqual(28);
        }
      }
    }
    expect(Object.keys(CALL_RESULT).sort()).toEqual([...COACH_CALLS].sort());
  });

  it('reads as the spec’s examples', () => {
    expect(callResultText(v({ call: 'shift-left', paid: true, metres: 18 }))).toBe('Shift left +18m');
    expect(callResultText(v({ call: 'hit-up', paid: true, metres: 6 }))).toBe('Hit-up +6m');
    expect(callResultText(v({ call: 'bomb', paid: true, how: 'regather' }))).toBe('Bomb: regathered');
    expect(callResultText(v({ call: 'rush', paid: true, how: 'error' }))).toBe('Rush: forced an error');
    expect(callResultText(v({ call: 'kick-early', how: 'set-end' }))).toBe('Kick early: no gain');
    expect(callResultText(v({ call: 'shift-right', metres: 0 }))).toBe('Shift right: no gain');
    expect(callResultText(v({ call: 'shift-left', paid: true, how: 'line-break' }))).toBe('Shift left: line break!');
    expect(callResultText(v({ call: 'hold', paid: true, how: 'set-end', metres: 6 }))).toBe('Hold: held them to +6m');
    expect(callResultText(v({ call: 'field-goal', paid: true, how: 'field-goal' }))).toBe('Field goal: over!');
  });
});
