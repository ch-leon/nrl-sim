// Labs: match controls (Leon, 30 Oct). Browser-local, never in GameState.
import { browserStorage } from '../core/storage/local';
import { LABS_KEY } from '../core/storageKeys';

export interface LabsState { visible: boolean; on: Record<string, boolean>; hintsSeen: string[] }
const empty = (): LabsState => ({ visible: false, on: {}, hintsSeen: [] });
export function readLabs(raw: unknown): LabsState {
  try {
    const x = typeof raw === 'string' ? JSON.parse(raw) as unknown : raw;
    if (!x || typeof x !== 'object') return empty();
    const s = x as Partial<LabsState>;
    if (typeof s.visible !== 'boolean' || !s.on || typeof s.on !== 'object' || Array.isArray(s.on)
      || Object.values(s.on).some((v) => typeof v !== 'boolean')
      || !Array.isArray(s.hintsSeen) || s.hintsSeen.some((v) => typeof v !== 'string')) return empty();
    return { visible: s.visible, on: { ...s.on }, hintsSeen: [...s.hintsSeen] };
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
function persist(): void {
  try { browserStorage()?.setItem(LABS_KEY, JSON.stringify(cached)); } catch { /* Local session still works. */ }
}
export function labsVisible(): boolean { return state().visible; }
export function experimentOn(id: string): boolean { const s = state(); return s.visible && s.on[id] === true; }
export function setExperiment(id: string, on: boolean): void { state().on[id] = on; persist(); }
export function turnAllOff(): void { cached = { ...empty(), hintsSeen: [...state().hintsSeen] }; persist(); }
export function hintSeen(id: string): boolean { return state().hintsSeen.includes(id); }
export function markHintSeen(id: string): void {
  if (!hintSeen(id)) state().hintsSeen.push(id);
  persist();
}
/** Null restores browser state; an object supplies isolated test state. */
export function __setLabs(value: LabsState | null): void { cached = value === null ? null : readLabs(value); }
