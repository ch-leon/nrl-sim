import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { demolishFacility, moveFacility, PlacementController, upgradeFacility } from '../../src/world/placement';

const replay = vi.hoisted(() => ({ pending: false }));
vi.mock('../../src/systems/parkedLeagueFixture', () => ({ awaitingCampReplay: () => replay.pending }));

beforeEach(() => {
  replay.pending = false;
  bus.clear();
  createNewGame('Checkpoint club', 710);
  setState({ money: 100_000, facilities: [{ id: 'gym', defId: 'weightsRoom', level: 1, x: 2, y: 2, constructionSpend: 15_000 }] });
});
afterEach(() => { replay.pending = false; bus.clear(); });

describe('facilities while an away-player club replay owns the checkpoint', () => {
  it('refuses move, upgrade and demolition without emitting false finance or success events', () => {
    const before = structuredClone(getState());
    const events: unknown[] = [];
    bus.on('money:changed', e => events.push(e));
    bus.on('ui:notify', e => events.push(e));
    replay.pending = true;
    expect(moveFacility('gym', 8, 8)).toEqual({ ok: false, reason: 'busy' });
    expect(upgradeFacility('gym')).toBe(false);
    expect(demolishFacility('gym')).toBeNull();
    expect(getState()).toEqual(before);
    expect(events).toEqual([]);
  });

  it('refuses the scene placement callback before touching pathing or offering Undo', () => {
    const controller = new PlacementController(
      {} as ConstructorParameters<typeof PlacementController>[0],
      {} as ConstructorParameters<typeof PlacementController>[1],
      { cellToWorld: () => ({ x: 0, y: 0 }), depth: () => 0 },
    );
    (controller as unknown as { defId: string }).defId = 'trainingPaddock';
    replay.pending = true;
    expect(controller.confirm()).toEqual({ ok: false, reason: 'busy' });
  });
});
