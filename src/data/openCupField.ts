import { cyrb53 } from '../utils/hash';
import { makeRng } from '../utils/rng';
import type { CompetitionDefinition } from './competition';

/** CPP06 field and tie order. Registration and validation share the same immutable inputs. */
export function openCupField(definition: CompetitionDefinition, season: number, ordinal: number, seed: number, ids: readonly string[]) {
  const identity = ['open-cup-draw-v1', definition.id, definition.version, season, ordinal];
  const rng = makeRng((seed ^ parseInt(cyrb53(JSON.stringify(identity)).slice(-8), 16)) >>> 0);
  const entrants = rng.shuffle([...ids].sort());
  return { entrants, tieOrder: rng.shuffle(entrants) };
}
