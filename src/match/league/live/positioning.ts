import { SET_TACKLES } from '../../../config';
import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, MID_X, MID_Y, clampToGround } from '../../core/field';
import { BODY_RADIUS, arrive, integrate, separate, speedOf, type Body } from '../../core/body';
import type { Side } from '../../core/snapshot';
import { add, clamp, dist, type Vec } from '../../core/vec';
import { FIVE_EIGHTH, KICKER, ROLES, formationTarget } from '../roles';
import { gapTarget, intercept, supportSpots, type Candidate } from '../tactics';
import type { AttackPlan } from '../presets';
import { speedMult } from '../traits';
import { SECOND_KICKER } from '../lastTackle';
import { FATIGUE, afterRun, legsSpeed, tiredness } from '../fatigue';
import { GAS, canSprint, paceMult, runCostMult, stepGas } from '../gas';
import { WRESTLE } from '../wrestle';
import { postsFor } from '../goals';
import { CALLS } from '../calls';
import { PLAYS, roleSlot } from '../plays';
import { PLAYS_BY_ID } from '../../../data/plays';
import { WEATHER } from '../weather';
import { ownLineX } from '../touch';
import { LIVE } from './knobs';
import { other, type Player } from './types';
import { LiveContact } from './contact';
import { SHAPES, chooseShape, shapeEdge, shapeTarget, packetSlots, backDoorTarget, type AttackingShape, type ShapeKind } from '../attackingShapes';

export abstract class LivePositioning extends LiveContact {
  /** Prepare during actual contact, then retain through its ruck; null latches overrides/endings. */
  protected prepareAttackShape(): void {
    const ph = this.phase;
    if (SHAPES.on <= 0 || (ph.kind !== 'tackle' && ph.kind !== 'ruck' && ph.kind !== 'play')) return;
    if (ph.shape && !this.currentAttackShape()) { ph.shape = null; return; }
    if (ph.kind === 'play' || ph.shape !== undefined || (ph.kind === 'ruck' && ph.handover && ph.stage !== 'dh')) return;
    const tackle = this.tackles + (ph.kind === 'tackle' ? 1 : 0);
    if (tackle >= SET_TACKLES) { ph.shape = null; return; }
    if (this.sheetPlays[this.attacking].length || this.scripted || this.pendingPlay[this.attacking]
      || this.pendingControl[this.attacking] || this.callState[this.attacking].attack) { ph.shape = null; return; }
    const origin = ph.kind === 'tackle' ? this.players[ph.carrier]!.body.pos : this.mark;
    const reach = ph.kind === 'tackle' ? SHAPES.contactReachM : SHAPES.setupReachM;
    const cost = (kind: ShapeKind, edge = shapeEdge(kind, origin.y, this.dir, tackle), linkSlot?: 4 | 5, backDoor?: AttackingShape['backDoor']) => {
      const shape = { kind, edge, dir: this.dir, side: this.attacking, startedTick: this.tick, ...(linkSlot ? {linkSlot} : {}), ...(backDoor ? {backDoor} : {}) };
      const packet = packetSlots(kind, edge, linkSlot, backDoor).map(slot => this.at(this.attacking, slot));
      if (packet.some(p => !this.onField(p) || p.subFor !== null || this.locked(p)
        || p === this.holder() || p === this.dummyHalf(this.attacking))) return Infinity;
      const travel = Math.max(...packet.map(p => dist(p.body.pos, shapeTarget(shape,p.slot,origin))));
      return travel <= reach ? travel : Infinity;
    };
    // Either free half may link the same two forwards; choose the nearest feasible packet, no dice.
    const pods = ([-1,1] as const).flatMap(edge => ([4,5] as const).map(linkSlot => ({edge,linkSlot,cost:cost('pod',edge,linkSlot)})));
    const pod = pods.sort((a,b)=>a.cost-b.cost)[0]!;
    const ref = (p: Player) => ({side:p.side,slot:p.slot,who:p.key});
    const backs = SHAPES.backDoor.on <= 0 ? [] : ([4,5] as const).flatMap(slot => ([7,8] as const).map(lead => {
      const caller = this.at(this.attacking,slot);
      const edge: 1 | -1 = caller.body.pos.y < origin.y ? -1 : caller.body.pos.y > origin.y ? 1 : shapeEdge('back-door',origin.y,this.dir,tackle);
      const backDoor = {caller:ref(caller),lead:ref(this.at(this.attacking,lead)),support:ref(this.at(this.attacking,0)),
        originY:clamp(origin.y,SHAPES.marginM+SHAPES.backDoor.sweepWidthM,FIELD_WIDTH-SHAPES.marginM-SHAPES.backDoor.sweepWidthM)};
      return {edge,backDoor,cost:cost('back-door',edge,undefined,backDoor)};
    }));
    const back = backs.sort((a,b)=>a.cost-b.cost)[0];
    const feasible = { pod: Number.isFinite(pod.cost), edge: Number.isFinite(cost('edge')), backDoor: !!back && Number.isFinite(back.cost) };
    const choice = chooseShape(this.tactics[this.attacking].attack, tackle,
      this.toLineFor(this.attacking, origin), origin.y, this.rng.next(), this.dir, feasible);
    ph.shape = { ...choice, ...(choice.kind === 'pod' ? {edge:pod.edge,linkSlot:pod.linkSlot} : {}),
      ...(choice.kind === 'back-door' && back ? {edge:back.edge,backDoor:back.backDoor} : {}),
      side: this.attacking, dir: this.dir, startedTick: this.tick };
  }

  protected currentAttackShape() {
    const ph = this.phase;
    if (SHAPES.on <= 0 || (ph.kind !== 'tackle' && ph.kind !== 'ruck' && ph.kind !== 'play') || !ph.shape
      || ph.shape.side !== this.attacking || ph.shape.dir !== this.dir || this.scripted) return null;
    if (packetSlots(ph.shape.kind, ph.shape.edge, ph.shape.linkSlot, ph.shape.backDoor).some(slot => {
      const p = this.at(this.attacking, slot);
      return !this.onField(p) || p.subFor !== null;
    })) return null;
    if (ph.kind === 'play' && (this.pendingKick || this.ball.kind === 'loose'
      || (this.ball.kind === 'flight' && this.ball.via !== 'pass'))) return null;
    if (ph.shape.kind === 'back-door') {
      const b = ph.shape.backDoor;
      if (SHAPES.backDoor.on <= 0 || !b) return null;
      const men = [b.caller,b.lead,b.support].map(r => this.side(r.side).find(p => p.slot===r.slot && p.key===r.who));
      if (men.some(p => !p || this.locked(p) || p.subFor!==null)) return null;
      if (ph.kind === 'play') {
        const h = this.holder(), flight = this.ball.kind === 'flight' ? this.ball : null;
        if (ph.shape.secondPass) {
          if (!(flight?.via==='pass' && flight.t0===ph.shape.secondPass.startedTick && flight.receiver===this.indexOf(men[2]!))
            && !(h===men[2] && h.catchTick===this.tick)) return null;
        } else if (!(h===men[0] && !h.decided) && !(flight?.via==='pass' && flight.receiver===this.indexOf(men[0]!))) return null;
      }
    }
    return ph.shape;
  }

  /** A free line defender can check toward the lead while others hold the carrier. */
  private readLead(shape: AttackingShape, carrier: Player, defenders: readonly Player[], committed: readonly Player[], markers: readonly Player[], broken: boolean) {
    const read = SHAPES.leadDecoy, packet = shape.backDoor;
    if (read.on <= 0 || read.readTicks <= 0 || !packet || shape.secondPass || shape.leadRead === null) return null;
    const lead = this.at(packet.lead.side, packet.lead.slot);
    const distance = dist(lead.body.pos, carrier.body.pos);
    if (broken || this.overLineAt >= 0 || this.pendingGoal || committed.length === 0 || distance > LIVE.engageM
      || (lead.body.pos.x - carrier.body.pos.x) * this.dir < SHAPES.backDoor.leadClearM
      || (lead.body.pos.y - carrier.body.pos.y) * shape.edge <= 0
      || lead.body.vel.x * this.dir <= FATIGUE.walkSpeed) {
      if (shape.leadRead) shape.leadRead = null;
      return null;
    }
    const cover = this.fullback(other(carrier.side));
    const available = (d: Player) => d !== cover && this.onField(d) && !this.locked(d) && d.subFor === null
      && this.tick >= d.cooldownUntil && !committed.includes(d) && !markers.includes(d) && this.retreatLine(d) === null
      && (d.body.pos.x - lead.body.pos.x) * this.dir >= 0 && dist(d.body.pos, carrier.body.pos) > LIVE.tackleReach;
    let defender: Player | undefined;
    if (shape.leadRead) {
      const reading = shape.leadRead;
      defender = defenders.find(d => d.slot === reading.defender.slot && d.key === reading.defender.who);
      if (this.tick >= reading.until || !defender || !available(defender) || dist(defender.body.pos, lead.body.pos) > read.reachM) {
        shape.leadRead = null;
        return null;
      }
    } else {
      let nearest = Infinity;
      for (const d of defenders) {
        const gap = dist(d.body.pos, lead.body.pos);
        if (gap > read.reachM || gap >= nearest || !available(d)) continue;
        defender = d;
        nearest = gap;
      }
      if (!defender) return null;
      shape.leadRead = { defender: { side: defender.side, slot: defender.slot, who: defender.key }, until: this.tick + read.readTicks };
    }
    return { defender, lead };
  }

  protected candidates(passer: Player, plan: AttackPlan = this.atkPlan(passer)): Candidate[] {
    const overlap = this.overlapSide(passer);
    // A shift call (#73): receivers on the called side, as the attacker faces the line (left is +y going +x).
    const c = this.playCall();
    const shift = c === 'shift-left' ? this.dir : c === 'shift-right' ? -this.dir : 0;
    return this.side(passer.side)
      .filter((p) => p !== passer)
      .map((p) => ({
        idx: this.indexOf(p),
        pos: p.body.pos,
        busy: this.locked(p) || this.tick < p.busyUntil || (p === this.dummyHalf(passer.side) && this.phase.kind === 'ruck'),
        prefer:
          this.rolePreference(p, passer, plan) +
          (overlap !== 0 && Math.sign(p.body.pos.y - passer.body.pos.y) === overlap ? LIVE.overlapPrefer * (1 + plan.width) : 0) +
          (shift !== 0 && Math.sign(p.body.pos.y - passer.body.pos.y) === shift ? CALLS.shift.sidePrefer : 0),
      }));
  }

  /**
   * Which side of the passer has the overlap: +1 / −1 when his side has more
   * players than the defence within LIVE.shiftM of him on that side, else 0.
   */
  protected overlapSide(passer: Player): 0 | 1 | -1 {
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
    const fromRuck = passer === this.dummyHalf(passer.side);
    if (name === 'halfback' || name === 'five-eighth') return fromRuck ? 1.5 : 0.5;
    if (name === 'prop' || name === 'second-row') return fromRuck && this.tackles <= 2 ? 1.2 + plan.hitUps : plan.hitUps * 0.3;
    if (name === 'centre' || name === 'winger') return plan.edges;
    if (name === 'fullback') return -0.5 + plan.edges * 0.5;
    return 0;
  }

  /** The two defenders standing over the current mark. */
  protected currentMarkers(): Player[] {
    const ph = this.phase;
    if (ph.kind !== 'tackle' && ph.kind !== 'ruck') return [];
    const t = this.players[ph.tackler]!;
    if (ph.kind === 'ruck' && this.retreat) return [...this.retreat.markers].filter(([p, key]) => this.onField(p) && p.key === key).map(([p]) => p);
    if (ph.kind === 'ruck' && ph.handover && ph.stage !== 'dh') {
      return this.side(this.attacking)
        .filter(p => this.indexOf(p) !== ph.carrier && !this.locked(p))
        .sort((a, b) => dist(a.body.pos, this.mark) - dist(b.body.pos, this.mark)).slice(0, 2);
    }
    const second = this.side(t.side)
      .filter((d) => d !== t && d !== this.fullback(t.side))
      .sort((a, b) => dist(a.body.pos, this.mark) - dist(b.body.pos, this.mark))[0];
    return second ? [t, second] : [t];
  }

  protected dummyHalfSpot(): Vec {
    return this.behindRuck(this.mark);
  }

  private behindRuck(mark: Vec): Vec {
    return clampToGround({ x: mark.x - this.dir * 1.6, y: mark.y + 0.4 }, 1);
  }

  /**
   * The grubber chase (the wingers) starts on the second-last tackle
   * inside grubberChaseFromM, before the kick is struck, so a well-placed one
   * is a race and a kicked-dead one still dies.
   */
  private anticipatingGrubber(p: Player): boolean {
    if (p.side !== this.attacking || this.locked(p) || !this.onField(p)) return false;
    const role = ROLES[p.slot]!.name;
    // Once it is aimed, the fullback joins the wingers. Until then only the wingers go, so the last line stays.
    if (this.pendingKick?.kind === 'grubber' && (role === 'winger' || role === 'fullback')) return true;
    if (role !== 'winger') return false;
    // From the second-last tackle, through the ruck: a chase that only runs while
    // the ball is live never arrives. They stay onside of the spot until he kicks.
    const shaping = this.lastPlay || this.tackles >= SET_TACKLES - 2;
    const phase = this.phase.kind === 'play' || this.phase.kind === 'tackle' || this.phase.kind === 'ruck';
    return shaping && phase && this.toLineFor(this.attacking, this.mark) <= LIVE.grubberChaseFromM;
  }

  /** Where the chase runs: the aimed spot once the kicker has called it, otherwise just in front of the ball, not camped on the line. */
  private grubberChaseSpot(p: Player): Vec {
    if (this.pendingKick?.kind === 'grubber') return { ...this.pendingKick.to };
    const goal = this.dir > 0 ? FIELD_LENGTH : 0;
    const hold = goal - this.dir * LIVE.grubberChaseDepthM;
    const withBall = this.mark.x + this.dir * LIVE.grubberChaseLeadM;
    const x = this.dir > 0 ? Math.min(Math.max(hold, this.mark.x), withBall) : Math.max(Math.min(hold, this.mark.x), withBall);
    return { x, y: clamp(ROLES[p.slot]!.lane, 3, FIELD_WIDTH - 3) };
  }

  private centreCarryTarget(p: Player): Vec | null {
    const carry = this.centreCarry;
    if (!carry) return null;
    if (carry.carrier === p && carry.catchTick === p.catchTick && this.tick < carry.untilTick
      && !this.locked(p) && !p.jink && this.tick >= p.immuneUntil && !this.pendingControl[p.side]
      && !this.scripted && !this.pendingKick && !this.pendingGoal && p.subFor === null
      && (carry.target.x - p.body.pos.x) * this.dir > BODY_RADIUS) return carry.target;
    this.centreCarry = null;
    return null;
  }

  protected assignTargets(): void {
    const ph = this.phase;
    const shape = this.currentAttackShape();
    const bp = this.ballPos();
    const atk = this.attacking;
    const def = other(atk);
    const h = this.holder();
    const flight = this.ball.kind === 'flight' ? this.ball : null;
    const receiver = flight && flight.receiver !== null ? this.players[flight.receiver]! : null;
    // Everyone cruises unless the moment calls for the foot down (§8.2), set below.
    for (const p of this.players) p.wantsSprint = false;
    // A man in the sin bin (#71) stands on the touchline, out of everything below.
    for (const p of this.players) {
      if (this.onField(p)) continue;
      p.target = p.binSpot;
      p.through = false;
    }

    if (ph.kind === 'conversion') {
      // The kicker to his spot; his side behind him, the defence behind their try line.
      const dir = this.dirOf(ph.side);
      const posts = postsFor(dir, FIELD_LENGTH, MID_Y);
      for (const p of this.players) {
        if (!this.onField(p)) continue;
        p.through = false;
        if (this.indexOf(p) === ph.kicker) p.target = ph.spot;
        else if (p.side === ph.side) p.target = clampToGround({ x: ph.spot.x - dir * (4 + (p.slot % 3) * 2), y: ph.spot.y + (p.slot - 4) * 3 }, 1);
        else p.target = clampToGround({ x: posts.x + dir * 3, y: MID_Y + (p.slot - 4) * 4 }, 0.5);
      }
      return;
    }
    if (ph.kind === 'goal') {
      for (const p of this.players) {
        p.target = { ...p.body.pos };
        p.through = false;
      }
      return;
    }
    if (ph.kind === 'half-time' || ph.kind === 'full-time') {
      // The whistle has gone: everyone stops where he is.
      for (const p of this.players) {
        p.target = { ...p.body.pos };
        p.through = false;
      }
      return;
    }
    if (ph.kind === 'penalty') {
      // A penalty kicked for touch: the kicker to the mark, his side behind it, the defence 10 m back.
      for (const p of this.players) {
        if (!this.onField(p)) continue;
        const role = ROLES[p.slot]!;
        p.through = false;
        if (this.indexOf(p) === ph.kicker) p.target = { ...ph.spot };
        else if (p.side === ph.side) p.target = formationTarget(role, ph.spot, this.dir, true);
        else p.target = formationTarget(role, ph.spot, this.dir, false);
      }
      return;
    }
    if (ph.kind === 'set-piece') {
      // A restart in play (2d): the man with the ball to the spot, his side set
      // behind it (the hooker at dummy-half for a play-the-ball), the defence 10 m back.
      for (const p of this.players) {
        if (!this.onField(p)) continue;
        const role = ROLES[p.slot]!;
        p.through = false;
        if (this.indexOf(p) === ph.player) p.target = { ...ph.spot };
        else if (p.side === ph.side) p.target = ph.how === 'ptb' && p === this.dummyHalf(ph.side) ? this.dummyHalfSpot() : formationTarget(role, ph.spot, this.dir, true);
        else p.target = formationTarget(role, ph.spot, this.dir, false);
        if (p.subFor !== null) p.target = p.subSpot;
      }
      return;
    }
    if (ph.kind === 'restart' && ph.from === 'goal-line') {
      // A goal-line drop-out (2d): the kicking side on its own try line, the kicker in the middle; the other side 20-odd metres out.
      const kd = this.dirOf(ph.kicking);
      const line = ownLineX(kd);
      for (const p of this.players) {
        if (!this.onField(p)) continue;
        const role = ROLES[p.slot]!;
        p.through = false;
        if (p.side === ph.kicking) p.target = p === this.kicker(ph.kicking) ? { x: line + kd * 0.5, y: MID_Y } : { x: line + kd * 1.5, y: role.lane };
        else p.target = { x: line + kd * (22 + role.atk), y: role.lane };
        if (p.subFor !== null) p.target = p.subSpot;
      }
      return;
    }
    if (ph.kind === 'restart' || ph.kind === 'try') {
      // Everyone to their kick-off spots (defenders trudge back after a try).
      const kicking = ph.kind === 'restart' ? ph.kicking : other(this.players[ph.scorer]!.side);
      const receiving = other(kicking);
      const rd = this.dirOf(receiving);
      for (const p of this.players) {
        if (!this.onField(p)) continue;
        const role = ROLES[p.slot]!;
        if (p.side === kicking) {
          p.target = p === this.kicker(kicking) ? { x: MID_X - rd * 1, y: MID_Y } : { x: MID_X - rd * (3 + role.def * 0.15), y: role.lane };
        } else {
          const ownM = Math.min(28, MID_X - 10 - 6); // allow the 6m nudge while staying 10m off halfway
          p.target = formationTarget(role, { x: rd > 0 ? ownM : FIELD_LENGTH - ownM, y: MID_Y }, rd, true);
          p.target = { x: p.target.x + rd * 6, y: p.target.y }; // deep but not on the line
        }
        p.through = false;
        if (p.subFor !== null) p.target = p.subSpot;
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
    // An attacking kick (bomb, grubber, chip, cross-field) is chased flat out; a territory kick at cruise (N9.3).
    const attackingKick = this.kickInAir !== null && this.kickInAir !== 'long';
    const chaseSprint = attackingKick || LIVE.territoryChaseSprint > 0;
    let kickingSide: Side | null = null;
    if (kickUp) {
      const kicker = this.players[this.lastKicker];
      kickingSide = kicker ? kicker.side : def;
      const chase = this.side(kickingSide).filter((p) => !this.locked(p)).sort((a, b) => dist(a.body.pos, kickUp.to) - dist(b.body.pos, kickUp.to));
      for (const p of chase.slice(0, 2)) kickChasers.add(p);
      if (kicker && !this.locked(kicker)) kickChasers.add(kicker);
      // The winger on that side runs onto an attacking kick.
      if (attackingKick && LIVE.wingerChase > 0) {
        const wing = [this.at(kickingSide, 1), this.at(kickingSide, 2)]
          .filter((p) => this.onField(p) && !this.locked(p))
          .sort((a, b) => dist(a.body.pos, kickUp.to) - dist(b.body.pos, kickUp.to))[0];
        if (wing) kickChasers.add(wing);
      }
      const cover = this.side(other(kickingSide)).filter((p) => p !== receiver && !this.locked(p)).sort((a, b) => dist(a.body.pos, kickUp.to) - dist(b.body.pos, kickUp.to))[0];
      if (cover) kickChasers.add(cover);
    }

    // Attack.
    const attackers = this.side(atk);
    const carrier = h && h.side === atk ? h : null;
    const anchor = carrier ? carrier.body.pos : receiver && receiver.side === atk ? flight!.to : bp;
    const split = SECOND_KICKER.on > 0 && !this.directedLastPlay() && !this.pendingControl[atk] && !this.pendingPlay[atk]
      && ((ph.kind === 'tackle' && this.tackles === SET_TACKLES - 2)
        || (ph.kind === 'ruck' && !ph.handover && this.tackles === SET_TACKLES - 1))
      && [FIVE_EIGHTH, KICKER].every(slot => {
        const p = this.at(atk, slot);
        return this.onField(p) && p.subFor === null && this.indexOf(p) !== (ph.kind === 'tackle' || ph.kind === 'ruck' ? ph.carrier : -1) && p !== this.dummyHalf(atk);
      });
    const splitSpot = split ? this.behindRuck(ph.kind === 'tackle' ? this.players[ph.carrier]!.body.pos : this.mark) : null;
    const supports: Player[] = [];
    if (carrier || (receiver && receiver.side === atk)) {
      const lead = carrier ?? receiver!;
      const pool = attackers.filter((p) => p !== lead && p !== this.dummyHalf(atk) && !this.locked(p) && this.tick >= p.busyUntil && !this.anticipatingGrubber(p));
      pool.sort((a, b) => dist(a.body.pos, lead.body.pos) - dist(b.body.pos, lead.body.pos));
      supports.push(...pool.slice(0, 2));
    }
    const handoverMarkers = ph.kind === 'ruck' && ph.handover && ph.stage !== 'dh' ? this.currentMarkers() : [];
    const spots = supportSpots(anchor, this.dir);
    const broken = this.lineBroken();
    for (const p of attackers) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (this.targetRetreat(p)) continue;
      if (handoverMarkers.includes(p)) {
        const k = handoverMarkers.indexOf(p);
        p.target = clampToGround({ x: this.mark.x - this.dir * (LIVE.markerStandM + k * LIVE.markerGapM), y: this.mark.y }, 0.5);
      } else if (chasers.has(p) && looseAt) {
        p.target = { ...looseAt };
        p.wantsSprint = true;
      } else if (kickUp && kickChasers.has(p)) {
        p.target = { ...kickUp.to };
        p.through = dist(p.body.pos, kickUp.to) > LIVE.chaseThroughM;
        p.wantsSprint = p.side !== kickingSide || chaseSprint;
      } else if (p === carrier) {
        if (ph.kind === 'play' && this.overLineAt >= 0) {
          // Over the line and clear: round under the posts for the bonus zone.
          p.target = { x: postsFor(this.dir, FIELD_LENGTH, MID_Y).x + this.dir * 2, y: MID_Y };
          p.through = false;
          p.wantsSprint = true;
        } else if (ph.kind === 'play') {
          p.target = this.centreCarryTarget(p)
            ?? gapTarget(p.body.pos, this.dir, this.side(def).filter((d) => !this.locked(d)).map((d) => d.body.pos));
          p.through = true;
          // Space ahead, just beaten a man, or through the line: go.
          p.wantsSprint = this.tick < p.burstUntil || broken || this.laneClear(p);
        } else p.target = { ...p.body.pos };
      } else if (p === receiver) {
        const sweep = shape?.secondPass?.supportTo;
        if (sweep) {
          p.target = clampToGround(sweep, 1);
          p.through = true;
        } else {
          // A pass thrown in front of him is run onto, through the catch point;
          // one at or behind him (or a kick) he checks and gets under.
          const onto = flight!.via === 'pass' && (flight!.to.x - p.body.pos.x) * this.dir > 0.5;
          p.target = onto ? clampToGround(add(flight!.to, { x: this.dir * LIVE.runOnM, y: 0 }), 1) : { ...flight!.to };
          p.through = onto;
          p.wantsSprint = flight!.via === 'kick';
        }
      } else if (p === this.dummyHalf(atk) && (ph.kind === 'tackle' || ph.kind === 'ruck')) {
        p.target = this.dummyHalfSpot();
      } else if (splitSpot && (p.slot === KICKER || p.slot === FIVE_EIGHTH)) {
        // The halfback sets up flatter on the open side. His partner drops back on the other side before the heel.
        const primary = p.slot === KICKER;
        const edge = (splitSpot.y <= MID_Y ? 1 : -1) * (primary ? 1 : -1);
        const depth = primary ? SECOND_KICKER.halfbackDepthM : SECOND_KICKER.fiveEighthDepthM;
        p.target = clampToGround({ x: splitSpot.x - this.dir * depth, y: splitSpot.y + edge * SECOND_KICKER.laneM }, 1);
      } else if (shape?.kind === 'back-door' && ph.kind === 'ruck'
        && (ph.stage !== 'down' || this.tick >= ph.t0 + ph.down - SHAPES.backDoor.sweepLeadTicks)
        && p.slot === shape.backDoor!.support.slot) {
        // The fullback starts winding out from depth as the tackled man gets up.
        const caller = this.at(atk, shape.backDoor!.caller.slot);
        p.target = clampToGround(backDoorTarget(shape, p.slot, caller.body.pos)!, 1);
        p.through = true;
      } else if (shape?.kind === 'back-door' && ph.kind === 'ruck' && ph.stage === 'dh'
        && p.slot === shape.backDoor!.lead.slot) {
        // Start the lead on the heel, before the half runs onto the pass. The
        // DH's retreat to collect the ball must not turn the lead back with him.
        const caller = this.at(atk, shape.backDoor!.caller.slot);
        p.target = clampToGround(backDoorTarget(shape, p.slot, caller.body.pos)!, 1);
        p.wantsSprint = true;
      } else if (ph.kind === 'ruck' && ph.stage === 'dh' && !this.locked(p) && !this.anticipatingGrubber(p)) {
        // The ball is heeled: the backline comes onto it, so the first receiver
        // hits the pass at pace instead of standing flat-footed. The forwards
        // standing close to the ruck keep enough depth to stay a pass option.
        const spot = shape ? shapeTarget(shape, p.slot, anchor) : formationTarget(role, anchor, this.dir, true);
        const depth = shape && shape.kind !== 'spread' ? (anchor.x - spot.x) * this.dir : role.atk;
        const advance = Math.max(0, Math.min(LIVE.ruckAdvanceM, depth - 3));
        p.target = clampToGround({ x: spot.x + this.dir * advance, y: spot.y }, 1);
      } else if (this.anticipatingGrubber(p)) {
        // The chase is on before the boot: come up in his lane, then onto the spot once it is aimed.
        p.target = this.grubberChaseSpot(p);
        p.wantsSprint = this.pendingKick?.kind === 'grubber' || dist(p.body.pos, p.target) > 8;
        p.through = true;
      } else if (shape?.kind==='back-door' && ph.kind==='play' && !this.locked(p)
        && (p.slot===shape.backDoor!.lead.slot || p.slot===shape.backDoor!.support.slot)) {
        p.target=clampToGround(backDoorTarget(shape,p.slot,anchor)!,1);
        p.through=!shape.secondPass;
        p.wantsSprint=!shape.secondPass && (p.slot===shape.backDoor!.lead.slot || carrier?.sprinting===true);
      } else if (shape && packetSlots(shape.kind,shape.edge,shape.linkSlot,shape.backDoor).includes(p.slot) && (ph.kind === 'tackle' || ph.kind === 'ruck') && !this.locked(p)) {
        p.target = clampToGround(shapeTarget(shape, p.slot, anchor), 1);
      } else if (supports.includes(p)) {
        const s = spots[supports.indexOf(p) as 0 | 1];
        // Take the side he's already on.
        const mine = (p.body.pos.y < anchor.y) === (s.y < anchor.y) ? s : spots[supports.indexOf(p) === 0 ? 1 : 0];
        p.target = mine;
        // Backing up: when the carrier goes, his support goes with him, staying in reach for the pass.
        p.wantsSprint = carrier !== null && (broken || carrier.sprinting) && dist(p.body.pos, carrier.body.pos) < LIVE.supportSprintM;
      } else {
        p.target = shape ? clampToGround(shapeTarget(shape, p.slot, anchor), 1) : formationTarget(role, anchor, this.dir, true);
      }
    }

    // Defence.
    const defenders = this.side(def);
    const inRuck = ph.kind === 'tackle' || ph.kind === 'ruck';
    const dplan = this.defPlan();
    // The back three drop as the last two tackles shape for a kick; the edge
    // stays in the line during the earlier carries.
    const kickCover = this.tactics[atk].attack === 'kick-chase' && (this.lastPlay || this.tackles >= SET_TACKLES - 2) ? this.slideEffect() : 0;
    const rushDepth = this.tactics[atk].attack === 'kick-chase' ? Math.min(1, this.rushEffect()) : 0;
    const compressed = this.tactics[atk].attack === 'expansive' ? Math.min(1, this.compressedEffect()) : 0;
    const coverDepth = Math.min(1, kickCover);
    const heelLive = splitSpot && ph.kind === 'ruck' && ph.stage === 'dh';
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
    if ((ph.kind === 'play' && carrier) || heelLive) {
      // The heel puts the ball in play; only defenders who completed their retreat can come up.
      const want = (carrier?.body.pos.x ?? splitSpot!.x) + this.dir * 2.5;
      const pace = this.lineSpeedFromLegs(defenders, markers, committed, def);
      const stepM = dplan.lineSpeed * pace * (GAS.cruise / LIVE.lineCruiseRef) * TICK_S;
      // Rush up toward the carrier, never past him.
      if (this.dir > 0) this.lineX = Math.max(want, this.lineX - stepM);
      else this.lineX = Math.min(want, this.lineX + stepM);
    }
    const leadRead = ph.kind === 'play' && carrier && shape
      ? this.readLead(shape, carrier, defenders, committed, markers, broken) : null;
    for (const p of defenders) {
      const role = ROLES[p.slot]!;
      p.through = false;
      if (this.targetRetreat(p)) continue;
      if (chasers.has(p) && looseAt) {
        p.target = { ...looseAt };
        p.wantsSprint = true;
      } else if (kickUp && kickChasers.has(p)) {
        p.target = { ...kickUp.to };
        p.through = dist(p.body.pos, kickUp.to) > LIVE.chaseThroughM;
        p.wantsSprint = p.side !== kickingSide || chaseSprint;
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
        // Square at the play-the-ball, one behind the other toward their own goal line.
        p.target = clampToGround({ x: this.mark.x + this.dir * (LIVE.markerStandM + k * LIVE.markerGapM), y: this.mark.y }, 0.5);
      } else if (p === this.fullback(def)) {
        // The last line: deeper still on the last tackle, and once the kicker
        // shapes to kick he reads it and goes to where it will land.
        const pk = this.pendingKick;
        p.wantsSprint = broken;
        if (pk && this.players[pk.kicker]!.side === atk && !pk.kickoff) {
          p.target = { ...this.kickLanding(pk) };
          p.wantsSprint = true;
        } else {
          let deep = this.lastPlay ? LIVE.fullbackLastM : LIVE.fullbackDeepM;
          if (!this.lastPlay && coverDepth > 0) deep += (LIVE.fullbackLastM - LIVE.fullbackDeepM) * coverDepth;
          deep *= 1 - rushDepth;
          p.target = { x: clamp(this.lineX + this.dir * deep, -8, FIELD_LENGTH + 8), y: clamp(MID_Y + (anchor.y - MID_Y) * 0.6, 4, 64) };
        }
      } else if (leadRead && p === leadRead.defender) {
        // Check his advance for a step and shade across to the running threat.
        const pos = p.body.pos, shade = SHAPES.leadDecoy.shadeM;
        p.target = clampToGround({ x: pos.x, y: pos.y + clamp(leadRead.lead.body.pos.y - pos.y, -shade, shade) }, 0.5);
      } else {
        const slide = this.slideEffect();
        const expansive = this.tactics[atk].attack === 'expansive' ? slide : 0;
        const y = clamp(role.lane + (anchor.y - MID_Y) * Math.min(1, (role.defPull ?? role.pull) * dplan.pull + expansive)
          + (MID_Y - role.lane) * compressed, 1.5, 66.5);
        const depth = role.name === 'winger'
          ? (this.lastPlay ? LIVE.fullbackLastM : LIVE.fullbackDeepM) * coverDepth - LIVE.fullbackDeepM * rushDepth : 0;
        p.target = { x: clamp(this.lineX + this.dir * depth, -8, FIELD_LENGTH + 8), y };
      }
    }
    if (this.scripted && ph.kind === 'play') this.scriptTargets();
  }

  /** Legs of the onside men advancing in the line, excluding the ruck, cover and tacklers. */
  private lineSpeedFromLegs(defenders: readonly Player[], markers: readonly Player[], committed: readonly Player[], side: Side): number {
    if (FATIGUE.lineSpeedLoss <= 0) return 1;
    const fullback = this.fullback(side);
    let sum = 0, count = 0;
    for (const p of defenders) {
      if (p === fullback || markers.includes(p) || committed.includes(p) || this.locked(p) || p.subFor !== null
        || this.tick < p.cooldownUntil || this.retreatLine(p) !== null) continue;
      sum += tiredness(p.energy);
      count++;
    }
    return count === 0 ? 1 : 1 - clamp(FATIGUE.lineSpeedLoss * sum / count, 0, 1);
  }

  /**
   * A set play's lines (#326, plan §3.3), over the shape the side would take:
   * the men still to take the ball run onto it at the play's angles, each off
   * the man before him; the decoys run hard at a line `plays.decoyLeadM` ahead
   * of the caller; a kick play's chaser is sent early for the corner.
   */
  private scriptTargets(): void {
    const s = this.scripted!;
    if (s.side !== this.attacking) return;
    const play = PLAYS_BY_ID[s.id];
    const h = this.holder();
    const flight = this.ball.kind === 'flight' && this.ball.via === 'pass' ? this.ball : null;
    const anchor = h && h.side === s.side ? h.body.pos : flight && flight.receiver !== null && this.players[flight.receiver]!.side === s.side ? flight.to : null;
    if (!anchor) return;
    const free = (p: Player): boolean => p !== h && this.onField(p) && !this.locked(p) && !(flight && flight.receiver === this.indexOf(p));
    let from = anchor;
    for (let k = s.step; k < s.men.length; k++) {
      const p = this.players[s.men[k]!]!;
      const to = clampToGround({ x: from.x - this.dir * 2.5, y: from.y + s.ySign * play.script[k]!.latM }, 1);
      if (free(p)) {
        p.target = to;
        p.through = true;
        p.wantsSprint = false;
      }
      from = to;
    }
    const caller = this.players[s.men[0]!]!;
    for (const d of s.decoys) {
      const p = this.players[d.idx]!;
      if (!free(p) || s.men.includes(d.idx)) continue;
      p.target = clampToGround({ x: caller.body.pos.x + this.dir * PLAYS.decoyLeadM, y: caller.body.pos.y + s.ySign * d.latM }, 1);
      p.through = true;
      p.wantsSprint = true;
    }
    if (play.kick) {
      const w = this.at(s.side, roleSlot('wing', s.edge));
      if (free(w) && !s.men.includes(this.indexOf(w))) {
        const line = this.dir > 0 ? FIELD_LENGTH : 0;
        w.target = { x: line - this.dir * 6, y: s.ySign < 0 ? 5 : FIELD_WIDTH - 5 };
        w.through = true;
      }
    }
  }

  /** A short defender can use his normal available gas to get back promptly. */
  private targetRetreat(p: Player): boolean {
    if (!this.onField(p)) return false;
    const pending = this.retreatLine(p);
    const r = this.retreat;
    const hold = r && p.side === r.side && r.markers.get(p) !== p.key
      && this.phase.kind === 'ruck' && this.phase.handover && this.phase.stage !== 'dh';
    if (pending === null && !hold) return false;
    // Pending men cross the legal line; eligible men keep their current depth.
    // Arrive steering stops short, so aim a body radius beyond the legal line.
    p.target = { x: pending === null ? p.body.pos.x : pending + r!.dir * BODY_RADIUS, y: p.body.pos.y };
    p.through = false;
    // Once back, hold the line until the handover heel without burning gas.
    p.wantsSprint = pending !== null;
    return true;
  }

  // ── Physics ───────────────────────────────────────────────────────────────
  protected move(): void {
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
      // Rucks can begin between targeting decisions: retire immediately.
      this.targetRetreat(p);
      // Cruise unless he wants to go and has the gas; blown, less than cruise (§8.2).
      p.sprinting = p.wantsSprint && canSprint(p.gas);
      let max = p.body.maxSpeed * paceMult(p.gas, p.sprinting);
      if (p.sprinting && this.tick < p.burstUntil) max *= GAS.breakBurst;
      if (p === h) max *= LIVE.carrySpeed;
      if (kickChase && p.side !== this.attacking) max *= speedMult(p.traits, 'jets');
      if (lineBroken && p.side !== this.attacking) max *= speedMult(p.traits, 'lastLine');
      max *= legsSpeed(p.energy);
      if (p.hurt) max *= WEATHER.hurtSpeed;
      arrive(p.body, p.target, dt, { through: p.through, maxSpeed: max });
      const from = p.body.pos;
      integrate(p.body, dt);
      const standing = stopped || speedOf(p.body) < FATIGUE.walkSpeed;
      if (stepGas(p.gas, p.sprinting, standing, p.energy, p.tankS, p.refillS, dt) && p === h) {
        this.emit('blown', `${p.name} has nothing left in the tank`, p);
      }
      // Sprinting costs the legs more per metre than cruising.
      const metres = dist(from, p.body.pos);
      p.odometer += metres;
      this.legs(p, metres * runCostMult(p.sprinting), stopped ? 'stop' : standing ? 'walk' : 'no');
      if (p.jink) {
        // The sidestep: a sharp lateral shift spread over a few ticks.
        p.body.pos = clampToGround(add(p.body.pos, { x: 0, y: p.jink.dy / LIVE.stepJinkTicks }), 0.5);
        if (--p.jink.ticks <= 0) p.jink = null;
      }
    }
    const bodies = this.players.map((p) => p.body);
    for (let i = 0; i < LIVE.separatePasses; i++) {
      separate(bodies, undefined, held);
      for (const b of bodies) b.pos = clampToGround(b.pos, 0.5);
    }
    this.observeRetreat();
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
}
