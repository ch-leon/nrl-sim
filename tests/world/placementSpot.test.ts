import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePlacement,
  validateMove,
  validCells,
  suggestSpot,
  besidePath,
  overlapping,
  reasonText,
  fits,
} from '../../src/world/placement';
import { onEntrancePath, autoPaths } from '../../src/world/path';
import { migrateState } from '../../src/core/save';
import { createNewGame, getState, setState, SAVE_VERSION, type PlacedFacility } from '../../src/core/state';
import { FACILITY_CATALOG, type FacilityDefId } from '../../src/data/facility';
import { bus } from '../../src/core/events';
import { GRID_W, GRID_H } from '../../src/config';

const MID = Math.floor(GRID_W / 2); // the entrance column

beforeEach(() => {
  bus.clear();
  createNewGame('Test Club', 1);
  setState({ money: 1_000_000 });
});

const place = (...fs: Omit<PlacedFacility, 'level'>[]): void =>
  setState({ facilities: fs.map((f) => ({ level: 1, ...f })) });

describe("validatePlacement — 'path' (#395)", () => {
  it('refuses a footprint covering the entrance path, with its own message', () => {
    expect(validatePlacement(getState(), 'trainingPaddock', MID, 5)).toEqual({ ok: false, reason: 'path' });
    expect(validatePlacement(getState(), 'trainingPaddock', MID - 1, 5)).toEqual({ ok: false, reason: 'path' });
    expect(validatePlacement(getState(), 'trainingPaddock', MID + 1, 5)).toEqual({ ok: true });
    expect(validatePlacement(getState(), 'trainingPaddock', MID - 2, 5)).toEqual({ ok: true });
    expect(reasonText('path')).toBe('Keep the entrance path clear.');
  });

  it('applies to moves too, but an old-save facility already on the path can stay', () => {
    place({ id: 'old', defId: 'trainingPaddock', x: MID, y: 5 }); // a save from before #395
    const f = getState().facilities[0]!;
    expect(validateMove(getState(), f, MID, 8)).toEqual({ ok: false, reason: 'path' });
    expect(validateMove(getState(), f, 2, 2).ok).toBe(true);
    // It still blocks overlap as usual.
    expect(validatePlacement(getState(), 'weightsRoom', MID - 1, 6)).toEqual({ ok: false, reason: 'overlap' });
  });

  it('bounds and overlap still come first', () => {
    expect(validatePlacement(getState(), 'trainingPaddock', MID, GRID_H - 1).reason).toBe('out-of-bounds');
  });
});

describe('validCells (#395)', () => {
  it('lists every origin where the footprint fits, money aside, never over the entrance path', () => {
    setState({ money: 0 });
    const cells = validCells(getState(), 'trainingPaddock');
    // 2×2 on a 20×20 grid: 19 columns of origins minus the two that cover x = MID, × 19 rows.
    expect(cells).toHaveLength((GRID_W - 1 - 2) * (GRID_H - 1));
    for (const c of cells) {
      expect(onEntrancePath(c.x, c.y) || onEntrancePath(c.x + 1, c.y)).toBe(false);
      expect(fits(validatePlacement(getState(), 'trainingPaddock', c.x, c.y))).toBe(true);
    }
  });

  it('leaves out spots under existing facilities; a move ignores the facility itself', () => {
    place({ id: 'a', defId: 'trainingPaddock', x: 2, y: 2 });
    const build = validCells(getState(), 'weightsRoom');
    expect(build.some((c) => c.x === 2 && c.y === 2)).toBe(false);
    expect(build.some((c) => c.x === 1 && c.y === 1)).toBe(false); // would overlap (2,2)
    const move = validCells(getState(), 'trainingPaddock', { ignoreId: 'a' });
    expect(move.some((c) => c.x === 2 && c.y === 2)).toBe(true);
  });

  it('is empty for a unique facility already built', () => {
    place({ id: 'g', defId: 'grandstand', x: 2, y: 2 });
    expect(FACILITY_CATALOG.grandstand.unique).toBe(true);
    expect(validCells(getState(), 'grandstand')).toEqual([]);
  });
});

describe('suggestSpot (#395)', () => {
  it('picks the free spot nearest the middle of the screen', () => {
    const spot = suggestSpot(getState(), 'trainingPaddock', { x: 4.5, y: 4.5 });
    expect(spot).toEqual({ x: 4, y: 4 }); // footprint centre (4.5, 4.5)
  });

  it('never picks the entrance path, and prefers a spot beside it when the distance ties', () => {
    // Screen centred on the entrance column: the nearest spots sit either side of it.
    const spot = suggestSpot(getState(), 'trainingPaddock', { x: MID, y: 9.5 })!;
    expect(spot).not.toBeNull();
    expect(onEntrancePath(spot.x, spot.y) || onEntrancePath(spot.x + 1, spot.y)).toBe(false);
    expect(besidePath(FACILITY_CATALOG.trainingPaddock, spot.x, spot.y)).toBe(true);
    expect(Math.abs(spot.x + 0.5 - MID)).toBeLessThanOrEqual(2);
  });

  it('steps around what is already built', () => {
    place({ id: 'a', defId: 'trainingPaddock', x: 4, y: 4 });
    const spot = suggestSpot(getState(), 'weightsRoom', { x: 4.5, y: 4.5 })!;
    expect(validatePlacement(getState(), 'weightsRoom', spot.x, spot.y).ok).toBe(true);
    expect(Math.hypot(spot.x + 0.5 - 4.5, spot.y + 0.5 - 4.5)).toBeLessThanOrEqual(2.5);
  });

  it('still suggests a spot when money is short (the bar says what is missing)', () => {
    setState({ money: 0 });
    expect(suggestSpot(getState(), 'teamGym', { x: 5, y: 5 })).not.toBeNull();
  });

  it('is null when nothing fits, and deterministic otherwise', () => {
    place({ id: 'g', defId: 'grandstand', x: 2, y: 2 });
    expect(suggestSpot(getState(), 'grandstand', { x: 5, y: 5 })).toBeNull();
    const a = suggestSpot(getState(), 'canteen', { x: 13.2, y: 7.7 });
    expect(suggestSpot(getState(), 'canteen', { x: 13.2, y: 7.7 })).toEqual(a);
  });

  it('every facility gets a spot on a fresh grounds wherever the view is', () => {
    for (const defId of Object.keys(FACILITY_CATALOG) as FacilityDefId[]) {
      for (const centre of [{ x: 0, y: 0 }, { x: MID, y: MID }, { x: GRID_W, y: GRID_H }]) {
        const spot = suggestSpot(getState(), defId, centre)!;
        expect(validatePlacement(getState(), defId, spot.x, spot.y).ok).toBe(true);
      }
    }
  });
});

describe('overlapping (#395)', () => {
  it('names the facility in the way, ignoring the one being moved', () => {
    place({ id: 'a', defId: 'teamGym', x: 2, y: 2 });
    expect(overlapping(getState(), 'trainingPaddock', 3, 3)?.defId).toBe('teamGym');
    expect(overlapping(getState(), 'trainingPaddock', 6, 6)).toBeUndefined();
    expect(overlapping(getState(), 'teamGym', 3, 3, 'a')).toBeUndefined();
  });
});

describe('old saves (#395)', () => {
  const saves = import.meta.glob('../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

  it('a save with a facility on the entrance path still loads, keeps it there, and gets footpaths', () => {
    const raw = structuredClone(saves['../fixtures/saves/v19-mid-season.json']) as { facilities: PlacedFacility[] };
    raw.facilities = [
      { id: 'onpath', defId: 'trainingPaddock', level: 1, x: MID - 1, y: 5 }, // covers the entrance column
      { id: 'canteen', defId: 'canteen', level: 1, x: 3, y: 3 },
    ];
    const res = migrateState(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.version).toBe(SAVE_VERSION);
    expect(res.state.facilities.map((f) => [f.id, f.x, f.y])).toEqual([['onpath', MID - 1, 5], ['canteen', 3, 3]]);
    const paths = autoPaths(res.state.facilities);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.some((c) => c.x >= MID - 1 && c.x <= MID && c.y >= 5 && c.y <= 6)).toBe(false);
    // Moving it is still possible, just not along the path; putting it back is a no-op move.
    setState(res.state);
    const f = getState().facilities[0]!;
    expect(validateMove(getState(), f, 2, 12).ok).toBe(true);
  });

  it('every fixture save still yields deterministic footpaths', () => {
    for (const raw of Object.values(saves)) {
      const res = migrateState(structuredClone(raw));
      expect(res.ok).toBe(true);
      if (!res.ok) continue;
      expect(autoPaths(res.state.facilities)).toEqual(autoPaths(res.state.facilities));
    }
  });
});
