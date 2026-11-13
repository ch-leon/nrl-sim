// src/match/league/lastTackle.ts — the kicker's call on the last tackle (#650
// part 1, BAK-208 §4.4): kick, run it, or shift it wide, weighted by the zone,
// the side's style, the score and the clock, and who is on the field; and how
// often he kicks early, on the second-last, the same reads applied. Pure: the
// live sim (live/play.ts) reads the match and draws the dice.
import type { AttackPreset, Zone } from './presets';

export type LastPlay = 'kick' | 'run' | 'pass';

/**
 * The last-tackle knobs (tuning reference §6). Overridable by name in balance
 * experiments (tuning.ts). `on` 0 is the call as it was before #650: run it
 * inside 6 m, one time in five inside 40, else a kick (`RUN_CLOSE_M`,
 * `RUN_IT_ZONE_M`, `RUN_IT_CHANCE` in tactics.ts); no new roll is drawn and
 * every other knob here does nothing.
 */
export const LAST_TACKLE = {
  on: 1,
  /** Kick, run and pass weights by zone (the share is each over their sum). */
  zones: {
    own20: { kick: 1, run: 0.04, pass: 0.04 },
    ownHalf: { kick: 1, run: 0.08, pass: 0.1 },
    midfield: { kick: 1, run: 0.12, pass: 0.18 },
    attackingHalf: { kick: 1, run: 0.25, pass: 0.25 },
    redZone: { kick: 1, run: 0.3, pass: 0.3 },
  } as Record<Zone, Record<LastPlay, number>>,
  /** Inside this many metres of the line nobody kicks the last: run or pass only (was RUN_CLOSE_M). */
  closeM: 6,
  /** A style's lean: × its kick weight and × its pass weight (run stays ×1). */
  presets: {
    grind: { kick: 1.15, pass: 0.8 },
    balanced: { kick: 1, pass: 1 },
    expansive: { kick: 0.8, pass: 1.6 },
    'kick-chase': { kick: 1.8, pass: 0.6 },
    'all-out': { kick: 0.6, pass: 1.6 },
  } as Record<AttackPreset, { kick: number; pass: number }>,
  /** The score and the clock: in the match's last this-many seconds (or golden point)… */
  lateS: 60,
  /** …a side behind multiplies its run and pass weights by this, and a side in front its kick weight by `leadKick`. */
  trailRun: 2,
  leadKick: 2,
  /** Who is on the field: the kicker's Skill (kicking) over 60, per point, and each level of Big Boot (×1 / 1.6 / 2.2), add this to the kick weight. */
  bootPerKicking: 0.02,
  bigBoot: 0.3,
  /** Its centre and wingers' Speed over the other side's, per point of the mean, adds this to the run and pass weights. */
  pacePerSpeed: 0.03,
  /** No multiplier goes below this (a slow side still runs sometimes). */
  minMult: 0.25,
  /** The early kick on the second-last (his call when the ball finds him): × the style's `earlyKick` / `earlyTerritory`… */
  earlyScale: 1,
  /** …plus this for a territory kick from the own 20, any style. */
  earlyOwn20: 0.05,
  /** An early kick's chance never goes past this. */
  earlyMax: 0.9,
};

/** What the kicker reads as he makes the call. */
export interface LastTackleRead {
  zone: Zone;
  toLine: number;
  preset: AttackPreset;
  /** His side's points less theirs. */
  margin: number;
  /** In the match's last `lateS` seconds, or golden point. */
  late: boolean;
  /** His kicking stat and his Big Boot (traitBoost: 0, 1, 1.6, 2.2). */
  kicking: number;
  bigBoot: number;
  /** His side's centre-and-wingers mean Speed less the other side's. */
  paceEdge: number;
}

const mult = (x: number): number => Math.max(LAST_TACKLE.minMult, x);

/** How much more (or less) he wants to kick: his boot, and a lead late on. */
export function kickLean(r: LastTackleRead): number {
  const boot = mult(1 + LAST_TACKLE.bootPerKicking * (r.kicking - 60) + LAST_TACKLE.bigBoot * r.bigBoot);
  return boot * (r.late && r.margin > 0 ? LAST_TACKLE.leadKick : 1);
}

/** How much more (or less) he wants to keep the ball: quick outside backs, and a deficit late on. */
export function runLean(r: LastTackleRead): number {
  const pace = mult(1 + LAST_TACKLE.pacePerSpeed * r.paceEdge);
  return pace * (r.late && r.margin < 0 ? LAST_TACKLE.trailRun : 1);
}

/** The kick, run and pass weights for this last tackle. */
export function lastTackleWeights(r: LastTackleRead): Record<LastPlay, number> {
  const z = LAST_TACKLE.zones[r.zone];
  const p = LAST_TACKLE.presets[r.preset] ?? { kick: 1, pass: 1 };
  const keep = runLean(r);
  return {
    kick: r.toLine <= LAST_TACKLE.closeM ? 0 : z.kick * p.kick * kickLean(r),
    run: z.run * keep,
    pass: z.pass * p.pass * keep,
  };
}

const ORDER: readonly LastPlay[] = ['kick', 'run', 'pass'];

/** The call from the weights; `roll` is one draw in [0, 1). Nothing weighted: he runs it. */
export function chooseLastPlay(w: Record<LastPlay, number>, roll: number): LastPlay {
  const total = w.kick + w.run + w.pass;
  if (!(total > 0)) return 'run';
  let left = roll * total;
  for (const k of ORDER) {
    if (left < w[k]) return k;
    left -= w[k];
  }
  return 'pass';
}

/**
 * The chance of kicking early on the second-last: `base` (the style's
 * `earlyKick` near the line, `earlyTerritory` from deep) × `earlyScale`, plus
 * `earlyOwn20` for a territory kick from the own 20; an attacking kick leans
 * with his boot, a territory kick with his boot and the score (in front late:
 * more; behind late: less).
 */
export function earlyKickChance(base: number, r: LastTackleRead, attacking: boolean): number {
  const p = base * LAST_TACKLE.earlyScale + (!attacking && r.zone === 'own20' ? LAST_TACKLE.earlyOwn20 : 0);
  if (p <= 0) return 0;
  const lean = attacking
    ? mult(1 + LAST_TACKLE.bootPerKicking * (r.kicking - 60) + LAST_TACKLE.bigBoot * r.bigBoot)
    : kickLean(r) / (r.late && r.margin < 0 ? LAST_TACKLE.trailRun : 1);
  return Math.min(LAST_TACKLE.earlyMax, p * lean);
}
