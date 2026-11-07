// src/match/league/live/setPlays.ts — set plays in the live sim (#326, plan §3.2–3.3).
// The rules are pure (../plays.ts) and the catalogue is data (src/data/plays.ts);
// this layer is the sim's side: what a coach may call and when, the launch at a
// play-the-ball or a tap with its one roll, and the end of a set. The scripted
// pass and the kick are live/play.ts's (scriptedTurn), the decoy lines
// live/positioning.ts's, the bonus at contact live/contact.ts's.
//
// Nothing here runs for a side with no plays on its sheet: no branch is taken
// and no roll drawn, so a match without plays plays exactly as before.
import { SET_TACKLES } from '../../../config';
import { FIELD_WIDTH, MID_Y } from '../../core/field';
import type { Side } from '../../core/snapshot';
import { PLAYS_BY_ID, type PlayFrom, type PlayId } from '../../../data/plays';
import { PLAYS, pickAutoPlay, playBonus, playFit, playOdds, playOutcome, playTitle, playWhen, roleSlot, type Edge, type PlayFacts, type PlayFit } from '../plays';
import { ROLES } from '../roles';
import { other, type Player, type ScriptedPlay } from './types';
import { LiveCalls } from './calls';

export abstract class LiveSetPlays extends LiveCalls {
  /** A side's plays as the sim runs them (its sheet's, none when `plays.on` is 0). */
  playsOf(side: Side): readonly PlayId[] {
    return this.sheetPlays[side];
  }

  /** The play `side`'s coach has called and the sim is waiting to run (at the next play-the-ball or tap), or null (the tray's "next play", #326). */
  pendingPlayOf(side: Side): PlayId | null {
    return this.pendingPlay[side];
  }

  /**
   * `side`'s men against `play`'s IQ needs (the tray's caption, #326): the nine on
   * the field now, by slot, with their footy IQ after the spread. The edge the play
   * would leave further short. A read: no roll, nothing changed.
   */
  playFitOf(side: Side, play: PlayId): PlayFit {
    const nine = ROLES.map((_, slot) => {
      const p = this.at(side, slot);
      return { name: p.name, footyIQ: p.stats.footyIQ };
    });
    return playFit(PLAYS_BY_ID[play], nine);
  }

  /** Where the ball is, for a play from `from`: `ahead` 1 while the ball is still being carried (the play lands at the next play-the-ball). */
  protected playFacts(side: Side, from: PlayFrom, ahead: 0 | 1): PlayFacts {
    const b = this.ballPos();
    const done = Math.min(SET_TACKLES - 1, this.tackles + ahead);
    return { from, tackle: done + 1, toLine: this.toLineFor(side, b), touchM: Math.min(b.y, FIELD_WIDTH - b.y), last: from === 'ptb' && done === SET_TACKLES - 1, kickAway: this.pendingKick !== null };
  }

  /** A new half: the half's count of his own calls starts again. */
  private refreshAutoHalf(side: Side): void {
    const used = this.autoUsed[side];
    if (used.half === this.half) return;
    used.half = this.half;
    used.launched = 0;
  }

  /** Why `side` can't call `play` now (plan §3.2), or null when it can. */
  protected setPlayRefusal(side: Side, play: PlayId | undefined): string | null {
    const ph = this.phase;
    if (this.finished || (ph.kind !== 'play' && ph.kind !== 'tackle' && ph.kind !== 'ruck' && ph.kind !== 'set-piece')) return 'at the breaks';
    if (this.attacking !== side) return 'not your ball';
    if (!play || !this.sheetPlays[side].includes(play)) return 'not in your three';
    if (this.playUsed[side]) return 'one play a set';
    const from: PlayFrom = ph.kind === 'set-piece' && ph.how === 'tap' ? 'tap' : 'ptb';
    return playWhen(PLAYS_BY_ID[play], this.playFacts(side, from, ph.kind === 'play' || ph.kind === 'tackle' ? 1 : 0));
  }

  /** The coach calls a play: it waits for the next play-the-ball or tap, and it is the set's play (neither of the set's calls). */
  protected callSetPlay(side: Side, play: PlayId): void {
    this.pendingPlay[side] = play;
    this.playUsed[side] = true;
    const h = this.holder();
    this.emit('coach-call', `${this.names[side]} coach calls ${playTitle(PLAYS_BY_ID[play])}`, h && h.side === side ? h : this.kicker(side));
    this.events[this.events.length - 1]!.detail = `set-play:${play}`;
  }

  /**
   * The AI coach's play (Hard, plan §3.2): at a play-the-ball, the first of his
   * three the half's own rule would pick (zone, tackle, side, cooldown, the
   * cap a half). Rules only. True when he called one.
   */
  protected aiCallPlay(side: Side): boolean {
    const list = this.sheetPlays[side];
    if (list.length === 0 || this.attacking !== side || this.playUsed[side] || this.phase.kind !== 'ruck') return false;
    this.refreshAutoHalf(side);
    const id = pickAutoPlay(list, this.playFacts(side, 'ptb', 0), this.autoUsed[side], this.sets[side]);
    if (!id || this.setPlayRefusal(side, id) !== null) return false;
    this.call(side, 'set-play', id);
    return true;
  }

  /** A new set: a coach's play that never found its moment lapses (made, not paid), and each side has its play again. */
  protected expirePlays(newSet: boolean): void {
    if (!newSet) return;
    for (const side of ['home', 'away'] as const) {
      const p = this.pendingPlay[side];
      if (p) {
        this.pendingPlay[side] = null;
        this.announcePaid(this.judge.playLapsed(side, p));
      }
      this.playUsed[side] = false;
    }
  }

  /**
   * The launch (plan §3.3): at the dummy-half (`from` 'ptb', `launcher` the
   * dummy-half with the ball) or a tap (`launcher` the man tapping). The
   * coach's waiting call if it can be run from here, else, if the side has not
   * had its play this set, the half's own pick. The play's men are found for
   * the edge it runs to, the odds set by their IQ, the side's style and the
   * defence, and the one roll made; what it decided is played out at the
   * caller's pass (scriptedTurn). The launcher's pass to the caller goes
   * unread. False, with no roll, when no play goes.
   */
  protected launchPlay(from: PlayFrom, launcher: Player): boolean {
    const side = this.attacking;
    const list = this.sheetPlays[side];
    if (list.length === 0) return false;
    const facts = this.playFacts(side, from, 0);
    this.refreshAutoHalf(side);
    const pending = this.pendingPlay[side];
    let id: PlayId | null = null;
    if (pending) id = playWhen(PLAYS_BY_ID[pending], facts) === null ? pending : null;
    else if (!this.playUsed[side]) id = pickAutoPlay(list, facts, this.autoUsed[side], this.sets[side]);
    if (!id) return false;
    const play = PLAYS_BY_ID[id];
    const b = this.ballPos();
    // Which edge: the short (near) side, the open side, or the overlap.
    const near: 1 | -1 = b.y < MID_Y ? -1 : 1;
    let ySign: 1 | -1 = play.when.side === 'short' || play.when.side === 'near' ? near : (-near as 1 | -1);
    if (play.when.side === 'overlap') {
      const o = this.overlapSide(launcher);
      if (o !== 0) ySign = o;
    }
    const edge: Edge = ySign < 0 ? 'left' : 'right';
    const men = play.script.map((s) => this.at(side, roleSlot(s.to, edge)));
    // A man of the play off the field (the bin) or still down: not this time.
    if (men.some((p) => !this.onField(p) || (p !== launcher && this.locked(p)))) return false;
    const nine = ROLES.map((_, slot) => {
      const p = this.at(side, slot);
      return { name: p.name, footyIQ: p.stats.footyIQ };
    });
    const fit = playFit(play, nine, edge);
    const odds = playOdds(play, fit.shortfall, this.tactics[side].attack, this.defencePreset(other(side)));
    const outcome = playOutcome(this.rng.next(), odds);
    const caller = men[0]!;
    const by = pending ? 'coach' : 'half';
    this.pendingPlay[side] = null;
    this.playUsed[side] = true;
    const used = this.autoUsed[side];
    used.launched++;
    used.lastSet[id] = this.sets[side];
    this.playsRun.launched[side]++;
    this.emit('set-play', by === 'half' ? `${caller.name} calls ${playTitle(play)}` : `${this.names[side]} run ${playTitle(play)}`, caller);
    this.events[this.events.length - 1]!.detail = id;
    if (by === 'coach') this.judge.make(side, 'set-play', side, this.dirOf(side), b.x, id);
    this.scripted = {
      side,
      id,
      by,
      edge,
      ySign,
      men: men.map((p) => this.indexOf(p)),
      step: 1,
      decoys: play.decoys.map((d) => ({ idx: this.indexOf(this.at(side, roleSlot(d.to, edge))), latM: d.latM })),
      outcome,
      bonus: playBonus(play, this.tactics[side].attack, this.planFit[side].attack),
      bonusFor: -1,
      bonusUsed: false,
      until: this.tick + PLAYS.scriptTicks,
    };
    if (caller !== launcher) this.pass(launcher, caller, 0, 0);
    else {
      caller.catchTick = this.tick;
      caller.decided = false;
    }
    return true;
  }

  /** Who the caller's pass is for: the next man in the script, else (a carry play) the first decoy. */
  protected playTarget(s: ScriptedPlay): Player | null {
    const idx = s.step < s.men.length ? s.men[s.step] : s.decoys[0]?.idx;
    return idx !== undefined ? this.players[idx]! : null;
  }

  /** The play breaks down on `h`, its caller (plan §3.3): said, counted, and he tucks it and takes the tackle — the wasted tackle. */
  protected breakDown(h: Player): void {
    const s = this.scripted!;
    const toward = this.playTarget(s);
    this.scripted = null;
    this.emit('play-breaks-down', `${h.name} can't find ${toward ? toward.name : 'his man'} — ${playTitle(PLAYS_BY_ID[s.id])} breaks down`, h);
    this.events[this.events.length - 1]!.detail = s.id;
    this.playsRun.brokeDown[s.side]++;
    this.tucked = this.indexOf(h);
  }

  /** The step bonus the play's last man carries (a short-side raid, the Rambo), until his first contact; 0 otherwise. */
  protected playStepBonus(h: Player): number {
    const s = this.scripted;
    return s && !s.bonusUsed && s.bonusFor === this.indexOf(h) ? s.bonus.stepAgainst ?? 0 : 0;
  }

  /** A play is over at the next tackle, stoppage, turnover or kick, or when it has run its time; a tucked caller's tackle is made. */
  protected tidyPlays(): void {
    const s = this.scripted;
    if (s && (this.phase.kind !== 'play' || this.attacking !== s.side || this.ball.kind === 'loose' || (this.ball.kind === 'flight' && this.ball.via === 'kick') || this.tick > s.until)) this.scripted = null;
    if (this.tucked >= 0 && this.phase.kind !== 'play') this.tucked = -1;
  }
}
