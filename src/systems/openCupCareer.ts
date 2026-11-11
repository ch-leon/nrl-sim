// DEV-only sporting integration (#575). Ordinary careers and finance stay gated.
import type { GameState } from '../core/state';
import type { ContentPack } from '../content/pack';
import type { RegionalCareerProfile } from '../data/divisions';
import { validateCompetitions, type CompetitionDefinition, type CompetitionInstance } from '../data/competition';
import { BENCH } from '../match/league/bench';
import { advanceOpenCup, drawOpenCup, isOpenCupInstance } from './openCup';

/** Only dates left free by every division are available for a cross-tier cup. */
export function openCupProfileSlots(profile: RegionalCareerProfile): number[] {
  const used = new Set([...profile.trialSlots, ...profile.divisions.flatMap(d => [...d.regularSlots, ...d.finalsSlots])]);
  return profile.calendarSlots.filter(s => s.kind === 'competition' && !used.has(s.id)).map(s => s.id);
}

/** Undefined means automatic entry when this authored profile has room. False
 * declines only the player; other eligible clubs still enter the world event. */
export function structuralOpenCup(profile: RegionalCareerProfile, pack: ContentPack, seed: number,
  clubIds: readonly string[], playerId: string, enterPlayer?: boolean): CompetitionInstance | undefined {
  const slots = openCupProfileSlots(profile);
  const rounds = Math.ceil(Math.log2(Math.max(2, clubIds.length)));
  if (slots.length < rounds) {
    if (enterPlayer === true) throw new Error('This career profile has no valid Open Cup window.');
    return undefined;
  }
  const definition: CompetitionDefinition = {
    id: `${profile.id}:open-cup`, version: profile.version, pack: pack.id, name: 'Open Cup',
    format: { kind: 'knockout' }, minEntrants: 2, maxEntrants: 2 ** rounds, slotCount: profile.slotCount,
    stages: [{ id: 'cup', name: 'Open Cup', kind: 'knockout', rounds, slotIds: slots.slice(-rounds) }],
    matchRules: { ...pack.rules }, lineup: { onField: pack.league.onField, benchSize: BENCH.size, minSquad: pack.league.squadMin, maxSquad: pack.league.squadCap },
    eligibility: { kind: 'open' }, venues: { rounds: 'drawn-home', final: 'neutral' }, drawnKnockout: 'seeded-draw',
    // Structural experiments have no effective prize and cannot become a
    // retroactive financial claim when the settlement system ships.
    rewards: [],
  };
  return drawOpenCup({ definition, season: 1, seed, clubIds, playerId, enterPlayer: enterPlayer ?? true, currentSlot: 1 }).instance;
}

/** Existing match hooks have already committed the sporting results. Append only
 * known opponents; finalisation, statistics and reward settlement are not replayed. */
export function prepareOpenCup(state: GameState): GameState {
  const competitions = state.competitions;
  if (!competitions || competitions.calendar?.mode !== 'structural' || competitions.calendar.status !== 'active') return state;
  let changed = false;
  const instances = competitions.instances.map(instance => {
    if (instance.season !== state.season || !isOpenCupInstance(instance)) return instance;
    const advanced = advanceOpenCup(instance).instance;
    changed ||= advanced !== instance;
    return advanced;
  });
  if (!changed) return state;
  const next = { ...state, competitions: { ...competitions, instances } };
  const problem = validateCompetitions(next.competitions, { pack: next.pack ?? 'au', season: next.season, week: next.week, clubIds: next.league.clubs.map(c => c.id) });
  if (problem) throw new Error(`Invalid Open Cup transition: ${problem}`);
  return next;
}
