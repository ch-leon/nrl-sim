import { afterEach, describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { passFlight } from '../../../src/match/core/ball';
import { makeBody } from '../../../src/match/core/body';
import { FIELD_LENGTH, FIELD_WIDTH } from '../../../src/match/core/field';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { readShoulder } from '../../../src/match/league/live/centreCarry';
import { gapTarget } from '../../../src/match/league/tactics';
import { applyTuning } from '../../../src/match/league/tuning';

class EdgeSim extends LiveSim {
  draws = 0;

  constructor(slide: boolean, touch = 16.4, slot = 3) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 649);
    this.tick = 100;
    this.attacking = 'home';
    this.dir = 1;
    this.tackles = 1;
    this.phase = { kind: 'play' };
    this.lineX = 57;
    this.mark = { x: 49, y: 21 };
    for (const p of this.players) {
      p.body.pos = { x: p.side === 'home' ? 35 : 75, y: 31 + p.slot * 3 };
      p.body.vel = { x: 0, y: 0 };
      p.lockUntil = 0;
    }
    this.man(slot).body.pos = { x: 50, y: touch };
    this.man(slot).body.vel = { x: 4, y: 0 };
    this.man(12).body.pos = { x: 57, y: touch + 1.2 };
    this.man(12).body.vel = { x: -1, y: slide ? -4 : 0 };
    this.ball = passFlight({ x: 52, y: touch + 6 }, this.man(slot).body.pos, 90, slot);
    this.rng.next = () => { this.draws++; return 0.5; };
  }

  man(i: number) { return this.players[i]!; }
  decision() { return this.centreCarry; }
  actualTarget() { return this.holder()?.target; }
  normalTarget() { return gapTarget(this.holder()!.body.pos, this.dir, this.side('away').map(p => p.body.pos)); }
  land() { this.landings(); this.assignTargets(); }
  retarget() { this.assignTargets(); }
  expire() { this.tick += LIVE.centreShoulderTicks; this.assignTargets(); }
  stepInput() { this.controlList.push({ tick: this.tick + 1, side: 'home', kind: 'step-up' }); }
  markOffload() { this.offloadReceiver = 3; }
}

let restore: (() => void) | undefined;
afterEach(() => { restore?.(); restore = undefined; });

describe('ordinary edge centre carries (#649)', () => {
  it('straightens onto the outside shoulder of a defender holding inside', () => {
    const game = new EdgeSim(false);
    game.land();
    const read = game.decision()!;
    expect(read).toMatchObject({ carrier: { slot: 3 }, defender: { slot: 3, side: 'away' }, shoulder: 'outside' });
    expect(game.actualTarget()).toBe(read.target);
    expect(read.target.x).toBeGreaterThan(50);
    expect(read.target.y).toBeLessThan(16.4);
    expect(read.target.y).toBeGreaterThan(game.normalTarget().y);
    expect(game.draws).toBe(1);
    game.step();
    expect(game.man(3).body.pos.x).toBeGreaterThan(50);
    expect(game.man(3).body.pos.y).toBeLessThan(16.4);
  });

  it('cuts inside when that same defender slides early, then holds the read without more draws', () => {
    const game = new EdgeSim(true);
    game.land();
    const read = game.decision()!;
    expect(read).toMatchObject({ shoulder: 'inside', defender: { slot: 3, side: 'away' } });
    expect(read.target.y).toBeGreaterThan(16.4);
    expect(game.normalTarget().y).toBeLessThan(16.4);
    game.man(12).body.vel.y = 0;
    game.retarget();
    expect(game.actualTarget()).toBe(read.target);
    const before = game.man(3).body.pos;
    for (let i = 0; i < 4; ++i) game.step();
    expect(game.man(3).body.pos.x).toBeGreaterThan(before.x);
    expect(game.man(3).body.pos.y).toBeGreaterThan(before.y);
    expect(game.draws).toBe(1);
    game.expire();
    expect(game.decision()).toBeNull();
    expect(game.actualTarget()).toEqual(game.normalTarget());
  });

  it('reads fractional shoulder geometry the same way across either touchline and attacking direction', () => {
    const carrier = makeBody({ x: 49.83, y: 16.37 }, 7.43);
    for (const [label, lateral] of [['outside', 0.19], ['inside', -4.16]] as const) {
      const defender = { pos: { x: 56.19, y: 17.6 }, vel: { x: -0.74, y: lateral } };
      const read = readShoulder(carrier, 1, [defender])!;
      expect(read.shoulder).toBe(label);
      const mirrored = readShoulder(makeBody({ x: FIELD_LENGTH - carrier.pos.x, y: FIELD_WIDTH - carrier.pos.y }, carrier.maxSpeed), -1,
        [{ pos: { x: FIELD_LENGTH - defender.pos.x, y: FIELD_WIDTH - defender.pos.y }, vel: { x: -defender.vel.x, y: -defender.vel.y } }])!;
      expect(mirrored.shoulder).toBe(label);
      expect(mirrored.target.x).toBeCloseTo(FIELD_LENGTH - read.target.x);
      expect(mirrored.target.y).toBeCloseTo(FIELD_WIDTH - read.target.y);
    }
  });

  it('falls back when blocked, too close to touch, out of role or offloading', () => {
    const blocked = new EdgeSim(false);
    // Closer than a readable shoulder, but still a defender in the lane.
    blocked.man(13).body.pos = { x: 52, y: 16.4 };
    const touch = new EdgeSim(false, 3.2);
    const forward = new EdgeSim(false, 16.4, 8);
    const offload = new EdgeSim(true);
    offload.markOffload();
    for (const game of [blocked, touch, forward, offload]) {
      game.land();
      expect(game.decision()).toBeNull();
      expect(game.actualTarget()).toEqual(game.normalTarget());
    }
  });

  it('yields to a manual step and preserves the original catch and target with the knob off', () => {
    const controlled = new EdgeSim(true);
    controlled.land();
    expect(controlled.decision()).not.toBeNull();
    controlled.stepInput();
    controlled.step();
    expect(controlled.man(3).jink).not.toBeNull();
    expect(controlled.decision()).toBeNull();

    restore = applyTuning({ 'live.centreShoulderTicks': 0 });
    const legacy = new EdgeSim(true);
    legacy.land();
    expect(legacy.snapshot().ball.holder).toMatchObject({ side: 'home', slot: 3 });
    expect(legacy.decision()).toBeNull();
    expect(legacy.actualTarget()).toEqual(legacy.normalTarget());
    expect(legacy.draws).toBe(1);
  });
});
