// src/content/index.ts — the active content pack (GitHub #361). AU is the only
// pack and the one the game plays. The seam for another is VITE_CONTENT_PACK at
// build time (`au` when unset): a pack added to PACKS and SECTIONS can be picked
// there, with no switching at runtime. An id with no pack falls back to AU.
//
// activePack() is the pack. activeLeague(), activeRules() and activeVocab() are
// the same objects as its sections, for the modules the match and art workers
// import (config.ts, match/league/rules.ts, art/match/stadium.ts): reading them
// there keeps the clubs, names and card text out of the workers' bundles.
import { AU_LEAGUE, AU_PACK, AU_RULES, AU_VOCAB } from './au';
import type { ContentPack, LeagueShape, MatchRules, Vocabulary } from './pack';

export type { ContentPack } from './pack';
export { AU_PACK } from './au';

// Vite replaces this exact expression at build time; tests and vite-node have no value set.
const PACK_ID: string = String(import.meta.env.VITE_CONTENT_PACK ?? 'au').toLowerCase();

const PACKS: Readonly<Record<string, ContentPack>> = { au: AU_PACK };

const SECTIONS: Readonly<Record<string, Pick<ContentPack, 'league' | 'rules' | 'vocab'>>> = {
  au: { league: AU_LEAGUE, rules: AU_RULES, vocab: AU_VOCAB },
};

/** The pack this build plays. The same object every call. */
export function activePack(): ContentPack {
  return PACKS[PACK_ID] ?? AU_PACK;
}

/** activePack().league, without the rest of the pack. */
export function activeLeague(): LeagueShape {
  return (SECTIONS[PACK_ID] ?? SECTIONS.au!).league;
}

/** activePack().rules (NINES), without the rest of the pack. */
export function activeRules(): MatchRules {
  return (SECTIONS[PACK_ID] ?? SECTIONS.au!).rules;
}

/** activePack().vocab, without the rest of the pack. */
export function activeVocab(): Vocabulary {
  return (SECTIONS[PACK_ID] ?? SECTIONS.au!).vocab;
}
