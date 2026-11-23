import { describe, expect, it } from 'vitest';
import type { PlayId } from '../../../src/data/plays';
import { FIELD_LENGTH, MID_Y } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { other } from '../../../src/match/league/live/types';
import { FULLBACK } from '../../../src/match/league/roles';
import { TOUCH, type TapOrigin } from '../../../src/match/league/touch';
import { applyTuning } from '../../../src/match/league/tuning';
import { pictureContext, playerPicture } from '../../../src/match/view/playerPicture';
import { popupFor } from '../../../src/match/view/popups';

class TapSim extends LiveSim {
  draws = 0;

  constructor(plays?: PlayId[]) {
    super({ ...labSheet(DEFAULT_HOME, 'none'), ...(plays ? { plays } : {}) }, labSheet(DEFAULT_AWAY, 'none'), 658);
  }

  setup(side: Side, origin: TapOrigin | undefined, depth: number, shortMen = 2, toLine = 22) {
    this.tick = 100;
    const dir = this.dirOf(side);
    this.startSetPiece(side, { x: dir > 0 ? FIELD_LENGTH - toLine : toLine, y: MID_Y }, 'tap', FULLBACK, 0, origin);
    this.assignTargets();
    for (const p of this.players) {
      p.body.pos = { ...p.target };
      p.body.vel = { x: 0, y: 0 };
    }
    const defenders = [this.at(other(side), 4), this.at(other(side), 5)];
    for (const p of defenders.slice(0, shortMen)) p.body.pos.x -= dir * depth;
    this.rng.next = () => { this.draws++; return 0.99; };
    return defenders;
  }

  captainStats(iq: number, hothead = false) {
    const captain = this.onFieldCaptain(this.attacking)!;
    for (const p of this.side(this.attacking)) {
      if (p !== captain) p.stats.footyIQ = Math.min(p.stats.footyIQ, iq - 1);
    }
    captain.stats.footyIQ = iq;
    captain.traits = hothead ? [{ id: 'hothead', level: 1 }] : [];
  }

  replaceCaptain(iq: number) {
    const captain = this.onFieldCaptain(this.attacking)!;
    captain.binUntilS = 999;
    this.refreshOnField();
    this.captainStats(iq);
  }

  holdControl() {
    this.pendingControl[this.attacking] = { tick: this.tick, side: this.attacking, kind: 'pass-left' };
  }

  calledPenalty() {
    this.penaltyUp = { side: this.attacking, mark: this.mark, choice: 'tap', shot: 1, phase: this.phase, called: true };
  }

  release(age: number) {
    if (this.phase.kind === 'set-piece') {
      this.tick = this.phase.t0 + age;
      this.stepSetPiece(this.phase);
    }
    return this.tickEvents.find(e => e.kind === 'quick-tap' || e.kind === 'tap');
  }

  checkRetreat() {
    const h = this.holder()!;
    const short = this.at(other(h.side), 4), back = this.at(other(h.side), 5);
    const line = this.mark.x + this.dir * LIVE.onsideM;
    // Put the short defender within contact, and put the legal defender back in front.
    short.body.pos = { x: h.body.pos.x, y: h.body.pos.y };
    back.body.pos = { x: line, y: h.body.pos.y };
    const ineligible = this.retreatLine(short);
    const legal = this.retreatLine(back);
    const canTackle = this.committed(h, [short]).includes(short);
    short.body.pos.x = line;
    const crossed = this.retreatLine(short);
    short.body.pos.x = line - this.dir;
    return { line, ineligible, legal, canTackle, crossed, returns: this.retreatLine(short) };
  }
}

describe('quick taps', () => {
  it.each(['home', 'away'] as const)('starts from the mark against an actual retreat, %s attacking', side => {
    const sim = new TapSim();
    const defenders = sim.setup(side, 'penalty', 8);
    const positions = defenders.map(d => ({ ...d.body.pos }));
    sim.captainStats(60);
    expect(sim.release(TOUCH.setMinTicks - 1)).toBeUndefined();
    const event = sim.release(TOUCH.setMinTicks)!;
    expect(event).toMatchObject({ kind: 'quick-tap', side, detail: 'penalty' });
    expect(popupFor(event)?.word).toBe('QUICK TAP!');
    expect(defenders.map(d => d.body.pos)).toEqual(positions);
    const check = sim.checkRetreat();
    expect(check).toMatchObject({ ineligible: check.line, legal: null, canTackle: false, crossed: null, returns: null });
    expect(sim.draws).toBe(0);
  });

  it('uses the current captain’s IQ and Hothead on a marginal retreat', () => {
    const fresh = () => {
      const sim = new TapSim();
      sim.setup('home', '20m', 4.25, 2, 80);
      sim.captainStats(60);
      return sim;
    };
    expect(fresh().release(TOUCH.setMinTicks)).toBeUndefined();
    const high = fresh();
    high.captainStats(80);
    expect(high.release(TOUCH.setMinTicks)?.kind).toBe('quick-tap');
    const hot = fresh();
    hot.captainStats(60, true);
    expect(hot.release(TOUCH.setMinTicks)?.kind).toBe('quick-tap');
    const changed = fresh();
    changed.replaceCaptain(80);
    expect(changed.release(TOUCH.setMinTicks)?.kind).toBe('quick-tap');
  });

  it('requires a real opening and respects ordinary restarts and explicit calls', () => {
    const noOpening = new TapSim();
    noOpening.setup('home', 'penalty', 8, 1);
    expect(noOpening.release(TOUCH.setMinTicks)).toBeUndefined();
    expect(noOpening.release(TOUCH.setMaxTicks)?.kind).toBe('tap');

    for (const option of ['touch', 'control', 'coach', 'tap-play', 'off'] as const) {
      const sim = new TapSim(option === 'tap-play' ? ['tap-rambo'] : undefined);
      sim.setup('home', option === 'touch' ? undefined : 'penalty', 8);
      sim.captainStats(60);
      if (option === 'control') sim.holdControl();
      if (option === 'coach') sim.calledPenalty();
      const restore = applyTuning(option === 'off' ? { 'quickTap.on': 0 } : {});
      try {
        expect(sim.release(TOUCH.setMinTicks), option).toBeUndefined();
        const tap = sim.release(TOUCH.setMaxTicks);
        expect(tap?.kind, option).toBe('tap');
        expect(tap?.detail, option).toBeUndefined();
        expect(sim.snapshot().quickTap, option).toBeUndefined();
      } finally {
        restore();
      }
    }
    const ptbOnly = new TapSim(['block-play']);
    ptbOnly.setup('home', 'penalty', 8);
    expect(ptbOnly.release(TOUCH.setMinTicks)?.kind).toBe('quick-tap');
  });

  it('carries a seekable boot-touch cue, then restores the normal carry', () => {
    const sim = new TapSim();
    sim.setup('home', '20m', 8, 2, 80);
    sim.release(TOUCH.setMinTicks);
    const snap = sim.snapshot();
    const marker = snap.quickTap!;
    const carrier = snap.players.find(p => p.side === marker.player.side && p.slot === marker.player.slot)!;
    const picture = (age: number, holder = snap.ball.holder) =>
      playerPicture(carrier, carrier, snap.tick + age, holder, 1, pictureContext(snap));
    expect(marker.tick).toBe(snap.tick);
    expect(picture(0)).toMatchObject({ action: 'quickTap', frame: 0, possession: true });
    expect(picture(4)).toMatchObject({ action: 'quickTap', frame: 2, possession: true });
    expect(picture(10)).toMatchObject({ action: 'carry', possession: true });
    expect(picture(4, null).action).not.toBe('quickTap');
  });
});
