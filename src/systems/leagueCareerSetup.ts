import { DEFAULT_PLAYER_COLORS } from '../config';
import { activePack, packForCountry, preparePack, selectPack } from '../content';
import { captureSlot, getActiveSlot, writeSlot } from '../core/save';
import { buildNewGameState, getState, loadState, stateInstallation, type GameState, type NewGameOptions } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { createDivisionWorld } from '../data/divisions';
import { freshCapAccount, tierForRank } from './cap';
import { competitionLadder } from './competitionCalendar';
import { buildDivisionTrials, scheduleDivisionLeagues } from './divisionCareer';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import { autoPick } from './lineup';
import { clearLiveMatch } from './liveMatchRecord';
import { admitGeneratedPeople, initialPlayerPopulation } from './playerCareer';
import { hashString } from './rivals';
import { commitUndo } from './undo';

export interface LeagueCareerOptions extends NewGameOptions {
  clubName: string;
  seed: number;
  colors?: [string, string] | undefined;
}
export interface LeagueCareerDestination { slot: number; expectedOriginal: string | null }

export async function prepareLeagueCareer(options: LeagueCareerOptions): Promise<GameState> {
  const id = packForCountry(options.home?.country);
  await preparePack(id);
  const profile = id === 'uk' ? (await import('../content/career/uk')).UK_CAREER_PROFILE
    : (await import('../content/career/au')).AU_CAREER_PROFILE;
  const previous = activePack().id;
  try {
    selectPack(id);
    const { seed, clubName } = options;
    const base = buildNewGameState(clubName, seed, options);
    const world = createDivisionWorld(profile, activePack(), seed, {
      name: clubName, colors: options.colors ?? DEFAULT_PLAYER_COLORS, difficulty: base.settings.difficulty,
    });
    const leagues = scheduleDivisionLeagues(world);
    const local = leagues.find(i => i.entrantIds.includes(base.clubId))!;
    const start = world.divisions.find(d => d.id === profile.startingDivisionId)!;
    const league = { clubs: world.clubs, fixtures: [], ladder: competitionLadder(local) };
    const candidate: GameState = {
      ...base, squad: world.squad, lineup: autoPick(world.squad), league, freeAgents: [],
      playerPopulation: initialPlayerPopulation({season: 1, squad: world.squad, freeAgents: [], league}),
      capAccount: freshCapAccount(tierForRank(start.rank)), preseason: 0,
      rngSeed: (seed ^ hashString(profile.id + ':calendar')) >>> 0,
      competitions: {
        schemaVersion: 1, instances: [...leagues, ...buildDivisionTrials(world, profile, 1, seed)],
        world: { profile: world.profile, divisions: world.divisions },
        calendar: { mode: 'structural', status: 'active', season: 1, elapsedIntervals: 0,
          slots: profile.calendarSlots.map(s => ({...s})) },
        leagueCareer: { version: 1, scheduleSeed: seed, clubId: base.clubId, phase: 'initial-choice',
          access: [{ leagueId: profile.startingDivisionId }],
          initialFields: Object.fromEntries(world.divisions.map(d => [d.id, [...leagues.find(i => i.id === d.instanceId)!.entrantIds]])) },
      },
    };
    const admitted = admitGeneratedPeople(candidate, base.freeAgents);
    if (!admitted) throw new Error('Could not register the opening free agents.');
    candidate.freeAgents = admitted.players;
    candidate.playerPopulation = { ...admitted.playerPopulation, shortlistIds: admitted.players.map(p => p.id) };
    const problem = leagueCareerStateProblem(candidate);
    if (problem) throw new Error(problem.message);
    return candidate;
  } finally { selectPack(previous); }
}

export async function startLeagueCareer(options: LeagueCareerOptions,
  destination: LeagueCareerDestination = { slot: getActiveSlot(), expectedOriginal: null },
): Promise<{ok: true; state: GameState} | {ok: false; message: string}> {
  const installation = stateInstallation();
  const source = installation ? getState() : null;
  const { slot, expectedOriginal } = destination;
  const ownsDestination = () => stateInstallation() === installation
    && (!source || getState() === source) && slot === getActiveSlot() && careerNamespace() === null;
  const changed = { ok: false as const, message: 'The career or save slot changed. Choose the slot again.' };
  if (!ownsDestination()) return changed;
  let state: GameState;
  try { state = await prepareLeagueCareer(options); }
  catch (error) { return {ok: false, message: error instanceof Error ? error.message : 'The League career could not be prepared.'}; }
  if (!ownsDestination()) return changed;
  const { raw, result } = captureSlot(slot);
  if (result.status !== 'empty' && result.status !== 'ok') return {ok: false, message: result.message};
  if (raw !== expectedOriginal || !ownsDestination()) return changed;
  if (!writeSlot(slot, state, expectedOriginal)) return {ok: false, message: 'The new League career could not be saved. Check your storage and try again.'};
  commitUndo();
  clearLiveMatch(slot);
  loadState(state);
  return {ok: true, state};
}
