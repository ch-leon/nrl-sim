// tests/match/league/live.test.ts — the live Nines set (BAK-207 #85): every
// carry ends on the field, the ball is always accounted for, the ruck plays
// out in order, the set is five tackles, and it all replays from a seed.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { AVERAGE, carrierEdge, contestOdds, resolveContest } from '../../../src/match/league/contest';
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
  it('odds sum to one, most carries are held, no offload without a support', () => {
    for (const e of [0, 0.3, 0.5, 0.8, 1]) {
      for (const opt of [true, false]) {
        const o = contestOdds(e, opt);
        expect(o.held + o['big-hit'] + o.broken + o.fend + o.offload).toBeCloseTo(1);
        expect(o.held).toBeGreaterThan(0.45);
        if (!opt) expect(o.offload).toBe(0);
      }
    }
    expect(contestOdds(0.9, false).broken).toBeGreaterThan(contestOdds(0.1, false).broken);
    expect(contestOdds(0.1, false)['big-hit']).toBeGreaterThan(contestOdds(0.9, false)['big-hit']);
  });
  it('resolves every outcome from the roll, deterministically', () => {
    const seen = new Set<string>();
    for (let r = 0; r < 1; r += 0.001) seen.add(resolveContest(AVERAGE, AVERAGE, r, true));
    expect([...seen].sort()).toEqual(['big-hit', 'broken', 'fend', 'held', 'offload']);
    expect(resolveContest(AVERAGE, AVERAGE, 0.99, true)).toBe('held');
    expect(resolveContest(AVERAGE, AVERAGE, 0.0, true)).toBe('broken');
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
      const t = s.events.find((e) => e.kind === 'tackle');
      if (t && carrier === null) {
        // The event names the tackler; the carrier is whoever holds the ball.
        const h = s.ball.holder!;
        carrier = s.players.findIndex((p) => p.side === h.side && p.slot === h.slot);
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
    expect(maxLoose).toBeLessThan(3 / TICK_S); // the longest flight is a kick-off
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
