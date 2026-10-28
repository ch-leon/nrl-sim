import { describe, it, expect } from 'vitest';
import { createNewGame, type GameState } from '../../src/core/state';
import { cleanName, NAME_MAX, NAME_MIN } from '../../src/data/names';
import { allPlayers, renameClub, renamePlayer, validClubColors } from '../../src/systems/rename';
import { exportNames, importNames, namesFile } from '../../src/core/save';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { clubNameMap } from '../../src/ui/screens/fixtures';

// #398: rename a player, your club or a rival in-game, and carry the names in a file.

/** A new career with its league (rivals with squads). */
function career(name = 'Rename Rovers', seed = 7): GameState {
  const s = createNewGame(name, seed);
  return { ...s, league: initLeague(s) };
}

const apply = (s: GameState, patch: Partial<GameState> | null): GameState => (patch ? { ...s, ...patch } : s);

describe('the rename rule', () => {
  it('trims, closes up spaces and keeps 2–24 characters', () => {
    expect(cleanName('  Jarrah   Tackleford ')).toEqual({ ok: true, name: 'Jarrah Tackleford' });
    expect(cleanName('Al')).toEqual({ ok: true, name: 'Al' });
    expect(cleanName('x'.repeat(NAME_MAX))).toEqual({ ok: true, name: 'x'.repeat(NAME_MAX) });
    expect(cleanName('A').ok).toBe(false);
    expect(cleanName('   ').ok).toBe(false);
    expect(cleanName('x'.repeat(NAME_MAX + 1)).ok).toBe(false);
    expect(NAME_MIN).toBe(2);
  });

  it('counts characters, not UTF-16 units (Māori macrons, emoji)', () => {
    expect(cleanName('Tāne Whakarua')).toEqual({ ok: true, name: 'Tāne Whakarua' });
    expect(cleanName('🏉'.repeat(NAME_MAX)).ok).toBe(true);
  });

  it('refuses control characters; tabs and new lines read as spaces', () => {
    expect(cleanName('Bad\u0000Name').ok).toBe(false);
    expect(cleanName('Bad\u007fName').ok).toBe(false);
    expect(cleanName('Bad Name').ok).toBe(false);
    expect(cleanName('Two\nLines')).toEqual({ ok: true, name: 'Two Lines' });
  });
});

describe('renaming a player', () => {
  it('renames your own man and leaves everyone else', () => {
    const s = career();
    const p = s.squad[0]!;
    const res = renamePlayer(s, p.id, ' Bumpus  McGee ');
    expect(res.ok).toBe(true);
    const next = apply(s, res.ok ? res.patch : null);
    expect(next.squad[0]!.name).toBe('Bumpus McGee');
    expect(next.squad.slice(1)).toEqual(s.squad.slice(1));
    expect(next.freeAgents).toBe(s.freeAgents);
    expect(next.league).toBe(s.league);
  });

  it("renames a rival's man inside that rival's squad", () => {
    const s = career();
    const rival = s.league.clubs.find((c) => c.id !== PLAYER_ID)!;
    const p = rival.squad![0]!;
    const res = renamePlayer(s, p.id, 'Hardcastle Jnr');
    const next = apply(s, res.ok ? res.patch : null);
    expect(next.league.clubs.find((c) => c.id === rival.id)!.squad![0]!.name).toBe('Hardcastle Jnr');
    expect(next.squad).toBe(s.squad);
  });

  it('renames a free agent', () => {
    const s = career();
    const p = s.freeAgents[0]!;
    const res = renamePlayer(s, p.id, 'Tackleford');
    expect(apply(s, res.ok ? res.patch : null).freeAgents[0]!.name).toBe('Tackleford');
  });

  it('refuses a bad name or a player who has gone, and an unchanged name is no patch', () => {
    const s = career();
    expect(renamePlayer(s, s.squad[0]!.id, 'x')).toEqual({ ok: false, why: 'At least 2 characters' });
    expect(renamePlayer(s, 'nobody', 'Fine Name').ok).toBe(false);
    expect(renamePlayer(s, s.squad[0]!.id, s.squad[0]!.name)).toEqual({ ok: true, patch: null });
  });
});

describe('renaming a club', () => {
  it('renames your club: clubName and its league entry together, so fixtures and the ladder follow', () => {
    const s = career();
    const res = renameClub(s, PLAYER_ID, 'Cavehole Crushers II');
    const next = apply(s, res.ok ? res.patch : null);
    expect(next.clubName).toBe('Cavehole Crushers II');
    expect(clubNameMap(next.league.clubs)[PLAYER_ID]).toBe('Cavehole Crushers II');
    // Your colours stay with the Kit and the title screen's palette.
    expect(renameClub(s, PLAYER_ID, 'Other', ['#000000', '#ffffff']).ok && next.league.clubs.find((c) => c.id === PLAYER_ID)!.colors)
      .toEqual(s.league.clubs.find((c) => c.id === PLAYER_ID)!.colors);
  });

  it('renames and recolours a rival', () => {
    const s = career();
    const res = renameClub(s, 'rival-wolves', 'Woolloomooloo Whalers', ['#1a1a2e', '#f4d03f']);
    const next = apply(s, res.ok ? res.patch : null);
    const club = next.league.clubs.find((c) => c.id === 'rival-wolves')!;
    expect(club.name).toBe('Woolloomooloo Whalers');
    expect(club.colors).toEqual(['#1a1a2e', '#f4d03f']);
    expect(club.squad).toBe(s.league.clubs.find((c) => c.id === 'rival-wolves')!.squad);
    expect(next.clubName).toBe(s.clubName);
  });

  it('refuses colours that do not read apart, a bad name or a club not in the league', () => {
    const s = career();
    expect(renameClub(s, 'rival-wolves', 'Wolves', ['#ffffff', '#fefefe']).ok).toBe(false);
    expect(renameClub(s, 'rival-wolves', 'W').ok).toBe(false);
    expect(renameClub(s, 'rival-nobody', 'Nobodies').ok).toBe(false);
    expect(validClubColors(['#1a1a2e', '#f4d03f'])).toBe(true);
    expect(validClubColors(['red', 'blue'])).toBe(false);
    expect(validClubColors(['#1a1a2e'])).toBe(false);
  });
});

describe('the names file', () => {
  it('holds every player and club by id', () => {
    const s = career();
    const f = namesFile(s);
    expect(Object.keys(f.players)).toHaveLength(allPlayers(s).length);
    expect(f.clubs[PLAYER_ID]!.name).toBe(s.clubName);
    expect(f.clubs['rival-reapers']!.colors).toEqual(s.league.clubs.find((c) => c.id === 'rival-reapers')!.colors);
    expect(JSON.parse(exportNames(s))).toEqual(f);
  });

  it('exported from one save of a career and imported into another, it applies the renames', () => {
    const base = career();
    // The renamed save: a player, your club, a rival's name and colours.
    let renamed = base;
    for (const step of [
      renamePlayer(renamed, base.squad[2]!.id, 'Jett Bumpus'),
    ]) renamed = apply(renamed, step.ok ? step.patch : null);
    const club = renameClub(renamed, PLAYER_ID, 'Paddo Pelicans');
    renamed = apply(renamed, club.ok ? club.patch : null);
    const rival = renameClub(renamed, 'rival-gulls', 'Geelong Galahs', ['#c0392b', '#ffffff']);
    renamed = apply(renamed, rival.ok ? rival.patch : null);

    const res = importNames(base, exportNames(renamed));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.players).toBe(1);
    expect(res.clubs).toBe(2);
    const next = apply(base, res.patch);
    expect(next.squad[2]!.name).toBe('Jett Bumpus');
    expect(next.clubName).toBe('Paddo Pelicans');
    expect(next.league.clubs.find((c) => c.id === PLAYER_ID)!.name).toBe('Paddo Pelicans');
    expect(next.league.clubs.find((c) => c.id === 'rival-gulls')).toMatchObject({ name: 'Geelong Galahs', colors: ['#c0392b', '#ffffff'] });
    // Only names and colours move: the rest of the save is the one it was imported into.
    expect(next.money).toBe(base.money);
    expect(next.squad.map((p) => p.stats)).toEqual(base.squad.map((p) => p.stats));
  });

  it('a file that already matches applies nothing', () => {
    const s = career();
    expect(importNames(s, exportNames(s))).toEqual({ ok: true, patch: null, players: 0, clubs: 0 });
  });

  it('keeps a long club name typed at the start (up to 32) when it comes back unchanged', () => {
    const s = career('The Very Long Club Name Of Thirty');
    expect(importNames(s, exportNames(s)).ok).toBe(true);
  });

  it('refuses a bad file and changes nothing', () => {
    const s = career();
    const good = namesFile(s);
    const id = s.squad[0]!.id;
    const bad = [
      'not json',
      '[]',
      JSON.stringify({ players: {} }),
      exportNamesLike(s), // a save file is not a names file
      JSON.stringify({ ...good, players: { ...good.players, [id]: 'x' } }),
      JSON.stringify({ ...good, players: { ...good.players, [id]: 42 } }),
      JSON.stringify({ ...good, players: { ...good.players, [id]: 'Bad\u0001Name' } }),
      JSON.stringify({ ...good, clubs: { ...good.clubs, 'rival-wolves': { name: 'Wolves', colors: ['#ffffff', '#ffffff'] } } }),
      JSON.stringify({ ...good, clubs: { ...good.clubs, 'rival-wolves': { colors: ['#000000', '#ffffff'] } } }),
      JSON.stringify({ players: { 'p-from-elsewhere': 'Some One' }, clubs: { 'rival-elsewhere': { name: 'Elsewhere', colors: ['#000000', '#ffffff'] } } }),
    ];
    for (const text of bad) {
      const res = importNames(s, text);
      expect(res.ok, text.slice(0, 60)).toBe(false);
      if (!res.ok) expect(res.message.length).toBeGreaterThan(0);
    }
  });

  it("skips ids from another career but applies this one's", () => {
    const s = career();
    const id = s.squad[0]!.id;
    const res = importNames(s, JSON.stringify({ players: { [id]: 'Kobi Hardcastle', 'p-elsewhere': 'Some One' }, clubs: {} }));
    expect(res.ok && res.players).toBe(1);
  });

  it("skips another career's club unread, even with colours that would be refused here", () => {
    const s = career();
    const good = namesFile(s);
    const res = importNames(s, JSON.stringify({
      ...good,
      players: { ...good.players, [s.squad[0]!.id]: 'Kobi Hardcastle' },
      clubs: { ...good.clubs, 'rival-elsewhere': { name: 'Elsewhere', colors: ['#ffffff', '#ffffff'] } },
    }));
    expect(res.ok && res.players).toBe(1);
  });
});

/** The save file's text, for the refusal test. */
function exportNamesLike(s: GameState): string {
  return JSON.stringify(s);
}
