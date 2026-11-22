import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import type { PlayId } from '../../../src/data/plays';
import { FIELD_LENGTH, MID_Y } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import type { CoachCall } from '../../../src/match/league/calls';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { other, type Phase } from '../../../src/match/league/live/types';
import { FIVE_EIGHTH, KICKER } from '../../../src/match/league/roles';
import { applyTuning } from '../../../src/match/league/tuning';

type Ruck = Extract<Phase, { kind: 'ruck' }>;
type Pressure = 'closing' | 'clear' | 'retreating' | 'marker' | 'offside' | 'marginal';

class HalvesSim extends LiveSim {
  private ruck!: Ruck;
  draws = 0;

  constructor(plays?: PlayId[]) {
    super({ ...labSheet(DEFAULT_HOME, 'none'), ...(plays ? { plays } : {}) }, labSheet(DEFAULT_AWAY, 'none'), 650);
  }

  setup(side: Side, pressure: Pressure = 'closing') {
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.tackles = SET_TACKLES - 1;
    this.tick = 100;
    const dir = this.dir;
    this.mark = { x: dir > 0 ? 37 : FIELD_LENGTH - 37, y: MID_Y - dir * 3 };
    const h = this.dummyHalf(side), halfback = this.at(side, KICKER), fiveEighth = this.at(side, FIVE_EIGHTH);
    const carrier = this.at(side, 7), defender = this.at(other(side), 3), tackler = this.at(other(side), 7);
    for (const p of this.players) {
      p.body.pos = { x: this.mark.x + dir * 30, y: 4 + p.slot * 6 };
      p.body.vel = { x: 0, y: 0 };
      p.stats.kicking = 60;
      p.traits = [];
    }
    h.body.pos = this.dummyHalfSpot();
    halfback.body.pos = { x: h.body.pos.x - dir * 3, y: h.body.pos.y + dir * 6 };
    fiveEighth.body.pos = { x: h.body.pos.x - dir * 6, y: h.body.pos.y - dir * 6 };
    halfback.stats.kicking = fiveEighth.stats.kicking = 60;
    carrier.body.pos = { ...this.mark };
    defender.body.pos = { x: halfback.body.pos.x + dir * (pressure === 'clear' ? 24 : 11), y: halfback.body.pos.y };
    defender.body.vel.x = pressure === 'retreating' ? dir * 5 : -dir * 5;
    this.markers = [...(pressure === 'marker' ? [this.indexOf(defender)] : []), this.indexOf(tackler)];
    if (pressure === 'offside') {
      this.retreat = { side: defender.side, dir, line: this.mark.x + dir * LIVE.onsideM, eligible: new Map(), markers: new Map() };
    } else if (pressure === 'marginal') {
      const cover = this.at(other(side), 1);
      cover.body.pos = { x: fiveEighth.body.pos.x + dir * 11.4, y: fiveEighth.body.pos.y };
    }
    this.ball = { kind: 'held', by: this.indexOf(h) };
    this.phase = this.ruck = { kind: 'ruck', t0: 96, carrier: this.indexOf(carrier), tackler: this.indexOf(tackler),
      stage: 'dh', handover: false, heldAt: this.tick, down: 0, pace: null };
    this.rng.next = () => { this.draws++; return 0.99; };
    return { dir, h, halfback, fiveEighth };
  }

  targetsBeforeHeel() {
    this.ruck.stage = 'ptb';
    this.assignTargets();
  }

  defenceAfterHeel() {
    const side = other(this.attacking);
    const free = this.at(side, 3), retiring = this.at(side, 8);
    const line = this.mark.x + this.dir * LIVE.onsideM;
    this.lineX = line;
    free.body.pos.x = line + this.dir;
    retiring.body.pos.x = line - this.dir;
    this.retreat = { side, dir: this.dir, line, eligible: new Map(), markers: new Map() };
    this.assignTargets();
    return { free: (free.target.x - line) * this.dir, retiring: (retiring.target.x - line) * this.dir };
  }

  commit() {
    this.tick = this.ruck.heldAt + LIVE.dhHoldTicks - LIVE.dhDecisionLeadTicks;
    this.stepRuck(this.ruck);
    return this.snapshot().passCall;
  }

  callLast(call: CoachCall) { this.callState[this.attacking].attack = call; }

  release() {
    this.tick = this.ruck.heldAt + LIVE.dhHoldTicks;
    this.stepRuck(this.ruck);
    return this.snapshot().ball;
  }

  takePass() {
    const b = this.ball;
    if (b.kind !== 'flight' || b.receiver === null) throw new Error('Expected a pass in flight');
    this.players[b.receiver]!.body.pos = { ...b.to };
    this.tick = b.t0 + b.ticks;
    this.landings();
  }

  makeLastPlay(rolls: number[]) {
    this.tick += LIVE.kickRunTicks;
    this.rng.next = () => { this.draws++; return rolls.shift() ?? 0.99; };
    this.stepPlay();
    return this.kickCall;
  }

  launchKick() {
    this.tick += LIVE.kickContactTicks;
    this.launchPendingKick();
    return this.tickEvents.find(e => e.kind === 'kick');
  }

  passAwayAndBack() {
    const fiveEighth = this.at(this.attacking, FIVE_EIGHTH), h = this.dummyHalf(this.attacking);
    this.pass(fiveEighth, h);
    this.takePass();
    this.pass(h, fiveEighth);
    this.takePass();
  }
}

describe('second last-tackle kicker (#650)', () => {
  it('shapes before the heel, commits across dummy-half and kicks with the actual recipient’s boot in either direction', () => {
    for (const side of ['home', 'away'] as const) {
      const setup = new HalvesSim();
      const { dir, h, halfback, fiveEighth } = setup.setup(side);
      setup.targetsBeforeHeel();
      expect((halfback.target.x - fiveEighth.target.x) * dir).toBe(3);
      expect((halfback.target.y - h.target.y) * (fiveEighth.target.y - h.target.y)).toBeLessThan(0);

      const sim = new HalvesSim();
      sim.setup(side).fiveEighth.traits = [{ id: 'bigBoot', level: 2 }];
      expect(sim.commit()).toMatchObject({ from: { side, slot: h.slot }, to: { side, slot: FIVE_EIGHTH } });
      expect(sim.draws).toBe(1);
      const ball = sim.release();
      expect(ball.flight).toMatchObject({ via: 'pass', source: { player: { side, slot: h.slot } }, receiver: { side, slot: FIVE_EIGHTH } });
      expect((ball.flight!.to.x - ball.flight!.from.x) * dir).toBeLessThan(0);
      expect(sim.draws).toBe(1);
      sim.takePass();
      expect(sim.makeLastPlay([0, 0, 0.99, 0.99, 0.5])).toBe('long');
      expect(sim.launchKick()).toMatchObject({ side, slot: FIVE_EIGHTH, kind: 'kick', trait: 'Big Boot II' });
    }
  });

  it('keeps the halfback if the line is clear or only a retreating, offside or marker defender is near', () => {
    for (const pressure of ['clear', 'retreating', 'offside', 'marker'] as const) {
      const sim = new HalvesSim();
      sim.setup('home', pressure);
      expect(sim.commit()?.to.slot, pressure).toBe(KICKER);
    }
  });

  it('lets only onside defenders advance on the heel of the split last-tackle ruck', () => {
    for (const side of ['home', 'away'] as const) {
      const sim = new HalvesSim();
      sim.setup(side);
      const { free, retiring } = sim.defenceAfterHeel();
      expect(free).toBeLessThan(0);
      expect(retiring).toBeGreaterThan(0);
    }
  });

  it('uses Kicking and Big Boot to break a marginal space read', () => {
    const read = (kicking: number, boot: boolean) => {
      const sim = new HalvesSim();
      const { fiveEighth } = sim.setup('home', 'marginal');
      fiveEighth.stats.kicking = kicking;
      if (boot) fiveEighth.traits = [{ id: 'bigBoot', level: 1 }];
      return sim.commit()?.to.slot;
    };
    expect(read(60, false)).toBe(KICKER);
    expect(read(75, false)).toBe(FIVE_EIGHTH);
    expect(read(60, true)).toBe(FIVE_EIGHTH);
  });

  it('requires a usable alternate on the read and rechecks the committed pass at release', () => {
    const canReceive = new HalvesSim();
    canReceive.setup('home').fiveEighth.subFor = 0;
    expect(canReceive.commit()?.to.slot).toBe(KICKER);

    const down = new HalvesSim();
    down.setup('home').fiveEighth.lockUntil = 120;
    expect(down.commit()?.to.slot).toBe(KICKER);

    const movesAhead = new HalvesSim();
    const { h, fiveEighth } = movesAhead.setup('home');
    expect(movesAhead.commit()?.to.slot).toBe(FIVE_EIGHTH);
    fiveEighth.body.pos.x = h.body.pos.x + 1;
    expect(movesAhead.release().holder).toEqual({ side: 'home', slot: h.slot });
    expect(movesAhead.draws).toBe(1);
  });

  it('honours a directed last-tackle call and allows ordinary play with a nonempty playbook', () => {
    const directed = new HalvesSim();
    directed.setup('home');
    expect(directed.commit()?.to.slot).toBe(FIVE_EIGHTH);
    directed.callLast('forty-twenty');
    expect(directed.release().flight?.receiver?.slot).toBe(KICKER);

    const playbook = new HalvesSim(['block-play']);
    playbook.setup('home');
    expect(playbook.commit()).toBeUndefined();
    expect(playbook.release().flight?.receiver?.slot).toBe(FIVE_EIGHTH);
    expect(playbook.tickEvents.some(e => e.kind === 'set-play')).toBe(false);
  });

  it('can run or shift it wide and has no special authority after passing the ball away', () => {
    const run = new HalvesSim();
    const { fiveEighth } = run.setup('home');
    run.release();
    run.takePass();
    fiveEighth.body.pos.x = FIELD_LENGTH - 3;
    expect(run.makeLastPlay([0])).toBe('run');

    const shift = new HalvesSim();
    shift.setup('home');
    shift.release();
    shift.takePass();
    expect(shift.makeLastPlay([0.99])).toBe('pass');

    const lostAuthority = new HalvesSim();
    lostAuthority.setup('home');
    lostAuthority.release();
    lostAuthority.takePass();
    lostAuthority.passAwayAndBack();
    expect(lostAuthority.makeLastPlay([0, 0])).toBeNull();
  });

  it('restores the usual halfback pass with the alternate switch off', () => {
    const restore = applyTuning({ 'secondKicker.on': 0 });
    try {
      const sim = new HalvesSim();
      sim.setup('home');
      expect(sim.defenceAfterHeel().free).toBe(0);
      sim.setup('home');
      expect(sim.commit()?.to.slot).toBe(KICKER);
      expect(sim.release().flight?.receiver?.slot).toBe(KICKER);
      expect(sim.draws).toBe(1);
    } finally {
      restore();
    }
  });
});
