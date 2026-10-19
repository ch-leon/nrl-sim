import { describe, it, expect, beforeEach } from 'vitest';
import { validatePlacement, footprintTiles, reasonText } from '../../src/world/placement';
import { createNewGame, getState, setState } from '../../src/core/state';
import { FACILITY_CATALOG } from '../../src/data/facility';
import { bus } from '../../src/core/events';
import { GRID_W, GRID_H } from '../../src/config';

beforeEach(() => {
  bus.clear();
  createNewGame('Test Club', 1);
});

describe('footprintTiles', () => {
  it('enumerates every tile of a w×h footprint, row-major from the origin', () => {
    const def = FACILITY_CATALOG.trainingPaddock; // 2×2
    expect(footprintTiles(def, 3, 4)).toEqual([
      { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 3, y: 5 }, { x: 4, y: 5 },
    ]);
  });

  it('handles non-square footprints (sponsorBoard 2×1)', () => {
    const def = FACILITY_CATALOG.sponsorBoard; // 2×1
    expect(footprintTiles(def, 0, 0)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 },
    ]);
  });
});

describe('validatePlacement — bounds', () => {
  it('accepts a footprint fully inside the grid', () => {
    expect(validatePlacement(getState(), 'trainingPaddock', 0, 0)).toEqual({ ok: true });
  });

  it('rejects negative origins as out-of-bounds', () => {
    expect(validatePlacement(getState(), 'trainingPaddock', -1, 0)).toEqual({
      ok: false, reason: 'out-of-bounds',
    });
    expect(validatePlacement(getState(), 'trainingPaddock', 0, -1)).toEqual({
      ok: false, reason: 'out-of-bounds',
    });
  });

  it('rejects a footprint that spills past the far edge (exclusive x+w / y+h)', () => {
    // 2×2 at the very corner spills one row/col over.
    expect(validatePlacement(getState(), 'trainingPaddock', GRID_W - 1, 0)).toEqual({
      ok: false, reason: 'out-of-bounds',
    });
    expect(validatePlacement(getState(), 'trainingPaddock', 0, GRID_H - 1)).toEqual({
      ok: false, reason: 'out-of-bounds',
    });
  });

  it('accepts a footprint flush against the far edge', () => {
    // 2×2 at (GRID_W-2, GRID_H-2) exactly fills to the boundary.
    expect(
      validatePlacement(getState(), 'trainingPaddock', GRID_W - 2, GRID_H - 2),
    ).toEqual({ ok: true });
  });
});

describe('validatePlacement — overlap', () => {
  it('rejects a footprint that intersects an existing facility', () => {
    setState({
      facilities: [{ id: 'a', defId: 'trainingPaddock', level: 1, x: 5, y: 5 }],
    });
    // Overlaps at (5,5)..(6,6): a 2×2 at (6,6) shares (6,6).
    expect(validatePlacement(getState(), 'weightsRoom', 6, 6)).toEqual({
      ok: false, reason: 'overlap',
    });
  });

  it('accepts a footprint that abuts but does not overlap', () => {
    setState({
      facilities: [{ id: 'a', defId: 'trainingPaddock', level: 1, x: 5, y: 5 }],
    });
    // Existing occupies (5,5)..(6,6). Placing at (7,5) starts one tile clear.
    expect(validatePlacement(getState(), 'weightsRoom', 7, 5)).toEqual({ ok: true });
  });
});

describe('validatePlacement — funds', () => {
  it('rejects when money is below the build cost', () => {
    const def = FACILITY_CATALOG.grandstand; // cost 120000
    setState({ money: def.cost - 1 });
    expect(validatePlacement(getState(), 'grandstand', 0, 0)).toEqual({
      ok: false, reason: 'insufficient-funds',
    });
  });

  it('accepts when money exactly equals the build cost', () => {
    const def = FACILITY_CATALOG.grandstand;
    setState({ money: def.cost });
    expect(validatePlacement(getState(), 'grandstand', 0, 0)).toEqual({ ok: true });
  });
});

describe('validatePlacement — reason ordering', () => {
  it('reports out-of-bounds before overlap or funds', () => {
    setState({ money: 0, facilities: [] });
    expect(validatePlacement(getState(), 'trainingPaddock', -1, -1)).toEqual({
      ok: false, reason: 'out-of-bounds',
    });
  });

  it('reports overlap before insufficient-funds', () => {
    setState({
      money: 0,
      facilities: [{ id: 'a', defId: 'trainingPaddock', level: 1, x: 0, y: 0 }],
    });
    expect(validatePlacement(getState(), 'trainingPaddock', 0, 0)).toEqual({
      ok: false, reason: 'overlap',
    });
  });
});

describe('reasonText', () => {
  it('maps each machine reason to non-empty human copy', () => {
    expect(reasonText('out-of-bounds')).toBeTruthy();
    expect(reasonText('overlap')).toBeTruthy();
    expect(reasonText('insufficient-funds')).toBeTruthy();
  });

  it('falls back for an unknown reason', () => {
    expect(reasonText('???')).toBeTruthy();
  });
});

describe('validatePlacement — unique facilities', () => {
  it('blocks a second Sponsor Board or Grandstand but allows a second non-unique facility', () => {
    setState({
      money: 1_000_000,
      facilities: [
        { id: 'a', defId: 'sponsorBoard', level: 1, x: 0, y: 0 },
        { id: 'b', defId: 'grandstand', level: 1, x: 10, y: 10 },
        { id: 'c', defId: 'trainingPaddock', level: 1, x: 20, y: 0 },
      ],
    });
    expect(validatePlacement(getState(), 'sponsorBoard', 4, 4)).toEqual({ ok: false, reason: 'duplicate' });
    expect(validatePlacement(getState(), 'grandstand', 4, 14)).toEqual({ ok: false, reason: 'duplicate' });
    expect(validatePlacement(getState(), 'trainingPaddock', 4, 4)).toEqual({ ok: true });
    expect(reasonText('duplicate')).not.toBe(reasonText('???'));
  });
});

// ── Move and demolish (GitHub #78) ───────────────────────────────────────────
import {
  moveFee, facilitySpend, demolishRefund, validateMove, moveFacility, demolishFacility,
} from '../../src/world/placement';
import type { PlacedFacility } from '../../src/core/state';

const placed = (over: Partial<PlacedFacility> & Pick<PlacedFacility, 'id' | 'defId'>): PlacedFacility =>
  ({ level: 1, x: 0, y: 0, ...over });

describe('move and demolish prices', () => {
  it('move fee is 10% of the build cost; refund is 30% of build plus upgrades', () => {
    const def = FACILITY_CATALOG.weightsRoom; // $15,000
    expect(moveFee(def)).toBe(1_500);
    expect(facilitySpend(def, 1)).toBe(15_000);
    expect(facilitySpend(def, 3)).toBe(15_000 + 30_000 + 45_000);
    expect(demolishRefund(def, 1)).toBe(4_500);
    expect(demolishRefund(def, 3)).toBe(27_000);
  });
});

describe('validateMove', () => {
  it('ignores its own footprint and its own uniqueness, but not others', () => {
    const gym = placed({ id: 'a', defId: 'weightsRoom', x: 2, y: 2 });
    const board = placed({ id: 'b', defId: 'sponsorBoard', x: 10, y: 10 });
    setState({ facilities: [gym, board], money: 100_000 });
    expect(validateMove(getState(), gym, 3, 2)).toEqual({ ok: true }); // overlaps only itself
    expect(validateMove(getState(), board, 12, 10)).toEqual({ ok: true }); // unique, but it's the same one
    expect(validateMove(getState(), gym, 9, 9)).toEqual({ ok: false, reason: 'overlap' });
    expect(validateMove(getState(), gym, GRID_W - 1, 0)).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('needs the move fee, not the build cost', () => {
    const gym = placed({ id: 'a', defId: 'weightsRoom', x: 2, y: 2 });
    setState({ facilities: [gym], money: 1_500 });
    expect(validateMove(getState(), gym, 8, 8)).toEqual({ ok: true });
    setState({ money: 1_499 });
    expect(validateMove(getState(), gym, 8, 8)).toEqual({ ok: false, reason: 'insufficient-funds' });
  });
});

describe('moveFacility', () => {
  it('keeps the id and level, moves it and charges the fee through the ledger', () => {
    setState({ facilities: [placed({ id: 'a', defId: 'weightsRoom', level: 3, x: 2, y: 2 })], money: 10_000 });
    const moves: { delta: number; reason: string }[] = [];
    bus.on('money:changed', ({ delta, reason }) => moves.push({ delta, reason }));
    expect(moveFacility('a', 8, 9)).toEqual({ ok: true, fee: 1_500 });
    expect(getState().facilities).toEqual([{ id: 'a', defId: 'weightsRoom', level: 3, x: 8, y: 9 }]);
    expect(getState().money).toBe(8_500);
    expect(moves).toEqual([{ delta: -1_500, reason: 'move:weightsRoom' }]);
  });

  it('putting it back on its own spot is free; an invalid move changes nothing', () => {
    const gym = placed({ id: 'a', defId: 'weightsRoom', x: 2, y: 2 });
    const other = placed({ id: 'b', defId: 'canteen', x: 6, y: 6 });
    setState({ facilities: [gym, other], money: 10_000 });
    expect(moveFacility('a', 2, 2)).toEqual({ ok: true, fee: 0 });
    expect(moveFacility('a', 6, 6)).toEqual({ ok: false, reason: 'overlap' });
    expect(moveFacility('zzz', 1, 1)).toEqual({ ok: false, reason: 'missing' });
    expect(getState().facilities).toEqual([gym, other]);
    expect(getState().money).toBe(10_000);
  });
});

describe('demolishFacility', () => {
  it('removes it, frees its tiles and refunds 30% through the ledger', () => {
    setState({ facilities: [placed({ id: 'a', defId: 'weightsRoom', level: 2, x: 2, y: 2 })], money: 0 });
    const moves: { delta: number; reason: string }[] = [];
    bus.on('money:changed', ({ delta, reason }) => moves.push({ delta, reason }));
    expect(demolishFacility('a')).toBe(13_500); // 30% of 15k + 30k
    expect(getState().facilities).toEqual([]);
    expect(getState().money).toBe(13_500);
    expect(moves).toEqual([{ delta: 13_500, reason: 'demolish:weightsRoom' }]);
    setState({ money: 50_000 });
    expect(validatePlacement(getState(), 'weightsRoom', 2, 2)).toEqual({ ok: true });
    expect(demolishFacility('a')).toBeNull();
  });
});
