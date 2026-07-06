import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPlayer, removePlayer, addFacility, spendMoney, earnMoney,
} from '../../src/data/club';
import { createNewGame, getState, setState, type Player } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';
import { generatePlayer } from '../../src/data/player';
import { bus } from '../../src/core/events';
import { SQUAD_CAP, SQUAD_MIN, GRID_W, GRID_H } from '../../src/config';

const gen = (seed: number): Player => generatePlayer(makeRng(seed));

beforeEach(() => {
  bus.clear();
  createNewGame('Test Club', 1);
});

describe('addPlayer', () => {
  it('adds under cap and emits player:signed', () => {
    let signed: Player | null = null;
    bus.on('player:signed', (p) => { signed = p; });
    const before = getState().squad.length;
    const p = gen(500);
    expect(addPlayer(p)).toBe(true);
    expect(getState().squad).toHaveLength(before + 1);
    expect(signed).toEqual(p);
  });

  it('rejects at SQUAD_CAP without mutating', () => {
    // Fill to cap.
    while (getState().squad.length < SQUAD_CAP) addPlayer(gen(getState().squad.length + 1000));
    expect(getState().squad).toHaveLength(SQUAD_CAP);
    let emitted = false;
    bus.on('player:signed', () => { emitted = true; });
    expect(addPlayer(gen(9999))).toBe(false);
    expect(getState().squad).toHaveLength(SQUAD_CAP);
    expect(emitted).toBe(false);
  });
});

describe('removePlayer', () => {
  it('removes an existing player above SQUAD_MIN', () => {
    const id = getState().squad[0]!.id;
    expect(removePlayer(id)).toBe(true);
    expect(getState().squad.some((p) => p.id === id)).toBe(false);
  });

  it('returns false for an unknown id', () => {
    expect(removePlayer('does-not-exist')).toBe(false);
  });

  it('fails at exactly SQUAD_MIN (boundary)', () => {
    // Trim squad down to SQUAD_MIN.
    while (getState().squad.length > SQUAD_MIN) {
      removePlayer(getState().squad[0]!.id);
    }
    expect(getState().squad).toHaveLength(SQUAD_MIN);
    const id = getState().squad[0]!.id;
    expect(removePlayer(id)).toBe(false);
    expect(getState().squad).toHaveLength(SQUAD_MIN);
  });
});

describe('addFacility', () => {
  it('places within bounds, emits facility:placed, returns the instance', () => {
    let placed = false;
    bus.on('facility:placed', () => { placed = true; });
    const f = addFacility('weightsRoom', 0, 0);
    expect(f).not.toBeNull();
    expect(f!.defId).toBe('weightsRoom');
    expect(f!.level).toBe(1);
    expect(getState().facilities).toContainEqual(f);
    expect(placed).toBe(true);
  });

  it('accepts an explicit level', () => {
    const f = addFacility('academy', 1, 1, 3);
    expect(f!.level).toBe(3);
  });

  it('advances rngSeed so ids are deterministic and unique', () => {
    const seedBefore = getState().rngSeed;
    const a = addFacility('canteen', 0, 0);
    const b = addFacility('canteen', 2, 0);
    expect(getState().rngSeed).not.toBe(seedBefore);
    expect(a!.id).not.toBe(b!.id);
  });

  it('rejects negative origin', () => {
    expect(addFacility('canteen', -1, 0)).toBeNull();
    expect(addFacility('canteen', 0, -1)).toBeNull();
  });

  it('rejects a footprint that overflows the grid', () => {
    // grandstand is 3x3.
    expect(addFacility('grandstand', GRID_W - 2, 0)).toBeNull();
    expect(addFacility('grandstand', 0, GRID_H - 2)).toBeNull();
  });

  it('accepts a footprint flush against the grid edge', () => {
    const f = addFacility('grandstand', GRID_W - 3, GRID_H - 3);
    expect(f).not.toBeNull();
  });
});

describe('spendMoney', () => {
  it('deducts and emits money:changed with correct delta/balance', () => {
    let payload: { delta: number; reason: string; balance: number } | null = null;
    bus.on('money:changed', (p) => { payload = p; });
    const before = getState().money;
    expect(spendMoney(5000, 'signing')).toBe(true);
    expect(getState().money).toBe(before - 5000);
    expect(payload).toEqual({ delta: -5000, reason: 'signing', balance: before - 5000 });
  });

  it('returns false and leaves money unchanged when insufficient', () => {
    setState({ money: 100 });
    let emitted = false;
    bus.on('money:changed', () => { emitted = true; });
    expect(spendMoney(200, 'too much')).toBe(false);
    expect(getState().money).toBe(100);
    expect(emitted).toBe(false);
  });

  it('allows spending exactly the full balance', () => {
    setState({ money: 100 });
    expect(spendMoney(100, 'all-in')).toBe(true);
    expect(getState().money).toBe(0);
  });
});

describe('earnMoney', () => {
  it('credits and emits money:changed with positive delta', () => {
    let payload: { delta: number; reason: string; balance: number } | null = null;
    bus.on('money:changed', (p) => { payload = p; });
    const before = getState().money;
    earnMoney(7500, 'sponsor');
    expect(getState().money).toBe(before + 7500);
    expect(payload).toEqual({ delta: 7500, reason: 'sponsor', balance: before + 7500 });
  });
});
