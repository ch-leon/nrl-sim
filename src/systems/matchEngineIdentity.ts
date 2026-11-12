// Recovery compatibility, independent of SAVE_VERSION and the build SHA.
import { activePack } from '../content';
import { ON_FIELD, SET_TACKLES } from '../config';
import { NINES } from '../match/league/rules';
import { FIELD_LENGTH } from '../match/core/field';
import { cyrb53 } from '../utils/hash';

/**
 * Bump for ANY change that can alter reconstruction: simulation code, RNG draws
 * or their order, default tuning, rule interpretation, sheet/input derivation,
 * AI, or result recording. Visual-only changes do not bump this revision.
 * No historical engines: only an exact identity match may replay old inputs.
 */
export const MATCH_ENGINE_REVISION = 4;

/** Canonical data order keeps object insertion order out of compatibility. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const bag = value as Record<string, unknown>;
    return `{${Object.keys(bag).sort().map(k => `${JSON.stringify(k)}:${canonical(bag[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Cover the selected pack and the rules actually read by the sim (NINES), plus
 * the frozen field size and set length from config. Pack words, names, colours
 * and art are not reconstruction rules. Other default tuning/derivation changes
 * bump revision.
 */
export function matchEngineIdentity(): string {
  return `nrl-live-${MATCH_ENGINE_REVISION}-${cyrb53(canonical({
    pack: activePack().id, rules: NINES, onField: ON_FIELD, setTackles: SET_TACKLES, fieldLength: FIELD_LENGTH,
  }))}`;
}

export function isMatchEngineIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^nrl-live-[1-9]\d{0,8}-[0-9a-f]{14}$/.test(value);
}
