import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { FIELD_LENGTH, MID_Y } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { TOUCH } from '../../../src/match/league/touch';
import { applyTuning } from '../../../src/match/league/tuning';
import { popupFor } from '../../../src/match/view/popups';

class StandSim extends LiveSim {
  constructor(ends: 1 | -1 = 1) {
    super(sideSheet('H', { bench: 0 }), sideSheet('A', { bench: 0 }), 1);
    this.ends = ends;
    this.rng.next = () => 0.99;
  }

  private spot(side: Side, metres: number) {
    return { x: this.dirOf(side) > 0 ? FIELD_LENGTH - metres : metres, y: MID_Y };
  }

  awardTap(side: Side, metres: number) {
    this.takePenalty(side, this.spot(side, metres), 'tap');
  }

  releaseRestart() {
    if (this.phase.kind !== 'set-piece') throw new Error('Expected a restart');
    this.tick += TOUCH.setMaxTicks;
    this.stepSetPiece(this.phase);
  }

  sixAgain(side: Side, metres: number) {
    const c = this.at(side, 7), t = this.at(side === 'home' ? 'away' : 'home', 7);
    c.body.pos = this.spot(side, metres);
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.ball = { kind: 'held', by: this.indexOf(c) };
    this.stepTackle({ kind: 'tackle', t0: this.tick - LIVE.contactTicks, carrier: this.indexOf(c), tackler: this.indexOf(t), big: false, wrestle: null, wreck: 0 });
  }

  heel() {
    if (this.phase.kind !== 'ruck') throw new Error('Expected a ruck');
    this.phase.stage = 'ptb';
    this.tick += LIVE.ptbTicks;
    this.stepRuck(this.phase);
  }

  stripsBall() {
    const side = this.attacking === 'home' ? 'away' : 'home';
    const p = this.at(side, 7);
    p.body.pos = this.spot(side, FIELD_LENGTH - 10);
    this.ball = { kind: 'held', by: this.indexOf(p) };
    this.turnover('strip');
  }

  heldUp() {
    const h = this.at('home', 7), d = this.at('away', 7);
    h.body.pos = this.spot('home', -0.2);
    d.body.pos = { ...h.body.pos };
    d.lockUntil = d.cooldownUntil = 0;
    this.retreat = null;
    return this.heldUpAtLine(h);
  }

  collectKick(collectorSide: Side, metres: number, dropOut = false) {
    const kicker = this.kicker(dropOut ? 'away' : 'home');
    const collector = this.at(collectorSide, 1);
    const to = this.spot('home', metres);
    for (const p of this.players) {
      p.body.pos = { x: FIELD_LENGTH / 2, y: MID_Y };
      p.lockUntil = p.cooldownUntil = 0;
    }
    collector.body.pos = { ...to };
    this.pendingKick = {
      at: this.tick, kicker: this.indexOf(kicker), to, receiver: this.indexOf(collector),
      peak: 5, kind: 'chip', kickoff: dropOut, dropOut,
    };
    this.launchPendingKick();
    if (this.ball.kind !== 'flight') throw new Error('Expected a kick');
    this.tick += this.ball.ticks;
    this.landings();
  }

  groundForTry() { this.score(this.holder()!); }

  whistle() { this.endHalf(); }

  defendingWidth() {
    this.assignTargets();
    const y = this.side(this.attacking === 'home' ? 'away' : 'home').map((p) => p.target.y);
    return Math.max(...y) - Math.min(...y);
  }

  pressureAt(side: Side, metres: number) { return this.goalLinePressure(side, this.spot(side, metres)); }
}

describe('repeated sets on the line', () => {
  it.each([1, -1] as const)('counts the actual tap or heel once and tightens the line on the third set (direction %s)', (ends) => {
    const restore = applyTuning({ 'penalty.ruckSixAgain': 1 });
    try {
      const sim = new StandSim(ends);
      sim.awardTap('home', 20);
      expect(sim.goalLineStarts).toBe(0);
      const firstWidth = sim.defendingWidth();
      sim.releaseRestart();
      sim.sixAgain('home', 15);
      expect(sim.goalLineStarts).toBe(1);
      sim.heel();
      expect(sim.goalLineStarts).toBe(2);
      expect(sim.pressureAt('home', 20)).toBe(0.5);
      expect(sim.pressureAt('home', 21)).toBe(0);
      sim.awardTap('home', 20);
      expect(sim.defendingWidth()).toBeLessThan(firstWidth * 0.75);
      sim.releaseRestart();
      const third = sim.tickEvents.filter((e) => e.kind === 'goal-line-stand');
      expect(third).toHaveLength(1);
      expect(popupFor(third[0]!)?.word).toBe('THIRD SET');
      sim.awardTap('home', 20);
      sim.releaseRestart();
      expect(sim.tickEvents.filter((e) => e.kind === 'goal-line-stand')).toHaveLength(1);
      sim.stripsBall();
      expect(sim.goalLineStands).toEqual([{ side: 'home', sets: 4, outcome: 'strip' }]);
      expect(sim.pressureAt('home', 20)).toBe(0);
    } finally {
      restore();
    }
  });

  it('ends at a held-up ball, keeps the tackle count, and starts over after a retreat out of the 20 or the whistle', () => {
    const restore = applyTuning({ 'heldUp.base': 5, 'heldUp.max': 1 });
    try {
      const sim = new StandSim();
      const tap = (metres: number) => { sim.awardTap('home', metres); sim.releaseRestart(); };
      tap(10); tap(10); tap(10);
      expect(sim.heldUp()).toBe(true);
      sim.releaseRestart();
      sim.heel();
      expect(sim.tackleCount).toBe(1);
      expect(sim.goalLineStarts).toBe(3);
      expect(sim.goalLineStands).toEqual([{ side: 'home', sets: 3, outcome: 'held-up' }]);
      tap(10); tap(10); tap(21); tap(10); tap(10);
      expect(sim.goalLineStandInProgress).toBe(false);
      tap(10); sim.whistle();
      expect(sim.goalLineStands[1]).toEqual({ side: 'home', sets: 3, outcome: 'clock' });
      tap(10);
      expect(sim.pressureAt('home', 10)).toBe(0);
    } finally {
      restore();
    }
  });

  it('keeps the passage through a regather and a short drop-out, then credits the try from an in-goal regather', () => {
    const sim = new StandSim();
    sim.awardTap('home', 15);
    sim.releaseRestart();
    sim.collectKick('home', 10);
    sim.collectKick('home', 17, true);
    expect(sim.goalLineStarts).toBe(3);
    expect(sim.goalLineStandInProgress).toBe(true);
    sim.collectKick('home', -1);
    expect(sim.goalLineStarts).toBe(3);
    sim.groundForTry();
    expect(sim.goalLineStands).toEqual([{ side: 'home', sets: 3, outcome: 'try' }]);
  });

  it('ends a stand when the defence catches a kick or a long drop-out pushes the next set back', () => {
    for (const [collector, metres, dropOut, outcome] of [
      ['away', 10, false, 'turnover'], ['home', 35, true, 'outside-20'],
    ] as const) {
      const sim = new StandSim();
      for (let n = 0; n < 3; n++) { sim.awardTap('home', 15); sim.releaseRestart(); }
      sim.collectKick(collector, metres, dropOut);
      expect(sim.goalLineStands).toEqual([{ side: 'home', sets: 3, outcome }]);
    }
  });

  it('disables the count, the tightening and the announcement with the feature off', () => {
    const restore = applyTuning({ 'goalLineStand.on': 0, 'goalLineStand.compression': 1 });
    try {
      const sim = new StandSim();
      sim.awardTap('home', 20);
      const first = sim.defendingWidth();
      for (let n = 0; n < 3; n++) {
        sim.awardTap('home', 20);
        expect(sim.defendingWidth()).toBe(first);
        sim.releaseRestart();
      }
      expect(sim.goalLineStarts).toBe(0);
      expect(sim.tickEvents.some((e) => e.kind === 'goal-line-stand')).toBe(false);
    } finally {
      restore();
    }
  });
});
