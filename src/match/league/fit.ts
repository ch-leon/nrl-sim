// Pure squad descriptions for strategy counters (#459): no RNG, saved fields,
// or imports from the live match engine.
import { BACKS, HALVES, PACK, type AttackPreset, type DefencePreset, type StyleEntry } from './presets';

/**
 * Each derived rating is a weighted mean (so flat 60 stays exactly 60), then
 * adds each named trait once. Style components are weighted means too. Fit is
 * 1 + (rating - leagueAverage) / pointsPerFit, clamped to 0–1.5.
 */
export const FIT = {
  leagueAverage: 60,
  pointsPerFit: 50,
  maxFit: 1.5,
  archetypeThreshold: 80,
  carry: { strength: 3, speed: 1, wreckingBall: 8 },
  offload: { skill: 1, strength: 1, offloadKing: 8, razzleDazzle: 6 },
  ballPlay: { skill: 1, footyIQ: 1, playmaker: 8 },
  footwork: { speed: 1, skill: 1, dancingFeet: 8 },
  edgeD: { speed: 1, footyIQ: 1, lastLine: 8, poacher: 6 },
  contactD: { strength: 1, footyIQ: 1, brickWall: 8, hitman: 6 },
  tight: { carry: 1, offload: 1 },
  expansive: { speed: 2, footwork: 1, ballPlay: 1 },
  kickChase: { kicker: 1, chasers: 1, bigBoot: 8 },
  allOut: { offload: 1, footwork: 1, stamina: 1 },
  rush: { stamina: 1, contactD: 1, hitman: 4 },
};

export interface DerivedRatings {
  carry: number;
  offload: number;
  ballPlay: number;
  footwork: number;
  edgeD: number;
  contactD: number;
}

const has = (player: StyleEntry, id: string): boolean => player.traits?.some((t) => t.id === id) ?? false;
const mean = (values: readonly number[]): number => values.length
  ? values.reduce((sum, n) => sum + n, 0) / values.length : FIT.leagueAverage;
const weighted = (...parts: readonly [number, number][]): number => {
  const total = parts.reduce((sum, [, weight]) => sum + weight, 0);
  return total === 0 ? FIT.leagueAverage : parts.reduce((sum, [n, weight]) => sum + n * weight, 0) / total;
};

/** Missing stats use the neutral league baseline, as do absent role groups. */
export function derivedRatings(player: StyleEntry): DerivedRatings {
  const s = player.stats ?? { speed: FIT.leagueAverage, strength: FIT.leagueAverage,
    stamina: FIT.leagueAverage, skill: FIT.leagueAverage, footyIQ: FIT.leagueAverage };
  const bonus = (id: string, amount: number): number => has(player, id) ? amount : 0;
  return {
    carry: weighted([s.strength, FIT.carry.strength], [s.speed, FIT.carry.speed]) + bonus('wreckingBall', FIT.carry.wreckingBall),
    offload: weighted([s.skill, FIT.offload.skill], [s.strength, FIT.offload.strength]) + bonus('offloadKing', FIT.offload.offloadKing) + bonus('razzleDazzle', FIT.offload.razzleDazzle),
    ballPlay: weighted([s.skill, FIT.ballPlay.skill], [s.footyIQ, FIT.ballPlay.footyIQ]) + bonus('playmaker', FIT.ballPlay.playmaker),
    footwork: weighted([s.speed, FIT.footwork.speed], [s.skill, FIT.footwork.skill]) + bonus('dancingFeet', FIT.footwork.dancingFeet),
    edgeD: weighted([s.speed, FIT.edgeD.speed], [s.footyIQ, FIT.edgeD.footyIQ]) + bonus('lastLine', FIT.edgeD.lastLine) + bonus('poacher', FIT.edgeD.poacher),
    contactD: weighted([s.strength, FIT.contactD.strength], [s.footyIQ, FIT.contactD.footyIQ]) + bonus('brickWall', FIT.contactD.brickWall) + bonus('hitman', FIT.contactD.hitman),
  };
}

export type StyleFit = Record<AttackPreset | DefencePreset, number>;

/** Read the selected on-field roster; bench selection remains the caller's job. */
export function styleFit(roster: readonly StyleEntry[]): StyleFit {
  const players = roster.map((entry) => ({ entry, ratings: derivedRatings(entry) }));
  const group = (roles?: readonly string[]) => players.filter((p) => !roles || roles.includes(p.entry.position));
  const rating = (key: keyof DerivedRatings, roles?: readonly string[]): number => mean(group(roles).map((p) => p.ratings[key]));
  const stat = (key: keyof NonNullable<StyleEntry['stats']>, roles?: readonly string[]): number =>
    mean(group(roles).map((p) => p.entry.stats?.[key] ?? FIT.leagueAverage));
  const scale = (n: number): number => Math.max(0, Math.min(FIT.maxFit, 1 + (n - FIT.leagueAverage) / FIT.pointsPerFit));
  // The best available kicker supplies the kick; backs supply the chase.
  const kicker = players.length ? Math.max(...players.map(({ entry }) =>
    (entry.stats?.skill ?? FIT.leagueAverage) + (has(entry, 'bigBoot') ? FIT.kickChase.bigBoot : 0))) : FIT.leagueAverage;
  const rushContact = mean(players.map(({ entry, ratings }) => ratings.contactD + (has(entry, 'hitman') ? FIT.rush.hitman : 0)));
  return {
    grind: scale(weighted([rating('carry', PACK), FIT.tight.carry], [rating('offload', PACK), FIT.tight.offload])),
    balanced: scale(mean(players.map(({ entry }) => mean(entry.stats ? Object.values(entry.stats) : [])))),
    expansive: scale(weighted([stat('speed', BACKS), FIT.expansive.speed], [rating('footwork', BACKS), FIT.expansive.footwork], [rating('ballPlay', HALVES), FIT.expansive.ballPlay])),
    'kick-chase': scale(weighted([kicker, FIT.kickChase.kicker], [stat('speed', BACKS), FIT.kickChase.chasers])),
    'all-out': scale(weighted([rating('offload'), FIT.allOut.offload], [rating('footwork'), FIT.allOut.footwork], [stat('stamina'), FIT.allOut.stamina])),
    slide: scale(rating('edgeD', BACKS)),
    rush: scale(weighted([stat('stamina'), FIT.rush.stamina], [rushContact, FIT.rush.contactD])),
    compressed: scale(rating('contactD', PACK)),
  };
}

export type Archetype = 'Strike winger' | 'Wrecking forward' | 'Ball-playing half' | 'Edge defender' | 'Enforcer' | 'Sweeper';

/** UI description only. Ties use rating declaration order; never stack labels.
 * Offload specialists share Wrecking forward with carriers. Edge D distinguishes
 * the fullback (Sweeper) from the rest of the line (Edge defender).
 */
export function archetype(player: StyleEntry): Archetype | null {
  const ratings = derivedRatings(player);
  const top = (Object.keys(ratings) as (keyof DerivedRatings)[]).reduce((best, key) => ratings[key] > ratings[best] ? key : best, 'carry');
  if (ratings[top] < FIT.archetypeThreshold) return null;
  const labels: Record<keyof DerivedRatings, Archetype> = {
    carry: 'Wrecking forward', offload: 'Wrecking forward', ballPlay: 'Ball-playing half',
    footwork: 'Strike winger', edgeD: player.position === 'fullback' ? 'Sweeper' : 'Edge defender', contactD: 'Enforcer',
  };
  return labels[top];
}
