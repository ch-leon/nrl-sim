import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import { advanceUntil } from '../../src/core/advance';
import { bus } from '../../src/core/events';
import { __setStorage, installImportedSave, setActiveSlot } from '../../src/core/save';
import { getState, loadState } from '../../src/core/state';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { closingEventOpportunities } from '../../src/systems/eventOpportunities';
import { registerFixturesSystem } from '../../src/systems/fixtures';

function install(): void {
  const bytes = new Map<string,string>();
  __setStorage({getItem:key=>bytes.get(key) ?? null, setItem:(key,value)=>{bytes.set(key,value);},removeItem:key=>{bytes.delete(key);}});
  setActiveSlot(1);
  const raw = readFileSync(new URL('../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8');
  const saved = installImportedSave(raw, 1);
  if (!saved.ok) throw Error(saved.message);
  loadState(saved.state);
  registerFixturesSystem();
}
afterEach(()=>{clearHeldWeek(); clearSeasonHooks(); clearTickHooks(); bus.clear(); __setStorage(null);});
it('stops before ticking the final camp booking week without altering career state', async () => {
  install(); const before = JSON.stringify(getState());
  expect(await advanceUntil({kind:'weeks',weeks:4})).toMatchObject({weeksPlayed:0,stop:{kind:'event-deadline'}});
  expect(JSON.stringify(getState())).toBe(before);
});
it('a deliberate camp skip can play that week and still stops for the next unacknowledged event', async () => {
  install();
  const seen = new Set(closingEventOpportunities(getState(), 1).map(e=>e.key));
  expect(await advanceUntil({kind:'weeks',weeks:4}, async()=>{}, seen)).toMatchObject({weeksPlayed:1,stop:{kind:'event-deadline'}});
  expect(getState().week).toBe(5);
  expect(getState().competitions!.assignments ?? []).toEqual([]);
});
it('an acknowledged single-week run finishes without a repeated deadline stop', async () => {
  install();
  const seen = new Set(closingEventOpportunities(getState(), 1).map(e=>e.key));
  expect(await advanceUntil({kind:'weeks',weeks:1}, async()=>{}, seen)).toMatchObject({weeksPlayed:1,stop:{kind:'target'}});
  expect(getState().week).toBe(5);
});
