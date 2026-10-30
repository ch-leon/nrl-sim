// Labs: match controls (Leon, 30 Oct).
import { SET_TACKLES } from '../../../src/config';
import { describe, expect, it, vi } from 'vitest';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { controlAim, controlKickBand, controlReceiver, type ControlInput } from '../../../src/match/league/controls';
import { sideSheet } from '../../../src/match/balance/measure';
import { MatchRecorder, runMatch } from '../../../src/match/league/match';
import { Runner } from '../../../src/match/core/engine';
import type { Side } from '../../../src/match/core/snapshot';
import type { Vec } from '../../../src/match/core/vec';

const home = sideSheet('H', { rating: 60 }), away = sideSheet('A', { rating: 60 });
type Man = { side: Side; body: { pos: Vec; vel: Vec }; catchTick: number; immuneUntil: number; decided: boolean; steppedOn: number; jink: { dy: number } | null; lockUntil: number; busyUntil: number };
type Inside = {
  players: Man[]; attacking: Side; dir: 1 | -1; tackles: number; lastPlay: boolean;
  ball: { kind: string; by: number }; phase: { kind: string }; tick: number;
  pendingControl: Record<Side, ControlInput | null>;
  rng: { next(): number };
  pendingKick: { kind: string; to: Vec } | null;
  dummyHalf(side: Side): Man;
  stepRuck(phase: { kind: 'ruck'; stage: 'dh'; heldAt: number }): void;
  stepPlay(): void; sidestep(c: Man, t: Man, trait?: string, way?: number): void;
};
function moment() {
  const sim = new LiveSim(home, away, 1);
  while (!sim.tickEvents.some((e) => e.kind === 'set-start')) sim.step();
  const s = sim as unknown as Inside;
  const carrier = s.players.find((p) => p.side === s.attacking)!;
  s.ball = { kind: 'held', by: s.players.indexOf(carrier) };
  s.phase = { kind: 'play' };
  carrier.body.pos = { x: 50, y: 34 };
  carrier.catchTick = s.tick - LIVE.passCooldown - 1;
  carrier.lockUntil = 0; carrier.immuneUntil = 0; carrier.decided = true; carrier.steppedOn = -1;
  for (const p of s.players) if (p !== carrier) {
    p.body.pos = { x: p.side === s.attacking ? 50 - s.dir * 3 : 50 + s.dir * 30, y: 34 };
    p.lockUntil = 0; p.busyUntil = 0;
  }
  return { sim, s, carrier };
}

describe('empty controls preserve every tick and result', () => {
  it('matches omitted and undefined for several seeds and both presets', () => {
    for (const attack of ['balanced', 'expansive'] as const) for (const seed of [1, 2, 7]) {
      const h = sideSheet('H', { rating: 60, tactics: { attack } });
      const sims = [new LiveSim(h, away, seed), new LiveSim(h, away, seed, { controls: undefined }), new LiveSim(h, away, seed, { controls: [] })];
      while (!sims[0]!.finished) {
        sims.forEach((s) => s.step());
        const snap = sims[0]!.snapshot();
        expect(sims[1]!.snapshot()).toEqual(snap);
        expect(sims[2]!.snapshot()).toEqual(snap);
      }
      const result = runMatch(h, away, { seed });
      expect(runMatch(h, away, { seed, controls: [] })).toEqual(result);
      expect(runMatch(h, away, { seed, controls: undefined })).toEqual(result);
    }
  }, 120_000);
});
describe('timed decisions', () => {
  it('restricts receiver to the requested side, or finds nobody', () => {
    const candidates = [{ idx: 1, pos: { x: 47, y: 28 }, busy: false }, { idx: 2, pos: { x: 47, y: 40 }, busy: false }];
    expect(controlReceiver({ x: 50, y: 34 }, 1, candidates, 'pass-left')).toBe(1);
    expect(controlReceiver({ x: 50, y: 34 }, 1, candidates, 'pass-right')).toBe(2);
    expect(controlReceiver({ x: 50, y: 34 }, 1, candidates.slice(0, 1), 'pass-right')).toBeNull();
  });
  it.each(['pass-left', 'pass-right'] as const)('forces %s before engagement without the passBase roll', (kind) => {
    const { sim, s, carrier } = moment();
    const receiver = s.players.find((p) => p !== carrier && p.side === carrier.side)!;
    receiver.body.pos.y += kind === 'pass-left' ? -6 : 6;
    s.pendingControl[carrier.side] = { tick: sim.tick, side: carrier.side, kind };
    s.stepPlay();
    expect(s.ball.kind).toBe('flight');
    expect(s.pendingControl[carrier.side]).toBeNull();
  });
  it('moves dummy-half ball to the requested side without a dart roll', () => {
    const { s, carrier } = moment();
    const dh = s.dummyHalf(carrier.side);
    dh.body.pos = { x: 50, y: 34 };
    s.ball = { kind: 'held', by: s.players.indexOf(dh) };
    const receiver = s.players.find((p) => p.side === dh.side && p !== dh)!;
    receiver.body.pos = { x: 50 - s.dir * 3, y: 28 };
    s.pendingControl[dh.side] = { tick: s.tick, side: dh.side, kind: 'pass-left' };
    s.stepRuck({ kind: 'ruck', stage: 'dh', heldAt: s.tick - LIVE.dhHoldTicks - 1 });
    expect(s.ball.kind).toBe('flight');
    expect(s.pendingControl[dh.side]).toBeNull();
    expect(s.phase.kind).toBe('play');
  });
  it('drops an unavailable pass and continues the same AI decision', () => {
    const { s, carrier } = moment();
    s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind: 'pass-left' };
    s.stepPlay();
    expect(s.pendingControl[carrier.side]).toBeNull();
    expect(s.ball.kind).toBe('held');
  });
  it.each(['step-up', 'step-down'] as const)('%s bypasses the attempt roll but keeps the success roll', (kind) => {
    const { s, carrier } = moment();
    const defender = s.players.find((p) => p.side !== carrier.side)!;
    defender.body.pos = { x: 50 + s.dir * (LIVE.stepRange - 0.1), y: 34 };
    s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind };
    const roll = vi.spyOn(s.rng, 'next').mockReturnValue(0);
    s.stepPlay();
    expect(roll).toHaveBeenCalledTimes(1);
    expect(Math.sign(carrier.jink!.dy)).toBe(kind === 'step-up' ? -1 : 1);
    expect(carrier.steppedOn).toBe(s.players.indexOf(defender));
    expect(s.pendingControl[carrier.side]).toBeNull();
    roll.mockRestore();
  });
  it.each(['step-up', 'kick'] as const)('retains %s through ruck stages and a locked catch', (kind) => {
    const { sim, s, carrier } = moment();
    s.tackles = SET_TACKLES - 1;
    const dh = s.dummyHalf(carrier.side);
    s.ball = { kind: 'held', by: s.players.indexOf(dh) };
    s.phase = { kind: 'ruck', stage: 'down', t0: s.tick, carrier: s.players.indexOf(carrier), tackler: s.players.findIndex((p) => p.side !== carrier.side), down: 0, pace: null, handover: false, heldAt: 0 } as unknown as Inside['phase'];
    const controls = (s as unknown as { controlList: ControlInput[] }).controlList;
    controls.push({ tick: sim.tick + 1, side: carrier.side, kind, aim: { x: 55, y: 34 } });
    sim.step();
    expect(s.pendingControl[carrier.side]?.kind).toBe(kind);
    s.ball = { kind: 'held', by: s.players.indexOf(carrier) };
    s.phase = { kind: 'play' };
    carrier.lockUntil = s.tick + 3;
    sim.step();
    expect(s.pendingControl[carrier.side]?.kind).toBe(kind);
    carrier.lockUntil = 0;
    s.stepPlay();
    expect(s.pendingControl[carrier.side]).toBeNull();
    if (kind === 'kick') expect(s.pendingKick).not.toBeNull();
    else expect(carrier.jink?.dy).toBe(-LIVE.stepJinkM);
  });
  it('a last-tackle drag overrides an existing kick wind-up, even on its launch tick', () => {
    const { sim, s, carrier } = moment();
    s.tackles = SET_TACKLES - 1; s.lastPlay = true;
    s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind: 'kick', aim: { x: 50 + s.dir * 5, y: 34 } };
    s.stepPlay();
    expect(s.pendingKick?.kind).toBe('grubber');
    (s.pendingKick as unknown as { at: number }).at = sim.tick + 1;
    const controls = (s as unknown as { controlList: ControlInput[] }).controlList;
    controls.push({ tick: sim.tick + 1, side: carrier.side, kind: 'kick', aim: { x: 50 + s.dir * 30, y: 34 } });
    sim.step();
    expect(s.ball.kind).toBe('held');
    expect(s.pendingControl[carrier.side]?.kind).toBe('kick');
    carrier.lockUntil = 0;
    s.stepPlay();
    expect(s.pendingControl[carrier.side]).toBeNull();
    expect(s.pendingKick?.kind).toBe('bomb');
  });
  it('maps the named drag lengths to grubber, chip and bomb', () => {
    expect(controlKickBand(0, LIVE.controlsChipFromM, LIVE.controlsBombFromM)).toBe('grubber');
    expect(controlKickBand(LIVE.controlsChipFromM, LIVE.controlsChipFromM, LIVE.controlsBombFromM)).toBe('chip');
    expect(controlKickBand(LIVE.controlsBombFromM, LIVE.controlsChipFromM, LIVE.controlsBombFromM)).toBe('bomb');
    for (const [length, kind] of [[5, 'grubber'], [18, 'chip'], [30, 'bomb']] as const) {
      const { s, carrier } = moment();
      s.tackles = SET_TACKLES - 1; s.lastPlay = true;
      s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind: 'kick', aim: { x: carrier.body.pos.x + s.dir * length, y: 34 } };
      s.stepPlay();
      expect(s.pendingKick?.kind).toBe(kind);
    }
  });
  it('uses the existing attacking range for a long drag: territory deep, bomb near the line', () => {
    expect(controlKickBand(30, LIVE.controlsChipFromM, LIVE.controlsBombFromM, 50)).toBe('bomb');
    expect(controlKickBand(30, LIVE.controlsChipFromM, LIVE.controlsBombFromM, 50.1)).toBe('long');
    for (const dir of [1, -1] as const) {
      const { s, carrier } = moment();
      s.dir = dir; s.tackles = SET_TACKLES - 1; s.lastPlay = true;
      carrier.body.pos = { x: dir > 0 ? 20 : 80, y: 34 };
      s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind: 'kick', aim: { x: carrier.body.pos.x + dir * 30, y: 999 } };
      s.stepPlay();
      expect(s.pendingKick?.kind).toBe('long');
      // Same normal territory target / scatter, even for an extreme aim.
      expect(s.pendingKick?.to.x).toBe(carrier.body.pos.x + dir * 32);
      expect(s.pendingKick?.to.y).toBe(42);
    }
  });
  it('clamps extreme aims to the existing scatter envelope in either direction', () => {
    expect(controlAim({ x: 20, y: 30 }, { x: 900, y: -900 }, { x: 18, y: 28 }, { x: 22, y: 32 })).toEqual({ x: 22, y: 28 });
    expect(controlAim({ x: 20, y: 30 }, { x: -900, y: 900 }, { x: 22, y: 32 }, { x: 18, y: 28 })).toEqual({ x: 18, y: 32 });
  });
  it('ignores a defending control and a non-last-tackle kick, tick for tick', () => {
    for (const kind of ['pass-left', 'kick'] as const) {
      const controls: ControlInput[] = [];
      const a = new LiveSim(home, away, 3), b = new LiveSim(home, away, 3, { controls });
      for (let i = 0; i < 2000; i++) {
        if (i % 10 === 0 && (kind !== 'kick' || a.tackleCount !== SET_TACKLES - 1)) controls.push({ tick: a.tick + 1, side: kind === 'kick' ? a.inPossession : a.inPossession === 'home' ? 'away' : 'home', kind });
        a.step(); b.step();
        expect(b.snapshot()).toEqual(a.snapshot());
      }
    }
  });
  it('applies a queued step in open space before the AI can pass it away', () => {
    const { sim, s, carrier } = moment();
    s.pendingControl[carrier.side] = { tick: s.tick, side: carrier.side, kind: 'step-up' };
    s.stepPlay();
    expect(carrier.jink?.dy).toBe(-LIVE.stepJinkM);
    expect(s.pendingControl[carrier.side]).toBeNull();
    const y = carrier.body.pos.y;
    sim.step();
    expect(carrier.body.pos.y).toBeLessThan(y);
  });
});

it('a controlled watched match equals the skipped replay, resume and seek', () => {
  const controls: ControlInput[] = [];
  const factory = (seed: number) => new LiveSim(home, away, seed, { controls });
  const r = new Runner(factory, 8);
  const rec = new MatchRecorder({ home: 'H', away: 'A' });
  r.onEvents = (es) => rec.add(es, r.cur);
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  while (!r.finished) {
    const sim = r.current as LiveSim;
    if (sim.tick % 61 === 0) controls.push({ tick: sim.tick + 1, side: sim.inPossession, kind: sim.tackleCount === SET_TACKLES - 1 ? 'kick' : sim.tick % 2 ? 'step-up' : 'pass-left', aim: { x: 65, y: 30 } });
    r.step();
  }
  expect(rec.result(r.current as LiveSim)).toEqual(runMatch(home, away, { seed: 8, controls }));
  const end = r.cur;
  r.seek(Math.floor(end.tick / 2));
  const resumed = new Runner(factory, 8);
  resumed.seek(r.tick);
  expect(resumed.cur).toEqual(r.cur);
  r.seek(end.tick);
  expect(r.cur).toEqual(end);
}, 30_000);
