// tests/match/league/traits.test.ts — traits in the live sim (BAK-208 §3, C):
// the pure mapping from traits to contest odds, and the sim showing them
// firing: more of the thing the trait is for, named on the event, replayable.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { OPEN, contestOdds, interceptChance, stepChance, AVERAGE } from '../../../src/match/league/contest';
import { EDGE_COST, TRAIT_PTS, bootMult, contestTraits, interceptTraits, speedMult, stepTraits } from '../../../src/match/league/traits';
import { kickTarget, pickReceiver } from '../../../src/match/league/tactics';
import { TICK_S } from '../../../src/match/core/engine';
import type { TeamSheet } from '../../../src/sim/events';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { TraitId, TraitInstance } from '../../../src/data/traits';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const T = (id: TraitId, level: 1 | 2 | 3 = 1): TraitInstance[] => [{ id, level }];

function sheet(id: string, traits: (i: number) => TraitInstance[] | undefined = () => undefined, base = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: base,
    defense: base,
    kicking: base,
    fitness: base,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => {
      const t = traits(i);
      return { name: `${id} ${position} ${i}`, position, stats: { speed: base, strength: base, stamina: 50, skill: base, footyIQ: base }, ...(t ? { traits: t } : {}) };
    }),
  };
}

function events(home: TeamSheet, away: TeamSheet, seeds: number, seconds: number): SimEvent[] {
  const out: SimEvent[] = [];
  const n = Math.round(seconds / TICK_S);
  for (let s = 1; s <= seeds; s++) {
    const sim = new LiveSim(home, away, s);
    for (let i = 0; i < n; i++) {
      sim.step();
      out.push(...sim.snapshot().events);
    }
  }
  return out;
}
const count = (es: SimEvent[], kind: string, side?: 'home' | 'away'): number => es.filter((e) => e.kind === kind && (side === undefined || e.side === side)).length;

describe('contestTraits (pure)', () => {
  it('a Wrecking Ball lifts the bust by 12% per level and takes the credit', () => {
    const one = contestTraits(T('wreckingBall'), [], OPEN, false);
    expect(one.mods.broken).toBeCloseTo(TRAIT_PTS.wreckingBall);
    expect(one.credit.broken).toEqual({ id: 'wreckingBall', level: 1 });
    const three = contestTraits(T('wreckingBall', 3), [], OPEN, false);
    expect(three.mods.broken).toBeCloseTo(TRAIT_PTS.wreckingBall * 2.2);
  });
  it("Don't Argue fends except from behind; Offload King needs a support; the Finisher only near the line", () => {
    expect(contestTraits(T('dontArgue'), [], OPEN, false).mods.fend).toBeCloseTo(TRAIT_PTS.dontArgue);
    expect(contestTraits(T('dontArgue'), [], { ...OPEN, angle: 'behind' }, false).mods.fend).toBeUndefined();
    expect(contestTraits(T('offloadKing'), [], OPEN, false).mods.offload).toBeUndefined();
    expect(contestTraits(T('offloadKing'), [], { ...OPEN, support: true }, false).mods.offload).toBeCloseTo(TRAIT_PTS.offloadKing);
    expect(contestTraits(T('finisher'), [], OPEN, false).mods.broken).toBeUndefined();
    const near = contestTraits(T('finisher'), [], OPEN, true);
    expect(near.mods.broken).toBeCloseTo(TRAIT_PTS.finisherBust);
    expect(near.credit.broken?.id).toBe('finisher');
  });
  it('the bigger contributor gets the credit: Razzle Dazzle II over Offload King I', () => {
    const t = contestTraits([...T('offloadKing'), ...T('razzleDazzle', 2)], [], { ...OPEN, support: true }, false);
    expect(t.mods.offload).toBeCloseTo(TRAIT_PTS.offloadKing + TRAIT_PTS.razzleDazzle * 1.6);
    expect(t.credit.offload?.id).toBe('razzleDazzle');
  });
  it('a Hitman needs a square shot; a Pickpocket needs one-on-one; a Brick Wall needs company; Last Line stands alone', () => {
    expect(contestTraits([], T('hitman'), OPEN, false).mods.bigHit).toBeCloseTo(TRAIT_PTS.hitman);
    expect(contestTraits([], T('hitman'), { ...OPEN, angle: 'side' }, false).mods.bigHit).toBeUndefined();
    expect(contestTraits([], T('pickpocket'), OPEN, false).mods.strip).toBeCloseTo(TRAIT_PTS.pickpocket);
    expect(contestTraits([], T('pickpocket'), { ...OPEN, defenders: 2 }, false).mods.strip).toBeUndefined();
    expect(contestTraits([], T('brickWall'), OPEN, false).mods.broken).toBeUndefined();
    const wall = contestTraits([], T('brickWall'), { ...OPEN, defenders: 2 }, false);
    expect(wall.mods.broken).toBeCloseTo(-TRAIT_PTS.brickWall);
    expect(wall.mods.offload).toBeCloseTo(-TRAIT_PTS.brickWall);
    const cover = contestTraits([], T('lastLine', 2), OPEN, false);
    expect(cover.mods.broken).toBeCloseTo(-TRAIT_PTS.lastLine * 1.6);
    expect(contestTraits([], T('lastLine'), { ...OPEN, defenders: 2 }, false).mods.broken).toBeUndefined();
  });
  it('a Hothead hits harder from any angle but is busted more — the downside does not scale with level', () => {
    const one = contestTraits([], T('hothead'), { ...OPEN, angle: 'side' }, false);
    expect(one.mods.bigHit).toBeCloseTo(TRAIT_PTS.hothead);
    expect(one.mods.broken).toBeCloseTo(EDGE_COST.hothead);
    const three = contestTraits([], T('hothead', 3), OPEN, false);
    expect(three.mods.bigHit).toBeCloseTo(TRAIT_PTS.hothead * 2.2);
    expect(three.mods.broken).toBeCloseTo(EDGE_COST.hothead);
    expect(three.credit['big-hit']?.id).toBe('hothead');
  });
  it('no traits → no mods, no credit', () => {
    expect(contestTraits([], [], OPEN, true)).toEqual({ mods: {}, credit: {} });
  });
});

describe('contest odds with trait mods', () => {
  it('still sum to one, and a mod cannot create an outcome the situation forbids', () => {
    const o = contestOdds(0.5, { ...OPEN, support: true }, { broken: 0.2, fend: 0.1, offload: 0.1, bigHit: 0.1, strip: 0.05 });
    expect(o.held + o['big-hit'] + o.broken + o.fend + o.offload + o.strip).toBeCloseTo(1);
    expect(o.broken).toBeCloseTo(0.32);
    expect(contestOdds(0.5, OPEN, { offload: 0.5 }).offload).toBe(0);
    expect(contestOdds(0.5, { ...OPEN, defenders: 2 }, { strip: 0.5 }).strip).toBe(0);
  });
  it('step, intercept and kick helpers take the trait on top', () => {
    expect(stepChance(AVERAGE, AVERAGE, OPEN, 0.15)).toBeCloseTo(0.25);
    expect(interceptChance(50, false, 0.1)).toBeCloseTo(0.16);
    const st = stepTraits(T('dancingFeet', 2), T('hothead'), false);
    expect(st.bonus).toBeCloseTo(TRAIT_PTS.dancingFeet * 1.6 + EDGE_COST.hothead);
    expect(st.credit?.id).toBe('dancingFeet');
    expect(stepTraits(T('finisher'), [], true).credit?.id).toBe('finisher');
    expect(stepTraits([], [], true)).toEqual({ bonus: 0, credit: null });
    const it = interceptTraits([...T('poacher'), ...T('gambler')]);
    expect(it.bonus).toBeCloseTo(TRAIT_PTS.poacher + TRAIT_PTS.gambler);
    expect(it.gamble).toBe(true);
    expect(it.credit?.id).toBe('gambler');
    expect(interceptTraits(T('poacher')).gamble).toBe(false);
    expect(speedMult(T('jets', 3), 'jets')).toBeCloseTo(1 + TRAIT_PTS.jetsSpeed * 2.2);
    expect(speedMult([], 'lastLine')).toBe(1);
    const boot = bootMult(T('bigBoot'));
    expect(boot.dist).toBeCloseTo(1.1);
    expect(boot.acc).toBeCloseTo(0.85);
    // A Big Boot kick goes further than a plain one from the same spot.
    const plain = kickTarget({ x: 30, y: 34 }, 1, { x: 80, y: 34 }, 0.5);
    const big = kickTarget({ x: 30, y: 34 }, 1, { x: 80, y: 34 }, 0.5, boot);
    expect(big.x).toBeGreaterThan(plain.x);
    // A Playmaker's wider reach finds a receiver the normal pass can't.
    const cands = [{ idx: 1, pos: { x: 48, y: 48 }, busy: false }];
    expect(pickReceiver({ x: 50, y: 34 }, 1, cands)).toBeNull();
    expect(pickReceiver({ x: 50, y: 34 }, 1, cands, 15)).toBe(1);
  });
});

describe('traits in the live sim', () => {
  const SEEDS = 12;
  const SECS = 150;
  const control = events(sheet('H'), sheet('A'), SEEDS, SECS);

  it('a side of Dancing Feet III steps far more often, and the steps name the trait', () => {
    const es = events(sheet('H', () => T('dancingFeet', 3)), sheet('A'), SEEDS, SECS);
    expect(count(es, 'step', 'home')).toBeGreaterThan(count(control, 'step', 'home') * 1.8);
    const named = es.filter((e) => e.kind === 'step' && e.side === 'home');
    expect(named.length).toBeGreaterThan(0);
    expect(named.every((e) => e.trait === 'Dancing Feet III')).toBe(true);
    expect(control.some((e) => e.trait)).toBe(false);
  });
  it('Hitmen make more big hits; Wrecking Balls bust more and drive through held tackles', () => {
    const hit = events(sheet('H'), sheet('A', () => T('hitman', 3)), SEEDS, SECS);
    expect(count(hit, 'big-hit', 'away')).toBeGreaterThan(count(control, 'big-hit', 'away') * 1.4);
    expect(hit.some((e) => e.kind === 'big-hit' && e.trait === 'Hitman III')).toBe(true);
    const wreck = events(sheet('H', () => T('wreckingBall', 3)), sheet('A'), SEEDS, SECS);
    expect(count(wreck, 'break-tackle', 'home')).toBeGreaterThan(count(control, 'break-tackle', 'home') * 1.4);
    expect(wreck.some((e) => e.kind === 'tackle' && e.trait === 'Wrecking Ball III')).toBe(true);
  });
  it('the double-edged ones cut both ways: Gamblers pick off more and get burned; Razzle Dazzle offloads more and spills', () => {
    const gamb = events(sheet('H'), sheet('A', () => T('gambler', 3)), SEEDS * 2, SECS);
    const ctl2 = events(sheet('H'), sheet('A'), SEEDS * 2, SECS);
    expect(count(gamb, 'intercept', 'away')).toBeGreaterThan(count(ctl2, 'intercept', 'away'));
    expect(count(gamb, 'gamble', 'away')).toBeGreaterThan(0);
    expect(count(ctl2, 'gamble')).toBe(0);
    const razz = events(sheet('H', () => T('razzleDazzle', 3)), sheet('A'), SEEDS, SECS);
    expect(count(razz, 'offload', 'home')).toBeGreaterThan(count(control, 'offload', 'home') * 1.5);
    expect(razz.some((e) => e.kind === 'error' && e.text.includes('wild offload'))).toBe(true);
  });
  it('a Playmaker throws cut-out balls; a Big Boot is named on the kick', () => {
    const pm = events(sheet('H', (i) => (i === 5 || i === 4 ? T('playmaker', 3) : undefined)), sheet('A'), SEEDS * 3, SECS);
    expect(count(pm, 'cut-out', 'home')).toBeGreaterThan(0);
    expect(count(control, 'cut-out')).toBe(0);
    const boot = events(sheet('H', (i) => (i === 5 ? T('bigBoot', 2) : undefined)), sheet('A'), 4, SECS);
    // Big Boot shapes the long kicks and bombs (distance and accuracy); grubbers and chips are placement, not power.
    const kicks = boot.filter((e) => e.kind === 'kick' && e.side === 'home' && (e.detail === 'long' || e.detail === 'bomb'));
    expect(kicks.length).toBeGreaterThan(0);
    expect(kicks.every((e) => e.trait === 'Big Boot II')).toBe(true);
  });
  it('replays identically with traits, and an empty trait list is the same as none', () => {
    const traited = sheet('H', (i) => (i % 2 ? T('jets', 2) : T('lastLine')));
    const a = events(traited, sheet('A', () => T('brickWall')), 2, 60);
    expect(a).toEqual(events(traited, sheet('A', () => T('brickWall')), 2, 60));
    expect(events(sheet('H', () => []), sheet('A', () => []), 2, 60)).toEqual(events(sheet('H'), sheet('A'), 2, 60));
  });
});
