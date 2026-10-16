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
// Phase 1 scope: no scoring beyond tries, no stamina, no weather — those come
// with the full match (Phase 2, #86).
import { SET_TACKLES } from '../../config';
import { makeRng, type Rng } from '../../utils/rng';
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { TICK_S, type MatchSim } from '../core/engine';
import { FIELD_LENGTH, MID_Y, clampToGround, inGoal } from '../core/field';
import { arrive, integrate, makeBody, maxSpeedFor, separate, speedOf, type Body } from '../core/body';
import { CARRY_LIFT, flightAt, kickFlight, landed, passFlight, rollFlight, type BallState } from '../core/ball';
import type { PlayerSnap, Side, SimEvent, Snapshot } from '../core/snapshot';
import { add, clamp, dist, dot, norm, scale, sub, type Vec } from '../core/vec';
import { AVERAGE, angleFrom, interceptChance, knockOnChance, resolveContest, stepChance, type ContestStats, type Situation } from './contest';
import { FULLBACK, HOOKER, KICKER, PLAYERS, ROLES, formationTarget } from './roles';
import { gapTarget, intercept, kickTarget, kickoffTarget, pickReceiver, supportSpots, type Candidate } from './tactics';

// ── Timing (ticks at 20 Hz) ──────────────────────────────────────────────────
const CONTACT_TICKS = 9;
const DOWN_TICKS = 10;
const PTB_TICKS = 11;
const ROLL_TICKS = 4;
const DH_HOLD_TICKS = 6;
const TRY_TICKS = 50;
/** A kick-off waits for everyone to be set, at least this long and at most RESTART_MAX. */
const RESTART_TICKS = 40;
const RESTART_MAX_TICKS = 120;
/** A receiver must be this close to where a pass / kick comes down to take it. */
const CATCH_REACH = 1.8;
/** After a pass or catch, no new pass for this long. */
const PASS_COOLDOWN = 12;
/** A tackled carrier can't be the next receiver for this long after his ptb. */
const BUSY_AFTER_PTB = 24;
/** Breaking a tackle gives a burst of pace. */
const BURST_TICKS = 16;
const BURST = 1.15;
/** After beating a tackler the carrier can't be hit again for this long. */
const IMMUNE_TICKS = 8;
/** A beaten tackler sits out this long before committing again. */
const BEATEN_COOLDOWN = 30;
/** The kicker runs this long with the ball before putting boot to it. */
const KICK_RUN_TICKS = 14;
const KICK_LOCK_TICKS = 8;
const KICK_CONTACT_TICKS = 3;
const PASS_POSE_TICKS = 5;

// ── Distances (metres) ───────────────────────────────────────────────────────
/** Carrier starts deciding (pass / into contact) with a defender this close. */
const ENGAGE_M = 4.5;
/** A defender this close to the carrier makes the tackle. */
const TACKLE_REACH = 1.2;
/** The defensive line stands this far off the ruck. */
const ONSIDE_M = 10;
/** Line rush-up speed, m/s. */
const LINE_SPEED = 3.5;
/** A big hit drives the carrier back this far. */
const DRIVE_BACK = 2.5;
/** A support runner this close can take an offload. */
const OFFLOAD_M = 5;
/** Inside this many metres of the line the last play is run, not kicked. */
const RUN_IT_M = 22;
/** Loose ball picked up within this reach. */
const PICKUP_M = 0.9;
/** A defender this close to a receiver makes the catch a pressured one. */
const PRESSURE_M = 2;
/** A lone defender this close can be stepped (checked once per defender). */
const STEP_RANGE = 2.6;
/** Another defender within this of the carrier makes it a two-man tackle. */
const SECOND_MAN_M = 3.5;
/** A defender this close to the pass line can pick it off. */
const LANE_M = 1.5;
/** A step jinks the carrier this far sideways, over this many ticks. */
const STEP_JINK_M = 1.6;
const STEP_JINK_TICKS = 4;

interface Stats extends ContestStats {}

interface Player {
  side: Side;
  slot: number;
  name: string;
  stats: Stats;
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
  /** Faster until then (break-tackle burst). */
  burstUntil: number;
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
  | { kind: 'tackle'; t0: number; carrier: number; tackler: number; big: boolean }
  | { kind: 'ruck'; t0: number; carrier: number; tackler: number; stage: 'down' | 'ptb' | 'dh'; handover: boolean; heldAt: number }
  | { kind: 'try'; t0: number; scorer: number };

interface PendingKick {
  at: number;
  kicker: number;
  to: Vec;
  receiver: number | null;
  peak: number;
  kickoff: boolean;
}

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const dirOf = (s: Side): 1 | -1 => (s === 'home' ? 1 : -1);

function statsOf(entry: RosterEntry | undefined): Stats {
  const s = entry?.stats;
  return s ? { strength: s.strength, speed: s.speed, skill: s.skill, footyIQ: s.footyIQ } : { ...AVERAGE };
}

export class LiveSim implements MatchSim {
  tick = 0;
  readonly finished = false;
  private readonly rng: Rng;
  private readonly players: Player[];
  private readonly names: Record<Side, string>;
  private ball: BallState;
  private phase: Phase;
  private attacking: Side = 'home';
  private dir: 1 | -1 = 1;
  private tackles = 0;
  private lastPlay = false;
  /** Where the play-the-ball is / was (the line forms off it). */
  private mark: Vec = { x: 50, y: MID_Y };
  /** The defensive line's x. */
  private lineX = 60;
  private pendingKick: PendingKick | null = null;
  /** A loose ball only this side may take (after a knock-on); null = anyone's. */
  private looseFor: Side | null = null;
  private events: SimEvent[] = [];
  readonly tries: Record<Side, number> = { home: 0, away: 0 };

  constructor(home: TeamSheet, away: TeamSheet, seed: number) {
    this.rng = makeRng(seed);
    this.names = { home: home.name, away: away.name };
    this.players = [...this.buildSide(home, 'home'), ...this.buildSide(away, 'away')];
    this.ball = { kind: 'held', by: this.idx('away', KICKER) };
    this.phase = { kind: 'restart', t0: 0, kicking: 'away' };
    this.attacking = 'home';
    this.dir = 1;
    this.assignTargets();
    for (const p of this.players) p.body.pos = { ...p.target };
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
      return {
        side,
        slot,
        name: entry?.name ?? `${sheet.name} #${slot + 1}`,
        stats,
        body: makeBody({ x: 50, y: MID_Y }, maxSpeedFor(stats.speed), { x: dirOf(side), y: 0 }),
        pose: 'idle',
        poseUntil: 0,
        lockUntil: 0,
        slide: null,
        busyUntil: 0,
        cooldownUntil: 0,
        immuneUntil: 0,
        burstUntil: 0,
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
  private emit(kind: string, text: string, p?: Player): void {
    this.events.push({ tick: this.tick, kind, text, ...(p ? { side: p.side, slot: p.slot, player: p.name } : {}) });
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
    this.tick++;
    this.events = [];
    this.launchPendingKick();
    this.landings();
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
    }
    this.assignTargets();
    this.move();
  }

  // ── Ball resolution ───────────────────────────────────────────────────────
  private launchPendingKick(): void {
    const k = this.pendingKick;
    if (!k || this.tick < k.at) return;
    this.pendingKick = null;
    const kicker = this.players[k.kicker]!;
    this.ball = kickFlight(kicker.body.pos, k.to, this.tick, k.receiver, k.peak);
    const receiving = other(kicker.side);
    this.attacking = receiving;
    this.dir = dirOf(receiving);
    this.tackles = 0;
    this.lastPlay = false;
    this.lineX = k.to.x + this.dir * ONSIDE_M;
    this.emit(k.kickoff ? 'kickoff' : 'kick', k.kickoff ? `${kicker.name} kicks off` : `${kicker.name} kicks long on the last`, kicker);
    if (this.phase.kind !== 'play') this.phase = { kind: 'play' };
  }

  private landings(): void {
    const b = this.ball;
    if (b.kind === 'flight') {
      if (!landed(b, this.tick)) return;
      const r = b.receiver !== null ? this.players[b.receiver] : undefined;
      if (!r || (b.via !== 'roll' && dist(r.body.pos, b.to) > CATCH_REACH)) {
        // Nobody under it: it comes down loose and whoever gets there takes it.
        this.ball = { kind: 'loose', pos: { ...b.to }, vel: { x: 0, y: 0 } };
        this.looseFor = null;
        return;
      }
      const pressured = this.side(other(r.side)).some((d) => !this.locked(d) && dist(d.body.pos, r.body.pos) < PRESSURE_M);
      if (b.via === 'pass' && r.side === this.attacking && this.rng.next() < knockOnChance(r.stats.skill, pressured)) {
        // Spilled: the ball squirts forward and the defence takes over.
        this.emit('error', `${r.name} spills it — knock-on`, r);
        this.ball = { kind: 'loose', pos: add(b.to, scale({ x: this.dir, y: 0 }, 1.5)), vel: { x: 0, y: 0 } };
        this.turnover();
        this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
        return;
      }
      this.ball = { kind: 'held', by: b.receiver as number };
      r.catchTick = this.tick;
      r.decided = false;
      r.steppedOn = -1;
      if (b.via === 'pass' && r.side !== this.attacking) {
        this.emit('intercept', `${r.name} picks it off!`, r);
        this.turnover();
        r.burstUntil = this.tick + BURST_TICKS;
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
      let bd = PICKUP_M;
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

  /** Possession changes hands where the ball is; a fresh set for the other side. */
  private turnover(): void {
    this.attacking = other(this.attacking);
    this.dir = dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    const bp = this.ballPos();
    this.mark = { ...bp };
    this.lineX = bp.x + this.dir * ONSIDE_M;
    this.phase = { kind: 'play' };
  }

  // ── Phases ────────────────────────────────────────────────────────────────
  private stepRestart(ph: Extract<Phase, { kind: 'restart' }>): void {
    if (this.tick < ph.t0 + RESTART_TICKS || this.pendingKick) return;
    const kicker = this.at(ph.kicking, KICKER);
    // Wait until the teams are set (the kicker on the spot, everyone near his).
    const ready = dist(kicker.body.pos, kicker.target) < 1 && this.players.every((p) => dist(p.body.pos, p.target) < 3);
    if (!ready && this.tick < ph.t0 + RESTART_MAX_TICKS) return;
    const receiving = other(ph.kicking);
    const rd = dirOf(receiving);
    this.lock(kicker, 'kick', KICK_LOCK_TICKS);
    this.pendingKick = {
      at: this.tick + KICK_CONTACT_TICKS,
      kicker: this.indexOf(kicker),
      to: kickoffTarget(rd, this.rng.next()),
      receiver: this.idx(receiving, FULLBACK),
      peak: 16,
      kickoff: true,
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

    // Last-tackle kick: the kicker runs a few steps then puts boot to ball,
    // unless the line is close enough to have a crack.
    const toLine = this.dir > 0 ? FIELD_LENGTH - h.body.pos.x : h.body.pos.x;
    if (this.lastPlay && h.slot === KICKER && toLine > RUN_IT_M && (this.tick - h.catchTick >= KICK_RUN_TICKS || nearD < ENGAGE_M)) {
      const fb = this.at(other(this.attacking), FULLBACK);
      this.lock(h, 'kick', KICK_LOCK_TICKS);
      this.pendingKick = {
        at: this.tick + KICK_CONTACT_TICKS,
        kicker: this.indexOf(h),
        to: kickTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next()),
        receiver: this.indexOf(fb),
        peak: 12,
        kickoff: false,
      };
      return;
    }

    // Engaged: decide once — shift it to a better option out the back, or
    // take the line on. Re-deciding every tick would pass out of every contact.
    if (nearD < ENGAGE_M && !h.decided && this.tick - h.catchTick >= PASS_COOLDOWN) {
      h.decided = true;
      const receiver = pickReceiver(h.body.pos, this.dir, this.candidates(h));
      if (receiver !== null && this.rng.next() < 0.3 + h.stats.skill / 300) {
        this.pass(h, this.players[receiver]!);
        return;
      }
    }

    if (this.tick < h.immuneUntil) return;

    // One-on-one and the defender is almost on him: try to step (once per defender).
    if (nearest && nearD <= STEP_RANGE && this.steppedOn(h) !== this.indexOf(nearest)) {
      const sit = this.situation(h, nearest, committed);
      if (sit.defenders === 1) {
        h.steppedOn = this.indexOf(nearest);
        if (this.rng.next() < stepChance(h.stats, nearest.stats, sit)) {
          this.sidestep(h, nearest);
          return;
        }
      }
    }

    // Contact: a committed defender has reached him.
    for (const d of committed) {
      if (dist(d.body.pos, h.body.pos) <= TACKLE_REACH) {
        this.contest(h, d, committed);
        return;
      }
    }
  }

  private steppedOn(h: Player): number {
    return h.steppedOn;
  }

  /** The geometry of a contact: numbers, angle, momentum, tackle count, support. */
  private situation(c: Player, t: Player, committed: readonly Player[]): Situation {
    const others = committed.filter((d) => d !== t && dist(d.body.pos, c.body.pos) < SECOND_MAN_M).length;
    const defenders = others >= 2 ? 3 : others === 1 ? 2 : 1;
    const approach = norm(sub(c.body.pos, t.body.pos)); // the way the tackler is closing
    const angle = angleFrom(-dot(approach, c.body.heading)); // square when he comes at the carrier's face
    const support = this.side(c.side).some((p) => p !== c && p.slot !== HOOKER && !this.locked(p) && dist(p.body.pos, c.body.pos) < OFFLOAD_M);
    return {
      defenders,
      angle,
      speedDiff: speedOf(c.body) - speedOf(t.body),
      lastTackle: this.lastPlay,
      carrierFatigue: 0,
      tacklerFatigue: 0,
      support,
    };
  }

  /** A clean step: the defender grasps air, the carrier jinks past with a burst. */
  private sidestep(c: Player, t: Player): void {
    this.emit('step', `${c.name} steps ${t.name}!`, c);
    const sideways = c.body.pos.y >= t.body.pos.y ? 1 : -1;
    c.jink = { dy: sideways * STEP_JINK_M, ticks: STEP_JINK_TICKS };
    this.lock(t, 'tackled', 12, add(t.body.pos, { x: this.dir * 0.8, y: -sideways * 0.6 }));
    t.cooldownUntil = this.tick + BEATEN_COOLDOWN;
    c.immuneUntil = this.tick + IMMUNE_TICKS;
    c.burstUntil = this.tick + BURST_TICKS;
  }

  private stepTackle(ph: Extract<Phase, { kind: 'tackle' }>): void {
    if (this.tick < ph.t0 + CONTACT_TICKS) return;
    const c = this.players[ph.carrier]!;
    const t = this.players[ph.tackler]!;
    this.tackles++;
    const handover = this.tackles >= SET_TACKLES;
    this.mark = { ...c.body.pos };
    this.lineX = this.mark.x + this.dir * ONSIDE_M;
    this.lock(c, 'down', DOWN_TICKS);
    this.lock(t, 'down', DOWN_TICKS);
    this.phase = { kind: 'ruck', t0: this.tick, carrier: ph.carrier, tackler: ph.tackler, stage: 'down', handover, heldAt: 0 };
  }

  private stepRuck(ph: Extract<Phase, { kind: 'ruck' }>): void {
    const c = this.players[ph.carrier]!;
    if (ph.stage === 'down') {
      if (this.tick < ph.t0 + DOWN_TICKS) return;
      // Up, step over it and heel it back.
      this.lock(c, 'ptb', PTB_TICKS);
      ph.stage = 'ptb';
      ph.t0 = this.tick;
      return;
    }
    if (ph.stage === 'ptb') {
      if (this.tick < ph.t0 + PTB_TICKS) return;
      if (ph.handover) {
        this.emit('handover', `Tackled on the last — handover to ${this.names[other(this.attacking)]}`, c);
        this.attacking = other(this.attacking);
        this.dir = dirOf(this.attacking);
        this.tackles = 0;
        this.lastPlay = false;
        this.lineX = this.mark.x + this.dir * ONSIDE_M;
      }
      const dh = this.at(this.attacking, HOOKER);
      const spot = this.dummyHalfSpot();
      // Heel it to where he actually is (he's been running to the mark); if he's
      // still a way off, to the mark and he collects it there.
      const dhSpot = dist(dh.body.pos, spot) < 3 ? { ...dh.body.pos } : spot;
      this.ball = rollFlight(c.body.pos, dhSpot, this.tick, this.indexOf(dh), ROLL_TICKS);
      c.busyUntil = this.tick + BUSY_AFTER_PTB;
      c.pose = 'idle';
      c.poseUntil = 0;
      dh.pose = 'dummyHalf';
      dh.poseUntil = this.tick + ROLL_TICKS + DH_HOLD_TICKS + 2;
      ph.stage = 'dh';
      ph.t0 = this.tick;
      return;
    }
    // 'dh': wait for the heel to arrive, a beat, then move it.
    const h = this.holder();
    if (!h || h.slot !== HOOKER || h.side !== this.attacking) return;
    if (ph.heldAt === 0) ph.heldAt = this.tick;
    if (this.tick < ph.heldAt + DH_HOLD_TICKS) return;
    this.lastPlay = this.tackles === SET_TACKLES - 1;
    let receiver: number | null = null;
    if (this.lastPlay) {
      const k = this.at(this.attacking, KICKER);
      if (!this.locked(k) && this.tick >= k.busyUntil) receiver = this.indexOf(k);
    }
    if (receiver === null) receiver = pickReceiver(h.body.pos, this.dir, this.candidates(h));
    if (receiver === null || this.rng.next() < 0.08) {
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
    if (this.tick < ph.t0 + TRY_TICKS) return;
    const scorer = this.players[ph.scorer]!;
    for (const p of this.players) {
      p.pose = 'idle';
      p.poseUntil = 0;
    }
    const kicking = other(scorer.side);
    this.ball = { kind: 'held', by: this.idx(kicking, KICKER) };
    this.attacking = other(kicking);
    this.dir = dirOf(this.attacking);
    this.phase = { kind: 'restart', t0: this.tick, kicking };
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  private pass(from: Player, to: Player): void {
    const flightS = dist(from.body.pos, to.body.pos) / 16;
    const lead = clampToGround(add(to.body.pos, scale(to.body.vel, flightS * 0.8)), 1);
    // A defender sitting in the lane may pick it off: the ball then flies to him.
    const thief = this.laneDefender(from.body.pos, lead, from.side);
    const cutOut = dist(from.body.pos, lead) > 12;
    if (thief && this.rng.next() < interceptChance(thief.stats.footyIQ, cutOut)) {
      this.ball = passFlight(from.body.pos, { ...thief.body.pos }, this.tick, this.indexOf(thief));
    } else {
      this.ball = passFlight(from.body.pos, lead, this.tick, this.indexOf(to));
    }
    from.pose = 'pass';
    from.poseUntil = this.tick + PASS_POSE_TICKS;
    from.catchTick = this.tick;
  }

  /** The defender nearest the pass line and within LANE_M of it, if any. */
  private laneDefender(from: Vec, to: Vec, side: Side): Player | null {
    const seg = sub(to, from);
    const len2 = seg.x * seg.x + seg.y * seg.y;
    if (len2 < 1) return null;
    let best: Player | null = null;
    let bd = LANE_M;
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
    const outcome = resolveContest(c.stats, t.stats, this.rng.next(), sit);
    const back = scale({ x: -this.dir, y: 0 }, 1);
    switch (outcome) {
      case 'strip': {
        // One-on-one, he rips it free: the tackler is the new carrier.
        this.emit('strip', `${t.name} strips the ball from ${c.name}!`, t);
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
        this.emit('break-tackle', `${c.name} busts through ${t.name}`, c);
        this.lock(t, 'down', 16, add(t.body.pos, scale(back, -1.2)));
        t.cooldownUntil = this.tick + BEATEN_COOLDOWN;
        c.immuneUntil = this.tick + IMMUNE_TICKS;
        c.burstUntil = this.tick + BURST_TICKS;
        return;
      case 'fend':
        this.emit('fend', `${c.name} palms off ${t.name}`, c);
        c.pose = 'fend';
        c.poseUntil = this.tick + 6;
        this.lock(t, 'tackled', 14, add(t.body.pos, scale(back, -1.5)));
        t.cooldownUntil = this.tick + BEATEN_COOLDOWN;
        c.immuneUntil = this.tick + IMMUNE_TICKS;
        return;
      case 'offload': {
        const cands = this.candidates(c).filter((k) => dist(this.players[k.idx]!.body.pos, c.body.pos) < OFFLOAD_M + 2);
        const r = pickReceiver(c.body.pos, this.dir, cands) ?? cands.find((k) => !k.busy)?.idx ?? null;
        if (r !== null) {
          this.emit('offload', `${c.name} gets the offload away to ${this.players[r]!.name}`, c);
          this.pass(c, this.players[r]!);
          this.lock(c, 'tackled', CONTACT_TICKS + DOWN_TICKS);
          this.lock(t, 'tackle', CONTACT_TICKS + DOWN_TICKS);
          c.busyUntil = this.tick + CONTACT_TICKS + DOWN_TICKS + 10;
          return;
        }
        break; // nobody there after all: a plain tackle
      }
      default:
        break;
    }
    const big = outcome === 'big-hit';
    this.emit(big ? 'big-hit' : 'tackle', big ? `${t.name} smashes ${c.name} backwards!` : `${t.name} wraps up ${c.name}`, t);
    const drive = big ? scale(back, DRIVE_BACK) : { x: 0, y: 0 };
    this.lock(c, 'tackled', CONTACT_TICKS, big ? add(c.body.pos, drive) : undefined);
    this.lock(t, 'tackle', CONTACT_TICKS, big ? add(t.body.pos, drive) : undefined);
    this.phase = { kind: 'tackle', t0: this.tick, carrier: this.indexOf(c), tackler: this.indexOf(t), big };
  }

  private score(scorer: Player): void {
    this.tries[scorer.side]++;
    this.emit('try', `TRY! ${scorer.name} dives over for ${this.names[scorer.side]}`, scorer);
    this.lock(scorer, 'dive', 10, add(scorer.body.pos, scale({ x: this.dir, y: 0 }, 1.5)));
    scorer.poseUntil = this.tick + TRY_TICKS;
    for (const p of this.side(scorer.side)) {
      if (p === scorer) continue;
      p.pose = 'celebrate';
      p.poseUntil = this.tick + TRY_TICKS;
    }
    this.phase = { kind: 'try', t0: this.tick, scorer: this.indexOf(scorer) };
  }

  // ── Who goes where ────────────────────────────────────────────────────────
  private committed(h: Player, defenders: readonly Player[]): Player[] {
    const free = defenders.filter((d) => !this.locked(d) && this.tick >= d.cooldownUntil);
    // A defender already behind the carrier can only chase; the ones in front
    // of him are the tackle, so they rank first.
    const behind = (d: Player): boolean => (d.body.pos.x - h.body.pos.x) * this.dir < 0;
    const cost = (d: Player): number => dist(d.body.pos, h.body.pos) + (behind(d) ? 60 : 0);
    free.sort((a, b) => cost(a) - cost(b));
    const ahead = free.filter((d) => !behind(d)).length;
    // A broken line (two or fewer still in front) sends everyone in range after him.
    const n = ahead <= 2 ? 4 : free[2] && dist(free[2].body.pos, h.body.pos) < 5 ? 3 : 2;
    return free.slice(0, n);
  }

  private candidates(passer: Player): Candidate[] {
    return this.side(passer.side)
      .filter((p) => p !== passer)
      .map((p) => ({ idx: this.indexOf(p), pos: p.body.pos, busy: this.locked(p) || this.tick < p.busyUntil || (p.slot === HOOKER && this.phase.kind === 'ruck') }));
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

    if (ph.kind === 'restart' || ph.kind === 'try') {
      // Everyone to their kick-off spots (defenders trudge back after a try).
      const kicking = ph.kind === 'restart' ? ph.kicking : other(this.players[ph.scorer]!.side);
      const receiving = other(kicking);
      const rd = dirOf(receiving);
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
        // Teammates mob the scorer for a moment.
        const s = this.players[ph.scorer]!;
        for (const p of this.side(s.side)) {
          if (p === s) continue;
          p.target = { x: s.body.pos.x - this.dir * (1.5 + (p.slot % 3)), y: clamp(s.body.pos.y + (p.slot - 4) * 1.4, 1, 67) };
        }
      }
      return;
    }

    // Loose ball: the two nearest of each side go for it, everyone else holds shape.
    const chasers = new Set<Player>();
    if (this.ball.kind === 'loose') {
      for (const s of ['home', 'away'] as const) {
        if (this.looseFor && s !== this.looseFor) continue;
        const near = this.side(s).filter((p) => !this.locked(p)).sort((a, b) => dist(a.body.pos, bp) - dist(b.body.pos, bp));
        for (const p of near.slice(0, 2)) chasers.add(p);
      }
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
    for (const p of attackers) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (chasers.has(p)) {
        p.target = { ...bp };
      } else if (p === carrier) {
        if (ph.kind === 'play') {
          const defs = this.side(def).filter((d) => !this.locked(d)).map((d) => d.body.pos);
          p.target = gapTarget(p.body.pos, this.dir, defs);
          p.through = true;
        } else p.target = { ...p.body.pos };
      } else if (p === receiver) {
        p.target = { ...flight!.to };
      } else if (p.slot === HOOKER && (ph.kind === 'tackle' || ph.kind === 'ruck')) {
        p.target = this.dummyHalfSpot();
      } else if (supports.includes(p)) {
        const s = spots[supports.indexOf(p) as 0 | 1];
        // Take the side he's already on.
        const mine = (p.body.pos.y < anchor.y) === (s.y < anchor.y) ? s : spots[supports.indexOf(p) === 0 ? 1 : 0];
        p.target = mine;
      } else {
        p.target = formationTarget(role, anchor, this.dir, true);
      }
    }

    // Defence.
    const defenders = this.side(def);
    const inRuck = ph.kind === 'tackle' || ph.kind === 'ruck';
    if (ph.kind === 'play' && carrier) {
      const want = carrier.body.pos.x + this.dir * 2.5;
      const stepM = LINE_SPEED * TICK_S;
      // Rush up toward the carrier, never past him.
      if (this.dir > 0) this.lineX = Math.max(want, this.lineX - stepM);
      else this.lineX = Math.min(want, this.lineX + stepM);
    }
    const committed = ph.kind === 'play' && carrier ? this.committed(carrier, defenders) : [];
    const markers: Player[] = [];
    if (inRuck) {
      const t = this.players[(ph as Extract<Phase, { kind: 'tackle' | 'ruck' }>).tackler]!;
      markers.push(t);
      const second = defenders
        .filter((d) => d !== t && d.slot !== FULLBACK)
        .sort((a, b) => dist(a.body.pos, this.mark) - dist(b.body.pos, this.mark))[0];
      if (second) markers.push(second);
    }
    for (const p of defenders) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (chasers.has(p)) {
        p.target = { ...bp };
      } else if (p === receiver) {
        p.target = { ...flight!.to };
      } else if (committed.includes(p) && carrier) {
        // Cut the angle: meet him where he's going, not where he is.
        p.target = clampToGround(intercept(p.body.pos, p.body.maxSpeed, carrier.body.pos, carrier.body.vel), 0.5);
        p.through = true;
      } else if (markers.includes(p)) {
        const k = markers.indexOf(p);
        p.target = clampToGround({ x: this.mark.x + this.dir * 0.8, y: this.mark.y + (k === 0 ? -0.9 : 0.9) }, 0.5);
      } else if (p.slot === FULLBACK) {
        p.target = { x: clamp(this.lineX + this.dir * 16, -8, FIELD_LENGTH + 8), y: clamp(MID_Y + (anchor.y - MID_Y) * 0.6, 4, 64) };
      } else {
        const y = clamp(role.lane + (anchor.y - MID_Y) * role.pull, 1.5, 66.5);
        p.target = { x: clamp(this.lineX, -8, FIELD_LENGTH + 8), y };
      }
    }
  }

  // ── Physics ───────────────────────────────────────────────────────────────
  private move(): void {
    const dt = TICK_S;
    const held = new Set<Body>();
    for (const p of this.players) {
      if (this.locked(p)) {
        held.add(p.body);
        if (p.slide) {
          const u = Math.min(1, (this.tick - p.slide.t0) / Math.max(1, p.slide.t1 - p.slide.t0));
          const e = u * (2 - u);
          p.body.pos = { x: p.slide.from.x + (p.slide.to.x - p.slide.from.x) * e, y: p.slide.from.y + (p.slide.to.y - p.slide.from.y) * e };
        }
        continue;
      }
      p.slide = null;
      const max = this.tick < p.burstUntil ? p.body.maxSpeed * BURST : p.body.maxSpeed;
      arrive(p.body, p.target, dt, { through: p.through, maxSpeed: max });
      integrate(p.body, dt);
      if (p.jink) {
        // The sidestep: a sharp lateral shift spread over a few ticks.
        p.body.pos = clampToGround(add(p.body.pos, { x: 0, y: p.jink.dy / STEP_JINK_TICKS }), 0.5);
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
    const ph = this.phase.kind;
    const state = ph === 'play' ? `tackle ${Math.min(this.tackles, SET_TACKLES)}/${SET_TACKLES}${this.lastPlay ? ' · last' : ''}` : ph;
    return {
      tick: this.tick,
      players,
      ball,
      label: `${this.names[this.attacking]} ball · ${state} · ${this.tries.home}–${this.tries.away} · ${(this.tick * TICK_S).toFixed(1)}s`,
      events: this.events,
    };
  }
}
