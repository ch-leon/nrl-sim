import type { ControlInput } from '../controls';
import type { RosterEntry, TeamSheet } from '../../../sim/events';
import type { Position } from '../../../core/state';
import type { Body } from '../../core/body';
import type { Side } from '../../core/snapshot';
import type { Vec } from '../../core/vec';
import { AVERAGE, type ContestStats } from '../contest';
import { FULLBACK, HOOKER, KICKER } from '../roles';
import type { KickChoice } from '../tactics';
import type { TeamTactics } from '../presets';
import type { BreakRule } from '../breaks';
import type { TraitInstance } from '../../../data/traits';
import type { GasState } from '../gas';
import type { WrestleState } from '../wrestle';
import type { MatchLength } from '../rules';
import { BENCH } from '../bench';
import { NEUTRAL_CAPTAIN, type CaptainRead } from '../penalties';
import type { DifficultyEdge } from '../spread';
import type { CallInput } from '../calls';
import type { WeatherKind } from '../../../sim/events';
import type { PlayId, PlayMods } from '../../../data/plays';
import type { Edge } from '../plays';

interface Stats extends ContestStats { kicking: number }

export interface Player {
  side: Side;
  slot: number;
  name: string;
  /** Squad id or name: the look he wears on screen. */
  key: string;
  /** Squad id (when the sheet came from a real squad) and injury risk 1–100 (2f). */
  id?: string;
  injuryRisk: number;
  /** Hurt in a big hit (2f): slower until he comes off at the next stoppage. */
  hurt: boolean;
  stats: Stats;
  /** Special skills (BAK-208 §3); empty for most players. */
  traits: TraitInstance[];
  stamina: number;
  /** Legs (§8): 1 fresh … 0 spent, and how fast he drains (Stamina, Workhorse). */
  energy: number;
  drain: number;
  /** Already announced as cooked, COOKED! (until he recovers some). */
  gassed: boolean;
  body: Body;
  /** Metres run under his own steering since kick-off: presentation only (#630), the view's stride; nothing in the sim reads it. */
  odometer: number;
  pose: string;
  /** Hold `pose` until then (overrides run/idle). */
  poseUntil: number;
  /** No steering until then (in a tackle, on the ground, kicking). */
  lockUntil: number;
  slide: { from: Vec; to: Vec; t0: number; t1: number } | null;
  /** Not a pass option until then. */
  busyUntil: number;
  /** Won't commit to a tackle until then (just beaten). */
  cooldownUntil: number;
  /** Can't be tackled until then (just broke / fended one). */
  immuneUntil: number;
  /** Wants to sprint until then (just beat a man, or picked one off). */
  burstUntil: number;
  /** Tick he last beat a man with the ball (a tackle from behind soon after is RUN DOWN!). */
  brokeAt: number;
  /** Sprint and gas (§8.2): his tank, its size in seconds and refill time, whether he wants to go this tick and whether he is. */
  gas: GasState;
  tankS: number;
  refillS: number;
  wantsSprint: boolean;
  sprinting: boolean;
  /** Tick he last gained the ball. */
  catchTick: number;
  /** Last successful airborne kick reception, for the renderer only. */
  aerialCatchTick?: number;
  /** His last error, missed goal or sin bin and its tick (#667), for the renderer only: nothing in the sim reads it. */
  react?: { tick: number; kind: 'error' | 'miss' | 'bin' };
  /** Already chose pass-or-carry for this possession (decided once, at engagement). */
  decided: boolean;
  /** Defender index this carrier has already tried to step this possession. */
  steppedOn: number;
  /** A sidestep in progress: lateral metres still to cover, over this many ticks. */
  jink: { dy: number; ticks: number } | null;
  target: Vec;
  through: boolean;
  /** Coming off for this bench man (2b): he jogs to `subSpot` on the touchline first. */
  subFor: number | null;
  subAt: number;
  subSpot: Vec;
  /** …on the coach's Fresh legs call (#367): the swap is tagged and pays the call. */
  subFresh: boolean;
  /** In the sin bin (#71): back when the match clock reaches this many seconds (−1 on the field); he stands at `binSpot` on the touchline meanwhile. */
  binUntilS: number;
  binSpot: Vec;
}

/** A player on the bench: who he is and the legs he has. */
export interface BenchMan {
  name: string;
  key: string;
  id?: string;
  injuryRisk: number;
  /** Came off hurt (2f): never goes back on. */
  injured: boolean;
  stats: Stats;
  traits: TraitInstance[];
  stamina: number;
  energy: number;
  /** His position (Fresh legs, #367, brings on the same group first); absent when the sheet gave none. */
  position?: Position;
}

export type Phase =
  | { kind: 'restart'; t0: number; kicking: Side; from?: 'goal-line' }
  | { kind: 'set-piece'; t0: number; side: Side; spot: Vec; how: 'ptb' | 'tap'; player: number }
  | { kind: 'play' }
  | { kind: 'tackle'; t0: number; carrier: number; tackler: number; big: boolean; wrestle: WrestleState | null; wreck: number }
  | { kind: 'ruck'; t0: number; carrier: number; tackler: number; stage: 'down' | 'ptb' | 'dh'; handover: boolean; heldAt: number; down: number; pace: 'quick' | 'slow' | null; contactStartedTick?: number }
  | { kind: 'try'; t0: number; scorer: number }
  | { kind: 'half-time'; t0: number }
  | { kind: 'full-time' }
  | { kind: 'conversion'; t0: number; side: Side; kicker: number; spot: Vec; readyAt: number; good: boolean | null; what?: 'penalty' }
  | { kind: 'penalty'; t0: number; side: Side; spot: Vec; kicker: number; kicked: boolean }
  | { kind: 'goal'; t0: number; side: Side };

export interface PendingKick {
  at: number;
  kicker: number;
  to: Vec;
  receiver: number | null;
  peak: number;
  kickoff: boolean;
  kind: KickChoice;
  /** The trait behind the kick, if one shaped it. */
  trait?: string;
  /** A territory kick going for touch, or for the 40/20 (2d). */
  aim?: 'touch' | '40-20';
  /** A goal-line drop-out (2d): a kick-off from the try line. */
  dropOut?: boolean;
}

/**
 * A set play being run (#326): who it is for, the edge it goes to (and its
 * sign across the field), the men taking the ball in order (player indices;
 * `step` is the next to take it) and running decoy lines, the one roll's
 * outcome, and the bonus the last man carries into his first contact.
 */
export interface ScriptedPlay {
  side: Side;
  id: PlayId;
  by: 'coach' | 'half';
  edge: Edge;
  ySign: 1 | -1;
  men: number[];
  step: number;
  decoys: { idx: number; latM: number }[];
  outcome: 'ok' | 'breakdown' | 'intercept';
  bonus: PlayMods;
  /** The man carrying the bonus (−1 until the last man has the ball), and whether his first contact has used it. */
  bonusFor: number;
  bonusUsed: boolean;
  until: number;
}

export const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');

/** Who takes a role's duties when its man is in the sin bin (#71), in order: the five-eighth kicks, the prop plays dummy-half, a winger drops back. */
export const STAND_INS: Readonly<Record<number, readonly number[]>> = {
  [KICKER]: [4, 0, 6, 3],
  [HOOKER]: [7, 8, 5, 4],
  [FULLBACK]: [1, 2, 3, 4],
};

/** What a territory kick is going for, said when it leaves the boot. */
export const AIM_TEXT: Readonly<Record<'touch' | '40-20', (name: string) => string>> = {
  touch: (n) => `${n} kicks for touch`,
  '40-20': (n) => `${n} goes for the 40/20`,
};

export const KICK_TEXT: Readonly<Record<KickChoice, (name: string) => string>> = {
  long: (n) => `${n} kicks long on the last`,
  bomb: (n) => `${n} puts up a bomb`,
  grubber: (n) => `${n} grubbers it through for the in-goal`,
  chip: (n) => `${n} chips over the top and chases`,
  'cross-field': (n) => `${n} goes cross-field for the winger`,
};

export interface LiveOptions {
  controls?: ControlInput[] | undefined;
  /** Lab and tests: start everyone on these legs (1 = a kick-off). */
  energy?: number;
  /** Two Nines halves unless told otherwise (the balance harness plays single stretches). */
  length?: MatchLength;
  /** The weather (2f): clear unless told. */
  weather?: WeatherKind;
  /** Injury chance multiplier (the difficulty's, as the old engine takes it). */
  injuryRate?: number;
  /** Coach calls by tick (#73): read as the match plays, so a caller may add to the list as it runs (the lab's chips). */
  calls?: CallInput[];
  /** Sides whose coach makes his own calls (N9.6). The game gives rival coaches one when `calls.ai.on` (aiCoachSides). */
  aiCoach?: Side[];
  /** A final (N9.4): level at full time, play golden point — the next score wins. */
  goldenPoint?: boolean;
  /** Plan changes by tick (N11): read like the calls, each taking effect at the next restart. */
  plans?: PlanInput[];
  /**
   * A plan at the breaks (N13.5). With `breakRuleSides`, those sides are asked
   * at half-time and after a try. Absent, and no sides named: the default rule
   * is not used, and the match is unchanged. A function is not cloneable, so
   * the worker and a replay pass sides only and the sim uses the default rule.
   */
  breakRule?: BreakRule;
  /** Sides the break rule runs for. Empty or absent, with no function: nobody. */
  breakRuleSides?: readonly Side[];
  /** Rival-only difficulty context; serialisable for workers and replays (#469). */
  aiRival?: { side: 'home' | 'away'; difficulty: import('../../../config').Difficulty };
  /** The difficulty (N12.2): rating points the player's rival plays with on every stat, after the spread (spread.ts). Absent on Normal. */
  difficultyEdge?: DifficultyEdge;
}

/** A change of plan at a break (N11): the side's presets from the next restart. A match is { seed, sheets, calls[], plans[] }. */
export interface PlanInput {
  tick: number;
  side: Side;
  tactics: TeamTactics;
}

/** The sheet's captain as the penalty call reads him (N11): his Footy IQ and Hothead level; neutral when it names none. */
export function captainOf(sheet: TeamSheet): CaptainRead {
  const c = sheet.captain !== undefined ? sheet.roster?.find((e) => e.id === sheet.captain) : undefined;
  if (!c) return NEUTRAL_CAPTAIN;
  return { footyIQ: c.stats?.footyIQ ?? NEUTRAL_CAPTAIN.footyIQ, hothead: c.traits?.find((t) => t.id === 'hothead')?.level ?? 0 };
}

/** A sheet's bench, as many as the bench holds. */
export function benchOf(sheet: TeamSheet): BenchMan[] {
  return (sheet.bench ?? []).slice(0, BENCH.size).map((e) => {
    const traits = e.traits ? [...e.traits] : [];
    return { name: e.name, key: e.id ?? e.name, ...(e.id ? { id: e.id } : {}), injuryRisk: e.injuryRisk ?? 20, injured: false, stats: statsOf(e), traits, stamina: e.stats?.stamina ?? 50, energy: 1, ...(e.position ? { position: e.position } : {}) };
  });
}

export function statsOf(entry: RosterEntry | undefined): Stats {
  const s = entry?.stats;
  return s ? { strength: s.strength, speed: s.speed, handling: s.handling, kicking: s.kicking, footyIQ: s.footyIQ } : { ...AVERAGE, kicking: 50 };
}
