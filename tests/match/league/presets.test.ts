// tests/match/league/presets.test.ts — team tactics (BAK-208 §5, D): the zone
// plans as data, rival styles from identity, and the sim playing them so that
// Grind and Expansive look different while Balanced stays in the §7 bands.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import {
  ATTACK_PRESETS, DEFAULT_TACTICS, DEFENCE_PRESETS, attackPlan, defencePlan, rivalTactics, tacticsLabel, zoneOf, type AttackPreset, type DefencePreset,
} from '../../../src/match/league/presets';
import { teamSheetFromRival } from '../../../src/sim/engine';
import type { TeamSheet } from '../../../src/sim/events';
import type { SimEvent } from '../../../src/match/core/snapshot';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(id: string, attack: AttackPreset = 'balanced', defence: DefencePreset = 'slide', base = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: base,
    defense: base,
    kicking: base,
    fitness: base,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: base, strength: base, stamina: 50, skill: base, footyIQ: base } })),
    tactics: { attack, defence },
  };
}
function events(home: TeamSheet, away: TeamSheet, seeds: number, seconds: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let s = 1; s <= seeds; s++) {
    const sim = new LiveSim(home, away, s);
    for (let i = 0; i < seconds * 20; i++) {
      sim.step();
      out.push(...sim.snapshot().events);
    }
  }
  return out;
}
const count = (es: SimEvent[], kind: string, side?: 'home' | 'away', detail?: string): number =>
  es.filter((e) => e.kind === kind && (side === undefined || e.side === side) && (detail === undefined || e.detail === detail)).length;

describe('presets (pure)', () => {
  it('splits the field into five zones from the attacking side', () => {
    expect(zoneOf(95)).toBe('own20');
    expect(zoneOf(70)).toBe('ownHalf');
    expect(zoneOf(50)).toBe('midfield');
    expect(zoneOf(30)).toBe('attackingHalf');
    expect(zoneOf(10)).toBe('redZone');
  });
  it('Balanced is the sim default; Grind forbids offloads and tucks it; Expansive wants width and offloads', () => {
    const b = attackPlan('balanced', 'midfield');
    expect(b).toMatchObject({ pass: 0, offload: 1, step: 1, cutOut: 0, width: 0, hitUps: 0, edges: 0 });
    expect(attackPlan('balanced', 'own20').offload).toBeLessThan(1);
    const g = attackPlan('grind', 'midfield');
    expect(g.offload).toBe(0);
    expect(g.step).toBeLessThan(1);
    expect(g.pass).toBeLessThan(0);
    expect(g.hitUps).toBeGreaterThan(0);
    expect(g.kickBias.long).toBeGreaterThan(1);
    expect(attackPlan('grind', 'redZone').offload).toBeGreaterThan(0); // even grinders chance it on the line
    const e = attackPlan('expansive', 'attackingHalf');
    expect(e.offload).toBeGreaterThan(1);
    expect(e.width).toBeGreaterThan(0);
    expect(e.cutOut).toBeGreaterThan(0);
    expect(e.edges).toBeGreaterThan(0);
    expect(attackPlan('kick-chase', 'ownHalf').earlyTerritory).toBeGreaterThan(0);
    expect(attackPlan('kick-chase', 'midfield').kickBias.bomb).toBeGreaterThan(1);
    for (const a of ATTACK_PRESETS) {
      const plan = attackPlan(a, 'redZone');
      expect(plan.step).toBeGreaterThan(0);
      expect(plan.earlyKick).toBeGreaterThanOrEqual(0);
    }
  });
  it('Slide is neutral; Rush is quick, eager and gets stepped; Compressed bunches and holds', () => {
    expect(defencePlan('slide')).toMatchObject({ lineSpeed: 5, commit: 0, pull: 1, bigHit: 0, broken: 0, stepAgainst: 0 });
    const r = defencePlan('rush');
    expect(r.lineSpeed).toBeGreaterThan(5);
    expect(r.commit).toBe(1);
    expect(r.bigHit).toBeGreaterThan(0);
    expect(r.broken).toBeGreaterThan(0);
    expect(r.stepAgainst).toBeGreaterThan(0);
    const c = defencePlan('compressed');
    expect(c.pull).toBeGreaterThan(1);
    expect(c.broken).toBeLessThan(0);
    expect(c.lineSpeed).toBeLessThan(5);
    for (const d of DEFENCE_PRESETS) expect(defencePlan(d).lineSpeed).toBeGreaterThan(3);
  });
  it('rivals get a fixed style from identity: contenders attack, strugglers grind', () => {
    const strong = rivalTactics({ id: 'rival-reapers', strength: 78 });
    expect(['expansive', 'all-out', 'balanced']).toContain(strong.attack);
    const weak = rivalTactics({ id: 'rival-larrikins', strength: 35 });
    expect(['grind', 'kick-chase', 'balanced']).toContain(weak.attack);
    expect(rivalTactics({ id: 'x', strength: 60 })).toEqual(rivalTactics({ id: 'x', strength: 60 }));
    const styles = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => tacticsLabel(rivalTactics({ id, strength: 60 }))));
    expect(styles.size).toBeGreaterThan(2);
    expect(teamSheetFromRival({ id: 'rival-wolves', name: 'W', colors: ['#000', '#fff'], strength: 71 }).tactics).toBeDefined();
    expect(tacticsLabel(DEFAULT_TACTICS)).toBe('Balanced / Slide');
  });
});

describe('tactics in the live sim', () => {
  const SEEDS = 12;
  const SECS = 150;
  const away = sheet('A');

  it('Grind and Expansive look different: offloads and cut-outs for the wide side, long kicks and fewer offloads for the grinders', () => {
    // Four times the seeds: cut-outs and steps are rare enough that a couple of dozen short matches is within the noise.
    const grind = events(sheet('H', 'grind'), away, SEEDS * 4, SECS);
    const wide = events(sheet('H', 'expansive'), away, SEEDS * 4, SECS);
    expect(count(wide, 'offload', 'home')).toBeGreaterThan(count(grind, 'offload', 'home') * 2);
    expect(count(wide, 'cut-out', 'home')).toBeGreaterThan(count(grind, 'cut-out', 'home'));
    const longShare = (es: SimEvent[]): number => count(es, 'kick', 'home', 'long') / Math.max(1, count(es, 'kick', 'home'));
    expect(longShare(grind)).toBeGreaterThan(longShare(wide));
    expect(count(grind, 'step', 'home')).toBeLessThan(count(wide, 'step', 'home'));
  });
  it('a Kick-chase side kicks more often and bombs more; All-out offloads most of all', () => {
    // Kick-chase on both sides against Balanced on both, over 10-minute matches: one side's
    // extra kicks in a 2½-minute window are within the noise.
    const bal = events(sheet('H'), away, SEEDS + 4, SECS * 4);
    const kc = events(sheet('H', 'kick-chase'), sheet('A', 'kick-chase'), SEEDS + 4, SECS * 4);
    expect(count(kc, 'kick')).toBeGreaterThan(count(bal, 'kick'));
    expect(count(kc, 'kick', undefined, 'bomb')).toBeGreaterThan(count(bal, 'kick', undefined, 'bomb'));
    // Six times the seeds: offloads in 2½ minutes are few, and All-out's doubling needs ~70 matches to clear the noise.
    const allOut = events(sheet('H', 'all-out'), away, SEEDS * 6, SECS);
    const balShort = events(sheet('H'), away, SEEDS * 6, SECS);
    expect(count(allOut, 'offload', 'home')).toBeGreaterThan(count(balShort, 'offload', 'home') * 1.5);
  });
  it('a Rush defence makes more big hits but concedes more busts and steps than Slide', () => {
    // Four times the seeds: busts and steps are rarer than big hits, and every new dice roll (2e's penalties) reshuffles a small sample.
    const slide = events(sheet('H'), sheet('A', 'balanced', 'slide'), SEEDS * 4, SECS);
    const rush = events(sheet('H'), sheet('A', 'balanced', 'rush'), SEEDS * 4, SECS);
    expect(count(rush, 'big-hit', 'away')).toBeGreaterThan(count(slide, 'big-hit', 'away') * 1.15);
    expect(count(rush, 'break-tackle', 'home') + count(rush, 'step', 'home')).toBeGreaterThan(count(slide, 'break-tackle', 'home') + count(slide, 'step', 'home'));
  });
  it('Balanced v Balanced stays in the §7 bands per three minutes', () => {
    // Twenty three-minute windows: about one try a window, and ten is within the noise.
    const es = events(sheet('H'), away, 20, 180);
    const perMatch = (kind: string): number => count(es, kind) / 20;
    expect(perMatch('tackle') + perMatch('big-hit')).toBeGreaterThan(18);
    expect(perMatch('tackle') + perMatch('big-hit')).toBeLessThan(45);
    expect(perMatch('try')).toBeGreaterThan(0.4);
    expect(perMatch('try')).toBeLessThan(3);
    expect(perMatch('kick')).toBeGreaterThan(1.5);
    expect(perMatch('error')).toBeLessThan(5);
  });
  it('sheets without tactics play Balanced / Slide and the sim exposes what each side is playing', () => {
    const { tactics: _drop, ...bare } = sheet('H');
    const sim = new LiveSim(bare, sheet('A', 'grind', 'rush'), 1);
    expect(sim.tactics.home).toEqual(DEFAULT_TACTICS);
    expect(sim.tactics.away).toEqual({ attack: 'grind', defence: 'rush' });
  });
});
