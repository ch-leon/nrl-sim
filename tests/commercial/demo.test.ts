import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEMO, DEMO_ENDED_TEXT, FIRST_RUN_KEY, GRANDFATHER_EXISTING_SAVES,
  demoAllowsAdvance, demoBlocked, initCommercial, isGrandfathered, recordFirstRun, setDemoSlot, slotEntitlements, __resetDemo,
} from '../../src/commercial/demo';
import { entitlementsFor, getEntitlementService, LocalStubProvider, __resetEntitlementService } from '../../src/commercial/entitlements';
import { __setCommercial } from '../../src/commercial/flags';
import { advanceUntil } from '../../src/core/advance';
import { bus, type Events } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { getSlotSummaries, slotKey, SAVE_KEY, CORRUPT_KEY } from '../../src/core/save';
import {
  advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, resumeWeek, weekHeld, TICK_ORDER,
} from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { plantPending } from '../../src/systems/events';
import { askBeforeAdvance } from '../../src/ui/decisions';
import { runSoak } from '../../src/qa/soak';
import { stubLocalStorage, type MemStorage } from './memStorage';

let storage: MemStorage;
let ended: Events['commercial:demoEnded'][];
let toasts: Events['ui:notify'][];

/** The first week the demo refuses (week n plays round n). */
const FIRST_LOCKED = DEMO.lastWeek + 1;

function listen(): void {
  ended = [];
  toasts = [];
  bus.on('commercial:demoEnded', (e) => ended.push(e));
  bus.on('ui:notify', (t) => toasts.push(t));
}

beforeEach(() => {
  storage = stubLocalStorage();
  __resetEntitlementService();
  __resetDemo();
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Demo Test', 7);
  initLeague(getState());
  __setCommercial(true);
  setDemoSlot(1);
  listen();
});

afterEach(() => {
  __setCommercial(null);
  __resetEntitlementService();
  __resetDemo();
  clearHeldWeek();
  vi.unstubAllGlobals();
});

describe('demoAllowsAdvance (#362)', () => {
  const demo = entitlementsFor('demo', 'stub');
  it('lets a demo club play season 1 to round DEMO.lastWeek, and no further', () => {
    expect(DEMO).toEqual({ season: 1, lastWeek: 3 });
    for (let week = 1; week <= DEMO.lastWeek; week++) expect(demoAllowsAdvance({ season: 1, week }, demo)).toBe(true);
    expect(demoAllowsAdvance({ season: 1, week: FIRST_LOCKED }, demo)).toBe(false);
    expect(demoAllowsAdvance({ season: 1, week: 20 }, demo)).toBe(false);
    expect(demoAllowsAdvance({ season: 2, week: 1 }, demo)).toBe(false);
  });

  it('never gates the full game', () => {
    expect(demoAllowsAdvance({ season: 1, week: 20 }, entitlementsFor('standard', 'stub'))).toBe(true);
    expect(demoAllowsAdvance({ season: 3, week: 1 }, entitlementsFor('allPlatforms', 'stub'))).toBe(true);
    expect(demoAllowsAdvance({ season: 1, week: 20 }, entitlementsFor('standard', 'grandfathered'))).toBe(true);
  });

  it('never gates with the flag off', () => {
    __setCommercial(false);
    expect(demoAllowsAdvance({ season: 2, week: 9 }, demo)).toBe(true);
  });
});

describe('demo gate on every advance (#362)', () => {
  it('stops Advance Week at the boundary, with commercial:demoEnded each refused tap', () => {
    for (let i = 0; i < 10; i++) advanceWeek();
    expect(getState()).toMatchObject({ season: 1, week: FIRST_LOCKED });
    expect(ended.length).toBe(10 - DEMO.lastWeek);
    expect(ended[0]).toEqual({ season: 1, week: FIRST_LOCKED });
  });

  it('stops fast forward (advanceWeeks) at the boundary, once', () => {
    advanceWeeks(10);
    expect(getState().week).toBe(FIRST_LOCKED);
    expect(ended).toEqual([{ season: 1, week: FIRST_LOCKED }]);
  });

  it('stops advance-until cleanly on the last demo week, with the demo\'s end and not a stop toast', async () => {
    initCommercial(1); // its toast until task 05's paywall
    const run = await advanceUntil({ kind: 'seasonEnd' }, async () => {});
    expect(run).toEqual({ weeksPlayed: DEMO.lastWeek, stop: { kind: 'demo', text: DEMO_ENDED_TEXT } });
    expect(getState().week).toBe(FIRST_LOCKED);
    expect(ended).toEqual([{ season: 1, week: FIRST_LOCKED }]);
    expect(toasts.map((t) => t.text)).toEqual([DEMO_ENDED_TEXT]);
  });

  it('a ▾ run started at the boundary plays nothing', async () => {
    advanceWeeks(DEMO.lastWeek);
    ended = [];
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {});
    expect(run.weeksPlayed).toBe(0);
    expect(run.stop.kind).toBe('demo');
    expect(getState().week).toBe(FIRST_LOCKED);
    expect(ended.length).toBe(1);
  });

  it('setting the stub to standard lets play go on at once, no reload', async () => {
    advanceWeeks(10);
    expect(getState().week).toBe(FIRST_LOCKED);
    (getEntitlementService() as unknown as { provider: LocalStubProvider }).provider.set('standard');
    advanceWeek();
    expect(getState().week).toBe(FIRST_LOCKED + 1);
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {});
    expect(run.stop.kind).toBe('target');
    expect(getState().week).toBe(FIRST_LOCKED + 5);
  });

  it('the dev console hook unlocks too', () => {
    const page: { __nrlEntitlements?: { set: (t: string) => void } } = {};
    vi.stubGlobal('window', page);
    advanceWeeks(10);
    page.__nrlEntitlements!.set('standard');
    advanceWeek();
    expect(getState().week).toBe(FIRST_LOCKED + 1);
  });

  it('never stops a held week: the last demo week\'s match finishes, then the gate shuts', () => {
    registerTickHook('hold', TICK_ORDER.match, (ctx) => { if (ctx.week === DEMO.lastWeek) ctx.hold?.(); });
    advanceWeeks(DEMO.lastWeek - 1);
    advanceWeek(); // the last demo week holds for its match
    expect(weekHeld()).toBe(true);
    advanceWeek(); // a tap mid-match is the held week's, not the gate's
    expect(ended).toEqual([]);
    resumeWeek();
    expect(weekHeld()).toBe(false);
    expect(getState().week).toBe(FIRST_LOCKED);
    advanceWeek();
    expect(ended.length).toBe(1);
  });

  it('a ▾ run waits for a held last demo week, then stops', async () => {
    registerTickHook('hold', TICK_ORDER.match, (ctx) => {
      if (ctx.week !== DEMO.lastWeek) return;
      ctx.hold?.();
      setTimeout(resumeWeek, 0); // the Worker's match ends
    });
    const run = await advanceUntil({ kind: 'seasonEnd' }, async () => {});
    expect(run).toMatchObject({ weeksPlayed: DEMO.lastWeek, stop: { kind: 'demo' } });
    expect(getState().week).toBe(FIRST_LOCKED);
  });

  it('Advance Week at the boundary goes straight to the gate, not the decisions ask', () => {
    advanceWeeks(DEMO.lastWeek);
    expect(plantPending('preseasonCamp')).toBe(true);
    const proceed = vi.fn(() => advanceWeek());
    askBeforeAdvance(1, proceed); // no DOM in this test: an ask would throw
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(ended.length).toBe(1);
  });
});

describe('grandfathered saves (#362)', () => {
  it('a career on the device before the first commercial run is never gated', () => {
    expect(GRANDFATHER_EXISTING_SAVES).toBe(true);
    recordFirstRun([{ slot: 1, status: 'ok', clubName: 'Demo Test', season: 2, week: 5 }, { slot: 2, status: 'empty' }], 1000);
    expect(JSON.parse(storage.map.get(FIRST_RUN_KEY)!)).toEqual({ at: 1000, slots: [{ slot: 1, clubName: 'Demo Test' }] });
    expect(slotEntitlements(getState())).toMatchObject({ tier: 'standard', source: 'grandfathered' });
    advanceWeeks(10);
    expect(getState().week).toBe(11);
    expect(ended).toEqual([]);
  });

  it('reads the slots from the saves themselves', () => {
    storage.map.set(slotKey(2), JSON.stringify(getState()));
    recordFirstRun(getSlotSummaries());
    __resetDemo(); // a later page load reads the key back
    expect(isGrandfathered(2, getState())).toBe(true);
    expect(isGrandfathered(1, getState())).toBe(false);
  });

  it('records the first run once: a game made after it is in the demo', () => {
    recordFirstRun([], 1000);
    recordFirstRun([{ slot: 1, status: 'ok', clubName: 'Demo Test' }], 2000);
    expect(JSON.parse(storage.map.get(FIRST_RUN_KEY)!)).toEqual({ at: 1000, slots: [] });
    advanceWeeks(10);
    expect(getState().week).toBe(FIRST_LOCKED);
  });

  it('a new career in a grandfathered slot (another club) is in the demo', () => {
    recordFirstRun([{ slot: 1, status: 'ok', clubName: 'Old Club' }]);
    expect(isGrandfathered(1, getState())).toBe(false);
    expect(isGrandfathered(1, { clubName: 'Old Club' })).toBe(true);
    expect(isGrandfathered(2, { clubName: 'Old Club' })).toBe(false);
    expect(demoBlocked({ ...getState(), week: FIRST_LOCKED })).toBe(true);
  });
});

describe('flag off: no gate, nothing new (#362)', () => {
  beforeEach(() => __setCommercial(false));

  it('advances past the demo on every path, with no event and no write', async () => {
    advanceWeeks(10);
    for (let i = 0; i < 3; i++) advanceWeek();
    await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {});
    expect(getState().week).toBe(18);
    expect(ended).toEqual([]);
    recordFirstRun([{ slot: 1, status: 'ok', clubName: 'Demo Test' }]);
    expect(storage.writes).toEqual([]);
  });

  it('plays a season exactly as with the full game, writing no key the game did not already write', () => {
    const played = (): unknown => {
      const r = runSoak({ seed: 1, seasons: 1, mode: 'managed' });
      return { ...r, ms: 0 };
    };
    const off = played();
    const offWrites = [...storage.writes];
    // The only keys the game writes: saves, the legacy and corrupt keys, the live match record, the iOS hint.
    const known = (k: string): boolean => /^nrl-sim-save-slot-\d$/.test(k) || k === SAVE_KEY || k === CORRUPT_KEY
      || /^nrl-live-match-\d$/.test(k) || k === 'nrlsim.iosInstallHintShown';
    expect(offWrites.filter((k) => !known(k))).toEqual([]);

    // The same season with the flag on and the full game: the gate rolls no dice.
    __setCommercial(true);
    new LocalStubProvider().set('standard');
    __resetEntitlementService();
    expect(played()).toEqual(off);
  }, 120_000);
});

describe('the gate needs the state (#362)', () => {
  it('reads the club\'s own week, so a loaded save past the boundary is gated', () => {
    setState({ week: 12 });
    advanceWeek();
    expect(getState().week).toBe(12);
    expect(ended).toEqual([{ season: 1, week: 12 }]);
  });
});
