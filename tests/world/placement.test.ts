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
