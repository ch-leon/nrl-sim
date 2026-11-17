// GitHub #42: Academy junior intake at season rollover. Runs at order 6, right
// after aging/retirement (order 5). Generates 3-5 prospects aged 17-19 into the
// free-agent pool (flagged `junior`), on cheap contracts. The Academy level lifts
// their starting stats, their number and (level 2+) gives them the youngGun
// training boost. Previous unsigned intakes remain real people.
//
// Emergency scholarships only fill registration vacancies left by this year's
// expiry/retirement, up to the minimum. Injuries and bans never create people.
// Admissions use the lowest Academy band, capped potential, durable IDs and a
// source-vacancy receipt; the current scholarship cannot be sold or released.
import { admitGeneratedPeople } from './playerCareer';
import { createCeilings } from './potential';
import { bus } from '../core/events';
import { getState, setState } from '../core/state';
import type { Player } from '../core/state';
import { withTrait, withoutTrait } from '../data/traits';
import { registerSeasonHook } from '../core/time';
import { SQUAD_CAP, SQUAD_MIN, STAT_MAX, WEEKS_PER_SEASON } from '../config';
import { overallRating, shownStats, withShownStats, generatePlayer, POSITIONS } from '../data/player';
import type { Rng } from '../utils/rng';
import { makeRng } from '../utils/rng';
import { commitPlayer, protectAddedDeals } from './cap';

export const JUNIOR_MIN_AGE = 17;
export const JUNIOR_MAX_AGE = 19;
/** Prospects start well below the ceiling so the training curve has room. */
const BASE_BAND = [26, 42] as const;
const BAND_PER_LEVEL = [4, 5] as const;
/** Arrival-only headroom: +2 per shown stat per Academy level (+6 at L3),
 * on top of the existing starting-stat bands. No extra RNG draws; saved
 * ceilings stay fixed when the Academy is upgraded or demolished. */
const CEILING_BONUS_PER_LEVEL = 2;

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
    const rolled = {
      speed: roll(), strength: roll(), stamina: roll(), handling: roll(), kicking: 0, footyIQ: roll(),
    };
    rolled.kicking = rolled.handling;
    const stats = withShownStats(base.position, base.stats, rolled);
    const ceilings = { ...createCeilings({ ...base, stats }) };
    for (const key of shownStats(base.position)) {
      ceilings[key] = Math.min(STAT_MAX, ceilings[key]! + CEILING_BONUS_PER_LEVEL * level);
    }
    const overall = overallRating({ stats, position: base.position });
    let traits = withoutTrait(withoutTrait(base.traits, 'youngGun'), 'veteran');
    if (level >= 2) traits = withTrait(traits, 'youngGun');
    out.push({
      ...base,
      stats,
      ceilings,
      traits,
      junior: true,
      wage: Math.round(overall * 8 + 60), // cheap contract
      contractWeeks: 0,
    });
  }
  return out;
}

/**
 * Generated candidates to reach SQUAD_MIN registered people, the best
 * of each intake first; never past SQUAD_CAP. Signed at the junior wage until
 * the season's end (`weeksLeft`), no fee. The caller must prove an unavoidable
 * vacancy before admitting them. Pure apart from the rng.
 */
export function callUpJuniors(
  rng: Rng,
  squad: readonly Player[],
  level: number,
  season: number,
  weeksLeft: number,
): Player[] {
  const need = Math.min(SQUAD_MIN - squad.length, SQUAD_CAP - squad.length);
  const out: Player[] = [];
  while (out.length < need) {
    const intake = generateProspects(rng, level).sort((a, b) => overallRating(b) - overallRating(a));
    for (const p of intake.slice(0, need - out.length)) {
      const { junior: _junior, ...rest } = p;
      out.push(commitPlayer({ ...rest, contractWeeks: Math.max(1, weeksLeft), joinedSeason: season }, season, 1));
    }
  }
  return out;
}

export function registerYouthSystem(): void {
  registerSeasonHook('youth', 6, ({ season }) => {
    const state = getState();
    if (state.playerPopulation.lastAcademyIntakeSeason >= season) return;
    const rng = makeRng((state.rngSeed ^ Math.imul(season, 0x9e3779b1)) >>> 0);
    const admitted = admitGeneratedPeople(state, generateProspects(rng, academyLevel(state.facilities)));
    if (!admitted) return;
    const prospects = admitted.players;
    // Only genuine losses this rollover can fund minimum-roster scholarships.
    const expired = state.freeAgents.filter(p => p.clubHistory?.spells.slice(-1)[0]?.clubId === state.clubId
      && p.clubHistory.spells.slice(-1)[0]?.departure === 'expiry' && p.clubHistory.spells.slice(-1)[0]?.end?.season === season);
    // Expiry runs before ageing. A player who then retires keeps his truthful
    // expiry spell in the archive; that same loss still left a registration gap.
    const retired = state.playerPopulation.retired.filter(p => {
      const last = p.clubHistory.spells.slice(-1)[0];
      return p.retiredAt.season === season && last?.clubId === state.clubId && last.end?.season === season
        && (last.departure === 'retirement' || last.departure === 'expiry');
    });
    const used = new Set(state.squad.filter(p => p.emergencyDealEndSeason === season).map(p => p.emergencyForPlayerId));
    const vacancies = [...new Map([...expired, ...retired].map(p => [p.id, p])).values()]
      .filter(p => !used.has(p.id)).sort((a, b) => a.id.localeCompare(b.id));
    let next = { ...state, freeAgents: [...state.freeAgents, ...prospects], playerPopulation: { ...admitted.playerPopulation, lastAcademyIntakeSeason: season } };
    const generated = callUpJuniors(rng, state.squad, 0, season, WEEKS_PER_SEASON).slice(0, vacancies.length).map((p, i) => ({ ...p,
      ceilings: Object.fromEntries(shownStats(p.position).map(k => [k, Math.max(p.stats[k], 45)])),
      emergencyDealEndSeason: season, emergencyForPlayerId: vacancies[i]!.id }));
    const emergency = admitGeneratedPeople(next, generated, state.clubId, 'emergency');
    if (emergency) {
      const squad = [...state.squad, ...emergency.players];
      next = { ...next, squad, playerPopulation: emergency.playerPopulation, capAccount: protectAddedDeals(squad, state.capAccount, season, emergency.players.map(p => p.id)) };
    }
    setState({ freeAgents: next.freeAgents, squad: next.squad, playerPopulation: next.playerPopulation, capAccount: next.capAccount });
    bus.emit('ui:notify', {
      text: `Academy intake: ${prospects.length} prospects (aged ${JUNIOR_MIN_AGE}-${JUNIOR_MAX_AGE}) are in the free-agent pool.`,
      kind: 'info',
      quiet: true, // in the season review (N14)
    });
  });
}
