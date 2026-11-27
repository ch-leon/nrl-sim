import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { migrateState } from '../../src/core/save';
import { getState, loadState, newCardWeek, setState, type GameState } from '../../src/core/state';
import { openSquadScreen } from '../../src/ui/screens/squad';
import { openNextMatch } from '../../src/ui/screens/fixtures';
import { chooseOpenCupEntry, closeOpenCupRegistration, previewOpenCupEntry } from '../../src/systems/openCupEntry';
import { isOpenCupInstance } from '../../src/systems/openCup';
import { startCardWeek } from '../../src/systems/cardWeek';
import { openLineupScreen } from '../../src/ui/screens/lineup';
import { FATIGUE_LEGEND, fatigueEventText } from '../../src/ui/weeklyFatigue';
import { closeModal, closeScreen } from '../../src/ui/dom';
import { previewWeeklyFatigue } from '../../src/systems/fatiguePreview';
import { CAMP_RULES } from '../../src/data/playerAssignments';
import { completeCamp, departForCamp, changeCampBooking, currentSkillsCamp } from '../../src/systems/playerAssignments';
import { addBonusEventFatigue, applyMatchWeeklyFatigue, recoverWeeklyFatigue, weeklyFatigueOf } from '../../src/systems/weeklyFatigue';
import { StubNode, stubDocument } from './stubDom';
import { bus } from '../../src/core/events';

function career() {
  const original = JSON.parse(readFileSync(new URL('../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8'));
  const migrated = migrateState(original);
  if (!migrated.ok) throw new Error(migrated.message);
  return { ...migrated.state, facilities: [], cardWeek: newCardWeek(855) } satisfies GameState;
}
function meters(root = document.body) {
  return Array.from(root.querySelectorAll('[data-weekly-fatigue]'));
}
beforeEach(() => {
  stubDocument();
  vi.stubGlobal('HTMLElement', StubNode);
});
afterEach(() => { closeModal(); closeScreen(); bus.clear(); vi.unstubAllGlobals(); });

it('names the next saved League opponent after camp and predicts a fresh player returning at full energy', () => {
  const state = career();
  const playerId = state.squad[0]!.id;
  const camp = currentSkillsCamp(state)!;
  const book = changeCampBooking(state, camp.id, camp.revision, { kind: 'book', participantId: playerId, focus: 'balanced' });
  if (!book.ok) throw new Error(book.message);

  const preview = previewWeeklyFatigue(book.state, { week: camp.rules.departureWeek, playerId })!;
  const league = state.competitions!.instances.find(i => i.definition.format.kind === 'league' && i.entrantIds.includes(state.clubId))!;
  const fixture = league.fixtures.find(f => f.status === 'scheduled' && f.slot! > camp.rules.departureWeek
    && [f.homeId, f.awayId].includes(state.clubId))!;
  const opponent = state.league.clubs.find(c => [fixture.homeId, fixture.awayId].includes(c.id) && c.id !== state.clubId)!;
  expect(preview.league).toMatchObject({ id: fixture.id, week: fixture.slot, label: `Round ${fixture.round} v ${opponent.name}` });
  expect(preview.event?.players.get(playerId)).toMatchObject({ before: 0, after: 20 });
  const away = departForCamp({ ...book.state, week: CAMP_RULES.departureWeek });
  const returned = completeCamp({ ...recoverWeeklyFatigue(away), week: CAMP_RULES.returnWeek });
  expect(preview.kickoff?.[playerId] ?? 0).toBe(weeklyFatigueOf(recoverWeeklyFatigue(returned), playerId));
});

it('uses both built facilities at every recovery and keeps immediate event load separate', () => {
  const base = career();
  const playerId = base.squad[0]!.id;
  const state: GameState = { ...base, week: CAMP_RULES.departureWeek, cardWeek: { ...base.cardWeek, weeklyFatigue: { [playerId]: 78 } },
    facilities: [{ id: 'pt', defId: 'physioCentre', level: 3, x: 0, y: 0 }, { id: 'mb', defId: 'medicalBay', level: 2, x: 4, y: 4 }] };
  const preview = previewWeeklyFatigue(state, { week: state.week, playerId })!;
  expect(preview.event?.players.get(playerId)).toMatchObject({ before: 54, after: 74 });
  expect(preview.kickoff?.[playerId]).toBe(50);
  expect(fatigueEventText(preview, playerId)).toMatch(/Fatigue 54 → 74 at the event.*on 50, at 80% energy.*Injury risk raised \(above 60\)/);
  expect(weeklyFatigueOf(state, playerId)).toBe(78);
});

it('renders labelled live bars for the whole Squad and picked Lineup, including strict risk bands', () => {
  const state = career();
  const [a, b, c, d] = state.lineup.starters.map(id => state.squad.find(p => p.id === id)!);
  loadState({ ...state, cardWeek: { ...state.cardWeek, weeklyFatigue: { [a!.id]: 60, [b!.id]: 61, [c!.id]: 80, [d!.id]: 81 } } });
  openSquadScreen('list');
  expect((document.body as unknown as StubNode).words()).toContain(FATIGUE_LEGEND);
  expect(meters()).toHaveLength(state.squad.length);
  for (const [p, value, band] of [[a!, 60, /normal injury risk/i], [b!, 61, /raised injury risk/i], [c!, 80, /raised injury risk/i], [d!, 81, /high injury risk/i]] as const) {
    const bar = document.querySelector(`[data-weekly-fatigue="${p.id}"]`)!;
    expect(bar.getAttribute('aria-label')).toContain(p.name);
    expect(bar.getAttribute('aria-valuenow')).toBe(String(value));
    expect(bar.getAttribute('aria-valuetext')).toMatch(band);
  }
  setState({ cardWeek: { ...getState().cardWeek!, weeklyFatigue: {} } });
  const value = () => document.querySelector(`[data-weekly-fatigue="${d!.id}"]`)!.getAttribute('aria-valuenow');
  expect(value()).toBe('0');
  setState({ cardWeek: applyMatchWeeklyFatigue(getState(), true, [d!.id], []).cardWeek! });
  expect(value()).toBe('30');
  setState({ cardWeek: addBonusEventFatigue(getState(), [d!.id]).cardWeek! });
  expect(value()).toBe('50');
  setState({ cardWeek: recoverWeeklyFatigue(getState()).cardWeek! });
  expect(value()).toBe('30');
  openLineupScreen();
  expect(meters()).toHaveLength(state.lineup.starters.filter(Boolean).length + state.lineup.bench.filter(Boolean).length);
  expect((document.querySelector('.nrl-lineup') as unknown as StubNode).words()).toMatch(/Starts at 100% energy/);
  (document.querySelector('[data-side-tab="reserves"]') as unknown as StubNode).click();
  const bench = new Set(state.lineup.bench.filter(Boolean));
  expect(meters()).toHaveLength(state.squad.filter(p => !bench.has(p.id)).length);
});

it('leaves the Squad and Lineup without fatigue content in an ordinary career', () => {
  const { cardWeek: _card, ...state } = career();
  loadState(state);
  expect(previewWeeklyFatigue(state)).toBeUndefined();
  openSquadScreen('list');
  expect(meters()).toHaveLength(0);
  openLineupScreen();
  expect(meters()).toHaveLength(0);
});


it('previews the chosen trial and drawn Cup starters before the match, with interchange conditional', () => {
  const base = career();
  const state = startCardWeek(base, base.cardWeek);
  const offer = previewOpenCupEntry(state);
  if (!offer.ok) throw Error(offer.message);
  const entered = chooseOpenCupEntry(state, { offerId: offer.preview.offerId, previewKey: offer.preview.previewKey, choice: 'enter' });
  if (!entered.ok) throw Error(entered.message);
  const beforeDraw = migrateState(JSON.parse(readFileSync(new URL('../fixtures/saves/v34-challenges/v34-au-week-6.json', import.meta.url), 'utf8')));
  if (!beforeDraw.ok) throw Error(beforeDraw.message);
  const saved = beforeDraw.state;
  expect(saved.week).toBe(offer.preview.deadline - 1);
  const drawn = closeOpenCupRegistration({
    ...saved, cardWeek: state.cardWeek!,
    competitions: { ...saved.competitions!, openCupEntry: entered.state.competitions!.openCupEntry! },
  });
  const cup = drawn.competitions!.instances.find(isOpenCupInstance)!;
  const tie = cup.fixtures.find(f => f.status === 'scheduled' && [f.homeId, f.awayId].includes(state.clubId))!;
  expect(tie, 'the saved draw has a club tie').toBeDefined();
  for (const waiting of [state, { ...drawn, week: tie.slot! }]) {
    loadState(waiting);
    const preview = previewWeeklyFatigue(waiting)!;
    expect(preview.event?.fixture?.week).toBe(waiting.week);
    const panel = openNextMatch(waiting) as unknown as StubNode;
    const entrants = panel.querySelectorAll('[data-fatigue-event-preview]').map(row => row.words());
    expect(entrants).toHaveLength(preview.event!.players.size);
    expect(entrants.length).toBeGreaterThan(0);
    expect(entrants.some(line => /Fatigue 0 → 20.*Kicks off Round.*100% energy/.test(line))).toBe(true);
    expect(entrants.some(line => /If used: Fatigue/.test(line))).toBe(true);
    closeModal();
  }
});
