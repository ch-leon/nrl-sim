import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import type { Vec } from '../../../src/match/core/vec';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { other } from '../../../src/match/league/live/types';
import type { CoachCall } from '../../../src/match/league/calls';
import { LONG_KICK, kickTarget, longKickTarget } from '../../../src/match/league/tactics';
import { applyTuning } from '../../../src/match/league/tuning';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';

const BOOT = { dist: 1, acc: 1 };

class KickSim extends LiveSim {
  draws = 0;

  constructor() {
    super(labSheet(DEFAULT_HOME, 'gen'), labSheet(DEFAULT_AWAY, 'gen'), 650);
  }

  punt(side: Side, shade: number, rolls: number[], options: { early?: boolean; call?: CoachCall; aim?: Vec } = {}) {
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.tackles = SET_TACKLES - (options.early ? 2 : 1);
    this.lastPlay = !options.early;
    this.tick = 100;
    this.phase = { kind: 'play' };
    this.callState[side].attack = options.call ?? null;
    const goal = this.dir > 0 ? FIELD_LENGTH : 0;
    const kicker = this.kicker(side);
    const fullback = this.fullback(other(side));
    for (const player of this.players) player.body.pos = { x: goal, y: MID_Y + shade };
    kicker.body.pos = { x: goal - this.dir * 85, y: MID_Y };
    kicker.catchTick = this.tick - LIVE.kickRunTicks;
    kicker.traits = [];
    kicker.lockUntil = 0;
    this.ball = { kind: 'held', by: this.indexOf(kicker) };
    if (options.aim) this.pendingControl[side] = { tick: this.tick, side, kind: 'kick', aim: options.aim };
    this.rng.next = () => {
      this.draws++;
      const roll = rolls.shift();
      if (roll === undefined) throw new Error('Unexpected kick roll');
      return roll;
    };
    this.stepPlay();
    this.tick += LIVE.kickContactTicks;
    this.launchPendingKick();
    if (this.ball.kind !== 'flight') throw new Error('No kick launched');
    expect(rolls).toHaveLength(0);
    const event = this.events.at(-1);
    expect(event).toMatchObject({ side, kind: 'kick', detail: 'long' });
    expect(this.ball.receiver).toBe(this.indexOf(fullback));
    return { from: this.ball.from, to: this.ball.to, peak: this.ball.peak, text: event?.text, draws: this.draws };
  }
}

describe('ordinary long punts into space (#650)', () => {
  it('uses the opposite lane from both edges, with the same depth and usable boot scatter in both directions', () => {
    for (const dir of [-1, 1] as const) {
      for (const edge of [-1, 1]) {
        const kicker = { x: FIELD_LENGTH / 2 - dir * 18, y: MID_Y + edge * 30 };
        const back = { x: kicker.x + dir * 32, y: MID_Y + edge * 28 };
        for (const roll of [0, 0.5, 1]) {
          const target = longKickTarget(kicker, dir, back, roll, BOOT, [back]);
          expect(target.x).toBeCloseTo(kickTarget(kicker, dir, back, roll, BOOT).x);
          expect((target.y - MID_Y) * edge).toBeLessThan(0);
          expect(target.y).toBeGreaterThanOrEqual(LONG_KICK.touchM);
          expect(target.y).toBeLessThanOrEqual(FIELD_WIDTH - LONG_KICK.touchM);
          expect(Math.abs(target.y - kicker.y)).toBeLessThanOrEqual(LONG_KICK.crossFieldM);
        }
        const first = longKickTarget(kicker, dir, back, 0, BOOT, [back]);
        const last = longKickTarget(kicker, dir, back, 1, BOOT, [back]);
        expect(first.y).toBeLessThan(last.y);
      }
    }
  });

  it('keeps the stock target for a centred fullback or when another defender already covers the lane', () => {
    const kicker = { x: 30, y: MID_Y };
    const boot = { dist: 1.2, acc: 0.75 };
    const centred = { x: 62, y: MID_Y + LONG_KICK.centreM };
    const shaded = { x: 62, y: MID_Y + 16 };
    expect(longKickTarget(kicker, 1, centred, 0.25, boot, [centred])).toEqual(kickTarget(kicker, 1, centred, 0.25, boot));
    const open = longKickTarget(kicker, 1, shaded, 0.25, boot, [shaded]);
    const stock = kickTarget(kicker, 1, shaded, 0.25, boot);
    expect(open).not.toEqual(stock);
    expect(open.x).toBe(stock.x);
    expect(longKickTarget(kicker, 1, shaded, 0.25, boot, [shaded, open])).toEqual(stock);
  });

  it('launches the ordinary kick into space on the last and on the second-last without an extra draw', () => {
    for (const side of ['home', 'away'] as const) {
      for (const shade of [-14, 14]) {
        const make = (early: boolean) => new KickSim().punt(side, shade, early ? [0, 0.99, 0.5] : [0, 0, 0.99, 0.99, 0.5], { early });
        for (const early of [false, true]) {
          const candidate = make(early);
          const restore = applyTuning({ 'longKick.on': 0 });
          try {
            const stock = make(early);
            const dir = candidate.from.x < FIELD_LENGTH / 2 ? 1 : -1;
            expect(stock.to).toEqual(kickTarget(stock.from, dir, { x: 0, y: MID_Y + shade }, 0.5));
            expect(candidate).toEqual({ ...stock, to: { x: stock.to.x, y: MID_Y - Math.sign(shade) * LONG_KICK.laneM } });
          } finally {
            restore();
          }
        }
      }
    }
  });

  it('preserves a Lab aim, coach calls and the territory branches that aim for a touchline', () => {
    const scenarios = [
      { rolls: [0.5], options: { aim: { x: 65, y: 48 } }, peak: 12 },
      { rolls: [0.99, 0.5], options: { early: true, call: 'kick-early' }, peak: 12 },
      { rolls: [0.5], options: { call: 'forty-twenty' }, peak: 11 },
      { rolls: [0, 0, 0, 0.5], options: {}, peak: 11 },
      { rolls: [0, 0, 0.99, 0, 0.5], options: {}, peak: 11 },
    ] as const;
    for (const { rolls, options, peak } of scenarios) {
      const make = () => new KickSim().punt('home', 14, [...rolls], options);
      const candidate = make();
      const restore = applyTuning({ 'longKick.on': 0 });
      try {
        expect(candidate.peak).toBe(peak);
        expect(candidate).toEqual(make());
      } finally {
        restore();
      }
    }
  });
});
