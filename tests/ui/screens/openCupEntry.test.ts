import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../../src/core/events';
import { __setStorage, __unlockSaves, installImportedSave, loadSlot, setActiveSlot } from '../../../src/core/save';
import { getState, loadState } from '../../../src/core/state';
import { slotKey } from '../../../src/core/storageKeys';
import { leagueSeasonView } from '../../../src/systems/leagueSeasonView';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../../../src/core/time';
import { registerAllSystems } from '../../../src/qa/soak';
import { closeModal, closeScreen } from '../../../src/ui/dom';
import { openFixturesScreen } from '../../../src/ui/screens/fixtures';
import { openOpenCupEntry } from '../../../src/ui/screens/openCupEntry';
import { stubDocument, StubNode } from '../stubDom';

let bytes: Map<string, string>;
let storageFails: boolean;
function install(fixture = 'au-week-6', slot = 1) {
  const input = readFileSync(new URL(`../../fixtures/saves/league-career/v32-${fixture}.json`, import.meta.url), 'utf8');
  const installed = installImportedSave(input, slot);
  if (!installed.ok) throw Error(installed.message);
  setActiveSlot(slot);
  loadState(installed.state);
}

const dialog = () => openOpenCupEntry() as unknown as StubNode;
const action = (d: StubNode, id: string) => d.querySelector(`[data-open-cup-action="${id}"]`)!;
const offer = () => getState().competitions!.openCupEntry!.current;

beforeEach(() => {
  stubDocument();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  bytes = new Map();
  storageFails = false;
  __setStorage({
    getItem: k => bytes.get(k) ?? null,
    setItem: (k, v) => {
      if (storageFails && k === slotKey(1)) throw Error('save unavailable');
      bytes.set(k, v);
    },
    removeItem: k => { bytes.delete(k); },
  });
  __unlockSaves();
  install();
});

afterEach(() => {
  closeModal();
  closeScreen();
  clearHeldWeek();
  clearSeasonHooks();
  clearTickHooks();
  bus.clear();
  __setStorage(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Open Cup entry', () => {
  it('offers details from League, with free entry and no pre-draw opponents or byes', () => {
    const league = openFixturesScreen() as unknown as StubNode;
    expect(league.querySelector('[data-open-cup-card]')?.words()).toMatch(/Open Cup.*No decision yet/);
    const original = structuredClone(getState());
    for (let i = 0; i < 2; i++) {
      const d = dialog();
      expect(d.words()).toMatch(/Free entry.*Week 6/);
      expect(d.words()).toMatch(/Week 7.*Week 10.*Week 13.*Week 16.*Week 19/);
      expect(d.words()).toContain('league match base (M)');
      expect(d.words()).toMatch(/whole club.*Nines/);
      expect(d.words()).toMatch(/unanswered.*other clubs still play/i);
      expect(d.querySelector('[data-open-cup-bracket]')).toBeNull();
      closeModal();
    }
    expect(getState()).toEqual(original);
  });

  it('returns focus to Cup details even if another control had browser focus at open', () => {
    vi.stubGlobal('HTMLElement', StubNode);
    const league = openFixturesScreen() as unknown as StubNode;
    const trigger = league.querySelector('[data-open-cup-details]')!;
    const oldFocus = new StubNode('button');
    document.body.append(oldFocus as unknown as HTMLElement);
    Object.assign(document, { activeElement: oldFocus });
    const returned = vi.spyOn(trigger, 'focus');
    const wrong = vi.spyOn(oldFocus, 'focus');
    trigger.click();
    closeModal();
    expect(returned).toHaveBeenCalledOnce();
    expect(wrong).not.toHaveBeenCalled();
  });

  it('saves entry and allows an immediate change from the refreshed dialog', () => {
    const d = dialog();
    action(d, 'enter').click();
    expect(offer().choice).toBe('enter');
    action(d, 'decline').click();
    expect(offer().choice).toBe('decline');
    expect(loadSlot(1)).toMatchObject({ status: 'ok', state: getState() });
  });

  it('refreshes after a byte-identical slot switch and waits for a new action', () => {
    const d = dialog();
    const copy = installImportedSave(JSON.stringify(getState()), 2);
    if (!copy.ok) throw Error(copy.message);
    setActiveSlot(2);
    loadState(copy.state);
    const unchanged = new Map(bytes);
    action(d, 'enter').click();
    expect(d.querySelector('[data-open-cup-status]')?.words()).toMatch(/career changed.*review/i);
    expect(bytes).toEqual(unchanged);
    expect(offer().choice).toBe('unanswered');
    action(d, 'enter').click();
    expect(offer().choice).toBe('enter');
    expect(bytes.get(slotKey(1))).toBe(unchanged.get(slotKey(1)));
  });

  it('preserves the choice after a save failure and supports an explicit retry', () => {
    const d = dialog();
    const unchanged = new Map(bytes);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageFails = true;
    action(d, 'enter').click();
    expect(d.querySelector('[data-open-cup-status]')?.words()).toMatch(/could not be saved.*try again/i);
    expect(offer().choice).toBe('unanswered');
    expect(bytes).toEqual(unchanged);
    storageFails = false;
    action(d, 'enter').click();
    expect(offer().choice).toBe('enter');
  });

  it('shows an expired AI-only draw without putting those matches in the League calendar', () => {
    registerAllSystems();
    withFastForward(() => advanceWeek());
    expect(getState().week).toBe(7);
    const before = structuredClone(getState());
    const d = dialog();
    const cupId = offer().instanceId;
    expect(d.words()).toMatch(/Registration closed.*No decision.*23 clubs/i);
    expect(d.querySelector('[data-open-cup-bracket]')?.querySelectorAll('[data-open-cup-fixture]').length).toBeGreaterThan(0);
    expect(leagueSeasonView(getState())?.fixtures.some(row => row.instance.id === cupId)).toBe(false);
    expect(getState()).toEqual(before);
  });

  it('shows why a migrated late save missed the window and omits entry controls', () => {
    install('au-week-7');
    const d = dialog();
    expect(d.words()).toMatch(/window had already closed.*next season/i);
    expect(action(d, 'enter')).toBeNull();
    expect(d.querySelector('[data-open-cup-bracket]')).toBeNull();
  });

  it('offers no cup choices before the first league is accepted', () => {
    install('au-initial-choice');
    const screen = openFixturesScreen() as unknown as StubNode;
    expect(screen.querySelector('[data-open-cup-card]')).toBeNull();
    expect(action(dialog(), 'enter')).toBeNull();
  });
});
