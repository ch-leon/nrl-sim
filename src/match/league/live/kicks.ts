import { FIELD_LENGTH, FIELD_WIDTH, MID_X, MID_Y, inPlay } from '../../core/field';
import { KICK_SPEED, grubberFlight, hangTime, kickFlight, landed, type BallState } from '../../core/ball';
import type { InterceptionSnap, Side } from '../../core/snapshot';
import { clamp, dist, dot, norm, sub, type Vec } from '../../core/vec';
import { knockOnChance } from '../contest';
import { legsSpeed } from '../fatigue';
import { GAS, canSprint, paceMult } from '../gas';
import { KICKOFF, kickoffLanding, pinnedDeep, regatherChance, type KickoffCall } from '../kickoff';
import { KICK_CONTEST, fieldingRead, grubberRace, highBall } from '../kickContest';
import { TOUCH, exitPoint, inOwnInGoal, outOfPlay, ownLineX, touchRestartSpot } from '../touch';
import { ROLES } from '../roles';
import { WING_BOMB } from '../tactics';
import { GOAL_LINE_STAND } from '../goalLineStand';
import { speedMult } from '../traits';
import { WEATHER } from '../weather';
import { LIVE } from './knobs';
import { KICK_RETURN, readKickReturn } from './kickReturn';
import { readShoulder, type ShoulderRead } from './centreCarry';
import { other, AIM_TEXT, KICK_TEXT, type Player, type Phase, type PendingKick } from './types';
import { LiveClock } from './clock';
import { TICK_S } from '../../core/engine';
import { BOMB_PLANT_TICKS, BOMB_RECOVERY_TICKS, BOMB_TAKEOFF_LEAD, type BombContestSnap } from '../../core/snapshot';

interface KickReturn {
  carrier: Player;
  key: string;
  phase: Extract<Phase, { kind: 'play' }>;
  catchTick: number;
  untilTick: number;
  priorBurstUntil: number;
  target: Vec;
  supportSide: -1 | 0 | 1;
  supports: { player: Player; key: string }[];
}

export abstract class LiveKicks extends LiveClock {
  /** Presentation only, written when the defender actually takes the pass. */
  protected visualInterception?: InterceptionSnap;

  private kickReturn: KickReturn | null = null;

  private returnSupportAvailable(p: Player): boolean {
    return this.onField(p) && p.subFor === null && !this.locked(p) && this.tick >= p.busyUntil;
  }

  private startKickReturn(carrier: Player): void {
    const side = carrier.side;
    if (this.phase.kind !== 'play' || !inPlay(carrier.body.pos) || !this.onField(carrier) || carrier.subFor !== null
      || this.pendingControl[side] || this.callState[side].attack || this.pendingPlay[side] || this.scripted) return;
    const chase = this.side(other(side)).filter(d => !this.locked(d) && this.tick >= d.cooldownUntil && d.subFor === null && this.retreatLine(d) === null);
    const target = readKickReturn(carrier.body.pos, this.dir, chase.map(d => d.body));
    if (!target) return;

    const supports = this.side(side).filter(p => p !== carrier && this.returnSupportAvailable(p))
      .sort((a, b) => dist(a.body.pos, carrier.body.pos) - dist(b.body.pos, carrier.body.pos) || a.slot - b.slot)
      .slice(0, 2).sort((a, b) => a.body.pos.y - b.body.pos.y || a.slot - b.slot)
      .map(player => ({ player, key: player.key }));
    const untilTick = carrier.lockUntil + KICK_RETURN.burstTicks;
    const y = carrier.body.pos.y;
    const halfWidth = KICK_RETURN.supportWideM / 2;
    const supportSide = supports.length !== 2 ? 0 : supports[0]!.player.body.pos.y >= y + halfWidth ? 1
      : supports[1]!.player.body.pos.y <= y - halfWidth ? -1 : 0;
    this.kickReturn = { carrier, key: carrier.key, phase: this.phase, catchTick: this.tick, untilTick,
      priorBurstUntil: carrier.burstUntil, target, supportSide, supports };
    carrier.burstUntil = Math.max(carrier.burstUntil, untilTick);
  }

  protected currentKickReturn(carrier: Player | null): KickReturn | null {
    const ret = this.kickReturn;
    if (!ret) return null;
    if (carrier === ret.carrier && carrier.key === ret.key && carrier.catchTick === ret.catchTick && this.phase === ret.phase
      && this.tick < ret.untilTick && !carrier.jink && this.tick >= carrier.immuneUntil && this.overLineAt < 0
      && this.onField(carrier) && carrier.subFor === null && !this.pendingControl[carrier.side] && !this.callState[carrier.side].attack
      && !this.pendingPlay[carrier.side] && !this.scripted && !this.pendingKick && !this.pendingGoal) return ret;
    this.endKickReturn();
    return null;
  }

  protected kickReturnSupportIndex(ret: KickReturn, p: Player): number {
    return ret.supports.findIndex(s => s.player === p && s.key === p.key && this.returnSupportAvailable(p));
  }

  protected endKickReturn(): void {
    const ret = this.kickReturn;
    if (!ret) return;
    const p = ret.carrier;
    if (p.key === ret.key && p.burstUntil === ret.untilTick && p.brokeAt < ret.catchTick) p.burstUntil = ret.priorBurstUntil;
    this.kickReturn = null;
  }

  protected centreCarry: (Omit<ShoulderRead, 'defender'> & {
    carrier: Player; defender: Player; catchTick: number; untilTick: number;
  }) | null = null;

  private readCentreCarry(p: Player): void {
    if (LIVE.centreShoulderTicks <= 0 || this.phase.kind !== 'play' || p.side !== this.attacking
      || ROLES[p.slot]!.name !== 'centre' || this.scripted || this.tucked === this.indexOf(p)
      || this.offloadReceiver !== null || this.pendingControl[p.side] || this.locked(p) || !this.onField(p) || p.subFor !== null) return;
    const heldMarkers = this.tick < this.ruckPlayedAt + LIVE.markerReleaseTicks * this.defPlan().markerHold;
    const defenders = this.side(other(p.side)).filter(d => !this.locked(d) && this.tick >= d.cooldownUntil
      && this.retreatLine(d) === null && !(heldMarkers && this.markers.includes(this.indexOf(d))));
    const read = readShoulder(p.body, this.dir, defenders.map(d => d.body));
    this.centreCarry = read && { ...read, carrier: p, defender: defenders[read.defender]!,
      catchTick: this.tick, untilTick: this.tick + LIVE.centreShoulderTicks };
  }

  protected visualBombContest: BombContestSnap | undefined;

  /** Read the aim during the wind-up, then check the same read at the boot. */
  protected kickLanding(kick: PendingKick): Vec {
    if (WING_BOMB.on <= 0 || kick.wingBombRoll === undefined) return kick.to;
    return this.wingBombTarget(this.players[kick.kicker]!, kick.wingBombRoll, kick.peak) ?? kick.to;
  }

  /** At the boot, look for an onside winger who can get under a bomb in his corner. */
  protected wingBombTarget(kicker: Player, roll: number, peak: number): Vec | null {
    const dir = this.dirOf(kicker.side);
    const goal = dir > 0 ? FIELD_LENGTH : 0;
    const from = kicker.body.pos;
    const toLine = (goal - from.x) * dir;
    const depth = WING_BOMB.cornerM - (roll - 0.5) * WING_BOMB.scatterM;
    if (LIVE.wingerChase <= 0 || toLine > Math.min(WING_BOMB.fromM, MID_X) || toLine <= depth) return null;

    const wingers = this.side(kicker.side).filter(p => ROLES[p.slot]!.name === 'winger' && !this.locked(p));
    const infield = WING_BOMB.cornerM + (roll - 0.5) * WING_BOMB.scatterM;
    let best: Vec | null = null;
    let bestRoom = 0;
    for (const wing of wingers) {
      const body = wing.body;
      const near = body.pos.y < MID_Y;
      const offTouch = near ? body.pos.y : FIELD_WIDTH - body.pos.y;
      if (wing === kicker || wing.subFor !== null || !inPlay(body.pos) || offTouch > WING_BOMB.wingM || (body.pos.x - from.x) * dir > 0) continue;
      const to = { x: goal - dir * depth, y: near ? infield : FIELD_WIDTH - infield };
      const chaseM = dist(body.pos, to);
      // Targeting sends the nearest winger. A different winger can be closer if the pair has crossed over.
      const nearerWing = wingers.some(p => {
        if (p === wing) return false;
        const d = dist(p.body.pos, to);
        return d < chaseM || (d === chaseM && p.slot < wing.slot);
      });
      if (nearerWing) continue;
      // Budget the hang time at sprint pace until his gas goes, allowing for the turn onto the target.
      const seconds = Math.max(0, Math.max(hangTime(peak), dist(from, to) / KICK_SPEED) - WING_BOMB.turnS);
      const sprintS = canSprint(wing.gas) ? Math.min(seconds, wing.gas.gas * wing.tankS) : 0;
      const pace = body.maxSpeed * legsSpeed(wing.energy) * speedMult(wing.traits, 'jets') * (wing.hurt ? WEATHER.hurtSpeed : 1);
      const restPace = sprintS > 0 ? GAS.blown : paceMult(wing.gas, false);
      const runM = pace * (sprintS + (seconds - sprintS) * restPace);
      const startingPace = dot(body.vel, norm(sub(to, body.pos)));
      const lostM = Math.max(0, pace - startingPace) ** 2 / (2 * body.accel);
      const room = runM - lostM + KICK_CONTEST.bomb.contestM - chaseM;
      if (room > bestRoom) {
        best = to;
        bestRoom = room;
      }
    }
    return best;
  }

  // ── Ball resolution ───────────────────────────────────────────────────────
  protected launchPendingKick(): void {
    const k = this.pendingKick;
    if (!k || this.tick < k.at) return;
    this.offloadReceiver = null;
    this.pendingKick = null;
    const kicker = this.players[k.kicker]!;
    const landing = this.kickLanding(k);
    let to = landing;
    if (k.kind === 'grubber') {
      // A grubber that would roll dead stops at the line it crosses (2d).
      const ex = exitPoint(kicker.body.pos, to);
      if (ex) {
        to = ex.at;
        this.outPending = { at: ex.at, how: ex.how, bounced: true };
      }
    }
    this.ball = k.kind === 'grubber' ? grubberFlight(kicker.body.pos, to, this.tick) : kickFlight(kicker.body.pos, to, this.tick, k.receiver, k.peak);
    this.lastKicker = k.kicker;
    this.kickInAir = k.kind;
    this.lastTouch = kicker.side;
    this.kickFrom = k.kickoff ? null : { side: kicker.side, x: kicker.body.pos.x, toLine: this.toLineFor(kicker.side, kicker.body.pos), ...(k.aim ? { aim: k.aim } : {}) };
    this.kickoffUp = k.kickoff;
    this.goalLineSetPending = GOAL_LINE_STAND.on > 0;
    this.kickCall = this.fgCall = null;
    const receiving = other(kicker.side);
    this.retreat = null;
    this.attacking = receiving;
    this.dir = this.dirOf(receiving);
    this.tackles = 0;
    this.lastPlay = false;
    this.lineX = landing.x + this.dir * LIVE.onsideM;
    if (k.dropOut) this.emit('drop-out', `${kicker.name} kicks the goal-line drop-out`, kicker);
    else if (k.kickoff) this.emit('kickoff', `${kicker.name} kicks off`, kicker);
    else {
      this.emit('kick', (k.aim ? AIM_TEXT[k.aim] : KICK_TEXT[k.kind])(kicker.name), kicker, k.trait);
      this.events[this.events.length - 1]!.detail = k.kind;
    }
    if (this.phase.kind !== 'play') this.phase = { kind: 'play' };
  }

  protected landings(): void {
    const b = this.ball;
    if (b.kind === 'held') {
      this.scramble = false;
      this.raceFor = null;
    }
    if (this.goalUp) {
      if (b.kind === 'flight' && landed(b, this.tick)) this.resolveGoal();
      return;
    }
    if (this.penaltyKickUp) {
      // A penalty kicked for touch: out, and the same side taps 10 m in (2e).
      if (b.kind === 'flight' && landed(b, this.tick)) {
        const side = this.penaltyKickUp.side;
        this.penaltyKickUp = null;
        this.emit('touch', `${this.names[side]} find touch from the penalty`, this.players[this.lastKicker]);
        this.events[this.events.length - 1]!.detail = 'penalty';
        if (this.siren) this.endHalf();
        else this.startSetPiece(side, touchRestartSpot(b.to), 'tap');
      }
      return;
    }
    if (b.kind === 'flight') {
      if (!landed(b, this.tick)) return;
      // A set play's kick (#326) is settled where it comes down, whatever it does.
      const playKick = b.via === 'kick' ? this.playKick : null;
      if (playKick) this.playKick = null;
      // Bounced or rolled out of the field (2d).
      if (this.outPending) {
        this.resolveOut();
        return;
      }
      if (b.via === 'bounce') {
        // Hops done: it lies there for whoever gets to it.
        this.ball = { kind: 'loose', pos: { ...b.to }, vel: { x: 0, y: 0 } };
        this.maybeScramble(b.to);
        return;
      }
      // A called kick-off (#397) settles itself first.
      if (b.via === 'kick' && this.kickoffUp && this.kickoffPlay && this.landKickoff(b.to, b.receiver)) return;
      // A kick landing out of the field: on the full (2d).
      if (b.via === 'kick' && outOfPlay(b.to)) {
        this.outOnTheFull(b.from, b.to);
        return;
      }
      // A grubber into the in-goal (#99): the nearest attacker and defender race for it.
      if (b.via === 'kick' && b.bounces > 0 && !this.kickoffUp && inOwnInGoal(b.to, this.dir)) {
        this.raceForGrubber(b.to);
        return;
      }
      // A kick is anyone's: whoever is under it takes it, the nominated man on a tie.
      let r = b.via === 'kick' ? this.underKick(b.to, b.receiver) : b.receiver !== null ? this.players[b.receiver] : undefined;
      if (playKick && r && r.side !== playKick.side) r = this.playKickEdge(playKick, b.to) ?? r;
      if (!r || (b.via !== 'roll' && dist(r.body.pos, b.to) > (b.via === 'kick' ? LIVE.kickCatchReach : LIVE.catchReach))) {
        // Nobody under it: it comes down and bounces on in the direction it was going.
        if (b.via === 'pass') this.emit('loose', r ? `${r.name} can't get to the pass — loose ball` : 'The pass goes to ground — loose ball', r);
        if (b.bounces > 0) {
          // A grubber has done its hopping: it lies where it stopped.
          this.ball = { kind: 'loose', pos: { ...b.to }, vel: { x: 0, y: 0 } };
          this.looseFor = null;
          this.maybeScramble(b.to);
        } else {
          // It bounces on the way it was going; a touch-finder runs on for the line.
          const roll = b.via === 'kick' ? (this.kickFrom?.aim ? TOUCH.touchRollM : 4) + this.rng.next() * 4 : 2;
          this.bounce(b.to, sub(b.to, b.from), roll);
          this.looseFor = null;
        }
        return;
      }
      // A bomb with a chaser and a catcher under it (#99): won back, spilled or caught, on one draw.
      const contested = b.via === 'kick' && this.kickInAir === 'bomb' && !this.kickoffUp ? this.contestBomb(b) : null;
      if (contested === 'settled') return;
      if (contested) r = contested;
      const pressured = this.side(other(r.side)).some((d) => !this.locked(d) && dist(d.body.pos, r.body.pos) < LIVE.pressureM);
      const cover = !this.kickoffUp && r.side === this.attacking ? this.kickCover(other(r.side)) : 0;
      if (b.via === 'kick' && !contested && this.rng.next() < (pressured ? LIVE.dropPressured - (r.stats.handling - 50) / 300 : LIVE.dropChance) * this.wx.handling / (1 + cover)) {
        this.spillKick(r, b.to, `${r.name} spills the kick under pressure!`);
        return;
      }
      const spillExtra = this.spillExtra;
      const picked = this.interceptTrait;
      this.spillExtra = 0;
      this.interceptTrait = undefined;
      if (b.via === 'pass' && r.side === this.attacking && this.rng.next() < knockOnChance(r.stats.handling, pressured, false, spillExtra) * this.wx.handling) {
        // Spilled: the ball squirts forward and the defence takes over.
        this.emit('error', spillExtra > 0 ? `${r.name} can't hold the wild offload — knock-on` : `${r.name} spills it — knock-on`, r);
        this.react(r, 'error');
        this.lastTouch = r.side;
        this.bounce(b.to, { x: this.dir, y: (this.rng.next() - 0.5) * 0.6 }, 2.5, 12, 2);
        this.turnover('error');
        this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
        if (this.siren) this.endHalf(); // a knock-on kills the ball
        return;
      }
      this.ball = { kind: 'held', by: this.indexOf(r) };
      r.catchTick = this.tick;
      this.centreCarry = null;
      if (b.via === 'pass') this.readCentreCarry(r);
      if (b.via === 'kick' && b.bounces === 0) r.aerialCatchTick = this.tick;
      r.decided = false;
      r.steppedOn = -1;
      if (b.via === 'pass' && r.side !== this.attacking) {
        this.visualInterception = {
          player: { side: r.side, slot: r.slot, who: r.key },
          tick: this.tick, fromX: b.from.x - b.to.x, fromY: b.from.y - b.to.y,
        };
        this.emit('intercept', `${r.name} picks it off!`, r, picked);
        this.turnover();
        r.burstUntil = this.tick + LIVE.burstTicks;
        return;
      }
      if (b.via === 'kick' && r.side !== this.attacking) {
        // The kicking side got there first: their ball, a fresh set (or a try, next tick, if he is over the line).
        this.lock(r, 'catch', 3);
        this.emit('regather', `${r.name} regathers the kick!`, r);
        this.turnover('turnover', b.to);
        return;
      }
      if (b.via === 'kick') {
        const returnable = KICK_RETURN.on > 0 && KICK_RETURN.burstTicks > 0 && b.bounces === 0
          && this.kickFrom && !this.kickFrom.aim && !this.kickoffUp && !playKick && !contested && !pressured
          && (this.kickInAir === 'long' || this.kickInAir === 'bomb');
        this.lock(r, 'catch', 4);
        this.mark = { ...r.body.pos };
        this.endKick(r.side, r.body.pos);
        if (this.groundInGoal(r)) return;
        if (returnable) this.startKickReturn(r);
        this.emit('set-start', `${r.name} takes the kick — ${this.names[this.attacking]} ball`, r);
        this.events[this.events.length - 1]!.detail = 'caught';
        this.settleGoalLineBall(r, b.to);
      }
      return;
    }
    if (b.kind === 'loose') {
      // Whoever gets there first picks it up (the chasers are steered at it).
      let best: Player | null = null;
      let bd = LIVE.pickupM;
      for (const p of this.players) {
        if (this.looseFor && p.side !== this.looseFor) continue;
        if (this.raceFor && p.side !== this.raceFor) continue;
        if (this.locked(p) || !this.onField(p) || this.retreatLine(p) !== null) continue;
        const d = dist(p.body.pos, b.pos);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (best) {
        const scramble = this.scramble;
        const raced = this.raceFor !== null;
        // The kicking side first to its own grubber in-goal is a regather (a try next tick), as when it is gathered off the boot.
        const regather = raced && best.side !== this.attacking;
        this.scramble = false;
        this.raceFor = null;
        this.ball = { kind: 'held', by: this.indexOf(best) };
        best.catchTick = this.tick;
        best.decided = false;
        const changed = best.side !== this.attacking;
        if (changed) this.turnover('turnover', b.pos);
        this.mark = { ...best.body.pos };
        this.endKick(best.side, best.body.pos);
        if (scramble) {
          // Who came up with it (#99): the ticker names him, the report counts it.
          if (regather) this.emit('regather', `${best.name} wins the race to it in-goal!`, best);
          else this.emit('set-start', raced ? `${best.name} beats them to it in-goal` : `${best.name} wins the scramble — ${this.names[this.attacking]} ball`, best);
          this.events[this.events.length - 1]!.detail = 'scramble';
        }
        if (this.groundInGoal(best, raced)) return;
        if (!scramble) {
          this.emit('set-start', `${best.name} scoops it up — ${this.names[this.attacking]} ball`, best);
          this.events[this.events.length - 1]!.detail = 'gathered';
        }
        if (!changed) this.settleGoalLineBall(best, b.pos);
        if (this.phase.kind !== 'play') this.phase = { kind: 'play' };
      }
    }
  }

  /**
   * A set play's kick with a defender under it (#326): its chaser (the sent
   * winger for a kick-pass; the kicker or the winger for a chip) within reach
   * of where it comes down takes it this often (`plays.kickPassChase`,
   * `plays.chipRegather`). One draw; null when no chaser is there or he misses.
   */
  private playKickEdge(k: { side: Side; edge: number; chasers: number[] }, at: Vec): Player | null {
    const near = k.chasers
      .map((i) => this.players[i]!)
      .filter((p) => p.side === k.side && this.onField(p) && !this.locked(p) && dist(p.body.pos, at) <= LIVE.kickCatchReach)
      .sort((p, q) => dist(p.body.pos, at) - dist(q.body.pos, at))[0];
    if (!near) return null;
    return this.rng.next() < k.edge ? near : null;
  }

  /** Who takes a kick coming down at `at`: the nearest free player within reach, the nominated man on a near-tie. */
  protected underKick(at: Vec, nominated: number | null): Player | undefined {
    const cover = this.kickoffUp ? 0 : this.kickCover(other(this.attacking));
    const fullback = this.fullback(this.attacking);
    let best: Player | undefined;
    let bd = Infinity;
    for (const p of this.players) {
      if (this.locked(p) || !this.onField(p) || this.retreatLine(p) !== null) continue;
      let d = dist(p.body.pos, at);
      if (cover > 0 && p.side === this.attacking && (p === fullback || ROLES[p.slot]!.name === 'winger')) d = fieldingRead(d, cover, LIVE.kickCatchReach);
      if (this.indexOf(p) === nominated) d -= 0.3;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  /**
   * A bomb comes down with a chaser and a catcher under it (#99, BAK-208 §4.3):
   * whoever is a step nearer, it is the chaser's Speed against the catcher's
   * Handling, the height of the kick, a Kick-chase side and the wet
   * (kickContest.ts). One draw: won back (he taps it back to his side),
   * spilled, or caught under pressure (the catcher is returned). Null when only
   * one side is under it: the catch, or a regather, as for any kick.
   */
  private contestBomb(b: Extract<BallState, { kind: 'flight' }>): Player | 'settled' | null {
    const pair = this.bombContenders(b);
    if (!pair) return null;
    const [chaser, catcher] = pair;
    const kicking = chaser.side;
    const odds = highBall(chaser.stats.speed, catcher.stats.handling, b.peak, this.tactics[kicking].attack === 'kick-chase', this.wx.handling, this.kickCover(kicking), this.rushKickGap(kicking));
    const u = this.rng.next();
    if (u < odds.won) {
      this.ball = { kind: 'held', by: this.indexOf(chaser) };
      chaser.catchTick = this.tick;
      chaser.aerialCatchTick = this.tick;
      chaser.decided = false;
      chaser.steppedOn = -1;
      this.lock(chaser, 'catch', 3);
      this.emit('regather', `${chaser.name} beats ${catcher.name} to it — taps it back!`, chaser);
      this.events[this.events.length - 1]!.detail = 'contest';
      this.turnover('turnover', b.to);
      return 'settled';
    }
    if (u < odds.won + odds.spill) {
      this.spillKick(catcher, b.to, `${catcher.name} spills the bomb with ${chaser.name} on him!`);
      return 'settled';
    }
    return catcher;
  }

  private inBombReach(p: Player, at: Vec): boolean {
    return !this.locked(p) && this.onField(p) && dist(p.body.pos, at) <= KICK_CONTEST.bomb.contestM;
  }

  private bombContenders(b: Extract<BallState, { kind: 'flight' }>, distance = (p: Player) => dist(p.body.pos, b.to)): [Player, Player] | null {
    const under = (s: Side): Player | undefined => this.side(s).filter(p => this.inBombReach(p, b.to))
      .sort((p, q) => distance(p) - distance(q))[0];
    const chaser = under(other(this.attacking));
    // The man it was kicked to, if he is under it; else the receiving side's nearest.
    const nominated = b.receiver === null ? undefined : this.players[b.receiver];
    const catcher = nominated?.side === this.attacking && this.inBombReach(nominated, b.to) ? nominated : under(this.attacking);
    return chaser && catcher ? [chaser, catcher] : null;
  }

  /** Observe the last few steps under the bomb. Once airborne, a closer player cannot inherit the jump. */
  protected watchBombContest(): void {
    const b = this.ball;
    const visual = this.visualBombContest;
    if (this.phase.kind !== 'play' || (visual && this.tick > visual.arrivesTick + BOMB_RECOVERY_TICKS)) this.visualBombContest = undefined;
    if (this.phase.kind !== 'play' || !this.kickFrom || this.kickInAir !== 'bomb' || this.goalUp || this.retreat || b.kind !== 'flight' || b.via !== 'kick' || outOfPlay(b.to)) return;
    const arrivesTick = b.t0 + b.ticks;
    const left = arrivesTick - this.tick;
    if (left > BOMB_PLANT_TICKS || left <= 0) return;
    if (left < BOMB_TAKEOFF_LEAD) {
      if (visual?.arrivesTick === arrivesTick && visual.releasedTick === undefined && !visual.players.every(ref => {
        const p = this.at(ref.side, ref.slot);
        return p.key === ref.who && this.inBombReach(p, b.to);
      })) {
        this.visualBombContest = { ...visual, releasedTick: this.tick };
      }
      return;
    }
    // Before takeoff, allow for a chaser still closing while the first one slows or runs through.
    // A short projection ranks players already in reach. At landing the resolver uses their real positions.
    const lead = (left - 1) * TICK_S;
    const pair = this.bombContenders(b, ({ body }) => dist({ x: body.pos.x + body.vel.x * lead, y: body.pos.y + body.vel.y * lead }, b.to));
    // The landing resolver first needs somebody inside ordinary catch reach to open the contest.
    // An open-play kick clears retreat, so underKick's retreat check has no effect here.
    const fielder = pair && this.underKick(b.to, b.receiver);
    if (!pair || !fielder || dist(fielder.body.pos, b.to) > LIVE.kickCatchReach) {
      this.visualBombContest = undefined;
      return;
    }
    if (visual?.arrivesTick === arrivesTick && visual.players.every((ref, i) => ref.side === pair[i]!.side && ref.slot === pair[i]!.slot && ref.who === pair[i]!.key)) return;
    const plant = (p: Player) => ({ side: p.side, slot: p.slot, who: p.key, ...p.body.pos });
    this.visualBombContest = { at: { ...b.to }, plantTick: this.tick, arrivesTick, players: [plant(pair[0]), plant(pair[1])] };
  }

  /**
   * A kick spilled (#99): forward off his hands is a knock-on, the kicking
   * side's ball whoever reaches it; back or sideways it is loose for anyone,
   * a scramble when both sides are near it as it settles. A kick-off or a
   * drop-out spilled is loose for anyone either way, as it was (#397).
   */
  private spillKick(r: Player, at: Vec, text: string): void {
    this.lastTouch = r.side;
    const way = { x: (this.rng.next() - 0.5) * 2, y: (this.rng.next() - 0.5) * 2 };
    this.emit('drop', text, r);
    this.react(r, 'error');
    if (way.x * this.dir > 0 && !this.kickoffUp) {
      this.events[this.events.length - 1]!.detail = 'knock-on';
      this.bounce(at, way, 2.5, 12, 2);
      this.turnover('error');
      this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
      if (this.siren) this.endHalf(); // a knock-on kills the ball
      return;
    }
    this.bounce(at, way, 2, 12, 2);
  }

  /** A loose ball both sides are near is a scramble (#99): LOOSE BALL! over the man nearest it, and the winner is named when he has it. */
  private maybeScramble(at: Vec): void {
    if (this.looseFor) return;
    const nearest = (s: Side): Player | undefined =>
      this.side(s)
        .filter((p) => !this.locked(p) && this.onField(p))
        .sort((p, q) => dist(p.body.pos, at) - dist(q.body.pos, at))[0];
    const h = nearest('home');
    const a = nearest('away');
    if (!h || !a || dist(h.body.pos, at) > KICK_CONTEST.scramble.nearM || dist(a.body.pos, at) > KICK_CONTEST.scramble.nearM) return;
    this.scramble = true;
    this.emit('loose-ball', `Loose ball — ${h.name} and ${a.name} go for it`, dist(h.body.pos, at) <= dist(a.body.pos, at) ? h : a);
  }

  /**
   * A grubber has come to rest in the in-goal (#99, BAK-208 §4.4): the attacker
   * and the defender quickest to it race for it. Speed decides it (each man's
   * time to the ball), the bounce adds a little luck (kickContest.ts), and only
   * the winner's side can take it: the attacker grounding it is a try, the
   * defender grounds it for a 20 m restart. With no attacker near, it is the
   * defender's to gather. A grubber that runs dead never gets here.
   */
  private raceForGrubber(at: Vec): void {
    const kicking = other(this.attacking);
    this.ball = { kind: 'loose', pos: { ...at }, vel: { x: 0, y: 0 } };
    this.looseFor = null;
    const secs = (p: Player): number => dist(p.body.pos, at) / p.body.maxSpeed;
    const first = (s: Side): Player | undefined =>
      this.side(s)
        .filter((p) => !this.locked(p) && this.onField(p))
        .sort((p, q) => secs(p) - secs(q))[0];
    const a = first(kicking);
    const d = first(this.attacking);
    if (!a || dist(a.body.pos, at) > KICK_CONTEST.grubber.raceM) {
      // No race: the defence's to gather (grounded, or run out, as for any kick in-goal).
      this.looseFor = this.attacking;
      return;
    }
    const attackerWins = !d || this.rng.next() < grubberRace(secs(a), secs(d), this.tactics[kicking].attack === 'kick-chase', this.kickCover(kicking) - this.rushKickGap(kicking));
    this.raceFor = attackerWins ? kicking : this.attacking;
    this.scramble = true;
    this.emit('loose-ball', d ? `Loose in the in-goal — ${a.name} and ${d.name} race for it` : `Loose in the in-goal — ${a.name} is after it`, a);
    this.events[this.events.length - 1]!.detail = 'in-goal';
  }

  /** Possession changes hands where the ball is; a fresh set for the other side. */
  protected turnover(outcome: 'strip' | 'error' | 'turnover' = 'turnover', setAt?: Vec): void {
    this.retreat = null;
    this.offloadReceiver = null;
    this.pendingControl.home = this.pendingControl.away = null;
    this.kickCall = this.fgCall = null;
    this.attacking = other(this.attacking);
    this.dir = this.dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    const bp = this.ballPos();
    if (GOAL_LINE_STAND.on > 0) {
      if (this.goalLineRun && this.goalLineRun.side !== this.attacking) this.endGoalLineStand(outcome);
      this.goalLineSetPending = true;
      const collector = this.holder();
      if (collector) this.settleGoalLineBall(collector, setAt ?? bp);
    }
    this.mark = { ...bp };
    this.lineX = bp.x + this.dir * LIVE.onsideM;
    this.phase = { kind: 'play' };
  }

  // ── Phases ────────────────────────────────────────────────────────────────
  protected stepRestart(ph: Extract<Phase, { kind: 'restart' }>): void {
    this.runSwaps();
    if (this.tick < ph.t0 + LIVE.restartTicks || this.pendingKick) return;
    if (this.players.some((p) => p.subFor !== null)) return; // the interchange first
    const kicker = this.kicker(ph.kicking);
    // Wait until the teams are set (the kicker on the spot, everyone near his).
    const ready = dist(kicker.body.pos, kicker.target) < 1 && this.players.every((p) => dist(p.body.pos, p.target) < 3);
    if (!ready && this.tick < ph.t0 + LIVE.restartMaxTicks) return;
    const receiving = other(ph.kicking);
    const rd = this.dirOf(receiving);
    this.lock(kicker, 'kick', LIVE.kickLockTicks);
    const kd = this.dirOf(ph.kicking);
    const r1 = this.rng.next();
    // The kick-off call (#397) is the kicking side's own; its dice are drawn only when one is made.
    const kc = ph.from === undefined && this.kickoffCall?.side === ph.kicking ? this.kickoffCall.call : null;
    this.kickoffCall = null;
    const land = ph.from === 'goal-line' ? null : kickoffLanding(kc, rd, r1, kicker.stats.kicking);
    const called = kc && land ? this.kickoffRoll(kc, ph.kicking, land.to, rd, r1, kicker.stats.kicking) : null;
    const to = land
      ? called?.to ?? land.to
      : { x: ownLineX(kd) + kd * (TOUCH.dropOutM + (r1 - 0.5) * TOUCH.dropOutSpreadM), y: clamp(MID_Y + (this.rng.next() - 0.5) * 24, 8, FIELD_WIDTH - 8) };
    this.pendingKick = {
      at: this.tick + LIVE.kickContactTicks,
      kicker: this.indexOf(kicker),
      to,
      receiver: called ? called.receiver : this.indexOf(this.fullback(receiving)),
      peak: land?.peak ?? 16,
      kickoff: true,
      kind: 'long',
      ...(ph.from === 'goal-line' ? { dropOut: true } : {}),
    };
  }

  /**
   * A called kick-off (#397), as it leaves the boot: one more draw, and only for
   * a call. Short: regathered on the best chaser's Speed against the catcher's
   * Handling, and the man who will take it goes under it. Long: dead on the full,
   * or for the fullback deep.
   */
  private kickoffRoll(call: KickoffCall, kicking: Side, to: Vec, rd: 1 | -1, r1: number, kickingStat: number): { to: Vec; receiver: number } {
    const receiving = other(kicking);
    const near = (ps: readonly Player[]): Player[] => ps.filter((p) => this.onField(p) && p !== this.kicker(kicking)).sort((a, b) => dist(a.body.pos, to) - dist(b.body.pos, to));
    if (call === 'kickoff-short') {
      const chaser = near(this.side(kicking)).slice(0, KICKOFF.short.chasers).sort((a, b) => b.stats.speed - a.stats.speed)[0] ?? this.kicker(kicking);
      const catcher = near(this.side(receiving))[0] ?? this.fullback(receiving);
      const regather = this.rng.next() < regatherChance(chaser.stats.speed, catcher.stats.handling);
      this.kickoffPlay = { side: kicking, call, outcome: regather ? 'regather' : 'taken' };
      return { to, receiver: this.indexOf(regather ? chaser : catcher) };
    }
    const dead = this.rng.next() < KICKOFF.long.deadOnFull;
    this.kickoffPlay = { side: kicking, call, outcome: dead ? 'dead' : 'taken' };
    return { to: dead ? kickoffLanding(call, rd, r1, kickingStat, true).to : to, receiver: this.indexOf(this.fullback(receiving)) };
  }

  /**
   * A called kick-off comes down (#397). Dead on the full: a penalty at halfway.
   * A short one regathered: the chaser under it takes it, the kicking side's ball.
   * Anything else plays on as any kick-off. The call is judged here. Returns true
   * when it settled the ball.
   */
  private landKickoff(at: Vec, receiver: number | null): boolean {
    const k = this.kickoffPlay!;
    this.kickoffPlay = null;
    const kd = this.dirOf(k.side);
    const metres = Math.round((at.x - FIELD_LENGTH / 2) * kd);
    if (k.outcome === 'dead') {
      this.announcePaid(this.judge.kickoff(k.side, false, 'dead-on-full', metres));
      this.penalize(k.side, { x: FIELD_LENGTH / 2, y: MID_Y }, 'the kick-off is dead on the full', this.players[this.lastKicker]!, 'kickoff', undefined, false);
      return true;
    }
    if (k.outcome === 'regather' && receiver !== null) {
      const r = this.players[receiver]!;
      this.ball = { kind: 'held', by: receiver };
      r.catchTick = this.tick;
      r.aerialCatchTick = this.tick;
      r.decided = false;
      r.steppedOn = -1;
      this.lock(r, 'catch', 3);
      this.emit('regather', `${r.name} regathers the short kick-off!`, r);
      this.turnover();
      this.announcePaid(this.judge.kickoff(k.side, true, 'regather', metres));
      return true;
    }
    const lineM = this.toLineFor(k.side, at);
    this.announcePaid(this.judge.kickoff(k.side, k.call === 'kickoff-long' && pinnedDeep(lineM), 'kick', metres));
    return false;
  }
}
