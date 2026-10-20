// tests/systems/tactics.test.ts — team tactics on the Lineup screen (N11 item 1):
// the coach's attack and defence presets live on the lineup, survive Auto pick and
// the day's resolve, and ride on the sheet into the match. Untouched, a side plays
// Balanced / Slide exactly as before.
import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { autoPick, resolveLineup, setTactics, validTactics } from '../../src/systems/lineup';
import { teamSheetFromSquad } from '../../src/match/league/sheets';
import { teamSheetFromRival } from '../../src/match/league/sheets';
import { runMatch } from '../../src/match/league/match';
import { DEFAULT_TACTICS } from '../../src/match/league/presets';

const game = () => createNewGame('Tactics FC', 21);
const sheetWith = (tactics?: { attack: 'expansive' | 'balanced'; defence: 'rush' | 'slide' }) => {
  const s = game();
  const lineup = tactics ? setTactics(s.lineup, tactics) : s.lineup;
  return teamSheetFromSquad(s.squad, 'player', s.clubName, ['#111', '#eee'], resolveLineup(lineup, s.squad));
};

describe('team tactics (N11.1)', () => {
  it('a new club plays Balanced / Slide; picks change one half of the plan at a time', () => {
    const s = game();
    expect(s.lineup.tactics).toEqual(DEFAULT_TACTICS);
    const a = setTactics(s.lineup, { attack: 'expansive' });
    expect(a.tactics).toEqual({ attack: 'expansive', defence: 'slide' });
    expect(setTactics(a, { defence: 'rush' }).tactics).toEqual({ attack: 'expansive', defence: 'rush' });
    expect(setTactics(a, { attack: 'expansive' })).toBe(a); // no change, same object
    expect(validTactics({ attack: 'nonsense' as never, defence: 'slide' })).toEqual(DEFAULT_TACTICS);
  });

  it('Auto pick and the day’s resolve keep the coach’s presets', () => {
    const s = game();
    const picked = setTactics(s.lineup, { attack: 'grind', defence: 'compressed' });
    expect(autoPick(s.squad, picked.rotation, picked.tactics).tactics).toEqual({ attack: 'grind', defence: 'compressed' });
    const day = resolveLineup(picked, s.squad);
    expect(day.tactics).toEqual({ attack: 'grind', defence: 'compressed' });
    expect(day.changed).toBe(false);
  });

  it('a lineup with presets it does not know is put back to Balanced / Slide on the day, once', () => {
    const s = game();
    const bad = { ...s.lineup, tactics: { attack: 'route-one', defence: 'slide' } as never };
    const day = resolveLineup(bad, s.squad);
    expect(day.tactics).toEqual(DEFAULT_TACTICS);
    expect(day.changed).toBe(true);
    expect(resolveLineup(day.lineup, s.squad).changed).toBe(false);
  });

  it('the sheet carries the pick, and the pick changes the match', () => {
    expect(sheetWith({ attack: 'expansive', defence: 'rush' }).tactics).toEqual({ attack: 'expansive', defence: 'rush' });
    const away = teamSheetFromRival({ id: 'rival-gulls', name: 'Gulls', strength: 60, colors: ['#222', '#ddd'] } as never);
    const plain = runMatch(sheetWith(), away, { seed: 9 });
    const expansive = runMatch(sheetWith({ attack: 'expansive', defence: 'rush' }), away, { seed: 9 });
    expect(expansive.events.length === plain.events.length && expansive.homeScore === plain.homeScore && expansive.awayScore === plain.awayScore).toBe(false);
  }, 60_000);

  it('Balanced / Slide on the sheet is the same match as no tactics at all (old behaviour)', () => {
    const s = game();
    const day = resolveLineup(s.lineup, s.squad);
    const withDefault = teamSheetFromSquad(s.squad, 'player', s.clubName, ['#111', '#eee'], day);
    const { tactics: _t, ...withoutTactics } = withDefault;
    void _t;
    const away = teamSheetFromRival({ id: 'rival-gulls', name: 'Gulls', strength: 60, colors: ['#222', '#ddd'] } as never);
    expect(runMatch(withDefault, away, { seed: 4 })).toEqual(runMatch(withoutTactics, away, { seed: 4 }));
  }, 60_000);

  it('a v13 save loads with Balanced / Slide on its lineup', () => {
    const base = game();
    const { tactics: _t, ...oldLineup } = base.lineup;
    void _t;
    const res = migrateState({ ...base, version: 13, lineup: oldLineup as never });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.lineup.tactics).toEqual(DEFAULT_TACTICS);
  });
});
