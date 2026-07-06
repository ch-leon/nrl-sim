// src/core/save.ts — localStorage persistence + title flow (BAK-174, WU-4).
//
// Serialises the whole GameState (plain JSON per ARCHITECTURE §1.2) to
// localStorage, loads & validates on boot, falls back to null when absent, and
// degrades gracefully on corrupt saves or storage errors. Also provides the
// autosave subscriber (on 'week:advanced') and a minimal DOM title flow.
//
// No Phaser. Pure TS + optional DOM. localStorage is accessed through an
// injectable abstraction so Node-env unit tests can pass a Map-backed fake.

import type { GameState } from './state';
import { getState } from './state';
import { bus } from './events';

export const SAVE_KEY = 'nrl-sim-save-v1';
export const CORRUPT_KEY = 'nrl-sim-save-corrupt';

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

// ── save / load / clear ──────────────────────────────────────────────────────

/**
 * Persist state. Never throws: on QuotaExceededError or any storage failure it
 * emits a `ui:notify` danger and console.warns, leaving the game playable
 * in-memory. If no storage exists at all, it likewise warns and returns.
 */
export function save(state: GameState): void {
  const storage = getStorage();
  if (!storage) {
    console.warn('nrl-sim: no storage available, save skipped');
    bus.emit('ui:notify', { text: 'Save failed: storage unavailable', kind: 'danger' });
    return;
  }
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('nrl-sim: save failed', err);
    bus.emit('ui:notify', { text: 'Save failed: storage full', kind: 'danger' });
  }
}

/** The required top-level keys every valid save must carry (BAK-174 spec). */
const REQUIRED_KEYS = [
  'clubId', 'clubName', 'money', 'week', 'season', 'squad', 'facilities', 'league',
] as const;

/**
 * Load & validate the save. Returns the GameState, or null when absent/corrupt.
 * Corrupt (unparseable, wrong version, missing keys, non-object) funnels through
 * a single path: warn, copy raw payload to CORRUPT_KEY for forensics, remove
 * SAVE_KEY, return null. Never throws.
 */
export function load(): GameState | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return markCorrupt(storage, raw);
  }

  if (!isValidSave(parsed)) {
    return markCorrupt(storage, raw);
  }

  return parsed as GameState;
}

/** Structural validation: non-null object, version===1, all required keys present
 *  with squad/facilities arrays and league an object. */
function isValidSave(parsed: unknown): boolean {
  if (parsed === null || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) return false;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) return false;
  }
  if (!Array.isArray(obj.squad)) return false;
  if (!Array.isArray(obj.facilities)) return false;
  if (obj.league === null || typeof obj.league !== 'object') return false;
  return true;
}

/** Shared corrupt path: preserve raw under CORRUPT_KEY, drop SAVE_KEY, warn. */
function markCorrupt(storage: StorageLike, raw: string): null {
  console.warn('nrl-sim: corrupt save, ignoring');
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch (err) {
    // Preserving forensics is best-effort; never let it block recovery.
    console.warn('nrl-sim: could not preserve corrupt save', err);
  }
  storage.removeItem(SAVE_KEY);
  return null;
}

/** Remove the save (leaves CORRUPT_KEY intact for debugging). */
export function clearSave(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SAVE_KEY);
}

/** Presence check used by the title flow. A corrupt save still reads as present
 *  here (we only check the key exists); load() is where corruption is handled. */
export function hasSave(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(SAVE_KEY) !== null;
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
// Renders a New Game / Continue overlay into `root` (#ui-root) and resolves once
// with the player's choice, then removes itself. Styling is intentionally
// minimal — WU-5 (dom.ts / HUD) owns the polished look; swap to those helpers
// once available.
// TODO(WU-5): replace inline DOM/styles with src/ui/dom.ts helpers.

export interface TitleChoice {
  mode: 'continue' | 'new';
  clubName?: string;
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

    let settled = false;
    const finish = (choice: TitleChoice): void => {
      if (settled) return;
      settled = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(choice);
    };

    // Shared New-Game name form; used both when a save exists (revealed on click)
    // and when there is none (shown immediately).
    const buildNewGameForm = (container: HTMLElement): void => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = DEFAULT_CLUB_NAME;
      input.setAttribute('data-nrl-clubname', '');
      input.style.cssText = 'padding:8px;font-family:inherit;text-align:center;';

      const start = mkButton('Start', 'data-nrl-start');
      start.addEventListener('click', () => {
        const name = input.value.trim() || DEFAULT_CLUB_NAME;
        finish({ mode: 'new', clubName: name });
      });

      container.appendChild(input);
      container.appendChild(start);
      input.focus();
    };

    if (hasSave()) {
      const choices = document.createElement('div');
      choices.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

      const cont = mkButton('Continue', 'data-nrl-continue');
      cont.addEventListener('click', () => finish({ mode: 'continue' }));

      const newBtn = mkButton('New Game', 'data-nrl-new');
      const formHost = document.createElement('div');
      formHost.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';
      newBtn.addEventListener('click', () => {
        // Reveal the name form; hide the New Game button so Start is the action.
        newBtn.style.display = 'none';
        buildNewGameForm(formHost);
      });

      choices.appendChild(cont);
      choices.appendChild(newBtn);
      choices.appendChild(formHost);
      overlay.appendChild(choices);
    } else {
      // No save → straight to the New Game name form.
      const formHost = document.createElement('div');
      formHost.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';
      overlay.appendChild(formHost);
      buildNewGameForm(formHost);
    }

    root.appendChild(overlay);
  });
}

/** Minimal pixel-ish button. TODO(WU-5): swap for dom.ts button(). */
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
