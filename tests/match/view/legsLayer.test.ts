// tests/match/view/legsLayer.test.ts — legs left on screen (BAK-208 §8).
import { describe, it, expect } from 'vitest';
import { legsBand, legsMarks } from '../../../src/match/view/legsLayer';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';
import { FATIGUE } from '../../../src/match/league/fatigue';
import { LiveSim } from '../../../src/match/league/live';
import type { TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const sheet = (id: string): TeamSheet => ({
  clubId: id,
  name: id,
  attack: 60,
  defense: 60,
  kicking: 60,
  fitness: 60,
  colors: ['#111', '#eee'],
  roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60 } })),
});
const P = (side: 'home' | 'away', slot: number, extra: Partial<PlayerSnap> = {}): PlayerSnap => ({ side, slot, x: 50, y: 30, pose: 'run', headX: 1, speed: 7, ...extra });
const snap = (players: PlayerSnap[]): Snapshot => ({ tick: 1, players, ball: { x: 0, y: 30, lift: 1, holder: null }, label: '', events: [] });

describe('legsMarks', () => {
  it('a bar for everyone on the field, banded by the fatigue thresholds', () => {
    const m = legsMarks(
      snap([P('home', 0, { legs: 0.9 }), P('home', 1, { legs: 0.3 }), P('away', 0, { legs: 0.1 }), P('away', 1, { legs: 0.5, binned: true }), P('away', 2)]),
      FATIGUE,
    );
    expect(m.map((x) => [x.side, x.slot, x.band])).toEqual([
      ['home', 0, 'fresh'],
      ['home', 1, 'tired'],
      ['away', 0, 'spent'],
    ]);
  });
  it('bands switch exactly at tiredAt and spentAt', () => {
    expect(legsBand(FATIGUE.tiredAt, FATIGUE)).toBe('fresh');
    expect(legsBand(FATIGUE.tiredAt - 0.001, FATIGUE)).toBe('tired');
    expect(legsBand(FATIGUE.spentAt, FATIGUE)).toBe('tired');
    expect(legsBand(FATIGUE.spentAt - 0.001, FATIGUE)).toBe('spent');
  });
  it('the live sim reports every player’s legs in its snapshot', () => {
    const sim = new LiveSim(sheet('H'), sheet('A'), 7);
    for (let i = 0; i < 400; i++) sim.step();
    const s = sim.snapshot();
    expect(s.players.every((p) => typeof p.legs === 'number' && p.legs > 0 && p.legs <= 1)).toBe(true);
  });
});
