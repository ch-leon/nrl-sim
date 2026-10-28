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

import type { GameState } from './state';
import { emptyFinance, getState, SAVE_VERSION, setState } from './state';
import { fromLegacy, isTraitId, type TraitInstance } from '../data/traits';
import { withRivalSquads } from '../systems/rivals';
import { autoPick } from '../systems/lineup';
import { DEFAULT_TACTICS } from '../match/league/presets';
import { bus } from './events';
import { registerTickHook, TICK_ORDER, unregisterTickHook, weekHeld } from './time';
import { clearLiveMatch, LIVE_MATCH_EXPORT_FIELD, peelLiveMatchExport, readLiveMatch, writeLiveMatch } from '../systems/liveMatchRecord';
import { CORRUPT_SAVE_KEY, LEGACY_SAVE_KEY } from './storageKeys';
import { BRAND } from '../brand';
import { cleanName } from '../data/names';
import { allPlayers, renameClubsPatch, renamePlayersPatch, validClubColors, type ClubEdit } from '../systems/rename';
import { browserStorage, LocalSaveStore, type StorageLike } from './storage/local';
import { nextMeta } from './storage/meta';
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

/** Test hook: inject a fake storage (pass null to clear and fall back to real). */
export function __setStorage(s: StorageLike | null): void {
  injectedStorage = s;
  slotImported = false; // a fresh storage is a fresh page
}

/**
 * The store over the active storage: injected fake first, else the real
 * `localStorage` if the environment provides it, else null (in-memory-only, no
 * persistence). One store per storage, so its queued meta and device id persist.
 */
function getStore(): LocalSaveStore | null {
  const storage = injectedStorage ?? browserStorage();
  if (!storage) return null;
  if (activeStore?.storage !== storage) activeStore = new LocalSaveStore(storage, SLOT_COUNT);
  return activeStore;
}

// ── Migration ────────────────────────────────────────────────────────────────
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
  // v19 → v20: settings.playbackSpeed, the match speed last picked. Absent plays at ×4,
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
];

/** Old string traits → instances; instances already in the new shape pass through. */
function migrateTraits(traits: unknown): TraitInstance[] {
  if (!Array.isArray(traits)) return [];
  const legacy = traits.filter((t): t is string => typeof t === 'string');
  const kept = traits.filter((t): t is TraitInstance => !!t && typeof t === 'object' && isTraitId(String((t as TraitInstance).id)));
  return [...kept.map((t) => ({ id: t.id, level: ([1, 2, 3] as const).includes(t.level) ? t.level : 1 })), ...fromLegacy(legacy)];
}

export type MigrateResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'corrupt' | 'future'; message: string };

/** The required top-level keys every valid save must carry (BAK-174 spec). */
const REQUIRED_KEYS = [
  'clubId', 'clubName', 'money', 'week', 'season', 'squad', 'facilities', 'league',
] as const;

/**
 * Upgrade a parsed save to the current version, one step at a time, then
 * validate its structure. Pure: never mutates `raw`, never touches storage.
 * Future-version saves are refused with a clear message (reason 'future').
 */
export function migrateState(raw: unknown): MigrateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'corrupt', message: 'Not a valid save file.' };
  }
  let cur = raw as RawState;
  const declared = cur.version;
  if (typeof declared !== 'number' || !Number.isInteger(declared) || declared < 1) {
    return { ok: false, reason: 'corrupt', message: 'Save has no valid version.' };
  }
  let version: number = declared;
  if (version > SAVE_VERSION) {
    return {
      ok: false,
      reason: 'future',
      message: `This save is from a newer version of ${BRAND.name} (save v${version}, this game supports v${SAVE_VERSION}). Update the game to load it.`,
    };
  }
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) {
      return { ok: false, reason: 'corrupt', message: `No migration from save v${version}.` };
    }
    cur = { ...step.run(cur), version: step.to };
    version = step.to;
  }
  if (!isValidShape(cur)) {
    return { ok: false, reason: 'corrupt', message: 'Save is missing required data.' };
  }
  return { ok: true, state: cur as unknown as GameState };
}

/** Structural validation: all required keys present with squad/facilities arrays
 *  and league an object. */
function isValidShape(obj: RawState): boolean {
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) return false;
  }
  if (!Array.isArray(obj.squad)) return false;
  if (!Array.isArray(obj.facilities)) return false;
  if (obj.league === null || typeof obj.league !== 'object') return false;
  return true;
}

/** Parse + migrate JSON text (shared by load and import). Never throws. */
function parseSave(text: string): MigrateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'corrupt', message: 'File is not valid JSON.' };
  }
  return migrateState(parsed);
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
  /** Human-readable reason for 'future' / 'corrupt'. */
  message?: string;
}

/** Describe every slot for the title screen. Read-only (never marks corrupt). */
export function getSlotSummaries(): SlotSummary[] {
  const store = getStore();
  const out: SlotSummary[] = [];
  store?.migrateLegacy();
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const raw = store ? store.read(slot) : null;
    if (raw === null) {
      out.push({ slot, status: 'empty' });
      continue;
    }
    const res = parseSave(raw);
    if (res.ok) {
      out.push({
        slot, status: 'ok',
        clubName: String(res.state.clubName), season: res.state.season, week: res.state.week,
      });
    } else {
      out.push({ slot, status: res.reason, message: res.message });
    }
  }
  return out;
}

// ── save / load / clear ──────────────────────────────────────────────────────

/** Write `state` to `slot`. Returns false (after warning + ui:notify) on failure. */
export function writeSlot(slot: number, state: GameState): boolean {
  const store = getStore();
  if (!store) {
    console.warn('nrl-sim: no storage available, save skipped');
    bus.emit('ui:notify', { text: 'Save failed: storage unavailable', kind: 'danger' });
    return false;
  }
  try {
    const payload = JSON.stringify(state);
    const facts = { saveVersion: state.version, club: String(state.clubName), season: state.season, week: state.week };
    store.write(slot, payload, nextMeta(store.storedMeta(slot), payload, facts, store.deviceId(), Date.now()));
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
    store.migrateLegacy();
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

/** Test hook: write any queued save meta now instead of after the current task. */
export function __flushSaveMeta(): void {
  getStore()?.flush();
}

/** The state save() last wrote to the active slot: any later one holds a change not saved yet. */
let lastSaved: GameState | null = null;

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
  if (weekHeld() || slotImported) return;
  getStore()?.migrateLegacy();
  if (writeSlot(activeSlot, state)) lastSaved = state;
}

/**
 * Load the active slot: parse → migrateState → validate. Returns the GameState,
 * or null when absent/unusable. Never throws.
 *  - corrupt (unparseable, bad version, missing keys): warn, copy raw payload to
 *    CORRUPT_KEY for forensics, remove the slot, return null.
 *  - from a newer game version: notify with a clear message, leave the save
 *    untouched, return null.
 */
export function load(): GameState | null {
  const store = getStore();
  if (!store) return null;
  store.migrateLegacy();

  const raw = store.read(activeSlot);
  if (raw === null) return null;

  const res = parseSave(raw);
  if (res.ok) return res.state;
  if (res.reason === 'future') {
    console.warn(`nrl-sim: ${res.message}`);
    bus.emit('ui:notify', { text: res.message, kind: 'danger' });
    return null;
  }
  return markCorrupt(store, raw);
}

/** Shared corrupt path: preserve raw under CORRUPT_KEY, drop the slot, warn. */
function markCorrupt(store: LocalSaveStore, raw: string): null {
  console.warn('nrl-sim: corrupt save, ignoring');
  try {
    store.keepCorrupt(raw);
  } catch (err) {
    // Preserving forensics is best-effort; never let it block recovery.
    console.warn('nrl-sim: could not preserve corrupt save', err);
  }
  store.remove(activeSlot);
  return null;
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
  store.migrateLegacy();
  return store.read(slot) !== null;
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
  if (lastSaved.season !== now.season || lastSaved.week !== now.week) return null;
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
  const snap = heldWeekSnapshot();
  const live = snap ? readLiveMatch() : null;
  const payload = live ? { ...snap, [LIVE_MATCH_EXPORT_FIELD]: live } : (snap ?? state);
  return JSON.stringify(payload, null, 2);
}

export type ImportResult =
  | { ok: true; state: GameState }
  | { ok: false; message: string };

/** Validate + migrate imported text. Never throws, never touches storage. */
export function importSave(text: string): ImportResult {
  const res = parseSave(text);
  return res.ok ? res : { ok: false, message: res.message };
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
 * whole file. Ids from another career are skipped; a file with none of this
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
    if (value.colors !== undefined && !validClubColors(value.colors)) return { ok: false, message: `${value.name.slice(0, 32)}'s colours don't read apart.` };
    const club = known.get(id);
    if (!club) continue;
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

/** Browser: download the state as a JSON file. No-op outside a browser. */
export function downloadSave(state: GameState): void {
  if (weekHeld() && !heldWeekSnapshot()) {
    bus.emit('ui:notify', { text: EXPORT_HELD_FAILED_TEXT, kind: 'danger' });
    return;
  }
  const held = weekHeld();
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const url = URL.createObjectURL(new Blob([exportSave(state)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (held) bus.emit('ui:notify', { text: EXPORT_HELD_TEXT, kind: 'info' });
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
  const url = URL.createObjectURL(new Blob([exportNames(state)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportNamesFilename(state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  bus.emit('ui:notify', { text: 'Names exported.', kind: 'success' });
}

/**
 * Apply a names file's text to the game being played and save it. Notifies
 * either way (the news keeps it), and returns what it said so an open dialog
 * can say it too; a refused file changes nothing.
 */
export function applyNamesFile(text: string): { ok: boolean; text: string } {
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
  const peeled = peelLiveMatchExport(text);
  if (peeled.bad) return { ok: false, message: 'the match in this file could not be read.' };
  const res = importSave(peeled.text);
  if (!res.ok) return res;
  if (!writeSlot(slot, res.state)) return { ok: false, message: '' };
  if (peeled.live) {
    if (!writeLiveMatch(peeled.live, slot)) clearLiveMatch(slot);
  } else {
    clearLiveMatch(slot);
  }
  return res;
}

/**
 * Validate imported text and write it to `slot`. Notifies the player either way.
 * Returns the imported state on success, else null (storage left unchanged when
 * the file itself is refused).
 */
export function importIntoSlot(text: string, slot: number): GameState | null {
  const res = installImportedSave(text, slot);
  if (!res.ok) {
    if (res.message) bus.emit('ui:notify', { text: `Import failed: ${res.message}`, kind: 'danger' });
    return null;
  }
  // The import now owns the active slot: this page's game must not save over it on
  // the way to the title screen (Settings → Import save reloads; #295's checker).
  if (slot === activeSlot) slotImported = true;
  bus.emit('ui:notify', { text: `Save imported into slot ${slot}`, kind: 'success' });
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
  registerTickHook(WEEK_START_HOOK, TICK_ORDER.weekStart, () => { if (getState() !== lastSaved) persist(); });
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
