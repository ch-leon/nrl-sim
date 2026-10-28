// src/systems/rename.ts — renaming players and clubs in-game (GitHub #398).
//
// A rename writes the fields the save already has: Player.name (in the squad,
// the free agents or a rival's squad), clubName with the player's own league
// entry, and a rival's RivalClub.name and colors. Lines already written (news,
// history, a report) keep the old name. Every function here is pure: it takes
// the state and returns the patch for setState, or null when nothing changes.
// No DOM, no Phaser.

import type { GameState, Player, RivalClub } from '../core/state';
import { cleanName } from '../data/names';
import { colorsContrast } from '../config';

const HEX = /^#[0-9a-f]{6}$/i;

/** Two hex kit colours far enough apart to read as two (the club colour picker's rule). */
export function validClubColors(colors: unknown): colors is [string, string] {
  return Array.isArray(colors) && colors.length === 2
    && colors.every((c) => typeof c === 'string' && HEX.test(c))
    && colorsContrast(colors[0] as string, colors[1] as string);
}

/** Every player the save holds, by id: your squad, the free agents, the rivals' squads. */
export function allPlayers(state: Pick<GameState, 'squad' | 'freeAgents' | 'league'>): Player[] {
  return [...state.squad, ...state.freeAgents, ...state.league.clubs.flatMap((c) => c.squad ?? [])];
}

const renamed = (list: Player[], names: ReadonlyMap<string, string>): Player[] => {
  if (!list.some((p) => names.has(p.id) && names.get(p.id) !== p.name)) return list;
  return list.map((p) => (names.has(p.id) && names.get(p.id) !== p.name ? { ...p, name: names.get(p.id)! } : p));
};

/**
 * The patch that renames players by id, wherever they are. Names must already be
 * clean ({@link cleanName}). Null when no name changes.
 */
export function renamePlayersPatch(state: GameState, names: ReadonlyMap<string, string>): Partial<GameState> | null {
  const squad = renamed(state.squad, names);
  const freeAgents = renamed(state.freeAgents, names);
  const clubs = state.league.clubs.map((c) => {
    if (!c.squad) return c;
    const squad = renamed(c.squad, names);
    return squad === c.squad ? c : { ...c, squad };
  });
  const clubsChanged = clubs.some((c, i) => c !== state.league.clubs[i]);
  if (squad === state.squad && freeAgents === state.freeAgents && !clubsChanged) return null;
  return {
    ...(squad !== state.squad ? { squad } : {}),
    ...(freeAgents !== state.freeAgents ? { freeAgents } : {}),
    ...(clubsChanged ? { league: { ...state.league, clubs } } : {}),
  };
}

/** What a club rename asks for: a new name, and for a rival new kit colours. */
export interface ClubEdit { name: string; colors?: [string, string] }

/**
 * The patch that renames clubs by id (and recolours rivals). Your own club's
 * name is clubName and its league entry together; its colours are not changed
 * here (the title screen's palette and the Kit designer own them). Names and
 * colours must already be valid. Null when nothing changes.
 */
export function renameClubsPatch(state: GameState, edits: ReadonlyMap<string, ClubEdit>): Partial<GameState> | null {
  let changed = false;
  const clubs = state.league.clubs.map((c): RivalClub => {
    const e = edits.get(c.id);
    if (!e) return c;
    const colors = c.id !== state.clubId && e.colors ? e.colors : c.colors;
    if (e.name === c.name && colors[0] === c.colors[0] && colors[1] === c.colors[1]) return c;
    changed = true;
    return { ...c, name: e.name, colors: [colors[0], colors[1]] };
  });
  const own = edits.get(state.clubId);
  const clubName = own && own.name !== state.clubName ? own.name : null;
  if (!changed && clubName === null) return null;
  return {
    ...(changed ? { league: { ...state.league, clubs } } : {}),
    ...(clubName !== null ? { clubName } : {}),
  };
}

export type RenameResult = { ok: true; patch: Partial<GameState> | null } | { ok: false; why: string };

/** Rename one player from typed text. `patch` is null when the name is unchanged. */
export function renamePlayer(state: GameState, id: string, raw: string): RenameResult {
  const check = cleanName(raw);
  if (!check.ok) return check;
  if (!allPlayers(state).some((p) => p.id === id)) return { ok: false, why: 'That player is no longer there' };
  return { ok: true, patch: renamePlayersPatch(state, new Map([[id, check.name]])) };
}

/** Rename one club from typed text (a rival's colours with it). `patch` is null when nothing changes. */
export function renameClub(state: GameState, id: string, raw: string, colors?: [string, string]): RenameResult {
  const check = cleanName(raw);
  if (!check.ok) return check;
  if (!state.league.clubs.some((c) => c.id === id)) return { ok: false, why: 'That club is not in the league' };
  if (colors && !validClubColors(colors)) return { ok: false, why: 'Pick two colours that read apart' };
  return { ok: true, patch: renameClubsPatch(state, new Map([[id, { name: check.name, ...(colors ? { colors } : {}) }]])) };
}
