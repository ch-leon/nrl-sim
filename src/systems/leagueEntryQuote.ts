import type { GameState } from '../core/state';
import type { LeagueFields } from '../data/divisions';
import type { EntryQuote } from '../data/leagueEntryReceipt';
import { competitionInstanceId } from '../data/competition';
import { divisionForClub } from '../data/competitionDivisions';
import type { LeagueMovement } from '../data/leagueCareer';
import { leagueCommitmentPreview } from './leagueSelection';
import { squadStrength } from './rivals';
import { tierCap, tierForRank } from './cap';

export function entryQuote(state: GameState, season: number, leagueId: string, fields: LeagueFields,
  movements: readonly LeagueMovement[]): EntryQuote {
  const world = state.competitions!.world!;
  const selected = new Set([state.clubId, ...movements.map(m => m.clubId)]);
  const accounts = new Map(world.divisions.flatMap(d => fields[d.id]!.map(id => {
    const club = state.league.clubs.find(c => c.id === id)!;
    const players = id === state.clubId ? state.squad : club.squad;
    const account = id === state.clubId ? state.capAccount : club.capAccount;
    if (!players || !account || !Number.isSafeInteger(id === state.clubId ? state.money : club.cash))
      throw new Error('A club is missing its roster or financial account.');
    const from = divisionForClub(world, state.competitions!.instances, id)!.division;
    if (tierCap(account.tier) < tierCap(tierForRank(from.rank))) throw new Error('Club capacity is below its current division.');
    // On the locked opening cards the field is today's actual division, while
    // the displayed player capacity is the hypothetical destination quote.
    const targetRank = id === state.clubId ? world.divisions.find(d => d.id === leagueId)!.rank : d.rank;
    const quote = leagueCommitmentPreview(players, account, season, targetRank);
    if (quote.years.some(y => !Object.values(y).every(Number.isSafeInteger) || y.unprotectedExcess > 0))
      throw new Error('Signed commitments exceed available club capacity.');
    return [id, { clubId: id, ...quote }] as const;
  })));
  const opponents = fields[leagueId]!.filter(id => id !== state.clubId).map(clubId => {
    const club = state.league.clubs.find(c => c.id === clubId)!;
    return { clubId, strength: squadStrength(club.squad!) };
  });
  return {
    definitionInstanceId: competitionInstanceId(`${world.profile.id}:${leagueId}`, season, 0), opponents,
    commitments: [...selected].map(id => accounts.get(id)!)
  };
}
