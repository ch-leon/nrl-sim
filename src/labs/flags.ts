// Developer settings (was Labs: match controls, Leon, 30 Oct; #519). Browser-local, never in GameState.
// One JSON value under LABS_KEY: whether the page is shown, the experiments and
// overrides switched on, the hints seen, and the playtest career's marker. Old
// values (visible, on, hintsSeen only) still read as they always did.
import { browserStorage } from '../core/storage/local';
import { LABS_KEY } from '../core/storageKeys';

/** The playtest career in use on this browser (#519): what it was set up as, and the slot of the career put away. */
export interface TestCareerMarker {
  preset: 'block-play';
  /** True until the page that builds the preset has saved it. */
  fresh: boolean;
  /** The normal slot that was active, for the return. */
  from: number;
}

export interface LabsState {
  visible: boolean;
  on: Record<string, boolean>;
  hintsSeen: string[];
  /** Developer overrides (#519), e.g. OPEN_SCREENS. Absent in a value from before them. */
  overrides?: Record<string, boolean>;
  /** Set while the playtest career is the one being played (#519). */
  testCareer?: TestCareerMarker;
}

/** The override that opens the Office screens before their round (#519). Browser-local, never saved. */
export const OPEN_SCREENS = 'open-screens';

const empty = (): LabsState => ({ visible: false, on: {}, hintsSeen: [] });
const flagMap = (x: unknown): x is Record<string, boolean> =>
  !!x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).every((v) => typeof v === 'boolean');
function readMarker(x: unknown): TestCareerMarker | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const m = x as Partial<TestCareerMarker>;
  if (m.preset !== 'block-play' || typeof m.fresh !== 'boolean' || typeof m.from !== 'number' || !Number.isInteger(m.from)) return undefined;
  return { preset: m.preset, fresh: m.fresh, from: m.from };
}
export function readLabs(raw: unknown): LabsState {
  try {
    const x = typeof raw === 'string' ? JSON.parse(raw) as unknown : raw;
    if (!x || typeof x !== 'object') return empty();
    const s = x as Partial<LabsState>;
    if (typeof s.visible !== 'boolean' || !flagMap(s.on)
      || !Array.isArray(s.hintsSeen) || s.hintsSeen.some((v) => typeof v !== 'string')) return empty();
    const out: LabsState = { visible: s.visible, on: { ...s.on }, hintsSeen: [...s.hintsSeen] };
    // The newer fields are read on their own: a bad one is dropped, never the rest.
    if (flagMap(s.overrides) && Object.keys(s.overrides).length) out.overrides = { ...s.overrides };
    const marker = readMarker(s.testCareer);
    if (marker) out.testCareer = marker;
    return out;
  } catch { return empty(); }
}
export function labsVisibleFrom(search: string, stored: unknown): boolean {
  return new URLSearchParams(search).get('labs') === '1' || readLabs(stored).visible;
}
let cached: LabsState | null = null;
function state(): LabsState {
  if (!cached) {
    let raw: string | null = null;
    try { raw = browserStorage()?.getItem(LABS_KEY) ?? null; } catch { /* Storage blocked. */ }
    cached = readLabs(raw);
    if (labsVisibleFrom(typeof location === 'undefined' ? '' : location.search, raw)) {
      cached.visible = true;
      persist();
    }
  }
  return cached;
}
/** Write the value; false when it did not land (storage full or blocked). */
function persist(): boolean {
  try {
    const s = browserStorage();
    if (!s) return false;
    const text = JSON.stringify(cached);
    s.setItem(LABS_KEY, text);
    return s.getItem(LABS_KEY) === text;
  } catch { return false; /* Local session still works. */ }
}
/** Shown in Settings: after ?labs=1, or while a playtest career is on (its way back is here). */
export function labsVisible(): boolean { const s = state(); return s.visible || s.testCareer !== undefined; }
export function experimentOn(id: string): boolean { const s = state(); return s.visible && s.on[id] === true; }
export function setExperiment(id: string, on: boolean): void { state().on[id] = on; persist(); }
/** A developer override (#519): only while the page is shown, like an experiment. */
export function overrideOn(id: string): boolean { const s = state(); return labsVisible() && s.overrides?.[id] === true; }
export function setOverride(id: string, on: boolean): void {
  const s = state();
  s.overrides = { ...s.overrides, [id]: on };
  persist();
}
/** Experiments and overrides off and the page hidden; hints seen and the playtest career's marker stay (the reset flow clears that one). */
export function turnAllOff(): void {
  const s = state();
  cached = { ...empty(), hintsSeen: [...s.hintsSeen], ...(s.testCareer ? { testCareer: s.testCareer } : {}) };
  persist();
}
export function hintSeen(id: string): boolean { return state().hintsSeen.includes(id); }
export function markHintSeen(id: string): void {
  if (!hintSeen(id)) state().hintsSeen.push(id);
  persist();
}
/** The playtest career on this browser, or null when the normal careers are in use (#519). */
export function testCareer(): TestCareerMarker | null { return state().testCareer ?? null; }
/** Set or clear the playtest career's marker. False when it did not land, so a switch must not go ahead. */
export function setTestCareer(marker: TestCareerMarker | null): boolean {
  const s = state();
  if (marker) s.testCareer = { ...marker };
  else delete s.testCareer;
  return persist();
}

/**
 * The developer/test session marker (#519), for analytics and anything else that
 * must leave Leon's testing out: null on a player's browser; otherwise what is on.
 * The contract is in docs/specs/developer-settings.md.
 */
export interface DeveloperSession {
  /** A playtest career is the one being played. */
  testCareer: boolean;
  /** Overrides switched on (ids). */
  overrides: string[];
  /** Experiments switched on (ids). */
  experiments: string[];
}
export function developerSession(): DeveloperSession | null {
  const s = state();
  if (!labsVisible()) return null;
  const on = (m: Record<string, boolean> | undefined): string[] => Object.keys(m ?? {}).filter((k) => m![k] === true).sort();
  return { testCareer: s.testCareer !== undefined, overrides: on(s.overrides), experiments: on(s.on) };
}

/** Null restores browser state; an object supplies isolated test state. */
export function __setLabs(value: LabsState | null): void { cached = value === null ? null : readLabs(value); }
