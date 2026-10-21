// GitHub #42: Academy junior intake at season rollover. Runs at order 6, right
// after aging/retirement (order 5). Generates 3-5 prospects aged 17-19 into the
// free-agent pool (flagged `junior`), on cheap contracts. The Academy level lifts
// their starting stats, their number and (level 2+) gives them the youngGun
// training boost. Last season's unsigned prospects are cleared first.
//
// N14.3: the call-up. Before a round the club would forfeit (fewer than SQUAD_MIN
// fit), the Academy calls up juniors to make the side: generated at the
// Academy's level (no Academy: the lowest band) and signed at the junior wage for
// the rest of the season. It adds dice only in a week it calls someone up, so
// every other week plays as before.
import { bus } from '../core/events';
import { getState, setState } from '../core/state';
import type { Player } from '../core/state';
import { withTrait, withoutTrait } from '../data/traits';
import { registerSeasonHook, registerTickHook, TICK_ORDER } from '../core/time';
import { SQUAD_CAP, SQUAD_MIN, STAT_MAX, WEEKS_PER_SEASON } from '../config';
import { fitSquadCount } from './matchday';
import { getCurrentFixture, PLAYER_ID } from './fixtures';
import { overallRating, generatePlayer, POSITIONS } from '../data/player';
import type { Rng } from '../utils/rng';
import { makeRng } from '../utils/rng';

export const JUNIOR_MIN_AGE = 17;
export const JUNIOR_MAX_AGE = 19;
/** Prospects start well below the ceiling so the training curve has room. */
const BASE_BAND = [26, 42] as const;
const BAND_PER_LEVEL = [4, 5] as const;

/** Prospects per intake: 3 with no Academy, 4 at L1-2, 5 at L3. */
export function juniorCount(academyLevel: number): number {
  return 3 + (academyLevel >= 1 ? 1 : 0) + (academyLevel >= 3 ? 1 : 0);
}

export function academyLevel(facilities: readonly { defId: string; level: number }[]): number {
  return facilities.find((f) => f.defId === 'academy')?.level ?? 0;
}

/** Deterministically generate one intake of prospects for an Academy level. */
export function generateProspects(rng: Rng, level: number): Player[] {
  const lo = BASE_BAND[0] + BAND_PER_LEVEL[0] * level;
  const hi = BASE_BAND[1] + BAND_PER_LEVEL[1] * level;
  const out: Player[] = [];
  const n = juniorCount(level);
  for (let i = 0; i < n; i++) {
    const base = generatePlayer(rng, {
      age: rng.int(JUNIOR_MIN_AGE, JUNIOR_MAX_AGE),
      position: rng.pick(POSITIONS),
      quality: 'rookie',
    });
    const roll = (): number => Math.min(STAT_MAX, rng.int(lo, hi));
    const stats = {
      speed: roll(), strength: roll(), stamina: roll(), skill: roll(), footyIQ: roll(),
    };
    const overall = overallRating({ stats });
    let traits = withoutTrait(withoutTrait(base.traits, 'youngGun'), 'veteran');
    if (level >= 2) traits = withTrait(traits, 'youngGun');
    out.push({
      ...base,
      stats,
      traits,
      junior: true,
      wage: Math.round(overall * 8 + 60), // cheap contract
      contractWeeks: 0,
    });
  }
  return out;
}

/**
 * The juniors the Academy calls up so the club can field SQUAD_MIN fit, the best
 * of each intake first; never past SQUAD_CAP. Signed at the junior wage until
 * the season's end (`weeksLeft`), no fee. Pure apart from the rng.
 */
export function callUpJuniors(
  rng: Rng,
  squad: readonly Player[],
  level: number,
  season: number,
  weeksLeft: number,
): Player[] {
  const need = Math.min(SQUAD_MIN - fitSquadCount(squad), SQUAD_CAP - squad.length);
  const out: Player[] = [];
  while (out.length < need) {
    const intake = generateProspects(rng, level).sort((a, b) => overallRating(b) - overallRating(a));
    for (const p of intake.slice(0, need - out.length)) {
      const { junior: _junior, ...rest } = p;
      out.push({ ...rest, contractWeeks: Math.max(1, weeksLeft), joinedSeason: season });
    }
  }
  return out;
}

export function registerYouthSystem(): void {
  // After the economy (its forced sale) and the injuries, before the match.
  registerTickHook('academy-callup', TICK_ORDER.match - 2, ({ week, season }) => {
    const state = getState();
    const fixture = getCurrentFixture(state, PLAYER_ID);
    if (!fixture || fixture.result) return;
    if (fitSquadCount(state.squad) >= SQUAD_MIN) return;
    const rng = makeRng(state.rngSeed);
    const called = callUpJuniors(rng, state.squad, academyLevel(state.facilities), season, WEEKS_PER_SEASON - week + 1);
    if (called.length === 0) return;
    setState({ squad: [...state.squad, ...called], rngSeed: rng.state() });
    bus.emit('ui:notify', {
      text: `Academy call-up: ${called.map((p) => p.name).join(', ')} ${called.length === 1 ? 'comes' : 'come'} up to make the side, on the junior wage to the season's end.`,
      kind: 'info',
    });
  });

  registerSeasonHook('youth', 6, ({ season }) => {
    const state = getState();
    const rng = makeRng((state.rngSeed ^ Math.imul(season, 0x9e3779b1)) >>> 0);
    const prospects = generateProspects(rng, academyLevel(state.facilities));
    setState({
      freeAgents: [...state.freeAgents.filter((p) => !p.junior), ...prospects],
      rngSeed: rng.state(),
    });
    bus.emit('ui:notify', {
      text: `Academy intake: ${prospects.length} prospects (aged ${JUNIOR_MIN_AGE}-${JUNIOR_MAX_AGE}) are in the free-agent pool.`,
      kind: 'info',
      quiet: true, // in the season review (N14)
    });
  });
}
