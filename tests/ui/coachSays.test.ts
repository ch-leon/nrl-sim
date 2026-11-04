import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, setState, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { LINEUP_SLOTS } from '../../src/systems/lineup';
import { plantPending } from '../../src/systems/events';
import { decisionViews } from '../../src/ui/decisions';
import { coachSays } from '../../src/ui/coachSays';

const ctx = { decisions: 0, runwayWeeks: null };
function readyClub(): GameState {
  createNewGame('Test Club', 1);
  const s = getState();
  // Enough natural players for every position; all higher-priority problems cleared.
  const squad = s.squad.map((p, i) => ({ ...p, position: LINEUP_SLOTS[i % LINEUP_SLOTS.length]!, injuredWeeks: 0, suspendedWeeks: 0 }));
  return { ...s, unlocks: { facilities: s.unlocks!.facilities, screens: ['finance', 'staff'] }, squad, lineup: { ...s.lineup, starters: squad.slice(0, 9).map((p) => p.id) }, objectives: [], facilities: [], league: initLeague(s) };
}

describe('coachSays (#477)', () => {
  let s: GameState;
  beforeEach(() => { s = readyClub(); });
  it('1: names the waiting decision and opens News', () => {
    setState(s); plantPending('fanDay'); s = getState();
    expect(coachSays(s, { ...ctx, decisions: 1 })).toEqual({ text: `Answer the ${decisionViews(s)[0]!.title} card before we play.`, screen: 'news' });
  });
  it.each(['injuredWeeks', 'suspendedWeeks'] as const)('2: names an unavailable starter (%s)', (field) => {
    s.squad[0]![field] = 2;
    expect(coachSays(s, ctx)).toEqual({ text: `${s.squad[0]!.name} can't play. Fix the lineup.`, screen: 'lineup' });
  });
  it('2: catches an empty spot even if matchday could fill it', () => {
    s.lineup.starters[0] = null;
    expect(coachSays(s, ctx)).toEqual({ text: 'The fullback spot is empty. Fix the lineup.', screen: 'lineup' });
  });
  it('2: also catches an unavailable or empty bench seat', () => {
    const p = s.squad.find((p) => p.id === s.lineup.bench[0])!;
    p.suspendedWeeks = 2;
    expect(coachSays(s, ctx)).toEqual({ text: `${p.name} can't play. Fix the lineup.`, screen: 'lineup' });
    p.suspendedWeeks = 0;
    s.lineup.bench = [];
    expect(coachSays(s, ctx)).toEqual({ text: 'The bench spot is empty. Fix the lineup.', screen: 'lineup' });
  });
  it('3: uses the existing runway warning threshold and whole weeks', () => {
    expect(coachSays(s, { ...ctx, runwayWeeks: 19.9 })).toEqual({ text: "19 weeks of cash left. No building till that's sorted.", screen: 'finance' });
    expect(coachSays(s, { ...ctx, runwayWeeks: 20 }).screen).not.toBe('finance');
  });
  it('4: names the worst board objective', () => {
    s.objectives = [{ id: 'cash', kind: 'solvent', text: 'Keep $300,000', target: 300_000, status: 'pending' }];
    expect(coachSays(s, ctx)).toEqual({ text: "The board's goal is at risk: Keep $300,000.", screen: 'staff' });
  });
  it('5: counts fit natural players against the lineup’s positional needs', () => {
    s.squad = s.squad.map((p) => p.position === 'winger' ? { ...p, position: 'centre' } : p);
    expect(coachSays(s, ctx)).toEqual({ text: "We're thin at winger. Have a look at the recruits.", screen: 'recruit' });
  });
  it('6: suggests an affordable Training Paddock when no training is built', () => {
    s.money = 8_000;
    expect(coachSays(s, ctx)).toEqual({ text: 'Get a Training Paddock down.', screen: 'build' });
    s.money--;
    expect(coachSays(s, ctx).screen).toBeNull();
    s.money = 200_000;
    s.facilities = [{ id: 'weights', defId: 'weightsRoom', x: 0, y: 0, level: 1 }];
    expect(coachSays(s, ctx).screen).toBeNull();
  });
  it('7: names the next opponent with no destination', () => {
    s.money = 0;
    const f = s.league.fixtures.find((f) => f.homeId === 'player' || f.awayId === 'player')!;
    const opp = s.league.clubs.find((c) => c.id === (f.homeId === 'player' ? f.awayId : f.homeId))!;
    expect(coachSays(s, ctx)).toEqual({ text: `${opp.name} next. Play the week when you're ready.`, screen: null });
    s.league.fixtures = [];
    expect(coachSays(s, ctx)).toEqual({ text: "Play the week when you're ready.", screen: null });
  });
  it('first match wins across every adjacent pair', () => {
    setState(s); plantPending('fanDay'); s = getState();
    s.squad[0]!.injuredWeeks = 2;
    expect(coachSays(s, { ...ctx, decisions: 1 }).screen).toBe('news');
    expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('lineup');
    s.squad[0]!.injuredWeeks = 0;
    s.objectives = [{ id: 'cash', kind: 'solvent', text: 'Keep $300,000', target: 300_000, status: 'pending' }];
    expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('finance');
    s.squad = s.squad.map((p) => p.position === 'winger' ? { ...p, position: 'centre' } : p);
    expect(coachSays(s, ctx).screen).toBe('staff');
    s.objectives = [];
    expect(coachSays(s, ctx).screen).toBe('recruit');
  });
  describe('Office unlocks (#482)', () => {
    const atRisk = (s: GameState): void => {
      s.objectives = [{ id: 'cash', kind: 'solvent', text: 'Keep $300,000', target: 300_000, status: 'pending' }];
    };
    it('skips locked Finance and continues to an open Staff suggestion', () => {
      atRisk(s);
      s.unlocks!.screens = ['staff'];
      expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('staff');
      s.unlocks!.screens.push('finance');
      expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('finance');
    });
    it('skips locked Staff and continues to recruitment', () => {
      atRisk(s);
      s.squad = s.squad.map((p) => p.position === 'winger' ? { ...p, position: 'centre' } : p);
      s.unlocks!.screens = [];
      expect(coachSays(s, ctx).screen).toBe('recruit');
      s.unlocks!.screens.push('staff');
      expect(coachSays(s, ctx).screen).toBe('staff');
    });
    it('skips both locked destinations and reaches the next applicable rule', () => {
      atRisk(s);
      s.unlocks!.screens = [];
      expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('build');
      s.money = 0;
      expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBeNull();
    });
    it.each(['old save', 'facility-only legacy save', 'veteran skip'] as const)('keeps Finance and Staff suggestions for %s', (mode) => {
      if (mode === 'old save') delete s.unlocks;
      else if (mode === 'facility-only legacy save') delete s.unlocks!.screens;
      else {
        createNewGame('Veteran Club', 1, { openAll: true });
        expect(getState().unlocks).toBeUndefined();
        s.unlocks = getState().unlocks;
      }
      atRisk(s);
      expect(coachSays(s, { ...ctx, runwayWeeks: 3 }).screen).toBe('finance');
      expect(coachSays(s, ctx).screen).toBe('staff');
    });
  });
  it('is deterministic and leaves its inputs unchanged', () => {
    const before = JSON.stringify(s);
    expect(coachSays(s, ctx)).toEqual(coachSays(structuredClone(s), ctx));
    expect(JSON.stringify(s)).toBe(before);
  });
});
