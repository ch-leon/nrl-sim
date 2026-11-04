import { SET_TACKLES } from '../../../config';
import { TICK_S } from '../../core/engine';
import type { Side } from '../../core/snapshot';
import { dist } from '../../core/vec';
import { ROLES } from '../roles';
import { PRESET_LABEL, type TeamTactics } from '../presets';
import type { PlanChange } from '../breaks';
import { bootMult } from '../traits';
import { pickFreshLegs } from '../bench';
import { GOALS } from '../goals';
import { CALLS, CALL_LABEL, callIsBench, callIsDefence, callIsPenalty, callIsPlay, callScope, paidOffText, penaltyChoiceOf, type CallVerdict, type CoachCall } from '../calls';
import { FORTY_TWENTY_INTO_M, TOUCH } from '../touch';
import { LIVE } from './knobs';
import { other, type Player } from './types';
import { LiveBase } from './base';

export abstract class LiveCalls extends LiveBase {
  // ── Coach calls (#73) ─────────────────────────────────────────────────────
  /** Tackles made in the set so far (a call's timing: "on tackle 2"). */
  get tackleCount(): number {
    return this.tackles;
  }
  /** Who has the ball. */
  get inPossession(): Side {
    return this.attacking;
  }
  /** What the match is doing (open play, a tackle, a ruck, a restart…). */
  get phaseKind(): string {
    return this.phase.kind;
  }

  /** Labs: match controls (Leon, 30 Oct). Read-only presentation cues. */
  get controlDirection(): 1 | -1 { return this.dir; }
  get controlEngagement(): string | null {
    const h = this.holder();
    if (!h || h.side !== this.attacking || this.phase.kind !== 'play') return null;
    const nearest = this.committed(h, this.side(other(this.attacking)))[0];
    return nearest && dist(nearest.body.pos, h.body.pos) < LIVE.engageM ? `${h.side}:${this.indexOf(h)}:${h.catchTick}` : null;
  }

  /** Why a side can't make this call now, or null when it can. */
  callRefusal(side: Side, call: CoachCall): string | null {
    const k = this.phase.kind;
    if (!this.finished && (call === 'kickoff-short' || call === 'kickoff-long')) return this.kickoffRefusal(side);
    // Take the two / Tap and go (#396): only on a penalty his side has won and not yet taken, with the shot on.
    if (callIsPenalty(call)) {
      const pen = this.penaltyOpen();
      if (this.finished || !pen || pen.side !== side) return 'no penalty';
      if (pen.called) return 'one call a penalty';
      if (pen.shot < CALLS.penaltyShotMin) return 'too far out';
      if (pen.choice === penaltyChoiceOf(call)) return 'the captain’s call';
      if (call === 'tap-go' && this.siren) return 'the siren’s gone';
      return null;
    }
    if (this.finished || k === 'half-time' || k === 'conversion' || k === 'goal' || k === 'try') return 'not now';
    if (callIsBench(call)) {
      const fl = this.freshLegs[side];
      if (fl.pending || fl.usedThisHalf >= CALLS.freshLegs.perHalf) return 'used this half';
      if (!this.side(side).some((p) => p.subFor === null && p.energy < CALLS.freshLegs.offBelow)) return 'no one’s tired yet';
      if (!this.bench[side].some((b) => !b.injured && b.energy >= CALLS.freshLegs.onAtLeast)) return 'bench is spent';
      return null;
    }
    const st = this.callState[side];
    if (callIsDefence(call)) {
      if (this.attacking === side) return 'not while you have the ball';
      return st.usedDefence ? 'one call a set' : null;
    }
    if (this.attacking !== side) return 'not your ball';
    if (st.usedAttack) return 'one call a set';
    if (call === 'kick-early' && (this.tackles < CALLS.kickEarlyFrom || this.tackles >= SET_TACKLES - 1)) return 'tackles 3–4';
    if (call === 'offload' && this.tackles >= CALLS.offload.beforeTackle) return 'tackles 1–4';
    if ((call === 'run-it' || call === 'bomb' || call === 'grubber' || call === 'forty-twenty') && this.tackles < CALLS.lastFrom) return 'late in the set';
    // Grubber and 40/20 (#396): not once the set's kick is struck, and from where the ball is now (the mark at a ruck).
    if ((call === 'grubber' || call === 'forty-twenty') && this.pendingKick) return 'the kick’s away';
    if (call === 'grubber' && this.toLineFor(side, this.ballPos()) > CALLS.grubberInsideM) return 'not inside their 25';
    if (call === 'forty-twenty' && this.toLineFor(side, this.ballPos()) < CALLS.fortyTwentyFromM) return 'not behind your 40';
    if (call === 'forty-twenty' && this.toLineFor(side, this.ballPos()) > this.fortyTwentyReach(side)) return 'out of reach of their 20';
    if (call === 'field-goal') {
      const h = this.holder();
      if (!this.fieldGoalOn(h && h.side === side ? h : this.goalKicker(side))) return 'not in range';
    }
    return null;
  }

  /**
   * How far from their line a 40/20 can be kicked from (#396): the kick's reach (calls.fortyTwenty.reachM × his
   * kicker's Big Boot and the wind, without its gusts), the shortest roll on (touchRollM), and their 20 (isFortyTwenty's).
   */
  private fortyTwentyReach(side: Side): number {
    return FORTY_TWENTY_INTO_M + TOUCH.touchRollM + CALLS.fortyTwenty.reachM * bootMult(this.kicker(side).traits).dist * this.wx.kickDistance;
  }

  /**
   * Why `side` can't call its kick-off now (#397): the kicking side only, once,
   * in the break before it (as the plan, N11): after a try until the conversion
   * is taken (the side that conceded kicks off), and the restart until the
   * kicker is on his way (not a drop-out). Never with the siren up or in golden
   * point, its own kick-off included: there the next score ends the half or the
   * match, and a Short kick would be a quarter-chance at winning it straight back.
   */
  private kickoffRefusal(side: Side): string | null {
    const ph = this.phase;
    if (this.siren || this.golden) return 'at the kick-off';
    const kicking = ph.kind === 'restart' && ph.from === undefined && !this.pendingKick
      ? ph.kicking
      : ph.kind === 'try'
        ? other(this.players[ph.scorer]!.side)
        : ph.kind === 'conversion' && ph.what === undefined
          ? other(ph.side)
          : null;
    if (!kicking) return 'at the kick-off';
    if (kicking !== side) return 'their kick-off';
    return this.kickoffCall ? 'called' : null;
  }

  /** Why a side can't change its plan now (N11), or null: only at the breaks — half-time, or a score until the kick-off is taken (not a drop-out). */
  planRefusal(): string | null {
    const ph = this.phase;
    if (this.finished) return 'full time';
    // A restart is a break until the kicker is on his way (his run-up is the kick).
    const atBreak = ph.kind === 'half-time' || ph.kind === 'try' || ph.kind === 'conversion' || (ph.kind === 'restart' && ph.from === undefined && !this.pendingKick);
    return atBreak ? null : 'at the breaks';
  }

  /** The coach changes the plan (N11): the side's presets from the restart. Returns why not, or null when it is made. */
  setTactics(side: Side, tactics: TeamTactics): string | null {
    const why = this.planRefusal();
    if (why) return why;
    this.nextPlan[side] = { tactics: { attack: tactics.attack, defence: tactics.defence }, at: this.breakKind(), minute: Math.floor(this.matchSeconds / 60) };
    return null;
  }

  /** The plan each side will play from the restart: the new one if the coach changed it, else the one in force. */
  planFor(side: Side): TeamTactics {
    return this.nextPlan[side]?.tactics ?? this.tactics[side];
  }

  /** Where a plan change made now would be filed: half-time, the break after a try, or the kick-off. */
  private breakKind(): PlanChange['at'] {
    const k = this.phase.kind;
    if (k === 'half-time') return 'half-time';
    if (k === 'try' || k === 'conversion') return 'try';
    return 'kickoff';
  }

  /**
   * The break rule (N13.5), once, as the break opens. A coach who has already
   * chosen this break is left alone. No rule, no call, and nothing about the
   * match changes.
   */
  protected considerBreak(at: 'half-time' | 'try'): void {
    const rule = this.breakRule;
    if (!rule) return;
    for (const side of ['home', 'away'] as const) {
      if (!this.breakRuleSides.has(side) || this.nextPlan[side]) continue;
      const next = rule({
        score: { home: this.points.home, away: this.points.away },
        minute: Math.floor(this.matchSeconds / 60),
        plan: this.planFor(side),
        side,
        at,
        concededInARow: this.concededRun[side],
      });
      if (next) this.setTactics(side, next);
    }
  }

  /** The restart: each new plan comes into force, and the commentary says so. */
  protected takeNewPlans(): void {
    for (const side of ['home', 'away'] as const) {
      const queued = this.nextPlan[side];
      if (!queued) continue;
      this.nextPlan[side] = null;
      const t = queued.tactics;
      if (t.attack === this.tactics[side].attack && t.defence === this.tactics[side].defence) continue;
      this.tactics[side] = t;
      this.refreshPlanFit(side);
      this.planChanges.push({ minute: queued.minute, side, attack: t.attack, defence: t.defence, at: queued.at });
      this.emit('plan', `${this.names[side]} change the plan: ${PRESET_LABEL[t.attack]} / ${PRESET_LABEL[t.defence]}`, this.kicker(side));
      this.events[this.events.length - 1]!.detail = `${t.attack}/${t.defence}`;
    }
  }

  /** The coach makes a call: in force from now for its scope (a play or the set). Returns why not, or null when it is made. */
  call(side: Side, call: CoachCall): string | null {
    const why = this.callRefusal(side, call);
    if (why) return why;
    if (callIsPenalty(call)) {
      // Neither of the set's calls (#396): the captain's choice is overruled and the penalty taken the coach's way.
      const pen = this.penaltyUp!;
      pen.called = true;
      const choice = penaltyChoiceOf(call);
      const taker = choice === 'goal' ? this.goalKicker(side) : this.kicker(side);
      this.emit('coach-call', `${this.names[side]} coach calls: ${CALL_LABEL[call].toLowerCase()}`, taker);
      this.events[this.events.length - 1]!.detail = call;
      this.judge.make(side, call, side, this.dirOf(side), pen.mark.x);
      this.takePenalty(side, pen.mark, choice);
      return null;
    }
    if (call === 'kickoff-short' || call === 'kickoff-long') {
      // Neither of the set's calls: the kick takes it (stepRestart).
      this.kickoffCall = { side, call };
      this.emit('coach-call', `${this.names[side]} coach calls: ${CALL_LABEL[call].toLowerCase()}`, this.kicker(side));
      this.events[this.events.length - 1]!.detail = call;
      this.judge.make(side, call, this.attacking, this.dirOf(this.attacking), this.ballPos().x);
      return null;
    }
    if (callIsBench(call)) {
      // Neither of the set's calls: the swap waits for the next play-the-ball or stoppage.
      const fl = this.freshLegs[side];
      fl.pending = true;
      fl.usedThisHalf++;
      const pick = this.freshLegsPick(side);
      this.emit('coach-call', `${this.names[side]} coach calls: ${CALL_LABEL[call].toLowerCase()}`, pick ? this.at(side, pick.slot) : this.kicker(side));
      this.events[this.events.length - 1]!.detail = call;
      this.judge.make(side, call, this.attacking, this.dirOf(this.attacking), this.ballPos().x);
      return null;
    }
    const st = this.callState[side];
    if (callIsDefence(call)) {
      st.defence = call;
      st.usedDefence = true;
      st.defenceLeft = callScope(call);
    } else {
      st.attack = call;
      st.usedAttack = true;
      st.attackLeft = callScope(call);
    }
    const h = this.holder();
    const by = h && h.side === side ? h : this.kicker(side);
    this.emit('coach-call', `${this.names[side]} coach calls: ${CALL_LABEL[call].toLowerCase()}`, by);
    this.events[this.events.length - 1]!.detail = call;
    this.judge.make(side, call, this.attacking, this.dirOf(this.attacking), this.ballPos().x);
    return null;
  }

  /**
   * The AI coach's call, if any (N9.6, spec §6): a field goal when one is on (and none of his
   * other attack calls while one may soon be); a shift toward an overlap; Rush defending near
   * his own line. Rules only, no dice, and the same refusals as the player's chips.
   */
  protected aiCall(side: Side): void {
    if (this.attacking !== side) {
      if (this.toLineFor(this.attacking, this.ballPos()) <= CALLS.ai.rushOwnM && this.callRefusal(side, 'rush') === null) this.call(side, 'rush');
      return;
    }
    if (this.callRefusal(side, 'field-goal') === null) {
      this.call(side, 'field-goal');
      return;
    }
    if (this.fieldGoalSoon(side)) return;
    const by = this.ballPos().y;
    const count = (ps: readonly Player[], sign: number): number => ps.filter((p) => this.onField(p) && Math.sign(p.body.pos.y - by) === sign).length;
    const atk = this.side(side);
    const def = this.side(other(side));
    // Shift left goes toward +dir in y (see the shift's receiver preference).
    const left = count(atk, this.dir) - count(def, this.dir);
    const right = count(atk, -this.dir) - count(def, -this.dir);
    const call: CoachCall | null = left >= CALLS.ai.overlap && left > right ? 'shift-left' : right >= CALLS.ai.overlap && right > left ? 'shift-right' : null;
    if (call && this.callRefusal(side, call) === null) this.call(side, call);
  }

  /** The last minutes of a close match: an AI coach keeps his attack call for the field goal. */
  private fieldGoalSoon(side: Side): boolean {
    if (this.half < this.length.halves) return false;
    const left = this.length.halfMinutes * 60 - this.clockTicks * TICK_S;
    const margin = this.points[side] - this.points[other(side)];
    return left <= GOALS.fieldGoalLastS + GOALS.fieldGoalSoonExtraS && margin >= GOALS.fieldGoalMargin[0] && margin <= GOALS.fieldGoalMargin[1];
  }

  /** Fresh legs (#367): called and waiting for its swap (the chip stays lit). */
  freshLegsPending(side: Side): boolean {
    return this.freshLegs[side].pending;
  }

  /** Who Fresh legs would bring off and on now (bench.ts pickFreshLegs), skipping `taken`. */
  protected freshLegsPick(side: Side, taken?: { slots: ReadonlySet<number>; bench: ReadonlySet<number> }): { slot: number; bench: number } | null {
    const field = this.side(side).filter((p) => p.subFor === null).map((p) => ({ slot: p.slot, energy: p.energy, position: ROLES[p.slot]!.name }));
    return pickFreshLegs(field, this.bench[side], CALLS.freshLegs.offBelow, CALLS.freshLegs.onAtLeast, taken);
  }

  /**
   * Fresh legs at a play-the-ball (#367): the swap is made where he stands, as a
   * jog that runs out of time is, if he is free: not in the ruck (the man playing
   * the ball, the tackler, the markers, the dummy-half), not holding the ball, not
   * locked. A busy man waits for the next ruck, or the next stoppage (callSwaps).
   */
  protected landFreshLegs(): void {
    const ph = this.phase;
    if (ph.kind !== 'ruck' || ph.stage === 'down') return;
    for (const side of ['home', 'away'] as const) {
      const fl = this.freshLegs[side];
      if (!fl.pending) continue;
      const pick = this.freshLegsPick(side);
      if (!pick) {
        this.lapseFreshLegs(side);
        continue;
      }
      const p = this.at(side, pick.slot);
      const i = this.indexOf(p);
      const dh = p === this.dummyHalf(this.attacking) || (ph.handover && p === this.dummyHalf(other(this.attacking)));
      if (p === this.holder() || i === ph.carrier || i === ph.tackler || this.markers.includes(i) || dh || this.locked(p)) continue;
      fl.pending = false;
      this.swapIn(p, pick.bench, true);
    }
  }

  /** Fresh legs with nobody left to bring off (#367): the call lapses, unpaid, and the coach has it back for the half. */
  protected lapseFreshLegs(side: Side): void {
    const fl = this.freshLegs[side];
    fl.pending = false;
    fl.usedThisHalf = Math.max(0, fl.usedThisHalf - 1);
    this.announcePaid(this.judge.lapsed(side));
  }

  /** Calls each side has made, and how many paid off. */
  get callsMade(): Readonly<Record<Side, number>> {
    return this.judge.made;
  }
  get callsPaid(): Readonly<Record<Side, number>> {
    return this.judge.paid;
  }

  /** A call that paid off goes in the commentary (no player: the coach's). Every verdict is kept for the match screen. */
  protected announcePaid(vs: readonly CallVerdict[]): void {
    for (const v of vs) {
      this.verdicts.push(v);
      if (v.paid) this.events.push({ tick: this.tick, kind: 'call-paid', text: paidOffText(this.names[v.side], v.call), side: v.side, detail: v.call });
    }
  }

  /** A tackle ends a play call; a new set (the ball changes hands or the count goes back) ends them all. */
  protected expireCalls(): void {
    const newSet = this.attacking !== this.callAtk || this.tackles < this.callTackles;
    const tackled = this.tackles !== this.callTackles;
    this.countSet(newSet);
    this.announcePaid(this.judge.observe([...this.events], this.ballPos().x, !newSet && this.tackles > this.callTackles, newSet));
    if (newSet) {
      for (const st of [this.callState.home, this.callState.away]) {
        st.attack = st.defence = null;
        st.usedAttack = st.usedDefence = false;
        st.attackLeft = st.defenceLeft = 0;
      }
    } else if (tackled) {
      // A play call lasts its tackles (one; Offload two, #396), and so does Gang tackle on the other side.
      const st = this.callState[this.attacking];
      if (st.attack && callIsPlay(st.attack) && --st.attackLeft <= 0) st.attack = null;
      const def = this.callState[other(this.attacking)];
      if (def.defence && def.defenceLeft > 0 && --def.defenceLeft <= 0) def.defence = null;
    }
    this.callAtk = this.attacking;
    this.callTackles = this.tackles;
  }

  /** Completion (§7): a set is lost to its side's own error, an intercept or strip, or a penalty against it; any other end completes it. */
  private countSet(newSet: boolean): void {
    const atk = this.callAtk;
    if (atk === null) return;
    for (const e of this.events) {
      if (e.side === undefined) continue;
      const own = e.side === atk;
      if ((own && (e.kind === 'error' || e.kind === 'drop' || e.kind === 'loose' || e.kind === 'penalty')) || (!own && (e.kind === 'intercept' || e.kind === 'strip'))) this.setLost = true;
    }
    if (!newSet) return;
    this.sets[atk]++;
    if (!this.setLost) this.setsCompleted[atk]++;
    this.setLost = false;
  }

  /** The play call in force for the side with the ball, if any. */
  protected playCall(): CoachCall | null {
    const c = this.callState[this.attacking].attack;
    return c && callIsPlay(c) ? c : null;
  }

  /** A line break: in open play the carrier gets goal-side of every defender but the last man (the §7 count; a `break` to the contract). */
  protected watchLineBreak(h: Player | null): void {
    if (this.phase.kind !== 'play') {
      this.lineBrokenBy = null;
      return;
    }
    if (!h || h.side !== this.attacking || this.lineBrokenBy === h.side) return;
    const dir = this.dirOf(h.side);
    const unbeaten = this.side(other(h.side)).filter((d) => (h.body.pos.x - d.body.pos.x) * dir < LIVE.lineBreakM).length;
    if (unbeaten > 1) return;
    this.lineBrokenBy = h.side;
    this.emit('line-break', `${h.name} breaks the line!`, h);
  }
}
