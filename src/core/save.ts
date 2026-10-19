// src/core/save.ts — localStorage persistence, migration, slots + title flow
// (BAK-174, WU-4; migration/export/import/slots: GitHub #34).
//
// Serialises the whole GameState (plain JSON per ARCHITECTURE §1.2) to one of
// three localStorage slots, loads & migrates & validates on boot, falls back to
// null when absent, and degrades gracefully on corrupt saves or storage errors.
// Also provides the autosave subscriber (on 'week:advanced') and a minimal DOM
// title flow.
//
// No Phaser. Pure TS + optional DOM. localStorage is accessed through an
// injectable abstraction so Node-env unit tests can pass a Map-backed fake.

import type { GameState } from './state';
import { getState, SAVE_VERSION } from './state';
import { fromLegacy, isTraitId, type TraitInstance } from '../data/traits';
import { withRivalSquads } from '../systems/rivals';
import { bus } from './events';
import {
  DEFAULT_DIFFICULTY, DEFAULT_PLAYER_COLORS, DIFFICULTIES, PLAYER_PRIMARY_COLORS,
  PLAYER_SECONDARY_COLORS, isValidColorPair, type Difficulty,
} from '../config';

/** Legacy single-save key (pre-slots). Kept until its data is safely in slot 1. */
export const SAVE_KEY = 'nrl-sim-save-v1';
export const CORRUPT_KEY = 'nrl-sim-save-corrupt';
export const SLOT_COUNT = 3;
const SLOT_PREFIX = 'nrl-sim-save-slot-';

export function slotKey(slot: number): string {
  return `${SLOT_PREFIX}${slot}`;
}

// ── Storage abstraction ─────────────────────────────────────────────────────
//
// Only the subset of the Web Storage API we use. Tests inject a Map-backed fake
// via __setStorage; production resolves the real `localStorage` when present
// (guarded for privacy mode / SSR / Node where it is undefined).

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let injectedStorage: StorageLike | null = null;

/** Test hook: inject a fake storage (pass null to clear and fall back to real). */
export function __setStorage(s: StorageLike | null): void {
  injectedStorage = s;
}

/**
 * Resolve the active storage: injected fake first, else the real `localStorage`
 * if the environment provides it, else null (in-memory-only, no persistence).
 */
function getStorage(): StorageLike | null {
  if (injectedStorage) return injectedStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
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
      message: `This save is from a newer version of NRL Sim (save v${version}, this game supports v${SAVE_VERSION}). Update the game to load it.`,
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

/** Raw payload for a slot. Slot 1 falls back to the legacy single-save key, so a
 *  pre-slots save is always visible even if copying it into slot 1 failed. */
function readSlotRaw(storage: StorageLike, slot: number): string | null {
  const own = storage.getItem(slotKey(slot));
  if (own !== null) return own;
  return slot === 1 ? storage.getItem(SAVE_KEY) : null;
}

/**
 * Migrate the legacy single save into slot 1. The legacy key is removed only
 * after the slot write succeeded and reads back identically — a failed or
 * partial write leaves the legacy save untouched. Never overwrites slot 1.
 */
function migrateLegacySave(storage: StorageLike): void {
  try {
    const legacy = storage.getItem(SAVE_KEY);
    if (legacy === null) return;
    const slot1 = storage.getItem(slotKey(1));
    if (slot1 === null) {
      storage.setItem(slotKey(1), legacy);
      if (storage.getItem(slotKey(1)) !== legacy) return;
      storage.removeItem(SAVE_KEY);
    } else if (slot1 === legacy) {
      storage.removeItem(SAVE_KEY);
    }
    // else: slot 1 holds different data — keep the legacy key rather than risk it.
  } catch (err) {
    console.warn('nrl-sim: legacy save migration failed, legacy save kept', err);
  }
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
  const storage = getStorage();
  const out: SlotSummary[] = [];
  if (storage) migrateLegacySave(storage);
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const raw = storage ? readSlotRaw(storage, slot) : null;
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
  const storage = getStorage();
  if (!storage) {
    console.warn('nrl-sim: no storage available, save skipped');
    bus.emit('ui:notify', { text: 'Save failed: storage unavailable', kind: 'danger' });
    return false;
  }
  try {
    storage.setItem(slotKey(slot), JSON.stringify(state));
  } catch (err) {
    console.warn('nrl-sim: save failed', err);
    bus.emit('ui:notify', { text: 'Save failed: storage full', kind: 'danger' });
    return false;
  }
  // Slot 1 now holds current data; the stale legacy copy must not resurface.
  if (slot === 1) {
    try { storage.removeItem(SAVE_KEY); } catch { /* best effort */ }
  }
  return true;
}

/**
 * Persist state to the active slot. Never throws: on QuotaExceededError or any
 * storage failure it emits a `ui:notify` danger and console.warns, leaving the
 * game playable in-memory. If no storage exists at all, it likewise warns.
 */
export function save(state: GameState): void {
  const storage = getStorage();
  if (storage) migrateLegacySave(storage);
  writeSlot(activeSlot, state);
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
  const storage = getStorage();
  if (!storage) return null;
  migrateLegacySave(storage);

  const raw = readSlotRaw(storage, activeSlot);
  if (raw === null) return null;

  const res = parseSave(raw);
  if (res.ok) return res.state;
  if (res.reason === 'future') {
    console.warn(`nrl-sim: ${res.message}`);
    bus.emit('ui:notify', { text: res.message, kind: 'danger' });
    return null;
  }
  return markCorrupt(storage, raw);
}

/** Shared corrupt path: preserve raw under CORRUPT_KEY, drop the slot, warn. */
function markCorrupt(storage: StorageLike, raw: string): null {
  console.warn('nrl-sim: corrupt save, ignoring');
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch (err) {
    // Preserving forensics is best-effort; never let it block recovery.
    console.warn('nrl-sim: could not preserve corrupt save', err);
  }
  removeSlot(storage, activeSlot);
  return null;
}

function removeSlot(storage: StorageLike, slot: number): void {
  storage.removeItem(slotKey(slot));
  if (slot === 1) storage.removeItem(SAVE_KEY);
}

/** Delete a slot (leaves CORRUPT_KEY intact). */
export function deleteSlot(slot: number): void {
  const storage = getStorage();
  if (!storage) return;
  removeSlot(storage, slot);
}

/** Remove the active slot's save. */
export function clearSave(): void {
  deleteSlot(activeSlot);
}

/** Presence check for the active slot (or `slot`). A corrupt save still reads as
 *  present here; load() is where corruption is handled. */
export function hasSave(slot: number = activeSlot): boolean {
  const storage = getStorage();
  if (!storage) return false;
  migrateLegacySave(storage);
  return readSlotRaw(storage, slot) !== null;
}

// ── Export / import ──────────────────────────────────────────────────────────

/** Serialise a state to the export file format (plain state JSON). */
export function exportSave(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export type ImportResult =
  | { ok: true; state: GameState }
  | { ok: false; message: string };

/** Validate + migrate imported text. Never throws, never touches storage. */
export function importSave(text: string): ImportResult {
  const res = parseSave(text);
  return res.ok ? res : { ok: false, message: res.message };
}

/** Suggested filename for an exported save. */
export function exportFilename(state: GameState): string {
  const club = String(state.clubName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `nrl-sim-${club || 'save'}-s${state.season}w${state.week}.json`;
}

/** Browser: download the state as a JSON file. No-op outside a browser. */
export function downloadSave(state: GameState): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const url = URL.createObjectURL(new Blob([exportSave(state)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/**
 * Validate imported text and write it to `slot`. Notifies the player either way.
 * Returns the imported state on success, else null (storage left unchanged).
 */
export function importIntoSlot(text: string, slot: number): GameState | null {
  const res = importSave(text);
  if (!res.ok) {
    bus.emit('ui:notify', { text: `Import failed: ${res.message}`, kind: 'danger' });
    return null;
  }
  if (!writeSlot(slot, res.state)) return null;
  bus.emit('ui:notify', { text: `Save imported into slot ${slot}`, kind: 'success' });
  return res.state;
}

// ── Autosave ────────────────────────────────────────────────────────────────

/**
 * Subscribe to 'week:advanced' and persist the settled post-tick state (the §5
 * pipeline emits this at step 8, after the step-7 autosave hook, so the state is
 * fully settled). Returns the unsubscribe closure for teardown/tests.
 */
export function enableAutosave(): () => void {
  return bus.on('week:advanced', () => save(getState()));
}

// ── Title flow (minimal DOM) ─────────────────────────────────────────────────
//
// Renders a three-slot overlay into `root` (#ui-root): each slot offers
// Continue / New Game / Delete. Resolves once with the player's choice (after
// making that slot active, so load()/save() target it), then removes itself.
// Styling is intentionally minimal — WU-5 (dom.ts / HUD) owns the polished look.
// TODO(WU-5): replace inline DOM/styles with src/ui/dom.ts helpers.

export interface TitleChoice {
  mode: 'continue' | 'new';
  clubName?: string;
  difficulty?: Difficulty;
  colors?: [string, string];
}

const DEFAULT_CLUB_NAME = 'Cavehole Crushers';

export function showTitleFlow(root: HTMLElement): Promise<TitleChoice> {
  return new Promise<TitleChoice>((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-nrl-title', '');
    // pointer-events opt-in (the #ui-root overlay disables them by default).
    overlay.style.cssText = [
      'position:absolute', 'inset:0', 'pointer-events:auto',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'gap:16px', 'background:rgba(26,26,46,0.95)',
      'color:#fff', 'font-family:"Courier New",monospace',
    ].join(';');

    const title = document.createElement('h1');
    title.textContent = 'NRL SIM';
    title.style.cssText = 'letter-spacing:4px;margin:0 0 8px;';
    overlay.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:320px;';
    overlay.appendChild(list);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center;';
    overlay.appendChild(footer);

    let settled = false;
    const finish = (slot: number, choice: TitleChoice): void => {
      if (settled) return;
      settled = true;
      setActiveSlot(slot);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(choice);
    };

    const mkRow = (): HTMLDivElement => {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:center;';
      return d;
    };

    // Name form for starting a new game in `slot`, rendered inside `host`.
    const buildNewGameForm = (host: HTMLElement, slot: number): void => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = DEFAULT_CLUB_NAME;
      input.setAttribute('data-nrl-clubname', '');
      input.style.cssText = 'padding:8px;font-family:inherit;text-align:center;';

      let primary = DEFAULT_PLAYER_COLORS[0];
      let secondary = DEFAULT_PLAYER_COLORS[1];
      let difficulty: Difficulty = DEFAULT_DIFFICULTY;

      const start = mkButton('Start', 'data-nrl-start');
      start.addEventListener('click', () => {
        const name = input.value.trim() || DEFAULT_CLUB_NAME;
        finish(slot, { mode: 'new', clubName: name, difficulty, colors: [primary, secondary] });
      });

      // Curated swatches only; a secondary too close to the primary is disabled.
      const swatchRow = (label: string, attr: string, palette: readonly string[], pick: (c: string) => void) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:13px;';
        row.appendChild(mkLabel(label));
        const buttons: HTMLButtonElement[] = [];
        for (const c of palette) {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute(attr, c);
          b.setAttribute('aria-label', `${label} ${c}`);
          b.style.cssText = `width:26px;height:26px;background:${c};border:2px solid #555;cursor:pointer;`;
          b.addEventListener('click', () => { pick(c); refresh(); });
          buttons.push(b);
          row.appendChild(b);
        }
        return { row, buttons, palette };
      };
      const prim = swatchRow('Primary', 'data-nrl-primary', PLAYER_PRIMARY_COLORS, (c) => {
        primary = c;
        if (!isValidColorPair(primary, secondary)) {
          secondary = PLAYER_SECONDARY_COLORS.find((s) => isValidColorPair(primary, s)) ?? secondary;
        }
      });
      const sec = swatchRow('Secondary', 'data-nrl-secondary', PLAYER_SECONDARY_COLORS, (c) => { secondary = c; });
      const refresh = (): void => {
        prim.buttons.forEach((b, i) => {
          const c = prim.palette[i]!;
          b.disabled = !PLAYER_SECONDARY_COLORS.some((s) => isValidColorPair(c, s));
          b.style.borderColor = c === primary ? '#fff' : '#555';
        });
        sec.buttons.forEach((b, i) => {
          const c = sec.palette[i]!;
          b.disabled = !isValidColorPair(primary, c);
          b.style.opacity = b.disabled ? '0.25' : '1';
          b.style.borderColor = c === secondary ? '#fff' : '#555';
        });
      };

      const diffRow = document.createElement('div');
      diffRow.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:13px;';
      diffRow.appendChild(mkLabel('Difficulty'));
      const diffButtons = new Map<Difficulty, HTMLButtonElement>();
      for (const d of DIFFICULTIES) {
        const b = mkButton(d[0]!.toUpperCase() + d.slice(1), `data-nrl-difficulty-${d}`);
        b.addEventListener('click', () => {
          difficulty = d;
          for (const [k, btn] of diffButtons) btn.style.outline = k === d ? '2px solid #fff' : 'none';
        });
        diffButtons.set(d, b);
        diffRow.appendChild(b);
      }
      diffButtons.get(difficulty)!.style.outline = '2px solid #fff';

      host.appendChild(input);
      host.appendChild(prim.row);
      host.appendChild(sec.row);
      host.appendChild(diffRow);
      refresh();
      host.appendChild(start);
      input.focus();
    };

    let notice: HTMLElement | null = null;
    const setNotice = (text: string): void => {
      if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
      notice = document.createElement('div');
      notice.setAttribute('data-nrl-notice', '');
      notice.textContent = text;
      notice.style.cssText = 'color:#ff8a8a;font-size:13px;max-width:360px;text-align:center;';
      footer.appendChild(notice);
    };

    const render = (autoOpenSlot: number | null): void => {
      list.replaceChildren();
      for (const s of getSlotSummaries()) {
        const row = mkRow();
        row.style.cssText += 'border:2px solid #0f3460;padding:10px;';
        row.setAttribute(`data-nrl-slot-${s.slot}`, '');

        const label = document.createElement('div');
        label.setAttribute(`data-nrl-slot-label-${s.slot}`, '');
        label.textContent =
          s.status === 'ok' ? `Slot ${s.slot}: ${s.clubName} — Season ${s.season}, Week ${s.week}`
          : s.status === 'future' ? `Slot ${s.slot}: newer game version`
          : s.status === 'corrupt' ? `Slot ${s.slot}: unreadable save`
          : `Slot ${s.slot}: Empty`;
        row.appendChild(label);
        if (s.message && s.status === 'future') {
          const note = document.createElement('div');
          note.textContent = s.message;
          note.style.cssText = 'color:#ff8a8a;font-size:12px;max-width:340px;text-align:center;';
          row.appendChild(note);
        }

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display:flex;gap:8px;';
        const formHost = mkRow();

        if (s.status === 'ok') {
          const cont = mkButton('Continue', `data-nrl-continue-${s.slot}`);
          cont.addEventListener('click', () => finish(s.slot, { mode: 'continue' }));
          buttons.appendChild(cont);
        }
        if (s.status !== 'future') {
          const newBtn = mkButton('New Game', `data-nrl-new-${s.slot}`);
          newBtn.addEventListener('click', () => {
            // One form at a time: clear any other slot's form first.
            render(null);
            const host = list.querySelector(`[data-nrl-form-${s.slot}]`);
            if (host) buildNewGameForm(host as HTMLElement, s.slot);
          });
          buttons.appendChild(newBtn);
        }
        if (s.status !== 'empty') {
          // Two-step delete so a stray tap never destroys a season.
          const del = mkButton('Delete', `data-nrl-delete-${s.slot}`);
          let armed = false;
          del.addEventListener('click', () => {
            if (!armed) {
              armed = true;
              del.textContent = 'Really delete?';
              return;
            }
            deleteSlot(s.slot);
            render(null);
          });
          buttons.appendChild(del);
        }

        row.appendChild(buttons);
        formHost.setAttribute(`data-nrl-form-${s.slot}`, '');
        row.appendChild(formHost);
        list.appendChild(row);

        if (autoOpenSlot === s.slot) buildNewGameForm(formHost, s.slot);
      }
    };

    // Fresh install (all slots empty): go straight to naming a club in slot 1.
    const allEmpty = getSlotSummaries().every((s) => s.status === 'empty');
    render(allEmpty ? 1 : null);

    const importBtn = mkButton('Import save', 'data-nrl-import');
    importBtn.addEventListener('click', () => {
      void pickSaveFile().then((text) => {
        if (text === null) return;
        const free = getSlotSummaries().find((s) => s.status === 'empty');
        if (!free) {
          setNotice('All slots are full — delete one before importing.');
          return;
        }
        const res = importSave(text);
        if (!res.ok) {
          setNotice(`Import failed: ${res.message}`);
          return;
        }
        if (writeSlot(free.slot, res.state)) render(null);
        else setNotice('Import failed: could not write to storage.');
      });
    });
    footer.appendChild(importBtn);

    root.appendChild(overlay);
  });
}

/** Minimal pixel-ish button. TODO(WU-5): swap for dom.ts button(). */
function mkLabel(text: string): HTMLSpanElement {
  const l = document.createElement('span');
  l.textContent = text;
  l.style.cssText = 'min-width:78px;text-align:right;';
  return l;
}

function mkButton(label: string, dataAttr: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.setAttribute(dataAttr, '');
  b.style.cssText = [
    'padding:10px 24px', 'font-family:"Courier New",monospace', 'font-size:16px',
    'cursor:pointer', 'background:#16213e', 'color:#fff',
    'border:3px solid #0f3460', 'image-rendering:pixelated',
  ].join(';');
  return b;
}
