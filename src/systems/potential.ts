// Stored shown-stat ceilings (#538). Pure: creation and v24 backfill use the
// same rule without consuming the career or match RNG stream.
import type { Player, PlayerCeilings } from '../core/state';
import { STAT_MAX } from '../config';
import { shownStats, starsForOverall } from '../data/player';

type CeilingSource = Pick<Player, 'id' | 'age' | 'position' | 'stats'>;

/**
 * Initial headroom bands: <=21: 18–30, 22–27: 10–20, 28–30: 4–12,
 * 31+: 0–4. Each stat's variation is a stable FNV-1a hash of id + stat.
 * Clamp at STAT_MAX; never round a fractional current stat down.
 * For pre-ceiling v24 saves, use the saved age/stats as the creation snapshot.
 * Call only at creation or when the entire ceilings field is absent at load.
 */
export function createCeilings(p: CeilingSource): PlayerCeilings {
  const [lo, hi]: readonly [number, number] = p.age <= 21 ? [18, 30] : p.age <= 27 ? [10, 20] : p.age <= 30 ? [4, 12] : [0, 4];
  const ceilings: Partial<Player['stats']> = {};
  for (const key of shownStats(p.position)) {
    let hash = 2166136261;
    for (const ch of `${p.id}:${key}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    ceilings[key] = Math.min(STAT_MAX, p.stats[key] + lo + hash % (hi - lo + 1));
  }
  return ceilings;
}

/** Reuse #537's bands on the unrounded average of the four ceilings. */
export function potentialStars(p: Pick<Player, 'position' | 'ceilings'>): number {
  return starsForOverall(shownStats(p.position).reduce((sum, key) => sum + p.ceilings[key]!, 0) / 4);
}

/** Plain stars, with the same half-star character as #537. */
export function potentialText(p: Pick<Player, 'position' | 'ceilings'>): string {
  const stars = potentialStars(p);
  return `Potential: ${'★'.repeat(Math.floor(stars))}${Number.isInteger(stars) ? '' : '½'}`;
}
