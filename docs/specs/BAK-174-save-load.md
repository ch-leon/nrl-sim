# BAK-174 — Implement save/load system (localStorage)
**Linear:** https://linear.app/bakinglions/issue/BAK-174/implement-saveload-system-localstorage | **Priority:** High | **Work unit:** WU-4

## Problem
Progress must survive a browser refresh. We need to serialise the full `GameState`
to `localStorage`, load and validate it on boot, fall back to a new game when
absent, and degrade gracefully when the save is corrupt or storage is full. A
"New Game" / "Continue" title flow gates entry.

## Proposed solution
Implement `src/core/save.ts` with `save`/`load`/`clearSave`, an autosave
subscriber on `week:advanced`, and a small DOM title-flow helper. State shape and
store come from `src/core/state.ts` (BAK-172); the bus from `src/core/events.ts`.
The whole `GameState` is already plain-JSON (ARCHITECTURE §1.2), so
`JSON.stringify` is sufficient — no custom replacers needed.

## Affected files
- Create: `src/core/save.ts`
- Test: `tests/core/save.test.ts` (uses a `localStorage` mock/`jsdom`)

## Key interfaces & behaviour
```ts
import type { GameState } from './state';

export const SAVE_KEY = 'nrl-sim-save-v1';
export const CORRUPT_KEY = 'nrl-sim-save-corrupt';

export function save(state: GameState): void;
export function load(): GameState | null;
export function clearSave(): void;
export function hasSave(): boolean;                 // presence check for title flow
export function enableAutosave(): () => void;       // subscribes to 'week:advanced'; returns unsub

export interface TitleChoice { mode: 'continue' | 'new'; clubName?: string; }
export function showTitleFlow(root: HTMLElement): Promise<TitleChoice>;
```
`save(state)`:
- `localStorage.setItem(SAVE_KEY, JSON.stringify(state))`.
- Wrap in try/catch. On `QuotaExceededError` (or any storage error): do **not**
  throw; emit `ui:notify` `{ text: 'Save failed: storage full', kind: 'danger' }`
  and `console.warn` the error.

`load()`:
- Read `SAVE_KEY`; if `null` → return `null`.
- `JSON.parse`; on parse throw → treat as corrupt.
- Validate: parsed is a non-null object, `parsed.version === 1`, and has the
  required top-level keys (`clubId`, `clubName`, `money`, `week`, `season`,
  `squad` (array), `facilities` (array), `league` (object)). Any failure = corrupt.
- Corrupt path: `console.warn('nrl-sim: corrupt save, ignoring')`, copy the raw
  payload to `CORRUPT_KEY` for forensics, remove `SAVE_KEY`, return `null`.
- Valid path: return the parsed object typed as `GameState`.

`clearSave()`: remove `SAVE_KEY` (leave `CORRUPT_KEY` intact).

`enableAutosave()`: `bus.on('week:advanced', () => save(getState()))`; returns the
unsubscribe closure so tests/teardown can detach.

`showTitleFlow(root)`: renders a DOM overlay into `root` (`#ui-root`) using
`src/ui/dom.ts` helpers (available via WU-5; if not yet present, use minimal
inline DOM and TODO-comment the swap). Behaviour:
- If `hasSave()` → show two buttons, **Continue** and **New Game**. Continue
  resolves `{ mode: 'continue' }`. New Game reveals a club-name text input
  (default value `'Cavehole Crushers'`) + Start button, resolves
  `{ mode: 'new', clubName }` (trimmed; empty → default).
- If no save → skip straight to the New Game name input, resolve `{ mode: 'new', clubName }`.
- Resolves exactly once, then removes the overlay from the DOM.

Boot integration (documented here, wired by orchestrator in `main.ts`):
```ts
const choice = await showTitleFlow(uiRoot);
if (choice.mode === 'continue') { const s = load(); s ? loadState(s) : createNewGame('Cavehole Crushers'); }
else createNewGame(choice.clubName ?? 'Cavehole Crushers');
enableAutosave();
```
Note: `load()` may still return `null` on the Continue path (race with corruption)
— fall back to `createNewGame`.

## Edge cases & risks
- Corrupted JSON, wrong `version`, missing keys, and `null`/non-object payloads
  all funnel through the single corrupt path → `null`, never a throw.
- Preserving the corrupt payload under `CORRUPT_KEY` aids debugging but must not
  block a new save (different key).
- `localStorage` unavailable (privacy mode / SSR) — guard `typeof localStorage`;
  `load` returns `null`, `save` warns via `ui:notify`, game still playable in-memory.
- Autosave fires on every `week:advanced`; keep `save` cheap (single stringify).
- Do not autosave mid-tick before `week:advanced` — the §5 pipeline places
  autosave at step 7 and the event at step 8, so subscribing to `week:advanced`
  captures the fully-settled post-tick state.

## Acceptance criteria
- [ ] `save(state)` then `load()` round-trips a `GameState` with no data loss.
- [ ] `load()` returns `null` when no save exists.
- [ ] Corrupt/invalid/wrong-version payloads: `load()` returns `null`, warns, and
      copies the raw payload to `CORRUPT_KEY`; no exception escapes.
- [ ] `clearSave()` removes `SAVE_KEY`.
- [ ] `enableAutosave()` persists after a simulated `week:advanced` emit; returned
      unsub stops further autosaves.
- [ ] Quota/storage errors surface via `ui:notify` and never throw.
- [ ] `showTitleFlow` resolves `{mode:'continue'}` / `{mode:'new',clubName}` and
      defaults the name to `'Cavehole Crushers'`.

## Out of scope
- IndexedDB migration (only needed if state outgrows localStorage; not yet).
- Multiple save slots / cloud sync.
- Styling polish of the title overlay (WU-5 owns `dom.ts`/HUD look).
