// Runtime content selection. Load before selecting; old saves always select AU.
// No state import here: config and the match/art workers also read these sections.
import { AU_PACK } from './au';
import type { ContentPack, LeagueShape, MatchRules, Vocabulary } from './pack';
export type { ContentPack } from './pack';
export { AU_PACK } from './au';

export const DEFAULT_PACK_ID = String(import.meta.env.VITE_CONTENT_PACK ?? 'au').toLowerCase();
const packs = new Map<string, ContentPack>([['au', AU_PACK]]);
let current = AU_PACK;
let ukLoading: Promise<void> | undefined;
const listeners = new Set<() => void>();

/** Only a UK home selects UK. Missing country uses the build default. */
export function packForCountry(country?: string): string {
  return country ? (['GB', 'UK'].includes(country.toUpperCase()) ? 'uk' : 'au') : DEFAULT_PACK_ID;
}

/** AU never fetches the UK chunk; failed loads can be retried. */
export async function preparePack(id: string = DEFAULT_PACK_ID): Promise<void> {
  if (id !== 'uk' || packs.has(id)) return;
  ukLoading ??= import('./uk').then(({ UK_PACK }) => { packs.set('uk', UK_PACK); })
    .catch((error: unknown) => { ukLoading = undefined; throw error; });
  await ukLoading;
}

/** Synchronous state replacement after the caller has prepared its content. */
export function selectPack(id?: string): void {
  const next = packs.get(id ?? 'au');
  if (id === 'uk' && !next) throw new Error('Prepare the UK content pack before loading this career');
  if (current === (next ?? AU_PACK)) return;
  current = next ?? AU_PACK;
  for (const listener of listeners) listener();
}

/** Keep legacy exported values live when a career is created or loaded. */
export function onPackChange(listener: () => void): void { listeners.add(listener); }
export function activePack(): ContentPack { return current; }
export function activeLeague(): LeagueShape { return current.league; }
export function activeRules(): MatchRules { return current.rules; }
export function activeVocab(): Vocabulary { return current.vocab; }
