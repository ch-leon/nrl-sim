import { describe, it, expect } from 'vitest';
import { mkEvent, type MatchEvent } from '../../src/sim/events';
import { foldEvents, playerOfTheMatch, applyMatchStats, topTryScorer, applyTenure } from '../../src/systems/stats';
import { createNewGame } from '../../src/core/state';

const log: MatchEvent[] = [
  mkEvent(5, 'try', 'player', { player: 'Ann' }),
  mkEvent(9, 'tackle', 'player', { player: 'Bob' }),
  mkEvent(10, 'tackle', 'player', { player: 'Bob' }),
  mkEvent(11, 'big-hit', 'player', { player: 'Bob' }),
  mkEvent(20, 'break', 'player', { player: 'Ann' }),
  mkEvent(30, 'try', 'player', { player: 'Ann' }),
  mkEvent(31, 'try', 'rival', { player: 'Zed' }),
  mkEvent(40, 'error', 'player', { player: 'Bob' }),
];

describe('foldEvents', () => {
  it('matches a hand-built log', () => {
    const m = foldEvents(log, 'player');
    expect(m.get('Ann')).toEqual({ games: 0, tries: 2, tackles: 0, lineBreaks: 1 });
    expect(m.get('Bob')).toEqual({ games: 0, tries: 0, tackles: 3, lineBreaks: 0 });
    expect(m.has('Zed')).toBe(false);
  });
});

describe('playerOfTheMatch', () => {
  it('is deterministic and picks from the winning side', () => {
    const r = { homeScore: 12, awayScore: 4, events: log };
    const a = playerOfTheMatch(r, 'player', 'rival');
    expect(a).toEqual(playerOfTheMatch(r, 'player', 'rival'));
    expect(a?.name).toBe('Ann');
    expect(playerOfTheMatch({ ...r, homeScore: 0, awayScore: 8 }, 'player', 'rival')?.name).toBe('Zed');
  });
  it('breaks ties by name', () => {
    const ev = [mkEvent(1, 'try', 'player', { player: 'Y' }), mkEvent(2, 'try', 'player', { player: 'X' })];
    expect(playerOfTheMatch({ homeScore: 8, awayScore: 0, events: ev }, 'player', 'r')?.name).toBe('X');
  });
});

describe('applyMatchStats / tenure', () => {
  it('adds games, career and season tallies; legend after 3 seasons', () => {
    const squad = createNewGame('T', 1).squad.slice(0, 2).map((p, i) => ({ ...p, name: ['Ann', 'Bob'][i]! }));
    const out = applyMatchStats(squad, log, 'player', [squad[0]!.id], 1);
    expect(out[0]!.career).toEqual({ games: 1, tries: 2, tackles: 0, lineBreaks: 1 });
    expect(out[1]!.career).toEqual({ games: 0, tries: 0, tackles: 3, lineBreaks: 0 });
    expect(topTryScorer(out, 1)).toEqual({ name: 'Ann', tries: 2 });
    expect(topTryScorer(out, 2)).toBeUndefined();
    const stamped = applyTenure(out, 1, 2);
    expect(stamped[0]!.joinedSeason).toBe(1);
    expect(stamped[0]!.traits).not.toContain('clubLegend');
    expect(applyTenure(stamped, 3, 4)[0]!.traits).toContain('clubLegend');
  });
});
