// src/data/league.ts — the 15 fictional rival clubs (BAK-184, WU-7).
// Invented Aussie rugby-league flavour ONLY: no real NRL club names or
// trademarks. Each club carries two hex kit colours (cosmetic) and a `strength`
// baseline (42–70, spread around LEAGUE.MEAN) that seeds each rival's squad at a
// new game (systems/rivals.ts), rival team sheets (src/match/league/sheets.ts
// teamSheetFromRival) and the cheap round sim. Pure data, no Phaser, no store.
//
// The player's club is the 16th league entry, added at runtime by
// src/systems/fixtures.ts initLeague() as { id: 'player', ... } — it is NOT in
// this list.

import type { RivalClub } from '../core/state';

/**
 * 15 invented rival clubs. `strength` is spread across the 42–70 band, two
 * points apart and centred on LEAGUE.MEAN (a mix of cellar-dwellers, mid-table
 * sides and title contenders) so the ladder has a believable shape before the
 * player's results land: a 35 side lost every week and a 78 side ran away (#140).
 * ids are stable, kebab-case, and prefixed `rival-` so they never collide with
 * the player's `'player'` id. New games only — a save's rivals keep the strength
 * their squads give them.
 */
export const RIVAL_CLUBS: readonly RivalClub[] = [
  { id: 'rival-reapers', name: 'Redcliffe Reapers', colors: ['#8e1c1c', '#f2c14e'], strength: 70 },
  { id: 'rival-wolves', name: 'Woolloomooloo Wolves', colors: ['#37474f', '#b0bec5'], strength: 68 },
  { id: 'rival-thunder', name: 'Toowoomba Thunder', colors: ['#1a237e', '#ffd54f'], strength: 63 },
  { id: 'rival-cyclones', name: 'Cairns Cyclones', colors: ['#00695c', '#e0f2f1'], strength: 61 },
  { id: 'rival-brumbies', name: 'Ballarat Brumbies', colors: ['#4e342e', '#d7a86e'], strength: 56 },
  { id: 'rival-mariners', name: 'Mackay Mariners', colors: ['#01579b', '#4fc3f7'], strength: 52 },
  { id: 'rival-diggers', name: 'Dubbo Diggers', colors: ['#5d4037', '#a1887f'], strength: 48 },
  { id: 'rival-scorpions', name: 'Shellharbour Scorpions', colors: ['#212121', '#ff7043'], strength: 46 },
  { id: 'rival-crocs', name: 'Katherine Crocs', colors: ['#33691e', '#aed581'], strength: 59 },
  { id: 'rival-swagmen', name: 'Wagga Swagmen', colors: ['#4a148c', '#ce93d8'], strength: 54 },
  { id: 'rival-gulls', name: 'Geelong Gulls', colors: ['#0d47a1', '#ffffff'], strength: 50 },
  { id: 'rival-brollys', name: 'Broken Hill Brollys', colors: ['#bf360c', '#ffcc80'], strength: 44 },
  { id: 'rival-stingrays', name: 'Southport Stingrays', colors: ['#006064', '#80deea'], strength: 65 },
  { id: 'rival-drovers', name: 'Darwin Drovers', colors: ['#3e2723', '#ffb300'], strength: 57 },
  { id: 'rival-larrikins', name: 'Launceston Larrikins', colors: ['#1b5e20', '#c5e1a5'], strength: 42 },
];
