// Production command and club-match QA. Call sequentially: the game store and
// week hooks are process singletons, and each case installs its own memory slot.
import { PROGRESSION, type Difficulty } from '../config';
import { preparePack } from '../content';
import { advanceUntil } from '../core/advance';
import { bus, type Events } from '../core/events';
import { __setStorage, __unlockSaves, exportSave, flushSaveMeta, getActiveSlot, importSave,
  installImportedSave, loadSlot, saveIfChanged, setActiveSlot } from '../core/save';
import { emptyFinance, FINANCE_LINES, getState, loadState, setState, type GameState, type Player } from '../core/state';
import { careerNamespace, setCareerNamespace } from '../core/storage/local';
import { slotKey } from '../core/storageKeys';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld } from '../core/time';
import { CHALLENGE_EDITIONS, REGULAR_CHALLENGE_CLASHES, type ChallengeEditionId } from '../data/individualChallengeRules';
import type { ChallengeContest, IndividualChallengeRecord } from '../data/individualChallenges';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { shownStats } from '../data/player';
import { captureChallengeAction, confirmChallengeAction } from '../systems/individualChallengeCommit';
import { challengeCover, challengeEntryPreview, challengeHonours, challengeQualified,
  currentIndividualChallenge, type ChallengeAction } from '../systems/individualChallenges';
import { createChallengePolicy } from '../systems/individualChallengePolicy';
import { leagueCareerStateProblem } from '../systems/leagueEntryValidation';
import { isFieldable } from '../systems/lineup';
import { reconcileMatchIncome } from '../systems/matchIncome';
import { captureCampAction, confirmCampAction } from '../systems/playerAssignmentCommit';
import { currentSkillsCamp } from '../systems/playerAssignments';
import { awayPlayerIds, clubReservations } from '../systems/playerAvailability';
import { foldEvents, playerOfTheMatch } from '../systems/stats';
import { ageMod, facilityXpMultiplier, injuryMult, levelPointSpendMode, setSpendMode,
  setSpendPointsMyself, spendPointBlock, spendSquadPoint, trainPlayer, traitMult } from '../systems/training';
import type { AssignmentQARole } from './playerAssignments';
import { advanceWeekAsTapped, checkState, emptyTally, measuredMatch, registerAllSystems, tallyNet } from './soak';

export interface ChallengeCareerQACase {
  pack: 'au' | 'uk';
  edition: ChallengeEditionId;
  difficulty: Difficulty;
  role: AssignmentQARole;
  mode: 'auto' | 'manual';
  coaching: 'manual' | 'auto' | 'finish';
  camp?: boolean;
}

export const CHALLENGE_CAREER_QA_CASES: readonly ChallengeCareerQACase[] = [
  { pack: 'au', edition: 'showground', difficulty: 'normal', role: 'starter', mode: 'auto', coaching: 'manual', camp: true },
  { pack: 'au', edition: 'showground', difficulty: 'easy', role: 'bench', mode: 'auto', coaching: 'finish' },
  { pack: 'uk', edition: 'showground', difficulty: 'hard', role: 'reserve', mode: 'manual', coaching: 'finish' },
  { pack: 'uk', edition: 'invitational', difficulty: 'easy', role: 'starter', mode: 'auto', coaching: 'auto' },
  { pack: 'au', edition: 'invitational', difficulty: 'hard', role: 'bench', mode: 'manual', coaching: 'finish' },
  { pack: 'uk', edition: 'invitational', difficulty: 'normal', role: 'reserve', mode: 'manual', coaching: 'manual' },
];

export interface ChallengeCareerQASource {
  text: string;
  filename: string;
  sha256: string;
  commit: string;
  version: number;
  week: number;
  careerSeed: number;
  rngSeed: number;
}

interface WeekRun {
  start: GameState;
  end: GameState;
  kickoff: { event: Events['match:started']; state: GameState } | undefined;
  finished: Events['match:finished'] | undefined;
}

interface ChallengeCareerQAReport extends Omit<ChallengeCareerQACase, 'camp'> {
  evidence: 'actual-paired-challenge-careers';
  source: Omit<ChallengeCareerQASource, 'text'>;
  matchSettings: ReturnType<typeof measuredMatch>;
  player: Pick<Player, 'id' | 'name' | 'position' | 'age' | 'traits'> | null;
  cover: { id: string; name: string } | null;
  qualification: { playerId: string; result: 'won'; cash: number; returnWeek: number; contest: ChallengeContest } | null;
  camp: (ReturnType<typeof matchReport> & { playerId: string; xp: number }) | null;
  contest: ChallengeContest | null;
  award: IndividualChallengeRecord['award'];
  stay: ReturnType<typeof branchReport> | null;
  event: ReturnType<typeof branchReport> | null;
  effectiveXpDifference: number | null;
  cashDifference: number | null;
  roundTrips: number;
  problems: string[];
  ms: number;
}

const SLOT = 1;
const same = (a: unknown, b: unknown): boolean => canonicalLeagueJson(a) === canonicalLeagueJson(b);
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-8;

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function owned(state: GameState, id: string): Player {
  const player = state.squad.find(p => p.id === id);
  requireThat(player, `${id} left the owned squad`);
  return player;
}

function current(edition: ChallengeEditionId): IndividualChallengeRecord {
  const record = currentIndividualChallenge(getState(), edition);
  requireThat(record, `the ${edition} entry is missing`);
  return record;
}

function withoutEntry(state: GameState, edition: ChallengeEditionId): GameState {
  const { individualChallenges = [], ...competition } = state.competitions!;
  const others = individualChallenges.filter(r => r.season !== state.season || r.editionId !== edition || r.clubId !== state.clubId);
  return { ...state, competitions: others.length ? { ...competition, individualChallenges: others } : competition };
}

function checkBoundary(state: GameState): void {
  const issues = checkState(state);
  const league = leagueCareerStateProblem(state);
  if (league) issues.push(league.message);
  requireThat(!issues.length, issues.join(' | '));
  const interval = failedIntervalProblem();
  requireThat(!interval && !weekHeld(), interval ?? 'the club interval remained held');
}

function playWeek(): WeekRun {
  const start = getState();
  const kickoffs: NonNullable<WeekRun['kickoff']>[] = [];
  const finished: Events['match:finished'][] = [];
  const weeks: number[] = [];
  const offKickoff = bus.on('match:started', event => kickoffs.push({ event, state: getState() }));
  const offFinish = bus.on('match:finished', event => finished.push(event));
  const offWeek = bus.on('week:advanced', event => weeks.push(event.week));
  try { advanceWeekAsTapped(); }
  finally { offKickoff(); offFinish(); offWeek(); }
  const end = getState();
  checkBoundary(end);
  requireThat(end.season === start.season && end.week === start.week + 1
    && end.competitions!.calendar!.elapsedIntervals === start.competitions!.calendar!.elapsedIntervals + 1
    && same(weeks, [end.week]), `Week ${start.week} did not advance exactly one interval`);
  requireThat(kickoffs.length <= 1 && finished.length === kickoffs.length,
    `Week ${start.week} emitted an unexpected number of club matches`);
  return { start, end, kickoff: kickoffs[0], finished: finished[0] };
}

function playThrough(boundaryWeek: number): WeekRun[] {
  const weeks: WeekRun[] = [];
  while (getState().week < boundaryWeek) weeks.push(playWeek());
  requireThat(getState().week === boundaryWeek, `did not reach Week ${boundaryWeek}`);
  return weeks;
}

function matchReport(run: WeekRun, playerId: string) {
  const { kickoff, finished } = run;
  requireThat(kickoff && finished && kickoff.event.fixture === finished.fixture, 'no single real club match was played');
  const { state, event } = kickoff;
  const own = event.home.clubId === state.clubId ? event.home : event.away;
  const starters = (own.roster ?? []).flatMap(p => p.id ? [p.id] : []);
  const bench = (own.bench ?? []).flatMap(p => p.id ? [p.id] : []);
  const fielded = [...starters, ...bench];
  const away = awayPlayerIds(state);
  requireThat(starters.length === 9 && bench.length === 4 && new Set(fielded).size === 13
    && fielded.every(id => isFieldable(owned(state, id)) && !away.has(id)), 'kickoff did not field nine legal starters and four legal reserves');
  requireThat(!away.has(playerId) || (!fielded.includes(playerId) && own.captain !== playerId && own.kicker !== playerId),
    'an away player appeared in a club role');
  const role: AssignmentQARole | 'away' = away.has(playerId) ? 'away'
    : starters.includes(playerId) ? 'starter' : bench.includes(playerId) ? 'bench' : 'reserve';
  const fixture = run.end.competitions!.instances.find(i => i.id === finished.fixture.competitionId)
    ?.fixtures.find(f => f.id === finished.fixture.id);
  const { homeScore, awayScore, events, injuries } = finished.result;
  requireThat(fixture?.status === 'completed' && fixture.result?.homeScore === homeScore
    && fixture.result.awayScore === awayScore, 'played score did not settle to the real club fixture');
  return { fixtureId: fixture.id, competitionId: fixture.competitionId, week: state.week, round: fixture.round,
    seed: event.live.seed, homeScore, awayScore, events: events.length, injuries: injuries.length,
    role, starters, bench, captain: own.captain ?? null, kicker: own.kicker ?? null };
}

const xp = (p: Player): number => p.xp ?? 0;
const level = (p: Player): number => p.level ?? 1;
const banked = (p: Player): number => p.unspentPoints ?? 0;
const xpChange = (before: Player, after: Player): number =>
  (level(after) - level(before)) * PROGRESSION.XP_PER_LEVEL + xp(after) - xp(before);

function developmentReport(before: Player, kickoff: Player, after: Player, awardXp: number) {
  const declined = trainPlayer(before);
  const statGains = Object.fromEntries(shownStats(after.position).flatMap(stat => {
    requireThat(after.stats[stat] <= after.ceilings[stat]!, `${stat} exceeded its ceiling`);
    return after.stats[stat] > declined[stat] ? [[stat, after.stats[stat] - declined[stat]]] : [];
  }));
  const levelsGained = level(after) - level(before);
  const newPoints = levelsGained * PROGRESSION.POINTS_PER_LEVEL;
  return { effectiveXp: xpChange(before, after), weeklyXp: xpChange(before, kickoff),
    matchXp: xpChange(kickoff, after) - awardXp, awardXp, xpBefore: xp(before), xpAfter: xp(after),
    levelsGained, newPoints, bankedBefore: banked(before), bankedAfter: banked(after),
    pointsSpent: banked(before) + newPoints - banked(after), statGains };
}

function financeReport(start: GameState, end: GameState, fixtureId: string) {
  const before = start.finance.find(f => f.season === start.season) ?? emptyFinance(start.season);
  const after = end.finance.find(f => f.season === start.season) ?? emptyFinance(start.season);
  const books = emptyTally();
  for (const line of FINANCE_LINES) books[line] = after[line] - before[line];
  const moneyChange = end.money - start.money;
  requireThat(tallyNet(books) === moneyChange, 'wallet movement differs from the season books');
  const existing = new Set(start.matchIncome.map(r => r.id));
  const incoming = end.matchIncome.filter(r => !existing.has(r.id));
  const clubIncome = incoming.filter(r => r.fixture.homeId === start.clubId || r.fixture.awayId === start.clubId);
  const income = clubIncome[0];
  requireThat(new Set(end.matchIncome.map(r => r.id)).size === end.matchIncome.length
    && clubIncome.length === 1 && income?.fixture.id === fixtureId && income.receipt, 'club income was not settled once against its played fixture');
  requireThat(same(reconcileMatchIncome(end), end), 'reconciling the match ledger would pay cash twice');
  return { openingMoney: start.money, closingMoney: end.money, moneyChange, books,
    matchIncome: income.receipt[income.fixture.homeId === start.clubId ? 'home' : 'away'], matchIncomeId: income.id };
}

function ownership(state: GameState) {
  const person = (p: Player, owner: string) => ({ id: p.id, age: p.age, owner, deal: p.deal, history: p.clubHistory });
  return {
    players: [
      ...state.squad.map(p => person(p, state.clubId)),
      ...state.freeAgents.map(p => person(p, 'unsigned')),
      ...state.league.clubs.flatMap(club => (club.squad ?? []).map(p => person(p, club.id))),
    ].sort((a, b) => a.id.localeCompare(b.id)),
    retired: state.playerPopulation.retired,
  };
}

function branchReport(run: WeekRun, playerId: string, awardXp: number) {
  const { start, end } = run;
  const match = matchReport(run, playerId);
  requireThat(same(ownership(start), ownership(end)) && same(start.capAccount, end.capAccount), 'the venue changed player ownership or squad cap');
  requireThat(same(start.lineup, end.lineup), 'temporary cover changed the saved lineup');
  return { match, endWeek: end.week, intervals: end.competitions!.calendar!.elapsedIntervals - start.competitions!.calendar!.elapsedIntervals,
    development: developmentReport(owned(start, playerId), owned(run.kickoff!.state, playerId), owned(end, playerId), awardXp),
    finance: financeReport(start, end, match.fixtureId) };
}

function checkStayXp(run: WeekRun, stay: ReturnType<typeof branchReport>, player: Player) {
  const { role } = stay.match;
  const { result, fixture } = run.finished!;
  const tally = foldEvents(result.events, run.start.clubId).get(player.name);
  const potm = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
  const baseMatchXp = role === 'reserve' ? 0 : (role === 'starter' ? PROGRESSION.STARTER_XP : PROGRESSION.BENCH_XP)
    + (tally?.tries ?? 0) * PROGRESSION.TRY_XP + (tally?.lineBreaks ?? 0) * PROGRESSION.LINE_BREAK_XP
    + (potm?.teamId === run.start.clubId && potm.name === player.name ? PROGRESSION.POTM_XP : 0);
  const multiplier = ageMod(player.age) * traitMult(player) * facilityXpMultiplier(run.start.facilities);
  requireThat(close(stay.development.weeklyXp, PROGRESSION.WEEKLY_XP * injuryMult(player) * multiplier)
    && close(stay.development.matchXp, baseMatchXp * multiplier), 'stay XP did not match weekly training and actual participation');
}

function checkAward(run: WeekRun, event: ReturnType<typeof branchReport>, record: IndividualChallengeRecord, mode: ChallengeCareerQACase['mode']) {
  const { contest, award, participantId } = record;
  requireThat(record.status === 'completed' && contest?.progress.result && award && !awayPlayerIds(run.end).has(participantId),
    'the player did not return with a completed award receipt');
  const before = owned(run.start, participantId);
  const after = owned(run.end, participantId);
  const kickoff = owned(run.kickoff!.state, participantId);
  const won = contest.progress.result === 'won';
  const base = contest.edition.completionXp + (won ? contest.edition.winnerXp : 0);
  const { development } = event;
  requireThat(event.match.role === 'away' && development.weeklyXp === 0 && close(development.matchXp, 0)
    && same(kickoff.stats, trainPlayer(before)) && banked(kickoff) === banked(before)
    && same([before.career, before.seasonStats, before.injuredWeeks, before.suspendedWeeks],
      [after.career, after.seasonStats, after.injuredWeeks, after.suspendedWeeks]),
    'the absent player received club XP, stats, an injury or discipline, or missed ordinary decline');
  const { effectiveXp, xpBefore, xpAfter, levelsGained, newPoints, bankedBefore, bankedAfter, pointsSpent, statGains } = development;
  requireThat(close(effectiveXp, base * ageMod(before.age) * traitMult(before)) && close(effectiveXp, award.xp.effectiveXp)
    && close(xpBefore, award.xp.xpBefore) && close(xpAfter, award.xp.xpAfter)
    && same({ levelsGained, newPoints, bankedBefore, bankedAfter, pointsSpent, statGains },
      { levelsGained: award.xp.levelsGained, newPoints: award.xp.newPoints, bankedBefore: award.xp.bankedBefore,
        bankedAfter: award.xp.bankedAfter, pointsSpent: award.xp.pointsSpent, statGains: award.xp.statGains })
    && award.xp.mode === mode && award.xp.focus === (mode === 'manual' ? null : run.start.training.focus)
    && (mode !== 'manual' || pointsSpent === 0), 'challenge XP or spending disagrees with the actual progression');
  requireThat(award.cash === (won ? contest.edition.winnerCash : 0) && event.finance.books.prize === award.cash
    && award.honour === (won ? contest.edition.honour : null)
    && challengeHonours(run.end, participantId).some(r => r.id === record.id) === won
    && same(run.start.competitionRewards, run.end.competitionRewards),
    'cash or personal honour did not match the actual result, or a competition prize record was fabricated');
}

async function challengeCommand(edition: ChallengeEditionId, action: ChallengeAction): Promise<void> {
  const before = getState();
  const review = captureChallengeAction(edition, action);
  requireThat(review.ok, !review.ok ? review.message : 'command could not be captured');
  const committed = await confirmChallengeAction(review.selection);
  requireThat(committed.ok, !committed.ok ? committed.message : 'command could not be saved');
  requireThat(same(withoutEntry(before, edition), withoutEntry(getState(), edition)),
    `${action.kind} changed club state before settlement`);
}

function selectEntrant(edition: ChallengeEditionId, role?: AssignmentQARole): Player {
  const state = getState();
  const ranked = state.squad.flatMap(player => {
    const projected = challengeCover(state, edition, player.id);
    if (projected.reason || (role && projected.role !== role)) return [];
    const preview = challengeEntryPreview(state, edition, player.id);
    return preview.ok ? [{ player, chance: preview.titleProbability }] : [];
  }).sort((a, b) => b.chance - a.chance || a.player.age - b.player.age || a.player.id.localeCompare(b.player.id));
  requireThat(ranked[0], `no legal ${role ?? 'qualification'} entrant for ${edition}`);
  return ranked[0].player;
}

async function playContest(edition: ChallengeEditionId, coaching: ChallengeCareerQACase['coaching'],
  onFirstClash?: () => void): Promise<ChallengeContest> {
  const record = current(edition);
  requireThat(record.status === 'coaching' && record.contest, 'departure did not start coaching');
  const policy = createChallengePolicy(record.contest.edition, record.contest.actor);
  if (coaching === 'auto') await challengeCommand(edition, { kind: 'set-auto', enabled: true });
  if (coaching === 'finish') {
    await challengeCommand(edition, { kind: 'finish' });
  } else {
    while (current(edition).status === 'coaching') {
      const { progress } = current(edition).contest!;
      const decision = policy.choose(progress);
      requireThat(progress.clashIndex <= REGULAR_CHALLENGE_CLASHES && decision, 'the contest did not stop at its finite result');
      await challengeCommand(edition, coaching === 'auto' ? { kind: 'auto-clash' } : { kind: 'call', call: decision.call });
      if (progress.clashIndex === 0) onFirstClash?.();
    }
  }
  const ready = current(edition);
  requireThat(ready.status === 'ready-for-interval' && ready.contest?.progress.result && ready.award === null
    && (ready.contest.clashes.length === REGULAR_CHALLENGE_CLASHES || ready.contest.clashes.length === REGULAR_CHALLENGE_CLASHES + 1),
    'the contest did not finish with six clashes, an optional bonus and a pending award');
  return ready.contest;
}

async function assertDecisionGate(saved: () => string) {
  const before = getState();
  const bytes = saved();
  const events: string[] = [];
  const offKickoff = bus.on('match:started', () => events.push('kickoff'));
  const offWeek = bus.on('week:advanced', () => events.push('week'));
  try {
    advanceWeek();
    advanceWeeks(1);
    const result = await advanceUntil({ kind: 'weeks', weeks: 1 });
    requireThat(result.weeksPlayed === 0 && result.stop.kind === 'challenge-decision',
      `fast-forward returned ${result.stop.kind} with ${result.weeksPlayed} elapsed weeks`);
  } finally { offKickoff(); offWeek(); }
  requireThat(!events.length && getState() === before && saved() === bytes && !weekHeld(),
    'a required contest decision ticked the club clock or changed its saved checkpoint');
}

export async function runIndividualChallengeCareerQA(options: ChallengeCareerQACase & { source: ChallengeCareerQASource }):
  Promise<ChallengeCareerQAReport> {
  const started = performance.now();
  const { source: { text, ...source }, ...scenario } = options;
  const { pack, edition, difficulty, role, mode, coaching, camp } = scenario;
  const rules = CHALLENGE_EDITIONS[edition];
  const report: ChallengeCareerQAReport = { ...scenario, evidence: 'actual-paired-challenge-careers', source,
    matchSettings: measuredMatch(), player: null, cover: null, qualification: null, camp: null, contest: null, award: null,
    stay: null, event: null, effectiveXpDifference: null, cashDifference: null, roundTrips: 0, problems: [], ms: 0 };
  let stage = 'source setup';
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); },
    removeItem: (key: string) => { bytes.delete(key); },
  };
  const saved = () => {
    const raw = bytes.get(slotKey(SLOT));
    requireThat(raw, 'normal slot has no saved bytes');
    return raw;
  };
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousNamespace = careerNamespace();
  const previousSlot = getActiveSlot();
  const previousSpendMode = levelPointSpendMode();
  const install = (raw: string) => {
    const imported = installImportedSave(raw, SLOT);
    requireThat(imported.ok, !imported.ok ? imported.message : 'could not install source');
    requireThat(!imported.repairs.length, 'fixture or fork required save repairs');
    loadState(imported.state);
    checkBoundary(imported.state);
    return imported.state;
  };
  const roundTrip = () => {
    const before = getState();
    const raw = saved();
    const loaded = loadSlot(SLOT);
    const exported = importSave(exportSave(before));
    requireThat(loaded.status === 'ok', loaded.status === 'ok' ? '' : `could not reload ${loaded.status} checkpoint`);
    requireThat(exported.ok, !exported.ok ? exported.message : 'could not reopen checkpoint export');
    requireThat(!loaded.repairs.length && !exported.repairs.length && same(loaded.state, before)
      && same(exported.state, before) && saved() === raw, 'reload or export changed the checkpoint');
    loadState(loaded.state);
    report.roundTrips++;
  };

  bus.clear();
  clearHeldWeek();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  setCareerNamespace(null);
  __setStorage(storage);
  __unlockSaves();
  setActiveSlot(SLOT);
  setSpendMode('auto');
  try {
    await preparePack(pack);
    const original = JSON.parse(text) as { version: number; settings: GameState['settings'] };
    requireThat(original.version === source.version && source.version === (camp ? 33 : 34)
      && original.settings.difficulty === 'normal', 'source is not its recorded historical Normal save');
    const incoming = install(text);
    requireThat(incoming.pack === pack && incoming.season === 1 && incoming.week === source.week
      && incoming.week === (camp ? 4 : 5) && incoming.rngSeed === source.rngSeed
      && incoming.competitions?.calendar?.elapsedIntervals === source.week - 1
      && incoming.competitions.leagueCareer?.phase === 'active'
      && incoming.competitions.leagueCareer.scheduleSeed === source.careerSeed
      && !incoming.competitions.individualChallenges?.length && !incoming.competitions.assignments?.length,
    'source does not match its recorded pre-entry career');
    setState({ settings: { ...incoming.settings, difficulty } });
    setSpendPointsMyself(mode === 'manual');
    requireThat(saveIfChanged(getState(), true), 'could not save the paired settings');
    registerAllSystems();
    report.matchSettings = measuredMatch();

    if (edition === 'invitational') {
      stage = 'earning the Invitational invitation through the Showground';
      const candidate = selectEntrant('showground');
      requireThat(!challengeQualified(getState()), 'the historical source already has an invitation');
      await challengeCommand('showground', { kind: 'book', participantId: candidate.id });
      playThrough(CHALLENGE_EDITIONS.showground.eventWeek);
      await challengeCommand('showground', { kind: 'start' });
      const contest = await playContest('showground', 'finish');
      const returnRun = playWeek();
      const won = current('showground');
      const qualifier = branchReport(returnRun, candidate.id, won.award?.xp.effectiveXp ?? 0);
      checkAward(returnRun, qualifier, won, mode);
      requireThat(contest.progress.result === 'won' && challengeQualified(returnRun.end) && won.award,
        'the real Showground contest did not earn a club invitation');
      report.qualification = { playerId: candidate.id, cash: won.award.cash, returnWeek: returnRun.end.week, result: 'won', contest };
      playThrough(rules.bookingEndWeek);
      requireThat(challengeQualified(getState()) && challengeHonours(getState(), candidate.id).some(r => r.id === won.id),
        'the invitation or original winner honour was lost before the Invitational');
    }

    stage = 'candidate selection and shared fork';
    const candidate = selectEntrant(edition, role);
    const { id, name, age, position, traits } = candidate;
    report.player = { id, name, age, position, traits };
    if (camp) {
      const review = captureCampAction({ kind: 'book', participantId: id, focus: mode === 'manual' ? null : 'balanced' });
      requireThat(review.ok, !review.ok ? review.message : 'could not preview Skills Camp');
      const booked = confirmCampAction(review.selection);
      requireThat(booked.ok, !booked.ok ? booked.message : 'could not book Skills Camp');
    }
    const fork = { state: getState(), bytes: saved() };

    stage = 'stay branch and matching club fixture';
    const stayLead = playThrough(rules.eventWeek);
    const stayRun = playWeek();
    report.stay = branchReport(stayRun, id, 0);
    requireThat(report.stay.match.role === role && !currentIndividualChallenge(stayRun.end, edition),
      'stay did not field the selected role or received a contest record');
    checkStayXp(stayRun, report.stay, owned(stayRun.start, id));

    stage = 'event entry and club lead-in';
    requireThat(same(install(fork.bytes), fork.state) && saved() === fork.bytes, 'paired careers did not start from identical saved bytes');
    await challengeCommand(edition, { kind: 'book', participantId: id });
    if (camp) {
      const reservations = clubReservations(getState()).filter(r => r.playerId === id);
      requireThat(same(reservations.map(r => [r.week, r.away]), [[5, false], [6, false]]),
        'the same player did not hold both legal reservations');
    }
    const eventLead = playThrough(rules.eventWeek);
    requireThat(eventLead.length === stayLead.length
      && eventLead.every((run, i) => same(withoutEntry(run.end, edition), stayLead[i]!.end)),
    'booking changed the club clock or results before contest departure');
    if (camp) {
      const campWeek = eventLead.find(run => run.start.week === 5);
      const completed = currentSkillsCamp(getState());
      requireThat(campWeek && completed?.status === 'completed' && completed.booking?.participantId === id
        && completed.award && !awayPlayerIds(getState()).has(id), 'camp did not return the same player before the contest');
      const match = matchReport(campWeek, id);
      requireThat(match.role === 'away', 'the shared entrant played while away at camp');
      report.camp = { ...match, playerId: id, xp: completed.award.effectiveXp };
    }

    stage = 'due decision and saved departure';
    await assertDecisionGate(saved);
    const cover = challengeCover(getState(), edition, id);
    requireThat(!cover.reason && cover.role === role, cover.reason ?? 'the due-week role changed before departure');
    report.cover = cover.cover ? { id: cover.cover.id, name: cover.cover.name } : null;
    roundTrip();
    await challengeCommand(edition, { kind: 'start' });
    requireThat(awayPlayerIds(getState()).has(id) && !current(edition).award, 'departure did not reserve the player without paying an award');
    await assertDecisionGate(saved);
    const departed = owned(getState(), id);
    const spendable = shownStats(departed.position).find(stat => spendPointBlock(departed, stat) === null);
    if (spendable) {
      const atDeparture = getState();
      const raw = saved();
      requireThat(!spendSquadPoint(id, spendable) && getState() === atDeparture && saved() === raw,
        'the club could spend the departing player’s points during coaching');
    }

    stage = 'real contest, checkpoint reload and end-of-week settlement';
    report.contest = await playContest(edition, coaching, roundTrip);
    roundTrip();
    const eventRun = playWeek();
    const completed = current(edition);
    report.award = completed.award;
    report.event = branchReport(eventRun, id, completed.award?.xp.effectiveXp ?? 0);
    checkAward(eventRun, report.event, completed, mode);
    const { match } = report.event;
    requireThat(match.fixtureId === report.stay.match.fixtureId && match.competitionId === report.stay.match.competitionId
      && match.seed === report.stay.match.seed && eventRun.end.week === stayRun.end.week
      && eventRun.end.week === rules.returnWeek && match.fixtureId === completed.fixtureId
      && report.event.finance.matchIncomeId === report.stay.finance.matchIncomeId,
    'the event and stay branches did not settle the same fixture, club income identity and interval');
    requireThat(same(eventRun.end.competitions!.assignments, stayRun.end.competitions!.assignments),
      'the event changed the Skills Camp receipts');
    const win = report.contest.progress.result === 'won';
    requireThat(challengeQualified(eventRun.end) === (edition === 'invitational' || win),
      'the club qualification did not follow its real Showground title');
    requireThat(role === 'reserve' ? !report.cover : !!report.cover && [...match.starters, ...match.bench].includes(report.cover.id),
      'named cover did not match the legal kickoff sheet');
    report.effectiveXpDifference = report.event.development.effectiveXp - report.stay.development.effectiveXp;
    report.cashDifference = report.event.finance.moneyChange - report.stay.finance.moneyChange;

    stage = 'completed report and duplicate settlement';
    roundTrip();
    const reopened = getState();
    const settledBytes = saved();
    requireThat(same(completed, current(edition)) && challengeHonours(reopened, id).some(r => r.id === completed.id) === win,
      'the saved award or personal honour changed after reopening');
    requireThat(!captureChallengeAction(edition, { kind: 'start' }).ok, 'a completed entry could start again');
    bus.emit('match:finished', eventRun.finished!);
    requireThat(getState() === reopened && saved() === settledBytes, 'a duplicate full-time event repeated settlement');
  } catch (error) {
    report.problems.push(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSaveMeta();
    clearHeldWeek();
    clearTickHooks();
    clearSeasonHooks();
    bus.clear();
    setSpendMode(previousSpendMode);
    __setStorage(null);
    __unlockSaves();
    setCareerNamespace(previousNamespace);
    setActiveSlot(previousSlot);
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    report.ms = Math.round(performance.now() - started);
  }
  return report;
}
