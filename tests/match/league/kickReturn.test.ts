import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { FIELD_LENGTH, FIELD_WIDTH } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { KICK_RETURN, returnSupportSpots } from '../../../src/match/league/live/kickReturn';
import { other, type PendingKick } from '../../../src/match/league/live/types';
import { pickReceiver } from '../../../src/match/league/tactics';
import { applyTuning } from '../../../src/match/league/tuning';

type Options = Partial<Pick<PendingKick, 'aim' | 'kickoff' | 'dropOut'>> & { x?: number; miss?: boolean };

class ReturnSim extends LiveSim {
  private readonly receiving: Side;
  private readonly centre = 34;
  draws = 0;
  roll = 0.99;

  constructor(receiving: Side, kind: PendingKick['kind'], options: Options = {}) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 660);
    this.receiving = receiving;
    this.tick = 100;
    this.phase = { kind: 'play' };
    this.dir = this.dirOf(receiving);
    const to = this.spot(options.x ?? 25, this.centre);
    for (const p of this.players) {
      p.body.pos = this.spot(55 + p.slot, 4 + 6 * p.slot);
      p.body.vel = { x: 0, y: 0 };
    }
    const catcher = this.man(0);
    if (!options.miss) {
      catcher.body.pos = { ...to };
      this.man(1).body.pos = { x: to.x - this.dir * 2.5, y: this.centre - 4 };
      this.man(2).body.pos = { x: to.x - this.dir * 2.5, y: this.centre + 4 };
      for (const slot of [3, 4, 5, 6]) this.man(slot).body.pos = { x: to.x, y: this.centre + 1 + (slot - 3) / 2 };
    }
    this.man(3).busyUntil = 500;
    this.man(4).lockUntil = 500;
    this.man(5).binUntilS = 500;
    this.man(6).subFor = 0;
    this.refreshOnField();
    this.chaser().body.pos = { x: to.x + this.dir * 8, y: this.centre - 1 };
    const kicker = this.kicker(other(receiving));
    this.pendingKick = { at: this.tick, kicker: this.indexOf(kicker), to, receiver: this.indexOf(catcher), peak: 12,
      kickoff: options.kickoff ?? false, kind, ...(options.dropOut ? { dropOut: true } : {}), ...(options.aim ? { aim: options.aim } : {}) };
    this.launchPendingKick();
    if (this.ball.kind !== 'flight') throw new Error('Expected a real launch');
    this.tick += this.ball.ticks - 1;
    this.rng.next = () => { this.draws++; return this.roll; };
  }

  private spot(x: number, y: number) { return { x: this.dir > 0 ? x : FIELD_LENGTH - x, y }; }
  man(slot: number) { return this.at(this.receiving, slot); }
  chaser() { return this.at(other(this.receiving), 0); }
  route() { return this.currentKickReturn(this.holder()); }
  advance(ticks: number) { for (let i = 0; i < ticks; i++) this.step(); }

  collectBounce() {
    const b = this.ball;
    if (b.kind !== 'flight' || b.via !== 'bounce') throw new Error('Expected a missed catch to bounce');
    this.tick = b.t0 + b.ticks - 1;
    this.step();
    this.man(0).body.pos = { ...b.to };
    this.step();
  }

  contactNow() {
    this.chaserAt(0.95);
    this.step();
  }

  chaserAt(distance: number) {
    this.chaser().body.pos = { x: this.man(0).body.pos.x + this.dir * distance, y: this.man(0).body.pos.y };
    this.chaser().body.vel = { x: 0, y: 0 };
  }

  offers(slot: number) {
    const index = this.indexOf(this.man(slot));
    return pickReceiver(this.man(0).body.pos, this.dir, this.candidates(this.man(0)).filter(c => c.idx === index)) === index;
  }

  input(kind: 'pass-right' | 'step-up') { this.controlList.push({ tick: this.tick + 1, side: this.receiving, kind }); }
}

describe('clean kick returns (#660)', () => {
  it.each([['home', 'long'], ['away', 'bomb']] as const)('turns a clean %s %s catch away from the chase with two legal outlets', (side, kind) => {
    const sim = new ReturnSim(side, kind);
    sim.step();
    const carrier = sim.man(0);
    const pos = { ...carrier.body.pos };
    const dir = side === 'home' ? 1 : -1;
    const route = sim.route()!;
    expect(sim.tickEvents).toContainEqual(expect.objectContaining({ kind: 'set-start', detail: 'caught', side }));
    expect(route.target.y).toBeGreaterThan(pos.y);
    expect((route.target.x - pos.x) * dir).toBeGreaterThan(0);
    expect(carrier.burstUntil).toBe(carrier.lockUntil + KICK_RETURN.burstTicks);
    expect(carrier.immuneUntil).toBe(0);
    expect(route.supports.map(s => s.player.slot)).toEqual([1, 2]);
    for (const slot of [1, 2]) {
      expect(sim.man(slot).wantsSprint).toBe(true);
      expect((pos.x - sim.man(slot).target.x) * dir).toBeCloseTo(KICK_RETURN.supportDepthM);
      expect(sim.offers(slot)).toBe(true);
    }
    expect(sim.draws).toBe(1);
    sim.advance(8);
    expect(carrier.sprinting).toBe(true);
    expect((carrier.body.pos.x - pos.x) * dir).toBeGreaterThan(0);
    expect(carrier.body.pos.y).toBeGreaterThan(pos.y);
    expect(sim.draws).toBe(1);
  });

  it('fits both backward outlets infield near touch, including just inside either try line', () => {
    for (const dir of [1, -1] as const) for (const x of [0.1, FIELD_LENGTH - 0.1]) for (const y of [2, FIELD_WIDTH - 2]) {
      const [a, b] = returnSupportSpots({ x, y }, dir, 0);
      expect((x - a.x) * dir).toBeCloseTo(KICK_RETURN.supportDepthM);
      expect(b.x).toBe(a.x);
      expect(a.y).toBeGreaterThan(0);
      expect(b.y).toBeLessThan(FIELD_WIDTH);
      expect((a.y - y) * (b.y - y)).toBeGreaterThan(0);
      expect(b.y - a.y).toBeCloseTo(KICK_RETURN.supportWideM);
    }
    expect(returnSupportSpots({ x: 40, y: 34 }, 1, 1).map(p => p.y)).toEqual([38, 42]);
    expect(returnSupportSpots({ x: 40, y: 34 }, 1, -1).map(p => p.y)).toEqual([26, 30]);
  });

  it('preserves ordinary close contact, with no burst or return assignment for a good chase', () => {
    const sim = new ReturnSim('home', 'long');
    sim.chaserAt(0.95);
    sim.step();
    expect(sim.route()).toBeNull();
    expect(sim.man(0).burstUntil).toBe(0);
    for (let i = 0; i < 4; i++) sim.contactNow();
    expect(sim.phaseKind).toBe('tackle');
  });

  it('keeps kick-offs, drop-outs, touch attempts, grubbers, misses, spills, bomb contests and regathers on their own paths', () => {
    const regather = new ReturnSim('home', 'long');
    regather.chaserAt(0);
    regather.man(0).body.pos.y += 1;
    const contested = new ReturnSim('home', 'bomb');
    contested.chaserAt(1.1);
    const missed = new ReturnSim('home', 'long', { miss: true });
    const spill = new ReturnSim('home', 'long');
    spill.roll = 0;
    for (const sim of [
      new ReturnSim('home', 'long', { kickoff: true }),
      new ReturnSim('home', 'long', { kickoff: true, dropOut: true }),
      new ReturnSim('home', 'long', { aim: 'touch' }),
      new ReturnSim('home', 'long', { aim: '40-20' }),
      new ReturnSim('home', 'long', { x: -2 }),
      new ReturnSim('home', 'grubber'),
      missed, contested, spill, regather,
    ]) {
      sim.step();
      expect(sim.route()).toBeNull();
      expect(sim.man(0).burstUntil).toBe(0);
    }
    expect(contested.tickEvents).toContainEqual(expect.objectContaining({ kind: 'set-start', detail: 'caught' }));
    expect(spill.tickEvents).toContainEqual(expect.objectContaining({ kind: 'drop' }));
    expect(regather.tickEvents).toContainEqual(expect.objectContaining({ kind: 'regather', side: 'away' }));
    missed.collectBounce();
    expect(missed.tickEvents).toContainEqual(expect.objectContaining({ kind: 'set-start', detail: 'gathered' }));
    expect(missed.route()).toBeNull();
  });

  it('uses the regular pass and contact rules and stops assigning support when the return ends', () => {
    const passed = new ReturnSim('home', 'long');
    passed.step();
    passed.input('pass-right');
    passed.advance(LIVE.passCooldown);
    expect(passed.snapshot().ball.holder).toBeNull();
    expect(passed.route()).toBeNull();

    const tackled = new ReturnSim('home', 'long');
    tackled.step();
    expect(tackled.route()).not.toBeNull();
    for (let i = 0; i < 4; i++) tackled.contactNow();
    expect(tackled.phaseKind).toBe('tackle');
    expect(tackled.route()).toBeNull();
    expect(tackled.man(1).wantsSprint).toBe(false);
    expect(tackled.man(0).burstUntil).toBe(0);
  });

  it('drops a lost support and yields to coach and manual inputs without erasing a prior burst', () => {
    const sim = new ReturnSim('home', 'long');
    const priorBurst = sim.tick + 10;
    sim.man(0).burstUntil = priorBurst;
    sim.step();
    expect(sim.route()).not.toBeNull();
    sim.man(1).subFor = 1;
    sim.step();
    expect(sim.man(1).wantsSprint).toBe(false);
    sim.input('step-up');
    sim.step();
    expect(sim.route()).toBeNull();
    expect(sim.man(0).burstUntil).toBe(priorBurst);
    sim.advance(2);
    expect(sim.man(0).jink).not.toBeNull();

    const coached = new ReturnSim('home', 'long');
    coached.step();
    expect(coached.route()).not.toBeNull();
    expect(coached.call('home', 'hit-up')).toBeNull();
    coached.step();
    expect(coached.route()).toBeNull();
    expect(coached.man(0).burstUntil).toBe(0);
  });

  it('retains the ordinary catch and does not set up a return when off', () => {
    const restore = applyTuning({ 'kickReturn.on': 0 });
    try {
      const sim = new ReturnSim('home', 'long');
      sim.step();
      expect(sim.tickEvents).toContainEqual(expect.objectContaining({ kind: 'set-start', detail: 'caught', side: 'home' }));
      expect(sim.route()).toBeNull();
      expect(sim.man(0).burstUntil).toBe(0);
      expect(sim.draws).toBe(1);
    } finally {
      restore();
    }
  });
});
