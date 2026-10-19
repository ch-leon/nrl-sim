// src/match/league/live.ts — the live Nines set (BAK-207 #85, Phase 1).
//
// One continuous simulation the view draws: kick-off, carries at the gaps in
// the line, defenders committing and tackling when they actually reach the
// carrier, a stats-driven contest (held / big hit / broken / fend / offload),
// tackled → down → play-the-ball → heel → dummy-half → pass, markers and a
// line that retreats 10 m and rushes up again, the last-tackle kick with a
// chase and catch, handovers, errors, tries and the restart. Nothing is
// implied: every transition is something a player physically does on the
// field, and every carry ends in exactly one of tackle / break / error / kick.
//
// Legs (BAK-208 §8, F): every player's energy drains with metres run and
// contact and costs him pace and contest odds when low; a held tackle is a
// wrestle whose length sets the play-the-ball speed. Players cruise and sprint
// only when it matters, spending gas (BAK-208 §8.2, F2).
//
// The match (BAK-207 §5.1, 2a): a clock that runs while the ball is in play,
// two halves with the ends swapped and legs part-restored at half-time, the
// siren and play on to the next dead ball, full time, points. Conversions,
// touch, penalties and weather come later in Phase 2 (#86).
import { SET_TACKLES } from '../../config';
import { makeRng, type Rng } from '../../utils/rng';
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { TICK_S, type MatchSim } from '../core/engine';
import { FIELD_LENGTH, MID_Y, clampToGround, inGoal } from '../core/field';
import { arrive, integrate, makeBody, maxSpeedFor, separate, speedOf, type Body } from '../core/body';
import { CARRY_LIFT, PASS_SPEED, bounceFlight, flightAt, grubberFlight, kickFlight, landed, passFlight, rollFlight, type BallState } from '../core/ball';
import type { PlayerSnap, Side, SimEvent, Snapshot } from '../core/snapshot';
import { add, clamp, dist, dot, norm, scale, sub, type Vec } from '../core/vec';
import { AVERAGE, BASE, angleFrom, interceptChance, knockOnChance, resolveContest, stepChance, type ContestStats, type Situation } from './contest';
import { FULLBACK, HOOKER, KICKER, PLAYERS, ROLES, formationTarget } from './roles';
import {
  MAX_LAT_M, RUN_CLOSE_M, RUN_IT_CHANCE, RUN_IT_ZONE_M, bombTarget, chipTarget, chooseKick, crossFieldTarget, gapTarget, grubberTarget, intercept,
  kickTarget, kickoffTarget, pickReceiver, supportSpots, type Candidate, type KickChoice,
} from './tactics';
import { DEFAULT_TACTICS, attackPlan, defencePlan, zoneOf, type AttackPlan, type DefencePlan, type TeamTactics } from './presets';
import { EDGE_COST, FINISHER_M, TRAIT_PTS, announce, bootMult, contestTraits, interceptTraits, speedMult, stepTraits } from './traits';
import { traitBoost, type TraitInstance } from '../../data/traits';
import { FATIGUE, afterRun, drainRate, legsSpeed, tiredness } from './fatigue';
import { GAS, canSprint, paceMult, refillSeconds, runCostMult, stepGas, tankSeconds, type GasState } from './gas';
import { WRESTLE, driveSpeed, fightOf, gripOf, holdOf, ruckTicks, wrestleTick, type WrestleState } from './wrestle';
import { NINES, clockText, fullMatch, type MatchLength } from './rules';

// ── Tuning ─────────────────────────────────────────────────────────────────
/**
 * The live sim's knobs (tuning reference §2–§6). Ticks are 20 Hz, distances
 * metres. Overridable by name in balance experiments (tuning.ts).
 */
export const LIVE = {
  // Timing (ticks)
  contactTicks: 9,
  downTicks: 10,
  ptbTicks: 11,
  rollTicks: 4,
  dhHoldTicks: 6,
  tryTicks: 50,
  /** A kick-off waits for everyone to be set, at least this long and at most RESTART_MAX. */
  restartTicks: 40,
  restartMaxTicks: 280,
  /** A receiver must be this close to where a pass comes down to take it; a high ball gives him a little longer to get under it. */
  catchReach: 1.8,
  kickCatchReach: 2.5,
  /** On the last tackle the defending fullback drops this far behind his line, where the kick will land. */
  fullbackDeepM: 16,
  fullbackLastM: 24,
  /** After a pass or catch, no new pass for this long. */
  passCooldown: 12,
  /** A tackled carrier can't be the next receiver for this long after his ptb. */
  busyAfterPtb: 24,
  /** After beating a man the carrier goes (sprints, gas permitting) for at least this long (§8.2). */
  burstTicks: 16,
  /** Caught from behind this soon after breaking is RUN DOWN! (6 s). */
  runDownTicks: 120,
  /** A Wrecking Ball held in the tackle keeps his legs pumping this often per level (more fight in the wrestle, wrestle.ts). */
  wreckDriveChance: 0.3,
  /** A Playmaker's cut-out reach grows this much per level over the normal pass width, and he minds width less. */
  cutOutPerLevelM: 4,
  playmakerWidth: 0.25,
  /** …and this often per level he throws the cut-out ball to the widest man he can reach. */
  cutOutChance: 0.15,
  /** After beating a tackler the carrier can't be hit again for this long. */
  immuneTicks: 8,
  /** A beaten tackler sits out this long before committing again. */
  beatenCooldown: 30,
  /** The kicker runs this long with the ball before putting boot to it. */
  kickRunTicks: 14,
  kickLockTicks: 8,
  kickContactTicks: 3,
  passPoseTicks: 5,

  // Distances (metres)
  /** Who sprints (§8.2): the carrier with no defender this far ahead and this close to his lane; a defender closing the last stretch; support within reach of a break. */
  sprintLaneM: 15,
  sprintLaneW: 3,
  sprintCloseM: 8,
  supportSprintM: 10,
  /** A free defender this close to a wrestle comes in to help (and joins it on reaching the carrier). */
  joinM: 6,
  /** Carrier starts deciding (pass / into contact) with a defender this close. */
  engageM: 4.5,
  /** A defender this close to the carrier makes the tackle. */
  tackleReach: 1.2,
  /** The defensive line stands this far off the ruck. */
  onsideM: 10,
  /** A big hit drives the carrier back this far. */
  driveBack: 2.5,
  /** A support runner this close can take an offload. */
  offloadM: 5,
  /** Chance a catcher spills a kick: alone, and with a chaser inside PRESSURE_M (less by Skill). */
  dropChance: 0.06,
  dropPressured: 0.18,
  /** Kick chasers this far from the landing point still run flat out at it. */
  chaseThroughM: 2,
  /** On the second-last tackle inside this, the kicker goes early this often (grubber or chip). */
  earlyKickM: 25,
  /** Loose ball picked up within this reach. */
  pickupM: 0.9,
  /** A defender this close to a receiver makes the catch a pressured one. */
  pressureM: 2,
  /** A lone defender this close can be stepped (checked once per defender). */
  stepRange: 2.6,
  /** Another defender within this of the carrier makes it a two-man tackle. */
  secondManM: 3.5,
  /** A defender this close to the pass line can pick it off. */
  laneM: 1.5,
  /** Markers may not leave the ruck to tackle until this long after the ball is played. */
  markerReleaseTicks: 14,
  /** A pass to the side with the overlap gets this much preference (scaled up by an expansive plan). */
  overlapPrefer: 0.8,
  /** Players within this box either side of the passer count toward the overlap. */
  shiftM: 20,
  /** A step jinks the carrier this far sideways, over this many ticks. */
  stepJinkM: 1.6,
  stepJinkTicks: 4,
  /** Carrying the ball costs a little pace: nobody sprints as fast with a footy under the arm. */
  carrySpeed: 0.95,
  /** A receiver runs through the catch point by this much, not to it, so he takes the ball at pace. */
  runOnM: 3,
  /** As the ball is heeled the backline comes up, aiming this far ahead of their standing spots so they are moving when the pass arrives. */
  ruckAdvanceM: 3,
  /** Chance the dummy-half darts instead of passing. */
  dartChance: 0.08,
  /** Engaged carrier's base chance to pass (+ Skill/300, + Playmaker, + preset). */
  passBase: 0.3,
};

interface Stats extends ContestStats {}

interface Player {
  side: Side;
  slot: number;
  name: string;
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
  /** Already chose pass-or-carry for this possession (decided once, at engagement). */
  decided: boolean;
  /** Defender index this carrier has already tried to step this possession. */
  steppedOn: number;
  /** A sidestep in progress: lateral metres still to cover, over this many ticks. */
  jink: { dy: number; ticks: number } | null;
  target: Vec;
  through: boolean;
}

type Phase =
  | { kind: 'restart'; t0: number; kicking: Side }
  | { kind: 'play' }
  | { kind: 'tackle'; t0: number; carrier: number; tackler: number; big: boolean; wrestle: WrestleState | null; wreck: number }
  | { kind: 'ruck'; t0: number; carrier: number; tackler: number; stage: 'down' | 'ptb' | 'dh'; handover: boolean; heldAt: number; down: number; pace: 'quick' | 'slow' | null }
  | { kind: 'try'; t0: number; scorer: number }
  | { kind: 'half-time'; t0: number }
  | { kind: 'full-time' };

interface PendingKick {
  at: number;
  kicker: number;
  to: Vec;
  receiver: number | null;
  peak: number;
  kickoff: boolean;
  kind: KickChoice;
  /** The trait behind the kick, if one shaped it. */
  trait?: string;
}

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');

const KICK_TEXT: Readonly<Record<KickChoice, (name: string) => string>> = {
  long: (n) => `${n} kicks long on the last`,
  bomb: (n) => `${n} puts up a bomb`,
  grubber: (n) => `${n} grubbers it through for the in-goal`,
  chip: (n) => `${n} chips over the top and chases`,
  'cross-field': (n) => `${n} goes cross-field for the winger`,
};

/**
 * Forward metres a runner covers in `t` seconds when he steers flat out
 * downfield from forward speed `v0` (negative: still backing up, so he stops
 * first), accelerating at `a` up to `vMax`.
 */
export function runOn(v0: number, a: number, vMax: number, t: number): number {
  if (t <= 0) return 0;
  if (v0 < 0) {
    const ts = Math.min(t, -v0 / a);
    return v0 * ts + 0.5 * a * ts * ts + runOn(0, a, vMax, t - ts);
  }
  const vEnd = Math.min(vMax, v0 + a * t);
  const tAcc = Math.max(0, (vEnd - v0) / a);
  return v0 * tAcc + 0.5 * a * tAcc * tAcc + vEnd * (t - tAcc);
}

export interface LiveOptions {
  /** Lab and tests: start everyone on these legs (1 = a kick-off). */
  energy?: number;
  /** Two Nines halves unless told otherwise (the balance harness plays single stretches). */
  length?: MatchLength;
}

function statsOf(entry: RosterEntry | undefined): Stats {
  const s = entry?.stats;
  return s ? { strength: s.strength, speed: s.speed, skill: s.skill, footyIQ: s.footyIQ } : { ...AVERAGE };
}

export class LiveSim implements MatchSim {
  tick = 0;
  finished = false;
  private readonly rng: Rng;
  private readonly players: Player[];
  private readonly names: Record<Side, string>;
  /** How each side plays (BAK-208 §5). */
  readonly tactics: Record<Side, TeamTactics>;
  private ball!: BallState;
  private phase!: Phase;
  private attacking: Side = 'home';
  private dir: 1 | -1 = 1;
  private tackles = 0;
  private lastPlay = false;
  /** Where the play-the-ball is / was (the line forms off it). */
  private mark: Vec = { x: 50, y: MID_Y };
  /** The defensive line's x. */
  private lineX = 60;
  private pendingKick: PendingKick | null = null;
  /** Who kicked the ball now in the air (he leads the chase). */
  private lastKicker = -1;
  /** The kick in the air is a kick-off (chased as a line, not for a regather). */
  private kickoffUp = false;
  /** The kicker's call for this last tackle (rolled once): run it, or which kick. */
  private kickCall: 'run' | KickChoice | null = null;
  /** A loose ball only this side may take (after a knock-on); null = anyone's. */
  private looseFor: Side | null = null;
  /** The last ruck's markers and the tick its ball was played (they hold until released). */
  private markers: number[] = [];
  private ruckPlayedAt = -1000;
  /** Extra spill chance on the pass in the air (a Razzle Dazzle offload). */
  private spillExtra = 0;
  /** The trait to credit when the pass in the air is picked off. */
  private interceptTrait: string | undefined;
  private events: SimEvent[] = [];
  readonly tries: Record<Side, number> = { home: 0, away: 0 };
  readonly points: Record<Side, number> = { home: 0, away: 0 };
  /** The clock (BAK-207 §5.1, 2a): which half, ticks of play gone in it, time up. */
  private readonly length: MatchLength;
  private half = 1;
  private clockTicks = 0;
  private siren = false;
  private sirenAt = 0;
  /** 1 in the first half (home attacks +x), -1 after the ends swap. */
  private ends: 1 | -1 = 1;
  /** The side that received the opening kick-off kicks off the second half. */
  private readonly firstReceiver: Side = 'home';

  constructor(home: TeamSheet, away: TeamSheet, seed: number, opts: LiveOptions = {}) {
    this.rng = makeRng(seed);
    this.length = opts.length ?? fullMatch();
    this.names = { home: home.name, away: away.name };
    this.tactics = { home: home.tactics ?? DEFAULT_TACTICS, away: away.tactics ?? DEFAULT_TACTICS };
    this.players = [...this.buildSide(home, 'home'), ...this.buildSide(away, 'away')];
    const energy = Math.max(0, Math.min(1, opts.energy ?? 1));
    for (const p of this.players) {
      p.energy = energy;
      p.gassed = energy < FATIGUE.spentAt;
      p.gas.gas = energy;
    }
    this.setForKickoff(other(this.firstReceiver));
  }

  /** Ball to the kicking side's kicker and everyone on his kick-off spot (the start of each half). */
  private setForKickoff(kicking: Side): void {
    this.ball = { kind: 'held', by: this.idx(kicking, KICKER) };
    this.phase = { kind: 'restart', t0: this.tick, kicking };
    this.attacking = other(kicking);
    this.dir = this.dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    this.kickCall = null;
    this.looseFor = null;
    this.pendingKick = null;
    this.markers = [];
    this.assignTargets();
    for (const p of this.players) {
      p.body.pos = { ...p.target };
      p.body.vel = { x: 0, y: 0 };
      p.body.heading = { x: this.dirOf(p.side), y: 0 };
    }
  }

  /** The way a side attacks this half. */
  private dirOf(s: Side): 1 | -1 {
    return s === 'home' ? this.ends : this.ends === 1 ? -1 : 1;
  }

  private buildSide(sheet: TeamSheet, side: Side): Player[] {
    const roster = sheet.roster ?? [];
    const used = new Set<number>();
    return ROLES.map((role, slot) => {
      let i = roster.findIndex((r, k) => !used.has(k) && r.position === role.name);
      if (i < 0) i = roster.findIndex((_, k) => !used.has(k));
      if (i >= 0) used.add(i);
      const entry = roster[i];
      const stats = statsOf(entry);
      const traits = entry?.traits ? [...entry.traits] : [];
      const stamina = entry?.stats?.stamina ?? 50;
      return {
        side,
        slot,
        name: entry?.name ?? `${sheet.name} #${slot + 1}`,
        stats,
        traits,
        stamina,
        energy: 1,
        drain: drainRate(stamina, traits),
        gassed: false,
        body: makeBody({ x: 50, y: MID_Y }, maxSpeedFor(stats.speed), { x: this.dirOf(side), y: 0 }),
        pose: 'idle',
        poseUntil: 0,
        lockUntil: 0,
        slide: null,
        busyUntil: 0,
        cooldownUntil: 0,
        immuneUntil: 0,
        burstUntil: 0,
        brokeAt: -1000,
        gas: { gas: 1, blown: false },
        tankS: tankSeconds(stamina, traits),
        refillS: refillSeconds(stamina),
        wantsSprint: false,
        sprinting: false,
        catchTick: 0,
        decided: false,
        steppedOn: -1,
        jink: null,
        target: { x: 50, y: MID_Y },
        through: false,
      };
    });
  }

  private idx(side: Side, slot: number): number {
    return (side === 'home' ? 0 : PLAYERS) + slot;
  }
  private at(side: Side, slot: number): Player {
    return this.players[this.idx(side, slot)]!;
  }
  private indexOf(p: Player): number {
    return this.idx(p.side, p.slot);
  }
  private holder(): Player | null {
    return this.ball.kind === 'held' ? this.players[this.ball.by]! : null;
  }
  private ballPos(): Vec {
    const b = this.ball;
    if (b.kind === 'held') return this.players[b.by]!.body.pos;
    if (b.kind === 'flight') return flightAt(b, this.tick).pos;
    return b.pos;
  }
  private locked(p: Player): boolean {
    return this.tick < p.lockUntil;
  }
  private emit(kind: string, text: string, p?: Player, trait?: string): void {
    this.events.push({ tick: this.tick, kind, text, ...(p ? { side: p.side, slot: p.slot, player: p.name } : {}), ...(trait ? { trait } : {}) });
  }
  /** Metres from the carrier to the line he is attacking. */
  private toLine(p: Player): number {
    return this.dir > 0 ? FIELD_LENGTH - p.body.pos.x : p.body.pos.x;
  }
  /** The attacking side's plan for the zone the carrier is in. */
  private atkPlan(h: Player): AttackPlan {
    return attackPlan(this.tactics[this.attacking].attack, zoneOf(this.toLine(h)));
  }
  /** How the defending side's line is set. */
  private defPlan(): DefencePlan {
    return defencePlan(this.tactics[other(this.attacking)].defence);
  }
  /** After a break the carrier goes: he sprints while his gas lasts (a Jets player has more of it). */
  private burst(c: Player): void {
    c.immuneUntil = this.tick + LIVE.immuneTicks;
    c.burstUntil = this.tick + LIVE.burstTicks;
    c.brokeAt = this.tick;
  }
  /** The carrier is through: in front of the defensive line. */
  private lineBroken(): boolean {
    const h = this.holder();
    return h !== null && h.side === this.attacking && (h.body.pos.x - this.lineX) * this.dir > 0;
  }
  /** Nobody in front of him in his lane, close: room to put the foot down. */
  private laneClear(c: Player): boolean {
    return !this.side(other(c.side)).some((d) => {
      if (this.locked(d)) return false;
      const ahead = (d.body.pos.x - c.body.pos.x) * this.dir;
      return ahead > 0 && ahead < LIVE.sprintLaneM && Math.abs(d.body.pos.y - c.body.pos.y) < LIVE.sprintLaneW;
    });
  }
  /** Caught from behind by a man sprinting at him, soon after he broke: shown and said. */
  private runDown(c: Player, t: Player, sit: Situation): void {
    if (sit.angle !== 'behind' || !t.sprinting || this.tick - c.brokeAt > LIVE.runDownTicks) return;
    this.emit('run-down', `${t.name} runs down ${c.name}!`, t);
  }
  private lock(p: Player, pose: string, ticks: number, slideTo?: Vec): void {
    p.pose = pose;
    p.poseUntil = this.tick + ticks;
    p.lockUntil = this.tick + ticks;
    p.body.vel = { x: 0, y: 0 };
    p.slide = slideTo ? { from: { ...p.body.pos }, to: clampToGround(slideTo, 0.5), t0: this.tick, t1: this.tick + ticks } : null;
  }
  private side(s: Side): Player[] {
    return s === 'home' ? this.players.slice(0, PLAYERS) : this.players.slice(PLAYERS);
  }

  // ── Tick ──────────────────────────────────────────────────────────────────
  step(): void {
    if (this.finished) return;
    this.tick++;
    this.events = [];
    if (this.phase.kind === 'half-time') this.stepHalfTime(this.phase);
    else {
      this.launchPendingKick();
      this.landings();
    }
    switch (this.phase.kind) {
      case 'restart':
        this.stepRestart(this.phase);
        break;
      case 'play':
        this.stepPlay();
        break;
      case 'tackle':
        this.stepTackle(this.phase);
        break;
      case 'ruck':
        this.stepRuck(this.phase);
        break;
      case 'try':
        this.stepTry(this.phase);
        break;
      default:
        break;
    }
    this.assignTargets();
    this.move();
    this.runClock();
  }

  // ── Clock ─────────────────────────────────────────────────────────────────
  /** The clock runs while the ball is in play; at time up the siren goes and play carries on to the next dead ball. */
  private runClock(): void {
    const k = this.phase.kind;
    if (k !== 'play' && k !== 'tackle' && k !== 'ruck') return;
    const halfTicks = Math.round((this.length.halfMinutes * 60) / TICK_S);
    if (this.clockTicks < halfTicks) this.clockTicks++;
    if (!this.siren && this.clockTicks >= halfTicks) {
      this.siren = true;
      this.sirenAt = this.tick;
      this.emit('siren', this.half < this.length.halves ? 'The half-time siren — play on until the ball is dead' : 'The full-time siren — play on until the ball is dead');
      // Time up with a man still down from the tackle: the ball is already dead.
      const ph = this.phase;
      if (ph.kind === 'ruck' && ph.stage === 'down') {
        this.endHalf();
        return;
      }
    }
    // Belt and braces: a passage that never goes dead still ends.
    if (this.siren && this.tick - this.sirenAt >= Math.round(NINES.playOnMaxS / TICK_S)) this.endHalf();
  }

  /** The ball is dead after the siren: half-time, or full time. */
  private endHalf(): void {
    const score = `${this.names.home} ${this.points.home} – ${this.points.away} ${this.names.away}`;
    this.pendingKick = null;
    if (this.half < this.length.halves) {
      this.emit('half-time', `Half-time: ${score}`);
      this.phase = { kind: 'half-time', t0: this.tick };
    } else {
      this.emit('full-time', `Full time: ${score}`);
      this.phase = { kind: 'full-time' };
      this.finished = true;
    }
  }

  /** The break: then legs part-restored, a full tank, ends swapped, and the side that received first kicks off. */
  private stepHalfTime(ph: Extract<Phase, { kind: 'half-time' }>): void {
    if (this.tick < ph.t0 + NINES.halfTimeTicks) return;
    for (const p of this.players) {
      p.energy += (1 - p.energy) * NINES.halfTimeLegsBack;
      p.gas = { gas: p.energy, blown: false };
      p.gassed = p.energy < FATIGUE.spentAt;
      p.pose = 'idle';
      p.poseUntil = p.lockUntil = p.busyUntil = p.cooldownUntil = p.immuneUntil = p.burstUntil = 0;
      p.brokeAt = -1000;
      p.slide = null;
      p.jink = null;
      p.decided = false;
      p.steppedOn = -1;
    }
    this.half++;
    this.ends = this.ends === 1 ? -1 : 1;
    this.clockTicks = 0;
    this.siren = false;
    this.setForKickoff(this.firstReceiver);
  }

  /** Seconds of match time gone since the kick-off (the clock, both halves). */
  get matchSeconds(): number {
    return (this.half - 1) * this.length.halfMinutes * 60 + this.clockTicks * TICK_S;
  }

  /** This tick's events without building a snapshot (headless runs). */
  get tickEvents(): readonly SimEvent[] {
    return this.events;
  }

  // ── Ball resolution ───────────────────────────────────────────────────────
  private launchPendingKick(): void {
    const k = this.pendingKick;
    if (!k || this.tick < k.at) return;
    this.pendingKick = null;
    const kicker = this.players[k.kicker]!;
    this.ball = k.kind === 'grubber' ? grubberFlight(kicker.body.pos, k.to, this.tick) : kickFlight(kicker.body.pos, k.to, this.tick, k.receiver, k.peak);
    this.lastKicker = k.kicker;
    this.kickoffUp = k.kickoff;
    this.kickCall = null;
    const receiving = other(kicker.side);
    this.attacking = receiving;
    this.dir = this.dirOf(receiving);
    this.tackles = 0;
    this.lastPlay = false;
    this.lineX = k.to.x + this.dir * LIVE.onsideM;
    if (k.kickoff) this.emit('kickoff', `${kicker.name} kicks off`, kicker);
    else {
      this.emit('kick', KICK_TEXT[k.kind](kicker.name), kicker, k.trait);
      this.events[this.events.length - 1]!.detail = k.kind;
    }
    if (this.phase.kind !== 'play') this.phase = { kind: 'play' };
  }

  private landings(): void {
    const b = this.ball;
    if (b.kind === 'flight') {
      if (!landed(b, this.tick)) return;
      if (b.via === 'bounce') {
        // Hops done: it lies there for whoever gets to it.
        this.ball = { kind: 'loose', pos: { ...b.to }, vel: { x: 0, y: 0 } };
        return;
      }
      // A kick is anyone's: whoever is under it takes it, the nominated man on a tie.
      const r = b.via === 'kick' ? this.underKick(b.to, b.receiver) : b.receiver !== null ? this.players[b.receiver] : undefined;
      if (!r || (b.via !== 'roll' && dist(r.body.pos, b.to) > (b.via === 'kick' ? LIVE.kickCatchReach : LIVE.catchReach))) {
        // Nobody under it: it comes down and bounces on in the direction it was going.
        if (b.via === 'pass') this.emit('loose', r ? `${r.name} can't get to the pass — loose ball` : 'The pass goes to ground — loose ball', r);
        if (b.bounces > 0) {
          // A grubber has done its hopping: it lies where it stopped.
          this.ball = { kind: 'loose', pos: { ...b.to }, vel: { x: 0, y: 0 } };
        } else {
          const dir = sub(b.to, b.from);
          const bf = bounceFlight(b.to, dir, this.tick, b.via === 'kick' ? 4 + this.rng.next() * 4 : 2) as Extract<BallState, { kind: 'flight' }>;
          bf.to = clampToGround(bf.to, 0.5); // never over the dead-ball line
          this.ball = bf;
        }
        this.looseFor = null;
        return;
      }
      const pressured = this.side(other(r.side)).some((d) => !this.locked(d) && dist(d.body.pos, r.body.pos) < LIVE.pressureM);
      if (b.via === 'kick' && this.rng.next() < (pressured ? LIVE.dropPressured - (r.stats.skill - 50) / 300 : LIVE.dropChance)) {
        // Spilled under the high ball: a scramble for anyone.
        this.emit('drop', `${r.name} spills the kick under pressure!`, r);
        this.ball = bounceFlight(b.to, { x: (this.rng.next() - 0.5) * 2, y: (this.rng.next() - 0.5) * 2 }, this.tick, 2, 12, 2);
        this.looseFor = null;
        return;
      }
      const spillExtra = this.spillExtra;
      const picked = this.interceptTrait;
      this.spillExtra = 0;
      this.interceptTrait = undefined;
      if (b.via === 'pass' && r.side === this.attacking && this.rng.next() < knockOnChance(r.stats.skill, pressured, false, spillExtra)) {
        // Spilled: the ball squirts forward and the defence takes over.
        this.emit('error', spillExtra > 0 ? `${r.name} can't hold the wild offload — knock-on` : `${r.name} spills it — knock-on`, r);
        this.ball = bounceFlight(b.to, { x: this.dir, y: (this.rng.next() - 0.5) * 0.6 }, this.tick, 2.5, 12, 2);
        this.turnover();
        this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
        if (this.siren) this.endHalf(); // a knock-on kills the ball
        return;
      }
      this.ball = { kind: 'held', by: this.indexOf(r) };
      r.catchTick = this.tick;
      r.decided = false;
      r.steppedOn = -1;
      if (b.via === 'pass' && r.side !== this.attacking) {
        this.emit('intercept', `${r.name} picks it off!`, r, picked);
        this.turnover();
        r.burstUntil = this.tick + LIVE.burstTicks;
        return;
      }
      if (b.via === 'kick' && r.side !== this.attacking) {
        // The kicking side got there first: their ball, a fresh set (or a try, next tick, if he is over the line).
        this.lock(r, 'catch', 3);
        this.emit('regather', `${r.name} regathers the kick!`, r);
        this.turnover();
        return;
      }
      if (b.via === 'kick') {
        this.lock(r, 'catch', 4);
        this.mark = { ...r.body.pos };
        this.emit('set-start', `${r.name} takes the kick — ${this.names[this.attacking]} ball`, r);
      }
      return;
    }
    if (b.kind === 'loose') {
      // Whoever gets there first picks it up (the chasers are steered at it).
      let best: Player | null = null;
      let bd = LIVE.pickupM;
      for (const p of this.players) {
        if (this.looseFor && p.side !== this.looseFor) continue;
        if (this.locked(p)) continue;
        const d = dist(p.body.pos, b.pos);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (best) {
        this.ball = { kind: 'held', by: this.indexOf(best) };
        best.catchTick = this.tick;
        best.decided = false;
        if (best.side !== this.attacking) this.turnover();
        this.mark = { ...best.body.pos };
        this.emit('set-start', `${best.name} scoops it up — ${this.names[this.attacking]} ball`, best);
        if (this.phase.kind !== 'play') this.phase = { kind: 'play' };
      }
    }
  }

  /** Who takes a kick coming down at `at`: the nearest free player within reach, the nominated man on a near-tie. */
  private underKick(at: Vec, nominated: number | null): Player | undefined {
    let best: Player | undefined;
    let bd = Infinity;
    for (const p of this.players) {
      if (this.locked(p)) continue;
      let d = dist(p.body.pos, at);
      if (this.indexOf(p) === nominated) d -= 0.3;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  /** Possession changes hands where the ball is; a fresh set for the other side. */
  private turnover(): void {
    this.kickCall = null;
    this.attacking = other(this.attacking);
    this.dir = this.dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    const bp = this.ballPos();
    this.mark = { ...bp };
    this.lineX = bp.x + this.dir * LIVE.onsideM;
    this.phase = { kind: 'play' };
  }

  // ── Phases ────────────────────────────────────────────────────────────────
  private stepRestart(ph: Extract<Phase, { kind: 'restart' }>): void {
    if (this.tick < ph.t0 + LIVE.restartTicks || this.pendingKick) return;
    const kicker = this.at(ph.kicking, KICKER);
    // Wait until the teams are set (the kicker on the spot, everyone near his).
    const ready = dist(kicker.body.pos, kicker.target) < 1 && this.players.every((p) => dist(p.body.pos, p.target) < 3);
    if (!ready && this.tick < ph.t0 + LIVE.restartMaxTicks) return;
    const receiving = other(ph.kicking);
    const rd = this.dirOf(receiving);
    this.lock(kicker, 'kick', LIVE.kickLockTicks);
    this.pendingKick = {
      at: this.tick + LIVE.kickContactTicks,
      kicker: this.indexOf(kicker),
      to: kickoffTarget(rd, this.rng.next()),
      receiver: this.idx(receiving, FULLBACK),
      peak: 16,
      kickoff: true,
      kind: 'long',
    };
  }

  private stepPlay(): void {
    const h = this.holder();
    if (!h || this.locked(h)) return;
    if (h.side !== this.attacking) {
      // Defender has it (an intercept / pickup path) — it's his side's ball now.
      this.turnover();
      return;
    }
    // Try: over the line with the ball.
    if (inGoal(h.body.pos, this.dir) || (this.dir > 0 ? h.body.pos.x >= FIELD_LENGTH : h.body.pos.x <= 0)) {
      this.score(h);
      return;
    }
    const defenders = this.side(other(this.attacking));
    const committed = this.committed(h, defenders);
    const nearest = committed[0];
    const nearD = nearest ? dist(nearest.body.pos, h.body.pos) : Infinity;

    // Last tackle: the kicker makes one call for the play — run it when he's
    // on the line (or fancies it inside 40), else a kick for the zone — then
    // runs a few steps and puts boot to ball.
    const toLine = this.toLine(h);
    const plan = this.atkPlan(h);
    const dplan = this.defPlan();
    const zone = zoneOf(toLine);
    const early = this.tackles === SET_TACKLES - 2 && (toLine <= LIVE.earlyKickM || zone === 'own20' || zone === 'ownHalf');
    if ((this.lastPlay || early) && h.slot === KICKER) {
      if (this.kickCall === null) this.kickCall = this.lastPlay ? this.callLastPlay(toLine, plan) : this.callEarlyKick(toLine, plan);
      if (this.kickCall !== 'run' && (this.tick - h.catchTick >= LIVE.kickRunTicks || nearD < LIVE.engageM)) {
        this.pendingKick = this.planKick(h, this.kickCall);
        this.lock(h, 'kick', LIVE.kickLockTicks);
        return;
      }
    }

    // Engaged: decide once — shift it to a better option out the back, or
    // take the line on. Re-deciding every tick would pass out of every contact.
    // A Playmaker passes more and can find a man beyond the normal width.
    if (nearD < LIVE.engageM && !h.decided && this.tick - h.catchTick >= LIVE.passCooldown) {
      h.decided = true;
      const maker = traitBoost(h.traits, 'playmaker');
      const reach = MAX_LAT_M + (maker > 0 ? LIVE.cutOutPerLevelM * maker : 0) + (plan.width > 0 ? 3 : 0);
      const cands = this.candidates(h, plan);
      let receiver = pickReceiver(h.body.pos, this.dir, cands, reach, Math.min(0.6, LIVE.playmakerWidth * maker + plan.width));
      // A Playmaker (or an expansive side) sees the overlap: now and then he skips the near man and throws to the widest one he can reach.
      const cutOut = LIVE.cutOutChance * maker + plan.cutOut;
      if (cutOut > 0 && this.rng.next() < cutOut) {
        const widest = cands
          .filter((c) => !c.busy && (h.body.pos.x - c.pos.x) * this.dir >= 0.3 && (h.body.pos.x - c.pos.x) * this.dir <= 8 && Math.abs(c.pos.y - h.body.pos.y) <= reach)
          .sort((a, b) => Math.abs(b.pos.y - h.body.pos.y) - Math.abs(a.pos.y - h.body.pos.y))[0];
        if (widest && Math.abs(widest.pos.y - h.body.pos.y) > MAX_LAT_M) receiver = widest.idx;
      }
      if (receiver !== null && this.rng.next() < LIVE.passBase + h.stats.skill / 300 + TRAIT_PTS.playmakerPass * maker + plan.pass) {
        const to = this.players[receiver]!;
        if (Math.abs(to.body.pos.y - h.body.pos.y) > MAX_LAT_M) {
          this.emit('cut-out', `${h.name} throws the cut-out ball to ${to.name}`, h, announce(h.traits.find((t) => t.id === 'playmaker')));
        }
        this.pass(h, to);
        return;
      }
    }

    if (this.tick < h.immuneUntil) return;

    // One-on-one and the defender is almost on him: try to step (once per
    // defender) — unless the game plan says tuck it and carry in.
    if (nearest && nearD <= LIVE.stepRange && this.steppedOn(h) !== this.indexOf(nearest)) {
      const sit = this.situation(h, nearest, committed);
      if (sit.defenders === 1) {
        h.steppedOn = this.indexOf(nearest);
        const st = stepTraits(h.traits, nearest.traits, toLine <= FINISHER_M);
        const tries = plan.step >= 1 || this.rng.next() < plan.step;
        if (tries && this.rng.next() < stepChance(h.stats, nearest.stats, sit, st.bonus + dplan.stepAgainst)) {
          this.sidestep(h, nearest, announce(st.credit));
          return;
        }
      }
    }

    // Contact: a committed defender has reached him.
    for (const d of committed) {
      if (dist(d.body.pos, h.body.pos) <= LIVE.tackleReach) {
        this.contest(h, d, committed);
        return;
      }
    }
  }

  private steppedOn(h: Player): number {
    return h.steppedOn;
  }

  /**
   * With a tackle to spare: in the red zone the kicker sometimes goes early
   * (a grubber or a chip for the chasers); from deep a grinding or kick-chase
   * side sometimes kicks early for territory.
   */
  private callEarlyKick(toLine: number, plan: AttackPlan): 'run' | KickChoice {
    if (toLine <= LIVE.earlyKickM) {
      if (this.rng.next() >= plan.earlyKick) return 'run';
      return this.rng.next() < 0.6 ? 'grubber' : 'chip';
    }
    if (plan.earlyTerritory <= 0 || this.rng.next() >= plan.earlyTerritory) return 'run';
    return (plan.kickBias.bomb ?? 1) > 1 && this.rng.next() < 0.4 ? 'bomb' : 'long';
  }

  /** The kicker's call on the last: run it close in or one time in five inside 40, else the kick for the zone in the side's style. */
  private callLastPlay(toLine: number, plan: AttackPlan): 'run' | KickChoice {
    if (toLine <= RUN_CLOSE_M) return 'run';
    if (toLine <= RUN_IT_ZONE_M && this.rng.next() < RUN_IT_CHANCE) return 'run';
    return chooseKick(toLine, this.rng.next(), plan.kickBias);
  }

  /** Where the kick goes and who it is for, by type (BAK-208 §4.4). */
  private planKick(h: Player, kind: KickChoice): PendingKick {
    const def = other(this.attacking);
    const fb = this.at(def, FULLBACK);
    const boot = bootMult(h.traits);
    const base = { at: this.tick + LIVE.kickContactTicks, kicker: this.indexOf(h), kickoff: false, kind };
    const trait = boot.dist > 1 ? { trait: announce(h.traits.find((t) => t.id === 'bigBoot')) ?? 'Big Boot' } : {};
    switch (kind) {
      case 'grubber':
        return { ...base, to: grubberTarget(h.body.pos, this.dir, this.rng.next()), receiver: null, peak: 0.9 };
      case 'chip':
        return { ...base, to: chipTarget(h.body.pos, this.dir, this.rng.next()), receiver: this.indexOf(h), peak: 5 };
      case 'cross-field': {
        // The winger on the far side of the field from the ball has the space.
        const wingers = this.side(this.attacking).filter((p) => ROLES[p.slot]!.name === 'winger');
        const far = wingers.sort((a, b) => Math.abs(b.body.pos.y - h.body.pos.y) - Math.abs(a.body.pos.y - h.body.pos.y))[0] ?? h;
        return { ...base, to: crossFieldTarget(h.body.pos, this.dir, far.body.pos, this.rng.next()), receiver: this.indexOf(far), peak: 13 };
      }
      case 'bomb':
        return { ...base, to: bombTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next()), receiver: this.indexOf(fb), peak: 20, ...trait };
      default:
        return { ...base, to: kickTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next(), boot), receiver: this.indexOf(fb), peak: 12, ...trait };
    }
  }

  /** The geometry of a contact: numbers, angle, momentum, tackle count, support. */
  private situation(c: Player, t: Player, committed: readonly Player[]): Situation {
    const others = committed.filter((d) => d !== t && dist(d.body.pos, c.body.pos) < LIVE.secondManM).length;
    const defenders = others >= 2 ? 3 : others === 1 ? 2 : 1;
    const approach = norm(sub(c.body.pos, t.body.pos)); // the way the tackler is closing
    const angle = angleFrom(-dot(approach, c.body.heading)); // square when he comes at the carrier's face
    const support = this.atkPlan(c).offload > 0 && this.side(c.side).some((p) => p !== c && p.slot !== HOOKER && !this.locked(p) && dist(p.body.pos, c.body.pos) < LIVE.offloadM);
    return {
      defenders,
      angle,
      speedDiff: speedOf(c.body) - speedOf(t.body),
      lastTackle: this.lastPlay,
      carrierFatigue: tiredness(c.energy),
      tacklerFatigue: tiredness(t.energy),
      support,
    };
  }

  /** A clean step: the defender grasps air, the carrier jinks past with a burst. */
  private sidestep(c: Player, t: Player, trait?: string): void {
    this.emit('step', `${c.name} steps ${t.name}!`, c, trait);
    const sideways = c.body.pos.y >= t.body.pos.y ? 1 : -1;
    c.jink = { dy: sideways * LIVE.stepJinkM, ticks: LIVE.stepJinkTicks };
    this.lock(t, 'tackled', 12, add(t.body.pos, { x: this.dir * 0.8, y: -sideways * 0.6 }));
    t.cooldownUntil = this.tick + LIVE.beatenCooldown;
    this.burst(c);
  }

  private stepTackle(ph: Extract<Phase, { kind: 'tackle' }>): void {
    const w = ph.wrestle;
    if (w) {
      if (!this.stepWrestle(ph, w)) return;
    } else if (this.tick < ph.t0 + LIVE.contactTicks) return;
    const c = this.players[ph.carrier]!;
    this.tackles++;
    this.kickCall = null;
    const handover = this.tackles >= SET_TACKLES;
    this.mark = { ...c.body.pos };
    this.lineX = this.mark.x + this.dir * LIVE.onsideM;
    // How long he fought sets the ruck: a quick wrestle is a quick play-the-ball, a long one lets the defence set.
    const secs = w ? (this.tick - w.t0) * TICK_S : 0;
    const down = w ? ruckTicks(secs) : LIVE.downTicks;
    const pace = !w || handover ? null : secs <= WRESTLE.quickS ? 'quick' : secs >= WRESTLE.slowS ? 'slow' : null;
    this.lock(c, 'down', down);
    for (const i of w ? w.men : [ph.tackler]) this.lock(this.players[i]!, 'down', down);
    this.phase = { kind: 'ruck', t0: this.tick, carrier: ph.carrier, tackler: ph.tackler, stage: 'down', handover, heldAt: 0, down, pace };
    if (this.siren) this.endHalf(); // the tackle is made: the ball is dead
  }

  private stepRuck(ph: Extract<Phase, { kind: 'ruck' }>): void {
    const c = this.players[ph.carrier]!;
    if (ph.stage === 'down') {
      if (this.tick < ph.t0 + ph.down) return;
      // Up, step over it and heel it back.
      this.lock(c, 'ptb', LIVE.ptbTicks);
      if (ph.pace === 'quick') this.emit('quick-ptb', `${c.name} is up quickly — the line is short`, c);
      else if (ph.pace === 'slow') this.emit('slow-ptb', `Slow play-the-ball — the defence is set`, c);
      ph.stage = 'ptb';
      ph.t0 = this.tick;
      return;
    }
    if (ph.stage === 'ptb') {
      if (this.tick < ph.t0 + LIVE.ptbTicks) return;
      if (ph.handover) {
        this.emit('handover', `Tackled on the last — handover to ${this.names[other(this.attacking)]}`, c);
        this.attacking = other(this.attacking);
        this.dir = this.dirOf(this.attacking);
        this.tackles = 0;
        this.lastPlay = false;
        this.lineX = this.mark.x + this.dir * LIVE.onsideM;
      }
      const dh = this.at(this.attacking, HOOKER);
      const spot = this.dummyHalfSpot();
      // Heel it to where he actually is (he's been running to the mark); if he's
      // still a way off, to the mark and he collects it there.
      const dhSpot = dist(dh.body.pos, spot) < 3 ? { ...dh.body.pos } : spot;
      this.ball = rollFlight(c.body.pos, dhSpot, this.tick, this.indexOf(dh), LIVE.rollTicks);
      this.markers = this.currentMarkers().map((m) => this.indexOf(m));
      this.ruckPlayedAt = this.tick;
      c.busyUntil = this.tick + LIVE.busyAfterPtb;
      c.pose = 'idle';
      c.poseUntil = 0;
      dh.pose = 'dummyHalf';
      dh.poseUntil = this.tick + LIVE.rollTicks + LIVE.dhHoldTicks + 2;
      ph.stage = 'dh';
      ph.t0 = this.tick;
      return;
    }
    // 'dh': wait for the heel to arrive, a beat, then move it.
    const h = this.holder();
    if (!h || h.slot !== HOOKER || h.side !== this.attacking) return;
    if (ph.heldAt === 0) ph.heldAt = this.tick;
    if (this.tick < ph.heldAt + LIVE.dhHoldTicks) return;
    this.lastPlay = this.tackles === SET_TACKLES - 1;
    let receiver: number | null = null;
    if (this.lastPlay) {
      const k = this.at(this.attacking, KICKER);
      if (!this.locked(k) && this.tick >= k.busyUntil) receiver = this.indexOf(k);
    }
    if (receiver === null) receiver = pickReceiver(h.body.pos, this.dir, this.candidates(h));
    if (receiver === null || this.rng.next() < LIVE.dartChance) {
      // Dummy-half dart.
      h.catchTick = this.tick;
      h.decided = false;
      h.pose = 'run';
      h.poseUntil = 0;
      this.emit('dart', `${h.name} darts from dummy-half`, h);
    } else {
      this.pass(h, this.players[receiver]!);
    }
    this.phase = { kind: 'play' };
  }

  private stepTry(ph: Extract<Phase, { kind: 'try' }>): void {
    if (this.tick < ph.t0 + LIVE.tryTicks) return;
    const scorer = this.players[ph.scorer]!;
    for (const p of this.players) {
      p.pose = 'idle';
      p.poseUntil = 0;
    }
    if (this.siren) {
      this.endHalf(); // a try after the siren is the last play of the half
      return;
    }
    const kicking = other(scorer.side);
    this.ball = { kind: 'held', by: this.idx(kicking, KICKER) };
    this.attacking = other(kicking);
    this.dir = this.dirOf(this.attacking);
    this.phase = { kind: 'restart', t0: this.tick, kicking };
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  private pass(from: Player, to: Player, spillExtra = 0): void {
    const flightS = dist(from.body.pos, to.body.pos) / PASS_SPEED;
    const lead = this.leadPoint(from, to, flightS);
    this.spillExtra = spillExtra;
    this.interceptTrait = undefined;
    // A defender sitting in the lane may pick it off: the ball then flies to him.
    const thief = this.laneDefender(from.body.pos, lead, from.side);
    const cutOut = dist(from.body.pos, lead) > 12;
    const it = thief ? interceptTraits(thief.traits) : null;
    if (thief && it && this.rng.next() < interceptChance(thief.stats.footyIQ, cutOut, it.bonus)) {
      this.ball = passFlight(from.body.pos, { ...thief.body.pos }, this.tick, this.indexOf(thief));
      this.interceptTrait = announce(it.credit);
    } else {
      this.ball = passFlight(from.body.pos, lead, this.tick, this.indexOf(to));
      if (thief && it?.gamble) {
        // The Gambler shot out of the line and missed the read: he's out of the play.
        this.emit('gamble', `${thief.name} gambles on the intercept and misses`, thief, announce(thief.traits.find((t) => t.id === 'gambler')));
        this.lock(thief, 'tackled', 12, add(thief.body.pos, scale({ x: -this.dir, y: 0 }, 1)));
        thief.cooldownUntil = this.tick + LIVE.beatenCooldown;
      }
    }
    from.pose = 'pass';
    from.poseUntil = this.tick + LIVE.passPoseTicks;
    from.catchTick = this.tick;
  }

  /**
   * Where to throw it so the receiver takes it on the run: he will accelerate
   * forward through the catch, so lead him by what he covers in the flight
   * (current forward speed plus acceleration, capped at his top speed) and
   * keep his drift. The ball still leaves the hands backward.
   */
  private leadPoint(from: Player, to: Player, flightS: number): Vec {
    const fwd = { x: this.dir, y: 0 };
    const v0 = dot(to.body.vel, fwd);
    const vMax = to.body.maxSpeed * LIVE.carrySpeed;
    // The lead lengthens the flight, so settle the flight time once more.
    let t = flightS;
    let lead = to.body.pos;
    for (let i = 0; i < 2; i++) {
      const ahead = runOn(v0, to.body.accel, vMax, t);
      lead = { x: to.body.pos.x + this.dir * ahead, y: to.body.pos.y + to.body.vel.y * t * 0.8 };
      t = dist(from.body.pos, lead) / PASS_SPEED;
    }
    // Never a forward pass: the catch point stays at least half a metre behind the passer.
    const behind = from.body.pos.x - this.dir * 0.5;
    lead.x = this.dir > 0 ? Math.min(lead.x, behind) : Math.max(lead.x, behind);
    return clampToGround(lead, 1);
  }

  /** The defender nearest the pass line and within LIVE.laneM of it, if any. */
  private laneDefender(from: Vec, to: Vec, side: Side): Player | null {
    const seg = sub(to, from);
    const len2 = seg.x * seg.x + seg.y * seg.y;
    if (len2 < 1) return null;
    let best: Player | null = null;
    let bd = LIVE.laneM;
    for (const d of this.side(other(side))) {
      if (this.locked(d)) continue;
      const u = clamp(dot(sub(d.body.pos, from), seg) / len2, 0.15, 0.95);
      const onLine = add(from, scale(seg, u));
      const off = dist(d.body.pos, onLine);
      if (off < bd) {
        bd = off;
        best = d;
      }
    }
    return best;
  }

  private contest(c: Player, t: Player, committed: readonly Player[]): void {
    const sit = this.situation(c, t, committed);
    const tr = contestTraits(c.traits, t.traits, sit, this.toLine(c) <= FINISHER_M);
    // The game plans weigh in: how much the attack wants the offload, how the line tackles.
    const plan = this.atkPlan(c);
    const dplan = this.defPlan();
    if (sit.support) tr.mods.offload = (tr.mods.offload ?? 0) + (plan.offload - 1) * BASE.offload + dplan.offload;
    tr.mods.bigHit = (tr.mods.bigHit ?? 0) + dplan.bigHit;
    tr.mods.broken = (tr.mods.broken ?? 0) + dplan.broken;
    const outcome = resolveContest(c.stats, t.stats, this.rng.next(), sit, tr.mods);
    const credit = announce(tr.credit[outcome]);
    // Contact costs both men legs, whatever happens.
    this.tire(c, FATIGUE.contactCost.carrier);
    this.tire(t, FATIGUE.contactCost.tackler);
    const back = scale({ x: -this.dir, y: 0 }, 1);
    switch (outcome) {
      case 'strip': {
        // One-on-one, he rips it free: the tackler is the new carrier.
        this.emit('strip', `${t.name} strips the ball from ${c.name}!`, t, credit);
        this.lock(c, 'tackled', 14);
        this.lock(t, 'tackle', 6);
        this.ball = { kind: 'held', by: this.indexOf(t) };
        t.catchTick = this.tick;
        t.decided = false;
        t.steppedOn = -1;
        this.turnover();
        return;
      }
      case 'broken':
        this.emit('break-tackle', `${c.name} busts through ${t.name}`, c, credit);
        this.lock(t, 'down', 16, add(t.body.pos, scale(back, -1.2)));
        t.cooldownUntil = this.tick + LIVE.beatenCooldown;
        this.burst(c);
        return;
      case 'fend':
        this.emit('fend', `${c.name} palms off ${t.name}`, c, credit);
        c.pose = 'fend';
        c.poseUntil = this.tick + 6;
        this.lock(t, 'tackled', 14, add(t.body.pos, scale(back, -1.5)));
        t.cooldownUntil = this.tick + LIVE.beatenCooldown;
        c.immuneUntil = this.tick + LIVE.immuneTicks;
        return;
      case 'offload': {
        const cands = this.candidates(c).filter((k) => dist(this.players[k.idx]!.body.pos, c.body.pos) < LIVE.offloadM + 2);
        const r = pickReceiver(c.body.pos, this.dir, cands) ?? cands.find((k) => !k.busy)?.idx ?? null;
        if (r !== null) {
          this.emit('offload', `${c.name} gets the offload away to ${this.players[r]!.name}`, c, credit);
          // A Razzle Dazzle offload is the miracle ball — and the one that gets spilled.
          this.pass(c, this.players[r]!, tr.credit.offload?.id === 'razzleDazzle' ? EDGE_COST.razzleDazzle : 0);
          this.lock(c, 'tackled', LIVE.contactTicks + LIVE.downTicks);
          this.lock(t, 'tackle', LIVE.contactTicks + LIVE.downTicks);
          c.busyUntil = this.tick + LIVE.contactTicks + LIVE.downTicks + 10;
          return;
        }
        break; // nobody there after all: a plain tackle
      }
      default:
        break;
    }
    this.runDown(c, t, sit);
    if (outcome === 'big-hit') {
      // Smashed backwards at contact: no wrestle, he is down.
      this.emit('big-hit', `${t.name} smashes ${c.name} backwards!`, t, credit);
      const drive = scale(back, LIVE.driveBack);
      this.lock(c, 'tackled', LIVE.contactTicks, add(c.body.pos, drive));
      this.lock(t, 'tackle', LIVE.contactTicks, add(t.body.pos, drive));
      this.phase = { kind: 'tackle', t0: this.tick, carrier: this.indexOf(c), tackler: this.indexOf(t), big: true, wrestle: null, wreck: 0 };
      return;
    }
    // Held: the wrestle (§8.1). A Wrecking Ball sometimes keeps his legs pumping — more fight, more ground.
    const wb = traitBoost(c.traits, 'wreckingBall');
    const wreck = wb > 0 && this.rng.next() < LIVE.wreckDriveChance * wb ? wb : 0;
    const fight = fightOf({ ...c.stats, stamina: c.stamina }, c.energy, this.rng.next()) * (1 + WRESTLE.wreckFight * wreck);
    const wrestle: WrestleState = { men: [this.indexOf(t)], fight, fight0: fight, grip: gripOf(t.stats, t.energy, true), t0: this.tick, metres: 0 };
    this.hold(c, 'tackled');
    this.hold(t, 'tackle');
    this.phase = { kind: 'tackle', t0: this.tick, carrier: this.indexOf(c), tackler: this.indexOf(t), big: false, wrestle, wreck };
  }

  /** Keep a man in the wrestle: locked where he stands, for another tick or two. */
  private hold(p: Player, pose: string): void {
    p.pose = pose;
    p.poseUntil = this.tick + 2;
    p.lockUntil = this.tick + 2;
    p.body.vel = { x: 0, y: 0 };
    p.slide = null;
  }

  /** Spend some of a player's legs (× his drain rate); announce him once when he is cooked. */
  private tire(p: Player, amount: number): void {
    p.energy = Math.max(0, p.energy - amount * p.drain);
    this.checkLegs(p);
  }

  private checkLegs(p: Player): void {
    if (!p.gassed && p.energy < FATIGUE.spentAt) {
      p.gassed = true;
      this.emit('gassed', `${p.name} is cooked`, p);
    } else if (p.gassed && p.energy > FATIGUE.gassedReset) p.gassed = false;
  }

  /**
   * One tick of the wrestle: free defenders arriving join it (up to three),
   * the carrier drives on while his fight lasts, everyone in it pays legs.
   * Returns true when he is held (go to ground); a late bust or a try ends it here.
   */
  private stepWrestle(ph: Extract<Phase, { kind: 'tackle' }>, w: WrestleState): boolean {
    const c = this.players[ph.carrier]!;
    for (const d of this.side(other(c.side))) {
      if (w.men.length >= WRESTLE.maxMen) break;
      const i = this.indexOf(d);
      if (w.men.includes(i) || this.locked(d) || this.tick < d.cooldownUntil || dist(d.body.pos, c.body.pos) > LIVE.tackleReach + 0.3) continue;
      w.men.push(i);
      w.grip += gripOf(d.stats, d.energy, false);
      this.tire(d, FATIGUE.contactCost.tackler);
    }
    const men = w.men.map((i) => this.players[i]!);
    const dt = TICK_S;
    const end = wrestleTick(w, men.map((d) => holdOf(d.stats, d.energy)), dt, (this.tick - w.t0) * dt);
    this.tire(c, FATIGUE.wrestleCost.carrierPerMan * men.length * dt);
    for (const d of men) this.tire(d, FATIGUE.wrestleCost.tackler * dt);
    // He keeps driving while there is fight in him; they go with him.
    const step = driveSpeed(w.fight / w.fight0, men.length) * dt;
    w.metres += step;
    const shift = { x: this.dir * step, y: 0 };
    c.body.pos = clampToGround(add(c.body.pos, shift), 0.5);
    for (const d of men) d.body.pos = clampToGround(add(d.body.pos, shift), 0.5);
    if (inGoal(c.body.pos, this.dir)) {
      // Driven over the line in the tackle.
      for (const d of men) this.lock(d, 'down', LIVE.downTicks);
      this.score(c);
      return false;
    }
    if (end === 'free') {
      // The defenders' grip went before his fight: he is through.
      this.emit('break-tackle', `${c.name} fights out of the tackle!`, c);
      this.events[this.events.length - 1]!.detail = 'wrestle';
      for (const d of men) {
        this.lock(d, 'down', 16, add(d.body.pos, { x: -this.dir * 0.8, y: 0 }));
        d.cooldownUntil = this.tick + LIVE.beatenCooldown;
      }
      c.lockUntil = this.tick;
      c.pose = 'run';
      c.poseUntil = 0;
      this.burst(c);
      this.phase = { kind: 'play' };
      return false;
    }
    if (end === null) {
      this.hold(c, 'tackled');
      for (const d of men) this.hold(d, 'tackle');
      return false;
    }
    const t = this.players[ph.tackler]!;
    const help = men.length > 1 ? ` (${men.length} men)` : '';
    const after = w.metres >= 1 ? ` after ${w.metres.toFixed(1)} m` : '';
    this.emit('tackle', ph.wreck > 0 ? `${t.name} hangs on as ${c.name} drives through the tackle${after}` : `${t.name} wraps up ${c.name}${after}${help}`, t, ph.wreck > 0 ? announce(c.traits.find((x) => x.id === 'wreckingBall')) : undefined);
    return true;
  }

  private score(scorer: Player): void {
    this.tries[scorer.side]++;
    this.points[scorer.side] += NINES.tryPoints;
    this.emit('try', `TRY! ${scorer.name} dives over for ${this.names[scorer.side]}`, scorer);
    // Dive and slide, then up to celebrate on the spot — he stays put until the restart.
    this.lock(scorer, 'dive', 10, add(scorer.body.pos, scale({ x: this.dir, y: 0 }, 1.5)));
    scorer.poseUntil = this.tick + LIVE.tryTicks;
    for (const p of this.side(scorer.side)) {
      if (p === scorer) continue;
      p.pose = 'celebrate';
      p.poseUntil = this.tick + LIVE.tryTicks;
    }
    this.phase = { kind: 'try', t0: this.tick, scorer: this.indexOf(scorer) };
  }

  // ── Who goes where ────────────────────────────────────────────────────────
  private committed(h: Player, defenders: readonly Player[]): Player[] {
    // Markers stay square at the ruck until the ball is well clear of it; they
    // may only pounce early on a dummy-half dart. Otherwise the first receiver
    // runs at the line, not at the two men standing over the mark.
    const dplan = this.defPlan();
    const held = this.tick < this.ruckPlayedAt + LIVE.markerReleaseTicks * dplan.markerHold && h.slot !== HOOKER;
    const free = defenders.filter((d) => !this.locked(d) && this.tick >= d.cooldownUntil && !(held && this.markers.includes(this.indexOf(d))));
    // A defender already behind the carrier can only chase; the ones in front
    // of him are the tackle, so they rank first.
    const behind = (d: Player): boolean => (d.body.pos.x - h.body.pos.x) * this.dir < 0;
    const cost = (d: Player): number => dist(d.body.pos, h.body.pos) + (behind(d) ? 60 : 0) + (this.markers.includes(this.indexOf(d)) ? 8 : 0);
    free.sort((a, b) => cost(a) - cost(b));
    const ahead = free.filter((d) => !behind(d)).length;
    // A broken line (two or fewer still in front) sends everyone in range after him.
    const n = ahead <= 2 ? 4 : free[2] && dist(free[2].body.pos, h.body.pos) < 5 ? 3 : 2;
    return free.slice(0, Math.min(4, n + dplan.commit));
  }

  private candidates(passer: Player, plan: AttackPlan = this.atkPlan(passer)): Candidate[] {
    const overlap = this.overlapSide(passer);
    return this.side(passer.side)
      .filter((p) => p !== passer)
      .map((p) => ({
        idx: this.indexOf(p),
        pos: p.body.pos,
        busy: this.locked(p) || this.tick < p.busyUntil || (p.slot === HOOKER && this.phase.kind === 'ruck'),
        prefer: this.rolePreference(p, passer, plan) + (overlap !== 0 && Math.sign(p.body.pos.y - passer.body.pos.y) === overlap ? LIVE.overlapPrefer * (1 + plan.width) : 0),
      }));
  }

  /**
   * Which side of the passer has the overlap: +1 / −1 when his side has more
   * players than the defence within LIVE.shiftM of him on that side, else 0.
   */
  private overlapSide(passer: Player): 0 | 1 | -1 {
    const count = (ps: readonly Player[], sign: number): number =>
      ps.filter((p) => p !== passer && !this.locked(p) && Math.sign(p.body.pos.y - passer.body.pos.y) === sign && Math.abs(p.body.pos.x - passer.body.pos.x) < LIVE.shiftM && Math.abs(p.body.pos.y - passer.body.pos.y) < LIVE.shiftM).length;
    const atk = this.side(passer.side);
    const def = this.side(other(passer.side));
    const left = count(atk, -1) - count(def, -1);
    const right = count(atk, 1) - count(def, 1);
    if (left >= 1 && left > right) return -1;
    if (right >= 1 && right > left) return 1;
    return 0;
  }

  /** Who the ball should go to by role: halves as first receiver; forwards for the early hit-ups; the edges when the plan wants width. */
  private rolePreference(p: Player, passer: Player, plan: AttackPlan): number {
    const name = ROLES[p.slot]!.name;
    const fromRuck = passer.slot === HOOKER;
    if (name === 'halfback' || name === 'five-eighth') return fromRuck ? 1.5 : 0.5;
    if (name === 'prop' || name === 'second-row') return fromRuck && this.tackles <= 2 ? 1.2 + plan.hitUps : plan.hitUps * 0.3;
    if (name === 'centre' || name === 'winger') return plan.edges;
    if (name === 'fullback') return -0.5 + plan.edges * 0.5;
    return 0;
  }

  /** The two defenders standing over the current mark. */
  private currentMarkers(): Player[] {
    const ph = this.phase;
    if (ph.kind !== 'tackle' && ph.kind !== 'ruck') return [];
    const t = this.players[ph.tackler]!;
    const second = this.side(t.side)
      .filter((d) => d !== t && d.slot !== FULLBACK)
      .sort((a, b) => dist(a.body.pos, this.mark) - dist(b.body.pos, this.mark))[0];
    return second ? [t, second] : [t];
  }

  private dummyHalfSpot(): Vec {
    return clampToGround({ x: this.mark.x - this.dir * 1.6, y: this.mark.y + 0.4 }, 1);
  }

  private assignTargets(): void {
    const ph = this.phase;
    const bp = this.ballPos();
    const atk = this.attacking;
    const def = other(atk);
    const h = this.holder();
    const flight = this.ball.kind === 'flight' ? this.ball : null;
    const receiver = flight && flight.receiver !== null ? this.players[flight.receiver]! : null;
    // Everyone cruises unless the moment calls for the foot down (§8.2), set below.
    for (const p of this.players) p.wantsSprint = false;

    if (ph.kind === 'half-time' || ph.kind === 'full-time') {
      // The whistle has gone: everyone stops where he is.
      for (const p of this.players) {
        p.target = { ...p.body.pos };
        p.through = false;
      }
      return;
    }
    if (ph.kind === 'restart' || ph.kind === 'try') {
      // Everyone to their kick-off spots (defenders trudge back after a try).
      const kicking = ph.kind === 'restart' ? ph.kicking : other(this.players[ph.scorer]!.side);
      const receiving = other(kicking);
      const rd = this.dirOf(receiving);
      for (const p of this.players) {
        const role = ROLES[p.slot]!;
        if (p.side === kicking) {
          p.target = p.slot === KICKER ? { x: 50 - rd * 1, y: MID_Y } : { x: 50 - rd * (3 + role.def * 0.15), y: role.lane };
        } else {
          p.target = formationTarget(role, { x: 50 + rd * -22, y: MID_Y }, rd, true);
          p.target = { x: p.target.x + rd * 6, y: p.target.y }; // deep but not on the line
        }
        p.through = false;
      }
      if (ph.kind === 'try') {
        // The scorer stays where he grounded it (up and celebrating once the
        // dive is done); teammates mob him for the moment.
        const s = this.players[ph.scorer]!;
        s.target = { ...s.body.pos };
        if (!this.locked(s) && s.pose === 'dive') s.pose = 'celebrate';
        for (const p of this.side(s.side)) {
          if (p === s) continue;
          p.target = { x: s.body.pos.x - this.dir * (1.5 + (p.slot % 3)), y: clamp(s.body.pos.y + (p.slot - 4) * 1.4, 1, 67) };
        }
      }
      return;
    }

    // Loose ball: the two nearest of each side go for it, everyone else holds shape.
    const chasers = new Set<Player>();
    const bouncing = flight && flight.via === 'bounce' ? flight : null;
    const looseAt = this.ball.kind === 'loose' ? bp : bouncing ? bouncing.to : null;
    if (looseAt) {
      for (const s of ['home', 'away'] as const) {
        if (this.looseFor && s !== this.looseFor) continue;
        const near = this.side(s).filter((p) => !this.locked(p)).sort((a, b) => dist(a.body.pos, looseAt) - dist(b.body.pos, looseAt));
        for (const p of near.slice(0, 2)) chasers.add(p);
      }
    }
    // A kick in the air: the kicker and his two nearest chase it; the receiving
    // side gets a second man under it beside the nominated catcher.
    const kickUp = flight && flight.via === 'kick' && !looseAt && !this.kickoffUp ? flight : null;
    const kickChasers = new Set<Player>();
    if (kickUp) {
      const kicker = this.players[this.lastKicker];
      const kickingSide = kicker ? kicker.side : def;
      const chase = this.side(kickingSide).filter((p) => !this.locked(p)).sort((a, b) => dist(a.body.pos, kickUp.to) - dist(b.body.pos, kickUp.to));
      for (const p of chase.slice(0, 2)) kickChasers.add(p);
      if (kicker && !this.locked(kicker)) kickChasers.add(kicker);
      const cover = this.side(other(kickingSide)).filter((p) => p !== receiver && !this.locked(p)).sort((a, b) => dist(a.body.pos, kickUp.to) - dist(b.body.pos, kickUp.to))[0];
      if (cover) kickChasers.add(cover);
    }

    // Attack.
    const attackers = this.side(atk);
    const carrier = h && h.side === atk ? h : null;
    const anchor = carrier ? carrier.body.pos : receiver && receiver.side === atk ? flight!.to : bp;
    const supports: Player[] = [];
    if (carrier || (receiver && receiver.side === atk)) {
      const lead = carrier ?? receiver!;
      const pool = attackers.filter((p) => p !== lead && p.slot !== HOOKER && !this.locked(p) && this.tick >= p.busyUntil);
      pool.sort((a, b) => dist(a.body.pos, lead.body.pos) - dist(b.body.pos, lead.body.pos));
      supports.push(...pool.slice(0, 2));
    }
    const spots = supportSpots(anchor, this.dir);
    const broken = this.lineBroken();
    for (const p of attackers) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (chasers.has(p) && looseAt) {
        p.target = { ...looseAt };
        p.wantsSprint = true;
      } else if (kickUp && kickChasers.has(p)) {
        p.target = { ...kickUp.to };
        p.through = dist(p.body.pos, kickUp.to) > LIVE.chaseThroughM;
        p.wantsSprint = true;
      } else if (p === carrier) {
        if (ph.kind === 'play') {
          const defs = this.side(def).filter((d) => !this.locked(d)).map((d) => d.body.pos);
          p.target = gapTarget(p.body.pos, this.dir, defs);
          p.through = true;
          // Space ahead, just beaten a man, or through the line: go.
          p.wantsSprint = this.tick < p.burstUntil || broken || this.laneClear(p);
        } else p.target = { ...p.body.pos };
      } else if (p === receiver) {
        // A pass thrown in front of him is run onto, through the catch point;
        // one at or behind him (or a kick) he checks and gets under.
        const onto = flight!.via === 'pass' && (flight!.to.x - p.body.pos.x) * this.dir > 0.5;
        p.target = onto ? clampToGround(add(flight!.to, { x: this.dir * LIVE.runOnM, y: 0 }), 1) : { ...flight!.to };
        p.through = onto;
        // Under a kick he goes; onto a pass he runs at pace but keeps his gas for the line.
        p.wantsSprint = flight!.via === 'kick';
      } else if (p.slot === HOOKER && (ph.kind === 'tackle' || ph.kind === 'ruck')) {
        p.target = this.dummyHalfSpot();
      } else if (ph.kind === 'ruck' && ph.stage === 'dh' && !this.locked(p)) {
        // The ball is heeled: the backline comes onto it, so the first receiver
        // hits the pass at pace instead of standing flat-footed. The forwards
        // standing close to the ruck keep enough depth to stay a pass option.
        const spot = formationTarget(role, anchor, this.dir, true);
        const advance = Math.max(0, Math.min(LIVE.ruckAdvanceM, role.atk - 3));
        p.target = clampToGround({ x: spot.x + this.dir * advance, y: spot.y }, 1);
      } else if (supports.includes(p)) {
        const s = spots[supports.indexOf(p) as 0 | 1];
        // Take the side he's already on.
        const mine = (p.body.pos.y < anchor.y) === (s.y < anchor.y) ? s : spots[supports.indexOf(p) === 0 ? 1 : 0];
        p.target = mine;
        // Backing up: when the carrier goes, his support goes with him, staying in reach for the pass.
        p.wantsSprint = carrier !== null && (broken || carrier.sprinting) && dist(p.body.pos, carrier.body.pos) < LIVE.supportSprintM;
      } else {
        p.target = formationTarget(role, anchor, this.dir, true);
      }
    }

    // Defence.
    const defenders = this.side(def);
    const inRuck = ph.kind === 'tackle' || ph.kind === 'ruck';
    const dplan = this.defPlan();
    if (ph.kind === 'play' && carrier) {
      const want = carrier.body.pos.x + this.dir * 2.5;
      const stepM = dplan.lineSpeed * TICK_S;
      // Rush up toward the carrier, never past him.
      if (this.dir > 0) this.lineX = Math.max(want, this.lineX - stepM);
      else this.lineX = Math.min(want, this.lineX + stepM);
    }
    // A wrestle on: the free defenders close by come in to help finish it.
    const w = ph.kind === 'tackle' ? ph.wrestle : null;
    const wrestling = w && ph.kind === 'tackle' ? this.players[ph.carrier]! : null;
    const committed = ph.kind === 'play' && carrier
      ? this.committed(carrier, defenders)
      : w && wrestling
        ? this.committed(wrestling, defenders).filter((d) => dist(d.body.pos, wrestling.body.pos) < LIVE.joinM).slice(0, WRESTLE.maxMen - w.men.length)
        : [];
    const target = carrier ?? wrestling;
    // Markers stand over the mark through the ruck and hold there until released.
    const markers: Player[] = inRuck
      ? this.currentMarkers()
      : this.tick < this.ruckPlayedAt + LIVE.markerReleaseTicks * dplan.markerHold
        ? this.markers.map((i) => this.players[i]!).filter((d) => d.side === def && !committed.includes(d))
        : [];
    for (const p of defenders) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (chasers.has(p) && looseAt) {
        p.target = { ...looseAt };
        p.wantsSprint = true;
      } else if (kickUp && kickChasers.has(p)) {
        p.target = { ...kickUp.to };
        p.through = dist(p.body.pos, kickUp.to) > LIVE.chaseThroughM;
        p.wantsSprint = true;
      } else if (p === receiver) {
        p.target = { ...flight!.to };
        p.wantsSprint = true;
      } else if (committed.includes(p) && target) {
        // Cut the angle: meet him where he's going, not where he is (in a wrestle, straight in to help).
        p.target = clampToGround(intercept(p.body.pos, p.body.maxSpeed, target.body.pos, target.body.vel), 0.5);
        p.through = true;
        // Closing the last stretch, or covering a break: everything he has.
        p.wantsSprint = broken || dist(p.body.pos, target.body.pos) < LIVE.sprintCloseM;
      } else if (markers.includes(p)) {
        const k = markers.indexOf(p);
        p.target = clampToGround({ x: this.mark.x + this.dir * 0.8, y: this.mark.y + (k === 0 ? -0.9 : 0.9) }, 0.5);
      } else if (p.slot === FULLBACK) {
        // The last line: deeper still on the last tackle, and once the kicker
        // shapes to kick he reads it and goes to where it will land.
        const pk = this.pendingKick;
        p.wantsSprint = broken;
        if (pk && this.players[pk.kicker]!.side === atk && !pk.kickoff) {
          p.target = { ...pk.to };
          p.wantsSprint = true;
        } else {
          const deep = this.lastPlay ? LIVE.fullbackLastM : LIVE.fullbackDeepM;
          p.target = { x: clamp(this.lineX + this.dir * deep, -8, FIELD_LENGTH + 8), y: clamp(MID_Y + (anchor.y - MID_Y) * 0.6, 4, 64) };
        }
      } else {
        const y = clamp(role.lane + (anchor.y - MID_Y) * Math.min(1, (role.defPull ?? role.pull) * dplan.pull), 1.5, 66.5);
        p.target = { x: clamp(this.lineX, -8, FIELD_LENGTH + 8), y };
      }
    }
  }

  // ── Physics ───────────────────────────────────────────────────────────────
  private move(): void {
    const dt = TICK_S;
    const held = new Set<Body>();
    // Moments that quicken a player with the trait for it: the kick chase
    // (Jets) and covering a broken line (Last Line).
    const kickChase = this.ball.kind === 'flight' && this.ball.via === 'kick';
    const h = this.holder();
    const lineBroken = this.lineBroken();
    const stopped = this.phase.kind !== 'play' && this.phase.kind !== 'tackle' && this.phase.kind !== 'ruck';
    for (const p of this.players) {
      if (this.locked(p)) {
        if (stopped) this.legs(p, 0, 'stop');
        // On the ground or in a tackle: no sprint, the gas comes back as if standing.
        p.sprinting = false;
        stepGas(p.gas, false, true, p.energy, p.tankS, p.refillS, dt);
        held.add(p.body);
        if (p.slide) {
          const u = Math.min(1, (this.tick - p.slide.t0) / Math.max(1, p.slide.t1 - p.slide.t0));
          const e = u * (2 - u);
          p.body.pos = { x: p.slide.from.x + (p.slide.to.x - p.slide.from.x) * e, y: p.slide.from.y + (p.slide.to.y - p.slide.from.y) * e };
        }
        continue;
      }
      p.slide = null;
      // Cruise unless he wants to go and has the gas; blown, less than cruise (§8.2).
      p.sprinting = p.wantsSprint && canSprint(p.gas);
      let max = p.body.maxSpeed * paceMult(p.gas, p.sprinting);
      if (p.sprinting && this.tick < p.burstUntil) max *= GAS.breakBurst;
      if (p === h) max *= LIVE.carrySpeed;
      if (kickChase && p.side !== this.attacking) max *= speedMult(p.traits, 'jets');
      if (lineBroken && p.side !== this.attacking) max *= speedMult(p.traits, 'lastLine');
      max *= legsSpeed(p.energy);
      arrive(p.body, p.target, dt, { through: p.through, maxSpeed: max });
      const from = p.body.pos;
      integrate(p.body, dt);
      const standing = stopped || speedOf(p.body) < FATIGUE.walkSpeed;
      if (stepGas(p.gas, p.sprinting, standing, p.energy, p.tankS, p.refillS, dt) && p === h) {
        this.emit('blown', `${p.name} has nothing left in the tank`, p);
      }
      // Sprinting costs the legs more per metre than cruising.
      this.legs(p, dist(from, p.body.pos) * runCostMult(p.sprinting), stopped ? 'stop' : standing ? 'walk' : 'no');
      if (p.jink) {
        // The sidestep: a sharp lateral shift spread over a few ticks.
        p.body.pos = clampToGround(add(p.body.pos, { x: 0, y: p.jink.dy / LIVE.stepJinkTicks }), 0.5);
        if (--p.jink.ticks <= 0) p.jink = null;
      }
    }
    const bodies = this.players.map((p) => p.body);
    for (let i = 0; i < 2; i++) {
      separate(bodies, undefined, held);
      for (const b of bodies) b.pos = clampToGround(b.pos, 0.5);
    }
    for (const p of this.players) {
      if (this.locked(p) || this.tick < p.poseUntil) continue;
      p.pose = speedOf(p.body) > 0.6 ? 'run' : 'idle';
    }
  }

  /** Legs for this tick: metres run drain them, standing and stoppages bring a little back. */
  private legs(p: Player, metres: number, resting: 'no' | 'walk' | 'stop'): void {
    p.energy = afterRun(p.energy, metres, p.drain, TICK_S, resting);
    this.checkLegs(p);
  }

  /** Average legs of a side, 0..1. */
  energyOf(side: Side): number {
    const ps = this.side(side);
    return ps.reduce((a, p) => a + p.energy, 0) / ps.length;
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────
  snapshot(): Snapshot {
    const players: PlayerSnap[] = this.players.map((p) => ({
      side: p.side,
      slot: p.slot,
      x: p.body.pos.x,
      y: p.body.pos.y,
      pose: p.pose,
      headX: p.body.heading.x,
      speed: speedOf(p.body),
      // As things stand after the tick: the tick he runs dry he is blown, not sprinting.
      ...(p.sprinting && !p.gas.blown ? { sprint: true } : {}),
      ...(p.gas.blown ? { blown: true } : {}),
      gas: p.gas.gas,
    }));
    const b = this.ball;
    let ball: Snapshot['ball'];
    if (b.kind === 'held') {
      const h = this.players[b.by]!;
      const lying = h.pose === 'tackled' || h.pose === 'down' || h.pose === 'dive';
      ball = { x: h.body.pos.x, y: h.body.pos.y, lift: lying ? 0.3 : CARRY_LIFT, holder: { side: h.side, slot: h.slot } };
    } else if (b.kind === 'flight') {
      const f = flightAt(b, this.tick);
      ball = { x: f.pos.x, y: f.pos.y, lift: f.lift, holder: null };
    } else {
      ball = { x: b.pos.x, y: b.pos.y, lift: 0, holder: null };
    }
    const kind = this.phase.kind;
    const state = kind === 'play' ? `tackle ${Math.min(this.tackles, SET_TACKLES)}/${SET_TACKLES}${this.lastPlay ? ' · last' : ''}` : kind;
    const legs = `legs ${Math.round(this.energyOf('home') * 100)}/${Math.round(this.energyOf('away') * 100)}%`;
    const snap: Snapshot = {
      tick: this.tick,
      players,
      ball,
      label: `${this.names[this.attacking]} ball · ${state} · ${this.points.home}–${this.points.away} · ${clockText(this.half, this.clockTicks * TICK_S)}${this.siren && (kind === 'play' || kind === 'tackle' || kind === 'ruck') ? ' · siren' : ''} · ${legs}`,
      events: this.events,
      clock: { half: this.half, seconds: this.clockTicks * TICK_S, minute: Math.floor(this.matchSeconds / 60), siren: this.siren, finished: this.finished },
      score: { ...this.points },
    };
    const ph = this.phase;
    const w = ph.kind === 'tackle' ? ph.wrestle : null;
    if (w && ph.kind === 'tackle') {
      const c = this.players[ph.carrier]!;
      snap.wrestle = { side: c.side, slot: c.slot, fight: w.fight0 > 0 ? w.fight / w.fight0 : 0, men: w.men.length };
    }
    return snap;
  }
}
