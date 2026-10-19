// tests/match/league/penalties.test.ts — penalties and six-again (BAK-207 §5.1
// 2e): the captain's call, six again resetting the count, the call shown and
// played out (a shot at goal for two, a tap, a kick for touch then a tap), and
// Rush paying for its line speed in offside penalties.
import { describe, it, expect, afterEach } from 'vitest';
import { PENALTY, choosePenalty, offsideChance, type PenaltySituation } from '../../../src/match/league/penalties';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { SideSpec } from '../../../src/match/balance/plan';

const base: PenaltySituation = { shotChance: 0.8, toLine: 30, matchLeftS: 600, halfLeftS: 300, siren: false, margin: 0 };

describe('the captain’s call (pure)', () => {
  it('takes the two when it is likely and the points matter now', () => {
    expect(choosePenalty({ ...base, matchLeftS: 200, margin: -2 })).toBe('goal'); // late, two behind
    expect(choosePenalty({ ...base, matchLeftS: 200, margin: 1 })).toBe('goal'); // late, a point up
    expect(choosePenalty({ ...base, halfLeftS: 10 })).toBe('goal'); // the half about to end
    expect(choosePenalty({ ...base, siren: true })).toBe('goal');
  });
  it('otherwise taps near the line and kicks for touch from further out', () => {
    expect(choosePenalty({ ...base, toLine: 15 })).toBe('tap');
    expect(choosePenalty({ ...base, toLine: 50 })).toBe('touch');
    expect(choosePenalty({ ...base, matchLeftS: 200, margin: 8, toLine: 15 })).toBe('tap'); // well ahead: go for the try
    expect(choosePenalty({ ...base, matchLeftS: 200, margin: -10, toLine: 50 })).toBe('touch'); // two points won't do
    expect(choosePenalty({ ...base, shotChance: 0.3, halfLeftS: 5, toLine: 15 })).toBe('tap'); // a shot he would miss
  });
  it('Rush is offside more often than Slide or Compressed', () => {
    expect(offsideChance('rush')).toBeGreaterThan(offsideChance('slide'));
    expect(offsideChance('slide')).toBeGreaterThan(offsideChance('compressed'));
  });
});

type Seen = { e: SimEvent; snap: Snapshot };
function play(seed: number, home: SideSpec = { rating: 60 }, away: SideSpec = { rating: 60 }, minutes = 5): Seen[] {
  const sim = new LiveSim(sideSheet('H', home), sideSheet('A', away), seed, { length: { halves: 2, halfMinutes: minutes } });
  const out: Seen[] = [];
  while (!sim.finished && sim.tick < 60_000) {
    sim.step();
    const es = sim.tickEvents;
    if (es.length) {
      const snap = sim.snapshot();
      for (const e of es) out.push({ e, snap });
    }
  }
  return out;
}

describe('penalties and six-again in the live sim', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('every penalty is followed by the call, shown, and the call is played out', () => {
    restore = applyTuning({ 'penalty.offside.slide': 0.2 });
    const calls = new Set<string>();
    for (const seed of [1, 2, 3]) {
      const seen = play(seed);
      seen.forEach(({ e, snap }, i) => {
        if (e.kind !== 'penalty' || snap.clock!.siren) return;
        expect(e.text).toMatch(/^Penalty to /);
        const call = seen[i + 1]!.e;
        expect(call.kind).toBe('penalty-choice');
        calls.add(call.detail!);
        // What comes next follows the call.
        const next = seen.slice(i + 2).find((x) => ['penalty-goal', 'tap', 'touch', 'half-time', 'full-time'].includes(x.e.kind))!;
        if (call.detail === 'goal') expect(next.e.kind).toBe('penalty-goal');
        if (call.detail === 'tap') expect(next.e.kind).toBe('tap');
        if (call.detail === 'touch') {
          expect(next.e.kind).toBe('touch');
          expect(next.e.detail).toBe('penalty');
        }
      });
    }
    expect(calls.has('tap')).toBe(true);
    expect(calls.has('touch')).toBe(true);
  }, 60_000);

  it('a shot at goal from a penalty is worth two when it goes over', () => {
    // Every penalty a shot: in range, with the half always "about to end".
    restore = applyTuning({ 'penalty.offside.slide': 0.2, 'penalty.shotHalfEndS': 9999, 'penalty.shotMin': 0 });
    let good = 0;
    for (const seed of [1, 2]) {
      for (const { e } of play(seed)) if (e.kind === 'penalty-goal' && e.detail === 'good') good++;
    }
    expect(good).toBeGreaterThan(0);
    expect(PENALTY.goalPoints).toBe(2);
  }, 60_000);

  it('six again puts the tackle count back to zero', () => {
    restore = applyTuning({ 'penalty.ruckSixAgain': 0.3 });
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 4, { length: { halves: 1, halfMinutes: 4 } });
    let sixes = 0;
    let checked = 0;
    let waiting = false;
    while (!sim.finished) {
      sim.step();
      if (sim.tickEvents.some((e) => e.kind === 'six-again')) {
        sixes++;
        waiting = true;
      } else if (waiting) {
        // The first moment play resumes after it: the count is from zero.
        const label = sim.snapshot().label;
        if (/· tackle \d\/5/.test(label)) {
          expect(label).toMatch(/· tackle 0\/5/);
          checked++;
          waiting = false;
        } else if (!/· (ruck|tackle) ·/.test(label)) waiting = false; // the half ended, or a kick / try / touch first
      }
    }
    expect(sixes).toBeGreaterThan(3);
    expect(checked).toBeGreaterThan(3);
  }, 30_000);

  it('Rush pays for its line speed: it concedes more offside penalties than Slide', () => {
    let rush = 0;
    let slide = 0;
    for (let seed = 1; seed <= 10; seed++) {
      for (const { e } of play(seed, { rating: 60, tactics: { defence: 'slide' } }, { rating: 60, tactics: { defence: 'rush' } })) {
        if (e.kind !== 'penalty' || e.detail !== 'offside') continue;
        if (e.side === 'away') rush++;
        else slide++;
      }
    }
    expect(rush).toBeGreaterThan(slide * 1.5);
  }, 60_000);
});
