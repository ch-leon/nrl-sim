import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from './stubDom';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import * as saves from '../../src/core/save';
import { closeModal, closeScreen } from '../../src/ui/dom';
import { initMatchReport } from '../../src/ui/screens/matchReport';
import { openLineupScreen } from '../../src/ui/screens/lineup';
import { openPlayerPage } from '../../src/ui/screens/player';
import { openPlaybookScreen } from '../../src/ui/screens/playbook';
import * as portraits from '../../src/art/portrait';
import { openKitDesigner } from '../../src/ui/screens/kit';
import { openFacilityPopup } from '../../src/ui/screens/build';
import { upgradeCost, FACILITY_CATALOG } from '../../src/data/facility';
import { registerFinanceSystem } from '../../src/systems/economy';
import { currentOffer, commitUndo } from '../../src/systems/undo';

const body = (): StubNode => document.body as unknown as StubNode;
function tap(selector: string): void {
  const node = body().querySelector(selector);
  expect(node).not.toBeNull(); node!.click();
}

beforeEach(() => {
  bus.clear(); commitUndo(); stubDocument();
  Object.assign(document, { createElementNS: (_ns: string, tag: string) => document.createElement(tag) });
  createNewGame('UI Ownership FC', 526);
  vi.spyOn(saves, 'save').mockImplementation(() => {});
  vi.spyOn(portraits, 'portraitDataUrl').mockReturnValue('');
  vi.spyOn(portraits, 'encodeCanvas').mockReturnValue('');
});
afterEach(() => { closeModal(); closeScreen(); bus.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('screens call their owners without reapplying effects', () => {
  it('the Lineup auto pick saves once and a player-page role saves once, with no toast or Undo', () => {
    const notify = vi.fn(); bus.on('ui:notify', notify);
    openLineupScreen(); vi.mocked(saves.save).mockClear();
    tap('[data-auto-pick]');
    expect(saves.save).toHaveBeenCalledTimes(1);
    closeScreen();
    const id = getState().lineup.starters[0]!;
    const player = getState().squad.find((p) => p.id === id)!;
    openPlayerPage(player, { kind: 'squad' }); vi.mocked(saves.save).mockClear();
    tap('[data-player-role="captain"]');
    expect(getState().lineup.captain).toBe(player.id);
    expect(saves.save).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
  });

  it('the Playbook pick saves once and does not toast or charge again', () => {
    setState({ playbook: { owned: ['block-play'] } });
    const before = getState().money;
    const notify = vi.fn(); const movement = vi.fn();
    bus.on('ui:notify', notify); bus.on('money:changed', movement);
    openPlaybookScreen();
    tap('[data-play-take="block-play"]');
    expect(getState().lineup.plays).toEqual(['block-play']); expect(getState().money).toBe(before);
    expect(saves.save).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled(); expect(movement).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
  });

  it('the facility popup upgrades once through the placement owner, with one charge, finance booking and toast', () => {
    const f = { id: 'f', defId: 'trainingPaddock' as const, level: 1 as const, x: 0, y: 0 };
    setState({ facilities: [f] }); registerFinanceSystem();
    const before = getState(); const cost = upgradeCost(FACILITY_CATALOG.trainingPaddock, 2);
    const notify = vi.fn(); const movement = vi.fn();
    bus.on('ui:notify', notify); bus.on('money:changed', movement);
    openFacilityPopup(f);
    tap('.nrl-facility-upgrade');
    expect(getState().facilities[0]!.level).toBe(2);
    expect(getState().money).toBe(before.money - cost);
    expect(getState().finance[0]!.facilities).toBe(before.finance[0]!.facilities - cost);
    expect(notify).toHaveBeenCalledTimes(1); expect(movement).toHaveBeenCalledTimes(1);
    expect(saves.save).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
  });
  it('the kit designer confirms with one toast and no immediate save', () => {
    const notify = vi.fn(); const changed = vi.fn();
    bus.on('ui:notify', notify); bus.on('state:changed', changed);
    openKitDesigner();
    tap('.nrl-kit-save');
    expect(getState().kit).toBeDefined();
    expect(changed).toHaveBeenCalledTimes(1); expect(notify).toHaveBeenCalledTimes(1);
    expect(saves.save).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
  });

  it('the full-time listener records one award before downstream listeners and unsubscribes without leaving an award listener', () => {
    const notify = vi.fn(); bus.on('ui:notify', notify);
    const off = initMatchReport();
    const observed: number[] = [];
    bus.on('match:finished', () => observed.push(getState().potmTally?.counts.Amy ?? 0));
    const event = {
      fixture: { round: 1, homeId: 'player', awayId: 'rival' },
      result: { homeScore: 4, awayScore: 0, events: [{ t: 1, kind: 'try' as const, teamId: 'player', player: 'Amy' }],
        stats: { possession: [50, 50] as [number, number], tackles: [0, 0] as [number, number],
          errors: [0, 0] as [number, number], tries: [1, 0] as [number, number] },
        weather: 'clear' as const, injuries: [], momentumTimeline: [] },
    };
    bus.emit('match:finished', event);
    expect(getState().potmTally).toEqual({ season: 1, counts: { Amy: 1 } });
    expect(observed).toEqual([1]);
    off(); bus.emit('match:finished', event);
    expect(getState().potmTally).toEqual({ season: 1, counts: { Amy: 1 } });
    expect(saves.save).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
  });

});
