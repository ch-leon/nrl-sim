// src/match/league/live/setPlays.ts — set plays in the live sim (#326, plan §3.2–3.3).
// The rules are pure (../plays.ts) and the catalogue is data (src/data/plays.ts);
// this layer is the sim's side: what a coach may call and when, the launch at a
// play-the-ball or a tap with its one roll, and the end of a set. The scripted
// pass and the kick are live/play.ts's (scriptedTurn), the decoy lines
// live/positioning.ts's, the bonus at contact live/contact.ts's.
//
// The coach's plays come from the sheet; a star's own play uses the same roll
// and script without having to be bought or selected by the coach.
import { SET_TACKLES } from '../../../config';
import { FIELD_WIDTH, MID_Y } from '../../core/field';
import type { Side } from '../../core/snapshot';
import { dist } from '../../core/vec';
import { PLAYS_BY_ID, type Play, type PlayFrom, type PlayId } from '../../../data/plays';
import { traitLevel } from '../../../data/traits';
import { PLAYS, POSTS_CHARGE, POSTS_CHARGE_PLAY, livePlay, pickAutoPlay, playBonus, playFit, playOdds, playOutcome, playTitle, playWhen, roleSlot, type Edge, type LivePlayId, type PlayFacts, type PlayFit } from '../plays';
import { PROP, ROLES } from '../roles';
import { other, type Player, type ScriptedPlay } from './types';
import { LiveCalls } from './calls';

export abstract class LiveSetPlays extends LiveCalls {
  private readonly signatureHalf: Record<Side, number> = { home: 0, away: 0 };

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
    this.pendingPlay[side] = null;
    const used = this.autoUsed[side];
    used.launched++;
    used.lastSet[id] = this.sets[side];
    this.beginScript(launcher, play, pending ? 'coach' : 'half', ySign, men);
    return true;
  }

  /** A live prop has to be in support and behind his dummy-half for the short ball. */
  protected postsChargeRunner(launcher: Player): Player | null {
    const side = launcher.side;
    if (PLAYS.on <= 0 || POSTS_CHARGE.on <= 0 || this.signatureHalf[side] === this.half || this.playUsed[side]
      || this.pendingPlay[side] || this.pendingControl[side] || this.callState[side].attack) return null;
    const prop = this.at(side, PROP);
    if (prop === launcher || traitLevel(prop.traits, 'wreckingBall') < POSTS_CHARGE.minTraitLevel
      || !this.onField(prop) || prop.subFor !== null || prop.hurt || this.locked(prop) || this.tick < prop.busyUntil) return null;
    if (Math.abs(this.mark.y - MID_Y) > POSTS_CHARGE.maxFromPostsM || Math.abs(prop.body.pos.y - MID_Y) > POSTS_CHARGE.maxFromPostsM
      || playWhen(POSTS_CHARGE_PLAY, this.playFacts(side, 'ptb', 0)) !== null
      || (prop.body.pos.x - launcher.body.pos.x) * this.dir > 0 || dist(prop.body.pos, launcher.body.pos) > PLAYS.reachM) return null;
    return prop;
  }

  protected launchSignature(launcher: Player): boolean {
    const prop = this.postsChargeRunner(launcher);
    if (!prop) return false;
    this.signatureHalf[prop.side] = this.half;
    this.beginScript(launcher, POSTS_CHARGE_PLAY, 'star', prop.body.pos.y < MID_Y ? 1 : -1, [prop]);
    return true;
  }

  private beginScript(launcher: Player, play: Play<LivePlayId>, by: ScriptedPlay['by'], ySign: 1 | -1, men: Player[]): void {
    const side = this.attacking;
    const edge: Edge = ySign < 0 ? 'left' : 'right';
    const nine = ROLES.map((_, slot) => {
      const p = this.at(side, slot);
      return { name: p.name, footyIQ: p.stats.footyIQ };
    });
    const fit = playFit(play, nine, edge);
    const odds = playOdds(play, fit.shortfall, this.tactics[side].attack, this.defencePreset(other(side)));
    const outcome = playOutcome(this.rng.next(), odds);
    const caller = men[0]!;
    this.playUsed[side] = true;
    this.playsRun.launched[side]++;
    if (by === 'star') this.emit('signature-play', `${caller.name} calls for the ball: ${play.name}!`, caller);
    else this.emit('set-play', by === 'half' ? `${caller.name} calls ${playTitle(play)}` : `${this.names[side]} run ${playTitle(play)}`, caller);
    this.events[this.events.length - 1]!.detail = play.id;
    if (by === 'coach' && play.id !== POSTS_CHARGE_PLAY.id) this.judge.make(side, 'set-play', side, this.dirOf(side), this.ballPos().x, play.id);
    this.scripted = {
      side,
      id: play.id,
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
    if (caller !== launcher) this.pass(launcher, caller, 0, by === 'star' ? undefined : 0);
    else {
      caller.catchTick = this.tick;
      caller.decided = false;
    }
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
    const title = playTitle(livePlay(s.id));
    this.emit(s.by === 'star' ? 'signature-breakdown' : 'play-breaks-down', s.by === 'star'
      ? `${h.name} tucks it up as ${title} breaks down`
      : `${h.name} can't find ${toward ? toward.name : 'his man'} — ${title} breaks down`, h);
    this.events[this.events.length - 1]!.detail = s.id;
    this.playsRun.brokeDown[s.side]++;
    this.tucked = this.indexOf(h);
  }

  /** The step bonus the play's last man carries (a short-side raid, the Rambo), until his first contact; 0 otherwise. */
  protected playStepBonus(h: Player): number {
    const s = this.scripted;
    return s && !s.bonusUsed && s.bonusFor === this.indexOf(h) ? s.bonus.stepAgainst ?? 0 : 0;
  }

  protected chargingPosts(h: Player): boolean {
    return this.scripted?.id === POSTS_CHARGE_PLAY.id && this.scripted.outcome === 'ok'
      && this.scripted.men[0] === this.indexOf(h);
  }

  /** The commentary credits the signature only for a real bust, fend or try. */
  protected rememberSignature(h: Player): void {
    const s = this.scripted;
    if (!s || !this.chargingPosts(h) || s.signatureCredited) return;
    s.signatureCredited = true;
    this.emit('signature-success', `${h.name}'s ${POSTS_CHARGE_PLAY.name} comes off!`, h);
    this.events[this.events.length - 1]!.detail = s.id;
  }

  /** A play is over at the next tackle, stoppage, turnover or kick, or when it has run its time; a tucked caller's tackle is made. */
  protected tidyPlays(): void {
    const s = this.scripted;
    if (s) {
      const wrestle = s.by === 'star' && s.outcome === 'ok' && this.phase.kind === 'tackle'
        && this.phase.wrestle !== null && this.phase.carrier === s.men[0];
      const signaturePassEnded = s.by === 'star' && (this.ball.kind === 'flight' && this.ball.receiver !== s.men[0]
        || this.ball.kind === 'held' && this.ball.by !== s.men[0]);
      if ((!wrestle && this.phase.kind !== 'play') || this.attacking !== s.side || this.ball.kind === 'loose'
        || (this.ball.kind === 'flight' && this.ball.via === 'kick') || signaturePassEnded || this.tick > s.until) this.scripted = null;
    }
    if (this.tucked >= 0 && this.phase.kind !== 'play') this.tucked = -1;
  }
}
