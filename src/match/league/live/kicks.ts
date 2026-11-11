import { FIELD_LENGTH, FIELD_WIDTH, MID_Y } from '../../core/field';
import { grubberFlight, kickFlight, landed, type BallState } from '../../core/ball';
import type { Side } from '../../core/snapshot';
import { clamp, dist, sub, type Vec } from '../../core/vec';
import { knockOnChance } from '../contest';
import { KICKOFF, kickoffLanding, pinnedDeep, regatherChance, type KickoffCall } from '../kickoff';
import { KICK_CONTEST, fieldingRead, grubberRace, highBall } from '../kickContest';
import { TOUCH, exitPoint, inOwnInGoal, outOfPlay, ownLineX, touchRestartSpot } from '../touch';
import { ROLES } from '../roles';
import { LIVE } from './knobs';
import { other, AIM_TEXT, KICK_TEXT, type Player, type Phase } from './types';
import { LiveClock } from './clock';

export abstract class LiveKicks extends LiveClock {
  // ── Ball resolution ───────────────────────────────────────────────────────
  protected launchPendingKick(): void {
    const k = this.pendingKick;
    if (!k || this.tick < k.at) return;
    this.offloadReceiver = null;
    this.pendingKick = null;
    const kicker = this.players[k.kicker]!;
    let to = k.to;
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
    this.kickCall = this.fgCall = null;
    const receiving = other(kicker.side);
    this.attacking = receiving;
    this.dir = this.dirOf(receiving);
    this.tackles = 0;
    this.lastPlay = false;
    this.lineX = k.to.x + this.dir * LIVE.onsideM;
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
        this.lastTouch = r.side;
        this.bounce(b.to, { x: this.dir, y: (this.rng.next() - 0.5) * 0.6 }, 2.5, 12, 2);
        this.turnover();
        this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
        if (this.siren) this.endHalf(); // a knock-on kills the ball
        return;
      }
      this.ball = { kind: 'held', by: this.indexOf(r) };
      r.catchTick = this.tick;
      if (b.via === 'kick' && b.bounces === 0) r.aerialCatchTick = this.tick;
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
        this.endKick(r.side, r.body.pos);
        if (this.groundInGoal(r)) return;
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
        if (this.raceFor && p.side !== this.raceFor) continue;
        if (this.locked(p) || !this.onField(p)) continue;
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
        if (best.side !== this.attacking) this.turnover();
        this.mark = { ...best.body.pos };
        this.endKick(best.side, best.body.pos);
        if (scramble) {
          // Who came up with it (#99): the ticker names him, the report counts it.
          if (regather) this.emit('regather', `${best.name} wins the race to it in-goal!`, best);
          else this.emit('set-start', raced ? `${best.name} beats them to it in-goal` : `${best.name} wins the scramble — ${this.names[this.attacking]} ball`, best);
          this.events[this.events.length - 1]!.detail = 'scramble';
        }
        if (this.groundInGoal(best, raced)) return;
        if (!scramble) this.emit('set-start', `${best.name} scoops it up — ${this.names[this.attacking]} ball`, best);
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
      if (this.locked(p) || !this.onField(p)) continue;
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
    const kicking = other(this.attacking);
    const under = (s: Side): Player | undefined =>
      this.side(s)
        .filter((p) => !this.locked(p) && this.onField(p) && dist(p.body.pos, b.to) <= KICK_CONTEST.bomb.contestM)
        .sort((p, q) => dist(p.body.pos, b.to) - dist(q.body.pos, b.to))[0];
    const chaser = under(kicking);
    // The man it was kicked to, if he is under it; else the receiving side's nearest.
    const nominated = b.receiver !== null ? this.players[b.receiver] : undefined;
    const mine = nominated && nominated.side === this.attacking && !this.locked(nominated) && this.onField(nominated) && dist(nominated.body.pos, b.to) <= KICK_CONTEST.bomb.contestM;
    const catcher = mine ? nominated : under(this.attacking);
    if (!chaser || !catcher) return null;
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
      this.turnover();
      return 'settled';
    }
    if (u < odds.won + odds.spill) {
      this.spillKick(catcher, b.to, `${catcher.name} spills the bomb with ${chaser.name} on him!`);
      return 'settled';
    }
    return catcher;
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
    if (way.x * this.dir > 0 && !this.kickoffUp) {
      this.events[this.events.length - 1]!.detail = 'knock-on';
      this.bounce(at, way, 2.5, 12, 2);
      this.turnover();
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
  protected turnover(): void {
    this.offloadReceiver = null;
    this.pendingControl.home = this.pendingControl.away = null;
    this.kickCall = this.fgCall = null;
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
