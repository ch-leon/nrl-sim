// src/match/league/drill.ts — Phase 0 movement drill (BAK-207 #84).
//
// Not a match: a continuous passing drill that exercises everything the live
// sim's foundation must get right before rules go in (Phase 1, #85) — 18
// bodies steering to moving targets at 20 Hz, separation, a ball that is
// always held or in flight, deterministic replay, and the lab tooling. The
// attack carries and passes up the field while the defence holds its line
// 10 m off the ball; near the line the ball is turned over and the sides swap.
import { TICK_S, type MatchSim } from '../core/engine';
import { FIELD_LENGTH, MID_Y, clampToGround } from '../core/field';
import { arrive, integrate, makeBody, maxSpeedFor, separate, speedOf, type Body } from '../core/body';
import { CARRY_LIFT, flightAt, landed, passFlight, type BallState } from '../core/ball';
import type { PlayerSnap, Side, SimEvent, Snapshot } from '../core/snapshot';
import { add, dist, scale, type Vec } from '../core/vec';
import { makeRng, type Rng } from '../../utils/rng';
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { HOOKER, PLAYERS, ROLES, formationTarget } from './roles';

interface Player {
  side: Side;
  slot: number;
  name: string;
  body: Body;
  pose: string;
  /** Hold `pose` until this tick (a pass animation). */
  poseUntil: number;
}

/** Ticks between passes, before jitter (~2 s). */
const PASS_EVERY = 40;
/** The carrier turns the ball over this far from the line he's attacking. */
const TURNOVER_M = 8;
/** Hand the ball to a support player within this radius. */
const SUPPORT_M = 14;
const PASS_POSE_TICKS = 5;

function sideOf(sheet: TeamSheet, side: Side, startDir: 1 | -1): Player[] {
  const roster: readonly (RosterEntry | undefined)[] = sheet.roster ?? [];
  const ball = { x: 50, y: MID_Y };
  return ROLES.map((role, slot) => {
    const entry = roster.find((r) => r?.position === role.name) ?? roster[slot];
    const speed = entry?.stats?.speed ?? 50;
    const pos = formationTarget(role, ball, startDir, side === 'home');
    return {
      side,
      slot,
      name: entry?.name ?? `${sheet.name} #${slot + 1}`,
      body: makeBody(pos, maxSpeedFor(speed), { x: startDir, y: 0 }),
      pose: 'idle',
      poseUntil: 0,
    };
  });
}

export class DrillSim implements MatchSim {
  tick = 0;
  readonly finished = false;
  private readonly rng: Rng;
  private readonly players: Player[];
  private ball: BallState;
  private attacking: Side = 'home';
  private dir: 1 | -1 = 1;
  /** Lateral line the carrier is running toward. */
  private lineY = MID_Y;
  private nextPassAt: number;
  private events: SimEvent[] = [];
  private sets = 0;

  constructor(home: TeamSheet, away: TeamSheet, seed: number) {
    this.rng = makeRng(seed);
    this.players = [...sideOf(home, 'home', 1), ...sideOf(away, 'away', -1)];
    const hooker = this.index('home', HOOKER);
    this.ball = { kind: 'held', by: hooker };
    this.nextPassAt = PASS_EVERY / 2;
    this.pickLine();
  }

  private index(side: Side, slot: number): number {
    return (side === 'home' ? 0 : PLAYERS) + slot;
  }

  private pickLine(): void {
    this.lineY = 6 + this.rng.next() * 56;
  }

  private emit(kind: string, text: string, p?: Player): void {
    this.events.push({ tick: this.tick, kind, text, ...(p ? { side: p.side, slot: p.slot } : {}) });
  }

  /** Ground point of the ball (where formations anchor). */
  private ballPos(): Vec {
    const b = this.ball;
    if (b.kind === 'held') return this.players[b.by]!.body.pos;
    if (b.kind === 'flight') return flightAt(b, this.tick).pos;
    return b.pos;
  }

  step(): void {
    this.tick++;
    this.events = [];
    const dt = TICK_S;
    const ball = this.ballPos();

    // Resolve a landing before anyone moves this tick.
    if (this.ball.kind === 'flight' && landed(this.ball, this.tick)) {
      const r = this.ball.receiver;
      this.ball = r !== null ? { kind: 'held', by: r } : { kind: 'loose', pos: this.ball.to, vel: { x: 0, y: 0 } };
    }

    const holder = this.ball.kind === 'held' ? this.players[this.ball.by]! : null;
    if (holder) {
      if (holder.side !== this.attacking) {
        this.attacking = holder.side;
        this.dir = holder.side === 'home' ? 1 : -1;
      }
      const goalX = this.dir > 0 ? FIELD_LENGTH : 0;
      if (Math.abs(goalX - holder.body.pos.x) <= TURNOVER_M) this.turnover(holder);
      else if (this.tick >= this.nextPassAt) this.pass(holder);
    }

    // Steering.
    for (const p of this.players) {
      const b = this.ball;
      if (b.kind === 'held' && this.players[b.by] === p) {
        // Carrier: run upfield toward his chosen lateral line, flat out.
        const target = clampToGround({ x: p.body.pos.x + this.dir * 12, y: this.lineY }, 1.5);
        arrive(p.body, target, dt, { through: true });
      } else if (b.kind === 'flight' && b.receiver !== null && this.players[b.receiver] === p) {
        // Receiver: run onto the ball's landing point.
        arrive(p.body, b.to, dt);
      } else {
        const role = ROLES[p.slot]!;
        const t = formationTarget(role, ball, this.dir, p.side === this.attacking);
        arrive(p.body, t, dt);
      }
    }
    for (const p of this.players) integrate(p.body, dt);
    // Keep bodies apart after they've moved, so what the snapshot shows is
    // already separated; two passes settle small chains at the ruck.
    const bodies = this.players.map((p) => p.body);
    for (let i = 0; i < 2; i++) {
      separate(bodies);
      for (const b of bodies) b.pos = clampToGround(b.pos, 0.5);
    }
    for (const p of this.players) {
      if (this.tick < p.poseUntil) continue;
      p.pose = speedOf(p.body) > 0.6 ? 'run' : 'idle';
    }
  }

  private supportFor(carrier: Player): Player | null {
    let best: Player | null = null;
    let bestD = Infinity;
    for (const p of this.players) {
      if (p === carrier || p.side !== carrier.side) continue;
      const behind = (carrier.body.pos.x - p.body.pos.x) * this.dir;
      if (behind < -1.5) continue; // forward pass
      const d = dist(p.body.pos, carrier.body.pos);
      if (d < 2 || d > SUPPORT_M) continue;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private pass(carrier: Player): void {
    const to = this.supportFor(carrier);
    this.nextPassAt = this.tick + Math.round(PASS_EVERY * (0.6 + this.rng.next() * 0.8));
    if (!to) return;
    // Lead the receiver by where he'll be when the ball arrives.
    const flightS = dist(carrier.body.pos, to.body.pos) / 16;
    const lead = clampToGround(add(to.body.pos, scale(to.body.vel, flightS)), 1.5);
    this.ball = passFlight(carrier.body.pos, lead, this.tick, this.index(to.side, to.slot));
    carrier.pose = 'pass';
    carrier.poseUntil = this.tick + PASS_POSE_TICKS;
    this.pickLine();
    this.emit('pass', `${carrier.name} passes to ${to.name}`, carrier);
  }

  private turnover(carrier: Player): void {
    const other: Side = carrier.side === 'home' ? 'away' : 'home';
    const hooker = this.players[this.index(other, HOOKER)]!;
    this.sets++;
    this.attacking = other;
    this.dir = other === 'home' ? 1 : -1;
    this.ball = passFlight(carrier.body.pos, hooker.body.pos, this.tick, this.index(other, HOOKER), 14, 3);
    carrier.pose = 'pass';
    carrier.poseUntil = this.tick + PASS_POSE_TICKS;
    this.nextPassAt = this.tick + PASS_EVERY / 2;
    this.pickLine();
    this.emit('turnover', `Turnover — ${other} ball`, carrier);
  }

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
      ball = { x: h.body.pos.x, y: h.body.pos.y, lift: CARRY_LIFT, holder: { side: h.side, slot: h.slot } };
    } else if (b.kind === 'flight') {
      const f = flightAt(b, this.tick);
      ball = { x: f.pos.x, y: f.pos.y, lift: f.lift, holder: null };
    } else {
      ball = { x: b.pos.x, y: b.pos.y, lift: 0, holder: null };
    }
    return {
      tick: this.tick,
      players,
      ball,
      label: `Drill · ${this.attacking} attacking · set ${this.sets + 1} · ${(this.tick * TICK_S).toFixed(1)}s`,
      events: this.events,
    };
  }
}
