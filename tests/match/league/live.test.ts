// tests/match/league/live.test.ts — the live Nines set (BAK-207 #85): every
// carry ends on the field, the ball is always accounted for, the ruck plays
// out in order, the set is five tackles, and it all replays from a seed.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { AVERAGE, OPEN, angleFrom, carrierEdge, contestOdds, interceptChance, knockOnChance, resolveContest, stepChance } from '../../../src/match/league/contest';
import { gapTarget, intercept, kickTarget, kickoffTarget, pickReceiver, supportSpots } from '../../../src/match/league/tactics';
import { MAX_SPEED, BODY_RADIUS } from '../../../src/match/core/body';
import { TICK_S, replayTo } from '../../../src/match/core/engine';
import { SET_TACKLES } from '../../../src/config';
import type { TeamSheet } from '../../../src/sim/events';
import type { Snapshot } from '../../../src/match/core/snapshot';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;

function sheet(id: string, base = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: base,
    defense: base,
    kicking: base,
    fitness: base,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({
      name: `${id} ${position} ${i}`,
      position,
      stats: { speed: base + i, strength: base - i, stamina: 50, skill: base, footyIQ: base },
    })),
  };
}

const factory = (seed: number): LiveSim => new LiveSim(sheet('H'), sheet('A'), seed);

function run(sim: LiveSim, seconds: number, onTick?: (s: Snapshot) => void): Snapshot {
  const n = Math.round(seconds / TICK_S);
  let snap = sim.snapshot();
  for (let i = 0; i < n; i++) {
    sim.step();
    snap = sim.snapshot();
    onTick?.(snap);
  }
  return snap;
}

function collect(sim: LiveSim, seconds: number): { kinds: string[]; snaps: Snapshot[] } {
  const kinds: string[] = [];
  const snaps: Snapshot[] = [];
  run(sim, seconds, (s) => {
    kinds.push(...s.events.map((e) => e.kind));
    snaps.push(s);
  });
  return { kinds, snaps };
}

describe('contest', () => {
  it('even stats are an even contest; strength and footyIQ swing it', () => {
    expect(carrierEdge(AVERAGE, AVERAGE)).toBeCloseTo(0.5);
    expect(carrierEdge({ ...AVERAGE, strength: 90 }, AVERAGE)).toBeGreaterThan(0.7);
    expect(carrierEdge(AVERAGE, { ...AVERAGE, strength: 90, footyIQ: 80 })).toBeLessThan(0.3);
  });
  it('odds sum to one, most carries are held, no offload without a support, no strip against two', () => {
    for (const e of [0, 0.3, 0.5, 0.8, 1]) {
      for (const support of [true, false]) {
        for (const defenders of [1, 2, 3] as const) {
          const o = contestOdds(e, { ...OPEN, support, defenders });
          expect(o.held + o['big-hit'] + o.broken + o.fend + o.offload + o.strip).toBeCloseTo(1);
          expect(o.held).toBeGreaterThan(0.4);
          if (!support) expect(o.offload).toBe(0);
          if (defenders > 1) expect(o.strip).toBe(0);
        }
      }
    }
    expect(contestOdds(0.9, OPEN).broken).toBeGreaterThan(contestOdds(0.1, OPEN).broken);
    expect(contestOdds(0.1, OPEN)['big-hit']).toBeGreaterThan(contestOdds(0.9, OPEN)['big-hit']);
    // Design-doc baseline at even stats, one-on-one, square.
    expect(contestOdds(0.5, { ...OPEN, support: true })).toMatchObject({ 'big-hit': 0.1, broken: 0.12, fend: 0.07, offload: 0.09, strip: 0.02 });
  });
  it('the situation moves the odds the way the design doc says', () => {
    const one = contestOdds(0.5, OPEN);
    const two = contestOdds(0.5, { ...OPEN, defenders: 2 });
    expect(two.broken).toBeLessThan(one.broken);
    expect(two['big-hit']).toBeGreaterThan(one['big-hit']);
    const side = contestOdds(0.5, { ...OPEN, angle: 'side' });
    expect(side.fend).toBeGreaterThan(one.fend);
    expect(side['big-hit']).toBeLessThan(one['big-hit']);
    const behind = contestOdds(0.5, { ...OPEN, angle: 'behind' });
    expect(behind.broken).toBeGreaterThan(one.broken);
    expect(behind['big-hit']).toBeLessThan(side['big-hit']);
    expect(contestOdds(0.5, { ...OPEN, speedDiff: 3 }).broken).toBeCloseTo(one.broken + 0.03);
    expect(contestOdds(0.5, { ...OPEN, speedDiff: 9 }).broken).toBeCloseTo(one.broken + 0.04); // capped
    expect(contestOdds(0.5, { ...OPEN, lastTackle: true })['big-hit']).toBeCloseTo(one['big-hit'] + 0.03);
    const tired = contestOdds(0.5, { ...OPEN, carrierFatigue: 1 });
    expect(tired.broken).toBeLessThan(one.broken);
    expect(tired.fend).toBeLessThan(one.fend);
    const tiredTackler = contestOdds(0.5, { ...OPEN, tacklerFatigue: 1 });
    expect(tiredTackler['big-hit']).toBeLessThan(one['big-hit']);
    expect(tiredTackler.broken).toBeGreaterThan(one.broken);
  });
  it('resolves every outcome from the roll, deterministically', () => {
    const seen = new Set<string>();
    for (let r = 0; r < 1; r += 0.0005) seen.add(resolveContest(AVERAGE, AVERAGE, r, { ...OPEN, support: true }));
    expect([...seen].sort()).toEqual(['big-hit', 'broken', 'fend', 'held', 'offload', 'strip']);
    expect(resolveContest(AVERAGE, AVERAGE, 0.99, OPEN)).toBe('held');
    expect(resolveContest(AVERAGE, AVERAGE, 0.0, OPEN)).toBe('broken');
  });
  it('a step: 10% one-on-one at even stats, more for footwork and from the side, never against two', () => {
    expect(stepChance(AVERAGE, AVERAGE, OPEN)).toBeCloseTo(0.1);
    expect(stepChance({ ...AVERAGE, speed: 90, skill: 90 }, AVERAGE, OPEN)).toBeCloseTo(0.3);
    expect(stepChance(AVERAGE, { ...AVERAGE, strength: 80, footyIQ: 80 }, OPEN)).toBeLessThan(0.1);
    expect(stepChance(AVERAGE, AVERAGE, { ...OPEN, angle: 'side' })).toBeCloseTo(0.15);
    expect(stepChance(AVERAGE, AVERAGE, { ...OPEN, angle: 'behind' })).toBeCloseTo(0.05);
    expect(stepChance(AVERAGE, AVERAGE, { ...OPEN, defenders: 2 })).toBe(0);
    expect(stepChance(AVERAGE, AVERAGE, { ...OPEN, carrierFatigue: 1 })).toBeCloseTo(0.02);
    expect(angleFrom(1)).toBe('square');
    expect(angleFrom(0)).toBe('side');
    expect(angleFrom(-1)).toBe('behind');
  });
  it('passes: knock-ons rise under pressure and in rain; intercepts double for cut-outs', () => {
    expect(knockOnChance(50, false)).toBeCloseTo(0.04);
    expect(knockOnChance(50, true)).toBeCloseTo(0.08);
    expect(knockOnChance(90, false)).toBeLessThan(knockOnChance(30, false));
    expect(knockOnChance(50, true, true)).toBeCloseTo(0.14);
    expect(interceptChance(50, false)).toBeCloseTo(0.06);
    expect(interceptChance(50, true)).toBeCloseTo(0.12);
    expect(interceptChance(90, false)).toBeGreaterThan(interceptChance(30, false));
  });
});

describe('tactics', () => {
  it('the carrier runs at the gap between the two nearest defenders, or away from a lone one', () => {
    const c = { x: 40, y: 30 };
    expect(gapTarget(c, 1, [{ x: 48, y: 26 }, { x: 47, y: 36 }, { x: 46, y: 60 }])).toEqual({ x: 50, y: 31 });
    const lone = gapTarget(c, 1, [{ x: 46, y: 28 }]);
    expect(lone.y).toBeGreaterThan(30);
    expect(gapTarget(c, 1, [])).toEqual({ x: 50, y: 30 });
    expect(gapTarget(c, 1, [{ x: 30, y: 30 }]).y).toBe(30); // behind him: ignored
    expect(Math.abs(gapTarget(c, -1, [{ x: 33, y: 2 }, { x: 33, y: 4 }]).y - 30)).toBeLessThanOrEqual(10); // capped drift
  });
  it('picks a receiver behind and to the side, skipping busy players', () => {
    const passer = { x: 50, y: 30 };
    const r = pickReceiver(passer, 1, [
      { idx: 1, pos: { x: 47, y: 36 }, busy: false },
      { idx: 2, pos: { x: 46, y: 24 }, busy: true },
      { idx: 3, pos: { x: 53, y: 36 }, busy: false }, // in front: forward pass
      { idx: 4, pos: { x: 47, y: 31 }, busy: false }, // too close
    ]);
    expect(r).toBe(1);
    expect(pickReceiver(passer, 1, [{ idx: 3, pos: { x: 53, y: 36 }, busy: false }])).toBeNull();
    // Role preference breaks ties: the half gets the ball over an equally placed forward.
    const half = pickReceiver(passer, 1, [
      { idx: 7, pos: { x: 47, y: 36 }, busy: false, prefer: 0 },
      { idx: 5, pos: { x: 47, y: 24 }, busy: false, prefer: 1.5 },
    ]);
    expect(half).toBe(5);
  });
  it('intercept meets a moving carrier where he will be, and never aims behind a still one', () => {
    // Carrier at (50,30) running +x at 8 m/s; a slightly quicker defender 6 m to the side.
    const p = intercept({ x: 50, y: 36 }, 9.5, { x: 50, y: 30 }, { x: 8, y: 0 });
    expect(p.y).toBe(30);
    expect(p.x).toBeGreaterThan(53); // well ahead of the carrier's current spot
    const tHit = (p.x - 50) / 8;
    expect(Math.hypot(p.x - 50, p.y - 36) / 9.5).toBeCloseTo(tHit, 5); // both arrive together
    // Same speed, square on: no finite intercept — aim at the far end of the window, not at his heels.
    expect(intercept({ x: 50, y: 38 }, 8, { x: 50, y: 30 }, { x: 8, y: 0 }).x).toBeCloseTo(62);
    expect(intercept({ x: 40, y: 30 }, 8, { x: 50, y: 30 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 30 });
    // A carrier faster than the defender and pulling away: aim at the far end of the window.
    const far = intercept({ x: 60, y: 30 }, 6, { x: 50, y: 30 }, { x: -9, y: 0 });
    expect(far.x).toBeCloseTo(50 - 9 * 1.5);
  });

  it('support lines sit either side and behind; kicks land in play', () => {
    const [l, r] = supportSpots({ x: 50, y: 30 }, 1);
    expect(l).toEqual({ x: 47, y: 24 });
    expect(r).toEqual({ x: 47, y: 36 });
    for (const j of [0, 0.5, 1]) {
      const k = kickTarget({ x: 40, y: 30 }, 1, { x: 90, y: 50 }, j);
      expect(k.x).toBeLessThanOrEqual(96);
      expect(k.x).toBeGreaterThan(48);
      expect(k.y).toBeGreaterThanOrEqual(6);
      expect(k.y).toBeLessThanOrEqual(62);
      const close = kickTarget({ x: 94, y: 30 }, 1, { x: 99, y: 30 }, j);
      expect(close.x).toBeLessThanOrEqual(96);
      const ko = kickoffTarget(-1, j);
      expect(ko.x).toBe(76);
    }
  });
});

describe('LiveSim', () => {
  it('replays identically from a seed', () => {
    const a = run(factory(5), 60);
    expect(a).toEqual(run(factory(5), 60));
    expect(a).toEqual(replayTo(factory, 5, Math.round(60 / TICK_S)));
    expect(run(factory(6), 60).players.map((p) => p.x)).not.toEqual(a.players.map((p) => p.x));
  });

  it('starts with a kick-off the fullback catches, then the receiving side attacks', () => {
    const { kinds, snaps } = collect(factory(1), 8);
    expect(kinds[0]).toBe('kickoff');
    expect(kinds).toContain('set-start');
    const catchTick = snaps.findIndex((s) => s.events.some((e) => e.kind === 'set-start'));
    expect(snaps[catchTick]!.ball.holder).toEqual({ side: 'home', slot: 0 });
    expect(snaps[catchTick]!.label).toMatch(/^H ball/);
  });

  it('every carry ends in a tackle, a break, an error or a kick — and a tackle always plays the ball', () => {
    const { kinds } = collect(factory(2), 180);
    const tackles = kinds.filter((k) => k === 'tackle' || k === 'big-hit').length;
    expect(tackles).toBeGreaterThan(20);
    expect(kinds.filter((k) => k === 'break-tackle' || k === 'fend').length).toBeGreaterThan(0);
    expect(kinds).toContain('kick');
    // Sets end: a kick, a handover or an error.
    expect(kinds.filter((k) => k === 'kick' || k === 'handover' || k === 'error').length).toBeGreaterThan(3);
  });

  it('the ruck runs tackled → down → play-the-ball → dummy-half, in that order, with the ball', () => {
    const sim = factory(3);
    let carrier: number | null = null;
    const poses: string[] = [];
    let dhHeld = false;
    let seen = false;
    run(sim, 120, (s) => {
      if (seen) return;
      if (s.wrestle && carrier === null) {
        // Contact: the wrestle names the carrier (the tackle event comes when he is held).
        const w = s.wrestle;
        carrier = s.players.findIndex((p) => p.side === w.side && p.slot === w.slot);
      }
      if (carrier !== null) {
        const p = s.players[carrier]!;
        if (poses[poses.length - 1] !== p.pose) poses.push(p.pose);
        if (s.ball.holder && s.ball.holder.slot === 6 && s.ball.holder.side === p.side) dhHeld = true;
        if (p.pose === 'run' && poses.includes('ptb') && dhHeld) seen = true;
      }
    });
    expect(seen).toBe(true);
    const i = poses.indexOf('tackled');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(poses.slice(i, i + 3)).toEqual(['tackled', 'down', 'ptb']);
    const dh = sim.snapshot().players.find((p) => p.slot === 6 && p.side === 'home');
    expect(dh).toBeDefined();
  });

  it('a set is five tackles: the fifth brings a handover unless a kick came first', () => {
    const { kinds, snaps } = collect(factory(4), 240);
    const labels = snaps.map((s) => s.label);
    expect(labels.some((l) => l.includes(`tackle ${SET_TACKLES - 1}/${SET_TACKLES} · last`))).toBe(true);
    expect(labels.some((l) => l.includes(`tackle ${SET_TACKLES + 1}/`))).toBe(false);
    expect(kinds.filter((k) => k === 'kick' || k === 'handover').length).toBeGreaterThan(2);
  });

  it('the ball is always held, in flight or loose-and-collected within a couple of seconds', () => {
    let looseRun = 0;
    let maxLoose = 0;
    run(factory(7), 180, (s) => {
      if (s.ball.holder) looseRun = 0;
      else {
        looseRun++;
        maxLoose = Math.max(maxLoose, looseRun);
      }
      expect(s.ball.lift).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.ball.x) && Number.isFinite(s.ball.y)).toBe(true);
    });
    expect(maxLoose).toBeLessThan(5 / TICK_S); // a long kick nobody is under + the run to it
  });

  it('nobody teleports, overlaps or leaves the ground; speeds stay human', () => {
    const sim = factory(8);
    let prev = sim.snapshot();
    run(sim, 120, (s) => {
      s.players.forEach((p, i) => {
        const q = prev.players[i]!;
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan((MAX_SPEED * 1.2 + 2) * TICK_S + BODY_RADIUS);
        expect(p.speed).toBeLessThanOrEqual(MAX_SPEED * 1.2 + 1e-6);
        expect(p.x).toBeGreaterThanOrEqual(-10);
        expect(p.x).toBeLessThanOrEqual(110);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(68);
        for (let j = i + 1; j < s.players.length; j++) {
          const o = s.players[j]!;
          expect(Math.hypot(p.x - o.x, p.y - o.y)).toBeGreaterThan(BODY_RADIUS * 0.4);
        }
      });
      prev = s;
    });
  });

  it('tries get scored and the game restarts with a kick-off by the side scored against', () => {
    let tries = 0;
    let restarted = false;
    for (let seed = 10; seed < 30 && !restarted; seed++) {
      const sim = factory(seed);
      const { kinds, snaps } = collect(sim, 300);
      const t = kinds.indexOf('try');
      if (t < 0) continue;
      tries += sim.tries.home + sim.tries.away;
      const tryTick = snaps.findIndex((s) => s.events.some((e) => e.kind === 'try'));
      const scorerSide = snaps[tryTick]!.events.find((e) => e.kind === 'try')!.side!;
      const ko = snaps.slice(tryTick + 1).find((s) => s.events.some((e) => e.kind === 'kickoff'));
      if (ko) {
        expect(ko.events.find((e) => e.kind === 'kickoff')!.side).toBe(scorerSide === 'home' ? 'away' : 'home');
        restarted = true;
      }
    }
    expect(tries).toBeGreaterThan(0);
    expect(restarted).toBe(true);
  });

  it('steps, strips and intercepts all happen across seeds, and are announced', () => {
    const kinds = new Set<string>();
    for (let seed = 40; seed < 80; seed++) {
      const { kinds: k } = collect(factory(seed), 240);
      for (const x of k) kinds.add(x);
      if (kinds.has('step') && kinds.has('strip') && kinds.has('intercept')) break;
    }
    expect(kinds.has('step')).toBe(true);
    expect(kinds.has('strip')).toBe(true);
    expect(kinds.has('intercept')).toBe(true);
  });

  it('a strip or intercept hands the ball over where it happened', () => {
    let checked = 0;
    for (let seed = 40; seed < 60 && checked < 2; seed++) {
      const sim = factory(seed);
      let prevLabel = '';
      run(sim, 180, (s) => {
        const e = s.events.find((x) => x.kind === 'strip' || x.kind === 'intercept');
        if (e) {
          // The side that took it now has the ball and the label says so.
          expect(s.ball.holder?.side).toBe(e.side);
          expect(s.label.startsWith(e.side === 'home' ? 'H ball' : 'A ball')).toBe(true);
          expect(prevLabel.startsWith(e.side === 'home' ? 'A ball' : 'H ball')).toBe(true);
          checked++;
        }
        prevLabel = s.label;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('the try scorer stays where he grounded it until the restart (no dragging along the ground)', () => {
    let checked = 0;
    for (let seed = 1; seed < 30 && checked < 2; seed++) {
      const sim = factory(seed);
      let scorer: { side: 'home' | 'away'; slot: number; x: number; y: number } | null = null;
      let tryTick = 0;
      run(sim, 240, (s) => {
        const e = s.events.find((x) => x.kind === 'try');
        if (e && !scorer) {
          const p = s.players.find((q) => q.side === e.side && q.slot === e.slot)!;
          scorer = { side: e.side!, slot: e.slot!, x: p.x, y: p.y };
          tryTick = s.tick;
        }
        if (scorer && s.tick > tryTick && s.tick < tryTick + 50 && s.label.includes('try')) {
          const p = s.players.find((q) => q.side === scorer!.side && q.slot === scorer!.slot)!;
          expect(Math.hypot(p.x - scorer.x, p.y - scorer.y)).toBeLessThan(3);
          expect(['dive', 'celebrate', 'down']).toContain(p.pose);
          checked++;
        }
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('the hooker does not make the tackles from marker: the line does (middles lead, as in league)', () => {
    let total = 0;
    let byHooker = 0;
    let byMiddles = 0; // hooker + prop: the two who stand over the mark most rucks
    for (const seed of [1, 2, 3]) {
      const { snaps } = collect(factory(seed), 180);
      for (const s of snaps) {
        for (const e of s.events) {
          if (e.kind !== 'tackle' && e.kind !== 'big-hit') continue;
          total++;
          if (e.slot === 6) byHooker++;
          if (e.slot === 6 || e.slot === 7) byMiddles++;
        }
      }
    }
    expect(total).toBeGreaterThan(40);
    expect(byHooker / total).toBeLessThan(0.35); // was 36%+ when markers pounced on the first receiver
    expect(byMiddles / total).toBeLessThan(0.6);
  });

  it('the stronger side scores more over many seeds', () => {
    let strong = 0;
    let weak = 0;
    for (let seed = 0; seed < 12; seed++) {
      const sim = new LiveSim(sheet('S', 80), sheet('W', 35), seed);
      run(sim, 240);
      strong += sim.tries.home;
      weak += sim.tries.away;
    }
    expect(strong).toBeGreaterThan(weak);
  });

  it('works with a bare sheet (no roster)', () => {
    const bare: TeamSheet = { clubId: 'X', name: 'Bare', attack: 50, defense: 50, kicking: 50, fitness: 50, colors: ['#111', '#eee'] };
    const s = run(new LiveSim(bare, bare, 1), 20);
    expect(s.players).toHaveLength(18);
  });
});
