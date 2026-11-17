// One pure allocation policy shared by validation and selection previews.
import type { CompetitionInstance } from './competition';
import type { CompetitionWorldMetadata } from './competitionDivisions';
import type { LeagueCloseFacts, LeagueMovement } from './leagueCareer';
import type { LeagueFields } from './divisions';
export type { LeagueMovement } from './leagueCareer';
export interface LeagueAllocation { policy: 'adjacent-vacancy-v1'; fields: LeagueFields; movements: LeagueMovement[] }

/** Every participant is selected from the original completed fields. */
export function allocateLeagueFields(world: CompetitionWorldMetadata, close: LeagueCloseFacts, playerId: string, targetLeagueId: string, instances: readonly CompetitionInstance[]): LeagueAllocation {
  const divisions = [...world.divisions].sort((a,b) => a.rank - b.rank);
  const facts = divisions.map(d => close.leagues.find(l => l.leagueId === d.id));
  if (facts.some(f => !f) || close.leagues.length !== divisions.length || !divisions.some(d => d.id === targetLeagueId)) throw new Error('Invalid league allocation source');
  const allIds = facts.flatMap(f => f!.standings.map(s => s.clubId));
  if (new Set(allIds).size !== allIds.length || allIds.filter(id => id === playerId).length !== 1
    || facts.some(f => !f!.standings.length || f!.standings.some(s => !s.clubId || !Number.isSafeInteger(s.position) || s.position < 1))) throw new Error('Invalid original league fields');
  const from = facts.findIndex(f => f!.standings.some(s => s.clubId === playerId));
  const to = divisions.findIndex(d => d.id === targetLeagueId);
  const fields: Record<string, string[]> = Object.fromEntries(facts.map(f => {
    const instance = instances.find(i => i.id === f!.instanceId && i.season === close.season);
    if (!instance || instance.definition.id !== `${world.profile.id}:${f!.leagueId}` || instance.entrantIds.length !== f!.standings.length
      || instance.entrantIds.some(id => !f!.standings.some(s => s.clubId === id))) throw new Error('Invalid original league instance');
    return [f!.leagueId, [...instance.entrantIds]];
  }));
  const movements: LeagueMovement[] = [];
  if (from === to) return {policy: 'adjacent-vacancy-v1', fields, movements};
  const move = (clubId: string, source: number, destination: number): void => {
    const sourceId = divisions[source]!.id; const destinationId = divisions[destination]!.id;
    fields[sourceId] = fields[sourceId]!.filter(id => id !== clubId); fields[destinationId]!.push(clubId);
    movements.push({clubId, fromLeagueId: sourceId, toLeagueId: destinationId});
  };
  move(playerId, from, to);
  const used = new Set([playerId]); const step = to > from ? 1 : -1;
  for (let rank = from + step; step > 0 ? rank <= to : rank >= to; rank += step) {
    const ai = facts[rank]!.standings.filter(s => !used.has(s.clubId)).sort((a,b) =>
      (step > 0 ? b.position - a.position : a.position - b.position) || a.clubId.localeCompare(b.clubId))[0];
    if (!ai) throw new Error('No original AI available for vacancy');
    used.add(ai.clubId); move(ai.clubId, rank, rank - step);
  }
  if (divisions.some((d,i) => fields[d.id]!.length !== facts[i]!.standings.length)
    || new Set(Object.values(fields).flat()).size !== allIds.length) throw new Error('Invalid allocated league coverage');
  return {policy: 'adjacent-vacancy-v1', fields, movements};
}
