import { describe, expect, it } from 'vitest';
import { JOG_SPEED, REACT_HOLD_TICKS, STRIDE_METRES, pictureContext, playerPicture, reaction, tiredLevel } from '../../../src/match/view/playerPicture';
import { FATIGUE } from '../../../src/match/league/fatigue';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { labSheet } from '../../../src/match/lab/sheets';
import { Runner } from '../../../src/match/core/engine';
import { FACING_BAND, SIDE_BAND, screenFacing, screenPlayerFacing, screenHeading } from '../../../src/match/view/screenFacing';
import { fieldToWorldPoint } from '../../../src/scenes/matchField';
import { toFieldPt } from '../../../src/match/core/field';
import { DUMMY_PASS_PHASES } from '../../../src/art/prototype/player';
// Toward the home try line and the near touchline: up and to the right of the screen.
const p: PlayerSnap = { side: 'home', slot: 0, who: 'captain', x: 40, y: 20, pose: 'run', headX: -.6, headY: -.8, speed: 6, caughtTick: 100 };
describe('dummy-pass pictures', () => {
  it('shows the ball immediately when the fake has only a tick', () => {
    const carrier = { side: p.side, slot: p.slot, who: p.who! };
    const receiver = { side: p.side, slot: 1, who: 'support' };
    const defender = { side: 'away' as const, slot: 2, who: 'marker' };
    const dummyPass = { carrier, receiver, defender, startedTick: 120, untilTick: 121, towardY: 1 as const, bit: false };
    const picture = playerPicture(p, p, 120, carrier, 1, { dummyPass });
    expect(picture.action).toBe('dummyPass');
    expect(picture.frame % DUMMY_PASS_PHASES).toBe(1);
    expect(playerPicture(p, p, 121, carrier, 1, { dummyPass }).action).toBe('carry');
  });
  // Seed 6's square at 4050 moved with the open-side shift. Seeds 1–5, Reapers v Crocs: the first
  // square dummy still on screen four ticks later is seed 1, fake at 6223 and cleared at 6228.
  // Seed 2's bite is unchanged. With only the shift off, seed 6 at 4050–4055 still shows it.
  const showsDummy = (seed: number, start: number, end: number) => {
    const runner = new Runner(n => new LiveSim(labSheet('rival-reapers'), labSheet('rival-crocs'), n), seed);
    runner.seek(start);
    const fake = runner.cur.dummyPass!;
    const player = (s: Snapshot, ref: typeof fake.carrier) => s.players.find(q => q.side === ref.side && q.slot === ref.slot && q.who === ref.who)!;
    const current = (flip: number) => {
      const { cur, prev } = runner;
      const carrier = player(cur, fake.carrier), old = player(prev, fake.carrier);
      const ctx = pictureContext(cur, prev);
      const { dummyPass: _dummyPass, ...carryCtx } = ctx;
      const ordinary = playerPicture(carrier, old, cur.tick, cur.ball.holder, flip, carryCtx);
      const picture = playerPicture(carrier, old, cur.tick, cur.ball.holder, flip, ctx);
      return { carrier, ordinary, picture };
    };
    for (const offset of [0, 1, 4]) {
      runner.seek(start + offset);
      for (const flip of [1, -1]) {
        const { carrier, ordinary, picture } = current(flip);
        const receiver = player(runner.cur, fake.receiver);
        const aim = screenHeading(receiver.x - carrier.x, receiver.y - carrier.y, flip);
        const left = Math.abs(aim.x) < .2 ? screenHeading(0, fake.towardY, flip).x < 0 : aim.x < 0;
        const phase = offset === 0 ? 0 : offset === 1 ? 1 : 2;
        expect(picture).toMatchObject({ action: 'dummyPass', left, possession: true, strideFrame: ordinary.strideFrame,
          frame: phase + (left === ordinary.left ? 0 : DUMMY_PASS_PHASES) });
        expect(picture.movement).toBe(ordinary.movement);
      }
    }
    runner.seek(end);
    const { picture, ordinary } = current(1);
    expect(picture).toEqual(ordinary);
  };
  it.each([[2, 2607, 2613], [1, 6223, 6228]])('shows, retracts and clears on time in seed %i', showsDummy);
  it('with only the shift off, seed 6 still shows, retracts and clears on time', () => {
    const restore = applyTuning({ 'shapes.openSide.on': 0 });
    try { showsDummy(6, 4050, 4055); } finally { restore(); }
  });
});
describe('successful step pictures', () => {
  it('matches the cut and the missed reach for either end and mirrored view', () => {
    for (const dir of [1, -1] as const) for (const lateral of [1.6, -1.6]) for (const flip of [1, -1]) {
      const holder = { side: p.side, slot: p.slot };
      const runner: PlayerSnap = { ...p, headX: dir, headY: 0, step: { startedTick: 120, role: 'carrier', untilTick: 124, lateral } };
      const reachHeading = { headX: -dir, headY: -lateral };
      const defender: PlayerSnap = { ...p, ...reachHeading, side: 'away', slot: 1, pose: 'tackled', speed: 0, poseUntil: 132,
        step: { startedTick: 120, role: 'defender', untilTick: 132, reachX: reachHeading.headX, reachY: reachHeading.headY } };
      const cutX = screenHeading(0, lateral, flip).x;
      const plant = playerPicture(runner, runner, 120, holder, flip);
      expect(plant).toMatchObject({ action: 'carry', frame: 0, strideFrame: 0, possession: true, lift: 0 });
      expect(plant.movement).toBe(cutX * (plant.left ? -1 : 1) < 0 ? 'cutBack' : 'cutForward');
      expect(playerPicture(runner, runner, 122, holder, flip)).toMatchObject({ frame: 3, strideFrame: 3, movement: plant.movement });
      expect(playerPicture(runner, runner, 124, holder, flip).movement).toBeUndefined();
      const reach = playerPicture(defender, defender, 120, holder, flip);
      expect(reach).toMatchObject({ action: 'wrongFoot', frame: 0, possession: false, left: screenHeading(reachHeading.headX, reachHeading.headY, flip).x < 0, lift: 0 });
      expect(playerPicture(defender, defender, 125, null, flip)).toMatchObject({ action: 'wrongFoot', frame: 2 });
      expect(playerPicture(defender, defender, 131, null, flip)).toMatchObject({ action: 'wrongFoot', frame: 5 });
      expect(playerPicture({ ...defender, pose: 'run' }, defender, 132, null, flip).action).toBe('run');
      const { step: _step, ...oldDefender } = defender;
      expect(playerPicture(oldDefender, oldDefender, 120, holder, flip).action).toBe('tackled');
      const contact = playerPicture({ ...runner, pose: 'tackled' }, runner, 122, holder, flip);
      expect(contact.action).toBe('tackled');
      expect(contact.movement).toBeUndefined();
      expect(playerPicture({ ...runner, pose: 'pass' }, runner, 122, null, flip)).toMatchObject({ action: 'pass', possession: false });
    }
  });
  it('reaches toward the original lane in a live step and when seeking directly into the miss', () => {
    const home = labSheet('rival-reapers'), away = labSheet('rival-wolves');
    const runner = new Runner(seed => new LiveSim(home, away, seed), 34);
    const samePlayer = (s: Snapshot, q: PlayerSnap) => s.players.find(r => r.side === q.side && r.slot === q.slot && r.who === q.who)!;
    // Pick an actual, side-on approach where flipping the jink would turn the defender away from the runner.
    // Seed 34 had one before goal-line stands; a later seed still does when that match no longer does.
    const sideOn = (s: Snapshot) => {
      if (!s.events.some(e => e.kind === 'step')) return false;
      const c = s.players.find(q => q.step?.role === 'carrier' && q.step.startedTick === s.tick);
      const d = s.players.find(q => q.step?.role === 'defender' && q.step.startedTick === s.tick);
      if (c?.step?.role !== 'carrier' || !d) return false;
      const oldC = samePlayer(runner.prev, c), oldD = samePlayer(runner.prev, d);
      const aim = { headX: oldC.x - oldD.x, headY: oldC.y - oldD.y };
      const facing = screenPlayerFacing(aim, oldD);
      return facing.facing === 'side' && facing.left !== (screenHeading(0, c.step.lateral).x > 0);
    };
    const witness = () => {
      const c = runner.cur.players.find(q => q.step?.role === 'carrier' && q.step.startedTick === runner.cur.tick);
      const d = runner.cur.players.find(q => q.step?.role === 'defender' && q.step.startedTick === runner.cur.tick);
      return !!(c && d);
    };
    for (const seed of [34, 1, 2, 3, 5, 8, 13, 21, 35, 36, 40, 41]) {
      if (seed !== 34) runner.reseed(seed);
      runner.skipUntil(sideOn);
      if (witness()) break;
    }
    const { cur: award, prev: before } = runner;
    const c = award.players.find(q => q.step?.role === 'carrier' && q.step.startedTick === award.tick);
    const d = award.players.find(q => q.step?.role === 'defender' && q.step.startedTick === award.tick);
    expect(c && d, 'fixture must contain a side-on step').toBeTruthy();
    const oldCarrier = samePlayer(before, c!), oldDefender = samePlayer(before, d!);
    const reachX = oldCarrier.x - oldDefender.x, reachY = oldCarrier.y - oldDefender.y;
    expect(d!.step).toMatchObject({ reachX, reachY });
    for (const flip of [1, -1]) {
      const picture = playerPicture(d!, oldDefender, award.tick, award.ball.holder, flip, pictureContext(award, before));
      expect(picture).toMatchObject({ action: 'wrongFoot', facing: 'side', left: screenHeading(reachX, reachY, flip).x < 0 });
    }
    runner.skipUntil(s => s.tick >= award.tick + 5);
    const select = (flip: number) => playerPicture(samePlayer(runner.cur, d!), samePlayer(runner.prev, d!), runner.tick, runner.cur.ball.holder, flip, pictureContext(runner.cur, runner.prev));
    const played = [select(1), select(-1)];
    expect(played[0]).toMatchObject({ action: 'wrongFoot', frame: 2 });
    runner.seek(award.tick + 5);
    expect([select(1), select(-1)]).toEqual(played);
  });
});
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
  it('uses profiles for agreed horizontal headings, preserving shared contact and replay facing', () => {
    const headings = Array.from({ length: 3600 }, (_, i) => {
      const h = { headX: Math.cos(i * Math.PI / 1800), headY: Math.sin(i * Math.PI / 1800) };
      return { h, s: screenHeading(h.headX, h.headY) };
    }).filter(v => v.s.x > .5);
    const headingFor = (y: number) => headings.reduce((best, v) => Math.abs(v.s.y - y) < Math.abs(best.s.y - y) ? v : best).h;
    const horizontal = headingFor(0), vertical = headingFor(.6);
    const runner = { ...p, ...horizontal };
    expect(screenPlayerFacing(horizontal, horizontal)).toEqual({ facing: 'side', left: false });
    expect(screenPlayerFacing(horizontal, horizontal, -1)).toEqual({ facing: 'side', left: true });
    expect(screenPlayerFacing(horizontal, vertical).facing).not.toBe('side');
    // Either ordering of a one-tick wobble across the threshold selects the turn view.
    const inside = headingFor(SIDE_BAND - .02), outside = headingFor(SIDE_BAND + .02);
    expect(screenPlayerFacing(inside, outside).facing).toBe('front');
    expect(screenPlayerFacing(outside, inside).facing).toBe('front');
    const picture = playerPicture(runner, runner, 110, null, 1);
    expect(picture.facing).toBe('side');
    playerPicture({ ...runner, ...vertical }, runner, 111, null, 1);
    expect(playerPicture(runner, runner, 110, null, 1)).toEqual(picture);
    for (const pose of ['tackle', 'ptb', 'dummyHalf', 'kick'] as const) {
      expect(playerPicture({ ...runner, pose }, runner, 110, null, 1).facing).toBe(screenFacing(runner, runner).facing);
    }
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
  it('shows fatigue on the legs bar\'s own bands, and leaves the fresh exactly as they were (#666)', () => {
    const runner = { ...p, odometer: 3 };
    expect(tiredLevel({ ...runner, legs: FATIGUE.tiredAt })).toBe(0);
    expect(tiredLevel({ ...runner, legs: FATIGUE.tiredAt - .01 })).toBe(1);
    expect(tiredLevel({ ...runner, legs: FATIGUE.spentAt - .01 })).toBe(2);
    expect(tiredLevel({ ...runner, legs: 1, blown: true })).toBe(2);
    expect(tiredLevel(runner)).toBe(0);
    for (const legs of [undefined, 1, FATIGUE.tiredAt]) {
      const fresh = { ...runner, ...(legs === undefined ? {} : { legs }) };
      expect(playerPicture(fresh, fresh, 50, null, 1)).toEqual(playerPicture(runner, runner, 50, null, 1));
      expect('tired' in playerPicture(fresh, fresh, 50, null, 1)).toBe(false);
    }
    const tired = { ...runner, legs: .3 };
    expect(playerPicture(tired, tired, 50, null, 1)).toMatchObject({ action: 'run', tired: 1 });
    // A sprinter who has run his gas dry slumps on the run, whatever his legs.
    const blown = { ...runner, blown: true, legs: .9 };
    expect(playerPicture(blown, blown, 50, null, 1)).toMatchObject({ action: 'run', tired: 2 });
    // Spent and stood still: hands on knees, two frames from the tick; not with the ball, not in the bin.
    const still = { ...runner, pose: 'idle', speed: 0, legs: .1 };
    const heaves = Array.from({ length: 24 }, (_, t) => playerPicture(still, still, t, null, 1));
    expect(heaves.every(f => f.action === 'blowing' && f.tired === undefined)).toBe(true);
    expect(new Set(heaves.map(f => f.frame))).toEqual(new Set([0, 1]));
    expect(playerPicture(still, still, 5, { side: 'home', slot: 0 }, 1).action).toBe('carry');
    expect(playerPicture({ ...still, binned: true }, still, 5, null, 1).action).toBe('armsFolded');
    expect(playerPicture({ ...still, legs: .3 }, still, 5, null, 1)).toMatchObject({ action: 'idle', tired: 1 });
    // Handling keeps the tired posture through release; shared contact still owns its poses.
    const passer = { ...tired, pose: 'pass', poseUntil: 60, caughtTick: 45 };
    expect(playerPicture(passer, passer, 50, null, 1).tired).toBe(1);
  });
  it('shows a short reaction after an error or a missed goal, and folds the binned man\'s arms (#667)', () => {
    const runner = { ...p, odometer: 3, reactTick: 200, react: 'error' as const };
    const at = (q: PlayerSnap, tick: number, holder: Snapshot['ball']['holder'] = null, carrier?: { side: 'home' | 'away'; x: number; y: number }) =>
      playerPicture(q, q, tick, holder, 1, carrier ? { carrier } : {});
    // On the run: hands on head over the running legs, for REACT_HOLD_TICKS from the error, then the run again.
    expect(at(runner, 200)).toMatchObject({ action: 'handsOnHead', frame: 0 });
    expect(at(runner, 200).strideFrame).toBe(at({ ...p, odometer: 3 }, 200).strideFrame);
    expect(at(runner, 200 + REACT_HOLD_TICKS - 1).action).toBe('handsOnHead');
    expect(at(runner, 200 + REACT_HOLD_TICKS).action).toBe('run');
    expect(at(runner, 199).action).toBe('run');
    expect(at({ ...runner, react: 'miss' }, 205).action).toBe('handsOnHead');
    // Standing, two frames nod; the same frame on every replay.
    const still = { ...runner, pose: 'idle', speed: 0 };
    expect(new Set(Array.from({ length: 20 }, (_, t) => at(still, 200 + t).frame))).toEqual(new Set([0, 1]));
    expect(at(still, 209)).toEqual(at(still, 209));
    // Never while he is needed: with the ball, in a tackle, or with an opponent carrying it close by.
    expect(at(runner, 205, { side: 'home', slot: 0 }).action).toBe('carry');
    expect(at({ ...runner, pose: 'tackled', poseUntil: 210 }, 205).action).toBe('tackled');
    expect(at(runner, 205, null, { side: 'away', x: p.x + 3, y: p.y }).action).toBe('run');
    expect(at(runner, 205, null, { side: 'away', x: p.x + 20, y: p.y }).action).toBe('handsOnHead');
    expect(at(runner, 205, null, { side: 'home', x: p.x + 3, y: p.y }).action).toBe('handsOnHead');
    // The sin bin: arms folded on the touchline for as long as he is there, standing or walking off.
    const binned = { ...p, pose: 'idle', speed: 0, binned: true };
    expect(at(binned, 5000).action).toBe('armsFolded');
    expect(at({ ...binned, pose: 'run', speed: 2, odometer: 1 }, 5000)).toMatchObject({ action: 'armsFolded', frame: 0 });
    expect(reaction({ ...p, reactTick: 10, react: 'bin' }, 12, false)).toBeNull();
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
    expect(at({ ...line, binned: true }).action).toBe('armsFolded');
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
