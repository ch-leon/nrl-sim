// src/match/lab/sheets.ts — team sheets for the lab from the fictional league's
// clubs (real names, colours and generated rosters), so the lab needs no save.
// The trait mode lets a mechanic be watched in isolation: as rolled, with no
// traits at all, or with every player a superstar.
import { RIVAL_CLUBS } from '../../data/league';
import { POOL_IDS, TRAITS, type TraitInstance } from '../../data/traits';
import { teamSheetFromRival } from '../../sim/engine';
import { makeRng } from '../../utils/rng';
import type { RosterEntry, TeamSheet } from '../../sim/events';

export interface LabClub {
  id: string;
  name: string;
}

export const LAB_CLUBS: readonly LabClub[] = RIVAL_CLUBS.map((c) => ({ id: c.id, name: c.name }));

export const DEFAULT_HOME = LAB_CLUBS[0]?.id ?? 'home';
export const DEFAULT_AWAY = LAB_CLUBS[1]?.id ?? 'away';

/** gen: traits as the club rolled them · none: strip them · stars: two level-III position traits each. */
export type TraitMode = 'gen' | 'none' | 'stars';
export const TRAIT_MODES: readonly TraitMode[] = ['gen', 'none', 'stars'];
export const isTraitMode = (s: string | null | undefined): s is TraitMode => TRAIT_MODES.includes(s as TraitMode);

/** Sheet for a club id; unknown ids fall back to the first club. */
export function labSheet(clubId: string, traits: TraitMode = 'gen'): TeamSheet {
  const club = RIVAL_CLUBS.find((c) => c.id === clubId) ?? RIVAL_CLUBS[0];
  if (!club) throw new Error('no clubs defined');
  const sheet = teamSheetFromRival(club);
  if (traits === 'gen' || !sheet.roster) return sheet;
  return { ...sheet, roster: sheet.roster.map((r, i) => withMode(r, traits, `${club.id}:${i}`)) };
}

function withMode(r: RosterEntry, mode: TraitMode, key: string): RosterEntry {
  const { traits: _drop, ...rest } = r;
  if (mode === 'none') return rest;
  return { ...rest, traits: starTraits(r.position, key) };
}

/** Two different position-fit traits at level III, deterministic per player. */
export function starTraits(position: RosterEntry['position'], key: string): TraitInstance[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  const rng = makeRng(h);
  const fit = POOL_IDS.filter((id) => TRAITS[id].fit === null || TRAITS[id].fit!.includes(position));
  const pool = rng.shuffle(fit.length >= 2 ? fit : POOL_IDS);
  return pool.slice(0, 2).map((id) => ({ id, level: 3 as const }));
}
