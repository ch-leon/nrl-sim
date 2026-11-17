// #642: the referee, the benches and the sin bin are placed by pure functions of the
// snapshot. Played over whole matches on the live sim: the referee glides (never jumps),
// keeps off the carrier and is never drawn over him; the bench follows interchanges; a
// binned man walks off and then sits in his side's bin.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { toFieldPt } from '../../../src/match/core/field';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { BENCH, REF, benchSeat, benchSeated, binSeat, binnedSpot, refCoversCarrier, refereeSignal, refereeSpot } from '../../../src/match/view/officials';
import { refereeKit, REFEREE_STRIPS } from '../../../src/art/match/bench';
import { kitContrast, resolveKits } from '../../../src/art/match/kitClash';
import { kitFromColors } from '../../../src/art/match/kit';

const world = (p: { x: number; y: number }) => {
  const f = toFieldPt(p);
  return fieldToWorldPoint(f.fx, f.fy, fieldOffsetX());
};

/** Historical seven-minute halves provide the penalty/try presentation witnesses. */
function playMatch(seed: number, halfMinutes = 7, maxTick = 30_000): Snapshot[] {
  const home = sideSheet('H', { rating: 62 });
  const away = sideSheet('A', { rating: 58 });
  const sim = new LiveSim(home, away, seed, { length: { halves: 2, halfMinutes } });
  const snaps: Snapshot[] = [sim.snapshot()];
  while (!sim.finished && sim.tick < maxTick) {
    sim.step();
    snaps.push(sim.snapshot());
  }
  return snaps;
}

describe('the referee (#642)', () => {
  const matches = [3, 11].map((seed) => playMatch(seed));

  it('is a pure function of the snapshot', () => {
    const s = matches[0]![500]!;
    expect(refereeSpot(s)).toEqual(refereeSpot(structuredClone(s)));
  });

  it('glides with play: no more than a sprinter’s step a tick over seeds 1 to 84, except when the sides are put on their marks', () => {
    // The ball snaps onto a new holder in a tick (the heel into the dummy half's hands); he must not dart after it (#680, #682).
    // The first 1,800 ticks (90 s) of 84 seeds keep it quick (a dozen or so heels each); the full
    // seven-minute halves of the same seeds were checked once by hand (below).
    let worst = 0;
    for (let seed = 1; seed <= 84; seed++) {
      const snaps = playMatch(seed, 1, 1_800);
      let p0 = refereeSpot(snaps[0]!);
      for (let i = 1; i < snaps.length; i++) {
        const a = snaps[i - 1]!;
        const b = snaps[i]!;
        const p1 = refereeSpot(b);
        const step = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        p0 = p1;
        if (step <= worst) continue;
        // The ball put on a mark (a penalty, a restart) snaps on screen as well…
        if (Math.hypot(b.ball.x - a.ball.x, b.ball.y - a.ball.y) > 6) continue;
        // …and a restart puts most bodies somewhere new in one tick (LiveView cuts the camera too).
        const placed = b.players.filter((p) => {
          const q = a.players.find((r) => r.side === p.side && r.slot === p.slot)!;
          return Math.hypot(p.x - q.x, p.y - q.y) > 4;
        }).length;
        if (placed < 6) worst = step;
      }
    }
    // 12 m/s is 0.6 m a tick. Was 2.7 m before #680 and 1.71 m (seed 46, the heel) before #682, which
    // slides the ball he reads, and the push off it, across the heel. Over seeds 1 to 84 of seven-minute halves the worst is
    // now 1.37 m (seed 62, a penalty restart).
    expect(worst).toBeLessThan(1.6);
  }, 120_000);

  it('keeps off the carrier; when he would be drawn over him, he is drawn behind', () => {
    let near = 0;
    let covers = 0;
    let held = 0;
    for (const snaps of matches) {
      for (const s of snaps) {
        const h = s.ball.holder && s.players.find((p) => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot);
        if (!h) continue;
        held++;
        const r = refereeSpot(s);
        if (Math.hypot(r.x - h.x, r.y - h.y) < REF.clearM - 1e-6) near++;
        // In front of him (lower on screen) and over his body's box: the scene sorts him behind.
        const rw = world(r);
        const cw = world(h);
        const over = rw.y >= cw.y && rw.y - 36 < cw.y && Math.abs(rw.x - cw.x) < 28;
        expect(refCoversCarrier(s, r, fieldOffsetX())).toBe(over);
        if (over) covers++;
      }
    }
    // Inside the clear zone only while the ball runs right through his spot; standing far side of play, rarely over the carrier.
    expect(near / held).toBeLessThan(0.03);
    expect(covers / held).toBeLessThan(0.07); // a closer stand-off (#680) puts him over the carrier a little more often; the scene sorts him behind
  });

  it('stays on the ground: inside the touchlines and dead-ball lines', () => {
    for (const s of matches[0]!) {
      const r = refereeSpot(s);
      expect(r.y).toBeGreaterThanOrEqual(1.5 - REF.clearM);
      expect(r.y).toBeLessThanOrEqual(68 - 1.5 + REF.clearM);
    }
  });

  it('signals a try with the scorer down and points for a penalty', () => {
    const snaps = matches.flat();
    expect(snaps.some((s) => refereeSignal(s) === 'try')).toBe(true);
    expect(snaps.some((s) => refereeSignal(s) === 'penalty')).toBe(true);
    expect(refereeSignal(snaps[0]!)).toBeNull();
  });

  it('wears a strip neither side can be taken for', () => {
    for (const [a, b] of [[['#b5f23a', '#111111'], ['#1e3a8a', '#ffffff']], [['#ff4fa6', '#ffffff'], ['#2fd6e6', '#000000']]] as const) {
      const k = resolveKits({ clubId: 'ra', colors: a as unknown as [string, string] }, { clubId: 'rb', colors: b as unknown as [string, string] });
      const ref = refereeKit(k.home, k.away);
      expect(REFEREE_STRIPS.some(([j]) => j === ref.jersey)).toBe(true);
      expect(Math.min(kitContrast(ref, k.home), kitContrast(ref, k.away))).toBeGreaterThan(20);
    }
    // A lime side does not get a lime referee.
    const lime = kitFromColors(['#b5f23a', '#111111'], 'lime');
    expect(refereeKit(lime, lime).jersey).not.toBe(0xb5f23a);
  });
});

describe('the bench and the sin bin (#642)', () => {
  const home = sideSheet('H', { rating: 62 });
  const away = sideSheet('A', { rating: 58 });

  it('seats the four reserves at kick-off, and an interchange swaps who is sitting', () => {
    // Keep enough play for the existing fatigue/substitution thresholds.
    const sim = new LiveSim(home, away, 3, { length: { halves: 2, halfMinutes: 7 } });
    const first = benchSeated(home, 'home', sim.snapshot());
    expect(first).toEqual(home.bench!.map((b) => b.name));
    let changed: string[] | null = null;
    while (!sim.finished && !changed) {
      sim.step();
      const s = sim.snapshot();
      if (s.events.some((e) => e.kind === 'interchange' && e.side === 'home')) changed = benchSeated(home, 'home', s);
    }
    expect(changed).not.toBeNull();
    expect(changed!.length).toBe(first.length);
    expect(changed).not.toEqual(first);
  });

  it('puts the benches on the near touchline either side of halfway, the bin at the outer end', () => {
    expect(benchSeat('home', 0).x).toBeLessThan(50);
    expect(benchSeat('away', 0).x).toBeGreaterThan(50);
    expect(benchSeat('home', 0).y).toBeGreaterThan(68);
    expect(binSeat('home').x).toBeLessThan(benchSeat('home', BENCH.seats - 1).x);
    expect(binSeat('away').x).toBeGreaterThan(benchSeat('away', BENCH.seats - 1).x);
  });

  it('a binned man walks off as the sim has him, then sits in his side’s bin until he is back on', () => {
    let saw = { walking: false, seated: false };
    for (let seed = 1; seed <= 40 && !saw.seated; seed++) {
      const sim = new LiveSim(home, away, seed);
      while (!sim.finished) {
        sim.step();
        const s = sim.snapshot();
        for (const p of s.players) {
          const at = binnedSpot(p, s);
          if (!p.binned) expect(at).toBeNull();
          else if (at) {
            expect(at).toEqual(binSeat(p.side));
            saw.seated = true;
          } else saw.walking = true;
        }
        if (saw.seated) break;
      }
    }
    expect(saw).toEqual({ walking: true, seated: true });
  });
});
