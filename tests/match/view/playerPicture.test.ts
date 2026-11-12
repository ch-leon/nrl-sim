import { describe, expect, it } from 'vitest';
import { JOG_SPEED, STRIDE_METRES, pictureContext, playerPicture } from '../../../src/match/view/playerPicture';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';
import { LIVE } from '../../../src/match/league/live/knobs';
import { FACING_BAND, screenFacing, screenHeading } from '../../../src/match/view/screenFacing';
import { fieldToWorldPoint } from '../../../src/scenes/matchField';
import { toFieldPt } from '../../../src/match/core/field';
// Toward the home try line and the near touchline: up and to the right of the screen.
const p: PlayerSnap = { side: 'home', slot: 0, who: 'captain', x: 40, y: 20, pose: 'run', headX: -.6, headY: -.8, speed: 6, caughtTick: 100 };
describe('live player presentation', () => {
  it('catches during forward movement and tucks into a carry, with stable direction', () => {
    const holder = { side: 'home' as const, slot: 0 };
    expect(playerPicture(p, p, 101, holder, 1)).toMatchObject({ who: 'captain', action: 'catch', possession: true, facing: 'back' });
    expect(playerPicture(p, p, 105, holder, 1).action).toBe('carry');
    expect(playerPicture(p, p, 105, null, 1)).toMatchObject({ action: 'run', possession: false });
    expect(playerPicture(p, p, 105, holder, -1).left).toBe(true);
  });
  it('does not advance a paused picture or reassign possession after a strip', () => {
    const picture = playerPicture(p, p, 106, null, 1);
    playerPicture(p, p, 220, null, 1);
    expect(playerPicture(p, p, 106, null, 1)).toEqual(picture);
    expect(playerPicture(p, p, 106, { side: 'away', slot: 0 }, 1).possession).toBe(false);
  });
  it('keeps the catch gait in step with a carry while the hands tuck independently', () => {
    const holder = { side: 'home' as const, slot: 0 };
    const frames = [100, 101, 102, 103].map(t => playerPicture(p, p, t, holder, 1));
    expect(frames.map(f => f.frame)).toEqual([0, 1, 3, 5]);
    expect(new Set(frames.map(f => f.strideFrame)).size).toBeGreaterThan(1);
    for (const tick of [100, 101, 102, 103]) {
      const carry = playerPicture({ ...p, caughtTick: 1 }, p, tick, holder, 1);
      expect(playerPicture(p, p, tick, holder, 1).strideFrame).toBe(carry.strideFrame);
    }
    expect(playerPicture({ ...p, speed: 0 }, p, 101, holder, 1).strideFrame).toBe(-1);
  });
  it('waits for the actual pickup, then scoops over the available dummy-half hold', () => {
    const dh = { ...p, pose: 'dummyHalf', caughtTick: 110, poseUntil: 120 };
    const holder = { side: 'home' as const, slot: 0 };
    expect(playerPicture(dh, dh, 108, null, 1)).toMatchObject({ frame: 0, possession: false });
    expect(playerPicture(dh, dh, 110, holder, 1)).toMatchObject({ frame: 0, possession: true });
    expect(playerPicture(dh, dh, 110 + LIVE.dhHoldTicks - 1, holder, 1).frame).toBe(5);
    const sample = playerPicture(dh, dh, 112, holder, 1);
    playerPicture(dh, dh, 300, null, 1);
    expect(playerPicture(dh, dh, 112, holder, 1)).toEqual(sample);
  });
  it('finishes the heel and pass follow-through before their simulation deadlines', () => {
    const holder = { side: 'home' as const, slot: 0 };
    const ptb = { ...p, pose: 'ptb', poseUntil: 100 + LIVE.ptbTicks };
    expect(playerPicture(ptb, ptb, 100, holder, 1).frame).toBe(0);
    expect(playerPicture(ptb, ptb, ptb.poseUntil - 1, holder, 1).frame).toBe(5);
    for (const duration of [5, 9]) {
      const passer = { ...p, pose: 'pass', caughtTick: 100, poseUntil: 100 + duration };
      expect(playerPicture(passer, passer, 100, null, 1)).toMatchObject({ frame: 0, possession: false });
      expect(playerPicture(passer, passer, 100 + duration - 1, null, 1).frame).toBe(5);
    }
  });
  it('faces by how the heading moves on screen, not by the field axes', () => {
    const at = (x: number, y: number) => { const f = toFieldPt({ x, y }); return fieldToWorldPoint(f.fx, f.fy, 0); };
    for (let deg = 0; deg < 360; deg += 5) {
      const h = { headX: Math.cos(deg * Math.PI / 180), headY: Math.sin(deg * Math.PI / 180) };
      const a = at(50, 34), b = at(50 + h.headX, 34 + h.headY);
      const s = { x: b.x - a.x, y: b.y - a.y }, m = Math.hypot(s.x, s.y);
      expect(screenHeading(h.headX, h.headY).x).toBeCloseTo(s.x / m);
      expect(screenHeading(h.headX, h.headY).y).toBeCloseTo(s.y / m);
      const { facing, left } = screenFacing(h, h);
      if (Math.abs(s.y / m) > FACING_BAND) expect(facing).toBe(s.y < 0 ? 'back' : 'front');
      if (Math.abs(s.x / m) > FACING_BAND) expect(left).toBe(s.x < 0);
    }
    // A carrier running at either try line: his back going up the screen, his face coming down it.
    const holder = { side: 'home' as const, slot: 0 };
    const toZero = { ...p, headX: -1, headY: 0 }, toHundred = { ...p, headX: 1, headY: 0 };
    expect(playerPicture(toZero, toZero, 110, holder, 1)).toMatchObject({ action: 'carry', facing: 'back', left: true });
    expect(playerPicture(toHundred, toHundred, 110, holder, 1)).toMatchObject({ action: 'carry', facing: 'front', left: false });
    expect(playerPicture(toZero, toZero, 110, holder, -1).left).toBe(false);
  });
  it('does not flicker as a straight run steps across a view boundary and back', () => {
    // The field heading (running right on screen) whose screen-down component is `y`.
    const headingFor = (y: number) => {
      let best = { headX: 1, headY: 0 }, err = Infinity;
      for (let d = 0; d < 360; d += .05) {
        const h = { headX: Math.cos(d * Math.PI / 180), headY: Math.sin(d * Math.PI / 180) };
        const s = screenHeading(h.headX, h.headY);
        if (s.x > 0 && Math.abs(s.y - y) < err) { err = Math.abs(s.y - y); best = h; }
      }
      return best;
    };
    const views = (ys: number[]) => {
      const hs = ys.map(headingFor);
      return hs.map((h, i) => screenFacing(h, hs[Math.max(0, i - 1)]!).facing);
    };
    const changes = (v: string[]) => v.filter((x, i) => i > 0 && x !== v[i - 1]).length;
    // Down the screen to up it and back again, a little each tick: one change each way.
    const sweep = Array.from({ length: 21 }, (_, i) => .5 - i * .05);
    expect(changes(views([...sweep, ...sweep.slice().reverse()]))).toBe(2);
    // A run wobbling either side of a band edge holds the view it came in with.
    for (const edge of [-FACING_BAND, FACING_BAND]) {
      const wobble = Array.from({ length: 16 }, (_, i) => edge + (i % 2 ? .03 : -.03));
      expect(new Set(views(wobble)).size).toBe(1);
    }
    // Straight along the boundary itself: the same view every tick.
    expect(new Set(views(Array.from({ length: 8 }, () => .01))).size).toBe(1);
  });
  it('advances the feet one full cycle per fixed distance at any pace', () => {
    const at = (speed: number, odometer: number, tick: number) => {
      const snap = { ...p, speed, odometer };
      return playerPicture(snap, snap, tick, null, 1).strideFrame!;
    };
    // The same ground covered at 3 m/s and at 9 m/s (three times as many ticks at 3): the same frames.
    for (let tick = 0; tick < 60; tick++) {
      const metres = tick * 9 * .05;
      expect(at(9, metres, tick)).toBe(at(JOG_SPEED, metres, tick * 3));
      expect(at(9, metres + STRIDE_METRES, tick)).toBe(at(9, metres, tick));
    }
    // A sprint shows every frame of the cycle, never skipping one between ticks (no wagon-wheel).
    const sprint = Array.from({ length: 40 }, (_, t) => at(9, t * 9 * .05, t));
    expect(new Set(sprint).size).toBe(6);
    sprint.forEach((f, t) => { if (t > 0) expect((f - sprint[t - 1]! + 6) % 6).toBeLessThanOrEqual(1); });
    // Below sprint pace the stride ramps in with the shorter jogging frames; standing plants the feet.
    expect(at(2, 1, 0)).toBeGreaterThanOrEqual(6);
    expect(at(.4, 1, 0)).toBe(-1);
    // The picture's frame matches the gait, so run and carry add no cache entries beyond the stride.
    const snap = { ...p, odometer: 2.5 };
    const pic = playerPicture(snap, snap, 140, null, 1);
    expect(pic.frame).toBe(pic.strideFrame! % 6);
  });
  it('breathes when standing still, the same on every replay', () => {
    const still = { ...p, pose: 'idle', speed: 0, odometer: 10 };
    const frames = Array.from({ length: 60 }, (_, t) => playerPicture(still, still, t, null, 1));
    expect(new Set(frames.map(f => f.frame))).toEqual(new Set([0, 1]));
    expect(frames.every(f => f.action === 'idle')).toBe(true);
    expect(playerPicture(still, still, 17, null, 1)).toEqual(frames[17]);
  });
  it('sets the defensive line for the play-the-ball, not the markers or the attack (#665)', () => {
    const ptb: PlayerSnap = { ...p, side: 'away', slot: 4, x: 50, y: 30, pose: 'ptb', speed: 0, poseUntil: 110 };
    const line: PlayerSnap = { ...p, slot: 2, x: 60, y: 22, pose: 'idle', speed: 0 };
    const marker: PlayerSnap = { ...p, slot: 7, x: 51.8, y: 30, pose: 'idle', speed: 0 };
    const mate: PlayerSnap = { ...p, side: 'away', slot: 1, x: 44, y: 20, pose: 'idle', speed: 0 };
    const snap = (players: PlayerSnap[], tick: number, holder: Snapshot['ball']['holder']): Snapshot => ({ tick, players, ball: { x: 50, y: 30, lift: 0, holder }, label: '', events: [] });
    const s = snap([ptb, line, marker, mate], 100, { side: 'away', slot: 4 });
    const ctx = pictureContext(s);
    const at = (q: PlayerSnap, tick = 100) => playerPicture(q, q, tick, s.ball.holder, 1, ctx);
    expect(at(line).action).toBe('ready');
    expect(at(marker).action).toBe('idle');
    expect(at(mate).action).toBe('idle');
    expect(at({ ...line, speed: 3, pose: 'run' }).action).toBe('run');
    expect(at({ ...line, binned: true }).action).toBe('idle');
    // A two-frame bounce from the tick, the same on every replay.
    const bounce = Array.from({ length: 16 }, (_, t) => at(line, 100 + t).frame);
    expect(new Set(bounce)).toEqual(new Set([0, 1]));
    expect(at(line, 103)).toEqual(at(line, 103));
    // The dummy half has it and is about to pass: the line rises; once he has, it is idle again.
    const dh: PlayerSnap = { ...ptb, pose: 'dummyHalf', caughtTick: 120, poseUntil: 128 };
    const lifting = snap([dh, line], 126, { side: 'away', slot: 4 });
    expect(playerPicture(line, line, 126, lifting.ball.holder, 1, pictureContext(lifting))).toMatchObject({ action: 'ready', frame: 2 });
    const waiting = snap([dh, line], 118, null);
    expect(playerPicture(line, line, 118, null, 1, pictureContext(waiting)).frame).toBeLessThan(2);
    expect(pictureContext(snap([{ ...dh, pose: 'run' }, line], 129, null)).ruck).toBeUndefined();
  });
});
