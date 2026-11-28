import { afterEach, expect, it } from 'vitest';
import { getState, loadState, type GameState } from '../../src/core/state';
import { __setStorage, __unlockSaves, setActiveSlot } from '../../src/core/save';
import { bus } from '../../src/core/events';
import { selectPack } from '../../src/content';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { acceptLeagueEntry, previewLeagueEntry } from '../../src/systems/leagueEntry';
import { plantCard, takeCard } from '../../src/systems/cardWeek';
import { weeklyFatigueOf } from '../../src/systems/weeklyFatigue';
import { createCardPolicy, openingLineup } from '../../src/qa/personas/cardWeek';
import { personaById } from '../../src/qa/personas';

function requireState(result: GameState | string): GameState {
  if (typeof result === 'string') throw new Error(result);
  return result;
}
async function career(): Promise<GameState> {
  bus.clear();
  const bytes = new Map<string, string>();
  __setStorage({
    getItem: key => bytes.get(key) ?? null,
    setItem: (key, value) => { bytes.set(key, value); },
    removeItem: key => { bytes.delete(key); },
  });
  __unlockSaves();
  setActiveSlot(1);
  const fresh = await prepareLeagueCareer({clubName:'Recovery Policy QA', seed:7919, cardWeek:true});
  const quote = previewLeagueEntry(fresh, fresh.competitions!.world!.profile.startingDivisionId);
  if (!quote.ok) throw new Error(quote.message);
  const accepted = acceptLeagueEntry(fresh, quote.preview);
  if (!accepted.ok) throw new Error(accepted.message);
  return accepted.state;
}
afterEach(() => {
  __setStorage(null); bus.clear(); selectPack('au');
});

it('a persona uses legal recovery cards on the tired starter and injured reserve', async () => {
  const base = await career();
  const starters = new Set(openingLineup(base).starters.map(p => p?.id));
  const starter = openingLineup(base).starters[0]!;
  const reserve = base.squad.find(p => !starters.has(p.id))!;
  let state: GameState = {
    ...base,
    squad: base.squad.map(p => p.id === reserve.id ? {...p, injuredWeeks:3} : p),
    cardWeek: {...base.cardWeek!, weeklyFatigue: {[starter.id]:81}},
  };
  for (const id of ['fatigueWipe','injuryRepair']) {
    state = requireState(takeCard(requireState(plantCard(state,id)),0));
  }
  loadState(state);
  const policy = createCardPolicy({...personaById('min-maxer'), mistakeRate:0}, 7919);
  policy.settleOffers();
  expect(weeklyFatigueOf(getState(), starter.id)).toBe(0);
  expect(getState().squad.find(p => p.id === reserve.id)?.injuredWeeks).toBe(1);
  expect(policy.snapshot().cardsPlayed.recovery).toBe(2);
  expect(policy.snapshot().recoveriesPlayed).toBe(2);
});

it('rest policy changes a starting spot only when willing and there is fresher cover', async () => {
  const base = await career();
  const starter = openingLineup(base).starters[0]!;
  loadState({...base,cardWeek:{...base.cardWeek!,weeklyFatigue:{[starter.id]:70}}});
  const careless = createCardPolicy(personaById('careless'), 7919);
  careless.rest();
  expect(openingLineup(getState()).starters.map(p => p?.id)).toContain(starter.id);
  expect(careless.snapshot().restedStarters).toBe(0);
  const min = createCardPolicy({...personaById('min-maxer'),mistakeRate:0}, 7919);
  min.rest();
  const picked = openingLineup(getState()).starters.map(p => p?.id);
  expect(picked).not.toContain(starter.id);
  expect(new Set(picked).size).toBe(picked.length);
  expect(min.snapshot().restedStarters).toBe(1);
});
