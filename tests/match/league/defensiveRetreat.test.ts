import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { FIELD_LENGTH } from '../../../src/match/core/field';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { TOUCH } from '../../../src/match/league/touch';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import type { Player } from '../../../src/match/league/live/types';

class RetreatSim extends LiveSim {
  constructor(readonly direction: 1 | -1, readonly spot = FIELD_LENGTH / 2) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1);
    this.tick = 100; this.ends = direction;
    this.attacking = 'home'; this.dir = direction;
    for (const p of this.players) {
      p.lockUntil = p.cooldownUntil = p.busyUntil = 0;
      p.body.pos = { x: spot + direction * (p.side === 'away' ? 20 : -20), y: 4 + p.slot * 7 };
      p.body.vel = { x: 0, y: 0 };
    }
    this.players[7]!.body.pos = { x: spot, y: 34 };
    this.players[16]!.body.pos = { x: spot + direction * 1.8, y: 34 };
    this.players[17]!.body.pos = { x: spot + direction * 3.6, y: 34 };
    this.position(Math.min(7, (direction > 0 ? FIELD_LENGTH - spot : spot) - 1));
    this.ball = { kind: 'held', by: 7 };
    this.phase = { kind: 'tackle', t0: 0, carrier: 7, tackler: 16, big: false, wrestle: null, wreck: 0 };
    this.stepTackle(this.phase);
  }
  position(metres: number, index = 14) {
    this.players[index]!.body.pos = { x: this.spot + this.direction * metres, y: 34 };
  }
  release(dummyHalf = false) {
    if (this.phase.kind !== 'ruck') throw Error('expected ruck');
    this.phase.stage = 'ptb'; this.phase.t0 = this.tick - LIVE.ptbTicks;
    this.stepRuck(this.phase);
    this.phase = { kind: 'play' };
    const h = dummyHalf ? this.dummyHalf('home') : this.players[5]!;
    h.body.pos = { x: this.spot, y: 34 };
    this.ball = { kind: 'held', by: this.indexOf(h) };
    this.tick += LIVE.markerReleaseTicks * 3;
  }
  eligible(index = 14) { return this.committed(this.holder()!, [this.players[index]!]).length > 0; }
  target(index = 14) { this.assignTargets(); return this.players[index]!.target.x; }
  moveRetreat() { this.assignTargets(); this.move(); this.tick++; }
  x(index = 14) { return this.players[index]!.body.pos.x; }
  onside(index = 14) { return (this.x(index) - this.spot) * this.direction >= Math.min(LIVE.onsideM, this.direction > 0 ? FIELD_LENGTH - this.spot : this.spot); }
  changePossession() { this.turnover(); this.turnover(); }
  restart() { this.setForKickoff('home'); this.phase = { kind: 'play' }; this.ball = { kind: 'held', by: 5 }; }
  setPiece() { this.startSetPiece('home', { x: this.spot, y: 34 }, 'tap'); }
  binAndReturn() { const p = this.players[14]!; p.binUntilS = this.matchSeconds; this.refreshOnField(); this.binClock(); }
  replace() { this.swapIn(this.players[14]!, 0); }
  halfEnds() { this.endHalf(); this.phase = { kind: 'play' }; }
  handover() {
    if (this.phase.kind !== 'ruck') throw Error('expected ruck');
    this.phase.handover = true; this.phase.stage = 'ptb'; this.phase.t0 = this.tick - LIVE.ptbTicks;
    this.players[0]!.body.pos = { x: this.spot - this.dir * 7, y: 34 };
    this.stepRuck(this.phase);
    this.phase = { kind: 'play' }; this.ball = { kind: 'held', by: 14 };
    return this.committed(this.players[14]!, [this.players[0]!]).length;
  }
  setPiecePtb() {
    this.startSetPiece('home', { x: this.spot, y: 34 }, 'ptb');
    if (this.phase.kind !== 'set-piece') throw Error('expected set-piece');
    this.phase.t0 = this.tick - TOUCH.setMaxTicks;
    this.stepSetPiece(this.phase);
  }
}

describe('defensive retreat', () => {
  for (const dir of [1, -1] as const) {
    it(`keeps a short defender retreating after a quick heel in direction ${dir}`, () => {
      const sim = new RetreatSim(dir);
      sim.release();
      expect(sim.eligible()).toBe(false);
      expect((sim.target() - sim.spot) * dir).toBeGreaterThanOrEqual(LIVE.onsideM);
      for (let i = 0; i < 160 && !sim.onside(); i++) {
        expect(sim.eligible()).toBe(false);
        sim.moveRetreat();
      }
      expect(sim.onside()).toBe(true);
      expect(sim.eligible()).toBe(true);
    });
    it(`remembers reaching the fixed line even once the defence advances in direction ${dir}`, () => {
      const sim = new RetreatSim(dir);
      sim.release(); sim.position(10); expect(sim.eligible()).toBe(true);
      sim.position(4); expect(sim.eligible()).toBe(true);
      expect((sim.target() - sim.spot) * dir).toBeLessThan(10);
    });
    it(`keeps markers available for the dummy-half dart in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(true);
      expect(sim.eligible(16)).toBe(true);
      expect(sim.eligible(17)).toBe(true);
    });
    it(`uses the goal line when ten metres would enter in-goal in direction ${dir}`, () => {
      const sim = new RetreatSim(dir, dir > 0 ? FIELD_LENGTH - 5 : 5);
      sim.position(4); sim.release(); expect(sim.eligible()).toBe(false);
      sim.position(5); expect(sim.eligible()).toBe(true);
    });
    it(`clears old obligations after turnovers and kick-offs in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(); sim.changePossession();
      expect(sim.eligible()).toBe(true);
      const restarted = new RetreatSim(dir); restarted.release(); restarted.restart();
      expect(restarted.eligible()).toBe(true);
    });
    it(`clears the old ruck when a set-piece starts in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(); sim.setPiece();
      expect(sim.eligible()).toBe(true);
    });
    it(`starts fresh obligations at a handover in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); expect(sim.handover()).toBe(0);
    });
    it(`clears retreat history at the half-time whistle in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(); sim.halfEnds(); expect(sim.eligible()).toBe(true);
    });
    it(`requires a timed-out restart's short defenders to retire in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.setPiecePtb(); sim.release(); expect(sim.eligible()).toBe(false);
    });
    it(`requires an incoming player to reach the line himself in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(); sim.position(10); expect(sim.eligible()).toBe(true);
      sim.position(4); sim.replace(); expect(sim.eligible()).toBe(false);
    });
    it(`requires a sin-bin return to retire again in direction ${dir}`, () => {
      const sim = new RetreatSim(dir); sim.release(); sim.position(10); expect(sim.eligible()).toBe(true);
      sim.position(4); sim.binAndReturn(); expect(sim.eligible()).toBe(false);
    });
  }
});

// The reported seed selected Xavier Stampton before he had ever made ten metres.
// Audit the actual lab teams through successive rucks, independent of the sim's
// eligibility map, so quick heels and the following defensive advance are covered.
class LabRetreatSim extends LiveSim {
  private audit: { attacking: string; dir: number; line: number; eligible: Set<Player> } | null = null;
  checked = 0;
  shortHeels = 0;
  constructor() { super(labSheet(DEFAULT_HOME, 'none'), labSheet(DEFAULT_AWAY, 'none'), 1); }
  protected override startRetreat(): void {
    super.startRetreat();
    this.audit = { attacking: this.attacking, dir: this.dir,
      line: Math.max(0, Math.min(FIELD_LENGTH, this.mark.x + this.dir * LIVE.onsideM)),
      eligible: new Set(this.currentMarkers()) };
    this.observePositions();
  }
  private observePositions(): void {
    const a = this.audit;
    if (!a || !this.retreat || a.attacking !== this.attacking || a.dir !== this.dir) { this.audit = null; return; }
    for (const p of this.players) if (p.side !== this.attacking && (p.body.pos.x - a.line) * a.dir >= 0) a.eligible.add(p);
  }
  protected override committed(h: Player, defenders: readonly Player[]): Player[] {
    this.observePositions();
    const result = super.committed(h, defenders);
    if (this.audit) {
      for (const p of result) expect(this.audit.eligible.has(p), `${p.name} commits before retiring at tick ${this.tick}`).toBe(true);
      this.checked += result.length;
    }
    return result;
  }
  override step(): void {
    super.step(); this.observePositions();
    if (this.audit && this.phase.kind === 'ruck' && this.phase.stage === 'dh'
      && this.players.some(p => p.side !== this.attacking && !this.audit!.eligible.has(p))) this.shortHeels++;
  }
}

it('keeps the reported lab seed legal across quick heels and later rucks', () => {
  const sim = new LabRetreatSim();
  for (let i = 0; i < 1600; i++) sim.step();
  expect(sim.shortHeels).toBeGreaterThan(0);
  expect(sim.checked).toBeGreaterThan(100);
});
