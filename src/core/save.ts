import { awaitingCampReplay, CHALLENGE_REPLAY_PROBLEM, inconsistentChallengeReplay } from '../systems/parkedLeagueFixture';
import { leagueCareerStateProblem } from '../systems/leagueEntryValidation';
import { repairClosedSeasonTrip } from '../systems/leagueTripRepair';
import { migrateObservedProtection } from '../systems/cap';
import { initialPlayerPopulation, installPlayerHistory } from '../systems/playerCareer';
import { createOpenCupOffer } from '../systems/openCupEntry';
import { prepareOpenCup } from '../systems/openCupCareer';
import { prepareDivisionFinals } from '../systems/divisionCareer';
import { hasExecutableCupRewards, reconcileMatchEffects, reconcileMatchIncome } from '../systems/matchIncome';
import { currentRound } from './season';
import { careerNamespace } from './storage/local';
import { DEV_TEST_PREFIX } from './storageKeys';
import { currentCalendarFixtures, fixtureBridge, hasStructuralCalendar, recoverUnfinishableCompetitions, sameFixtureIdentity, structuralPolicyProblem } from '../systems/competitionCalendar';
// src/core/save.ts — persistence, migration, slots + title flow
// (BAK-174, WU-4; migration/export/import/slots: GitHub #34; storage seam: #360).
//
// Serialises the whole GameState (plain JSON per ARCHITECTURE §1.2) to one of
// three save slots, loads & migrates & validates on boot, falls back to
// null when absent, and degrades gracefully on corrupt saves or storage errors.
// Also provides the autosave subscriber (on 'week:advanced') and a minimal DOM
// title flow.
//
// No Phaser. Pure TS + optional DOM. Storage is reached only through the save
// store (src/core/storage/, docs/specs/commercial-saves.md): LocalSaveStore over
// localStorage, or over a Map-backed fake a Node-env unit test injects. Every key
// comes from src/core/storageKeys.ts, frozen whatever the game is called.

import type { Fixture, GameState } from './state';
import { hasV33Fields, validateInput, validateCurrent, type SaveRepair } from './saveValidation';
import { emptyFinance, getState, SAVE_VERSION, setState, stateInstallation } from './state';
import { fromLegacy, isTraitId, type TraitInstance } from '../data/traits';
import { withRivalSquads } from '../systems/rivals';
import { autoPick } from '../systems/lineup';
import { DEFAULT_TACTICS } from '../match/league/presets';
import { bus } from './events';
import { registerTickHook, TICK_ORDER, unregisterTickHook, weekHeld, activePaidCupCheckpoint, leagueIntervalSaveHeld, failedIntervalProblem, failedIntervalCheckpoint, type IntervalCheckpoint } from './time';
import { clearLiveMatch, isLiveMatchRecord, parseLiveMatch, LIVE_MATCH_EXPORT_FIELD, peelLiveMatchExport, readLiveMatch, writeLiveMatch } from '../systems/liveMatchRecord';
import { CLASSIC_RETIRED_TEXT, isClassicSave } from './classicSave';
import { acknowledgeClassicArchive, acknowledgeClassicSlotGone, nativeCheckpointRequired } from './storage/nativeCheckpoint';
import { classicRetiredNoticeKey, CORRUPT_SAVE_KEY, LEGACY_SAVE_KEY, liveMatchKey, retiredSaveKey, slotKey } from './storageKeys';
import { BRAND } from '../brand';
import { cleanName } from '../data/names';
import { allPlayers, renameClubsPatch, renamePlayersPatch, validClubColors, type ClubEdit } from '../systems/rename';
import { browserStorage, inCareerNamespace, LocalSaveStore, type StorageLike } from './storage/local';
import { withSaveLease, withSaveLock } from './storage/saveLock';
import { nextMeta } from './storage/meta';
import { deliverFile } from './storage/native';
import type { SaveMeta, SlotListing } from './storage/types';

export { slotKey } from './storageKeys';
export type { StorageLike } from './storage/local';

/** Legacy single-save key (pre-slots). Kept until its data is safely in slot 1. */
export const SAVE_KEY = LEGACY_SAVE_KEY;
export const CORRUPT_KEY = CORRUPT_SAVE_KEY;
export const SLOT_COUNT = 3;

// ── Storage ─────────────────────────────────────────────────────────────────
//
// Tests inject a fake StorageLike via __setStorage; production resolves the real
// `localStorage` when present (guarded for privacy mode / SSR / Node where it is
// undefined). Either way save.ts talks to it through one LocalSaveStore.

let injectedStorage: StorageLike | null = null;
let activeStore: LocalSaveStore | null = null;
// Boundary approvals are scoped to the actual namespaced store and exact bytes.
// Autosave never validates nested input during a tick. An externally changed
// occupied slot must be reopened through load/import before it can be written.
let approvedOriginals = new WeakMap<LocalSaveStore, Map<number, { raw: string; preserve: boolean }>>();
function approveOriginal(store: LocalSaveStore, slot: number, raw: string, preserve: boolean): void {
  let slots = approvedOriginals.get(store);
  if (!slots) approvedOriginals.set(store, slots = new Map());
  slots.set(slot, { raw, preserve });
}

/** Test hook: inject a fake storage (pass null to clear and fall back to real). */
export function __setStorage(s: StorageLike | null): void {
  injectedStorage = s;
  approvedOriginals = new WeakMap();
  pendingLeagueSave = undefined;
  slotImported = false; // a fresh storage is a fresh page
}

/**
 * The store over the active storage: injected fake first, else the real
 * `localStorage` if the environment provides it, else null (in-memory-only, no
 * persistence). One store per storage, so its queued meta and device id persist.
 */
function getStore(): LocalSaveStore | null {
  // A playtest career (#519) reads and writes only under its own prefix.
  const storage = inCareerNamespace(injectedStorage ?? browserStorage());
  if (!storage) return null;
  if (activeStore?.storage !== storage) activeStore = new LocalSaveStore(storage, SLOT_COUNT);
  return activeStore;
}

// ── Migration ────────────────────────────────────────────────────────────────
//
// v24 exception (Leon, 10 Nov 2026): new careers only. v28 (Leon, 15 Nov 2026)
// is the finance boundary: saves at LAST_PRE_FINANCE_VERSION and earlier are
// rejected before any of these historical steps can run. There is no converter
// for old cash, wages or contracts. A later SAVE_VERSION bump migrates v28
// careers with a normal step; it does not refuse them.
//
// HOW TO ADD A STATE CHANGE (e.g. new GameState fields):
//   1. Bump SAVE_VERSION in state.ts (N → N+1) and update GameState + createNewGame.
//   2. Append ONE step to MIGRATIONS below: `{ from: N, to: N+1, run }` where `run`
//      takes the old-shape object and returns a NEW object with the new fields
//      filled with defaults (never mutate the input; never delete user data).
//   3. Add a test: a vN save loads through migrateState with the defaults filled.
// Steps are applied in order from the save's version up to SAVE_VERSION, so a
// v1 save passes through every step. Each step must be pure and only know about
// its own version pair. Saves newer than SAVE_VERSION are refused, not touched.

/** Saves at this version or earlier are pre-finance. The cutoff does not move when SAVE_VERSION does. */
export const LAST_PRE_FINANCE_VERSION = 27;

type RawState = Record<string, unknown>;

interface MigrationStep {
  from: number;
  to: number;
  run(old: RawState): RawState;
}

export const MIGRATIONS: readonly MigrationStep[] = [
  // v1 → v2: storage moved to save slots; the state shape itself is unchanged.
  { from: 1, to: 2, run: (old) => ({ ...old }) },
  // v2 → v3: settings.difficulty (GitHub #48). Existing saves play as Normal.
  {
    from: 2,
    to: 3,
    run: (old) => ({
      ...old,
      settings: { ...((old.settings as RawState | undefined) ?? {}), difficulty: 'normal' },
    }),
  },
  // v3 → v4: player career tallies, join season and extended history (GitHub #46).
  {
    from: 3,
    to: 4,
    run: (old) => {
      const season = typeof old.season === 'number' ? old.season : 1;
      const fillPlayers = (list: unknown): unknown =>
        Array.isArray(list)
          ? list.map((p: RawState) => ({
              ...p,
              career: p.career ?? { games: 0, tries: 0, tackles: 0, lineBreaks: 0 },
              joinedSeason: p.joinedSeason ?? season,
            }))
          : list;
      return {
        ...old,
        squad: fillPlayers(old.squad),
        freeAgents: fillPlayers(old.freeAgents),
        history: Array.isArray(old.history)
          ? old.history.map((h: RawState) => ({
              wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, ...h,
            }))
          : old.history,
      };
    },
  },
  // v4 → v5: board patience + objectives for the current season (GitHub #47).
  // Old saves get sensible defaults; the board sets fresh goals next season.
  {
    from: 4,
    to: 5,
    run: (old) => {
      const season = typeof old.season === 'number' ? old.season : 1;
      return {
        ...old,
        boardPatience: old.boardPatience ?? 5,
        objectives: old.objectives ?? [
          { id: `s${season}-finals`, kind: 'finals', text: 'Finish in the top 8', target: 8, status: 'pending' },
          { id: `s${season}-solvent`, kind: 'solvent', text: 'Finish the season with cash in the bank', target: 0, status: 'pending' },
        ],
      };
    },
  },
  // v5 → v6: traits become levelled instances { id, level } (BAK-208 §3). Old
  // names map to level I; hardMan was renamed hitman; unknown names are dropped.
  {
    from: 5,
    to: 6,
    run: (old) => {
      const fillPlayers = (list: unknown): unknown =>
        Array.isArray(list)
          ? list.map((p: RawState) => ({ ...p, traits: migrateTraits(p.traits) }))
          : list;
      return { ...old, squad: fillPlayers(old.squad), freeAgents: fillPlayers(old.freeAgents) };
    },
  },
  // v6 → v7: the random events deck (GitHub #75). Old saves start with an empty
  // deck whose stream is derived from the save's rngSeed.
  {
    from: 6,
    to: 7,
    run: (old) => ({
      ...old,
      eventDeck: old.eventDeck ?? {
        rng: ((typeof old.rngSeed === 'number' ? old.rngSeed : 1) ^ 0x9e3779b9) >>> 0,
        pending: [], cooldowns: {}, lastDrawn: 0, modifiers: [],
      },
    }),
  },
  // v7 → v8: rival clubs get real squads (GitHub #74), generated to match each
  // club's current strength and seeded per club from the save's rngSeed.
  // (Uses the live generator: a later Player change must keep its own step.)
  {
    from: 7,
    to: 8,
    run: (old) => {
      const league = old.league as RawState | undefined;
      if (!league || !Array.isArray(league.clubs)) return { ...old };
      const seed = typeof old.rngSeed === 'number' ? old.rngSeed : 1;
      return { ...old, league: { ...league, clubs: withRivalSquads(league.clubs as GameState['league']['clubs'], seed) } };
    },
  },
  // v8 → v9: optional GameState.kit (GitHub #79). Old saves have no design, which
  // keeps the look derived from their club colours, so nothing is filled in.
  { from: 8, to: 9, run: (old) => ({ ...old }) },
  // v9 → v10: GameState.finance, the club's books by season (N6, #172). An old
  // save starts with nothing booked for the season it is in.
  { from: 9, to: 10, run: (old) => ({ ...old, finance: [emptyFinance(typeof old.season === 'number' ? old.season : 1)] }) },
  // v10 → v11: GameState.lineup, the coach's nine and bench (GitHub #69). An old
  // save gets today's auto pick: the side teamSheetFromSquad was already fielding.
  { from: 10, to: 11, run: (old) => ({ ...old, lineup: old.lineup ?? autoPick(Array.isArray(old.squad) ? (old.squad as GameState['squad']) : []) }) },
  // v11 → v12: the season review (N7, #190): SeasonRecord.review and the
  // player-of-the-match tally, GameState.potmTally. Both optional, so an old
  // save's past seasons simply have no review to reopen and the tally starts
  // with the next award; nothing is filled in.
  { from: 11, to: 12, run: (old) => ({ ...old }) },
  // v12 → v13: settings.liveRivals, rival-v-rival matches on the live sim (N9.2).
  // Optional and off when absent, so an old save keeps the cheap rival sim.
  { from: 12, to: 13, run: (old) => ({ ...old }) },
  // v13 → v14: Lineup.tactics, the coach's attack and defence presets (N11). An old
  // save plays Balanced / Slide, as it always has.
  {
    from: 13,
    to: 14,
    run: (old) => {
      const lineup = old.lineup as Partial<GameState['lineup']> | undefined;
      return lineup ? { ...old, lineup: { ...lineup, tactics: lineup.tactics ?? { ...DEFAULT_TACTICS } } } : { ...old };
    },
  },
  // v14 → v15 (N11): the coach picks a goal-kicker and a captain. An older save
  // leaves both to the default: the best-kicking half and the smartest starter.
  {
    from: 14,
    to: 15,
    run: (old) => {
      const lineup = old.lineup as Partial<GameState['lineup']> | undefined;
      return lineup ? { ...old, lineup: { ...lineup, kicker: lineup.kicker ?? null, captain: lineup.captain ?? null } } : { ...old };
    },
  },
  // v15 → v16 (N11): a squad training focus. An older save trains Balanced, as it always has.
  { from: 15, to: 16, run: (old) => ({ ...old, training: { focus: 'balanced' } }) },
  // v16 → v17: the books' thirteenth line, `overhead`, the club's running costs
  // (N12.3). Every season an old save has booked paid none: it gets 0.
  {
    from: 16,
    to: 17,
    run: (old) => (Array.isArray(old.finance)
      ? { ...old, finance: (old.finance as RawState[]).map((e) => ({ ...e, overhead: typeof e.overhead === 'number' ? e.overhead : 0 })) }
      : { ...old }),
  },
  // v17 → v18 (N14.3): the board loan. An older save owes the board nothing.
  { from: 17, to: 18, run: (old) => ({ ...old, boardLoan: { owed: 0 } }) },
  // v18 → v19 (N14.5): staff. An older save has hired nobody.
  { from: 18, to: 19, run: (old) => ({ ...old, staff: [] }) },
  // v19 → v20: settings.playbackSpeed, the match speed last picked. Absent plays at ×2,
  // so an old save is not filled in.
  { from: 19, to: 20, run: (old) => ({ ...old }) },
  // v20 → v21: bans and event-chain flags (#324, #325). An old save has nobody
  // suspended and no follow-up waiting. suspendedWeeks stays optional in play
  // (absent means 0); filling 0 keeps a migrated squad explicit.
  {
    from: 20,
    to: 21,
    run: (old) => {
      const fill = (list: unknown): unknown =>
        Array.isArray(list)
          ? list.map((p: RawState) => ({ ...p, suspendedWeeks: typeof p.suspendedWeeks === 'number' ? p.suspendedWeeks : 0 }))
          : list;
      const league = old.league as RawState | undefined;
      const deck = (old.eventDeck as RawState | undefined) ?? {};
      return {
        ...old,
        squad: fill(old.squad),
        freeAgents: fill(old.freeAgents),
        ...(league
          ? {
              league: {
                ...league,
                clubs: Array.isArray(league.clubs)
                  ? league.clubs.map((c: RawState) => ({
                      ...c,
                      ...(Array.isArray(c.squad) ? { squad: fill(c.squad) } : {}),
                    }))
                  : league.clubs,
              },
            }
          : {}),
        eventDeck: { ...deck, flags: Array.isArray(deck.flags) ? deck.flags : [] },
      };
    },
  },
  // v21 → v22: rivals learn only from league plans actually played (#469).
  { from: 21, to: 22, run: (old) => ({ ...old, recentPlans: [] }) },
  // v22 → v23 (#326): set plays. An older save has bought none and takes none into a match.
  {
    from: 22,
    to: 23,
    run: (old) => {
      const lineup = old.lineup as RawState | undefined;
      return { ...old, playbook: { owned: [] }, ...(lineup && typeof lineup === 'object' ? { lineup: { ...lineup, plays: [] } } : {}) };
    },
  },
  // v24 → v25 (#570): optional competition metadata. Existing careers retain
  // their league, people, RNG and absent metadata; no pyramid is constructed.
  { from: 24, to: 25, run: (old) => ({ ...old }) },
  // v26 adds explicit developer-only calendar activation; supported careers stay dormant.
  { from: 25, to: 26, run: (old) => ({ ...old }) },
  // v27 records optional regional world membership; existing careers retain it absent.
  { from: 26, to: 27, run: (old) => ({ ...old }) },
  // v30 preserves all people and observes current owners; no historical clubs are invented.
  { from: 29, to: 30, run: old => {
    const state = old as unknown as GameState;
    const squad = state.squad.map(p => installPlayerHistory(p, state.clubId, state, 'observed'));
    const freeAgents = state.freeAgents.map(p => installPlayerHistory(p, 'unsigned', state, 'observed'));
    const league = { ...state.league, clubs: state.league.clubs.map(c => c.squad
      ? { ...c, squad: c.squad.map(p => installPlayerHistory(p, c.id, state, 'observed')) } : c) };
    return { ...old, squad, freeAgents, league, playerPopulation: initialPlayerPopulation({ ...state, squad, freeAgents, league }) };
  } },
  // v29 starts receipt-backed income without retroactive claims on v28 results.
  { from: 28, to: 29, run: old => ({ ...old, matchIncome: [] }) },
  // v31 adds optional progression; no historical titles or entry are inferred.
  { from: 30, to: 31, run: old => ({ ...old }) },
  { from: 32, to: 33, run: old => ({...old, competitionRewards: []}) },
  // Absence of assignment records means the club has never booked a place.
  { from: 33, to: 34, run: old => old },
  { from: 34, to: 35, run: old => old },
  // v32 snapshots the agreement observed under v31 ID-only protection.
  // Already recorded exact terms keep their provenance, including queued terms.
  { from: 31, to: 32, run: old => {
    const state = old as unknown as GameState;
    return { ...old, capAccount: migrateObservedProtection(state.squad, state.capAccount, state.season),
      league: { ...state.league, clubs: state.league.clubs.map(c => c.squad && c.capAccount
        ? { ...c, capAccount: migrateObservedProtection(c.squad, c.capAccount, state.season) } : c) } };
  } },
];

/** Old string traits → instances; instances already in the new shape pass through. */
function migrateTraits(traits: unknown): TraitInstance[] {
  if (!Array.isArray(traits)) return [];
  const legacy = traits.filter((t): t is string => typeof t === 'string');
  const kept = traits.filter((t): t is TraitInstance => !!t && typeof t === 'object' && isTraitId(String((t as TraitInstance).id)));
  return [...kept.map((t) => ({ id: t.id, level: ([1, 2, 3] as const).includes(t.level) ? t.level : 1 })), ...fromLegacy(legacy)];
}

export type MigrateResult =
  | { ok: true; outcome: 'valid' | 'repaired'; state: GameState; repairs: SaveRepair[] }
  | { ok: false; outcome: 'unrecoverable' | 'unsupported'; reason: 'corrupt' | 'future'; message: string };

/**
 * Upgrade a parsed save to the current version, one step at a time, then
 * validate its structure. Pure: never mutates `raw`, never touches storage.
 * Future-version saves are refused with a clear message (reason 'future').
 */
export function migrateState(raw: unknown): MigrateResult {
  try { return migrateChecked(raw); }
  catch { return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: 'Save could not be migrated.' }; }
}

function migrateChecked(raw: unknown): MigrateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: 'Not a valid save file.' };
  }
  let cur = raw as RawState;
  const declared = cur.version;
  if (typeof declared !== 'number' || !Number.isInteger(declared) || declared < 1) {
    return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: 'Save has no valid version.' };
  }
  let version: number = declared;
  if (version > SAVE_VERSION) {
    return {
      ok: false,
      outcome: 'unsupported', reason: 'future',
      message: `This save is from a newer version of ${BRAND.name} (save v${version}, this game supports v${SAVE_VERSION}). Update the game to load it.`,
    };
  }
  // Pre-finance careers are kept and are not converted. v28 and later migrate.
  if ('individualChallenges' in cur || (version < 35 && cur.competitions && typeof cur.competitions === 'object' && 'individualChallenges' in cur.competitions))
    return {ok:false,outcome:'unrecoverable',reason:'corrupt',message:'Invalid individual challenge data for this save format.'};
  if (version <= LAST_PRE_FINANCE_VERSION) {
    return { ok: false, outcome: 'unrecoverable', reason: 'corrupt',
      message: `This save is from an older version of ${BRAND.name} (save v${version}). Please start a new career. Your original save has been kept.` };
  }
  if (version <= 32 && hasV33Fields(cur))
    return {ok:false, outcome:'unrecoverable', reason:'corrupt', message:'The save contains Open Cup data from a later format.'};
  const competitions = cur.competitions;
  if (version <= 33 && ('assignments' in cur || competitions && typeof competitions === 'object' && 'assignments' in competitions))
    return {ok:false,outcome:'unrecoverable',reason:'corrupt',message:'The save contains assignment data from a later format.'};
  if (competitions && typeof competitions === 'object' && 'leagueCareer' in competitions) {
    let state = cur as unknown as GameState;
    if (version === 32) state = createOpenCupOffer({...structuredClone(state),version:SAVE_VERSION,competitionRewards:[]});
    if (version === 33 || version === 34) state = {...state,version:SAVE_VERSION};
    const problem = leagueCareerStateProblem(state);
    // #837: a trip answered at the league choice. Kept only if the repaired career passes every check.
    const trip = problem ? repairClosedSeasonTrip(state) : null;
    if (trip && !leagueCareerStateProblem(trip.state)) return { ok: true, outcome: 'repaired', state: trip.state, repairs: [trip.repair] };
    return problem ? { ok: false, outcome: problem.reason === 'unsupported' ? 'unsupported' : 'unrecoverable',
      reason: 'corrupt', message: problem.message }
      : { ok: true, outcome: 'valid', state, repairs: [] };
  }
  const inputProblem = validateInput(cur, version);
  if (inputProblem) return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: inputProblem };
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) {
      return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: `No migration from save v${version}.` };
    }
    cur = { ...step.run(cur), version: step.to };
    version = step.to;
  }
  const checked = validateCurrent(cur);
  return checked.ok
    ? { ...checked, outcome: checked.repairs.length ? 'repaired' : 'valid' }
    : { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: checked.message };
}

/** Parse + migrate JSON text (shared by load and import). Never throws. */
function parseSave(text: string): MigrateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: 'File is not valid JSON.' };
  }
  try { return migrateState(parsed); }
  catch { return { ok: false, outcome: 'unrecoverable', reason: 'corrupt', message: 'Save could not be migrated.' }; }
}

// ── Slots ────────────────────────────────────────────────────────────────────

let activeSlot = 1;

/** Set when an import replaces the active slot: save() writes nothing after it until
 *  enableAutosave starts a game again (in the browser, after the reload). */
let slotImported = false;

export function getActiveSlot(): number {
  return activeSlot;
}

/** Choose the slot that save()/load()/clearSave() operate on (1..SLOT_COUNT). */
export function setActiveSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) {
    throw new RangeError(`slot must be 1..${SLOT_COUNT}`);
  }
  activeSlot = slot;
}

export type SlotStatus = 'empty' | 'ok' | 'future' | 'corrupt';

export interface SlotSummary {
  slot: number;
  status: SlotStatus;
  clubName?: string;
  season?: number;
  week?: number;
  /** The club's place on the ladder (1 = top), when the caller asked for it; left out before a round is in. */
  ladder?: number;
  /** Human-readable reason for 'future' / 'corrupt'. */
  message?: string;
}

/**
 * Describe slots without replacing their source; repaired originals are retained. `place`
 * reads a season's ladder place (the title passes the HUD's standing; it lives in the game
 * systems, which this module doesn't import): 0, a throw or no `place` leaves it off.
 */
export function getSlotSummaries(place?: (state: GameState) => number): SlotSummary[] {
  const store = getStore();
  const out: SlotSummary[] = [];
  if (loadSlot(1).status === 'ok') store?.migrateLegacy();
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const result = loadSlot(slot);
    if (result.status === 'empty') {
      out.push({ slot, status: 'empty' });
      continue;
    }
    if (result.status !== 'ok') {
      out.push({ slot, status: result.status, message: result.message });
      continue;
    }
    out.push({
      slot, status: 'ok',
      clubName: String(result.state.clubName), season: result.state.season, week: result.state.week,
      ...slotPlace(result.state, place),
      ...(result.repairs.length ? { message: result.repairs[0]!.notification } : {}),
    });
  }
  return out;
}

function slotPlace(state: GameState, place?: (state: GameState) => number): { ladder?: number } {
  try {
    const rank = place?.(state) ?? 0;
    return rank > 0 ? { ladder: rank } : {};
  } catch {
    return {}; // the card is only a summary: a ladder it can't read leaves the place off
  }
}

// ── save / load / clear ──────────────────────────────────────────────────────

/** Write `state` to `slot`. Returns false (after warning + ui:notify) on failure. */
export function writeSlot(slot: number, state: GameState, expectedOriginal?: string | null, verifyPayload = false): boolean {
  return persistSlot(getStore(), slot, state, expectedOriginal, {verifyPayload});
}

function persistSlot(store: LocalSaveStore | null, slot: number, state: GameState, expectedOriginal: string | null | undefined,
  options: {parkedMatch?: string | null; verifyPayload?: boolean; current?: () => boolean}): boolean {
  if (savesLocked) return false;
  if (!store) {
    console.warn('nrl-sim: no storage available, save skipped');
    bus.emit('ui:notify', { text: 'Save failed: storage unavailable', kind: 'danger' });
    return false;
  }
  try {
    const original = store.read(slot);
    if (options.current && !options.current()) return false;
    if (expectedOriginal !== undefined && expectedOriginal !== original) return false;
    if (original !== null) {
      const approved = approvedOriginals.get(store)?.get(slot);
      if (approved?.raw !== original) {
        bus.emit('ui:notify', { text: 'Save refused: the slot changed. Reopen the career before saving.', kind: 'danger' });
        return false;
      }
      // An upgraded/repaired state must never replace its only original bytes.
      if (approved.preserve) store.keepCorrupt(original, slot);
    }
    const payload = JSON.stringify(state);
    const facts = { saveVersion: state.version, club: String(state.clubName), season: state.season, week: state.week };
    const meta = nextMeta(store.storedMeta(slot), payload, facts, store.deviceId(), Date.now());
    if (options.current && !options.current()) return false;
    store.write(slot, payload, meta, options.parkedMatch, options.verifyPayload, options.current, expectedOriginal);
    approveOriginal(store, slot, payload, false);
  } catch (err) {
    console.warn('nrl-sim: save failed', err);
    bus.emit('ui:notify', { text: 'Save failed: storage full', kind: 'danger' });
    return false;
  }
  return true;
}

/**
 * Every slot with its meta (#360): what a cloud sync compares through
 * resolveSaveConflict. A save from before meta describes itself with its time
 * unknown. Never throws; empty with no storage.
 */
export function listSlotMeta(): SlotListing[] {
  const store = getStore();
  if (!store) return [];
  try {
    if (loadSlot(1).status === 'ok') store.migrateLegacy();
    return store.list();
  } catch (err) {
    console.warn('nrl-sim: could not list saves', err);
    return [];
  }
}

/** One slot's meta (null when empty). See listSlotMeta. */
export function getSlotMeta(slot: number): SaveMeta | null {
  return listSlotMeta().find((l) => l.slot === slot)?.meta ?? null;
}

/**
 * Write any queued save meta (and a new device id) now instead of after the current
 * task. Developer settings' career switch (#519) does this before it copies or
 * clears a career's keys, so no write queued before it lands after.
 */
export function flushSaveMeta(): void {
  getStore()?.flush();
}

/** Test hook: the same as flushSaveMeta. */
export function __flushSaveMeta(): void {
  flushSaveMeta();
}

/** The state save() last wrote to the active slot: any later one holds a change not saved yet. */
let lastSaved: GameState | null = null;

/**
 * Set while the page switches careers (Developer settings, #519): save() writes
 * nothing more on this page, so the reload's pagehide can't write one career's
 * state into the other's keys. A new page starts unlocked.
 */
let savesLocked = false;

/** Stop save() for the rest of this page (Developer settings' career switch, #519). */
export function lockSaves(): void {
  savesLocked = true;
}

/** Test hook: let save() write again. */
export function __unlockSaves(): void {
  savesLocked = false;
}

const PENDING_LEAGUE_SAVE = 'The completed week could not be saved. Retry saving or reload the last saved match.';
interface PendingLeagueSave extends IntervalCheckpoint {
  state: GameState;
  installation: number;
  saving: boolean;
  retireMatch: () => void;
}
let pendingLeagueSave: PendingLeagueSave | undefined;

function currentPendingSave(): PendingLeagueSave | undefined {
  if (pendingLeagueSave && pendingLeagueSave.installation !== stateInstallation()) pendingLeagueSave = undefined;
  return pendingLeagueSave;
}

function sameDestination(pending: IntervalCheckpoint): boolean {
  return activeSlot === pending.slot && careerNamespace() === pending.namespace;
}

export function pendingLeagueSaveProblem(): string | null {
  return currentPendingSave() ? PENDING_LEAGUE_SAVE : null;
}

/** The sidecar belongs to the saved kick-off until the exact settled snapshot
 * is durable. Retry that snapshot before advancing or saving a later edit. */
export function saveSettledLeagueMatch(state: GameState, checkpoint: IntervalCheckpoint, retireMatch: () => void): boolean {
  pendingLeagueSave = {state, source: checkpoint.source, slot: checkpoint.slot, namespace: checkpoint.namespace,
    installation: stateInstallation(), saving: false, retireMatch};
  return saveIfChanged(state);
}

export function retryPendingLeagueSave(): string | null {
  const pending = currentPendingSave();
  if (!pending) return null;
  return saveIfChanged(pending.state) && stateInstallation() === pending.installation ? null : PENDING_LEAGUE_SAVE;
}

/**
 * Save the game being played unless the active slot already holds exactly these
 * bytes, so a career with nothing new to save is not written at all (#519: going
 * to the playtest career leaves an unchanged career's keys untouched). False when
 * a save was needed and did not land.
 */
export function saveIfChanged(state: GameState, verifyPayload = false): boolean {
  if (weekHeld() || leagueIntervalSaveHeld() || failedIntervalProblem() || slotImported || savesLocked) return false;
  if (stateInstallation() && awaitingCampReplay(getState())) return false;
  const pending = currentPendingSave();
  if (pending) {
    if (pending.saving || !sameDestination(pending)) return false;
    pending.saving = true;
    try {
      if (!persistIfChanged(pending.state, true) || currentPendingSave() !== pending || !sameDestination(pending)) return false;
      lastSaved = pending.state;
      pendingLeagueSave = undefined;
      pending.retireMatch();
      if (pending.state === state) return true;
    } finally { pending.saving = false; }
  }
  return persistIfChanged(state, verifyPayload);
}

function persistIfChanged(state: GameState, verifyPayload = false): boolean {
  const store = getStore();
  if (!store) return false;
  try {
    const slot = activeSlot;
    const namespace = careerNamespace();
    const installation = stateInstallation();
    const source = installation ? getState() : undefined;
    const current = (): boolean => (!source || getState() === source) && activeSlot === slot && careerNamespace() === namespace
      && stateInstallation() === installation && getStore() === store;
    const original = store.read(slot);
    if (!current()) return false;
    if (original !== JSON.stringify(state) && !persistSlot(store, slot, state, original, {verifyPayload, current})) return false;
    if (!current()) return false;
    lastSaved = state;
    return true;
  } catch { return false; } // An unreadable or replaced slot cannot safely be used.
}

/**
 * Persist state to the active slot. Never throws: on QuotaExceededError or any
 * storage failure it emits a `ui:notify` danger and console.warns, leaving the
 * game playable in-memory. If no storage exists at all, it likewise warns.
 * Writes nothing while a week is held (QA finding 22): that state is half-ticked,
 * and the screens that save straight after a change (the Lineup, the squad's
 * focus, the fixture settings) are live while the rival round finishes. The
 * week's end saves their change with the rest. Nor after an import has replaced
 * the active slot: the page is on its way to the title screen to load it.
 */
export function save(state: GameState): void {
  if (weekHeld() || leagueIntervalSaveHeld() || failedIntervalProblem() || slotImported || savesLocked) return;
  if (stateInstallation() && awaitingCampReplay(getState())) return;
  if (currentPendingSave()) { saveIfChanged(state); return; }
  if (writeSlot(activeSlot, state)) lastSaved = state;
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; outcome: 'valid' | 'repaired'; state: GameState; repairs: SaveRepair[] }
  | { status: 'corrupt' | 'future'; outcome: 'unrecoverable' | 'unsupported'; message: string };

/** Read without changing the source, including legacy and future-version bytes. */
export function loadSlot(slot = activeSlot): LoadResult {
  return captureSlot(slot).result;
}

/** The status shown when replacing a club and the bytes authorized by that choice
 * come from one read. The writer compares them again after asynchronous setup. */
export function captureSlot(slot: number): { result: LoadResult; raw: string | null } {
  const store = getStore();
  try {
    if (!store) throw new Error('Storage unavailable');
    const raw = store.read(slot);
    return { raw, result: classifySlot(store, slot, raw) };
  } catch {
    return { raw: null, result: { status: 'corrupt', outcome: 'unrecoverable', message: 'Storage could not be read. Your career has been kept.' } };
  }
}

function recoveryCandidate(state: GameState, loading: boolean): GameState {
  if (state.competitions?.leagueCareer) return state;
  const paid = hasExecutableCupRewards(state) || state.competitionRewards.length > 0;
  if (paid && (!hasStructuralCalendar(state) || careerNamespace() !== DEV_TEST_PREFIX))
    throw Error('Executable competition rewards require an activated League cup or the isolated developer calendar.');
  const recovered = recoverUnfinishableCompetitions(state);
  if (paid) return reconcileMatchEffects(recovered);
  return loading ? reconcileMatchIncome(recovered) : recovered;
}

function classifySlot(store: LocalSaveStore, slot: number, raw: string | null): LoadResult {
  if (raw === null) return { status: 'empty' };
  const res = parseSave(raw);
  if (!res.ok) return { status: res.reason, outcome: res.outcome, message: res.message };
  if (res.state.competitions?.individualChallenges?.length) {
    const live = parseLiveMatch(store.storage.getItem(liveMatchKey(slot)));
    if (inconsistentChallengeReplay(res.state,live))
      return {status:'corrupt',outcome:'unrecoverable',message:CHALLENGE_REPLAY_PROBLEM};
  }
  if (!res.state.competitions?.leagueCareer && hasStructuralCalendar(res.state) && (careerNamespace() !== DEV_TEST_PREFIX || structuralPolicyProblem(res.state)))
    return { status: 'corrupt', outcome: 'unrecoverable', message: structuralPolicyProblem(res.state) ?? 'Competition prototypes require the isolated developer career.' };
  // An offered, qualified or entered competition can never finish on this calendar.
  // Close it here so a save that would freeze the week loads ready to advance.
  let state: GameState;
  try { state = recoveryCandidate(res.state,true); }
  catch (error) { return {status:'corrupt',outcome:'unrecoverable',message:error instanceof Error ? error.message : 'Invalid competition rewards.'}; }
  // A repaired state must not reach trusted memory until its exact source is
  // retained and verified by #522's preservation path. Persisting comes later.
  if (res.repairs.length) {
    try { store.keepCorrupt(raw, slot); }
    catch { return { status: 'corrupt', outcome: 'unrecoverable', message: 'Could not preserve the original. The repaired career was not loaded.' }; }
  }
  approveOriginal(store, slot, raw, res.repairs.length > 0 || JSON.parse(raw).version !== SAVE_VERSION);
  return { status: 'ok', outcome: res.outcome, state, repairs: res.repairs };
}

/** Compatibility wrapper. Rejected careers stay in place and cannot be autosaved over. */
export function load(): GameState | null {
  const result = loadSlot();
  if (result.status === 'ok') {
    if (result.repairs.length) bus.emit('ui:notify', { text: result.repairs[0]!.notification, kind: 'info' });
    return result.state;
  }
  if (result.status !== 'empty') {
    console.warn('nrl-sim: corrupt save, ignoring');
    bus.emit('ui:notify', { text: result.message, kind: 'danger' });
    if (result.status === 'corrupt') {
      try {
        const store = getStore();
        const raw = store?.read(activeSlot);
        if (store && raw !== null && raw !== undefined) store.keepCorrupt(raw, activeSlot);
      } catch { /* source remains untouched, including when backup fails */ }
    }
  }
  return null;
}

/** Raw recovery bypasses parsing, migration and validation entirely. */
export function exportOriginalSave(slot: number): string | null {
  return getStore()?.read(slot) ?? null;
}

/** Earlier originals retained when an older save was upgraded. Never migrates. */
export function exportRecoverySaves(slot: number): string[] {
  const store = getStore();
  if (!store) return [];
  const originals = store.recovery(slot);
  if (slot === 1) {
    // Older builds kept one shared forensic copy. Also expose a different legacy
    // career shadowed by slot 1, without moving or rewriting either source.
    const legacy = store.storage.getItem(LEGACY_SAVE_KEY);
    const own = store.storage.getItem(slotKey(1));
    for (const raw of [store.storage.getItem(CORRUPT_SAVE_KEY), own !== null && own !== legacy ? legacy : null]) {
      if (raw !== null && !originals.includes(raw)) originals.push(raw);
    }
  }
  return originals;
}

export function downloadOriginalSave(slot: number, recoveryIndex?: number): void {
  try {
    const raw = recoveryIndex === undefined ? exportOriginalSave(slot) : exportRecoverySaves(slot)[recoveryIndex] ?? null;
    if (raw === null || typeof document === 'undefined') return;
    deliverFile(`career-slot-${slot}-${recoveryIndex === undefined ? 'original' : `recovery-${recoveryIndex + 1}`}.json`, raw, { onShareFailed: shareFailed });
  } catch {
    bus.emit('ui:notify', { text: 'Could not read the original save. It has been kept; try again when storage is available.', kind: 'danger' });
  }
}

export interface ClassicRetirement {
  slot: number;
  /** The raw save bytes, archived when `emptied` is true and still in the slot otherwise. */
  raw: string;
  /** The slot no longer holds the career. False when the archive could not be kept. */
  emptied: boolean;
  /** Show the one-time message. False once that slot has already been told, or when nothing changed. */
  notify: boolean;
  /** The storage keys the retirement removed, for the iPhone mirror to confirm gone. */
  removed?: string[];
  /** The retired-save value as stored (it can hold more than `raw`), for the iPhone mirror to confirm. */
  stored?: string;
}

function retirementNoticeSeen(store: LocalSaveStore, slot: number): boolean {
  try { return store.storage.getItem(classicRetiredNoticeKey(slot)) === '1'; }
  catch { return false; }
}

/** A bundle of retired careers. One career is stored as itself, so an older archive still reads. */
const RETIRED_BUNDLE = 'nrl-retired-saves';

/** Every archived career in a retired-save value, oldest first. Never throws. */
export function decodeRetiredSaves(value: string | null): string[] {
  if (value === null) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      && (parsed as { kind?: unknown }).kind === RETIRED_BUNDLE
      && Array.isArray((parsed as { saves?: unknown }).saves)
      && (parsed as { saves: unknown[] }).saves.every((s) => typeof s === 'string')) {
      return (parsed as { saves: string[] }).saves;
    }
  } catch { /* a single raw career */ }
  return [value];
}

function encodeRetiredSaves(saves: readonly string[]): string | null {
  if (saves.length === 0) return null;
  if (saves.length === 1) return saves[0]!;
  return JSON.stringify({ kind: RETIRED_BUNDLE, saves });
}

/**
 * A stable id for one archived career: a 53-bit hash of its bytes and their length.
 * Settings deletes by this id, so a stale list can only ever delete the career it showed.
 */
export function retiredSaveId(raw: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}-${raw.length.toString(36)}`;
}

/**
 * Add `entries` to the slot's archive, merged by id. Call only inside the save critical
 * section: the latest bundle is read here, so a stale copy is never written back and a
 * career another tab archived stays. Returns the stored value, or null when it did not
 * read back holding every career it should.
 */
function mergeIntoArchive(storage: StorageLike, slot: number, entries: readonly string[]): string | null {
  const key = retiredSaveKey(slot);
  const current = storage.getItem(key);
  const kept = decodeRetiredSaves(current);
  const ids = new Set(kept.map(retiredSaveId));
  for (const entry of entries) {
    const id = retiredSaveId(entry);
    if (!ids.has(id)) { kept.push(entry); ids.add(id); }
  }
  const next = encodeRetiredSaves(kept);
  if (next === null) return null;
  if (current !== next) storage.setItem(key, next);
  const stored = storage.getItem(key);
  if (stored === null) return null;
  const have = new Set(decodeRetiredSaves(stored).map(retiredSaveId));
  return [...ids].every((id) => have.has(id)) ? stored : null;
}

/** What was archived for one slot, and the exact bytes each source key held then. */
interface StagedClassic {
  slot: number;
  raw: string;
  stored: string;
  /** The slot key's bytes (null when slot 1 read through to the legacy key). */
  own: string | null;
  /** For slot 1: the legacy key's bytes, whatever they are, as one part of the unit. */
  legacyRaw: string | null;
  /** The legacy bytes to delete: a Classic career archived here, or the slot's own bytes. */
  legacy: string | null;
  /** The live-match record kept beside the slot, archived inside the visible career. */
  match: string | null;
}

/** The visible Classic career, with its live-match record folded in the way Export does. */
function archiveEntry(raw: string, match: string | null): string {
  if (match === null) return raw;
  let live: unknown = match;
  try { live = JSON.parse(match) as unknown; } catch { /* keep the record's bytes as a string */ }
  try { return JSON.stringify({ ...(JSON.parse(raw) as Record<string, unknown>), [LIVE_MATCH_EXPORT_FIELD]: live }); }
  catch { return raw; }
}

/** The slot's keys as one unit: the career, slot 1's legacy key and the live-match checkpoint. */
function readUnit(store: LocalSaveStore, slot: number): { raw: string | null; own: string | null; legacyRaw: string | null; match: string | null } {
  return {
    raw: store.read(slot),
    own: store.storage.getItem(slotKey(slot)),
    legacyRaw: slot === 1 ? store.storage.getItem(LEGACY_SAVE_KEY) : null,
    match: store.storage.getItem(liveMatchKey(slot)),
  };
}

/**
 * Keep the raw Classic bytes under the retired-save key. Call inside the save critical
 * section. Every distinct Classic payload the slot holds is archived: for slot 1 that is
 * the slot key and a different Classic career under the shadowed legacy key. The
 * live-match record is archived inside the visible career, as Export keeps it. The archive
 * is merged by id with whatever is already there. The live slot stays until
 * `commitClassicRetirement`, so an iPhone mirror can finish the archive before the slot is
 * marked deleted. Null when the slot is not Classic.
 */
function stageClassicArchive(store: LocalSaveStore, slot: number): StagedClassic | ClassicRetirement | null {
  let unit: ReturnType<typeof readUnit>;
  try { unit = readUnit(store, slot); } catch { return null; }
  const { raw, own, legacyRaw, match } = unit;
  if (raw === null || !isClassicSave(raw)) return null;
  // A legacy career that is not Classic is not archived, and stays; the same bytes go with the slot.
  const legacy = legacyRaw !== null && (legacyRaw === own || isClassicSave(legacyRaw)) ? legacyRaw : null;
  const entries = [archiveEntry(raw, match)];
  if (legacy !== null && legacy !== raw) entries.push(legacy);
  let stored: string | null;
  try { stored = mergeIntoArchive(store.storage, slot, entries); }
  catch { stored = null; }
  if (stored === null) return { slot, raw, emptied: false, notify: true };
  return { slot, raw, stored, own, legacyRaw, legacy, match };
}

/**
 * Empty the slot once its archive is durable. Call inside the save critical section.
 * The career, the legacy key and the live-match checkpoint are one unit: all three are
 * re-read and must still hold exactly the staged bytes, or nothing is deleted
 * (`changed`), so a checkpoint whose career stays live is never removed.
 */
function commitClassicRetirement(store: LocalSaveStore, staged: StagedClassic): ClassicRetirement | 'changed' {
  const { slot, raw } = staged;
  let removed: string[] = [];
  try {
    const now = readUnit(store, slot);
    if (now.raw !== raw || now.own !== staged.own || now.legacyRaw !== staged.legacyRaw || now.match !== staged.match) return 'changed';
    removed = store.removeExact(slot, staged.own, staged.legacy);
    if (staged.match !== null) {
      store.storage.removeItem(liveMatchKey(slot));
      removed.push(liveMatchKey(slot));
    }
  } catch { /* the read below decides whether it actually went */ }
  let left: string | null;
  try { left = store.read(slot); }
  catch { return { slot, raw, emptied: false, notify: true }; }
  // Still the archived Classic bytes: the delete did not happen.
  if (left !== null && (left === raw || left === staged.legacy)) return { slot, raw, emptied: false, notify: true };
  return { slot, raw, emptied: true, notify: !retirementNoticeSeen(store, slot), removed, stored: staged.stored };
}

/** The unit changed under a retirement: a slot that is still Classic says so, anything else is left quietly. */
function retirementChanged(store: LocalSaveStore, slot: number, raw: string): ClassicRetirement {
  let now: string | null = null;
  try { now = store.read(slot); } catch { /* unreadable: say nothing changed hands */ }
  return { slot, raw, emptied: false, notify: now !== null && isClassicSave(now) };
}

/**
 * Move a Classic career out of `slot`, in one critical section: archive (merged by id,
 * read back), then empty the slot. A failed archive leaves the slot untouched. Another
 * tab in the section means nothing happens now; the next launch tries again. On iPhone
 * use `retireClassicSlotDurable`. A League career, a structural calendar and anything that
 * is not a Classic save are left alone. Never throws.
 */
export function retireClassicSlot(slot: number): ClassicRetirement | null {
  const store = getStore();
  if (!store) return null;
  try {
    return withSaveLease(store.storage, () => {
      const staged = stageClassicArchive(store, slot);
      if (!staged || 'emptied' in staged) return staged;
      const done = commitClassicRetirement(store, staged);
      return done === 'changed' ? retirementChanged(store, slot, staged.raw) : done;
    });
  } catch { return null; }
}

/**
 * Archive, wait until the iPhone mirror has the archive, then delete the live slot. The
 * archive and the delete are two critical sections with the native confirmation between
 * them, never inside one. If the career or its checkpoint changed during the wait, the
 * newest pair is archived and confirmed again (twice at most); otherwise both are left.
 * Off iPhone the confirm is immediate. Never throws.
 */
export async function retireClassicSlotDurable(slot: number): Promise<ClassicRetirement | null> {
  const store = getStore();
  if (!store) return null;
  let raw: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let staged: StagedClassic | ClassicRetirement | null;
    try { staged = await withSaveLock(store.storage, () => stageClassicArchive(store, slot)); }
    catch { return raw === null ? null : retirementChanged(store, slot, raw); }
    // On a retry the slot no longer holds a Classic career: something else was written there.
    if (!staged) return raw === null ? null : retirementChanged(store, slot, raw);
    if ('emptied' in staged) return staged;
    raw = staged.raw;
    let ack: 'confirmed' | 'inactive' | string = 'inactive';
    if (nativeCheckpointRequired()) {
      try { ack = await acknowledgeClassicArchive(staged.slot, staged.stored); }
      catch { ack = 'failed'; }
      if (ack !== 'confirmed' && ack !== 'inactive') return { slot, raw, emptied: false, notify: true };
    }
    const unit = staged;
    let done: ClassicRetirement | 'changed';
    try { done = await withSaveLock(store.storage, () => commitClassicRetirement(store, unit)); }
    catch { return { slot, raw, emptied: false, notify: true }; }
    if (done === 'changed') continue;
    if (done.emptied && ack === 'confirmed') {
      try { await acknowledgeClassicSlotGone(staged.slot, done.removed); } catch { /* the archive is already confirmed */ }
    }
    return done;
  }
  return retirementChanged(store, slot, raw!);
}

/** Retire every Classic slot. Slots that are not Classic are absent from the list. */
export function retireClassicSlots(): ClassicRetirement[] {
  const out: ClassicRetirement[] = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const retired = retireClassicSlot(slot);
    if (retired) out.push(retired);
  }
  return out;
}

/** The iPhone order: each archive is confirmed before that slot is deleted. */
export async function retireClassicSlotsDurable(): Promise<ClassicRetirement[]> {
  const out: ClassicRetirement[] = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const retired = await retireClassicSlotDurable(slot);
    if (retired) out.push(retired);
  }
  return out;
}

/** Every archived Classic career for `slot`, oldest first. Never throws. */
export function readRetiredSaves(slot: number): string[] {
  try { return decodeRetiredSaves(getStore()?.storage.getItem(retiredSaveKey(slot)) ?? null); }
  catch { return []; }
}

/** The oldest archived Classic save for `slot`, or null. Never throws. */
export function readRetiredSave(slot: number): string | null {
  return readRetiredSaves(slot)[0] ?? null;
}

/** Drop one archived career. The others stay. Never throws. */
export function deleteRetiredSave(slot: number, index: number): void {
  const store = getStore();
  if (!store) return;
  try {
    const key = retiredSaveKey(slot);
    const saves = decodeRetiredSaves(store.storage.getItem(key));
    if (index < 0 || index >= saves.length) return;
    saves.splice(index, 1);
    const next = encodeRetiredSaves(saves);
    if (next === null) store.storage.removeItem(key);
    else store.storage.setItem(key, next);
  } catch { /* the list can be tried again */ }
}

/** Remember that this slot's retirement message has been shown. Never throws. */
export function markClassicRetirementShown(slot: number): void {
  try { getStore()?.storage.setItem(classicRetiredNoticeKey(slot), '1'); }
  catch { /* the message can show once more; the archive is already kept */ }
}

/** Hand the player one archived Classic save, the same way Export original does. */
export function downloadRetiredSave(slot: number, index = 0): void {
  try {
    const raw = readRetiredSaves(slot)[index];
    if (raw === undefined || typeof document === 'undefined') return;
    const name = index === 0 ? `career-slot-${slot}-retired.json` : `career-slot-${slot}-retired-${index + 1}.json`;
    deliverFile(name, raw, { onShareFailed: shareFailed });
  } catch {
    bus.emit('ui:notify', { text: 'Could not read the archived save. It has been kept; try again when storage is available.', kind: 'danger' });
  }
}

/** Delete a slot (leaves CORRUPT_KEY intact) and the live-match record beside it. */
export function deleteSlot(slot: number): void {
  const store = getStore();
  if (store) {
    store.remove(slot);
    // The record lives in localStorage next to the slot. Drop it there, and on the
    // injected store too when a test is not using the real localStorage.
    store.removeLiveMatch(slot);
  }
  clearLiveMatch(slot);
}

/** Remove the active slot's save. */
export function clearSave(): void {
  deleteSlot(activeSlot);
}

/** Presence check for the active slot (or `slot`). A corrupt save still reads as
 *  present here; load() is where corruption is handled. */
export function hasSave(slot: number = activeSlot): boolean {
  const store = getStore();
  if (!store) return false;
  try {
    if (loadSlot(1).status === 'ok') store.migrateLegacy();
    return store.read(slot) !== null;
  } catch { return true; } // unreadable is occupied, never a fresh developer career
}

// ── Export / import ──────────────────────────────────────────────────────────

/**
 * The snapshot Export may write while a week is held: the state save() last
 * landed, when it is this week. Null when nothing has landed, or the last
 * landing was another week (the week-start write failed, so the object still
 * in memory is not this kick-off).
 */
function heldWeekSnapshot(): GameState | null {
  if (!weekHeld() || !lastSaved) return null;
  const now = getState();
  if (lastSaved.season !== now.season || lastSaved.week !== now.week || currentRound(lastSaved) !== currentRound(now)) return null;
  if (hasStructuralCalendar(now)) {
    if (!hasStructuralCalendar(lastSaved)) return null;
    // The player's game can be complete while the grouped rival hold is pending.
    // Compare slot identity independently of played status, never half-ticked state.
    const identities = (s: GameState): Fixture[] => s.competitions!.instances.filter(i => i.season === s.season)
      .flatMap(instance => instance.fixtures.filter(f => f.slot === s.week && (f.homeId === s.clubId || f.awayId === s.clubId))
        .map(fixture => fixtureBridge({ instance, fixture })));
    const before = identities(lastSaved);
    const current = identities(now);
    if (before.length !== current.length || before.some((f, index) => !sameFixtureIdentity(f, current[index]!))) return null;
  }
  return lastSaved;
}

/**
 * Serialise a state to the export file format (plain state JSON).
 * A held week is half-ticked in memory (training, wages and the match seed
 * already applied) and must not be the file: the file is the week-start save,
 * plus the live-match record so an import resumes that match instead of
 * replaying the week on top of itself. With no snapshot for this week the
 * caller (downloadSave) refuses; this falls back to `state` only then.
 */
export function exportSave(state: GameState): string {
  return saveExport(state).text;
}

interface SaveExport { text: string; state: GameState; notice?: string }

function saveExport(state: GameState): SaveExport {
  const checkpoint = currentPendingSave() ?? failedIntervalCheckpoint() ?? activePaidCupCheckpoint();
  if (checkpoint) return recoveryExport(checkpoint);
  if (awaitingCampReplay(state)) return recoveryExport({source:state,slot:getActiveSlot(),namespace:careerNamespace()});
  const snap = heldWeekSnapshot();
  const live = snap ? readLiveMatch() : null;
  const payload = live ? { ...snap, [LIVE_MATCH_EXPORT_FIELD]: live } : (snap ?? state);
  return {text: JSON.stringify(payload, null, 2), state: snap ?? state, ...(snap ? {notice: EXPORT_HELD_TEXT} : {})};
}

/** Export only a checkpoint belonging to this interval and its saved match.
 * The actual replay rechecks its computed seed and engine compatibility. */
function recoveryExport(checkpoint: IntervalCheckpoint): SaveExport {
  if (!sameDestination(checkpoint)) throw new Error('The recovery slot changed.');
  const store = getStore();
  const original = store?.read(checkpoint.slot);
  if (!store || original == null) throw new Error('The saved interval is unavailable.');
  const saved: GameState = JSON.parse(original);
  if (JSON.stringify(saved) !== JSON.stringify(checkpoint.source)) throw new Error('The saved interval changed.');
  const rawMatch = store.storage.getItem(liveMatchKey(checkpoint.slot));
  if (rawMatch === null) return {text: original, state: saved, notice: 'Exported the saved checkpoint from the start of the week.'};
  const live: unknown = JSON.parse(rawMatch);
  // The kickoff hook may have drawn a due round from the checkpoint's previous
  // scores. Recreate its fixture identities without changing the exported bytes.
  const kickoff = checkpoint.namespace === DEV_TEST_PREFIX && !saved.competitions?.leagueCareer && hasExecutableCupRewards(saved)
    ? prepareOpenCup(prepareDivisionFinals(saved)) : saved;
  if (!isLiveMatchRecord(live) || live.season !== saved.season || live.week !== saved.week ||
    !currentCalendarFixtures(kickoff).some(({instance, fixture}) =>
      live.competitionId === instance.id && live.fixtureId === fixture.id && live.slot === fixture.slot &&
      live.round === fixture.round && live.homeId === fixture.homeId && live.awayId === fixture.awayId &&
      (fixture.homeId === saved.clubId || fixture.awayId === saved.clubId)))
    throw new Error('The saved match does not belong to this checkpoint.');
  return {text: JSON.stringify({...saved, [LIVE_MATCH_EXPORT_FIELD]: live}, null, 2), state: saved,
    notice: 'Exported the saved checkpoint from the start of the week with its parked match.'};
}

export type ImportResult = MigrateResult | { ok: false; message: string };

/** Validate + migrate imported text. Never throws, never touches storage. */
export function importSave(text: string): MigrateResult {
  return parseSave(text);
}

// ── Names file (#398) ───────────────────────────────────────────────────────
// Every player's and club's name in a career, as a small JSON file the player
// keeps and applies to another save of the same career (ids match). Local only:
// the game never ships one. It is not a save: nothing else in the state is in it.

/** The names file: player id → name, club id → name and kit colours. */
export interface NamesFile {
  players: Record<string, string>;
  clubs: Record<string, { name: string; colors: [string, string] }>;
}

/** Every name in the career as a names file. Pure. */
export function namesFile(state: GameState): NamesFile {
  const players: Record<string, string> = {};
  for (const p of allPlayers(state)) players[p.id] = p.name;
  const clubs: NamesFile['clubs'] = {};
  for (const c of state.league.clubs) {
    clubs[c.id] = { name: c.id === state.clubId ? state.clubName : c.name, colors: [c.colors[0], c.colors[1]] };
  }
  return { players, clubs };
}

/** Serialise the career's names to the names file's text. */
export function exportNames(state: GameState): string {
  return JSON.stringify(namesFile(state), null, 2);
}

export type NamesImportResult =
  | { ok: true; patch: Partial<GameState> | null; players: number; clubs: number }
  | { ok: false; message: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Read a names file against `state`: the patch that applies it, and how many
 * players and clubs it renames. All or nothing: a file that isn't a names file,
 * a name that breaks the rename rule or colours that don't read apart refuse the
 * whole file. Ids from another career are skipped unread; a file with none of this
 * career's ids is refused. A name already in the save passes as it is (a club
 * named before the rule, up to 32 characters). Your own club's colours stay.
 * Pure: never throws, never touches state or storage.
 */
export function importNames(state: GameState, text: string): NamesImportResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, message: 'this is not a names file.' }; }
  if (!isRecord(raw) || !isRecord(raw.players) || !isRecord(raw.clubs)) return { ok: false, message: 'this is not a names file.' };

  const current = new Map(allPlayers(state).map((p) => [p.id, p.name]));
  const players = new Map<string, string>();
  for (const [id, value] of Object.entries(raw.players)) {
    if (typeof value !== 'string') return { ok: false, message: `player ${id} has no name.` };
    if (!current.has(id) || value === current.get(id)) continue;
    const check = cleanName(value);
    if (!check.ok) return { ok: false, message: `"${value.slice(0, 32)}": ${check.why.toLowerCase()}.` };
    players.set(id, check.name);
  }

  const known = new Map(state.league.clubs.map((c) => [c.id, c]));
  const clubs = new Map<string, ClubEdit>();
  let matched = Object.keys(raw.players).filter((id) => current.has(id)).length;
  for (const [id, value] of Object.entries(raw.clubs)) {
    if (!isRecord(value) || typeof value.name !== 'string') return { ok: false, message: `club ${id} has no name.` };
    const club = known.get(id);
    if (!club) continue; // another career's club: skipped, whatever it holds
    if (value.colors !== undefined && !validClubColors(value.colors)) return { ok: false, message: `${value.name.slice(0, 32)}'s colours don't read apart.` };
    matched++;
    const own = id === state.clubId;
    const name = value.name === (own ? state.clubName : club.name) ? null : cleanName(value.name);
    if (name && !name.ok) return { ok: false, message: `"${value.name.slice(0, 32)}": ${name.why.toLowerCase()}.` };
    const colors = !own && value.colors !== undefined ? value.colors as [string, string] : null;
    const recolour = colors !== null && (colors[0] !== club.colors[0] || colors[1] !== club.colors[1]);
    if (!name && !recolour) continue;
    clubs.set(id, { name: name ? name.name : club.name, ...(colors ? { colors } : {}) });
  }
  if (matched === 0) return { ok: false, message: 'none of these names belong to this career.' };

  const playerPatch = renamePlayersPatch(state, players);
  const clubPatch = renameClubsPatch(playerPatch ? { ...state, ...playerPatch } : state, clubs);
  const patch = playerPatch || clubPatch ? { ...playerPatch, ...clubPatch } : null;
  return { ok: true, patch, players: players.size, clubs: clubs.size };
}

/** The names file's suggested filename. */
export function exportNamesFilename(state: GameState): string {
  return exportFilename(state).replace(/\.json$/, '-names.json');
}

/**
 * Suggested filename for an exported save, led by the brand's slug (#363). Import
 * reads the file's content, never its name, so a file from before a rename still loads.
 */
export function exportFilename(state: GameState): string {
  const club = String(state.clubName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${BRAND.exportSlug}-${club || 'save'}-s${state.season}w${state.week}.json`;
}

/** What Export says when the week is held and no week-start save landed. */
export const EXPORT_HELD_FAILED_TEXT = "Couldn't export: this week is mid-match and its save didn't land.";

/** What Export says when the file is the kick-off save plus the parked match. */
export const EXPORT_HELD_TEXT = 'Exported the save from the start of this week, with the match to resume. A change made since kick-off is kept if you finish the match.';

/** What an export says when the iOS share sheet would not open (storage/native.ts). */
export const SHARE_FAILED_TEXT = "Couldn't open the share sheet to export. Your save is unchanged; try again.";
const shareFailed = (): void => bus.emit('ui:notify', { text: SHARE_FAILED_TEXT, kind: 'danger' });

/** Browser: download the state as a JSON file (the iOS app: the share sheet). No-op outside a browser. */
export function downloadSave(state: GameState): void {
  if (weekHeld() && !activePaidCupCheckpoint() && !heldWeekSnapshot()) {
    bus.emit('ui:notify', { text: EXPORT_HELD_FAILED_TEXT, kind: 'danger' });
    return;
  }
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  let file: SaveExport;
  try { file = saveExport(state); }
  catch (error) {
    if (!failedIntervalProblem() && !pendingLeagueSaveProblem() && !activePaidCupCheckpoint()) throw error;
    bus.emit('ui:notify', {text: 'Could not verify the saved week and its match for export. The recovery data has been kept.', kind: 'danger'});
    return;
  }
  const notice = file.notice;
  deliverFile(exportFilename(file.state), file.text, {
    onShareFailed: shareFailed,
    ...(notice ? { onDelivered: () => bus.emit('ui:notify', { text: notice, kind: 'info' }) } : {}),
  });
}

/** Browser: open a file picker and resolve with the chosen file's text (null if
 *  cancelled or unreadable). */
export function pickSaveFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      file.text().then(resolve, () => resolve(null));
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Browser: download the career's names file (#398). No-op outside a browser. */
export function downloadNames(state: GameState): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  deliverFile(exportNamesFilename(state), exportNames(state), {
    onShareFailed: shareFailed,
    onDelivered: () => bus.emit('ui:notify', { text: 'Names exported.', kind: 'success' }),
  });
}

/**
 * Apply a names file's text to the game being played and save it. Notifies
 * either way (the news keeps it), and returns what it said so an open dialog
 * can say it too; a refused file changes nothing.
 */
export function applyNamesFile(text: string): { ok: boolean; text: string } {
  if (awaitingCampReplay(getState())) return {ok:false,text:'Resume the saved match before changing names.'};
  const res = importNames(getState(), text);
  const say = (ok: boolean, msg: string, kind: 'success' | 'info' | 'danger'): { ok: boolean; text: string } => {
    bus.emit('ui:notify', { text: msg, kind });
    return { ok, text: msg };
  };
  if (!res.ok) return say(false, `Names not imported: ${res.message}`, 'danger');
  if (!res.patch) return say(true, 'Every name already matches this file.', 'info');
  setState(res.patch);
  save(getState());
  const n = (v: number, one: string): string => `${v} ${one}${v === 1 ? '' : 's'}`;
  return say(true, `Names imported: ${n(res.players, 'player')}, ${n(res.clubs, 'club')}.`, 'success');
}

/**
 * Validate imported text, write it to `slot`, and replace that slot's live-match
 * record with the one in the file (or clear a stale one). No toast. An empty
 * message means the write itself failed and already notified.
 */
export function installImportedSave(text: string, slot: number): ImportResult {
  // Record shape is validated here; absent/malformed engine identities remain
  // eligible for matchday's week-start restart after the career is installed.
  const peeled = peelLiveMatchExport(text);
  if (peeled.bad) return { ok: false, message: 'the match in this file could not be read.' };
  if (isClassicSave(peeled.text)) return { ok: false, message: CLASSIC_RETIRED_TEXT };
  const res = importSave(peeled.text);
  if (!res.ok) return res;
  if (inconsistentChallengeReplay(res.state,peeled.live)) return {ok:false,message:CHALLENGE_REPLAY_PROBLEM};
  if (!res.state.competitions?.leagueCareer && hasStructuralCalendar(res.state) && careerNamespace() !== DEV_TEST_PREFIX) return { ok: false, message: 'Competition prototypes can only be imported into the isolated developer career.' };
  if (hasStructuralCalendar(res.state)) {
    const policy = structuralPolicyProblem(res.state);
    if (policy) return { ok: false, message: policy };
  }
  let recovered: GameState;
  try { recovered = recoveryCandidate(res.state,false); }
  catch (error) { return {ok:false,message:error instanceof Error ? error.message : 'Invalid competition rewards.'}; }
  const installed = recovered === res.state ? res : { ...res, state: recovered };
  const store = getStore(), installation = stateInstallation(), namespace = careerNamespace(), sourceSlot = activeSlot;
  const source = installation ? getState() : undefined;
  const current = () => getStore() === store && stateInstallation() === installation && careerNamespace() === namespace
    && activeSlot === sourceSlot && (!source || getState() === source);
  const {result: destinationStatus, raw: expectedOriginal} = captureSlot(slot);
  if (destinationStatus.status !== 'empty' && destinationStatus.status !== 'ok') return { ok: false, message: 'Destination needs recovery before replacement.' };
  if (!current()) return { ok: false, message: 'The career changed during import.' };
  // Repaired/historical imports retain both the exact incoming file (including
  // its match envelope) and the occupied destination before any installation.
  if (res.repairs.length || JSON.parse(peeled.text).version !== SAVE_VERSION) {
    try {
      const store = getStore();
      if (!store || savesLocked) throw new Error('Storage unavailable');
      const destination = store.read(slot);
      if (destination !== null && !parseSave(destination).ok) return { ok: false, message: 'Destination needs recovery before replacement.' };
      store.keepCorrupt(text, slot);
      if (destination !== null) store.keepCorrupt(destination, slot);
    } catch { return { ok: false, message: 'Could not preserve originals. Import was not installed.' }; }
  }
  const verify = !!installed.state.competitions?.leagueCareer || hasExecutableCupRewards(installed.state) || installed.state.competitionRewards.length > 0;
  if (verify) {
    const options = {verifyPayload: true, current, parkedMatch: peeled.live ? JSON.stringify(peeled.live) : null};
    if (!persistSlot(store,slot,installed.state,expectedOriginal,options))
      return {ok: false, message: 'Could not save the career and its match. Check storage and retry the import.'};
    return installed;
  }
  if (!writeSlot(slot, installed.state, expectedOriginal)) return { ok: false, message: '' };
  if (peeled.live) {
    if (!writeLiveMatch(peeled.live, slot)) clearLiveMatch(slot);
  } else {
    clearLiveMatch(slot);
  }
  return installed;
}

/**
 * Validate imported text and write it to `slot`. Notifies the player either way.
 * Returns the imported state on success, else null (storage left unchanged when
 * the file itself is refused).
 */
export function importIntoSlot(text: string, slot: number): GameState | null {
  const res = installImportedSave(text, slot);
  if (!res.ok) {
    if (res.message) bus.emit('ui:notify', { text: res.message === CLASSIC_RETIRED_TEXT ? CLASSIC_RETIRED_TEXT : `Import failed: ${res.message}`, kind: 'danger' });
    return null;
  }
  // The import now owns the active slot: this page's game must not save over it on
  // the way to the title screen (Settings → Import save reloads; #295's checker).
  if (slot === activeSlot) slotImported = true;
  bus.emit('ui:notify', { text: res.repairs.length ? res.repairs[0]!.notification : `Save imported into slot ${slot}`, kind: 'success' });
  return res.state;
}

// ── Autosave ────────────────────────────────────────────────────────────────

/** The page events enableAutosave listens on; tests pass stand-ins (Node has neither). */
interface PageEvents {
  doc?: { visibilityState?: string; addEventListener(type: string, fn: () => void): void; removeEventListener(type: string, fn: () => void): void };
  win?: { addEventListener(type: string, fn: () => void): void; removeEventListener(type: string, fn: () => void): void };
}

const WEEK_START_HOOK = 'autosave-week-start';

/**
 * Subscribe to 'week:advanced' and persist the settled post-tick state (the §5
 * pipeline emits this at step 8, after the step-7 autosave hook, so the state is
 * fully settled). Also persist when the page is hidden or unloaded (QA finding 21):
 * a change made between weeks (a hire, a build, a signing, the kit) was kept only
 * until the next week's save, so a phone that dropped the tab lost it. Never while
 * a week is held, nor after an import has replaced the active slot (save() writes
 * nothing then; a held week's next load replays it from its start), so a change
 * not yet saved is also saved as each week starts. Returns the unsubscribe
 * closure for teardown/tests.
 */
export function enableAutosave(page: PageEvents = {
  ...(typeof document !== 'undefined' ? { doc: document } : {}),
  ...(typeof window !== 'undefined' ? { win: window } : {}),
}): () => void {
  slotImported = false;
  const persist = (): void => save(getState());
  const offWeek = bus.on('week:advanced', persist);
  // A held week (the live match, the rival round) is never written, so a change made since the
  // last save is saved as the next week starts, before its first hook: a tab that dies mid-match
  // comes back at the week's start with the change, and the live-match record still matches it.
  registerTickHook(WEEK_START_HOOK, TICK_ORDER.weekStart, () => { if (getState() !== lastSaved) persist(); }, { trials: true });
  const onVisibility = (): void => { if (page.doc?.visibilityState === 'hidden') persist(); };
  page.doc?.addEventListener('visibilitychange', onVisibility);
  page.win?.addEventListener('pagehide', persist);
  return () => {
    offWeek();
    unregisterTickHook(WEEK_START_HOOK);
    page.doc?.removeEventListener('visibilitychange', onVisibility);
    page.win?.removeEventListener('pagehide', persist);
  };
}
