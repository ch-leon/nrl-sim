import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y, clampToGround } from '../../core/field';
import { bounceFlight, kickFlight } from '../../core/ball';
import type { Side } from '../../core/snapshot';
import { dist, type Vec } from '../../core/vec';
import { FULLBACK, PLAYERS } from '../roles';
import { bootMult } from '../traits';
import { traitBoost } from '../../../data/traits';
import { NINES } from '../rules';
import { GOALS, goalChance, postsFor } from '../goals';
import { PENALTY, choosePenalty, type PenaltyChoice } from '../penalties';
import { twentySpot } from '../touch';
import { BIN, binReason, binReasonText, sinBinChance } from '../sinbin';
import { LIVE } from './knobs';
import { other, type Player, type Phase } from './types';
import { LiveRestarts } from './restarts';

export abstract class LivePenalties extends LiveRestarts {
  // ── Penalties (2e) ────────────────────────────────────────────────────────
  /**
   * `offender` concedes a penalty at `spot` (brought out to 10 m from the line).
   * The captain's call (penalties.ts): the shot at goal, a tap, or a kick for
   * touch — each said and shown. After the siren only the shot keeps the half alive.
   */
  protected penalize(offender: Side, spot: Vec, why: string, culprit: Player, kind: string, trait?: string, bin = true): void {
    const award = other(offender);
    const dir = this.dirOf(award);
    this.emit('penalty', `Penalty to ${this.names[award]} — ${why}`, culprit, trait);
    this.events[this.events.length - 1]!.detail = kind;
    // No sin bin for a kick-off dead on the full (#397).
    if (bin) this.maybeBin(offender, culprit, spot, kind);
    this.pendingKick = null;
    this.kickFrom = null;
    this.outPending = null;
    this.overLineAt = -1;
    const line = dir > 0 ? FIELD_LENGTH : 0;
    const mark = clampToGround({ x: dir > 0 ? Math.min(spot.x, line - 10) : Math.max(spot.x, line + 10), y: spot.y }, 1);
    const kicker = this.goalKicker(award);
    const halfS = (this.golden ? NINES.goldenPointMinutes : this.length.halfMinutes) * 60;
    const halfLeftS = Math.max(0, halfS - this.clockTicks * TICK_S);
    const shot = goalChance(mark, postsFor(dir, FIELD_LENGTH, MID_Y), kicker.stats.kicking, this.goalAcc(kicker));
    const choice = choosePenalty({
      shotChance: shot,
      toLine: this.toLineFor(award, mark),
      matchLeftS: this.golden ? halfLeftS : (this.length.halves - this.half) * halfS + halfLeftS,
      halfLeftS,
      siren: this.siren,
      margin: this.points[award] - this.points[offender],
      captain: this.captain[award],
    });
    if (this.siren && choice !== 'goal') {
      this.endHalf();
      return;
    }
    this.penaltyUp = { side: award, mark, choice, shot, phase: this.phase, called: false };
    this.takePenalty(award, mark, choice);
  }

  /** The penalty is taken: the captain's choice, or the coach's over it (#396). Each is said and shown. */
  protected takePenalty(award: Side, mark: Vec, choice: PenaltyChoice): void {
    const dir = this.dirOf(award);
    const kicker = this.goalKicker(award);
    const say = { goal: `${this.names[award]} take the shot at goal`, tap: `${this.names[award]} tap and go`, touch: `${this.names[award]} kick for touch` } as const;
    // The named goal-kicker (N11) takes the shot; a kick for touch is the slot-5 kicker's, as before.
    const taker = choice === 'goal' ? kicker : this.kicker(award);
    this.emit('penalty-choice', say[choice], taker);
    this.events[this.events.length - 1]!.detail = choice;
    this.attacking = award;
    this.dir = dir;
    this.tackles = 0;
    this.lastPlay = false;
    this.kickCall = this.fgCall = null;
    this.looseFor = null;
    this.markers = [];
    if (choice === 'tap') this.startSetPiece(award, mark, 'tap');
    else {
      this.ball = { kind: 'held', by: this.indexOf(taker) };
      this.phase = choice === 'goal'
        ? { kind: 'conversion', t0: this.tick, side: award, kicker: this.indexOf(taker), spot: mark, readyAt: 0, good: null, what: 'penalty' }
        : { kind: 'penalty', t0: this.tick, side: award, spot: mark, kicker: this.indexOf(taker), kicked: false };
    }
    // The coach's window (#396) follows the penalty to the phase that takes it.
    if (this.penaltyUp) {
      this.penaltyUp.choice = choice;
      this.penaltyUp.phase = this.phase;
    }
  }

  /** The penalty won and not yet taken (#396): the tap not yet played, the shot not yet struck, the kick for touch not yet gone. */
  protected penaltyOpen(): { side: Side; mark: Vec; choice: PenaltyChoice; shot: number; called: boolean } | null {
    const pen = this.penaltyUp;
    const ph = this.phase;
    if (!pen || ph !== pen.phase) return null;
    if (ph.kind === 'conversion' && ph.good !== null) return null;
    if (ph.kind === 'penalty' && ph.kicked) return null;
    return pen;
  }

  /** A penalty kicked for touch: the kicker to the mark, then the ball out 25-odd metres downfield. */
  protected stepPenaltyKick(ph: Extract<Phase, { kind: 'penalty' }>): void {
    if (ph.kicked) return;
    const k = this.players[ph.kicker]!;
    if (this.tick < ph.t0 + PENALTY.minTicks) return;
    if (dist(k.body.pos, ph.spot) > 1 && this.tick < ph.t0 + PENALTY.maxTicks) return;
    ph.kicked = true;
    const dir = this.dirOf(ph.side);
    const line = dir > 0 ? FIELD_LENGTH : 0;
    const gain = PENALTY.touchGainM * bootMult(k.traits).dist * this.wx.kickDistance;
    const x = dir > 0 ? Math.min(k.body.pos.x + gain, line - 10) : Math.max(k.body.pos.x - gain, line + 10);
    const y = k.body.pos.y < MID_Y ? -2 : FIELD_WIDTH + 2;
    this.lock(k, 'kick', LIVE.kickLockTicks);
    this.ball = kickFlight(k.body.pos, { x, y }, this.tick, null, 10);
    this.lastKicker = ph.kicker;
    this.penaltyKickUp = { side: ph.side };
  }

  // ── Sin bins (#71) ────────────────────────────────────────────────────────
  /**
   * A penalty may send the offender to the sin bin for BIN.minutes of match
   * clock: more likely for a high shot, in his own 20 (a professional foul),
   * again after repeated infringements there, and for a Hitman or Hothead. One
   * roll on every penalty whatever the chance, so turning bins off with the
   * knobs leaves a match the same until a bin would have happened.
   */
  private maybeBin(offender: Side, culprit: Player, spot: Vec, kind: string): void {
    const award = other(offender);
    const own20 = this.toLineFor(award, spot) <= BIN.redZoneM;
    const prior = this.ownTwentyPens[offender];
    if (own20) this.ownTwentyPens[offender]++;
    const r = this.rng.next();
    const out = PLAYERS - this.side(offender).length;
    const sit = { high: kind === 'high', own20, prior, hitman: traitBoost(culprit.traits, 'hitman'), hothead: traitBoost(culprit.traits, 'hothead') };
    if (out >= BIN.maxOut || r >= sinBinChance(sit)) return;
    const reason = binReason(sit);
    culprit.binUntilS = this.matchSeconds + BIN.minutes * 60;
    culprit.binSpot = this.interchangeSpot(culprit);
    culprit.subFor = null;
    if (culprit.subFresh) {
      // Fresh legs (#367) was taking him off: it waits for the next man instead.
      culprit.subFresh = false;
      this.freshLegs[offender].pending = true;
    }
    culprit.cooldownUntil = culprit.immuneUntil = culprit.burstUntil = 0;
    this.refreshOnField();
    this.emit('sin-bin', `${culprit.name} is sent to the sin bin — ${binReasonText(reason)}`, culprit);
    this.events[this.events.length - 1]!.detail = reason;
  }

  /** Time served: back on from the touchline. */
  protected binClock(): void {
    for (const p of this.players) {
      if (p.binUntilS < 0 || this.matchSeconds < p.binUntilS) continue;
      p.binUntilS = -1;
      this.refreshOnField();
      this.emit('sin-bin-return', `${p.name} is back from the sin bin`, p);
    }
  }

  /** Men each side has in the sin bin now. */
  binnedOf(side: Side): number {
    return PLAYERS - this.side(side).length;
  }

  /** A kicker's goal accuracy (spread: lower is truer): Big Boot, and the wind blowing it off line (2f). */
  protected goalAcc(k: Player): number {
    return bootMult(k.traits).acc * this.wx.goalSpread;
  }

  /** Where a kick at goal comes down: just over the bar between the uprights, or wide of one. */
  protected goalAim(posts: Vec, dir: 1 | -1, good: boolean): Vec {
    const r = this.rng.next();
    const y = good ? posts.y + (r - 0.5) * 1.6 * GOALS.halfPosts : posts.y + (r < 0.5 ? -1 : 1) * (GOALS.halfPosts + 0.5 + Math.abs(r - 0.5) * 6);
    return { x: posts.x + dir * 6, y };
  }

  /** A field goal is on: the last minutes (any time in golden point), the scores close, in range, late in the set. */
  protected fieldGoalOn(h: Player): boolean {
    if (this.half < this.length.halves || this.siren) return false;
    const left = this.length.halfMinutes * 60 - this.clockTicks * TICK_S;
    if ((!this.golden && left > GOALS.fieldGoalLastS) || this.tackles < GOALS.fieldGoalFromTackle) return false;
    const margin = this.points[h.side] - this.points[other(h.side)];
    if (margin < GOALS.fieldGoalMargin[0] || margin > GOALS.fieldGoalMargin[1]) return false;
    return dist(h.body.pos, postsFor(this.dirOf(h.side), FIELD_LENGTH, MID_Y)) <= GOALS.fieldGoalRangeM;
  }

  /** Off the boot: charged down, or in the air to the posts. */
  protected launchGoal(): void {
    const g = this.pendingGoal;
    if (!g || this.tick < g.at) return;
    this.pendingGoal = null;
    const k = this.players[g.kicker]!;
    const dir = this.dirOf(k.side);
    if (this.rng.next() < GOALS.chargeDown) {
      const d = [...this.side(other(k.side))].sort((a, b) => dist(a.body.pos, k.body.pos) - dist(b.body.pos, k.body.pos))[0]!;
      this.emit('charge-down', `${d.name} charges down the field goal!`, d);
      this.ball = bounceFlight(k.body.pos, { x: -dir, y: (this.rng.next() - 0.5) * 1.2 }, this.tick, 4, 14, 2);
      this.looseFor = null;
      return;
    }
    const posts = postsFor(dir, FIELD_LENGTH, MID_Y);
    const good = this.rng.next() < goalChance(k.body.pos, posts, k.stats.kicking, this.goalAcc(k));
    this.ball = kickFlight(k.body.pos, this.goalAim(posts, dir, good), this.tick, null, 8);
    this.goalUp = { side: k.side, kicker: g.kicker, good };
    this.emit('drop-goal', `${k.name} drops for the field goal…`, k);
  }

  /** A field goal comes down: a point and the restart, or a miss and the ball back to the defence on their 20. */
  protected resolveGoal(): void {
    const g = this.goalUp!;
    this.goalUp = null;
    const k = this.players[g.kicker]!;
    if (g.good) this.points[g.side] += NINES.fieldGoalPoints;
    this.emit('field-goal', g.good ? `FIELD GOAL! ${k.name} — ${this.names.home} ${this.points.home} – ${this.points.away} ${this.names.away}` : `${k.name}'s field goal goes wide`, k);
    this.events[this.events.length - 1]!.detail = g.good ? 'good' : 'missed';
    if (g.good) {
      this.ball = { kind: 'held', by: g.kicker };
      this.phase = { kind: 'goal', t0: this.tick, side: g.side };
      return;
    }
    if (this.siren) {
      this.endHalf(); // a miss after the siren is dead
      return;
    }
    // Dead ball: a tap restart for the defence on their own 20 (2d).
    const def = other(g.side);
    this.emit('dead-ball', `Dead ball — 20-metre restart, ${this.names[def]} ball`);
    this.events[this.events.length - 1]!.detail = '20m';
    this.startSetPiece(def, twentySpot(this.dirOf(def), MID_Y), 'tap', FULLBACK);
  }

  protected stepGoal(ph: Extract<Phase, { kind: 'goal' }>): void {
    if (this.tick < ph.t0 + GOALS.goalTicks) return;
    this.afterScore(ph.side);
  }
}
