import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bus } from '../../../src/core/events';
import { __setStorage, __unlockSaves, installImportedSave, setActiveSlot } from '../../../src/core/save';
import { getState, loadState, newCardWeek } from '../../../src/core/state';
import { completeCamp, departForCamp } from '../../../src/systems/playerAssignments';
import { closeModal, closeScreen } from '../../../src/ui/dom';
import { openFixturesScreen } from '../../../src/ui/screens/fixtures';
import { openLineupScreen } from '../../../src/ui/screens/lineup';
import { playerPageModel, squadNumbers } from '../../../src/ui/screens/player';
import { StubNode, stubDocument } from '../stubDom';

const fixture = readFileSync(new URL('../../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8');
const bytes = new Map<string, string>();

function install(input = fixture, slot = 1): void {
  const result = installImportedSave(input, slot);
  if (!result.ok) throw Error(result.message);
  setActiveSlot(slot);
  loadState(result.state);
}

function openCamp(): StubNode {
  const league = openFixturesScreen() as unknown as StubNode;
  const card = league.querySelector('[data-camp-card]');
  expect(card?.words()).toMatch(/Skills Camp.*Week 4/i);
  card!.querySelector('[data-camp-details]')!.click();
  return document.querySelector('[data-camp-dialog]') as unknown as StubNode;
}

function book(dialog: StubNode): string {
  const id = choosePlayer(dialog);
  dialog.querySelector('[data-camp-review]')!.click();
  dialog.querySelector('[data-camp-confirm]')!.click();
  return id;
}

function choosePlayer(dialog: StubNode): string {
  const player = getState().squad[0]!;
  const select = dialog.querySelector('[data-camp-player]') as StubNode & { onchange: () => void };
  select.value = player.id;
  select.onchange();
  return player.id;
}

beforeEach(() => {
  stubDocument();
  vi.stubGlobal('HTMLElement', StubNode);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  bytes.clear();
  __setStorage({ getItem: key => bytes.get(key) ?? null, setItem: (key, value) => { bytes.set(key, value); }, removeItem: key => { bytes.delete(key); } });
  __unlockSaves();
  install();
});

afterEach(() => {
  closeModal();
  closeScreen();
  bus.clear();
  __setStorage(null);
  vi.unstubAllGlobals();
});

it('reviews the named cover, fixture and development before committing a camp booking', () => {
  const original = structuredClone(getState());
  const d = openCamp();
  const id = choosePlayer(d);
  expect(d.words()).toMatch(/Week 5.*Bendigo Bellbirds/);
  expect(d.words()).toMatch(/Starter.*covers/i);
  expect(d.querySelector('[data-fatigue-event-preview]')).toBeNull();
  expect(d.words()).toMatch(/70 base XP.*expected/i);
  expect(d.querySelector('[data-camp-confirm]')).toBeNull();
  d.querySelector('[data-camp-review]')!.click();
  expect(getState()).toEqual(original);
  d.querySelector('[data-camp-confirm]')!.click();
  expect(getState().competitions?.assignments?.[0]).toMatchObject({ status: 'booked', booking: { participantId: id } });
});

it('shows the fresh camp entrant at zero for the returning League match through booking review', () => {
  const state = getState();
  loadState({ ...state, cardWeek: newCardWeek(855) });
  const d = openCamp();
  const id = choosePlayer(d);
  const text = d.querySelector(`[data-fatigue-event-preview="${id}"]`)!.words();
  expect(text).toMatch(/Fatigue 0 → 20 at the event\. Kicks off Round 2 v .+ on 0, at 100% energy\./);
  d.querySelector('[data-camp-review]')!.click();
  expect(d.querySelector(`[data-fatigue-event-preview="${id}"]`)!.words()).toBe(text);
  expect(d.querySelector('[data-camp-confirm]')?.getAttribute('aria-describedby')).toBe('nrl-booking-fatigue');
});

it('disarms an exact preview after a career switch and waits for another review', () => {
  const d = openCamp();
  choosePlayer(d);
  d.querySelector('[data-camp-review]')!.click();
  install(JSON.stringify(getState()), 2);
  const original = new Map(bytes);
  d.querySelector('[data-camp-confirm]')!.click();
  expect(d.querySelector('[data-camp-status]')?.words()).toMatch(/career changed|review/i);
  expect(d.querySelector('[data-camp-confirm]')).toBeNull();
  expect(bytes).toEqual(original);
});

it('hides camp focus in manual mode and explains the automatic fallback', () => {
  const s = getState();
  loadState({ ...s, settings: { ...s.settings, spendPointsMyself: true } });
  const d = openCamp();
  choosePlayer(d);
  expect(d.querySelector('[data-camp-focus]')).toBeNull();
  expect(d.words()).toMatch(/spend.*manually.*club training focus/i);
});


it('shows the missed booking window when loading a legacy Week 5 save', () => {
  install(readFileSync(new URL('../../fixtures/saves/v33-assignments/v33-au-week-5.json', import.meta.url), 'utf8'));
  const league = openFixturesScreen() as unknown as StubNode;
  expect(league.querySelector('[data-camp-card]')?.textContent).toContain('Booking closed');
  league.querySelector('[data-camp-details]')!.click();
  const dialog = document.querySelector('[data-camp-dialog]') as unknown as StubNode;
  expect(dialog.querySelector('[data-camp-review]')).toBeNull();
  expect(dialog.textContent).toContain('next season');
  expect(getState().competitions?.assignments ?? []).toEqual([]);
});

it('reopens a saved return report without changing the receipt or player', () => {
  const d = openCamp();
  book(d);
  closeModal();
  closeScreen();
  const departed = departForCamp({ ...getState(), week: 5 });
  const returned = completeCamp({ ...departed, week: 6 });
  loadState(returned);
  const unchanged = new Map(bytes);
  const league = openFixturesScreen() as unknown as StubNode;
  for (let i = 0; i < 2; i++) {
    league.querySelector('[data-camp-details]')!.click();
    const report = document.querySelector('[data-camp-report]') as unknown as StubNode;
    expect(report?.textContent).toMatch(/Returned before Week 6.*XP.*new level points/);
    expect(report?.textContent).toMatch(/banked points spent.*points remaining/);
    closeModal();
  }
  expect(getState()).toBe(returned);
  expect(bytes).toEqual(unchanged);
});


it('keeps a camper registered with a named absence and prevents selecting him from the lineup', () => {
  const id = book(openCamp());
  closeModal();
  closeScreen();
  const away = departForCamp({ ...getState(), week: 5 });
  loadState(away);
  const participant = away.squad.find(p => p.id === id)!;
  const model = playerPageModel(participant, { kind: 'squad' }, away);
  expect(model.assignment).toMatch(/Skills Camp.*Back Week 6/);
  expect(model.roles?.starter).toBe(false);
  expect(model.actions.find(a => a.id === 'release')).toMatchObject({ enabled: false, why: expect.stringMatching(/Skills Camp/) });
  expect(squadNumbers(away).has(id)).toBe(false);

  openLineupScreen();
  const body = document.body as unknown as StubNode;
  const slot = away.lineup.starters.indexOf(id);
  expect(body.querySelector(`[data-spot="s${slot}"]`)?.words()).toMatch(/Skills Camp.*covers/);
  // Phase 1: candidates only list in the Swap panel, so start a swap on another starter first.
  body.querySelector('[data-swap-start]')!.click();
  body.querySelector(`[data-spot="s${slot === 0 ? 1 : 0}"]`)!.click();
  const row = body.querySelector(`[data-camp-absence="${id}"]`)!;
  expect(row.textContent).toContain('Skills Camp');
  row.click();
  expect(getState().lineup).toEqual(away.lineup);
});

it('reports the club training focus used when a manual booking returns in automatic mode', () => {
  const state = getState();
  loadState({ ...state, settings: { ...state.settings, spendPointsMyself: true } });
  book(openCamp());
  closeModal();
  closeScreen();
  const away = departForCamp({ ...getState(), week: 5 });
  const returned = completeCamp({ ...away, week: 6, training: { focus: 'stamina' },
    settings: { ...away.settings, spendPointsMyself: false } });
  expect(returned.competitions?.assignments?.[0]).toMatchObject({ booking: { focus: null }, award: { mode: 'auto', focus: 'stamina' } });
  loadState(returned);
  const league = openFixturesScreen() as unknown as StubNode;
  league.querySelector('[data-camp-details]')!.click();
  const report = document.querySelector('[data-camp-report]') as unknown as StubNode;
  expect(report?.textContent).toMatch(/club training focus at return.*Stamina/i);
});

it('previews the player’s current values and ceilings for the four shown stats', () => {
  const state = getState();
  const original = state.squad[0]!;
  const player = { ...original,
    stats: { ...original.stats, strength: 67.25, stamina: 74 },
    ceilings: { ...original.ceilings, strength: 80.5, stamina: 74 },
  };
  loadState({ ...state, squad: [player, ...state.squad.slice(1)] });
  const dialog = openCamp();
  choosePlayer(dialog);
  const limits = dialog.querySelector('[data-camp-limits]');
  expect(limits).not.toBeNull();
  expect(limits!.querySelectorAll('[data-camp-limit]').map(row => row.getAttribute('data-camp-limit')))
    .toEqual(['strength', 'stamina', 'speed', 'footyIQ']);
  expect(limits!.querySelector('[data-camp-limit="strength"]')?.words()).toMatch(/Strength.*67\.25.*80\.5/);
  expect(limits!.querySelector('[data-camp-limit="stamina"]')?.words()).toMatch(/Stamina.*74.*74.*At ceiling/i);
  expect(dialog.querySelector('[data-camp-focus]')?.querySelector('[value="stamina"]')).toBeNull();
});

it('explains that an all-capped player can earn points without immediate stat gains', () => {
  const state = getState();
  const original = state.squad[0]!;
  const player = { ...original, ceilings: { ...original.stats } };
  loadState({ ...state, squad: [player, ...state.squad.slice(1)] });
  const dialog = openCamp();
  choosePlayer(dialog);
  expect(dialog.querySelector('[data-camp-limits]')?.words() ?? '').toMatch(/all shown stats.*at their ceilings.*points.*stay banked/i);
});
