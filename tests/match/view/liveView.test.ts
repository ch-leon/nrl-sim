// tests/match/view/liveView.test.ts — snapshots → sprite placement with
// interpolation (BAK-207 view/). Fake actors, real field projection.
import { describe, it, expect } from 'vitest';
import { LIFT_PX_PER_M, LiveView, type ActorView, type BallView } from '../../../src/match/view/liveView';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { FIELD_WIDTH } from '../../../src/match/core/field';
import type { Snapshot, PlayerSnap } from '../../../src/match/core/snapshot';
import { caseSnapshot } from '../../../src/labs/art/contactCases';

interface FakeActor extends ActorView {
  x: number;
  y: number;
  depth: number;
  anim: string;
  faceLeft: boolean;
  scale: number;
}

function actor(): FakeActor {
  const a: FakeActor = {
    x: 0,
    y: 0,
    depth: 0,
    anim: '',
    faceLeft: false,
    scale: 1,
    place(x, y, depth) {
      a.x = x;
      a.y = y;
      a.depth = depth;
    },
    play(anim, faceLeft, timeScale) {
      a.anim = anim;
      a.faceLeft = faceLeft;
      a.scale = timeScale;
    },
  };
  return a;
}

function surface() {
  const off = fieldOffsetX();
  const ball = { x: 0, y: 0, lift: 0, depth: 0 } as BallView & { x: number; y: number; lift: number; depth: number };
  ball.place = (x, y, lift, depth) => Object.assign(ball, { x, y, lift, depth });
  const marks: ({ side: string; x: number; y: number } | null)[] = [];
  return {
    players: { home: Array.from({ length: 9 }, actor), away: Array.from({ length: 9 }, actor) },
    ball,
    marks,
    fieldToWorld: (fx: number, fy: number) => fieldToWorldPoint(fx, fy, off),
    focus: { carrier: (t: { side: 'home' | 'away'; x: number; y: number } | null) => void marks.push(t) },
  };
}

const player = (over: Partial<PlayerSnap>): PlayerSnap => ({ side: 'home', slot: 0, x: 50, y: FIELD_WIDTH / 2, pose: 'idle', headX: 1, speed: 0, ...over });

function snap(tick: number, players: PlayerSnap[], ball: Snapshot['ball']): Snapshot {
  return { tick, players, ball, label: '', events: [] };
}

describe('LiveView', () => {
  it('draws the real participants together, restores them after contact and paints only one ball', () => {
    const groups: unknown[] = []; const hidden = new Set<string>(); const balls: boolean[] = [];
    const s = { ...surface(), contact: { paint: (...args: unknown[]) => { groups.push(args[1]); } } };
    for (const side of ['home', 'away'] as const) s.players[side].forEach((actor, slot) => {
      actor.paint = () => {};
      actor.setSpriteVisible = visible => { if (visible) hidden.delete(`${side}/${slot}`); else hidden.add(`${side}/${slot}`); };
    });
    s.ball.setRendered = visible => balls.push(visible);
    const view = new LiveView(s);
    let previous = caseSnapshot('three', 0);
    for (let tick = 1; tick <= 30; tick++) { const next = caseSnapshot('three', tick); view.draw(previous, next, 1); previous = next; }
    expect([...hidden].sort()).toEqual(['away/1', 'away/5', 'away/7', 'home/4']);
    expect(groups[groups.length - 1]).not.toBeNull(); expect(balls[balls.length - 1]).toBe(false);
    for (let tick = 31; tick <= 58; tick++) { const next = caseSnapshot('three', tick); view.draw(previous, next, 1); previous = next; }
    expect(hidden.size).toBe(0); expect(groups[groups.length - 1]).toBeNull();
    const loose = { ...previous, tick: previous.tick + 1, ball: { ...previous.ball, holder: null } };
    view.draw(previous, loose, 1); expect(balls[balls.length - 1]).toBe(true);
  });

  it('does not interpolate an interchanged player from the previous occupant’s position', () => {
    const s = surface(); const view = new LiveView(s);
    const ball = { x: 0, y: 0, lift: 0, holder: null };
    const old = snap(1, [player({ who: 'old', x: 5 })], ball);
    const fresh = snap(2, [player({ who: 'new', x: 80 })], ball);
    view.draw(old, fresh, .1);
    expect(s.players.home[0]!.x).toBe(Math.round(fieldToWorldPoint(80, 50, fieldOffsetX()).x));
  });
  it('places players at the interpolated field point and the ball in the holder’s hand', () => {
    const s = surface();
    const view = new LiveView(s);
    const prev = snap(0, [player({ x: 40, y: 34 })], { x: 40, y: 34, lift: 1, holder: { side: 'home', slot: 0 } });
    const cur = snap(1, [player({ x: 44, y: 34, pose: 'run', speed: 7 })], { x: 44, y: 34, lift: 1, holder: { side: 'home', slot: 0 } });
    view.draw(prev, cur, 0.5, 1);
    const w = fieldToWorldPoint(42, 50, fieldOffsetX());
    const a = s.players.home[0]!;
    // Snapped to whole world pixels so moving sprites don't shimmer.
    expect(a.x).toBe(Math.round(w.x));
    expect(a.y).toBe(Math.round(w.y));
    expect(Number.isInteger(a.x) && Number.isInteger(a.y)).toBe(true);
    expect(a.depth).toBeCloseTo(Math.round(w.y) + 1, 2);
    expect(a.anim).toBe('run');
    expect(a.scale).toBeCloseTo(1); // 7 m/s is cadence 1
    expect(Math.abs(s.ball.x - Math.round(w.x))).toBe(4);
    expect(s.ball.lift).toBe(LIFT_PX_PER_M);
    expect(s.marks[s.marks.length - 1]).toMatchObject({ side: 'home' });
  });

  it('faces the way the body is heading on screen; still players keep their heading', () => {
    const s = surface();
    const view = new LiveView(s);
    const right = fieldToWorldPoint(60, 50, fieldOffsetX()).x > fieldToWorldPoint(40, 50, fieldOffsetX()).x;
    const cur = snap(1, [player({ headX: 1 }), player({ slot: 1, headX: -1, side: 'away' })], { x: 50, y: 34, lift: 0, holder: null });
    view.draw(cur, cur, 0, 1);
    expect(s.players.home[0]!.faceLeft).toBe(!right);
    expect(s.players.away[1]!.faceLeft).toBe(right);
    expect(s.marks[s.marks.length - 1]).toBeNull();
  });

  it('a flying ball is drawn at its lifted position with no carrier ring', () => {
    const s = surface();
    const view = new LiveView(s);
    const prev = snap(0, [], { x: 50, y: 34, lift: 0, holder: null });
    const cur = snap(1, [], { x: 60, y: 34, lift: 4, holder: null });
    view.draw(prev, cur, 0.25, 2);
    const w = fieldToWorldPoint(52.5, 50, fieldOffsetX());
    expect(s.ball.x).toBe(Math.round(w.x));
    expect(s.ball.lift).toBe(LIFT_PX_PER_M);
    expect(s.ball.depth).toBe(Math.round(w.y) + 2);
  });

  it('the hand offset fades over two ticks after a release, so the ball does not hop sideways', () => {
    const s = surface();
    const view = new LiveView(s);
    const held = { x: 50, y: 34, lift: 1, holder: { side: 'home' as const, slot: 0 } };
    const loose = { x: 50, y: 34, lift: 1, holder: null };
    const t0 = snap(0, [player({})], held);
    const t1 = snap(1, [player({})], held);
    const offsets: number[] = [];
    const w = Math.round(fieldToWorldPoint(50, 50, fieldOffsetX()).x);
    view.draw(t0, t1, 1);
    offsets.push(Math.abs(s.ball.x - w));
    let before = t1;
    for (let t = 2; t <= 4; t++) {
      const next = snap(t, [player({})], loose);
      view.draw(before, next, 1);
      offsets.push(Math.abs(s.ball.x - w));
      before = next;
    }
    expect(offsets).toEqual([4, 4, 2, 0]);
  });

  it('tells the ball its heading on screen and the tick it is drawn at, for its turn and spin', () => {
    const s = surface();
    const motions: unknown[] = [];
    s.ball.place = (_x, _y, _l, _d, m) => void motions.push(m);
    const view = new LiveView(s);
    const prev = snap(7, [], { x: 50, y: 34, lift: 0, holder: null });
    const cur = snap(8, [], { x: 60, y: 34, lift: 2, holder: null });
    view.draw(prev, cur, 0.5);
    const m = motions[0] as { dx: number; dy: number; t: number };
    expect(m.t).toBeCloseTo(7.5);
    const a = fieldToWorldPoint(50, 50, fieldOffsetX());
    const b = fieldToWorldPoint(60, 50, fieldOffsetX());
    expect(m.dx).toBeCloseTo(b.x - a.x);
    expect(m.dy).toBeCloseTo(b.y - a.y - 2 * LIFT_PX_PER_M);
  });

  it('run cadence scales with ground speed and playback speed, within bounds', () => {
    const s = surface();
    const view = new LiveView(s);
    const cur = snap(1, [player({ pose: 'run', speed: 3.5 }), player({ slot: 1, pose: 'run', speed: 20 }), player({ slot: 2, pose: 'idle', speed: 0 })], {
      x: 0,
      y: 0,
      lift: 0,
      holder: null,
    });
    view.draw(cur, cur, 0, 2);
    expect(s.players.home[0]!.scale).toBeCloseTo(1); // 0.5 cadence × ×2
    expect(s.players.home[1]!.scale).toBeCloseTo(3.4); // capped 1.7 × ×2
    expect(s.players.home[2]!.scale).toBe(2);
  });
});
