// QA-only optional League harness. No code on the normal game or Classic soak path.
import { activePack, selectPack } from '../../content';
import { bus } from '../../core/events';
import { __setStorage, __unlockSaves, captureSlot, flushSaveMeta, getActiveSlot, importSave, saveIfChanged, setActiveSlot } from '../../core/save';
import { getState, loadState, setState, type GameState } from '../../core/state';
import { careerNamespace, setCareerNamespace } from '../../core/storage/local';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, registerTickHook, TICK_ORDER, weekHeld } from '../../core/time';
import { WEEKLY_FATIGUE } from '../../data/cards';
import { canonicalLeagueJson } from '../../data/leagueCareer';
import { overallRating } from '../../data/player';
import { homeGate, weeklyIncome, weeklyOverhead, weeklyUpkeep, weeklyWages } from '../../systems/economy';
import { startLeagueCareer } from '../../systems/leagueCareerSetup';
import { previewLeagueEntry } from '../../systems/leagueEntry';
import { confirmLeagueEntry } from '../../systems/leagueEntryCommit';
import { leagueSeasonView, nextSeasonFixture, type LeagueFixtureView } from '../../systems/leagueSeasonView';
import { isSelectable } from '../../systems/lineup';
import { captureCampAction, confirmCampAction } from '../../systems/playerAssignmentCommit';
import { currentSkillsCamp } from '../../systems/playerAssignments';
import { awayPlayerIds } from '../../systems/playerAvailability';
import { levelPointSpendMode, setSpendMode } from '../../systems/training';
import { weeklyFatigueOf } from '../../systems/weeklyFatigue';
import { advanceWeekAsTapped, buildFirstFree, checkState, registerAllSystems, type SoakOptions } from '../soak';
import { createCardPolicy, emptyCardPolicyStats, openingLineup, restAbove, type CardPolicyStats } from './cardWeek';
import { personaById } from './index';
import { createPersonaManager } from './policy';

const injuryLine = WEEKLY_FATIGUE.INJURY_TIERS[1].above;
const homes = { au: { town: 'Brisbane', country: 'AU' }, uk: { town: 'Leeds', country: 'GB' } } as const;
type MatchKind = 'regular' | 'final' | 'trial' | 'cup';
interface Kickoff {
  starters: {id: string; fatigue: number}[];
  injuries: {playerId: string | null; weeks: number}[];
  score: {homeScore: number; awayScore: number} | null;
}
interface LeagueMatchSample extends Kickoff {
  fixtureId: string;
  kind: MatchKind;
  season: number;
  round: number;
  week: number;
  winnerId: string | null;
  decider: LeagueFixtureView['decider'];
}
interface LeaguePersonaSeason extends CardPolicyStats {
  season: number;
  status: 'complete' | 'sacked' | 'partial';
  leagueId: string;
  cashRound7: number | null;
  cash: number;
  wins: number;
  draws: number;
  losses: number;
  ladderPosition: number | null;
  premiership: boolean;
  strikes: number;
  patience: number;
  injuries: number;
  injuryWeeksLost: number;
  bonusEventsEntered: number;
  startersAtKickoff: number;
  startersAbove60: number;
  fixtures: LeagueMatchSample[];
}
export interface LeaguePersonaResult {
  careerMode: 'league';
  cardWeek: boolean;
  pack: 'au' | 'uk';
  persona: string;
  difficulty: NonNullable<SoakOptions['difficulty']>;
  seed: number;
  intervals: number;
  saves: string[];
  seasons: LeaguePersonaSeason[];
  problems: string[];
}

function kindOf(view: NonNullable<ReturnType<typeof leagueSeasonView>>, row: LeagueFixtureView): MatchKind {
  if (row.stageKind === 'exhibition') return 'trial';
  if (row.instance.id !== view.instance.id) return 'cup';
  return row.stageKind === 'league' ? 'regular' : 'final';
}

/** A common bonus-event policy in both arms. Card careers may exclude tired participants. */
function bookCamp(limit: number): void {
  const s = getState();
  if (currentSkillsCamp(s)?.status !== 'available') return;
  const away = awayPlayerIds(s);
  const starters = new Set(openingLineup(s).starters.map(p => p?.id));
  const eligible = s.squad.filter(p => isSelectable(p, away) && weeklyFatigueOf(s, p.id) <= limit)
    .sort((a,b) => Number(starters.has(b.id)) - Number(starters.has(a.id)) || overallRating(b) - overallRating(a) || a.id.localeCompare(b.id));
  for (const player of eligible) {
    const offer = captureCampAction({kind:'book', participantId:player.id, focus:null});
    if (!offer.ok) continue;
    const book = confirmCampAction(offer.selection);
    if (!book.ok) throw new Error(book.message);
    return;
  }
}

export async function runLeaguePersona(options: SoakOptions): Promise<LeaguePersonaResult> {
  const config = typeof options.persona === 'string' ? personaById(options.persona) : options.persona;
  if (options.mode !== 'persona' || !config || options.fromSave !== undefined || options.fromVersion !== undefined) {
    throw new Error('A League persona case must use a fresh, normal League career');
  }
  const result: LeaguePersonaResult = {
    careerMode: 'league', cardWeek: options.cardWeek ?? false, pack: options.pack ?? 'au',
    persona: config.id, difficulty: options.difficulty ?? 'normal', seed: options.seed,
    intervals: 0, saves: [], seasons: [], problems: [],
  };
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); },
    removeItem: (key: string) => { bytes.delete(key); },
  };
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const priorNamespace = careerNamespace();
  const priorSlot = getActiveSlot();
  const priorPack = activePack().id;
  const priorSpendMode = levelPointSpendMode();
  flushSaveMeta(); bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
  Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:storage});
  setCareerNamespace(null); __setStorage(storage); __unlockSaves(); setActiveSlot(1);
  let stage = 'start';
  let injuryWeeksLost = 0;
  let cashRound7: number | null = null;
  const kickoffs = new Map<string,Kickoff>();
  function check(label: string): void {
    const errors = checkState(getState());
    if (errors.length) throw new Error(`${label}: ${errors.join('; ')}`);
    const intervalError = failedIntervalProblem();
    if (intervalError) throw new Error(intervalError);
    if (weekHeld()) throw new Error('the interval is still held after playing');
  }
  function roundTrip(label: string): void {
    const before = getState();
    if (!saveIfChanged(before)) throw new Error(`${label}: normal save refused`);
    const save = captureSlot(1);
    if (save.result.status !== 'ok' || save.raw === null) throw new Error(`${label}: normal saved slot refused`);
    const imported = importSave(save.raw);
    if (!imported.ok || save.result.repairs.length || imported.repairs.length) throw new Error(`${label}: normal save repaired/refused`);
    if (canonicalLeagueJson(save.result.state) !== canonicalLeagueJson(before) || canonicalLeagueJson(imported.state) !== canonicalLeagueJson(before)) {
      throw new Error(`${label}: normal save changed during reload`);
    }
    loadState(save.result.state);
    result.saves.push(label);
  }
  function chooseLeague(leagueId: string): void {
    const quote = previewLeagueEntry(getState(), leagueId);
    if (!quote.ok) throw new Error(quote.message);
    const accepted = confirmLeagueEntry(quote.preview);
    if (!accepted.ok) throw new Error(accepted.message);
  }
  const nextHome = (s: GameState) => leagueSeasonView(s)?.fixtures.find(f => f.status === 'scheduled'
    && f.slot !== null && f.slot >= s.week && f.fixture.homeId === s.clubId && f.stageKind === 'league')?.bridge;
  const manager = createPersonaManager(config, options.seed, {
    buildFirstFree,
    nextMatch: (s, homeOnly) => homeOnly ? nextHome(s) : nextSeasonFixture(s),
    weeklyNet(s) {
      const view = leagueSeasonView(s);
      const fixture = nextHome(s);
      const gate = view && fixture ? homeGate(s, fixture).receipts * (view.regularRounds / 2) / view.calendar.slots.length : 0;
      return weeklyIncome(s) + gate - weeklyWages(s) - weeklyUpkeep(s) - weeklyOverhead(s);
    },
  });
  const cardPolicy = result.cardWeek ? createCardPolicy(config, options.seed) : null;
  function sample(state: GameState, status: LeaguePersonaSeason['status']): LeaguePersonaSeason {
    const view = leagueSeasonView(state);
    if (!view) throw new Error('no real League is available to read');
    const history = state.history.find(h => h.season === state.season);
    const fixtures = view.fixtures.filter(f => f.status === 'completed' && f.fixture.result
      && [f.fixture.homeId,f.fixture.awayId].includes(state.clubId)).map(row => {
      const observation = kickoffs.get(row.fixture.id);
      const score = row.fixture.result!;
      if (row.decider === 'forfeit' && observation) throw new Error(`forfeit had a kick-off: ${row.fixture.id}`);
      if (row.decider !== 'forfeit' && (!observation?.score || observation.score.homeScore !== score.homeScore
        || observation.score.awayScore !== score.awayScore)) throw new Error(`cannot match real kick-off/full time: ${row.fixture.id}`);
      if (row.slot === null) throw new Error(`completed fixture has no slot: ${row.fixture.id}`);
      return {
        ...(observation ?? { starters: [], injuries: [] }),
        score: { homeScore: score.homeScore, awayScore: score.awayScore },
        fixtureId: row.fixture.id, kind: kindOf(view, row), season: state.season,
        week: row.slot, round: row.fixture.round, winnerId: row.winnerId ?? null, decider: row.decider,
      };
    });
    const matched = new Set(fixtures.map(f => f.fixtureId));
    if ([...kickoffs.keys()].some(id => !matched.has(id))) throw new Error('a kick-off did not resolve in the saved fixture list');
    const regular = fixtures.filter(f => f.kind === 'regular');
    const wins = regular.filter(f => f.winnerId === state.clubId).length;
    const draws = regular.filter(f => !f.winnerId).length;
    const losses = regular.length - wins - draws;
    if (history && (history.wins !== wins || history.losses !== losses || history.draws !== draws)) {
      throw new Error('structural League record does not reconcile to saved season history');
    }
    const club = view.ladder.findIndex(row => row.clubId === state.clubId);
    const starters = fixtures.filter(f => f.kind === 'regular' || f.kind === 'final').flatMap(f => f.starters);
    return {
      ...(cardPolicy?.snapshot() ?? emptyCardPolicyStats()), season: state.season, status, leagueId: view.division.id,
      cash: state.money, cashRound7, wins, draws, losses, ladderPosition: club === -1 ? null : club + 1,
      premiership: history?.premiership ?? false, strikes: state.cardWeek?.strikes.season === state.season ? state.cardWeek.strikes.count : 0,
      patience: state.boardPatience, injuries: fixtures.reduce((sum,f) => sum + f.injuries.length,0), injuryWeeksLost,
      bonusEventsEntered: Number(currentSkillsCamp(state)?.status === 'completed') + fixtures.filter(f => f.kind === 'cup' && f.decider !== 'forfeit').length,
      startersAtKickoff: starters.length, startersAbove60: starters.filter(p => p.fatigue > injuryLine).length, fixtures,
    };
  }
  try {
    const started = await startLeagueCareer({clubName: `Soak ${options.seed}`, seed: options.seed, home: homes[result.pack],
      difficulty: result.difficulty, cardWeek: result.cardWeek}, {slot: 1, expectedOriginal: null});
    if (!started.ok) throw new Error(started.message);
    registerAllSystems();
    if (options.liveRivals) setState({settings:{...getState().settings,liveRivals:true}});
    setSpendMode('manual');
    roundTrip('initial-choice');
    const startingDivision = getState().competitions!.world!.profile.startingDivisionId;
    chooseLeague(startingDivision);
    roundTrip('season-1-entry');
    registerTickHook('persona-injury-observer', TICK_ORDER.injuries + 1, () => {
      injuryWeeksLost += getState().squad.filter(p => p.injuredWeeks > 0).length;
    }, {trials:true});
    // Observe the exact production kick-off, after weekly recovery has run.
    bus.on('match:started', ({fixture, home, away}) => {
      const s = getState();
      const own = home.clubId === s.clubId ? home : away;
      if (own.clubId !== s.clubId) return;
      if (!fixture.id || kickoffs.has(fixture.id)) throw new Error('missing or repeated structural kick-off id');
      const starters = (own.roster ?? []).map(p => {
        if (!p.id) throw new Error('kick-off starter without squad identity');
        return { id: p.id, fatigue: weeklyFatigueOf(s, p.id) };
      });
      if (new Set(starters.map(p => p.id)).size !== starters.length) throw new Error('kick-off starter repeated');
      kickoffs.set(fixture.id, { starters, injuries: [], score: null });
    });
    bus.on('match:finished', ({fixture, result: score}) => {
      if (!fixture.id) throw new Error('full time missing structural fixture id');
      const kickoff = kickoffs.get(fixture.id);
      if (!kickoff || kickoff.score) throw new Error('unpaired or repeated structural full time');
      const club = getState().clubId;
      kickoff.score = {homeScore: score.homeScore, awayScore: score.awayScore};
      kickoff.injuries = score.injuries.filter(i => i.teamId === club).map(i => ({playerId:i.playerId ?? null,weeks:i.weeks}));
    });
    for (let season = 1; season <= options.seasons; season++) {
      injuryWeeksLost = 0;
      cashRound7 = null;
      kickoffs.clear();
      cardPolicy?.newSeason();
      while (!getState().sacked && getState().competitions!.leagueCareer!.phase === 'active'
        && (options.weeks === undefined || result.intervals < options.weeks)) {
        const before = getState();
        stage = `season ${season}, week ${before.week}`;
        cardPolicy?.settleOffers();
        manager.weekly();
        const next = leagueSeasonView(getState())?.next;
        if (next?.slot === before.week) manager.prepareMatch();
        if (next?.slot === before.week) cardPolicy?.rest();
        bookCamp(restAbove(config)); // Off arm fatigue is always zero.
        advanceWeekAsTapped({playerAiCoach: next?.slot === before.week && manager.wantsLiveCalls()});
        check('after advancing');
        const after = getState();
        if (after.competitions!.calendar!.elapsedIntervals !== before.competitions!.calendar!.elapsedIntervals + 1) {
          throw new Error('calendar interval did not advance exactly once');
        }
        manager.spendPoints();
        result.intervals++;
        if (next?.slot === before.week && next.stageKind === 'league' && next.fixture.round === 7) cashRound7 = getState().money;
      }
      const state = getState();
      const status = state.sacked ? 'sacked' : state.competitions!.leagueCareer!.phase === 'next-season-choice' ? 'complete' : 'partial';
      result.seasons.push(sample(state, status));
      roundTrip(`season-${season}-${status}`);
      if (status !== 'complete' || season === options.seasons || (options.weeks !== undefined && result.intervals >= options.weeks)) break;
      chooseLeague(startingDivision);
      roundTrip(`season-${season + 1}-entry`);
    }
  } catch (error) { result.problems.push(`${stage}: ${error instanceof Error ? error.message : String(error)}`); }
  finally {
    setSpendMode(priorSpendMode);
    flushSaveMeta(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear();
    __setStorage(null); __unlockSaves(); setCareerNamespace(priorNamespace); setActiveSlot(priorSlot);
    if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    selectPack(priorPack);
  }
  return result;
}

export function leaguePersonaMarkdown(results: readonly LeaguePersonaResult[]): string {
  const header = 'Pack | Persona | Difficulty | Seed | Card Week | Season | Endpoint | League W-D-L | Ladder | Strikes | Patience | Injuries | Hurt player-weeks | Tired starters/total | Bonus entries | Kept by kind | Played by kind | Recoveries | New level III | Rd 7 cash | Close cash';
  const lines = ['# League persona soak', 'Normal-slot League starts. Classic persona baselines do not apply to this calendar.', '',
    `| ${header} |`, `| ${header.split('|').map(() => '---').join(' | ')} |`];
  const kinds = (counts: Record<string, number>) => Object.entries(counts).sort(([a],[b]) => a.localeCompare(b)).map(([kind,n]) => `${kind}: ${n}`).join(', ') || '0';
  for (const result of results) for (const s of result.seasons) {
    lines.push(`| ${[result.pack, result.persona, result.difficulty, result.seed, result.cardWeek ? 'on' : 'off', s.season, s.status,
      `${s.wins}-${s.draws}-${s.losses}`, s.ladderPosition ?? 'n/a', s.strikes, s.patience, s.injuries, s.injuryWeeksLost,
      `${s.startersAbove60}/${s.startersAtKickoff}`, s.bonusEventsEntered, kinds(s.cardsKept), kinds(s.cardsPlayed),
      s.recoveriesPlayed, s.reachedLevelIII, s.cashRound7 ?? 'n/a', s.cash].join(' | ')} |`);
  }
  const problems = results.flatMap(r => r.problems.map(p => `- ${r.pack}/${r.persona}/${r.difficulty}/${r.seed}: ${p}`));
  return [...lines, '', '## Problems', ...(problems.length ? problems : ['None.']), ''].join('\n');
}
