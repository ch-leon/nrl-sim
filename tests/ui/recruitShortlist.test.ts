import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, type GameState, type Player, type Position } from '../../src/core/state';
import { difficultyMultipliers, SQUAD_CAP } from '../../src/config';
import { signingFee } from '../../src/systems/freeagency';
import { autoPick, LINEUP_SLOTS } from '../../src/systems/lineup';
import { recruitAffordable, recruitShortlist } from '../../src/ui/recruitShortlist';

function player(id: string, position: Position, rating = 60, wage = 100): Player {
  return { ...getState().squad[0]!, id, name: id, position, age: 25, wage, junior: false,
    injuredWeeks: 0, suspendedWeeks: 0, traits: [],
    stats: { speed: rating, strength: rating, stamina: rating, handling: rating, kicking: rating, footyIQ: rating } };
}
function state(agents: Player[]): GameState {
  const squad = LINEUP_SLOTS.map((pos, i) => player(`s${i}`, pos, 50));
  return { ...getState(), squad, lineup: autoPick(squad), freeAgents: agents, money: 1_000_000 };
}
beforeEach(() => { createNewGame('Test Club', 1); });

describe('recruitShortlist', () => {
  it('puts the best affordable hooker first when all hookers are missing', () => {
    const s = state([player('h-low', 'hooker', 40), player('h-best', 'hooker', 55),
      ...Array.from({ length: 5 }, (_, i) => player(`w${i}`, 'winger', 80 - i))]);
    s.squad = s.squad.filter((p) => p.position !== 'hooker');
    s.lineup = autoPick(s.squad);
    expect(recruitShortlist(s).ids).toEqual(['h-best', 'h-low', 'w0', 'w1']);
  });
  it('counts injured and suspended cover as missing, and two winger slots need two players', () => {
    const s = state([player('h', 'hooker', 40), ...Array.from({ length: 4 }, (_, i) => player(`w${i}`, 'winger', 80 - i))]);
    for (const status of ['injuredWeeks', 'suspendedWeeks'] as const) {
      s.squad.find((p) => p.position === 'hooker')![status] = 2;
      expect(recruitShortlist(s).ids[0]).toBe('h');
    }
    s.squad = s.squad.filter((p) => p.position !== 'winger');
    expect(recruitShortlist(s).ids[0]).toBe('w0');
  });
  it.each(['easy', 'normal', 'hard'] as const)('uses the exact eight-week wage boundary on %s', (difficulty) => {
    const s = state(Array.from({ length: 5 }, (_, i) => player(`a${i}`, 'hooker', 60, 1000)));
    s.settings = { ...s.settings, difficulty };
    const p = s.freeAgents[0]!;
    s.money = signingFee(s, p) + 8 * p.wage * difficultyMultipliers(difficulty).wages;
    expect(recruitAffordable(s, p)).toBe(true);
    expect(recruitShortlist(s).pickId).not.toBeNull();
    s.money -= 1;
    expect(recruitAffordable(s, p)).toBe(false);
    expect(recruitShortlist(s).pickId).toBeNull();
  });
  it('reserves at most one slot for the highest rated near-reach star; the rest are affordable', () => {
    const s = state([player('star', 'hooker', 90, 10000), player('other', 'prop', 80, 10000),
      ...Array.from({ length: 4 }, (_, i) => player(`cheap${i}`, 'hooker', 40, 100))]);
    s.money = signingFee(s, s.freeAgents[0]!) / 1.4;
    const result = recruitShortlist(s);
    expect(result.ids).toHaveLength(4);
    expect(result.reachId).toBe('star');
    expect(result.ids.filter((id) => !recruitAffordable(s, s.freeAgents.find((p) => p.id === id)!))).toEqual(['star']);
    s.money = signingFee(s, s.freeAgents[0]!) / 1.5;
    expect(recruitShortlist(s).reachId).not.toBe('star');
  });
  it('chooses improvement over current starter, then cheaper fee, then lower id', () => {
    const s = state([player('h', 'hooker', 60), player('w', 'winger', 80),
      player('z', 'prop', 40), player('y', 'prop', 40), player('x', 'prop', 40)]);
    s.squad.find((p) => p.position === 'hooker')!.stats = player('weak', 'hooker', 20).stats;
    s.squad.filter((p) => p.position === 'winger').forEach((p) => { p.stats = player('strong', 'winger', 79).stats; });
    expect(recruitShortlist(s).pickId).toBe('h');
    s.freeAgents = [player('z', 'hooker', 60), player('b', 'hooker', 60), player('a', 'hooker', 60),
      player('old', 'hooker', 60), player('filler', 'prop', 40)];
    s.freeAgents.find((p) => p.id === 'old')!.age = 33;
    expect(signingFee(s, s.freeAgents[3]!)).toBeLessThan(signingFee(s, s.freeAgents[0]!));
    expect(recruitShortlist(s).pickId).toBe('old');
    s.freeAgents[3]!.age = 25;
    expect(recruitShortlist(s).pickId).toBe('a');
  });
  it('shows all agents below five, even unaffordable ones, with a pick if possible', () => {
    const s = state([player('a', 'hooker', 60, 100000), player('b', 'prop', 50)]);
    s.money = signingFee(s, s.freeAgents[1]!) + 800;
    expect(recruitShortlist(s)).toEqual({ ids: ['a', 'b'], pickId: 'b', reachId: null });
    expect(recruitShortlist({ ...s, freeAgents: [] })).toEqual({ ids: [], pickId: null, reachId: null });
  });
  it('returns no advice for a full squad or a bank too small for any fee', () => {
    const s = state(Array.from({ length: 5 }, (_, i) => player(`a${i}`, 'hooker')));
    s.squad = Array.from({ length: SQUAD_CAP }, (_, i) => player(`s${i}`, 'hooker'));
    expect(recruitShortlist(s)).toEqual({ ids: [], pickId: null, reachId: null });
    s.squad = [];
    s.money = 0;
    expect(recruitShortlist(s)).toEqual({ ids: [], pickId: null, reachId: null });
  });
  it('is deterministic and never mutates the state or its arrays', () => {
    const s = getState();
    const before = structuredClone(s);
    const first = recruitShortlist(s);
    expect(recruitShortlist(s)).toEqual(first);
    expect(s).toEqual(before);
    expect(first.ids).toHaveLength(4);
  });
});
