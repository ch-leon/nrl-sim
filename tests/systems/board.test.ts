import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateObjectives, evaluateObjective, reviewObjectives, finalsPrize, finalsTarget,
  applyBoardReview, ensureObjectives, sackedSummary, type SeasonOutcome,
} from '../../src/systems/board';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { createNewGame, getState, setState, type Objective } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { BOARD, PRIZE } from '../../src/config';

beforeEach(() => bus.clear());

const fresh = (seed = 7, rep = 40) => {
  createNewGame('Test FC', seed);
  initLeague(getState());
  setState({ reputation: rep });
  setState({ objectives: generateObjectives(getState()) });
  return getState();
};

const outcome = (over: Partial<SeasonOutcome> = {}): SeasonOutcome => ({
  ladderPosition: 5, positions: { [PLAYER_ID]: 5, 'rival-reapers': 3, 'rival-larrikins': 16 },
  finalsPlayed: 0, playedGrandFinal: false, premiership: false, ...over,
});

describe('generateObjectives', () => {
  it('is deterministic and gives 2–3 objectives', () => {
    const s = fresh();
    expect(generateObjectives(s)).toEqual(generateObjectives(s));
    const n = generateObjectives(s).length;
    expect(n === 2 || n === 3).toBe(true);
    expect(generateObjectives({ ...s, reputation: 10 })).toHaveLength(2);
  });

  it('scales the finals target to reputation and difficulty', () => {
    const s = fresh();
    expect(finalsTarget({ ...s, reputation: 20 })).toBeGreaterThan(finalsTarget({ ...s, reputation: 80 }));
    const at = (d: 'easy' | 'normal' | 'hard') => finalsTarget({ reputation: 50, settings: { ...s.settings, difficulty: d } });
    expect(at('easy')).toBeGreaterThan(at('normal'));
    expect(at('normal')).toBeGreaterThan(at('hard'));
  });

  it('may name a rival that exists in the league', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = fresh(seed, 60);
      const r = generateObjectives(s).find((o) => o.kind === 'beatRival');
      if (r) expect(s.league.clubs.some((c) => c.id === r.rivalId)).toBe(true);
    }
  });
});

describe('evaluateObjective', () => {
  const s = fresh();
  const mk = (o: Partial<Objective>): Objective => ({ id: 'x', kind: 'finals', text: '', target: 8, status: 'pending', ...o });
  it('finals', () => {
    expect(evaluateObjective(mk({}), s, outcome({ ladderPosition: 8 }))).toBe(true);
    expect(evaluateObjective(mk({}), s, outcome({ ladderPosition: 9 }))).toBe(false);
  });
  it('solvent', () => {
    expect(evaluateObjective(mk({ kind: 'solvent', target: 0 }), { ...s, money: 0 }, outcome())).toBe(true);
    expect(evaluateObjective(mk({ kind: 'solvent', target: 0 }), { ...s, money: -1 }, outcome())).toBe(false);
  });
  it('beatRival compares ladder positions', () => {
    const o = mk({ kind: 'beatRival', rivalId: 'rival-reapers' });
    expect(evaluateObjective(o, s, outcome({ ladderPosition: 2 }))).toBe(true);
    expect(evaluateObjective(o, s, outcome({ ladderPosition: 5 }))).toBe(false);
  });
  it('build', () => {
    expect(evaluateObjective(mk({ kind: 'build', target: 1 }), s, outcome())).toBe(false);
  });
});

describe('reviewObjectives', () => {
  it('missing objectives lowers patience; a clean sweep earns it back', () => {
    const s0 = fresh();
    const s = { ...s0, objectives: s0.objectives.filter((o) => o.kind !== 'build' && o.kind !== 'beatRival') };
    const bad = reviewObjectives({ ...s, money: -5, boardPatience: 3 }, outcome({ ladderPosition: 12 }));
    expect(bad.missed).toBe(2);
    expect(bad.patience).toBe(1);
    const good = reviewObjectives({ ...s, money: 5, boardPatience: 3 }, outcome({ ladderPosition: 1 }));
    expect(good.missed).toBe(0);
    expect(good.patience).toBe(4);
    expect(good.reputation).toBeGreaterThan(s.reputation);
    expect(good.grant).toBeGreaterThan(0);
  });
});

describe('finalsPrize', () => {
  it('pays per finals week, plus grand final and premiership bonuses', () => {
    expect(finalsPrize({ finalsPlayed: 0, playedGrandFinal: false, premiership: false })).toBe(0);
    expect(finalsPrize({ finalsPlayed: 1, playedGrandFinal: false, premiership: false })).toBe(PRIZE.PER_FINALS_WEEK);
    expect(finalsPrize({ finalsPlayed: 3, playedGrandFinal: true, premiership: true }))
      .toBe(3 * PRIZE.PER_FINALS_WEEK + PRIZE.GRAND_FINAL + PRIZE.PREMIERSHIP);
  });
});

describe('applyBoardReview / sacking', () => {
  it('pays prize money and grants on met objectives', () => {
    const s = fresh();
    setState({ objectives: [{ id: 'a', kind: 'finals', text: 'top 8', target: 8, status: 'pending' }], money: 1000 });
    applyBoardReview(outcome({ ladderPosition: 1, finalsPlayed: 3, playedGrandFinal: true, premiership: true }));
    const after = getState();
    expect(after.money).toBe(1000 + finalsPrize({ finalsPlayed: 3, playedGrandFinal: true, premiership: true }) + BOARD.GRANT_PER_MET);
    expect(after.objectives[0]!.status).toBe('met');
    expect(after.sacked).toBeUndefined();
    expect(s.season).toBe(after.season);
  });

  it('sacks the player when patience reaches zero and emits board:sacked', () => {
    fresh();
    setState({ boardPatience: 2, money: -100, season: 4 });
    setState({ objectives: [
      { id: 'a', kind: 'finals', text: 'Finish in the top 8', target: 8, status: 'pending' },
      { id: 'b', kind: 'solvent', text: 'Finish the season solvent', target: 0, status: 'pending' },
    ] });
    const seen: string[] = [];
    bus.on('board:sacked', (e) => seen.push(e.reason));
    applyBoardReview(outcome({ ladderPosition: 14 }));
    const s = getState();
    expect(s.boardPatience).toBe(0);
    expect(s.sacked?.season).toBe(3);
    expect(seen).toHaveLength(1);
    expect(sackedSummary(s).reason).toContain('top 8');
  });

  it('is not sacked while patience remains', () => {
    fresh();
    setState({ boardPatience: 5, money: -100, objectives: [
      { id: 'a', kind: 'finals', text: 't', target: 8, status: 'pending' }] });
    applyBoardReview(outcome({ ladderPosition: 14 }));
    expect(getState().boardPatience).toBe(4);
    expect(getState().sacked).toBeUndefined();
  });
});

describe('ensureObjectives', () => {
  it('fills missing objectives once the league exists', () => {
    createNewGame('X', 1);
    ensureObjectives();
    expect(getState().objectives).toHaveLength(0);
    initLeague(getState());
    ensureObjectives();
    expect(getState().objectives.length).toBeGreaterThanOrEqual(2);
  });
});

describe('season rollover integration', () => {
  it('reviews the finished season and sets fresh objectives for the next', async () => {
    const { clearTickHooks, clearSeasonHooks, advanceWeeks } = await import('../../src/core/time');
    const { registerFixturesSystem } = await import('../../src/systems/fixtures');
    const { registerPlayerMatchSystem } = await import('../../src/systems/matchday');
    const { registerBoardSystem } = await import('../../src/systems/board');
    const { WEEKS_PER_SEASON } = await import('../../src/config');
    clearTickHooks(); clearSeasonHooks();
    fresh(42);
    registerFixturesSystem(); registerPlayerMatchSystem(); registerBoardSystem();
    const first = getState().objectives.map((o) => o.id);
    expect(first.every((id) => id.startsWith('s1-'))).toBe(true);
    advanceWeeks(WEEKS_PER_SEASON);
    const s = getState();
    expect(s.season).toBe(2);
    expect(s.objectives.every((o) => o.id.startsWith('s2-') && o.status === 'pending')).toBe(true);
    expect(s.boardPatience).toBeLessThanOrEqual(BOARD.MAX_PATIENCE);
  });
});
