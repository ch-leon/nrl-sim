// tests/match/league/kicks.test.ts — attacking kicks (BAK-208 §4.4, first
// slice): the last-tackle call by zone, where each kick is aimed, the chase,
// the catch contest under it, regathers and drops.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { ATTACK_KICK_M, RUN_CLOSE_M, RUN_IT_ZONE_M, bombTarget, chipTarget, chooseKick, crossFieldTarget, grubberTarget } from '../../../src/match/league/tactics';
import { FIELD_LENGTH, IN_GOAL, outOfBounds } from '../../../src/match/core/field';
import { grubberFlight, flightAt, landed } from '../../../src/match/core/ball';
import { toMatchEvent } from '../../../src/match/league/events';
import { popupFor } from '../../../src/match/view/popups';
import { applyTuning } from '../../../src/match/league/tuning';
import type { TeamSheet } from '../../../src/sim/events';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

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
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: base, strength: base, stamina: 50, skill: base, footyIQ: base } })),
  };
}
function events(seeds: number, seconds: number): { es: SimEvent[]; snaps: Snapshot[] } {
  const es: SimEvent[] = [];
  const snaps: Snapshot[] = [];
  for (let s = 1; s <= seeds; s++) {
    const sim = new LiveSim(sheet('H'), sheet('A'), s);
    for (let i = 0; i < seconds * 20; i++) {
      sim.step();
      const snap = sim.snapshot();
      es.push(...snap.events);
      snaps.push(snap);
    }
  }
  return { es, snaps };
}

describe('the last-tackle call (pure)', () => {
  it('is territory from deep, attacking inside 40, a grubber most often close in', () => {
    expect(chooseKick(60, 0.5)).toBe('long');
    expect(chooseKick(60, 0.9)).toBe('bomb');
    expect(chooseKick(45, 0.1)).toBe('long');
    expect(chooseKick(45, 0.5)).toBe('bomb');
    expect(chooseKick(45, 0.9)).toBe('cross-field');
    expect(chooseKick(30, 0.2)).toBe('bomb');
    expect(chooseKick(30, 0.5)).toBe('cross-field');
    expect(chooseKick(30, 0.75)).toBe('grubber');
    expect(chooseKick(30, 0.95)).toBe('chip');
    expect(chooseKick(15, 0.2)).toBe('cross-field');
    expect(chooseKick(15, 0.5)).toBe('grubber');
    expect(chooseKick(15, 0.9)).toBe('chip');
    // A side's style scales the weights: a grinding side kicks long from halfway, a kick-chase side bombs.
    expect(chooseKick(45, 0.4, { long: 4 })).toBe('long');
    expect(chooseKick(60, 0.5, { bomb: 10 })).toBe('bomb');
    for (const t of [10, 30, 45, 70]) for (const r of [0, 0.3, 0.6, 0.999]) expect(['long', 'bomb', 'cross-field', 'grubber', 'chip']).toContain(chooseKick(t, r));
    expect(RUN_CLOSE_M).toBeLessThan(RUN_IT_ZONE_M);
    expect(RUN_IT_ZONE_M).toBeLessThan(ATTACK_KICK_M);
  });
  it('aims every kick in play: grubbers into the in-goal, nothing over the dead-ball line', () => {
    for (const j of [0, 0.25, 0.5, 0.75, 1]) {
      for (const dir of [1, -1] as const) {
        const goal = dir > 0 ? FIELD_LENGTH : 0;
        const kicker = { x: goal - dir * 15, y: 20 };
        const g = grubberTarget(kicker, dir, j);
        expect((g.x - goal) * dir).toBeGreaterThan(0);
        expect((g.x - goal) * dir).toBeLessThanOrEqual(IN_GOAL - 1);
        const c = chipTarget(kicker, dir, j);
        expect((c.x - kicker.x) * dir).toBeGreaterThanOrEqual(9);
        const x = crossFieldTarget(kicker, dir, { x: goal - dir * 5, y: 63 }, j);
        expect((goal - x.x) * dir).toBeGreaterThanOrEqual(2);
        expect(Math.abs(x.y - 63)).toBeLessThanOrEqual(2.01);
        const b = bombTarget({ x: goal - dir * 35, y: 40 }, dir, { x: goal - dir * 5, y: 30 }, j);
        expect((goal - b.x) * dir).toBeGreaterThanOrEqual(3);
        for (const p of [g, c, x, b]) expect(outOfBounds(p)).toBe(false);
      }
    }
  });
  it('a grubber hops along the ground to its spot with nobody nominated', () => {
    const f = grubberFlight({ x: 80, y: 30 }, { x: 103, y: 32 }, 10);
    if (f.kind !== 'flight') throw new Error('flight');
    expect(f.receiver).toBeNull();
    expect(f.bounces).toBe(4);
    for (let t = f.t0; t <= f.t0 + f.ticks; t++) expect(flightAt(f, t).lift).toBeLessThan(1.3);
    expect(landed(f, f.t0 + f.ticks)).toBe(true);
    expect(flightAt(f, f.t0 + f.ticks).pos).toEqual({ x: 103, y: 32 });
  });
});

describe('kicks in the live sim', () => {
  // The kicking game on its own: no penalties or six-agains (2e) cutting sets short.
  const restore = applyTuning({ 'penalty.ruckSixAgain': 0, 'penalty.holdDown': 0, 'penalty.offside.slide': 0, 'penalty.offside.rush': 0, 'penalty.offside.compressed': 0, 'penalty.highShot': 0, 'penalty.highShotHothead': 0 });
  const { es } = events(24, 180);
  restore();
  const kicks = es.filter((e) => e.kind === 'kick');
  const byKind = (d: string): number => kicks.filter((e) => e.detail === d).length;

  it('uses the whole kicking game: long, bomb, grubber, chip and cross-field all happen, and attacking kicks are common', () => {
    for (const d of ['long', 'bomb', 'grubber', 'chip', 'cross-field']) expect(byKind(d), `${d}: ${JSON.stringify(Object.fromEntries(['long', 'bomb', 'grubber', 'chip', 'cross-field'].map((k) => [k, byKind(k)])))}`).toBeGreaterThan(0);
    const attacking = byKind('grubber') + byKind('chip') + byKind('cross-field');
    expect(attacking).toBeGreaterThan(kicks.length * 0.2);
    expect(attacking + byKind('bomb')).toBeGreaterThan(kicks.length * 0.4);
    expect(kicks.every((e) => e.detail !== undefined)).toBe(true);
  });
  it('kicks get chased: the kicking side regathers some, and catchers spill some under pressure', () => {
    expect(es.filter((e) => e.kind === 'regather').length).toBeGreaterThan(0);
    expect(es.filter((e) => e.kind === 'drop').length).toBeGreaterThan(0);
  });
  it('the game still scores and restarts normally', () => {
    expect(es.filter((e) => e.kind === 'try').length).toBeGreaterThan(5);
    expect(es.filter((e) => e.kind === 'kickoff').length).toBeGreaterThan(5);
  });
  it('names the kick type on the pop-up and in the contract event', () => {
    const g = kicks.find((e) => e.detail === 'grubber')!;
    expect(popupFor(g)?.word).toBe('GRUBBER!');
    expect(popupFor(kicks.find((e) => e.detail === 'long')!)?.word).toBe('KICK!');
    const snap: Snapshot = { tick: g.tick, players: [], ball: { x: 90, y: 30, lift: 0, holder: null }, label: '', events: [] };
    expect(toMatchEvent(g, snap, { home: 'H', away: 'A' })).toMatchObject({ kind: 'kick', detail: 'grubber' });
    expect(toMatchEvent(kicks.find((e) => e.detail === 'cross-field')!, snap, { home: 'H', away: 'A' })).toMatchObject({ kind: 'kick', detail: 'bomb' });
    expect(popupFor({ tick: 1, kind: 'regather', text: '', player: 'Ari Dunn' })).toMatchObject({ word: 'REGATHER!', big: true });
    expect(popupFor({ tick: 1, kind: 'drop', text: '', player: 'Ari Dunn' })).toMatchObject({ word: 'DROPPED!', tone: 'bad' });
  });
});
