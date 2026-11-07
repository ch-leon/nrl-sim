import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y } from '../../core/field';
import { maxSpeedFor } from '../../core/body';
import type { Side, SimEvent } from '../../core/snapshot';
import { clamp, dist, type Vec } from '../../core/vec';
import { ROLES } from '../roles';
import { FATIGUE, drainRate } from '../fatigue';
import { refillSeconds, tankSeconds } from '../gas';
import { NINES } from '../rules';
import { BENCH, benchRecover, pickSwaps } from '../bench';
import { other, type Player, type Phase } from './types';
import { LiveSetPlays } from './setPlays';

export abstract class LiveClock extends LiveSetPlays {
  // ── Clock ─────────────────────────────────────────────────────────────────
  /** The clock runs while the ball is in play; at time up the siren goes and play carries on to the next dead ball. */
  protected runClock(): void {
    const k = this.phase.kind;
    if (k !== 'play' && k !== 'tackle' && k !== 'ruck') return;
    const halfTicks = Math.round(((this.golden ? NINES.goldenPointMinutes : this.length.halfMinutes) * 60) / TICK_S);
    if (this.clockTicks < halfTicks) this.clockTicks++;
    if (!this.siren && this.clockTicks >= halfTicks) {
      this.siren = true;
      this.sirenAt = this.tick;
      this.emit('siren', this.half < this.length.halves ? 'The half-time siren — play on until the ball is dead' : this.golden ? 'Golden point is over — play on until the ball is dead' : 'The full-time siren — play on until the ball is dead');
      // Time up with a man still down from the tackle: the ball is already dead.
      const ph = this.phase;
      if (ph.kind === 'ruck' && ph.stage === 'down') {
        this.endHalf();
        return;
      }
    }
    // Belt and braces: a passage that never goes dead still ends.
    if (this.siren && this.tick - this.sirenAt >= Math.round(NINES.playOnMaxS / TICK_S)) this.endHalf();
  }

  /** The ball is dead after the siren: half-time, or full time. */
  protected endHalf(): void {
    const score = `${this.names.home} ${this.points.home} – ${this.points.away} ${this.names.away}`;
    this.pendingKick = null;
    this.outPending = null;
    this.penaltyKickUp = null;
    if (this.half < this.length.halves) {
      this.emit('half-time', `Half-time: ${score}`);
      this.phase = { kind: 'half-time', t0: this.tick };
      this.considerBreak('half-time');
    } else if (this.goldenPoint && !this.golden && NINES.goldenPointMinutes > 0 && this.points.home === this.points.away) {
      // A drawn final: golden point, the next score wins (N9.4).
      this.emit('golden-point', `Full time: ${score} — golden point! The next score wins`);
      this.golden = true;
      this.phase = { kind: 'half-time', t0: this.tick };
      this.considerBreak('half-time');
    } else {
      this.emit('full-time', `Full time: ${score}`);
      this.phase = { kind: 'full-time' };
      this.finished = true;
    }
  }

  /** Golden point is won: full time on the spot. */
  protected endGoldenPoint(winner: Side): void {
    this.pendingKick = null;
    this.outPending = null;
    this.penaltyKickUp = null;
    this.emit('full-time', `Golden point to ${this.names[winner]}! Full time: ${this.names.home} ${this.points.home} – ${this.points.away} ${this.names.away}`);
    this.events[this.events.length - 1]!.detail = 'golden-point';
    this.phase = { kind: 'full-time' };
    this.finished = true;
  }

  /** The break: then legs part-restored, a full tank, ends swapped, and the side that received first kicks off. */
  protected stepHalfTime(ph: Extract<Phase, { kind: 'half-time' }>): void {
    if (this.tick < ph.t0 + (this.golden ? NINES.goldenPointBreakTicks : NINES.halfTimeTicks)) return;
    // Golden point straight after full time: no legs back, no swaps in the sheds.
    const legsBack = this.golden ? 0 : NINES.halfTimeLegsBack;
    // Fresh legs still to land (#367) is made in the sheds, picked on the legs they came in with (before any come back); each side gets a new call for the half.
    for (const side of ['home', 'away'] as const) {
      const fl = this.freshLegs[side];
      if (fl.pending) {
        const pick = this.freshLegsPick(side);
        if (pick) {
          fl.pending = false;
          this.swapIn(this.at(side, pick.slot), pick.bench, true);
        } else this.lapseFreshLegs(side);
      }
      fl.usedThisHalf = 0;
    }
    for (const p of this.players) {
      p.energy += (1 - p.energy) * legsBack;
      p.gas = { gas: p.energy, blown: false };
      p.gassed = p.energy < FATIGUE.spentAt;
      p.pose = 'idle';
      p.poseUntil = p.lockUntil = p.busyUntil = p.cooldownUntil = p.immuneUntil = p.burstUntil = 0;
      p.brokeAt = -1000;
      p.slide = null;
      p.jink = null;
      p.decided = false;
      p.steppedOn = -1;
    }
    for (const b of [...this.bench.home, ...this.bench.away]) b.energy += (1 - b.energy) * legsBack;
    // Swaps in the sheds: no jog needed.
    if (!this.golden) {
      for (const side of ['home', 'away'] as const) {
        for (const sw of this.swapsFor(side)) this.swapIn(this.at(side, sw.slot), sw.bench);
      }
    }
    this.half++;
    this.ends = this.ends === 1 ? -1 : 1;
    this.clockTicks = 0;
    this.siren = false;
    // The second half is kicked off by the side that received the first; golden point by the side that opened the match.
    this.setForKickoff(this.golden ? other(this.firstReceiver) : this.firstReceiver);
  }

  // ── Interchanges (2b) ─────────────────────────────────────────────────────
  /** Who the coach takes off now, by his rotation policy. `taken`: a Fresh legs swap at this stoppage (#367), already made, so neither man is picked again. */
  private swapsFor(side: Side, taken?: { slots: ReadonlySet<number>; bench: ReadonlySet<number> }): { slot: number; bench: number }[] {
    // A hurt man comes off first, whatever the rotation, for the freshest man left (2f).
    const bench = this.bench[side];
    const out: { slot: number; bench: number }[] = [];
    const used = new Set<number>(taken?.bench);
    for (const p of this.side(side)) {
      if (!p.hurt || p.subFor !== null || taken?.slots.has(p.slot)) continue;
      let best = -1;
      bench.forEach((b, i) => {
        if (!b.injured && !used.has(i) && (best < 0 || b.energy > bench[best]!.energy)) best = i;
      });
      if (best < 0) continue; // nobody left: he plays on hampered
      used.add(best);
      out.push({ slot: p.slot, bench: best });
    }
    const rest = pickSwaps(
      this.side(side).filter((p) => !out.some((o) => o.slot === p.slot) && !taken?.slots.has(p.slot)).map((p) => ({ slot: p.slot, energy: p.energy })),
      bench.map((b, i) => (b.injured || used.has(i) ? { energy: -Infinity } : b)),
      this.rotation[side],
    );
    return [...out, ...rest];
  }

  /** After a try: the men coming off head for the interchange spot (the restart waits for them). A Fresh legs call still to land goes first (#367). */
  protected callSwaps(): void {
    for (const side of ['home', 'away'] as const) {
      if (this.freshLegs[side].pending) {
        const pick = this.freshLegsPick(side);
        if (pick) {
          const p = this.at(side, pick.slot);
          p.subFor = pick.bench;
          p.subAt = this.tick;
          p.subSpot = this.interchangeSpot(p);
          p.subFresh = true;
          this.freshLegs[side].pending = false;
        } else this.lapseFreshLegs(side);
      }
      // A man already on his way off for Fresh legs counts as swapped at this stoppage.
      const going = this.side(side).find((p) => p.subFresh && p.subFor !== null);
      const taken = going ? { slots: new Set([going.slot]), bench: new Set([going.subFor!]) } : undefined;
      for (const sw of this.swapsFor(side, taken)) {
        const p = this.at(side, sw.slot);
        p.subFor = sw.bench;
        p.subAt = this.tick;
        p.subSpot = this.interchangeSpot(p);
      }
    }
  }

  /** Where a man comes off: the nearest touchline, level with where he is (in from the try lines). */
  protected interchangeSpot(p: Player): Vec {
    return { x: clamp(p.body.pos.x, 10, FIELD_LENGTH - 10), y: p.body.pos.y < MID_Y ? 1 : FIELD_WIDTH - 1 };
  }

  /** Each man coming off swaps on reaching the spot (or when he has had long enough to get there). */
  protected runSwaps(): void {
    for (const p of this.players) {
      if (p.subFor === null) continue;
      const there = dist(p.body.pos, p.subSpot) < 1.5;
      if (there || this.tick - p.subAt >= Math.round(BENCH.jogOffS / TICK_S)) this.swapIn(p, p.subFor);
    }
  }

  /** The bench man takes this player's place (slot, role, spot); the player takes his on the bench. `fresh`: the coach's Fresh legs call (#367), which it pays. */
  protected swapIn(p: Player, bi: number, fresh = p.subFresh): void {
    const b = this.bench[p.side][bi];
    if (!b) return;
    this.bench[p.side][bi] = { name: p.name, key: p.key, ...(p.id ? { id: p.id } : {}), injuryRisk: p.injuryRisk, injured: p.hurt, stats: p.stats, traits: p.traits, stamina: p.stamina, energy: p.energy, position: ROLES[p.slot]!.name };
    const out = p.name;
    const wasHurt = p.hurt;
    p.name = b.name;
    p.key = b.key;
    if (b.id) p.id = b.id;
    else delete p.id;
    p.injuryRisk = b.injuryRisk;
    p.hurt = false;
    p.stats = b.stats;
    p.traits = [...b.traits];
    p.stamina = b.stamina;
    p.energy = b.energy;
    p.drain = drainRate(b.stamina, b.traits);
    p.gassed = b.energy < FATIGUE.spentAt;
    p.gas = { gas: b.energy, blown: false };
    p.tankS = tankSeconds(b.stamina, b.traits);
    p.refillS = refillSeconds(b.stamina);
    p.body.maxSpeed = maxSpeedFor(b.stats.speed);
    p.busyUntil = p.cooldownUntil = p.immuneUntil = p.burstUntil = 0;
    p.brokeAt = -1000;
    p.subFor = null;
    p.subFresh = false;
    this.emit('interchange', wasHurt ? `${p.name} on for the injured ${out}` : `${p.name} on for ${out}`, p);
    if (fresh) {
      this.events[this.events.length - 1]!.detail = 'fresh-legs';
      this.announcePaid(this.judge.swapped(p.side, out, p.name));
    }
  }

  /** The bench's legs come back a little each tick. */
  protected restBench(): void {
    for (const b of [...this.bench.home, ...this.bench.away]) b.energy = benchRecover(b.energy, TICK_S);
  }

  /** Average legs of a side's bench, 0..1 (null when it has none). */
  benchEnergyOf(side: Side): number | null {
    const bs = this.bench[side];
    return bs.length ? bs.reduce((a, b) => a + b.energy, 0) / bs.length : null;
  }

  /** Seconds of match time gone since the kick-off (the clock, both halves). */
  get matchSeconds(): number {
    return (this.half - 1) * this.length.halfMinutes * 60 + this.clockTicks * TICK_S;
  }

  /** Men on the carrier in the wrestle now, 0 when there is none (headless runs; the snapshot has the rest). */
  get wrestleMen(): number {
    const ph = this.phase;
    return ph.kind === 'tackle' && ph.wrestle ? ph.wrestle.men.length : 0;
  }

  /** This tick's events without building a snapshot (headless runs). */
  get tickEvents(): readonly SimEvent[] {
    return this.events;
  }
}
