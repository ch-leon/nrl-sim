import { describe, expect, it } from 'vitest';
import { BODY_RADIUS } from '../../../src/match/core/body';
import { dist, type Vec } from '../../../src/match/core/vec';
import { sideSheet } from '../../../src/match/balance/measure';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import type { DefencePreset } from '../../../src/match/league/presets';

class MarkerSim extends LiveSim {
  constructor(dir: 1 | -1, mark: Vec = { x: 50, y: 34 }, defence: DefencePreset = 'slide') {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
    this.tick = 100; this.ends = dir;
    this.attacking = 'home'; this.dir = dir; this.mark = { ...mark };
    this.lineX = mark.x + dir * LIVE.onsideM;
    for (const p of this.players) {
      p.lockUntil = 0; p.busyUntil = 0; p.cooldownUntil = 0;
      p.body.pos = { x: mark.x + dir * (p.side === 'away' ? 20 : -20), y: 4 + p.slot * 7 };
      p.body.vel = { x: 0, y: 0 };
    }
    this.players[7]!.body.pos = { ...mark };
    this.players[16]!.body.pos = { x: mark.x + dir * 1.8, y: mark.y };
    this.players[17]!.body.pos = { x: mark.x + dir * 3.6, y: mark.y };
    this.ball = { kind: 'held', by: 7 };
    this.phase = { kind: 'ruck', stage: 'ptb', t0: this.tick, carrier: 7, tackler: 16, down: 0, pace: null, handover: false, heldAt: 0 };
  }
  targets(afterHeel = false) {
    if (afterHeel) {
      this.markers = this.currentMarkers().map(p => this.indexOf(p));
      this.ruckPlayedAt = this.tick;
      this.phase = { kind: 'play' };
      this.ball = { kind: 'held', by: 5 };
      this.players[5]!.body.pos = { x: this.mark.x - this.dir * 1.6, y: this.mark.y };
    }
    this.assignTargets();
    return [16, 17].map(i => ({ ...this.players[i]!.target }));
  }
  settle(offAxis = false) {
    if (offAxis) {
      this.players[16]!.body.pos = { x: this.mark.x + this.dir * 0.5, y: this.mark.y - 1.5 };
      this.players[17]!.body.pos = { x: this.mark.x + this.dir * 0.5, y: this.mark.y + 1.5 };
    }
    // Isolate ordinary body movement/separation from new tackles and ruck timing.
    for (const p of this.players) if (p !== this.players[16] && p !== this.players[17]) p.lockUntil = this.tick + 100;
    for (let i = 0; i < 100; i++) { this.assignTargets(); this.move(); }
    return [16, 17].map(i => ({ ...this.players[i]!.body.pos }));
  }
  commitments(afterRelease: boolean, dummyHalf = false) {
    this.targets(true);
    if (afterRelease) this.tick += Math.ceil(LIVE.markerReleaseTicks * this.defPlan().markerHold);
    const h = dummyHalf ? this.dummyHalf('home') : this.players[5]!;
    h.body.pos = { x: this.mark.x - this.dir * 1.6, y: this.mark.y };
    this.ball = { kind: 'held', by: this.indexOf(h) };
    this.assignTargets();
    return this.committed(h, this.side('away')).map(p => this.indexOf(p));
  }
}

describe('ruck markers', () => {
  for (const dir of [1, -1] as const) {
    for (const mark of [{ x: 50, y: 34 }, { x: 50, y: 0.5 }, { x: 50, y: 67.5 }, { x: 0.5, y: 34 }, { x: 99.5, y: 34 }]) {
      for (const afterHeel of [false, true]) {
        it(`stands square, one behind the other: direction ${dir}, mark ${mark.x}/${mark.y}, after heel ${afterHeel}`, () => {
          const [first, second] = new MarkerSim(dir, mark).targets(afterHeel) as [Vec, Vec];
          expect(first.y).toBe(mark.y); expect(second.y).toBe(mark.y);
          expect((first.x - mark.x) * dir).toBeGreaterThanOrEqual(2 * BODY_RADIUS - 1e-9);
          expect((second.x - first.x) * dir).toBeGreaterThanOrEqual(2 * BODY_RADIUS - 1e-9);
        });
      }
    }
    for (const offAxis of [false, true]) {
      it(`aligns bodies through movement and separation in direction ${dir}, approaching off axis ${offAxis}`, () => {
        const [first, second] = new MarkerSim(dir).settle(offAxis) as [Vec, Vec];
        // Arrive steering stops within 5 cm of its target (core/body.ts).
        expect(Math.abs(first.y - 34)).toBeLessThan(0.05);
        expect(Math.abs(second.y - 34)).toBeLessThan(0.05);
        expect((second.x - first.x) * dir).toBeGreaterThan(0);
        // Approaching bodies settle within the steering/separation tolerance.
        expect(dist(first, second)).toBeGreaterThanOrEqual(2 * BODY_RADIUS - 0.05);
        expect(dist(first, { x: 50, y: 34 })).toBeGreaterThanOrEqual(2 * BODY_RADIUS - 0.05);
      });
    }
    for (const defence of ['slide', 'rush', 'compressed'] as const) {
      it(`retains ${defence} hold/release and early dummy-half defence in direction ${dir}`, () => {
        expect(new MarkerSim(dir, undefined, defence).commitments(false)).not.toContain(16);
        expect(new MarkerSim(dir, undefined, defence).commitments(false)).not.toContain(17);
        expect(new MarkerSim(dir, undefined, defence).commitments(true)).toContain(16);
        expect(new MarkerSim(dir, undefined, defence).commitments(false, true)).toContain(16);
      });
    }
  }
});
