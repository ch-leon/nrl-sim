// tests/match/view/momentum.test.ts — the momentum line in the score bug (#366).
// The overlay folds the events it has seen by the engine's rules (MatchRecorder,
// match.ts): a try +30 and a big hit +15 toward the side that made it, an error
// 10 against it, 10% back toward even at every new set; clamped to ±100. The
// line shows the last five match-minutes.
import { describe, it, expect } from 'vitest';
import { foldMomentum, momentumLabel, momentumShapes, momentumWindow, MOMENTUM_STEP_MIN, MOMENTUM_WINDOW_MIN, type MomentumEvent } from '../../../src/match/view/momentum';
import { MOMENTUM_BIGHIT, MOMENTUM_ERROR, MOMENTUM_TRY } from '../../../src/sim/weather';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';

const ev = (at: number, kind: MomentumEvent['kind'], teamId: 'H' | 'A'): MomentumEvent => ({ at, kind, teamId });
const last = (s: { value: number }[]): number => s[s.length - 1]!.value;

describe('momentumWindow (#366)', () => {
  it('folds a scripted match by match.ts rules: try and big hit toward the actor, error against, decay per set', () => {
    const events = [
      ev(0.5, 'try', 'H'), // +30
      ev(1, 'set-start', 'A'), // ×0.9 → 27
      ev(1.5, 'big-hit', 'A'), // −15 → 12
      ev(2, 'error', 'A'), // +10 → 22 (against away)
      ev(2.2, 'set-start', 'H'), // ×0.9 → 19.8
      ev(2.4, 'tackle', 'A'), // no change
    ];
    let m = 0;
    for (const e of events) m = foldMomentum(m, e.kind, e.teamId === 'H');
    expect(m).toBeCloseTo((MOMENTUM_TRY * 0.9 - MOMENTUM_BIGHIT + MOMENTUM_ERROR) * 0.9, 6);
    expect(last(momentumWindow(events, 'H', 3))).toBeCloseTo(m, 6);
    // Each reading is the momentum after the events seen by then.
    const at = (t: number): number => last(momentumWindow(events, 'H', t));
    expect(at(0.4)).toBe(0);
    expect(at(0.5)).toBe(MOMENTUM_TRY);
    expect(at(1.6)).toBeCloseTo(MOMENTUM_TRY * 0.9 - MOMENTUM_BIGHIT, 6);
  });

  it('agrees with the engine’s momentum timeline on a real match, minute by minute', () => {
    const home = sideSheet('H', { rating: 62 });
    const away = sideSheet('A', { rating: 55 });
    for (const seed of [1, 2, 3]) {
      const res = runMatch(home, away, { seed, weather: 'clear' });
      // The recorder reads each minute as the clock turns it: the events stamped before it.
      const seen = res.events.map((e) => ({ at: e.t, kind: e.kind, teamId: e.teamId }));
      for (const r of res.momentumTimeline) {
        if (r.t === 0) continue;
        let m = 0;
        for (const e of seen) if (e.at < r.t) m = foldMomentum(m, e.kind, e.teamId === 'H');
        expect(Math.round(m), `seed ${seed} minute ${r.t}`).toBe(r.value);
      }
      let all = 0;
      for (const e of seen) all = foldMomentum(all, e.kind, e.teamId === 'H');
      expect(last(momentumWindow(seen, 'H', 99, 99))).toBeCloseTo(all, 6);
    }
  });

  it('trims to the last five minutes: a reading every 10 s, oldest first, ending now', () => {
    const s = momentumWindow([ev(1, 'try', 'A')], 'H', 9);
    expect(s).toHaveLength(Math.round(MOMENTUM_WINDOW_MIN / MOMENTUM_STEP_MIN) + 1);
    expect(s[0]!.t).toBeCloseTo(9 - MOMENTUM_WINDOW_MIN, 6);
    expect(s[s.length - 1]!.t).toBe(9);
    for (let k = 1; k < s.length; k++) expect(s[k]!.t).toBeGreaterThan(s[k - 1]!.t);
    // The try four minutes before the window still counts toward where it starts.
    expect(s[0]!.value).toBe(-MOMENTUM_TRY);
    // Before kick-off the line is even.
    expect(momentumWindow([], 'H', 1)[0]!.value).toBe(0);
  });

  it('clamps to ±100', () => {
    const tries = Array.from({ length: 8 }, (_, i) => ev(0.1 * (i + 1), 'try', 'H'));
    expect(last(momentumWindow(tries, 'H', 1))).toBe(100);
    const errors = Array.from({ length: 15 }, (_, i) => ev(0.1 * (i + 1), 'error', 'H'));
    expect(last(momentumWindow(errors, 'H', 2))).toBe(-100);
  });

  it('labels the side that has it and which way it is going', () => {
    const names = { home: 'Larrikins', away: 'Sharks' };
    expect(momentumLabel(momentumWindow([ev(4, 'try', 'H')], 'H', 5), names)).toBe('Momentum: Larrikins, building');
    // A try before the window, then three sets of it ebbing away.
    const ebb = [ev(0.5, 'try', 'H'), ev(2, 'set-start', 'A'), ev(3, 'set-start', 'H'), ev(4, 'set-start', 'A')];
    expect(momentumLabel(momentumWindow(ebb, 'H', 6), names)).toBe('Momentum: Larrikins, fading');
    expect(momentumLabel(momentumWindow([ev(4, 'try', 'A')], 'H', 5), names)).toBe('Momentum: Sharks, building');
    expect(momentumLabel(momentumWindow([], 'H', 5), names)).toBe('Momentum: even');
  });

  it('draws home above the middle and away below it', () => {
    const s = momentumWindow([ev(4, 'try', 'H')], 'H', 5);
    const { home, away } = momentumShapes(s, 100, 12);
    const ys = (pts: string): number[] => pts.split(' ').map((p) => Number(p.split(',')[1]));
    expect(Math.min(...ys(home))).toBeLessThan(6);
    expect(Math.max(...ys(home))).toBe(6);
    expect(ys(away).every((y) => y === 6)).toBe(true);
  });
});
