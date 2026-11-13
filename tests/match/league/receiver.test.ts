// The weighted receiver (#649 step 1, BAK-208 §4.2): pick among the near-best
// pass options by weight, with one roll per pass decision while it is on.
import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { pickReceiver, pickReceiverWeighted, MAX_LAT_M, type Candidate } from '../../../src/match/league/tactics';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';

const passer = { x: 50, y: 30 };
// Scores (−|lat − 6| − 0.7·depth + prefer): 1 → −2.1, 5 → −2.6, 8 → −3.4, 9 → −10.1.
const cands: Candidate[] = [
  { idx: 1, pos: { x: 47, y: 36 }, busy: false },
  { idx: 5, pos: { x: 47, y: 24 }, busy: false, prefer: -0.5 },
  { idx: 8, pos: { x: 47, y: 37 }, busy: false, prefer: -0.3 },
  { idx: 9, pos: { x: 47, y: 41 }, busy: false, prefer: -3 },
  { idx: 2, pos: { x: 46, y: 24 }, busy: true, prefer: 5 },
];

describe('weighted receiver: the pick', () => {
  it('at margin 0 is the best option whatever the roll', () => {
    for (const roll of [0, 0.5, 0.999]) expect(pickReceiverWeighted(passer, 1, cands, MAX_LAT_M, 0, 0, 2, roll)).toBe(pickReceiver(passer, 1, cands));
    expect(pickReceiver(passer, 1, cands)).toBe(1);
  });
  it('picks among the options inside the margin, the best most often, never a busy man or one outside it', () => {
    const seen = new Map<number, number>();
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const r = pickReceiverWeighted(passer, 1, cands, MAX_LAT_M, 0, 2, 2, (i + 0.5) / N)!;
      seen.set(r, (seen.get(r) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual([1, 5, 8]);
    // Weights exp(−gap / 2): 1, 0.78, 0.53 → shares about 43%, 34%, 23%.
    expect(seen.get(1)!).toBeGreaterThan(seen.get(5)!);
    expect(seen.get(5)!).toBeGreaterThan(seen.get(8)!);
    expect(seen.get(1)! / N).toBeCloseTo(1 / (1 + Math.exp(-0.25) + Math.exp(-0.65)), 2);
    // A low roll is the best man; a high one goes down the list.
    expect(pickReceiverWeighted(passer, 1, cands, MAX_LAT_M, 0, 2, 2, 0)).toBe(1);
    expect(pickReceiverWeighted(passer, 1, cands, MAX_LAT_M, 0, 2, 2, 0.999)).toBe(8);
  });
  it('a sharper spread leans harder on the best; no option is no pass', () => {
    const best = (spread: number): number => {
      let n = 0;
      for (let i = 0; i < 200; i++) if (pickReceiverWeighted(passer, 1, cands, MAX_LAT_M, 0, 2, spread, (i + 0.5) / 200) === 1) n++;
      return n;
    };
    expect(best(0.5)).toBeGreaterThan(best(2));
    expect(pickReceiverWeighted(passer, 1, [{ idx: 3, pos: { x: 53, y: 36 }, busy: false }], MAX_LAT_M, 0, 2, 2, 0.5)).toBeNull();
  });
  it('keeps the Playmaker window: a wider reach and width bias let the wide man in', () => {
    const wide: Candidate[] = [{ idx: 1, pos: { x: 47, y: 36 }, busy: false }, { idx: 4, pos: { x: 47, y: 45 }, busy: false }];
    expect(pickReceiverWeighted(passer, 1, wide, MAX_LAT_M, 0, 2, 2, 0.999)).toBe(1); // 15 m: out of the normal window
    expect(pickReceiverWeighted(passer, 1, wide, MAX_LAT_M + 4, 0.6, 5, 2, 0.999)).toBe(4);
  });
});

describe('weighted receiver: in the sim', () => {
  const home = labSheet(DEFAULT_HOME, 'gen');
  const away = labSheet(DEFAULT_AWAY, 'gen');
  const play = (seed: number): { events: number; home: number; away: number; draws: number } => {
    const sim = new LiveSim(home, away, seed);
    // Count every roll after kick-off's coin toss.
    const rng = (sim as unknown as { rng: { next: () => number } }).rng;
    const next = rng.next.bind(rng);
    let draws = 0;
    rng.next = () => { draws++; return next(); };
    let events = 0;
    while (!sim.finished) {
      sim.step();
      events += sim.tickEvents.length;
    }
    return { events, home: sim.points.home, away: sim.points.away, draws };
  };

  it('is a knob by name, with its neighbours', () => {
    const names = listKnobs().map((k) => k.path);
    for (const k of ['live.receiverMargin', 'live.receiverSpread', 'live.receiverAtRuck']) expect(names).toContain(k);
  });
  it('off (margin 0) plays exactly as before it existed: same events, points and rolls (pinned from f02f4fa)', () => {
    // The attack shapes (#649 step 2) came after f02f4fa: off too, so this stays step 1's own proof.
    const restore = applyTuning({ 'live.receiverMargin': 0, 'shapes.on': 0 });
    try {
      expect(play(1)).toEqual({ events: 133, home: 6, away: 11, draws: 634 });
      expect(play(11)).toEqual({ events: 136, home: 0, away: 6, draws: 667 });
      // Its other knobs do nothing while it is off.
      const r2 = applyTuning({ 'live.receiverSpread': 9, 'live.receiverAtRuck': 0 });
      try {
        expect(play(1)).toEqual({ events: 133, home: 6, away: 11, draws: 634 });
      } finally {
        r2();
      }
    } finally {
      restore();
    }
  });
  it('on, it rolls once per pass decision: more rolls, a different match', () => {
    expect(LIVE.receiverMargin).toBeGreaterThan(0);
    const on = play(1);
    expect(on.draws).toBeGreaterThan(634);
    expect(on).not.toEqual({ events: 133, home: 6, away: 11, draws: 634 });
    // Only in open play: fewer rolls than with the ruck too.
    const restore = applyTuning({ 'live.receiverAtRuck': 0 });
    try {
      expect(play(1).draws).not.toBe(on.draws);
    } finally {
      restore();
    }
  });
});
