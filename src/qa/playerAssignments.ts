// Production League opening matches, paired from the same migrated Week 4 save.
import { PROGRESSION, type Difficulty } from '../config';
import { preparePack } from '../content';
import { bus, type Events } from '../core/events';
import { __setStorage, __unlockSaves, exportSave, flushSaveMeta, getActiveSlot, importSave,
  installImportedSave, loadSlot, setActiveSlot, saveIfChanged } from '../core/save';
import { FINANCE_LINES, emptyFinance, getState, loadState, setState, type GameState, type Player, type PlayerStats } from '../core/state';
import { careerNamespace, setCareerNamespace } from '../core/storage/local';
import { slotKey } from '../core/storageKeys';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld } from '../core/time';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { shownStats } from '../data/player';
import type { CampAwardReceipt } from '../systems/assignmentTraining';
import { leagueCareerStateProblem } from '../systems/leagueEntryValidation';
import { isFieldable, resolveLineup } from '../systems/lineup';
import { reconcileMatchIncome } from '../systems/matchIncome';
import { captureCampAction, confirmCampAction } from '../systems/playerAssignmentCommit';
import { awayPlayerIds, currentSkillsCamp, projectCampDeparture } from '../systems/playerAssignments';
import { foldEvents, playerOfTheMatch } from '../systems/stats';
import { ageMod, facilityXpMultiplier, injuryMult, levelPointSpendMode, setSpendMode,
  setSpendPointsMyself, trainPlayer, traitMult } from '../systems/training';
import { advanceWeekAsTapped, checkState, emptyTally, registerAllSystems, tallyNet } from './soak';

export type AssignmentQARole = 'starter' | 'bench' | 'reserve';
export type AssignmentQAMode = 'auto' | 'saved-manual' | 'qa-manual';

interface AssignmentQASource {
  filename: string;
  sha256: string;
  commit: string;
  careerSeed: number;
  rngSeed: number;
}

export interface AssignmentQAOptions {
  pack: 'au' | 'uk';
  difficulty: Difficulty;
  role: AssignmentQARole;
  mode: AssignmentQAMode;
  source: AssignmentQASource & { text: string };
}

interface WeekRun {
  kickoff: Events['match:started'];
  kickoffState: GameState;
  finished: Events['match:finished'];
  after: GameState;
  intervals: number;
}

interface AssignmentQAResult extends Pick<AssignmentQAOptions, 'pack' | 'difficulty' | 'role' | 'mode'> {
  evidence: 'actual-paired-matches';
  source: AssignmentQASource & { version: number; originalDifficulty: Difficulty };
  difficultySelection: 'source-save' | 'setting-changed-before-pair';
  spending: { savedManual: boolean; globalManual: boolean };
  player: { id: string; name: string; age: number; position: Player['position']; traits: Player['traits'];
    ageMultiplier: number; traitMultiplier: number; ceilings: Player['ceilings'] } | null;
  facilities: GameState['facilities'];
  facilitiesXpMultiplier: number;
  camp: ReturnType<typeof branchReport> | null;
  decline: ReturnType<typeof branchReport> | null;
  receipt: CampAwardReceipt | null;
  campXpMinusDecline: number | null;
  problems: string[];
}

const same = (a: unknown, b: unknown): boolean => canonicalLeagueJson(a) === canonicalLeagueJson(b);
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-8;
function requireThat(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}

function findPlayer(state: GameState, id: string): Player {
  const player = state.squad.find(p => p.id === id);
  requireThat(player, `${id} is missing from the owned squad`);
  return player;
}

function checkBoundary(state: GameState): void {
  const problems = checkState(state);
  const strict = leagueCareerStateProblem(state);
  if (strict) problems.push(strict.message);
  requireThat(!problems.length, problems.join('; '));
  const failed = failedIntervalProblem();
  requireThat(!failed, failed ?? 'interval failed');
  requireThat(!weekHeld(), 'interval remained held after simulation');
  requireThat(careerNamespace() === null, 'career used a developer namespace');
}

function roundTrip(bytes: ReadonlyMap<string, string>): void {
  const before = getState();
  checkBoundary(before);
  const raw = bytes.get(slotKey(1));
  requireThat(raw, 'normal slot was not saved');
  const loaded = loadSlot(1);
  requireThat(loaded.status === 'ok', `normal load failed${'message' in loaded ? ` (${loaded.message})` : ''}`);
  const imported = importSave(exportSave(before));
  requireThat(imported.ok, !imported.ok ? imported.message : 'normal import failed');
  requireThat(!loaded.repairs.length && !imported.repairs.length && same(loaded.state, before) && same(imported.state, before),
    'normal load or exported import changed the settled career');
  requireThat(bytes.get(slotKey(1)) === raw, 'reading the save rewrote the slot');
  loadState(loaded.state);
}

function playWeek(): WeekRun {
  const before = getState();
  const kicks: { kickoff: Events['match:started']; kickoffState: GameState }[] = [];
  const finished: Events['match:finished'][] = [];
  const weeks: number[] = [];
  const offKickoff = bus.on('match:started', kickoff => {
    kicks.push({ kickoff, kickoffState: structuredClone(getState()) });
  });
  const offFinish = bus.on('match:finished', event => { finished.push(event); });
  const offWeek = bus.on('week:advanced', event => { weeks.push(event.week); });
  try { advanceWeekAsTapped(); }
  finally { offKickoff(); offFinish(); offWeek(); }
  const after = getState();
  checkBoundary(after);
  const intervals = after.competitions!.calendar!.elapsedIntervals - before.competitions!.calendar!.elapsedIntervals;
  requireThat(intervals === 1 && after.season === before.season && after.week === before.week + 1
    && same(weeks, [after.week]), 'calendar or week notification did not advance exactly once');
  const start = kicks[0], end = finished[0];
  requireThat(kicks.length === 1 && finished.length === 1 && start && end && start.kickoff.fixture === end.fixture,
    'did not play exactly one real club match');
  const fixture = after.competitions!.instances.find(i => i.id === end.fixture.competitionId)
    ?.fixtures.find(f => f.id === end.fixture.id);
  requireThat(fixture?.status === 'completed' && fixture.result?.homeScore === end.result.homeScore
    && fixture.result.awayScore === end.result.awayScore, 'simulated score did not settle to the played fixture');
  return { ...start, finished: end, after, intervals };
}

function matchReport(run: WeekRun, id: string) {
  const { kickoff, kickoffState, finished } = run;
  const own = kickoff.home.clubId === kickoffState.clubId ? kickoff.home : kickoff.away;
  const starters = (own.roster ?? []).flatMap(p => p.id ? [p.id] : []);
  const bench = (own.bench ?? []).flatMap(p => p.id ? [p.id] : []);
  const ids = [...starters, ...bench];
  requireThat(own.roster?.length === 9 && own.bench?.length === 4
    && starters.length === 9 && bench.length === 4 && new Set(ids).size === 13
    && ids.every(id => isFieldable(findPlayer(kickoffState, id)) && !awayPlayerIds(kickoffState).has(id)),
  'kickoff sheet does not contain nine legal starters and four legal bench players');
  const role: AssignmentQARole | 'away' = awayPlayerIds(kickoffState).has(id) ? 'away'
    : starters.includes(id) ? 'starter' : bench.includes(id) ? 'bench' : 'reserve';
  const { homeScore, awayScore, events, injuries } = finished.result;
  return { fixtureId: kickoff.fixture.id, competitionId: kickoff.fixture.competitionId, seed: kickoff.live.seed,
    week: kickoffState.week, home: kickoff.fixture.homeId, away: kickoff.fixture.awayId,
    homeScore, awayScore, events: events.length, injuries: injuries.length, starters, bench, role,
    captain: own.captain, kicker: own.kicker };
}

function ownedPeople(state: GameState) {
  const person = (player: Player, owner: string) => ({ id: player.id, owner,
    age: player.age, deal: player.deal, history: player.clubHistory });
  const live = [
    ...state.squad.map(p => person(p, state.clubId)),
    ...state.freeAgents.map(p => person(p, 'unsigned')),
    ...state.league.clubs.flatMap(c => (c.squad ?? []).map(p => person(p, c.id))),
  ].sort((a, b) => a.id.localeCompare(b.id));
  return { live, retired: state.playerPopulation.retired };
}

function financeReport(before: GameState, after: GameState) {
  const opening = before.finance.find(f => f.season === before.season) ?? emptyFinance(before.season);
  const closing = after.finance.find(f => f.season === after.season) ?? emptyFinance(after.season);
  const books = emptyTally();
  for (const line of FINANCE_LINES) books[line] = closing[line] - opening[line];
  requireThat(new Set(after.matchIncome.map(r => r.id)).size === after.matchIncome.length, 'duplicate match income identity');
  const initialIds = new Set(before.matchIncome.map(r => r.id));
  const newIncome = after.matchIncome.filter(r => !initialIds.has(r.id));
  const clubIncome = newIncome.filter(r => r.fixture.homeId === before.clubId || r.fixture.awayId === before.clubId);
  requireThat(clubIncome.length === 2 && newIncome.every(r => r.receipt), 'trial and opener lack two settled club income records');
  requireThat(same(reconcileMatchIncome(after), after), 'reconciling the ledger would pay cash twice');
  const receipts = clubIncome.map(r => ({ id: r.id, ...r.receipt![r.fixture.homeId === before.clubId ? 'home' : 'away'] }));
  const moneyChange = after.money - before.money;
  requireThat(tallyNet(books) === moneyChange && receipts.reduce((sum, r) => sum + r.total, 0) === moneyChange,
    'wallet movement differs from the season books or the two match income receipts');
  requireThat(books.wages === 0 && books.transfers === 0 && books.contracts === 0,
    'camp or ordinary play booked an unexpected wage, contract or roster transaction');
  return { openingMoney: before.money, closingMoney: after.money, moneyChange, books, receipts, worldIncomeRecords: newIncome.length };
}

const level = (p: Player): number => p.level ?? 1;
const xp = (p: Player): number => p.xp ?? 0;
const banked = (p: Player): number => p.unspentPoints ?? 0;
const xpChange = (before: Player, after: Player): number => (level(after) - level(before)) * PROGRESSION.XP_PER_LEVEL + xp(after) - xp(before);

function developmentReport(before: Player, atKickoff: Player, after: Player, campXp: number) {
  const declined = trainPlayer(before);
  const statGains: Partial<PlayerStats> = {};
  for (const stat of shownStats(after.position)) {
    requireThat(after.stats[stat] <= after.ceilings[stat]!, `${stat} exceeded its ceiling`);
    if (after.stats[stat] > declined[stat]) statGains[stat] = after.stats[stat] - declined[stat];
  }
  const levelsGained = level(after) - level(before);
  const newPoints = levelsGained * PROGRESSION.POINTS_PER_LEVEL;
  const pointsSpent = banked(before) + newPoints - banked(after);
  return { effectiveXp: xpChange(before, after), weeklyXp: xpChange(before, atKickoff),
    campXp, matchXp: xpChange(atKickoff, after) - campXp, xpBefore: xp(before), xpAfter: xp(after),
    levelBefore: level(before), levelAfter: level(after), levelsGained, newPoints, pointsSpent,
    bankedBefore: banked(before), bankedAfter: banked(after), statGains };
}

function branchReport(start: GameState, trial: WeekRun, opener: WeekRun, id: string, campXp: number, roundTrips: number) {
  const before = findPlayer(trial.after, id);
  const kickoff = findPlayer(opener.kickoffState, id);
  const after = findPlayer(opener.after, id);
  requireThat(same(ownedPeople(start), ownedPeople(opener.after)), 'player identity, age, ownership, signing or population changed');
  requireThat(same(start.capAccount, opener.after.capAccount), 'the club cap changed during the opening matches');
  return { intervals: trial.intervals + opener.intervals, endWeek: opener.after.week, roundTrips,
    population: ownedPeople(opener.after).live.length, trial: matchReport(trial, id), openingMatch: matchReport(opener, id),
    finance: financeReport(start, opener.after), development: developmentReport(before, kickoff, after, campXp) };
}

function chooseParticipant(start: GameState, afterTrial: GameState, role: AssignmentQARole): Player {
  const candidates = afterTrial.squad.filter(p => isFieldable(p) && isFieldable(findPlayer(start, p.id))).filter(p => {
    const projection = projectCampDeparture(afterTrial, { participantId: p.id });
    return projection.role === role && !projection.reason;
  });
  // Compare a young starter, a high-modifier interchange player and a veteran reserve when present.
  candidates.sort((a, b) => (role === 'starter' ? a.age - b.age : role === 'reserve' ? b.age - a.age
    : traitMult(b) - traitMult(a)) || a.id.localeCompare(b.id));
  const candidate = candidates[0];
  requireThat(candidate, `no fit and unbanned ${role} with legal cover after the real Week 4 trial`);
  return candidate;
}

function noAssignments(state: GameState) {
  const { assignments: _assignments, ...competition } = state.competitions!;
  return { ...state, competitions: competition };
}

/** Sequential Node-only QA. The live game store, settlement hooks and save slot are singletons. */
export async function runPlayerAssignmentQA(options: AssignmentQAOptions): Promise<AssignmentQAResult> {
  const { pack, difficulty, role, mode, source: { text, ...provenance } } = options;
  const result: AssignmentQAResult = {
    evidence: 'actual-paired-matches', pack, difficulty, role, mode,
    source: { ...provenance, version: 33, originalDifficulty: 'normal' },
    difficultySelection: difficulty === 'normal' ? 'source-save' : 'setting-changed-before-pair',
    spending: { savedManual: mode === 'saved-manual', globalManual: mode === 'qa-manual' },
    player: null, facilities: [], facilitiesXpMultiplier: 1, camp: null, decline: null, receipt: null,
    campXpMinusDecline: null, problems: [],
  };
  try { await preparePack(pack); }
  catch (error) {
    result.problems.push(`content pack: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
  const bytes = new Map<string, string>();
  const storage = { getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); }, removeItem: (key: string) => { bytes.delete(key); } };
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousNamespace = careerNamespace();
  const previousSlot = getActiveSlot();
  const previousSpendMode = levelPointSpendMode();
  let stage = 'v33 import';
  bus.clear(); clearHeldWeek();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  setCareerNamespace(null); __setStorage(storage); __unlockSaves(); setActiveSlot(1);
  setSpendMode(result.spending.globalManual ? 'manual' : 'auto');
  const installSource = (): GameState => {
    const saved = installImportedSave(text, 1);
    requireThat(saved.ok, !saved.ok ? saved.message : 'could not install migrated source');
    loadState(saved.state);
    const state = getState();
    requireThat(state.pack === pack && state.season === 1 && state.week === 4 && state.rngSeed === provenance.rngSeed
      && state.competitions?.calendar?.elapsedIntervals === 3 && state.competitions?.leagueCareer?.phase === 'active'
      && state.competitions.leagueCareer.scheduleSeed === provenance.careerSeed,
    'source does not match the saved Week 4 opening fixture checkpoint');
    requireThat(!state.competitions.assignments?.length && currentSkillsCamp(state)?.status === 'available',
      'v33 migration created an assignment or removed the Week 4 offer');
    if (state.settings.difficulty !== difficulty) setState({ settings: { ...state.settings, difficulty } });
    setSpendPointsMyself(result.spending.savedManual);
    const selected = getState();
    requireThat(selected.settings.difficulty === difficulty && (selected.settings.spendPointsMyself === true) === result.spending.savedManual
      && (levelPointSpendMode() === 'manual') === result.spending.globalManual, 'paired settings were not applied');
    requireThat(saveIfChanged(selected), 'could not save the shared pre-fork settings');
    checkBoundary(selected);
    return selected;
  };
  try {
    const raw: Pick<GameState, 'settings'> & { version: number } = JSON.parse(text);
    requireThat(raw.version === 33 && raw.settings.difficulty === 'normal', 'capture is not a Normal v33 source');
    result.source = { ...provenance, version: raw.version, originalDifficulty: raw.settings.difficulty };
    const declineStart = installSource();
    registerAllSystems();
    const sharedStartBytes = bytes.get(slotKey(1));
    stage = 'decline branch, Week 4 trial';
    const declineTrial = playWeek();
    const player = chooseParticipant(declineStart, declineTrial.after, role);
    const { id, name, age, position, traits, ceilings } = player;
    result.player = { id, name, age, position, traits, ceilings, ageMultiplier: ageMod(age), traitMultiplier: traitMult(player) };
    result.facilities = declineTrial.after.facilities;
    result.facilitiesXpMultiplier = facilityXpMultiplier(result.facilities);
    stage = 'decline branch, Week 5 opening match';
    const declineOpen = playWeek();
    roundTrip(bytes);
    result.decline = branchReport(declineStart, declineTrial, declineOpen, id, 0, 1);
    const declineMatch = result.decline.openingMatch;
    requireThat(declineMatch.role === role && !declineOpen.after.competitions!.assignments?.length, 'decline branch role changed or received a camp record');
    const appearanceBase = role === 'starter' ? PROGRESSION.STARTER_XP : role === 'bench' ? PROGRESSION.BENCH_XP : 0;
    const match = declineOpen.finished;
    const tally = foldEvents(match.result.events, declineStart.clubId).get(name);
    const potm = playerOfTheMatch(match.result, match.fixture.homeId, match.fixture.awayId);
    const momentsBase = role === 'reserve' ? 0 : (tally?.tries ?? 0) * PROGRESSION.TRY_XP
      + (tally?.lineBreaks ?? 0) * PROGRESSION.LINE_BREAK_XP
      + (potm?.teamId === declineStart.clubId && potm.name === name ? PROGRESSION.POTM_XP : 0);
    const clubMultiplier = ageMod(age) * traitMult(player) * result.facilitiesXpMultiplier;
    requireThat(close(result.decline.development.weeklyXp, PROGRESSION.WEEKLY_XP * injuryMult(player) * clubMultiplier)
      && close(result.decline.development.matchXp, (appearanceBase + momentsBase) * clubMultiplier),
    'decline XP differs from ordinary training, frozen participation and recorded moments');

    stage = 'camp branch, Week 4 booking';
    const campStart = installSource();
    requireThat(same(declineStart, campStart) && sharedStartBytes === bytes.get(slotKey(1)), 'the two branches started with different saved bytes');
    const focus = mode === 'auto' ? 'balanced' : null;
    const preview = captureCampAction({ kind: 'book', participantId: id, focus });
    requireThat(preview.ok, !preview.ok ? preview.message : 'could not preview camp');
    const booked = confirmCampAction(preview.selection);
    requireThat(booked.ok, !booked.ok ? booked.message : 'could not book camp');
    requireThat(same(campStart, { ...booked.state, competitions: campStart.competitions }), 'booking changed the career outside its reservation');
    roundTrip(bytes);
    stage = 'camp branch, Week 4 trial';
    const campTrial = playWeek();
    requireThat(same(noAssignments(campTrial.after), noAssignments(declineTrial.after)), 'camp changed the trial, before departure');
    requireThat(currentSkillsCamp(campTrial.after)?.status === 'booked' && awayPlayerIds(campTrial.after).size === 0,
      'camp departed before its Week 5 kickoff');

    stage = 'camp branch, Week 5 opening match and return';
    const campOpen = playWeek();
    requireThat(same(campOpen.after.lineup, declineTrial.after.lineup), 'automatic temporary cover changed saved lineup preferences');
    requireThat(same(campOpen.after.matchIncome.map(r => r.id).sort(), declineOpen.after.matchIncome.map(r => r.id).sort()),
      'camp changed match income identities');
    const absent = findPlayer(campOpen.kickoffState, id);
    const returned = findPlayer(campOpen.after, id);
    const completed = currentSkillsCamp(campOpen.after);
    requireThat(currentSkillsCamp(campOpen.kickoffState)?.status === 'away' && completed?.status === 'completed'
      && completed.booking?.participantId === id && completed.booking.participantName === name && completed.award
      && campOpen.after.competitions!.assignments?.length === 1 && !awayPlayerIds(campOpen.after).has(id),
    'the same owned player did not return once with a saved receipt');
    const receipt = completed.award;
    result.receipt = receipt;
    result.camp = branchReport(campStart, campTrial, campOpen, id, receipt.effectiveXp, 1);
    const campMatch = result.camp.openingMatch;
    requireThat(same(result.camp.trial, result.decline.trial), 'trial kickoff or played result differed across the pair');
    requireThat(campMatch.fixtureId === declineMatch.fixtureId && campMatch.competitionId === declineMatch.competitionId
      && campMatch.seed === declineMatch.seed, 'the pair played different opening fixtures or seeds');
    requireThat(campMatch.role === 'away' && !campMatch.starters.includes(id) && !campMatch.bench.includes(id)
      && campMatch.captain !== id && campMatch.kicker !== id, 'camp participant appeared in the opening sheet');
    requireThat(isFieldable(returned), 'camp participant did not return fit and unbanned');
    const repeatSelection = resolveLineup(campOpen.after.lineup, campOpen.after.squad);
    requireThat(role !== 'starter' || repeatSelection.starters.some(p => p?.id === id), 'the returned starter did not reclaim his saved place');
    requireThat(role !== 'bench' || repeatSelection.bench.some(p => p.id === id), 'the returned bench player did not reclaim his saved place');
    requireThat(result.camp.development.weeklyXp === 0 && banked(absent) === banked(player)
      && same(absent.stats, trainPlayer(player)), 'the absent player received home training or missed veteran decline');
    requireThat(same([returned.career, returned.seasonStats, returned.injuredWeeks, returned.suspendedWeeks],
      [player.career, player.seasonStats, player.injuredWeeks, player.suspendedWeeks]), 'the absent player received match stats, injury or discipline');
    result.campXpMinusDecline = result.camp.development.effectiveXp - result.decline.development.effectiveXp;
    requireThat(close(receipt.effectiveXp, 70 * ageMod(age) * traitMult(player))
      && close(result.camp.development.matchXp, 0) && close(result.camp.development.effectiveXp, receipt.effectiveXp),
    'camp XP differs from one 70-base award with age and traits and no home facilities');
    const { development } = result.camp;
    requireThat(receipt.mode === (mode === 'auto' ? 'auto' : 'manual') && receipt.focus === focus
      && close(receipt.xpBefore, development.xpBefore) && close(receipt.xpAfter, development.xpAfter)
      && receipt.levelsGained === development.levelsGained && receipt.newPoints === development.newPoints
      && receipt.pointsSpent === development.pointsSpent && receipt.bankedBefore === development.bankedBefore
      && receipt.bankedAfter === development.bankedAfter && receipt.priorPointsSpent === Math.min(receipt.bankedBefore, receipt.pointsSpent)
      && same(receipt.statGains, development.statGains), 'camp receipt differs from actual progression and spending');
    requireThat(mode === 'auto' || receipt.pointsSpent === 0, 'manual spending changed stats instead of banking points');

    stage = 'saved report reopening and duplicate result';
    const savedBytes = bytes.get(slotKey(1));
    bus.emit('match:finished', campOpen.finished);
    requireThat(getState() === campOpen.after && bytes.get(slotKey(1)) === savedBytes, 'replaying full time repeated the settlement');
    roundTrip(bytes);
    result.camp.roundTrips++;
    const beforeReopen = getState();
    requireThat(same(currentSkillsCamp(beforeReopen), completed) && same(currentSkillsCamp(getState()), completed),
      'reopening the report changed its receipt');
    bus.emit('match:finished', campOpen.finished);
    requireThat(getState() === beforeReopen && bytes.get(slotKey(1)) === savedBytes, 'reopening or replay paid the award twice');
  } catch (error) {
    result.problems.push(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSaveMeta(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear();
    setSpendMode(previousSpendMode);
    __setStorage(null); __unlockSaves(); setCareerNamespace(previousNamespace); setActiveSlot(previousSlot);
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  return result;
}
