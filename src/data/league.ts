// src/data/league.ts — the fictional rival clubs (BAK-184, WU-7), from the
// active content pack (#361; AU's 15 are in src/content/au.ts). Invented clubs
// ONLY: no real club names or trademarks. Each club carries two hex kit colours
// (cosmetic) and a `strength` baseline (spread around LEAGUE.MEAN) that seeds
// each rival's squad at a new game (systems/rivals.ts), rival team sheets
// (src/match/league/sheets.ts teamSheetFromRival) and the cheap round sim. Pure
// data, no Phaser, no store.
//
// The player's club is the 16th league entry, added at runtime by
// src/systems/fixtures.ts initLeague() as { id: 'player', ... } — it is NOT in
// this list.

import type { RivalClub } from '../core/state';
import { activePack } from '../content';

/**
 * The rival clubs, 15 in the AU pack. ids are stable, kebab-case, and prefixed
 * `rival-` so they never collide with the player's `'player'` id. New games
 * only — a save's rivals keep the strength their squads give them.
 */
export const RIVAL_CLUBS: readonly RivalClub[] = activePack().clubs;
