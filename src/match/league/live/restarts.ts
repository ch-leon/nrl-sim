import { controlReceiver } from '../controls';
import { SET_TACKLES } from '../../../config';
import { traitBoost } from '../../../data/traits';
import { FIELD_LENGTH, MID_Y, clampToGround } from '../../core/field';
import { bounceFlight, kickFlight, landed, rollFlight, type BallState } from '../../core/ball';
import type { ConversionSnap, QuickTapSnap, Side } from '../../core/snapshot';
import { add, clamp, dist, scale, type Vec } from '../../core/vec';
import { FIVE_EIGHTH, FULLBACK, KICKER } from '../roles';
import { SECOND_KICKER } from '../lastTackle';
import { MAX_LAT_M, pickReceiver, pickReceiverWeighted } from '../tactics';
import { NINES } from '../rules';
import { conversionSpot, goalChance, goalStrikeTick, postsFor } from '../goals';
import { PENALTY, offsideChance } from '../penalties';
import { QUICK_TAP, TOUCH, exitPoint, inOwnInGoal, isFortyTwenty, ownLineX, touchRestartSpot, twentySpot, type TapOrigin } from '../touch';
import { LIVE } from './knobs';
import { other, type Player, type Phase, type RuckDecision } from './types';
import { LivePlay } from './play';

export abstract class LiveRestarts extends LivePlay {
  protected quickTapPicture: QuickTapSnap | null = null;
  /** The last conversion's decision, carried into the dead-ball picture. The sim never reads it. */
  protected conversionDecision?: ConversionSnap & { decision: NonNullable<ConversionSnap['decision']> };

  protected stepRuck(ph: Extract<Phase, { kind: 'ruck' }>): void {
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
      // Offside as the ball is played (2e): more likely in a defence that rushes up.
      const defSide = other(this.attacking);
      if (this.rng.next() < offsideChance(this.defencePreset(defSide))) {
        const culprit = [...this.side(defSide)].sort((a, b) => dist(a.body.pos, this.mark) - dist(b.body.pos, this.mark))[1] ?? this.side(defSide)[0]!;
        this.penalize(defSide, { ...this.mark }, `${culprit.name} is offside`, culprit, 'offside');
        return;
      }
      const dh = this.dummyHalf(this.attacking);
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
    if (!h || h !== this.dummyHalf(this.attacking)) {
      const heel = this.ball.kind === 'flight' && this.ball.via === 'roll' && ph.heldAt === 0;
      if (!heel) this.cancelRuckDecision();
      return;
    }
    if (ph.heldAt === 0) ph.heldAt = this.tick;
    if (ph.decision?.to && !this.ruckReceiver(ph)) ph.decision.cancelled = true;
    const release = ph.heldAt + LIVE.dhHoldTicks;
    // Scripted/controlled decisions keep their existing release-time path. No extra hold or roll.
    if (!ph.decision && LIVE.dhDecisionLeadTicks > 0 && this.tick < release
      && this.tick >= release - Math.min(LIVE.dhHoldTicks, LIVE.dhDecisionLeadTicks)
      && this.sheetPlays[this.attacking].length === 0 && !this.pendingPlay[this.attacking] && !this.pendingControl[this.attacking]) {
      ph.decision = this.chooseRuck(h, release);
    }
    if (this.tick < ph.heldAt + LIVE.dhHoldTicks) return;
    this.lastPlay = this.tackles === SET_TACKLES - 1;
    const intent = this.pendingControl[this.attacking];
    if (intent && (intent.kind === 'pass-left' || intent.kind === 'pass-right')) {
      this.pendingControl[this.attacking] = null;
      const receiver = controlReceiver(h.body.pos, this.dir, this.candidates(h), intent.kind);
      if (receiver !== null) {
        this.pass(h, this.players[receiver]!);
        this.phase = { kind: 'play' };
        return;
      }
    }
    // A set play (#326): the coach's waiting call or the half's own, launched here with its one roll in place of the dart's.
    if (this.sheetPlays[this.attacking].length > 0 && this.launchPlay('ptb', h)) {
      this.phase = { kind: 'play' };
      return;
    }
    const decision = ph.decision ?? this.chooseRuck(h, release);
    // A cancelled/invalid commitment becomes a carry, never a second unseen receiver draw.
    // A later explicit last-tackle kick call retains its deterministic DH-to-kicker override.
    const calledKick = this.lastPlay && ['grubber', 'forty-twenty'].includes(this.callState[this.attacking].attack ?? '');
    const kicker = calledKick || (decision.secondKicker && this.directedLastPlay()) ? this.kicker(this.attacking) : null;
    const override = kicker && !this.locked(kicker) && this.tick >= kicker.busyUntil ? kicker : null;
    const receiver = decision.cancelled ? override : ph.decision ? this.ruckReceiver(ph)
      : decision.to ? this.at(decision.to.side, decision.to.slot) : null;
    if (!receiver) {
      h.catchTick = this.tick;
      h.decided = false;
      h.pose = 'run';
      h.poseUntil = 0;
      this.emit('dart', `${h.name} darts from dummy-half`, h);
    } else this.pass(h, receiver);
    const ball = this.ball;
    const secondKicker = decision.secondKicker && !decision.cancelled && decision.to && receiver
      && ball.kind === 'flight' && ball.via === 'pass' && ball.receiver === this.indexOf(receiver)
      ? { ...decision.to, catchTick: ball.t0 + ball.ticks } : undefined;
    this.phase = { kind: 'play', ...(ph.shape ? { shape: ph.shape } : {}), ...(secondKicker ? { secondKicker } : {}) };
  }

  /** A specific last-play instruction retains the side's usual taker. */
  protected directedLastPlay(): boolean {
    const call = this.callState[this.attacking].attack;
    return call === 'grubber' || call === 'forty-twenty' || call === 'bomb' || call === 'field-goal' || call === 'run-it';
  }

  private secondKickerAvailable(h: Player, p: Player): boolean {
    return p.slot === FIVE_EIGHTH && p.side === h.side && p !== h && this.onField(p) && p.subFor === null
      && this.retreatLine(p) === null && pickReceiver(h.body.pos, this.dir, [{
        idx: p.slot, pos: p.body.pos, busy: this.locked(p) || this.tick < p.busyUntil,
      }]) !== null;
  }

  /** The markers stay at the ruck during this read, while the onside line can close on a half. */
  protected kickerSpace(p: Player, pressure = false): number {
    let space = Infinity;
    for (const d of this.side(other(p.side))) {
      if (this.locked(d) || this.tick < d.cooldownUntil || this.markers.includes(this.indexOf(d)) || this.retreatLine(d) !== null) continue;
      const now = dist(p.body.pos, d.body.pos);
      const next = dist(p.body.pos, add(d.body.pos, scale(d.body.vel, SECOND_KICKER.lookAheadS)));
      if (pressure && now > LIVE.sprintCloseM && (d.body.vel.x * this.dir > -SECOND_KICKER.closingSpeed || next >= now)) continue;
      space = Math.min(space, next);
    }
    return space;
  }

  protected secondKicker(h: Player, halfback: Player): Player | null {
    if (SECOND_KICKER.on <= 0 || this.directedLastPlay() || halfback.slot !== KICKER || halfback === h || halfback.subFor !== null) return null;
    const fiveEighth = this.at(h.side, FIVE_EIGHTH);
    if (!this.secondKickerAvailable(h, fiveEighth)) return null;
    if ((fiveEighth.body.pos.y - h.body.pos.y) * (halfback.body.pos.y - h.body.pos.y) >= 0
      || (halfback.body.pos.x - fiveEighth.body.pos.x) * this.dir <= 0) return null;
    const space = this.kickerSpace(halfback, true);
    if (space > SECOND_KICKER.pressureM) return null;
    const boot = (fiveEighth.stats.kicking - halfback.stats.kicking) * SECOND_KICKER.kickingPerPointM
      + (traitBoost(fiveEighth.traits, 'bigBoot') - traitBoost(halfback.traits, 'bigBoot')) * SECOND_KICKER.bigBootM;
    const limit = SECOND_KICKER.extraSpaceM / 2;
    return this.kickerSpace(fiveEighth) - space >= SECOND_KICKER.extraSpaceM - clamp(boot, -limit, limit) ? fiveEighth : null;
  }

  private chooseRuck(h: Player, until: number): RuckDecision {
    const last = this.tackles === SET_TACKLES - 1;
    let receiver: number | null = null, kicker = false, secondKicker = false;
    if (last) {
      const k = this.kicker(this.attacking);
      if (!this.locked(k) && this.tick >= k.busyUntil) {
        const alternate = this.secondKicker(h, k);
        receiver = this.indexOf(alternate ?? k);
        kicker = true;
        secondKicker = alternate !== null;
      }
    }
    // The coach's Grubber or 40/20 (#396): the dummy-half finds the kicker rather than dart (no roll for it).
    const toKicker = last && receiver !== null && (this.callState[this.attacking].attack === 'grubber' || this.callState[this.attacking].attack === 'forty-twenty');
    if (receiver === null) {
      // The first receiver (#649): weighted like an open-play pass while it is on at the ruck, one roll before the dart's.
      receiver = LIVE.receiverMargin > 0 && LIVE.receiverAtRuck > 0
        ? pickReceiverWeighted(h.body.pos, this.dir, this.candidates(h), MAX_LAT_M, 0, LIVE.receiverMargin, LIVE.receiverSpread, this.rng.next())
        : pickReceiver(h.body.pos, this.dir, this.candidates(h));
    }
    if (receiver === null || (!toKicker && this.rng.next() < LIVE.dartChance)) {
      receiver = null;
    }
    const ref = (p: Player) => ({ side: p.side, slot: p.slot, who: p.key });
    return { from: ref(h), to: receiver === null ? null : ref(this.players[receiver]!), decidedAt: this.tick, until, kicker,
      ...(secondKicker && receiver !== null ? { secondKicker: true } : {}) };
  }

  /** Pure identity/eligibility check, also used by snapshot projection. Never recruits a replacement. */
  protected ruckReceiver(ph: Extract<Phase, { kind: 'ruck' }>): Player | null {
    const d = ph.decision, h = this.holder();
    if (!d?.to || d.cancelled || ph.stage !== 'dh' || this.tick > d.until || !h || h !== this.dummyHalf(this.attacking)
      || h.side !== d.from.side || h.slot !== d.from.slot || h.key !== d.from.who
      || this.pendingControl[this.attacking] || this.pendingPlay[this.attacking]) return null;
    const to = this.side(h.side).find(p => p.side === d.to!.side && p.slot === d.to!.slot && p.key === d.to!.who);
    if (!to) return null;
    if (d.secondKicker) return !this.directedLastPlay() && this.secondKickerAvailable(h, to) ? to : null;
    if (d.kicker) return to === this.kicker(h.side) && !this.locked(to) && this.tick >= to.busyUntil ? to : null;
    const candidate = this.candidates(h).find(c => this.players[c.idx] === to);
    return candidate && pickReceiver(h.body.pos, this.dir, [candidate]) !== null ? to : null;
  }

  protected stepTry(ph: Extract<Phase, { kind: 'try' }>): void {
    if (this.tick < ph.t0 + LIVE.tryTicks) return;
    // Golden point: the try wins it, no conversion.
    if (this.golden) {
      this.endGoldenPoint(this.players[ph.scorer]!.side);
      return;
    }
    const scorer = this.players[ph.scorer]!;
    for (const p of this.players) {
      p.pose = 'idle';
      p.poseUntil = 0;
    }
    // The conversion: a drop kick in line with where he grounded it (taken even after the siren).
    const side = scorer.side;
    const kicker = this.goalKicker(side);
    const posts = postsFor(this.dirOf(side), FIELD_LENGTH, MID_Y);
    const spot = clampToGround(conversionSpot(scorer.body.pos.y, posts, this.dirOf(side)), 1);
    this.ball = { kind: 'held', by: this.indexOf(kicker) };
    this.retreat = null;
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.phase = { kind: 'conversion', t0: this.tick, side, kicker: this.indexOf(kicker), spot, readyAt: 0, good: null };
  }

  /** After a try, a conversion or a field goal: half-time or full time if the siren has gone, else the kick-off by the side that conceded. */
  protected afterScore(scoringSide: Side): void {
    if (this.golden) {
      this.endGoldenPoint(scoringSide); // a penalty goal or a field goal wins it
      return;
    }
    if (this.siren) {
      this.endHalf(); // the last play of the half
      return;
    }
    this.retreat = null;
    const kicking = other(scoringSide);
    this.ball = { kind: 'held', by: this.indexOf(this.kicker(kicking)) };
    this.attacking = other(kicking);
    this.dir = this.dirOf(this.attacking);
    this.phase = { kind: 'restart', t0: this.tick, kicking };
    this.callSwaps(); // a stoppage: the coach can freshen up
  }

  // ── Touch, dead ball and restarts (2d) ────────────────────────────────────
  /** Metres to the line a side attacks, from `p`. */
  protected toLineFor(side: Side, p: Vec): number {
    return this.dirOf(side) > 0 ? FIELD_LENGTH - p.x : p.x;
  }

  /** The ball bounces on from `from` along `dir`; if that takes it out of the field it stops at the line and goes out when it lands. */
  protected bounce(from: Vec, dir: Vec, metres: number, ticks?: number, hops?: number): void {
    const bf = bounceFlight(from, dir, this.tick, metres, ticks, hops) as Extract<BallState, { kind: 'flight' }>;
    const ex = exitPoint(from, bf.to);
    if (ex) {
      bf.to = ex.at;
      this.outPending = { at: ex.at, how: ex.how, bounced: true };
    }
    this.ball = bf;
    this.looseFor = null;
  }

  /** A kick that lands out of the field without bouncing: on the full into touch (play-the-ball level with the kick), or dead. */
  protected outOnTheFull(from: Vec, to: Vec): void {
    const ex = exitPoint(from, to) ?? { at: to, how: to.x < 0 || to.x > FIELD_LENGTH ? ('dead' as const) : ('touch' as const) };
    if (ex.how === 'dead') {
      this.outOfField(ex.at, 'dead', false);
      return;
    }
    // Out on the full: the other side feeds it level with where it was kicked.
    const kicker = this.kickFrom?.side ?? this.lastTouch;
    const at = { x: this.kickFrom?.x ?? ex.at.x, y: ex.at.y };
    this.emit('on-full', `Out on the full — ${this.names[other(kicker)]} ball`, this.players[this.lastKicker]);
    this.outOfField(at, 'touch', false, true);
  }

  protected resolveOut(): void {
    const o = this.outPending!;
    this.outPending = null;
    this.outOfField(o.at, o.how, o.bounced);
  }

  /**
   * The ball is out of the field at `at`. Into touch: the side that didn't touch
   * it last plays it 10 m in (a 40/20 is the kicker's tap instead). Dead: off the
   * attack, a 20 m restart for the defence; off the defence, a goal-line drop-out.
   */
  protected outOfField(at: Vec, how: 'touch' | 'dead', bounced: boolean, said = false): void {
    this.pendingKick = null;
    const loser = this.lastTouch;
    const kf = this.kickFrom;
    if (this.siren) {
      if (!said) this.emit(how === 'touch' ? 'touch' : 'dead-ball', how === 'touch' ? 'Into touch' : 'Dead ball');
      this.endHalf();
      return;
    }
    if (how === 'touch') {
      if (kf && bounced && kf.side === loser && isFortyTwenty(kf.toLine, this.toLineFor(kf.side, at))) {
        const k = this.players[this.lastKicker]!;
        this.emit('40-20', `40/20! ${k.name} finds touch — ${this.names[kf.side]} keep the ball`, k);
        this.endKick(kf.side, at);
        this.startSetPiece(kf.side, touchRestartSpot(at), 'tap');
        return;
      }
      const feed = other(loser);
      if (!said) {
        this.emit('touch', kf && kf.side === loser ? `It finds touch — ${this.names[feed]} ball` : `Into touch — ${this.names[feed]} ball`, kf && kf.side === loser ? this.players[this.lastKicker] : undefined);
        this.events[this.events.length - 1]!.detail = kf && kf.side === loser ? 'kick' : 'loose';
      }
      const spot = touchRestartSpot(at);
      this.endKick(feed, spot);
      this.startSetPiece(feed, spot, 'ptb');
      return;
    }
    // Dead in an in-goal: whose in-goal it is, and who touched it last.
    const defender: Side = this.dirOf('home') === (at.x > FIELD_LENGTH / 2 ? -1 : 1) ? 'home' : 'away';
    if (loser === defender) {
      this.emit('dead-ball', `Dead in-goal off ${this.names[defender]} — goal-line drop-out`);
      this.events[this.events.length - 1]!.detail = 'drop-out';
      this.startDropOut(defender);
      return;
    }
    this.emit('dead-ball', `Dead ball — 20-metre restart, ${this.names[defender]} ball`);
    this.events[this.events.length - 1]!.detail = '20m';
    const spot = twentySpot(this.dirOf(defender), at.y);
    this.endKick(defender, spot);
    this.startSetPiece(defender, spot, 'tap', FULLBACK, 0, '20m');
  }

  /** A kick in play has ended with `side` getting the ball at `at`: if that is the other side, count the metres the kick won. */
  protected endKick(side: Side, at: Vec): void {
    const kf = this.kickFrom;
    if (!kf) return;
    this.kickFrom = null;
    if (side === kf.side) return;
    this.kickMetres[kf.side] += (at.x - kf.x) * this.dirOf(kf.side);
    this.kicksMeasured[kf.side]++;
    this.announcePaid(this.judge.kicked(kf.side, (at.x - kf.x) * this.dirOf(kf.side)));
  }

  /**
   * A defender with the ball in his own in-goal off the other side's kick: with
   * an attacker close or deep in-goal he grounds it for a 20 m restart; else he
   * runs it out. Having raced an attacker to a grubber (#99) he grounds it.
   * Returns true when he grounded it.
   */
  protected groundInGoal(p: Player, raced = false): boolean {
    const dir = this.dirOf(p.side);
    if (!inOwnInGoal(p.body.pos, dir) || this.lastKicker < 0 || this.players[this.lastKicker]!.side === p.side) return false;
    const deep = Math.abs(p.body.pos.x - ownLineX(dir)) > TOUCH.groundDeepM;
    const pressed = raced || this.side(other(p.side)).some((a) => dist(a.body.pos, p.body.pos) < TOUCH.groundNearM);
    if (!deep && !pressed) return false;
    if (this.siren) {
      this.emit('dead-ball', `${p.name} grounds it in-goal`, p);
      this.endHalf();
      return true;
    }
    this.emit('dead-ball', `${p.name} grounds it in-goal — 20-metre restart`, p);
    this.events[this.events.length - 1]!.detail = '20m';
    this.startSetPiece(p.side, twentySpot(dir, p.body.pos.y), 'tap', p.slot, 0, '20m');
    return true;
  }

  /**
   * A restart in play: the side gets the ball at `spot` — a play-the-ball (after
   * touch) or a tap (a 20 m restart, a 40/20). A player walks the ball to the
   * spot, both sides set, then play goes on. A stoppage: the coach can freshen up.
   * `tackles`: the count the set carries on from (held up over the line, #652); a fresh set otherwise.
   */
  protected startSetPiece(side: Side, spot: Vec, how: 'ptb' | 'tap', prefer?: number, tackles = 0, tapOrigin?: TapOrigin): void {
    this.callSwaps();
    const free = this.side(side).filter((p) => p.subFor === null && p !== this.dummyHalf(side));
    const pick = (prefer !== undefined ? free.find((p) => p.slot === prefer) : undefined) ?? [...free].sort((a, b) => dist(a.body.pos, spot) - dist(b.body.pos, spot))[0] ?? this.fullback(side);
    this.ball = { kind: 'held', by: this.indexOf(pick) };
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.tackles = tackles;
    this.lastPlay = false;
    this.kickCall = this.fgCall = null;
    this.pendingKick = null;
    this.looseFor = null;
    this.markers = [];
    this.retreat = null;
    this.kickFrom = null;
    this.mark = { ...spot };
    this.lineX = spot.x + this.dir * LIVE.onsideM;
    this.phase = { kind: 'set-piece', t0: this.tick, side, spot: { ...spot }, how, player: this.indexOf(pick), ...(tapOrigin ? { tapOrigin } : {}) };
  }

  protected stepSetPiece(ph: Extract<Phase, { kind: 'set-piece' }>): void {
    const said = this.events.length;
    this.runSwaps();
    if (this.events.length > said) return; // a swap this tick: play on from the next
    if (this.tick < ph.t0 + TOUCH.setMinTicks) return;
    const p = this.players[ph.player]!;
    const timedOut = this.tick >= ph.t0 + TOUCH.setMaxTicks;
    if (timedOut && this.players.some((q) => q.subFor !== null)) {
      // Waited long enough: the interchange is made where he stands, then play.
      for (const q of this.players) if (q.subFor !== null) this.swapIn(q, q.subFor);
      return;
    }
    if (!timedOut) {
      if (this.players.some((q) => q.subFor !== null)) return; // the interchange first
      if (dist(p.body.pos, ph.spot) > 1) return;
      if (this.players.some((q) => dist(q.body.pos, q.target) > 4)) {
        if (this.readQuickTap(ph, p)) {
          p.body.vel = { x: 0, y: 0 };
          this.startTap(ph, p, true);
        }
        return;
      }
    }
    if (timedOut) p.body.pos = { ...ph.spot };
    p.body.vel = { x: 0, y: 0 };
    if (ph.how === 'tap') {
      this.startTap(ph, p, false);
      return;
    }
    // Play-the-ball: the nearest defender stands at the mark as the tackler would.
    const marker = [...this.side(other(ph.side))].sort((a, b) => dist(a.body.pos, ph.spot) - dist(b.body.pos, ph.spot))[0]!;
    this.lock(p, 'ptb', LIVE.ptbTicks);
    this.phase = { kind: 'ruck', t0: this.tick, carrier: ph.player, tackler: this.indexOf(marker), stage: 'ptb', handover: false, heldAt: 0, down: 0, pace: null };
    this.startRetreat();
  }

  private readQuickTap(ph: Extract<Phase, { kind: 'set-piece' }>, p: Player): boolean {
    const side = ph.side;
    if (QUICK_TAP.on <= 0 || !ph.tapOrigin || ph.how !== 'tap' || this.siren || !this.onField(p) || this.locked(p)
      || this.pendingControl[side] || this.pendingPlay[side] || this.callState[side].attack
      || (ph.tapOrigin === 'penalty' && this.penaltyUp?.phase === ph && this.penaltyUp.called)) return false;
    const captain = this.onFieldCaptain(side);
    if (!captain) return false;
    const hothead = traitBoost(captain.traits, 'hothead');
    const depth = Math.max(QUICK_TAP.minShortM, QUICK_TAP.shortM
      - (captain.stats.footyIQ - PENALTY.captainIqMid) * QUICK_TAP.iqPerPointM - hothead * QUICK_TAP.hotheadPerLevelM);
    const line = clamp(this.lineX, 0, FIELD_LENGTH);
    const short = this.side(other(side)).filter(d =>
      // A man beyond the legal line, or at his shape's mark, offers no read.
      (line - d.body.pos.x) * this.dir >= depth
      && (d.target.x - d.body.pos.x) * this.dir >= depth
      && Math.abs(d.target.y - ph.spot.y) <= QUICK_TAP.laneM);
    return short.length >= QUICK_TAP.shortMen && this.playAtLaunch('tap', p) === null;
  }

  private startTap(ph: Extract<Phase, { kind: 'set-piece' }>, p: Player, quick: boolean): void {
    this.emit(quick ? 'quick-tap' : 'tap', quick ? `${p.name} taps before the defence is back!` : `${p.name} taps and goes`, p);
    if (ph.tapOrigin) {
      if (quick) this.events[this.events.length - 1]!.detail = ph.tapOrigin;
      this.onTapStarted(ph.tapOrigin, quick, ph.side, ph.spot.x, this.dir);
    }
    p.catchTick = this.tick;
    p.decided = false;
    p.steppedOn = -1;
    this.phase = { kind: 'play' };
    // No markers at a tap: each short defender must reach the fixed ten before joining in.
    if (quick) {
      this.startRetreat(true);
      this.quickTapPicture = { tick: this.tick, player: { side: p.side, slot: p.slot, who: p.key }, dir: this.dir };
    }
    // A set play off the tap (#326).
    if (this.sheetPlays[ph.side].length > 0) this.launchPlay('tap', p);
  }

  /** Read-only tap observation for the balance harness. */
  protected onTapStarted(_origin: TapOrigin, _quick: boolean, _side: Side, _x: number, _dir: 1 | -1): void {}

  /** A goal-line drop-out by `side`, from the middle of its own try line. */
  protected startDropOut(side: Side): void {
    const kicking = side;
    this.ball = { kind: 'held', by: this.indexOf(this.kicker(kicking)) };
    this.attacking = other(kicking);
    this.dir = this.dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    this.kickCall = this.fgCall = null;
    this.pendingKick = null;
    this.looseFor = null;
    this.markers = [];
    this.retreat = null;
    this.kickFrom = null;
    this.phase = { kind: 'restart', t0: this.tick, kicking, from: 'goal-line' };
    this.callSwaps();
  }

  // ── Goal kicking (2c) ─────────────────────────────────────────────────────
  /** The kicker walks to his spot, lines it up, drops it; the flight shows over or wide, then the restart. */
  protected stepConversion(ph: Extract<Phase, { kind: 'conversion' }>): void {
    const k = this.players[ph.kicker]!;
    const toward = this.dirOf(ph.side);
    const posts = postsFor(toward, FIELD_LENGTH, MID_Y);
    if (ph.good === null) {
      if (ph.readyAt === 0 && dist(k.body.pos, ph.spot) < 1) ph.readyAt = this.tick;
      if (this.tick < goalStrikeTick(ph)) return;
      ph.good = this.rng.next() < goalChance(k.body.pos, posts, k.stats.kicking, this.goalAcc(k));
      this.lock(k, 'kick', LIVE.kickLockTicks);
      this.ball = kickFlight(k.body.pos, this.goalAim(posts, toward, ph.good), this.tick, null, 7);
      return;
    }
    if (this.ball.kind !== 'flight' || !landed(this.ball, this.tick)) return;
    const pen = ph.what === 'penalty';
    if (ph.good) this.points[ph.side] += pen ? PENALTY.goalPoints : NINES.conversionPoints;
    const score = `${this.names.home} ${this.points.home} – ${this.points.away} ${this.names.away}`;
    if (pen) this.emit('penalty-goal', ph.good ? `${k.name} kicks the penalty goal — ${score}` : `${k.name} misses the penalty goal`, k);
    else {
      this.emit('conversion', ph.good ? `${k.name} converts — ${score}` : `${k.name} misses the conversion`, k);
      this.conversionDecision = { toward, spot: { ...ph.spot }, decision: { tick: this.tick, good: ph.good } };
    }
    this.events[this.events.length - 1]!.detail = ph.good ? 'good' : 'missed';
    if (!ph.good) this.react(k, 'miss');
    if (pen && !ph.good) {
      // A missed penalty goal is dead: a 20 m restart for the defence.
      const def = other(ph.side);
      if (this.siren) this.endHalf();
      else this.startSetPiece(def, twentySpot(this.dirOf(def), MID_Y), 'tap', FULLBACK, 0, '20m');
      return;
    }
    this.afterScore(ph.side);
  }
}
