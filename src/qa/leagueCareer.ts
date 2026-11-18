// Production League careers through the existing registered-system QA harness.
// This module is never imported by the game. No developer constructor or namespace.
import { SQUAD_MIN } from '../config';
import { bus, type Events } from '../core/events';
import { __setStorage, __unlockSaves, flushSaveMeta, importSave, loadSlot, saveIfChanged, setActiveSlot } from '../core/save';
import { getState, loadState, type GameState, type Player } from '../core/state';
import { careerNamespace, setCareerNamespace } from '../core/storage/local';
import { slotKey } from '../core/storageKeys';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld } from '../core/time';
import { signingFeeQuote } from '../data/financeRules';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { prepareLeagueCareer, startLeagueCareer } from '../systems/leagueCareerSetup';
import { previewLeagueEntry } from '../systems/leagueEntry';
import { confirmLeagueEntry } from '../systems/leagueEntryCommit';
import { leagueCareerStateProblem } from '../systems/leagueEntryValidation';
import { reconcileMatchIncome } from '../systems/matchIncome';
import { renewEarly } from '../systems/contracts';
import { publishedCap, salaryDemand } from '../systems/cap';
import { advanceWeekAsTapped, checkState, registerAllSystems, tallyNet } from './soak';

export interface LeagueQASample {
  season: number; leagueId: string; intervals: number; receipts: number; money: number;
  wins: number; draws: number; losses: number; premiership: boolean; population: number;
  annualSurvivors: number; retirements: number; births: number; renewals: number; expiries: number;
  cap: number; closeId: string; entryId: string;
}
export interface LeagueQAOptions {
  pack: 'au' | 'uk'; seed: number; seasons: number;
  /** Optional artifact sink; snapshots remain normal, strictly loadable saves. */
  snapshot?: (name: string, state: GameState) => void;
}
export interface LeagueQAResult {
  pack: 'au' | 'uk'; seed: number; difficulty: 'normal'; evidence: 'actual-production-seasons' | 'controlled-sporting-results'; namespace: string | null;
  initialUnsigned: number; initialLeagueId: string; intervals: number; matches: number;
  roundTrips: number; finalSeason: number; seasons: LeagueQASample[]; problems: string[];
}
const people = (state: GameState): Array<{ player: Player; owner: string }> => [
  ...state.squad.map(player => ({ player, owner: state.clubId })),
  ...state.freeAgents.map(player => ({ player, owner: 'unsigned' })),
  ...state.league.clubs.flatMap(club => (club.squad ?? []).map(player => ({ player, owner: club.id }))),
];
const assert = (value: unknown, message: string): void => { if (!value) throw new Error(message); };
const same = (a: unknown, b: unknown): boolean => canonicalLeagueJson(a) === canonicalLeagueJson(b);

/** Every assertion is run against production state, including strict normal admission. */
export async function runLeagueCareerQA(options: LeagueQAOptions): Promise<LeagueQAResult> {
  return exerciseLeagueCareer(options);
}

/** Valid normal saves for UI coverage, with explicitly controlled match scores.
 * These are not evidence of simulated sporting outcomes or game balance. */
export async function generateLeagueCareerUIFixtures(options: Omit<LeagueQAOptions, 'seasons'>): Promise<LeagueQAResult> {
  return exerciseLeagueCareer({ ...options, seasons: 4 }, { targetRanks: [0, 1, 0, 1], winSeasons: 3 });
}

function controlledSportingInterval(win: boolean): void {
  const kickoff: { match?: Events['match:started'] } = {};
  const off = bus.on('match:started', match => { kickoff.match = match; });
  try { advanceWeek(); } finally { off(); }
  const match = kickoff.match;
  if (!match) return;
  const homeWins = (match.fixture.homeId === getState().clubId) === win;
  bus.emit('match:finished', { fixture: match.fixture, result: {
    homeScore: homeWins ? 24 : 0, awayScore: homeWins ? 0 : 24,
    events: [], injuries: [], stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
    weather: 'clear', momentumTimeline: [],
  } });
}

async function exerciseLeagueCareer(options: LeagueQAOptions, control?: { targetRanks: number[]; winSeasons: number }): Promise<LeagueQAResult> {
  const result: LeagueQAResult = { pack: options.pack, seed: options.seed, difficulty: 'normal', evidence: control ? 'controlled-sporting-results' : 'actual-production-seasons',
    namespace: null, initialUnsigned: 0, initialLeagueId: '', intervals: 0, matches: 0, roundTrips: 0,
    finalSeason: 0, seasons: [], problems: [] };
  const bytes = new Map<string, string>();
  const storage = { getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); }, removeItem: (key: string) => { bytes.delete(key); } };
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousNamespace = careerNamespace();
  let stage = 'bootstrap';
  bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  setCareerNamespace(null); __setStorage(storage); __unlockSaves(); setActiveSlot(1);
  const check = (state: GameState) => {
    const problems = checkState(state);
    const strict = leagueCareerStateProblem(state);
    if (strict) problems.push(strict.message);
    assert(!problems.length, problems.join('; '));
    assert(!failedIntervalProblem(), failedIntervalProblem() ?? 'failed interval');
    assert(!weekHeld(), 'interval remained held after simulation');
    assert(state.competitions!.instances.every(i => !i.entrantIds.includes(state.clubId)
      || i.definition.format.kind === 'league' || i.definition.format.kind === 'exhibition'), 'player entered an optional event');
    assert(new Set(state.matchIncome.map(r => r.id)).size === state.matchIncome.length, 'duplicate cash receipt');
    assert(same(reconcileMatchIncome(state), state), 'settled cash can be paid twice');
  };
  const roundTrip = (label: string) => {
    const before = getState(); check(before);
    assert(saveIfChanged(before), `${label}: normal save refused`);
    const raw = bytes.get(slotKey(1))!;
    const imported = importSave(raw);
    assert(imported.ok, `${label}: normal import refused${!imported.ok ? `: ${imported.message}` : ''}`);
    const loaded = loadSlot(1);
    assert(loaded.status === 'ok', `${label}: normal load refused${'message' in loaded ? `: ${loaded.message}` : ''}`);
    if (loaded.status !== 'ok' || !imported.ok) throw new Error('unreachable');
    assert(!loaded.repairs.length && same(before, loaded.state) && same(before, imported.state), `${label}: reload changed a healthy career`);
    assert(bytes.get(slotKey(1)) === raw, `${label}: normal read changed saved bytes`);
    loadState(loaded.state); result.roundTrips++;
    options.snapshot?.(label, structuredClone(getState()));
  };
  try {
    assert(Number.isSafeInteger(options.seasons) && options.seasons > 0, 'seasons must be a positive integer');
    const setup = { clubName: `QA ${options.pack.toUpperCase()} League`, seed: options.seed,
      home: options.pack === 'uk' ? { town: 'Leeds', country: 'GB' } : { town: 'Brisbane', country: 'AU' } };
    // Detached construction is checked for determinism; start uses the same production constructor.
    const expected = await prepareLeagueCareer(setup);
    const started = await startLeagueCareer(setup, { slot: 1, expectedOriginal: null });
    assert(started.ok, !started.ok ? started.message : 'start failed');
    if (!started.ok) throw new Error('unreachable');
    assert(same(expected, getState()), 'fresh constructor is not deterministic');
    registerAllSystems();
    result.namespace = careerNamespace(); result.initialUnsigned = getState().freeAgents.length;
    result.initialLeagueId = getState().competitions!.world!.profile.startingDivisionId;
    assert(getState().settings.difficulty === 'normal', 'QA did not preserve ordinary Normal difficulty');
    assert(result.namespace === null, 'QA accidentally entered developer namespace');
    assert(result.initialUnsigned === 12, 'fresh career lacks its 12 canonical unsigned people');
    roundTrip('initial-gate');
    const initial = JSON.stringify(getState()); advanceWeek();
    assert(JSON.stringify(getState()) === initial, 'initial gate advanced without confirmation');
    let preview = previewLeagueEntry(getState(), result.initialLeagueId);
    assert(preview.ok, !preview.ok ? preview.message : 'preview failed');
    if (!preview.ok) throw new Error('unreachable');
    const entry = confirmLeagueEntry(preview.preview);
    assert(entry.ok, !entry.ok ? entry.message : 'initial entry failed');
    roundTrip('season-1-accepted');
    bus.on('match:started', () => { result.matches++; });
    for (let year = 1; year <= options.seasons; year++) {
      stage = `season ${year}`;
      const start = structuredClone(getState());
      const clubs = start.league.clubs.map(c => c.id);
      const initialPeople = new Map(people(start).map(p => [p.player.id, p]));
      const slotCount = start.competitions!.calendar!.slots.length;
      // Exercise one genuine signed renewal when available, leaving other deals to expire naturally.
      let renewed = 0;
      for (const player of start.squad.filter(p => p.deal?.endSeason === year && !p.deal.renewal)) {
        const renewedDeal = renewEarly(getState(), player.id);
        if (renewedDeal.ok) { renewed++; break; }
      }
      for (let interval = 0; interval < slotCount; interval++) {
        stage = `season ${year}, interval ${interval + 1}`;
        if (control && year === 1 && interval === slotCount - 1) roundTrip('season-1-before-final');
        const before = getState();
        assert(before.competitions!.leagueCareer!.phase === 'active', 'season closed before its saved final interval');
        if (control) controlledSportingInterval(year <= control.winSeasons);
        else advanceWeekAsTapped();
        result.intervals++;
        const state = getState(); check(state);
        assert(state.competitions!.calendar!.elapsedIntervals === before.competitions!.calendar!.elapsedIntervals + 1, 'interval clock did not advance exactly once');
        assert(same(clubs, state.league.clubs.map(c => c.id)), 'club identity changed during play');
        for (const { player, owner } of people(state)) {
          const old = initialPeople.get(player.id);
          if (old) { assert(player.age === old.player.age, `${player.id} aged before annual acceptance`);
            assert(owner === old.owner, `${player.id} changed owner during an idle season`); }
        }
      }
      stage = `season ${year}, close`;
      const closed = structuredClone(getState());
      const progress = closed.competitions!.leagueCareer!;
      assert(progress.phase === 'next-season-choice', 'final interval did not close to an explicit choice');
      assert(closed.history.filter(h => h.season === year).length === 1, 'season history was not written exactly once');
      assert(progress.accepted!.leagueId === start.competitions!.leagueCareer!.accepted!.leagueId, 'sporting result automatically moved the player');
      const books = closed.finance.find(f => f.season === year)!;
      assert(tallyNet(books) === closed.money - start.money, 'cash balance does not reconcile to season books');
      assert(books.wages === 0, 'salary cap charged weekly cash wages');
      roundTrip(`season-${year}-closed`);
      const gated = JSON.stringify(getState()); advanceWeek(); advanceWeek();
      assert(JSON.stringify(getState()) === gated, 'closed gate advanced or replayed settlement');
      const targetLeagueId = control ? getState().competitions!.world!.divisions.find(d => d.rank === control.targetRanks[year - 1])!.id : result.initialLeagueId;
      preview = previewLeagueEntry(getState(), targetLeagueId);
      assert(preview.ok, !preview.ok ? preview.message : 'annual preview failed');
      if (!preview.ok) throw new Error('unreachable');
      assert(same(preview, previewLeagueEntry(getState(), targetLeagueId)), 'annual preview is not deterministic');
      const accepted = confirmLeagueEntry(preview.preview);
      assert(accepted.ok, !accepted.ok ? accepted.message : 'annual confirmation failed');
      if (!accepted.ok) throw new Error('unreachable');
      const next = getState(); check(next);
      assert(next.season === year + 1 && next.week === 1, 'annual cursor did not advance once');
      assert(next.money === closed.money, 'annual entry changed wallet cash');
      assert(publishedCap(next.capAccount) >= publishedCap(closed.capAccount), 'annual entry reduced retained cap');
      assert(same(clubs, next.league.clubs.map(c => c.id)), 'annual entry regenerated clubs');
      const oldPeople = new Map(people(closed).map(p => [p.player.id, p]));
      const surviving = people(next).filter(p => oldPeople.has(p.player.id));
      const retired = next.playerPopulation.retired.filter(p => p.retiredAt.season === next.season);
      let expiries = 0;
      for (const { player, owner } of surviving) {
        const old = oldPeople.get(player.id)!;
        assert(player.age === old.player.age + 1, `${player.id} did not age exactly once`);
        const expired = old.owner === closed.clubId && old.player.deal && old.player.deal.endSeason < next.season && !old.player.deal.renewal;
        const expiredRival = old.owner !== 'unsigned' && old.owner !== closed.clubId && old.player.deal
          && old.player.deal.endSeason < next.season && !old.player.deal.renewal;
        if (owner !== old.owner) {
          assert(expired || expiredRival || old.owner === 'unsigned', `${player.id} moved despite a surviving signed deal`);
          const last = player.clubHistory!.spells.slice(-1)[0];
          assert(owner === 'unsigned' ? !!last?.end && last.departure === 'expiry'
            : last?.clubId === owner && last.arrival === 'signing' && last.start.season === next.season,
          `${player.id} changed owner without truthful expiry/signing history`);
          assert(owner !== closed.clubId, `${player.id} automatically joined the player club`);
        }
        if (expired) expiries++;
        if (old.player.deal && old.player.deal.endSeason >= next.season) assert(same(player.deal, old.player.deal), `${player.id} had a surviving signed promise rewritten`);
        if (old.player.deal?.renewal && old.player.deal.endSeason < next.season) assert(player.deal?.salary === old.player.deal.renewal.salary
          && player.deal?.endSeason === old.player.deal.renewal.endSeason && !player.deal.renewal, `${player.id} lost the signed renewal`);
      }
      for (const person of retired) assert(person.age === oldPeople.get(person.id)!.player.age + 1, `${person.id} retired at the wrong age`);
      for (const club of next.league.clubs.filter(c => c.id !== next.clubId)) {
        const before = closed.league.clubs.find(c => c.id === club.id)!;
        const incoming = club.squad!.filter(p => oldPeople.has(p.id) && oldPeople.get(p.id)!.owner !== club.id);
        const fees = incoming.reduce((sum, p) => sum + signingFeeQuote(salaryDemand(p), false), 0);
        assert(club.cash === before.cash! - fees, `${club.id} wallet changed outside funded annual recruitment`);
      }
      const births = people(next).length - surviving.length;
      const annual = next.competitions!.leagueCareer!.accepted!.annualChanges!;
      const rivalEmergency = people(next).filter(p => !oldPeople.has(p.player.id) && p.owner !== 'unsigned'
        && p.owner !== next.clubId && p.player.emergencyDealEndSeason === next.season);
      assert(births === annual.academyBirths + annual.marketBirths + rivalEmergency.length, 'population increase differs from annual birth receipts');
      for (const birth of rivalEmergency) assert(birth.player.emergencyForPlayerId
        && oldPeople.get(birth.player.emergencyForPlayerId)?.owner === birth.owner,
        `${birth.player.id} has no genuine minimum-roster vacancy`);
      assert(retired.length === annual.retirements, 'retirement receipt differs from archived people');
      assert(surviving.length + retired.length === oldPeople.size, 'people disappeared during annual work');
      assert(annual.marketBirths <= 12 && annual.academyBirths <= 18 && rivalEmergency.length <= (next.league.clubs.length - 1) * SQUAD_MIN, 'annual population growth exceeds bounded market/academy/vacancy intake');
      const history = closed.history.find(h => h.season === year)!;
      assert(Number.isInteger(history.wins) && Number.isInteger(history.draws) && Number.isInteger(history.losses), 'completed history lacks its actual record');
      assert(history.wins! + history.draws! + history.losses! === history.league!.regularRounds, 'completed record disagrees with saved regular rounds');
      result.seasons.push({ season: year, leagueId: progress.accepted!.leagueId, intervals: slotCount,
        receipts: closed.matchIncome.filter(r => r.season === year && r.receipt).length, money: closed.money,
        wins: history.wins!, draws: history.draws!, losses: history.losses!, premiership: history.premiership,
        population: people(next).length, annualSurvivors: surviving.length, retirements: retired.length, births,
        renewals: renewed, expiries, cap: publishedCap(next.capAccount), closeId: progress.close!.id,
        entryId: next.competitions!.leagueCareer!.accepted!.receiptId });
      roundTrip(`season-${year + 1}-accepted`);
      const acceptedBytes = JSON.stringify(getState());
      assert(!confirmLeagueEntry(preview.preview).ok, 'replayed annual selection was accepted');
      assert(JSON.stringify(getState()) === acceptedBytes, 'replayed annual selection changed state');
    }
    result.finalSeason = getState().season;
  } catch (error) { result.problems.push(`${stage}: ${error instanceof Error ? error.message : String(error)}`); }
  finally {
    flushSaveMeta(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear();
    __setStorage(null); __unlockSaves(); setCareerNamespace(previousNamespace);
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  return result;
}
