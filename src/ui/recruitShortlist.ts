// UI-only recruitment advice: no pool changes, state writes or dice.
import type { GameState, Player } from '../core/state';
import { SQUAD_CAP, difficultyMultipliers } from '../config';
import { overallRating } from '../data/player';
import { signingFee } from '../systems/freeagency';
import { LINEUP_SLOTS, isFieldable, positionFit, effectiveRating, resolveLineup } from '../systems/lineup';

export interface RecruitShortlist {
  ids: string[];
  pickId: string | null;
  reachId: string | null;
}

/** Fee plus eight weeks of this player's difficulty-scaled wage, with a squad place free. */
export function recruitAffordable(state: GameState, p: Player): boolean {
  return state.squad.length < SQUAD_CAP
    && signingFee(state, p) + 8 * p.wage * difficultyMultipliers(state.settings.difficulty).wages <= state.money;
}

/** Deterministic advice; small pools keep the full table's default overall order. */
export function recruitShortlist(state: GameState): RecruitShortlist {
  const cmpId = (a: Player, b: Player): number => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const best = (a: Player, b: Player): number => overallRating(b) - overallRating(a) || cmpId(a, b);
  const pool = [...state.freeAgents].sort(best);
  const affordable = pool.filter((p) => recruitAffordable(state, p));
  const small = pool.length < 5;
  // Natural, fieldable cover per starting slot: two wingers need twice the cover.
  // A lock has no natural starting slot, so use his best positional fit.
  const positions = [...new Set(LINEUP_SLOTS)];
  const cover = positions.map((pos) => ({
    pos,
    ratio: state.squad.filter((p) => isFieldable(p) && positionFit(p.position, pos) === 1).length
      / LINEUP_SLOTS.filter((slot) => slot === pos).length,
  }));
  const leastCover = Math.min(...cover.map(({ ratio }) => ratio));
  const need = (p: Player): number => {
    const fit = Math.max(...positions.map((pos) => positionFit(p.position, pos)));
    const ratio = Math.min(...cover.filter(({ pos }) => positionFit(p.position, pos) === fit).map(({ ratio }) => ratio));
    return ratio === leastCover ? 0 : 1;
  };
  // Fill the thinnest positions first, then take the best affordable overall.
  affordable.sort((a, b) => need(a) - need(b) || best(a, b));
  const reach = !small && state.squad.length < SQUAD_CAP
    ? pool.find((p) => !recruitAffordable(state, p) && signingFee(state, p) < 1.5 * state.money)
    : undefined;
  const chosen = small ? pool : affordable.slice(0, reach ? 3 : 4);
  if (reach) chosen.push(reach);

  const starters = resolveLineup(state.lineup, state.squad).starters;
  const gain = (p: Player): number => {
    const fit = Math.max(...LINEUP_SLOTS.map((pos) => positionFit(p.position, pos)));
    return Math.max(...LINEUP_SLOTS.flatMap((pos, i) => positionFit(p.position, pos) === fit
      ? [effectiveRating(p, pos) - (starters[i] ? effectiveRating(starters[i]!, pos) : 0)] : []));
  };
  const pick = chosen.filter((p) => recruitAffordable(state, p)).sort((a, b) =>
    gain(b) - gain(a) || signingFee(state, a) - signingFee(state, b) || cmpId(a, b))[0];
  return { ids: chosen.map((p) => p.id), pickId: pick?.id ?? null, reachId: reach?.id ?? null };
}
