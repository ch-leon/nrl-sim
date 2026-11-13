import { controlAim, controlKickBand, controlReceiver } from '../controls';
import { SET_TACKLES } from '../../../config';
import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y, inGoal } from '../../core/field';
import { speedOf } from '../../core/body';
import { add, dist, dot, norm, sub, type Vec } from '../../core/vec';
import { angleFrom, stepChance, type Situation } from '../contest';
import { PLAYERS, ROLES } from '../roles';
import { MAX_LAT_M, RUN_CLOSE_M, RUN_IT_CHANCE, RUN_IT_ZONE_M, bombTarget, chipTarget, chooseKick, crossFieldTarget, grubberTarget, kickTarget, pickReceiver, type KickChoice } from '../tactics';
import { zoneOf, type AttackPlan } from '../presets';
import { FINISHER_M, TRAIT_PTS, announce, bootMult, stepTraits } from '../traits';
import { traitBoost } from '../../../data/traits';
import { tiredness } from '../fatigue';
import { WRESTLE, ruckTicks } from '../wrestle';
import { GOALS } from '../goals';
import { PENALTY } from '../penalties';
import { CALLS } from '../calls';
import { bombPeak } from '../kickContest';
import { FORTY_TWENTY_ENABLED, TOUCH, inOwnInGoal } from '../touch';
import { BIN } from '../sinbin';
import { PLAYS } from '../plays';
import { PLAYS_BY_ID } from '../../../data/plays';
import { LIVE } from './knobs';
import { other, type Player, type Phase, type PendingKick } from './types';
import { LiveKicks } from './kicks';

export abstract class LivePlay extends LiveKicks {
  protected stepPlay(): void {
    const h = this.holder();
    if (!h || this.locked(h)) return;
    if (h.side !== this.attacking) {
      // Defender has it (an intercept / pickup path) — it's his side's ball now.
      this.turnover();
      return;
    }
    // Try: over the line with the ball. With nobody near him he goes round
    // under the posts for the five-point bonus try first (Nines).
    if (inGoal(h.body.pos, this.dir) || (this.dir > 0 ? h.body.pos.x >= FIELD_LENGTH : h.body.pos.x <= 0)) {
      if (!this.goForBonus(h)) {
        this.score(h);
        return;
      }
      if (this.overLineAt < 0) this.overLineAt = this.tick;
      return;
    }
    this.overLineAt = -1;
    const defenders = this.side(other(this.attacking));
    const committed = this.committed(h, defenders);
    const nearest = committed[0];
    const nearD = nearest ? dist(nearest.body.pos, h.body.pos) : Infinity;

    const intent = this.pendingControl[this.attacking];
    if (intent) {
      if (intent.kind === 'kick') {
        this.pendingControl[this.attacking] = null;
        if (this.tackles === SET_TACKLES - 1) {
          const length = intent.aim ? dist(h.body.pos, intent.aim) : 0;
          const kind = controlKickBand(length, LIVE.controlsChipFromM, LIVE.controlsBombFromM, this.toLine(h));
          this.pendingKick = this.planKick(h, kind, intent.aim);
          this.lock(h, 'kick', LIVE.kickLockTicks);
          return;
        }
      } else if ((intent.kind === 'pass-left' || intent.kind === 'pass-right') && this.tick - h.catchTick >= LIVE.passCooldown) {
        this.pendingControl[this.attacking] = null;
        const receiver = controlReceiver(h.body.pos, this.dir, this.candidates(h, this.atkPlan(h)), intent.kind);
        if (receiver !== null) { this.pass(h, this.players[receiver]!); return; }
      }
    }

    // A manual step waits through catches, the ruck and locks, then attempts
    // the move before the AI can pass or kick it away. The normal success roll
    // still decides whether a nearby defender is beaten.
    if (intent?.kind === 'step-up' || intent?.kind === 'step-down') {
      this.pendingControl[this.attacking] = null;
      const target = nearest;
      const way = intent.kind === 'step-up' ? -1 : 1;
      h.jink = { dy: way * LIVE.stepJinkM, ticks: LIVE.stepJinkTicks };
      if (target && nearD <= LIVE.stepRange) {
        h.steppedOn = this.indexOf(target);
        const st = stepTraits(h.traits, target.traits, this.toLine(h) <= FINISHER_M);
        const sit = this.situation(h, target, committed);
        if (this.rng.next() < stepChance(h.stats, target.stats, sit, st.bonus + this.defPlan().stepAgainst + (defenders.length < PLAYERS ? BIN.shortStep : 0))) {
          this.sidestep(h, target, announce(st.credit), way);
        }
      }
      return;
    }

    // A set play's man (#326): his scripted pass, kick or carry, or the play breaking down.
    // 'carry': he runs with it (no field goal, kick or pass of his own); 'done': this tick is his play.
    const script = this.scripted ? this.scriptedTurn(h, nearD) : 'fall';
    if (script === 'done') return;
    // A caller whose play broke down has tucked it: no kick or pass of his own either, till he is tackled.
    const own = script === 'fall' && this.tucked !== this.indexOf(h);

    // Last tackle: the kicker makes one call for the play — run it when he's
    // on the line (or fancies it inside 40), else a kick for the zone — then
    // runs a few steps and puts boot to ball.
    const toLine = this.toLine(h);
    const plan = this.atkPlan(h);
    const dplan = this.defPlan();
    const zone = zoneOf(toLine);
    // A field goal late on with the scores close: the kicker's call, once a set.
    // The coach's kick call for the set (#73) comes before the kicker's own.
    const called = this.callState[this.attacking].attack;
    // Kicks in play are the slot-5 kicker's; a field goal is his or the named goal-kicker's (N11), whoever has the ball.
    const isKicker = h === this.kicker(h.side);
    if (own && (isKicker || h === this.goalKicker(h.side)) && this.fieldGoalOn(h)) {
      if (this.fgCall === null) this.fgCall = called === 'field-goal' || this.rng.next() < GOALS.fieldGoalChance;
      if (this.fgCall && (this.tick - h.catchTick >= LIVE.kickRunTicks || nearD < LIVE.engageM)) {
        this.lock(h, 'kick', LIVE.kickLockTicks);
        this.pendingGoal = { at: this.tick + LIVE.kickContactTicks, kicker: this.indexOf(h) };
        return;
      }
    }
    // Grubber and 40/20 (#396) are for the last tackle: the kicker keeps it till then.
    const forLast = called === 'grubber' || called === 'forty-twenty';
    const early = this.tackles === SET_TACKLES - 2 && !forLast && (toLine <= LIVE.earlyKickM || zone === 'own20' || zone === 'ownHalf');
    const kickEarly = called === 'kick-early' && !this.lastPlay;
    if (own && (this.lastPlay || early || kickEarly) && isKicker) {
      // Grubber or 40/20 (#396) sets the last-tackle kick even when it comes after his own choice, till the kick is struck.
      if (this.lastPlay && forLast) this.kickCall = called === 'grubber' ? 'grubber' : 'long';
      else if (this.kickCall === null) {
        if (kickEarly) this.kickCall = toLine <= LIVE.earlyKickM ? (this.rng.next() < 0.6 ? 'grubber' : 'chip') : 'long';
        else if (this.lastPlay && called === 'run-it') this.kickCall = 'run';
        else if (this.lastPlay && called === 'bomb') this.kickCall = 'bomb';
        else this.kickCall = this.lastPlay ? this.callLastPlay(toLine, plan) : this.callEarlyKick(toLine, plan);
      }
      if (this.kickCall !== 'run' && (this.tick - h.catchTick >= LIVE.kickRunTicks || nearD < LIVE.engageM)) {
        this.pendingKick = this.planKick(h, this.kickCall);
        this.lock(h, 'kick', LIVE.kickLockTicks);
        return;
      }
    }

    // Engaged: decide once — shift it to a better option out the back, or
    // take the line on. Re-deciding every tick would pass out of every contact.
    // A Playmaker passes more and can find a man beyond the normal width.
    if (own && nearD < LIVE.engageM && !h.decided && this.tick - h.catchTick >= LIVE.passCooldown) {
      h.decided = true;
      const maker = traitBoost(h.traits, 'playmaker');
      const reach = MAX_LAT_M + (maker > 0 ? LIVE.cutOutPerLevelM * maker : 0) + (plan.width > 0 ? 3 : 0);
      const cands = this.candidates(h, plan);
      let receiver = pickReceiver(h.body.pos, this.dir, cands, reach, Math.min(0.6, LIVE.playmakerWidth * maker + plan.width));
      // A Playmaker (or an expansive side) sees the overlap: now and then he skips the near man and throws to the widest one he can reach.
      const cutOut = LIVE.cutOutChance * maker + plan.cutOut;
      if (cutOut > 0 && this.rng.next() < cutOut) {
        const widest = cands
          .filter((c) => !c.busy && (h.body.pos.x - c.pos.x) * this.dir >= 0.3 && (h.body.pos.x - c.pos.x) * this.dir <= 8 && Math.abs(c.pos.y - h.body.pos.y) <= reach)
          .sort((a, b) => Math.abs(b.pos.y - h.body.pos.y) - Math.abs(a.pos.y - h.body.pos.y))[0];
        if (widest && Math.abs(widest.pos.y - h.body.pos.y) > MAX_LAT_M) receiver = widest.idx;
      }
      if (receiver !== null && this.rng.next() < LIVE.passBase + h.stats.handling / 300 + TRAIT_PTS.playmakerPass * maker + plan.pass) {
        const to = this.players[receiver]!;
        if (Math.abs(to.body.pos.y - h.body.pos.y) > MAX_LAT_M) {
          this.emit('cut-out', `${h.name} throws the cut-out ball to ${to.name}`, h, announce(h.traits.find((t) => t.id === 'playmaker')));
          // Who he found, so the view can draw the line through the man he skipped (N15.4). Not read by the sim.
          this.events[this.events.length - 1]!.toSlot = to.slot;
        }
        this.pass(h, to);
        return;
      }
    }

    if (this.tick < h.immuneUntil) return;

    // One-on-one and the defender is almost on him: try to step (once per
    // defender) — unless the game plan says tuck it and carry in.
    if (nearest && nearD <= LIVE.stepRange && this.steppedOn(h) !== this.indexOf(nearest)) {
      const sit = this.situation(h, nearest, committed);
      if (sit.defenders === 1) {
        h.steppedOn = this.indexOf(nearest);
        const st = stepTraits(h.traits, nearest.traits, toLine <= FINISHER_M);
        const tries = plan.step >= 1 || this.rng.next() < plan.step;
        if (tries && this.rng.next() < stepChance(h.stats, nearest.stats, sit, st.bonus + dplan.stepAgainst + (defenders.length < PLAYERS ? BIN.shortStep : 0) + this.playStepBonus(h))) {
          this.sidestep(h, nearest, announce(st.credit));
          return;
        }
      }
    }

    // Contact: a committed defender has reached him.
    for (const d of committed) {
      if (dist(d.body.pos, h.body.pos) <= LIVE.tackleReach) {
        this.contest(h, d, committed);
        return;
      }
    }
  }

  private steppedOn(h: Player): number {
    return h.steppedOn;
  }

  /**
   * A set play's carrier (#326, plan §3.3). Only the man whose turn it is in
   * the script: the caller, then each man after him. The launch's one roll
   * is played out at the caller's moment (engaged, once, as any carrier
   * decides): a breakdown and he tucks it (the wasted tackle); an intercept
   * and the pass flies to the lane defender (none there: a breakdown). When
   * it comes off, the pass goes to the next man with no roll of the passer's
   * own (unread, or read at `plays.cutOutRead` for a cut-out), a kick play's
   * kick is struck, and the last man takes the line on with the play's bonus.
   * A next man out of reach, down or off: the play is off and he decides as
   * usual ('fall').
   */
  private scriptedTurn(h: Player, nearD: number): 'fall' | 'carry' | 'done' {
    const s = this.scripted!;
    const i = this.indexOf(h);
    const at = s.side === h.side ? s.men.indexOf(i) : -1;
    if (at < 0 || at !== s.step - 1) return 'fall';
    const play = PLAYS_BY_ID[s.id];
    const last = s.step >= s.men.length;
    if (s.outcome === 'ok' && last) {
      if (play.kick) {
        if (this.tick - h.catchTick < LIVE.kickRunTicks && nearD >= LIVE.engageM) return 'carry';
        this.kickCall = play.kick;
        const kick = this.planKick(h, play.kick);
        this.pendingKick = kick;
        this.lock(h, 'kick', LIVE.kickLockTicks);
        const chaser = this.indexOf(this.at(s.side, s.edge === 'left' ? 1 : 2));
        this.playKick = { side: s.side, edge: play.kick === 'chip' ? PLAYS.chipRegather : PLAYS.kickPassChase, chasers: play.kick === 'chip' ? [i, chaser] : kick.receiver !== null ? [kick.receiver] : [] };
        s.step++;
        return 'done';
      }
      if (s.bonusFor !== i) {
        s.bonusFor = i;
        h.decided = true;
        this.burst(h);
      }
      return 'carry';
    }
    if (!(nearD < LIVE.engageM && !h.decided && this.tick - h.catchTick >= LIVE.passCooldown)) return 'carry';
    h.decided = true;
    if (s.outcome !== 'ok') {
      const toward = this.playTarget(s);
      if (s.outcome === 'intercept' && toward && this.interceptThrow(h, toward)) {
        this.scripted = null;
        this.playsRun.intercepted[s.side]++;
        return 'done';
      }
      this.breakDown(h);
      return 'carry';
    }
    const next = this.players[s.men[s.step]!]!;
    if (!this.onField(next) || this.locked(next) || dist(next.body.pos, h.body.pos) > (play.reachM ?? PLAYS.reachM)) {
      this.scripted = null;
      h.decided = false;
      return 'fall';
    }
    if (Math.abs(next.body.pos.y - h.body.pos.y) > MAX_LAT_M) {
      this.emit('cut-out', `${h.name} throws the cut-out ball to ${next.name}`, h);
      this.events[this.events.length - 1]!.toSlot = next.slot;
    }
    this.pass(h, next, 0, play.cutOut ? PLAYS.cutOutRead : 0);
    s.step++;
    return 'done';
  }

  /**
   * With a tackle to spare: in the red zone the kicker sometimes goes early
   * (a grubber or a chip for the chasers); from deep a grinding or kick-chase
   * side sometimes kicks early for territory.
   */
  private callEarlyKick(toLine: number, plan: AttackPlan): 'run' | KickChoice {
    if (toLine <= LIVE.earlyKickM) {
      if (this.rng.next() >= plan.earlyKick) return 'run';
      return this.rng.next() < 0.6 ? 'grubber' : 'chip';
    }
    if (plan.earlyTerritory <= 0 || this.rng.next() >= plan.earlyTerritory) return 'run';
    return (plan.kickBias.bomb ?? 1) > 1 && this.rng.next() < 0.4 ? 'bomb' : 'long';
  }

  /** The kicker's call on the last: run it close in or one time in five inside 40, else the kick for the zone in the side's style. */
  private callLastPlay(toLine: number, plan: AttackPlan): 'run' | KickChoice {
    if (toLine <= RUN_CLOSE_M) return 'run';
    if (toLine <= RUN_IT_ZONE_M && this.rng.next() < RUN_IT_CHANCE) return 'run';
    return chooseKick(toLine, this.rng.next(), plan.kickBias);
  }

  /** Where the kick goes and who it is for, by type (BAK-208 §4.4). */
  private planKick(h: Player, kind: KickChoice, aim?: Vec): PendingKick {
    const def = other(this.attacking);
    const fb = this.fullback(def);
    const boot0 = bootMult(h.traits);
    // Wind carries a territory kick further and less predictably (2f).
    const boot = kind === 'long' && this.wx.kickDistance !== 1 ? { dist: boot0.dist * this.wx.kickDistance * (1 + (this.rng.next() - 0.5) * 2 * this.wx.jitter), acc: boot0.acc } : boot0;
    const base = { at: this.tick + LIVE.kickContactTicks, kicker: this.indexOf(h), kickoff: false, kind };
    const trait = boot0.dist > 1 ? { trait: announce(h.traits.find((t) => t.id === 'bigBoot')) ?? 'Big Boot' } : {};
    switch (kind) {
      case 'grubber': {
        // Aimed for the chase: a winger's lane, pulled back toward the kicker so a
        // miss sits under the fullback. Some still run on and go dead (2d).
        const wingers = this.side(this.attacking).filter((p) => ROLES[p.slot]!.name === 'winger' && this.onField(p));
        const wing = wingers[Math.floor(this.rng.next() * wingers.length)] ?? h;
        const lane = wing.body.pos.y * (1 - TOUCH.grubberInfield) + h.body.pos.y * TOUCH.grubberInfield;
        const t = grubberTarget(h.body.pos, this.dir, this.rng.next(), lane, TOUCH.grubberMissM);
        const to = { x: t.x + this.dir * this.rng.next() * TOUCH.grubberLongM, y: t.y };
        if (aim) {
          const low = grubberTarget(h.body.pos, this.dir, 0, lane, TOUCH.grubberMissM);
          const high = grubberTarget(h.body.pos, this.dir, 1, lane, TOUCH.grubberMissM);
          high.x += this.dir * TOUCH.grubberLongM;
          return { ...base, to: controlAim(to, aim, low, high), receiver: null, peak: 0.9 };
        }
        return { ...base, to, receiver: null, peak: 0.9 };
      }
      case 'chip':
        return { ...base, to: controlAim(chipTarget(h.body.pos, this.dir, this.rng.next()), aim, chipTarget(h.body.pos, this.dir, 0), chipTarget(h.body.pos, this.dir, 1)), receiver: this.indexOf(h), peak: 5 };
      case 'cross-field': {
        // The winger on the far side of the field from the ball has the space.
        const wingers = this.side(this.attacking).filter((p) => ROLES[p.slot]!.name === 'winger');
        const far = wingers.sort((a, b) => Math.abs(b.body.pos.y - h.body.pos.y) - Math.abs(a.body.pos.y - h.body.pos.y))[0] ?? h;
        return { ...base, to: crossFieldTarget(h.body.pos, this.dir, far.body.pos, this.rng.next()), receiver: this.indexOf(far), peak: 13 };
      }
      case 'bomb':
        // Big Boot puts it higher (#99): more hang, and the chase is under it.
        return { ...base, to: controlAim(bombTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next()), aim, bombTarget(h.body.pos, this.dir, fb.body.pos, 0), bombTarget(h.body.pos, this.dir, fb.body.pos, 1)), receiver: this.indexOf(fb), peak: bombPeak(traitBoost(h.traits, 'bigBoot')), ...trait };
      default: {
        // Labs: match controls (Leon, 30 Oct). Territory aims keep the normal
        // wind / boot target and its scatter; only the intent chooses the kick.
        if (aim) {
          const to = kickTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next(), boot);
          return { ...base, to: controlAim(to, aim, kickTarget(h.body.pos, this.dir, fb.body.pos, 0, boot), kickTarget(h.body.pos, this.dir, fb.body.pos, 1, boot)), receiver: this.indexOf(fb), peak: 12, ...trait };
        }
        // Territory (2d): from his own 40 on the last he may go for the 40/20; from deep, often for touch; else to the fullback.
        const toLine = this.toLine(h);
        const lever = traitBoost(h.traits, 'bigBoot') + traitBoost(h.traits, 'playmaker');
        // The coach's 40/20 call (#396) goes for it without the roll, as far as calls.fortyTwenty.reachM goes. It is only
        // offered in reach (fortyTwentyReach); if the last carry took him out of it, it falls short and is said as the
        // kick for touch it is (in reach: the shortest roll on, touchRollM, gets it inside their 20).
        if (this.lastPlay && this.callState[this.attacking].attack === 'forty-twenty') {
          const land = Math.max(TOUCH.fortyTwentyLandM, toLine - CALLS.fortyTwenty.reachM * boot.dist);
          const aim = land - TOUCH.touchRollM <= 20 ? '40-20' : 'touch';
          return { ...base, to: this.touchTarget(h, land, TOUCH.fortyTwentyInsideM, boot.acc * CALLS.fortyTwenty.scatter), receiver: this.indexOf(fb), peak: 11, aim, ...trait };
        }
        if (FORTY_TWENTY_ENABLED && this.lastPlay && toLine >= FIELD_LENGTH - 40 && this.rng.next() < TOUCH.fortyTwenty + TOUCH.fortyTwentyTrait * lever) {
          return { ...base, to: this.touchTarget(h, TOUCH.fortyTwentyLandM, TOUCH.fortyTwentyInsideM, boot.acc * 0.6), receiver: this.indexOf(fb), peak: 11, aim: '40-20', ...trait };
        }
        if (this.rng.next() < TOUCH.findTouch[zoneOf(toLine)]) {
          const land = Math.max(toLine - 32 * boot.dist, 12);
          return { ...base, to: this.touchTarget(h, land, TOUCH.touchInsideM, boot.acc), receiver: this.indexOf(fb), peak: 11, aim: 'touch', ...trait };
        }
        return { ...base, to: kickTarget(h.body.pos, this.dir, fb.body.pos, this.rng.next(), boot), receiver: this.indexOf(fb), peak: 12, ...trait };
      }
    }
  }

  /** A kick for touch: landing `toLine` metres from the line he attacks, `inside` metres in from the nearer touchline, scattered (× accuracy) — sometimes out on the full. */
  private touchTarget(h: Player, toLine: number, inside: number, acc: number): Vec {
    const goal = this.dir > 0 ? FIELD_LENGTH : 0;
    const x = goal - this.dir * toLine;
    const near = h.body.pos.y < MID_Y ? -1 : 1;
    const off = inside + (this.rng.next() - 0.5) * 2 * TOUCH.touchScatterM * acc;
    return { x, y: near < 0 ? off : FIELD_WIDTH - off };
  }

  /** The geometry of a contact: numbers, angle, momentum, tackle count, support. */
  protected situation(c: Player, t: Player, committed: readonly Player[]): Situation {
    const others = committed.filter((d) => d !== t && dist(d.body.pos, c.body.pos) < LIVE.secondManM).length;
    const defenders = others >= 2 ? 3 : others === 1 ? 2 : 1;
    const approach = norm(sub(c.body.pos, t.body.pos)); // the way the tackler is closing
    const angle = angleFrom(-dot(approach, c.body.heading)); // square when he comes at the carrier's face
    const support = this.atkPlan(c).offload > 0 && this.side(c.side).some((p) => p !== c && p !== this.dummyHalf(c.side) && !this.locked(p) && dist(p.body.pos, c.body.pos) < LIVE.offloadM);
    return {
      defenders,
      angle,
      speedDiff: speedOf(c.body) - speedOf(t.body),
      lastTackle: this.lastPlay,
      carrierFatigue: tiredness(c.energy),
      tacklerFatigue: tiredness(t.energy),
      support,
    };
  }

  /** A clean step: the defender grasps air, the carrier jinks past with a burst. */
  private sidestep(c: Player, t: Player, trait?: string, way?: number): void {
    this.emit('step', `${c.name} steps ${t.name}!`, c, trait);
    const sideways = way ?? (c.body.pos.y >= t.body.pos.y ? 1 : -1);
    c.jink = { dy: sideways * LIVE.stepJinkM, ticks: LIVE.stepJinkTicks };
    this.lock(t, 'tackled', 12, add(t.body.pos, { x: this.dir * 0.8, y: -sideways * 0.6 }));
    t.cooldownUntil = this.tick + LIVE.beatenCooldown;
    this.burst(c);
  }

  protected stepTackle(ph: Extract<Phase, { kind: 'tackle' }>): void {
    const w = ph.wrestle;
    if (w) {
      if (!this.stepWrestle(ph, w)) return;
    } else if (this.tick < ph.t0 + LIVE.contactTicks) return;
    const c = this.players[ph.carrier]!;
    if (inOwnInGoal(c.body.pos, this.dirOf(c.side))) {
      // Held up in his own in-goal: a goal-line drop-out (2d).
      this.emit('dead-ball', `${c.name} is held in his own in-goal — goal-line drop-out`, c);
      this.events[this.events.length - 1]!.detail = 'held';
      this.lock(c, 'down', LIVE.downTicks);
      if (this.siren) this.endHalf();
      else this.startDropOut(c.side);
      return;
    }
    this.tackles++;
    this.kickCall = this.fgCall = null;
    // Ruck offences (2e): a tackler holding down after a slow wrestle, or the defence slow off the ruck — six again.
    const slowWrestle = w ? (this.tick - w.t0) * TICK_S >= WRESTLE.slowS : false;
    if (this.rng.next() < PENALTY.ruckSixAgain + (slowWrestle ? PENALTY.holdDown : 0)) {
      this.tackles = 0;
      const t = this.players[ph.tackler]!;
      this.emit('six-again', slowWrestle ? `Six again — ${t.name} holds on too long` : `Six again — ${this.names[t.side]} slow off the ruck`, t);
    }
    const handover = this.tackles >= SET_TACKLES;
    this.mark = { ...c.body.pos };
    this.lineX = this.mark.x + this.dir * LIVE.onsideM;
    // How long he fought sets the ruck: a quick wrestle is a quick play-the-ball, a long one lets the defence set.
    const secs = w ? (this.tick - w.t0) * TICK_S : 0;
    // Gang tackle (#396): the extra men lie on, and the play-the-ball is slower.
    const down = (w ? ruckTicks(secs) : LIVE.downTicks) + (this.callState[other(this.attacking)].defence === 'gang-tackle' ? CALLS.gang.downTicks : 0);
    const pace = !w || handover ? null : secs <= WRESTLE.quickS ? 'quick' : secs >= WRESTLE.slowS ? 'slow' : null;
    this.lock(c, 'down', down);
    for (const i of w ? w.men : [ph.tackler]) this.lock(this.players[i]!, 'down', down);
    this.phase = { kind: 'ruck', t0: this.tick, carrier: ph.carrier, tackler: ph.tackler, stage: 'down', handover, heldAt: 0, down, pace, contactStartedTick: ph.t0 };
    this.startRetreat();
    if (this.siren) this.endHalf(); // the tackle is made: the ball is dead
  }
}
