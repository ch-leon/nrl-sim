import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_Y, clampToGround, inGoal } from '../../core/field';
import { PASS_SPEED, passFlight } from '../../core/ball';
import type { Side } from '../../core/snapshot';
import { add, clamp, dist, dot, scale, sub, type Vec } from '../../core/vec';
import { BASE, interceptChance, resolveContest, type ContestMods } from '../contest';
import { PLAYERS, ROLES } from '../roles';
import { MAX_LAT_M, pickReceiver } from '../tactics';
import { EDGE_COST, FINISHER_M, announce, contestTraits, interceptTraits } from '../traits';
import { traitBoost } from '../../../data/traits';
import { FATIGUE } from '../fatigue';
import { WRESTLE, driveSpeed, fightOf, gripOf, holdOf, wrestleTick, type WrestleState } from '../wrestle';
import { NINES } from '../rules';
import { GOALS, inBonusZone, postsFor } from '../goals';
import { PENALTY } from '../penalties';
import { CALLS } from '../calls';
import { injuryChance, lostInContactChance } from '../weather';
import { TOUCH } from '../touch';
import { BIN } from '../sinbin';
import { PACK } from '../presets';
import { LIVE, runOn } from './knobs';
import { other, type Player, type Phase } from './types';
import { LivePenalties } from './penalties';

export abstract class LiveContact extends LivePenalties {
  // ── Actions ───────────────────────────────────────────────────────────────
  protected pass(from: Player, to: Player, spillExtra = 0): void {
    this.offloadReceiver = null;
    const flightS = dist(from.body.pos, to.body.pos) / PASS_SPEED;
    const lead = this.leadPoint(from, to, flightS);
    this.spillExtra = spillExtra;
    this.interceptTrait = undefined;
    // A defender sitting in the lane may pick it off: the ball then flies to him.
    const thief = this.laneDefender(from.body.pos, lead, from.side);
    const cutOut = dist(from.body.pos, lead) > 12;
    const it = thief ? interceptTraits(thief.traits) : null;
    const read = cutOut && this.tactics[from.side].attack === 'expansive' ? this.slideEffect(from.side) : 0;
    if (thief && it && this.rng.next() < interceptChance(thief.stats.footyIQ, cutOut, it.bonus + read)) {
      this.ball = passFlight(from.body.pos, { ...thief.body.pos }, this.tick, this.indexOf(thief));
      this.interceptTrait = announce(it.credit);
    } else {
      this.ball = passFlight(from.body.pos, lead, this.tick, this.indexOf(to));
      if (thief && it?.gamble) {
        // The Gambler shot out of the line and missed the read: he's out of the play.
        this.emit('gamble', `${thief.name} gambles on the intercept and misses`, thief, announce(thief.traits.find((t) => t.id === 'gambler')));
        this.lock(thief, 'tackled', 12, add(thief.body.pos, scale({ x: -this.dir, y: 0 }, 1)));
        thief.cooldownUntil = this.tick + LIVE.beatenCooldown;
      }
    }
    from.pose = 'pass';
    from.poseUntil = this.tick + LIVE.passPoseTicks;
    from.catchTick = this.tick;
  }

  /**
   * Where to throw it so the receiver takes it on the run: he will accelerate
   * forward through the catch, so lead him by what he covers in the flight
   * (current forward speed plus acceleration, capped at his top speed) and
   * keep his drift. The ball still leaves the hands backward.
   */
  private leadPoint(from: Player, to: Player, flightS: number): Vec {
    const fwd = { x: this.dir, y: 0 };
    const v0 = dot(to.body.vel, fwd);
    const vMax = to.body.maxSpeed * LIVE.carrySpeed;
    // The lead lengthens the flight, so settle the flight time once more.
    let t = flightS;
    let lead = to.body.pos;
    for (let i = 0; i < 2; i++) {
      const ahead = runOn(v0, to.body.accel, vMax, t);
      lead = { x: to.body.pos.x + this.dir * ahead, y: to.body.pos.y + to.body.vel.y * t * 0.8 };
      t = dist(from.body.pos, lead) / PASS_SPEED;
    }
    // Never a forward pass: the catch point stays at least half a metre behind the passer.
    const behind = from.body.pos.x - this.dir * 0.5;
    lead.x = this.dir > 0 ? Math.min(lead.x, behind) : Math.max(lead.x, behind);
    return clampToGround(lead, 1);
  }

  /** The defender nearest the pass line and within LIVE.laneM of it, if any. */
  private laneDefender(from: Vec, to: Vec, side: Side): Player | null {
    const seg = sub(to, from);
    const len2 = seg.x * seg.x + seg.y * seg.y;
    if (len2 < 1) return null;
    let best: Player | null = null;
    let bd = LIVE.laneM;
    for (const d of this.side(other(side))) {
      if (this.locked(d)) continue;
      const u = clamp(dot(sub(d.body.pos, from), seg) / len2, 0.15, 0.95);
      const onLine = add(from, scale(seg, u));
      const off = dist(d.body.pos, onLine);
      if (off < bd) {
        bd = off;
        best = d;
      }
    }
    return best;
  }

  protected contest(c: Player, t: Player, committed: readonly Player[]): void {
    const sit = this.situation(c, t, committed);
    const tr = contestTraits(c.traits, t.traits, sit, this.toLine(c) <= FINISHER_M);
    // The game plans weigh in: how much the attack wants the offload, how the line tackles.
    const plan = this.atkPlan(c);
    const dplan = this.defPlan();
    if (sit.support) tr.mods.offload = (tr.mods.offload ?? 0) + (plan.offload - 1) * BASE.offload + dplan.offload;
    tr.mods.bigHit = (tr.mods.bigHit ?? 0) + dplan.bigHit;
    // A defence a man short (#71) is stretched: easier to bust.
    tr.mods.broken = (tr.mods.broken ?? 0) + dplan.broken + (this.side(t.side).length < PLAYERS ? BIN.shortBroken : 0);
    tr.mods.edge = this.contestFitEdge(c.side, t.side);
    this.applySlideContact(c, tr.mods, sit.support);
    const outcome = resolveContest(c.stats, t.stats, this.rng.next(), sit, tr.mods);
    const credit = announce(tr.credit[outcome]);
    // Contact costs both men legs, whatever happens.
    this.tire(c, FATIGUE.contactCost.carrier);
    this.tire(t, FATIGUE.contactCost.tackler);
    const back = scale({ x: -this.dir, y: 0 }, 1);
    switch (outcome) {
      case 'strip': {
        // One-on-one, he rips it free: the tackler is the new carrier.
        this.emit('strip', `${t.name} strips the ball from ${c.name}!`, t, credit);
        this.lock(c, 'tackled', 14);
        this.lock(t, 'tackle', 6);
        this.ball = { kind: 'held', by: this.indexOf(t) };
        t.catchTick = this.tick;
        t.decided = false;
        t.steppedOn = -1;
        this.turnover();
        return;
      }
      case 'broken':
        this.emit('break-tackle', `${c.name} busts through ${t.name}`, c, credit);
        this.lock(t, 'down', 16, add(t.body.pos, scale(back, -1.2)));
        t.cooldownUntil = this.tick + LIVE.beatenCooldown;
        this.burst(c);
        return;
      case 'fend':
        this.emit('fend', `${c.name} palms off ${t.name}`, c, credit);
        c.pose = 'fend';
        c.poseUntil = this.tick + 6;
        this.lock(t, 'tackled', 14, add(t.body.pos, scale(back, -1.5)));
        t.cooldownUntil = this.tick + LIVE.beatenCooldown;
        c.immuneUntil = this.tick + LIVE.immuneTicks;
        return;
      case 'offload': {
        const cands = this.candidates(c).filter((k) => dist(this.players[k.idx]!.body.pos, c.body.pos) < LIVE.offloadM + 2);
        const r = pickReceiver(c.body.pos, this.dir, cands) ?? cands.find((k) => !k.busy)?.idx ?? null;
        if (r !== null) {
          this.emit('offload', `${c.name} gets the offload away to ${this.players[r]!.name}`, c, credit);
          // A Razzle Dazzle offload is the miracle ball — and the one that gets spilled; so is one the coach called for (#396).
          this.pass(c, this.players[r]!, (tr.credit.offload?.id === 'razzleDazzle' ? EDGE_COST.razzleDazzle : 0) + (this.playCall() === 'offload' ? CALLS.offload.spill : 0));
          this.offloadReceiver = r;
          this.offloadUntil = this.tick + LIVE.beatenCooldown;
          this.lock(c, 'tackled', LIVE.contactTicks + LIVE.downTicks);
          this.lock(t, 'tackle', LIVE.contactTicks + LIVE.downTicks);
          c.busyUntil = this.tick + LIVE.contactTicks + LIVE.downTicks + 10;
          return;
        }
        break; // nobody there after all: a plain tackle
      }
      default:
        break;
    }
    // A high shot (2e): rare, more from a Hothead — a penalty.
    const hot = traitBoost(t.traits, 'hothead');
    if (this.rng.next() < PENALTY.highShot + PENALTY.highShotHothead * hot) {
      this.lock(c, 'tackled', LIVE.contactTicks + LIVE.downTicks);
      this.lock(t, 'tackle', LIVE.contactTicks);
      this.penalize(t.side, { ...c.body.pos }, `${t.name} — high shot`, t, 'high', hot > 0 ? announce(t.traits.find((x) => x.id === 'hothead')) : undefined);
      return;
    }
    // Ball lost in the tackle (2f): a knock-on, more on a big hit and in the rain.
    if (this.rng.next() < lostInContactChance(outcome === 'big-hit', c.stats.skill, this.wx.handling)) {
      this.emit('error', `${c.name} loses the ball in the tackle — knock-on`, c);
      this.events[this.events.length - 1]!.detail = 'contact';
      this.lock(c, 'tackled', LIVE.contactTicks);
      this.lock(t, 'tackle', LIVE.contactTicks);
      this.lastTouch = c.side;
      this.bounce(c.body.pos, { x: this.dir, y: (this.rng.next() - 0.5) * 0.6 }, 2.5, 12, 2);
      this.turnover();
      this.looseFor = this.attacking; // a knock-on is theirs whoever reaches it
      if (this.siren) this.endHalf();
      return;
    }
    // A big hit can injure the carrier (2f; the old engine's roll): hampered until he comes off.
    if (outcome === 'big-hit' && !c.hurt && this.rng.next() < injuryChance({ injuryRisk: c.injuryRisk, traits: c.traits }, this.injuryRate)) {
      const weeks = 1 + Math.floor(this.rng.next() * 3);
      c.hurt = true;
      this.injuries.push({ teamId: this.clubIds[c.side], playerName: c.name, ...(c.id ? { playerId: c.id } : {}), weeks });
      this.emit('injury', `${c.name} is hurt in the tackle (${weeks} week${weeks > 1 ? 's' : ''})`, c);
    }
    // Held or smashed on the touchline: bundled into touch (2d).
    const nearTouch = Math.min(c.body.pos.y, FIELD_WIDTH - c.body.pos.y) < TOUCH.bundleNearM;
    if (nearTouch && this.rng.next() < (outcome === 'big-hit' ? TOUCH.bundleBigHit : TOUCH.bundle)) {
      this.emit('touch', `${t.name} bundles ${c.name} into touch`, t);
      this.events[this.events.length - 1]!.detail = 'bundled';
      this.lock(c, 'tackled', LIVE.contactTicks);
      this.lock(t, 'tackle', LIVE.contactTicks);
      this.lastTouch = c.side;
      this.outOfField({ x: c.body.pos.x, y: c.body.pos.y < MID_Y ? 0 : FIELD_WIDTH }, 'touch', false);
      return;
    }
    this.runDown(c, t, sit);
    if (outcome === 'big-hit') {
      // Smashed backwards at contact: no wrestle, he is down.
      this.emit('big-hit', `${t.name} smashes ${c.name} backwards!`, t, credit);
      const drive = scale(back, LIVE.driveBack);
      this.lock(c, 'tackled', LIVE.contactTicks, add(c.body.pos, drive));
      this.lock(t, 'tackle', LIVE.contactTicks, add(t.body.pos, drive));
      this.phase = { kind: 'tackle', t0: this.tick, carrier: this.indexOf(c), tackler: this.indexOf(t), big: true, wrestle: null, wreck: 0 };
      return;
    }
    // Held: the wrestle (§8.1). A Wrecking Ball sometimes keeps his legs pumping — more fight, more ground.
    const wb = traitBoost(c.traits, 'wreckingBall');
    const wreck = wb > 0 && this.rng.next() < LIVE.wreckDriveChance * wb ? wb : 0;
    const fight = fightOf({ ...c.stats, stamina: c.stamina }, c.energy, this.rng.next()) * (1 + WRESTLE.wreckFight * wreck);
    const wrestle: WrestleState = { men: [this.indexOf(t)], fight, fight0: fight, grip: gripOf(t.stats, t.energy, true), t0: this.tick, metres: 0 };
    this.hold(c, 'tackled');
    this.hold(t, 'tackle');
    this.phase = { kind: 'tackle', t0: this.tick, carrier: this.indexOf(c), tackler: this.indexOf(t), big: false, wrestle, wreck };
  }

  /** Drift leaves an inside gap for the pack, and cannot reset for the offload receiver. */
  protected applySlideContact(c: Player, mods: ContestMods, support: boolean): void {
    if (this.tick > this.offloadUntil) this.offloadReceiver = null;
    const slide = this.slideEffect(c.side);
    if (slide > 0) {
      const attack = this.tactics[c.side].attack;
      if (attack === 'expansive' && Math.abs(c.body.pos.y - MID_Y) > MAX_LAT_M) mods.edge = (mods.edge ?? 0) - slide;
      if (attack === 'grind' && PACK.includes(ROLES[c.slot]!.name)) {
        if (support) mods.offload = (mods.offload ?? 0) + slide;
        mods.broken = (mods.broken ?? 0) + slide;
      }
      if (attack === 'all-out' && this.offloadReceiver === this.indexOf(c)) mods.broken = (mods.broken ?? 0) + slide;
    }
  }

  /** Keep a man in the wrestle: locked where he stands, for another tick or two. */
  private hold(p: Player, pose: string): void {
    p.pose = pose;
    p.poseUntil = this.tick + 2;
    p.lockUntil = this.tick + 2;
    p.body.vel = { x: 0, y: 0 };
    p.slide = null;
  }

  /** Spend some of a player's legs (× his drain rate); announce him once when he is cooked. */
  private tire(p: Player, amount: number): void {
    p.energy = Math.max(0, p.energy - amount * p.drain);
    this.checkLegs(p);
  }

  protected checkLegs(p: Player): void {
    if (!p.gassed && p.energy < FATIGUE.spentAt) {
      p.gassed = true;
      this.emit('gassed', `${p.name} is cooked`, p);
    } else if (p.gassed && p.energy > FATIGUE.gassedReset) p.gassed = false;
  }

  /**
   * One tick of the wrestle: free defenders arriving join it (up to three),
   * the carrier drives on while his fight lasts, everyone in it pays legs.
   * Returns true when he is held (go to ground); a late bust or a try ends it here.
   */
  protected stepWrestle(ph: Extract<Phase, { kind: 'tackle' }>, w: WrestleState): boolean {
    const c = this.players[ph.carrier]!;
    for (const d of this.side(other(c.side))) {
      if (w.men.length >= WRESTLE.maxMen) break;
      const i = this.indexOf(d);
      if (w.men.includes(i) || this.locked(d) || this.tick < d.cooldownUntil || dist(d.body.pos, c.body.pos) > LIVE.tackleReach + 0.3) continue;
      w.men.push(i);
      w.grip += gripOf(d.stats, d.energy, false);
      this.tire(d, FATIGUE.contactCost.tackler);
    }
    const men = w.men.map((i) => this.players[i]!);
    const dt = TICK_S;
    const end = wrestleTick(w, men.map((d) => holdOf(d.stats, d.energy)), dt, (this.tick - w.t0) * dt);
    this.tire(c, FATIGUE.wrestleCost.carrierPerMan * men.length * dt);
    for (const d of men) this.tire(d, FATIGUE.wrestleCost.tackler * dt);
    // He keeps driving while there is fight in him; they go with him.
    const step = driveSpeed(w.fight / w.fight0, men.length) * dt;
    w.metres += step;
    const shift = { x: this.dir * step, y: 0 };
    c.body.pos = clampToGround(add(c.body.pos, shift), 0.5);
    for (const d of men) d.body.pos = clampToGround(add(d.body.pos, shift), 0.5);
    if (inGoal(c.body.pos, this.dir)) {
      // Driven over the line in the tackle.
      for (const d of men) this.lock(d, 'down', LIVE.downTicks);
      this.score(c);
      return false;
    }
    if (end === 'free') {
      // The defenders' grip went before his fight: he is through.
      this.emit('break-tackle', `${c.name} fights out of the tackle!`, c);
      this.events[this.events.length - 1]!.detail = 'wrestle';
      for (const d of men) {
        this.lock(d, 'down', 16, add(d.body.pos, { x: -this.dir * 0.8, y: 0 }));
        d.cooldownUntil = this.tick + LIVE.beatenCooldown;
      }
      c.lockUntil = this.tick;
      c.pose = 'run';
      c.poseUntil = 0;
      this.burst(c);
      this.phase = { kind: 'play' };
      return false;
    }
    if (end === null) {
      this.hold(c, 'tackled');
      for (const d of men) this.hold(d, 'tackle');
      return false;
    }
    const t = this.players[ph.tackler]!;
    const help = men.length > 1 ? ` (${men.length} men)` : '';
    const after = w.metres >= 1 ? ` after ${w.metres.toFixed(1)} m` : '';
    this.emit('tackle', ph.wreck > 0 ? `${t.name} hangs on as ${c.name} drives through the tackle${after}` : `${t.name} wraps up ${c.name}${after}${help}`, t, ph.wreck > 0 ? announce(c.traits.find((x) => x.id === 'wreckingBall')) : undefined);
    return true;
  }

  /**
   * Over the line: keep going round toward the posts for the bonus zone? Only
   * while no defender is close, not yet between the posts, not near the dead-ball
   * line, and not for long.
   */
  protected goForBonus(h: Player): boolean {
    const dir = this.dirOf(h.side);
    const posts = postsFor(dir, FIELD_LENGTH, MID_Y);
    if (inBonusZone(h.body.pos, posts, dir)) return false;
    if (this.overLineAt >= 0 && this.tick - this.overLineAt >= GOALS.bonusMaxTicks) return false;
    if ((h.body.pos.x - posts.x) * dir >= IN_GOAL - GOALS.bonusDeadM) return false;
    return !this.side(other(h.side)).some((d) => !this.locked(d) && dist(d.body.pos, h.body.pos) < GOALS.bonusClearM);
  }

  protected score(scorer: Player): void {
    this.overLineAt = -1;
    const dir = this.dirOf(scorer.side);
    const bonus = inBonusZone(scorer.body.pos, postsFor(dir, FIELD_LENGTH, MID_Y), dir);
    this.tries[scorer.side]++;
    this.concededRun[other(scorer.side)]++;
    this.concededRun[scorer.side] = 0;
    this.points[scorer.side] += bonus ? NINES.bonusTryPoints : NINES.tryPoints;
    this.emit('try', bonus ? `TRY! ${scorer.name} goes round under the posts — five points for ${this.names[scorer.side]}` : `TRY! ${scorer.name} dives over for ${this.names[scorer.side]}`, scorer);
    if (bonus) this.events[this.events.length - 1]!.detail = 'bonus';
    // Dive and slide, then up to celebrate on the spot — he stays put until the restart.
    this.lock(scorer, 'dive', 10, add(scorer.body.pos, scale({ x: this.dir, y: 0 }, 1.5)));
    scorer.poseUntil = this.tick + LIVE.tryTicks;
    for (const p of this.side(scorer.side)) {
      if (p === scorer) continue;
      p.pose = 'celebrate';
      p.poseUntil = this.tick + LIVE.tryTicks;
    }
    this.phase = { kind: 'try', t0: this.tick, scorer: this.indexOf(scorer) };
    this.considerBreak('try');
  }

  // ── Who goes where ────────────────────────────────────────────────────────
  protected committed(h: Player, defenders: readonly Player[]): Player[] {
    // Markers stay square at the ruck until the ball is well clear of it; they
    // may only pounce early on a dummy-half dart. Otherwise the first receiver
    // runs at the line, not at the two men standing over the mark.
    const dplan = this.defPlan();
    const held = this.tick < this.ruckPlayedAt + LIVE.markerReleaseTicks * dplan.markerHold && h !== this.dummyHalf(h.side);
    const free = defenders.filter((d) => !this.locked(d) && this.tick >= d.cooldownUntil && !(held && this.markers.includes(this.indexOf(d))));
    // A defender already behind the carrier can only chase; the ones in front
    // of him are the tackle, so they rank first.
    const behind = (d: Player): boolean => (d.body.pos.x - h.body.pos.x) * this.dir < 0;
    // Each defender's cost worked out once, then a stable sort on it (the same order as sorting the men).
    const ranked = free.map((d) => ({ d, cost: dist(d.body.pos, h.body.pos) + (behind(d) ? 60 : 0) + (this.markers.includes(this.indexOf(d)) ? 8 : 0) }));
    ranked.sort((a, b) => a.cost - b.cost);
    for (let i = 0; i < ranked.length; i++) free[i] = ranked[i]!.d;
    const ahead = free.filter((d) => !behind(d)).length;
    // A broken line (two or fewer still in front) sends everyone in range after him.
    const n = ahead <= 2 ? 4 : free[2] && dist(free[2].body.pos, h.body.pos) < 5 ? 3 : 2;
    return free.slice(0, Math.min(4, n + dplan.commit));
  }
}
