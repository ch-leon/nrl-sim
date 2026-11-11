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
// siren and play on to the next dead ball, full time, points. Interchanges
// (2b): after a try the coach takes off his most tired men, who jog to the
// sideline as the fresh ones jog on; at half-time they swap in the sheds.
// Goal kicking (2c): every try is followed by a drop-kick conversion from in
// line with it, and late on a kicker in range with the scores close drops for
// a field goal.
// Touch and dead ball (2d): the ball can go into touch or dead; the side that
// touched it last loses it. Restarts are a play-the-ball 10 m in from touch, a
// tap on the 20 or for a 40/20, or a goal-line drop-out.
// Penalties (2e): ruck offences give six again; offside and high shots give a
// penalty, and the captain takes the shot, taps or kicks for touch.
// Weather, injuries and the ball lost in contact (2f): rain makes the ball
// slippery, wind carries kicks and blows goal kicks off line; a big hit can
// injure, and the hurt man comes off at the next stoppage.
// Sin bins (#71): a penalty can send the offender to the touchline for five
// minutes of match clock; his side plays a man short and stand-ins take his
// duties until he is back.
import { SET_TACKLES } from '../../config';
import { TICK_S, type MatchSim } from '../core/engine';
import { speedOf } from '../core/body';
import { CARRY_LIFT, flightAt } from '../core/ball';
import type { PlayerSnap, Snapshot } from '../core/snapshot';
import { clockText } from './rules';
import { LIVE } from './live/knobs';
import { LivePositioning } from './live/positioning';
export type { ControlInput } from './controls';
export { LIVE, runOn } from './live/knobs';
export type { LiveOptions, PlanInput } from './live/types';

export class LiveSim extends LivePositioning implements MatchSim {
  // ── Tick ──────────────────────────────────────────────────────────────────
  step(): void {
    if (this.finished) {
      // The last tick's events stay until the next step replaces them. A step
      // after full time replaces them with nothing, so they cannot be recorded again.
      this.events = [];
      return;
    }
    this.observeRivalPlay();
    this.tick++;
    this.events = [];
    const beforeSide = this.attacking;
    const beforeTackles = this.tackles;
    // Labs: match controls (Leon, 30 Oct). One pending intent per attacking side.
    while (this.controlRead < this.controlList.length && this.controlList[this.controlRead]!.tick <= this.tick) {
      const c = this.controlList[this.controlRead++]!;
      if (c.tick === this.tick && c.side === this.attacking && (c.kind !== 'kick' || this.tackles === SET_TACKLES - 1)) {
        this.pendingControl[c.side] = c;
        // A manual decision can arrive during the AI's wind-up, including its
        // launch tick. Keep the animation lock, but let the input decide the action.
        if (this.phase.kind === 'play' && this.holder()?.side === c.side) this.pendingKick = null;
      }
    }
    // Coach calls due this tick (#73).
    while (this.callRead < this.callList.length && this.callList[this.callRead]!.tick <= this.tick) {
      const c = this.callList[this.callRead++]!;
      if (c.tick === this.tick) this.call(c.side, c.call, c.play);
    }
    // Plan changes due this tick (N11); a new plan comes in as the restart is set.
    while (this.planRead < this.planList.length && this.planList[this.planRead]!.tick <= this.tick) {
      const c = this.planList[this.planRead++]!;
      if (c.tick === this.tick) this.setTactics(c.side, c.tactics);
    }
    if (this.phase.kind === 'restart' && this.phase.from === undefined) this.takeNewPlans();
    // The AI coaches (N9.6) read the play at each play-the-ball.
    if (this.aiCoach.length > 0 && this.phase.kind === 'ruck') for (const s of this.aiCoach) this.aiCall(s);
    if (this.phase.kind === 'half-time') this.stepHalfTime(this.phase);
    else if (this.phase.kind !== 'conversion') {
      this.launchPendingKick();
      this.launchGoal();
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
      case 'conversion':
        this.stepConversion(this.phase);
        break;
      case 'set-piece':
        this.stepSetPiece(this.phase);
        break;
      case 'penalty':
        this.stepPenaltyKick(this.phase);
        break;
      case 'goal':
        this.stepGoal(this.phase);
        break;
      default:
        break;
    }
    // Fresh legs (#367): one test a tick, and nothing more, until a coach calls it.
    if (this.freshLegs.home.pending || this.freshLegs.away.pending) this.landFreshLegs();
    if (this.tick % Math.max(1, Math.round(LIVE.decideEveryTicks)) === 0) this.assignTargets();
    this.move();
    this.restBench();
    this.runClock();
    this.binClock();
    // Whoever has it touched it last (2d: who loses it when it goes out), and the kick in play is over.
    const h = this.holder();
    if (h) {
      this.lastTouch = h.side;
      if (this.kickFrom) this.endKick(h.side, h.body.pos);
    }
    this.watchLineBreak(h);
    this.expireCalls();
    if (this.scripted || this.tucked >= 0) this.tidyPlays();
    if (this.attacking !== beforeSide || this.tackles < beforeTackles
      || !['play', 'tackle', 'ruck'].includes(this.phase.kind)) {
      this.pendingControl.home = this.pendingControl.away = null;
    }
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────
  snapshot(): Snapshot {
    const b = this.ball; const ph = this.phase;
    const scorer = ph.kind === 'try' ? this.players[ph.scorer] : undefined;
    const players: PlayerSnap[] = this.players.map((p) => {
      const pending = this.pendingKick && this.players[this.pendingKick.kicker] === p ? this.pendingKick : null;
      const goal = this.pendingGoal && this.players[this.pendingGoal.kicker] === p ? this.pendingGoal : null;
      const startedTick = p.lockUntil - LIVE.kickLockTicks;
      const kick: PlayerSnap['kick'] = p.pose === 'kick' && this.tick < p.poseUntil ? {
        startedTick, untilTick: p.lockUntil,
        strikeTick: pending?.at ?? goal?.at ?? (b.kind === 'flight' && b.via === 'kick' ? b.t0 : startedTick + LIVE.kickContactTicks),
        kind: pending?.kind === 'grubber' || (!pending && b.kind === 'flight' && b.bounces > 0) ? 'grubber'
          : goal || this.goalUp || ph.kind === 'conversion' ? 'drop' : 'punt',
      } : undefined;
      return {
        side: p.side,
        slot: p.slot,
        x: p.body.pos.x,
        y: p.body.pos.y,
        pose: p.pose,
        headX: p.body.heading.x,
        headY: p.body.heading.y,
        speed: speedOf(p.body),
        // As things stand after the tick: the tick he runs dry he is blown, not sprinting.
        ...(p.sprinting && !p.gas.blown ? { sprint: true } : {}),
        ...(p.gas.blown ? { blown: true } : {}),
        gas: p.gas.gas,
        legs: p.energy,
        who: p.key,
        poseUntil: p.poseUntil,
        caughtTick: p.catchTick,
        ...(kick ? { kick } : {}),
        ...(p.aerialCatchTick !== undefined && p.aerialCatchTick === p.catchTick ? { aerialCatchTick: p.aerialCatchTick } : {}),
        ...(ph.kind === 'try' && scorer === p ? { tryTick: ph.t0 } : {}),
        ...(ph.kind === 'try' && scorer?.side === p.side ? { celebrationTick: ph.t0 } : {}),
        ...(p.binUntilS >= 0 ? { binned: true } : {}),
      };
    });
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
    const short = this.players.some((p) => !this.onField(p)) ? ` · ${this.side('home').length} v ${this.side('away').length}` : '';
    const snap: Snapshot = {
      tick: this.tick,
      players,
      ball,
      label: `${this.names[this.attacking]} ball · ${state} · ${this.points.home}–${this.points.away} · ${clockText(this.half, this.clockTicks * TICK_S)}${this.siren && (kind === 'play' || kind === 'tackle' || kind === 'ruck') ? ' · siren' : ''} · ${legs}${short}`,
      events: this.events,
      clock: { half: this.half, seconds: this.clockTicks * TICK_S, minute: Math.floor(this.matchSeconds / 60), siren: this.siren, finished: this.finished },
      score: { ...this.points },
    };
    const w = ph.kind === 'tackle' ? ph.wrestle : null;
    const contact = this.visualContact;
    if (contact) {
      const c = this.players.find(p => p.key === contact.carrier.who && p.side === contact.carrier.side && p.slot === contact.carrier.slot);
      const holding = ((ph.kind === 'tackle' && ph.t0 === contact.startedTick) || (ph.kind === 'ruck' && ph.stage !== 'dh' && ph.contactStartedTick === contact.startedTick)) && this.players[ph.carrier] === c;
      const escaping = ph.kind === 'play' && (contact.outcome === 'strip' || contact.outcome === 'break-tackle') && this.tick - contact.resolvedTick! <= 20;
      if (holding || escaping) snap.contact = { ...contact,
        phaseTick: ph.kind === 'ruck' || ph.kind === 'tackle' ? ph.t0 : contact.resolvedTick ?? contact.startedTick,
        ...(ph.kind === 'ruck' && ph.stage !== 'dh' ? { releaseTick: ph.stage === 'down' ? ph.t0 + ph.down : ph.t0 } : {}),
      };
    }
    if (w && ph.kind === 'tackle') {
      const c = this.players[ph.carrier]!;
      snap.wrestle = { side: c.side, slot: c.slot, fight: w.fight0 > 0 ? w.fight / w.fight0 : 0, men: w.men.length };
    }
    return snap;
  }
}
