import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setStorage, __unlockSaves, loadSlot, migrateState, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { isCardWeek } from '../../src/core/saveValidation';
import { loadState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { activeCard, cardHandView, cardOfferView, drawOffer, passCard, plantCard, playCard, playPickCard, recoveryCandidates, takeCard, type CardTake } from '../../src/systems/cardWeek';
import { isSelectable } from '../../src/systems/lineup';
import { weeklyFatigueOf } from '../../src/systems/weeklyFatigue';

let fresh: GameState;
beforeEach(async () => { fresh = await prepareLeagueCareer({ clubName: 'Recovery Town', seed: 856, cardWeek: true }); });
afterEach(() => { __setStorage(null); });
function updated(result: GameState | string): GameState {
  if (typeof result === 'string') throw new Error(result);
  return result;
}
function played(result: CardTake | string): CardTake {
  if (typeof result === 'string') throw new Error(result);
  return result;
}
const a = () => fresh.squad[0]!.id;
const b = () => fresh.squad[1]!.id;
const tired = (first = 68, second = 19): GameState => ({
  ...fresh, cardWeek: { ...fresh.cardWeek!, weeklyFatigue: { [a()]: first, [b()]: second } },
});
const injured = (weeks: number): GameState => ({
  ...fresh, squad: fresh.squad.map((p, i) => i === 0 ? { ...p, injuredWeeks: weeks } : p),
});
const fromPick = (state: GameState, cardId: string, target?: string) => playPickCard(updated(plantCard(state, cardId)), 0, target);

describe('recovery card effects', () => {
  it('wipes exactly the chosen squad player and books no cash or active card', () => {
    const s = tired();
    const result = played(fromPick(s, 'fatigueWipe', a()));
    expect(weeklyFatigueOf(result.state, a())).toBe(0);
    expect(weeklyFatigueOf(result.state, b())).toBe(19);
    expect(result.money).toEqual([]);
    expect(result.state.money).toBe(s.money);
    expect(result.state.finance).toBe(s.finance);
    expect(result.state.rngSeed).toBe(s.rngSeed);
    expect(activeCard(result.state, 'fatigueWipe')).toBeUndefined();
    expect(result.state.cardWeek!.history.slice(-1)[0]).toMatchObject({cardId: 'fatigueWipe', action: 'play'});
    expect(weeklyFatigueOf(s, a())).toBe(68);
  });

  it('takes 30 from every affected squad player, flooring at zero', () => {
    const s = tired();
    const result = played(fromPick(s, 'iceBaths')).state;
    expect(result.cardWeek!.weeklyFatigue).toEqual({ [a()]: 38 });
    expect(result.squad).toBe(s.squad);
  });

  it.each([[4, 2], [2, 0], [1, 0]] as const)('changes %s weeks out into %s and permits selection once healed', (before, after) => {
    const s = injured(before);
    const result = played(fromPick(s, 'injuryRepair', a())).state;
    expect(result.squad[0]!.injuredWeeks).toBe(after);
    expect(isSelectable(result.squad[0]!)).toBe(after === 0);
    expect(result.squad[1]).toBe(s.squad[1]);
  });

  it('limits offers to legal effects and refuses stale or wrong targets without spending', () => {
    expect(recoveryCandidates(fresh)).toEqual([]);
    expect(recoveryCandidates(tired()).map(c => c.id)).toEqual(['fatigueWipe', 'iceBaths']);
    expect(recoveryCandidates(injured(0.5))).toEqual([]);
    expect(recoveryCandidates(injured(1)).map(c => c.id)).toEqual(['injuryRepair']);
    const offered = updated(plantCard(tired(), 'fatigueWipe'));
    expect(playPickCard(offered, 0)).toBe('Choose a tired player.');
    expect(playPickCard(offered, 0, 'former-player')).toBe('Choose a squad player carrying fatigue.');
    const stale = { ...offered, cardWeek: { ...offered.cardWeek!, weeklyFatigue: {} } };
    expect(playPickCard(stale, 0, a())).toBe('No squad player is carrying fatigue.');
    const repair = updated(takeCard(updated(plantCard(injured(1), 'injuryRepair')), 0));
    const healed = { ...repair, squad: fresh.squad };
    expect(playCard(healed, 0, a())).toBe('No squad player has at least one week left injured.');
    expect(cardHandView(healed)[0]!.refusal).toBe('No squad player has at least one week left injured.');
    expect(healed.cardWeek!.hand).toHaveLength(1);
  });

  it('uses weighted, distinct recovery faces on the independent offer stream', () => {
    let available = 0;
    for (let seed = 1; seed <= 180; seed++) {
      const base = tired();
      const s = { ...base, squad: injured(2).squad, cardWeek: { ...base.cardWeek!, rng: Math.imul(seed, 7919) >>> 0 } };
      const draw = drawOffer(s);
      const faces = draw.offer!.cards;
      if (faces.some(c => c.kind === 'recovery')) available++;
      expect(new Set(faces.map(c => c.cardId)).size).toBe(faces.length);
      expect(drawOffer(s)).toEqual(draw);
    }
    const rate = available / 180;
    expect(rate).toBeGreaterThan(0.20);
    expect(rate).toBeLessThan(0.53);
  });
});

describe('holding and saving recovery cards', () => {
  const add = (s: GameState, id: string) => updated(takeCard(updated(plantCard(s, id)), 0));

  it('keeps duplicates separately, caps them at two, and allows direct play or pass without touching the hand', () => {
    const full = add(add(tired(), 'fatigueWipe'), 'fatigueWipe');
    expect(full.cardWeek!.hand.map(h => [h.cardId, h.level])).toEqual([['fatigueWipe', 1], ['fatigueWipe', 1]]);
    const offer = updated(plantCard(full, 'fatigueWipe'));
    const refusal = 'You can hold 2 recovery cards. Play one first.';
    expect(takeCard(offer, 0)).toBe(refusal);
    expect(cardOfferView(offer).cards[0]).toMatchObject({ upgrade: false, takeRefusal: refusal, refusal: null });
    expect(played(playPickCard(offer, 0, a())).state.cardWeek!.hand).toEqual(full.cardWeek!.hand);
    expect(updated(passCard(offer)).cardWeek!.hand).toEqual(full.cardWeek!.hand);
    const after = played(playCard(full, 0, a())).state;
    expect(after.cardWeek!.hand).toEqual(full.cardWeek!.hand.slice(1));
  });

  it('admits v41 unchanged apart from version, and round-trips a saved offer and duplicate hand', () => {
    expect(migrateState({ ...fresh, version: 41 })).toMatchObject({ ok: true, state: fresh, repairs: [] });
    const withCards = updated(plantCard(add(add(tired(), 'fatigueWipe'), 'fatigueWipe'), 'iceBaths'));
    const storage = new Map<string, string>();
    __setStorage({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); } });
    __unlockSaves(); setActiveSlot(1); loadState(withCards);
    expect(saveIfChanged(withCards)).toBe(true);
    expect(loadSlot(1)).toMatchObject({ status: 'ok', state: withCards, repairs: [] });
    for (const hand of [[...withCards.cardWeek!.hand, withCards.cardWeek!.hand[0]!],
      [{ ...withCards.cardWeek!.hand[0]!, level: 2 }]]) {
      const invalid = { ...withCards.cardWeek!, hand };
      expect(isCardWeek(invalid, SAVE_VERSION)).toBe(false);
      expect(migrateState({ ...withCards, cardWeek: invalid }).ok).toBe(false);
    }
    expect(isCardWeek(withCards.cardWeek, 41)).toBe(false);
  });
});
