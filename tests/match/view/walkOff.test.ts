// tests/match/view/walkOff.test.ts — the whistle's pictures (#675): the walk-off at half-time and
// full time, the huddle before golden point, and nobody snapping when the next phase takes over.
import { describe, expect, it } from 'vitest';
import { LivePlayback, type LivePlaybackScene } from '../../../src/match/view/livePlayback';
import { sideSheet } from '../../../src/match/balance/measure';
import { createNewGame } from '../../../src/core/state';
import type Phaser from 'phaser';
import { LiveSim } from '../../../src/match/league/live';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import type { ContactAnimation } from '../../../src/match/view/contactAnimation';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { toFieldPt } from '../../../src/match/core/field';
import { binnedSpot } from '../../../src/match/view/officials';
import { NINES } from '../../../src/match/league/rules';
import { applyTuning } from '../../../src/match/league/tuning';
import type { PlayerPicture } from '../../../src/match/view/playerPicture';
import type { Snapshot } from '../../../src/match/core/snapshot';
import seed15Whistle from '../../fixtures/seed15-whistle.json';
import { BreakClock, CAPTAIN_SLOT, FT_GONE, FT_FADE, RESTART_FADE, HT_FADE, TUNNEL, breakMan, breakScene } from '../../../src/match/view/walkOff';

interface Drawn { x: number; y: number; alpha: number; visible: boolean }
function surface() {
  const off = fieldOffsetX();
  const make = (): ActorView & Drawn => {
    const a = { x: 0, y: 0, alpha: 1, visible: true, place(x: number, y: number) { a.x = x; a.y = y; }, play() {}, fade(v: number) { a.alpha = v; }, setSpriteVisible(v: boolean) { a.visible = v; } };
    return a;
  };
  return {
    players: { home: Array.from({ length: 9 }, make), away: Array.from({ length: 9 }, make) },
    ball: { place() {} },
    fieldToWorld: (fx: number, fy: number) => fieldToWorldPoint(fx, fy, off),
  };
}

/** A decided full-time match after golden point, using the lab's default sides and seven-minute halves.
 * Impact interchanges stay off. Seeds 1–160: the first decided golden-point match is seed 29
 * (26–31). With the shift off, seed 103 is still the decided 14–15. The open-play dummy moves
 * seed 20 off golden point; with the dummy off as well, seed 20 is still the decided 13–12.
 * A draw at the end has no winner, so the pose check needs a decided score.
 */
function goldenSnaps(seed: number): Snapshot[] {
  const sim = new LiveSim(labSheet(DEFAULT_HOME), labSheet(DEFAULT_AWAY), seed, { goldenPoint: true, length: { halves: 2, halfMinutes: 7 } });
  const snaps: Snapshot[] = [sim.snapshot()];
  while (!sim.finished) { sim.step(); snaps.push(sim.snapshot()); }
  return snaps;
}

function decidedGolden(snaps: Snapshot[]): boolean {
  const golden = snaps.some((q) => q.phase?.kind === 'half-time' && !!q.phase.golden);
  const final = snaps[snaps.length - 1]!;
  return golden && final.score!.home !== final.score!.away;
}

function play(): Snapshot[] {
  const restore = applyTuning({ 'bench.impact.on': 0 });
  try {
    const snaps = goldenSnaps(29);
    if (!decidedGolden(snaps)) throw new Error('seed 29 is not a decided golden-point match');
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      if (!decidedGolden(goldenSnaps(103))) throw new Error('seed 103 is not a decided golden-point match with the shift off');
      const old = applyTuning({ 'live.dummyChance': 0 });
      try {
        if (!decidedGolden(goldenSnaps(20))) throw new Error('seed 20 is not a decided golden-point match with the dummy off');
      } finally { old(); }
    } finally { shiftOff(); }
    return snaps;
  } finally { restore(); }
}

describe('the whistle (#675)', () => {
  const snaps = play();
  const at = (pred: (s: Snapshot) => boolean) => snaps.findIndex(pred);
  const ht = at((s) => s.phase?.kind === 'half-time' && !s.phase.golden);
  const gp = at((s) => s.phase?.kind === 'half-time' && !!s.phase.golden);
  const ft = snaps.length - 1;

  it('reports the phase and the tick it began, the same on every read', () => {
    expect(ht).toBeGreaterThan(0); expect(gp).toBeGreaterThan(ht);
    expect(snaps[ht]!.phase).toEqual({ kind: 'half-time', since: snaps[ht]!.tick });
    expect(snaps[ht + 5]!.phase!.since).toBe(snaps[ht]!.tick);
    expect(snaps[gp]!.phase).toEqual({ kind: 'half-time', since: snaps[gp]!.tick, golden: true });
    expect(snaps[ft]!.phase!.kind).toBe('full-time');
    expect(snaps[0]!.phase).toEqual({ kind: 'restart', since: 0 });
  });

  it('walks both sides toward the tunnel and fades them, the winners celebrating and the losers dejected first', () => {
    const s = snaps[ft]!;
    const winner = s.score!.home > s.score!.away ? 'home' : 'away';
    const early = breakScene(s, 10)!; const later = breakScene(s, 80)!; const gone = breakScene(s, FT_GONE)!;
    expect(early.kind).toBe('walk-off');
    for (const p of s.players.filter((q) => !q.binned)) {
      const e = breakMan(early, p)!; const l = breakMan(later, p)!;
      if (p.side === winner) expect(['fistPump', 'celebrate', 'point']).toContain(e.action);
      else expect(['handsOnHips', 'handsOnHead']).toContain(e.action);
      // Not moved yet (a man west of the tunnel stands at −0, which is still no step).
      expect(Math.abs(e.dx)).toBe(0); expect(e.alpha).toBe(1);
      // Each side walks toward its own half of the tunnel and fades by FT_GONE.
      const entranceX = TUNNEL.x + (p.side === 'home' ? -TUNNEL.sideM : TUNNEL.sideM);
      const d0 = Math.hypot(entranceX - p.x, TUNNEL.y - p.y);
      const d1 = Math.hypot(entranceX - p.x - l.dx, TUNNEL.y - p.y - l.dy);
      expect(d1).toBeLessThan(d0);
      expect(breakMan(gone, p)!.alpha).toBe(0);
    }
    // The half-time walk-off is gone by the end of the sim's own break.
    const h = snaps[ht]!;
    const atWhistle = breakScene(h, 0);
    const atRestart = breakScene(h, NINES.halfTimeTicks);
    for (const p of h.players) {
      expect(breakMan(atWhistle, p)).toMatchObject({ alpha: 1, action: p.binned ? null : 'run' });
      expect(breakMan(atRestart, p)?.alpha).toBe(0);
    }
  });

  it('gathers each side round its captain before golden point', () => {
    const s = snaps[gp]!;
    const spread = (dxOf: (side: string, slot: number) => { dx: number; dy: number }, side: 'home' | 'away') => {
      const cap = s.players.find((p) => p.side === side && p.slot === CAPTAIN_SLOT)!;
      const men = s.players.filter((p) => p.side === side && p !== cap && !p.binned);
      return men.reduce((sum, p) => { const o = dxOf(side, p.slot); return sum + Math.hypot(p.x + o.dx - cap.x, p.y + o.dy - cap.y); }, 0) / men.length;
    };
    const scene = breakScene(s, 20, 20)!;
    expect(scene.kind).toBe('huddle');
    for (const side of ['home', 'away'] as const) {
      const before = spread(() => ({ dx: 0, dy: 0 }), side);
      const after = spread((sd, slot) => breakMan(scene, { side: sd as 'home' | 'away', slot })!, side);
      expect(after).toBeLessThan(before - 2);
    }
    // Huddled when golden point's kick-off fades them in, spread to their places before the kick.
    const k = at((x) => x.phase?.kind === 'restart' && !!x.phase.golden);
    expect(breakScene(snaps[k]!, 0)!.kind).toBe('spread');
    expect(breakScene(snaps[k + 39]!, 39)).toBeNull();
  });

  it('nobody snaps or streaks into the next phase: the largest visible step a frame is small', () => {
    const steps: Record<string, number> = {};
    for (const [name, from, to, hold] of [['half-time', ht - 3, ht + 110, 0], ['golden point', gp - 3, gp + 100, 0], ['full time', ft - 3, ft, FT_GONE]] as const) {
      const s = surface(); const view = new LiveView(s);
      const clock = new BreakClock();
      let last: Map<string, Drawn> | null = null; let worst = 0;
      const frame = (prev: Snapshot, cur: Snapshot, a: number, held: number) => {
        view.draw(prev, cur, a, 1, held);
        const now = new Map<string, Drawn>();
        for (const side of ['home', 'away'] as const) s.players[side].forEach((p, slot) => now.set(`${side}/${slot}`, { x: p.x, y: p.y, alpha: p.alpha, visible: p.visible }));
        if (last) for (const [k, d] of now) {
          const b = last.get(k)!;
          // A step only counts where he is to be seen on both frames.
          if (d.alpha > 0.05 && b.alpha > 0.05) worst = Math.max(worst, Math.hypot(d.x - b.x, d.y - b.y));
        }
        last = now;
      };
      for (let i = Math.max(1, from); i <= Math.min(ft, to); i++) for (const a of [0, 0.25, 0.5, 0.75]) frame(snaps[i - 1]!, snaps[i]!, a, clock.advance(snaps[i]!, 0, 1, false));
      // After the whistle the sim stands still and the picture plays on (four frames a tick).
      for (let f = 0; f < hold * 4; f++) frame(snaps[ft]!, snaps[ft]!, 1, clock.advance(snaps[ft]!, 12.5, 1, true));
      steps[name] = worst;
      // A sprinter covers about 6 world px a tick: a quarter-tick frame steps well under that.
      expect(worst, name).toBeLessThan(6);
      if (hold) for (const side of ['home', 'away'] as const) for (const p of s.players[side]) expect(p.alpha).toBe(0);
    }
    expect(Object.keys(steps)).toHaveLength(3);
  });

  it('plays on while the picture stands still at a break, and starts again after a seek', () => {
    const clock = new BreakClock();
    const s = snaps[ft]!;
    expect(clock.advance(s, 1000, 1, false)).toBe(0); // playing: the sim's own ticks carry it
    expect(clock.advance(s, 500, 2, true)).toBe(20); // stood still at ×2: 500 ms is 20 ticks
    expect(clock.advance(s, 100_000, 1, true)).toBe(FT_GONE); // and no further than the picture needs
    expect(clock.advance(snaps[ft - 50]!, 500, 1, true)).toBe(0); // a seek back: not a break
    expect(clock.advance(snaps[gp]!, 0, 1, true)).toBe(0);
  });

  it('starts again after a seek forward within the same break, not only back (#682)', () => {
    const clock = new BreakClock();
    expect(clock.advance(snaps[ht + 2]!, 0, 1, false)).toBe(0);
    expect(clock.advance(snaps[ht + 2]!, 500, 1, true)).toBe(10); // the card has held the picture for 10 ticks
    // Play carries on from the card: a frame is a tick or a few, at ×1 or at ×8, and the clock stays.
    expect(clock.advance(snaps[ht + 3]!, 50, 1, false)).toBe(10);
    expect(clock.advance(snaps[ht + 19]!, 100, 8, false)).toBe(10); // 100 ms at ×8 is 16 ticks
    // A jump of 40 ticks in a 16 ms frame is a seek, in the same phase: the old clock is not carried over.
    expect(clock.advance(snaps[ht + 59]!, 16, 1, false)).toBe(0);
    expect(snaps[ht + 59]!.phase!.since).toBe(snaps[ht + 2]!.phase!.since);
    // A held picture that is sought forward restarts from nothing too.
    clock.advance(snaps[ht + 59]!, 500, 1, true);
    expect(clock.advance(snaps[ht + 100]!, 0, 1, true)).toBe(0);
  });
});

describe('a binned man at the whistle (#688)', () => {
  const fixture = (kind: string, age = 0, golden = false): Snapshot => ({
    tick: 100 + age, phase: { kind, since: 100, ...(golden ? { golden: true } : {}) },
    clock: { half: 2, seconds: 0, minute: 5, siren: false, finished: kind === 'full-time' },
    score: { home: 10, away: 4 }, label: '', events: [],
    ball: { x: 50, y: 34, lift: 0, holder: null },
    players: [
      { side: 'home', slot: 0, who: 'bin-home', x: 49.5, y: 1, pose: 'idle', speed: 0, headX: 1, binned: true },
      { side: 'home', slot: 1, who: 'home', x: 35, y: 40, pose: 'idle', speed: 0, headX: 1 },
      { side: 'away', slot: 0, who: 'bin-away', x: 49.5, y: 1, pose: 'idle', speed: 0, headX: -1, binned: true },
      { side: 'away', slot: 1, who: 'away', x: 65, y: 30, pose: 'idle', speed: 0, headX: -1 },
      { side: 'home', slot: 2, who: 'second-bin', x: 49.5, y: 1, pose: 'idle', speed: 0, headX: 1, binned: true },
    ],
  });
  const make = () => {
    const contacts: (ContactAnimation | null)[] = [];
    const focus: ({ side: 'home' | 'away'; x: number; y: number } | null)[] = [];
    const s = { ...surface(), contact: { paint(state: ContactAnimation | null) { contacts.push(state); } }, focus: { carrier(target: { side: 'home' | 'away'; x: number; y: number } | null) { focus.push(target); } }, officials: { spot: binnedSpot, draw() {} } };
    const pictures = new Map<string, PlayerPicture>();
    for (const side of ['home', 'away'] as const) s.players[side].forEach((a, slot) => { a.paint = p => { pictures.set(`${side}/${slot}`, p); }; });
    return { s, view: new LiveView(s), pictures, contacts, focus };
  };
  const seat = (s: ReturnType<typeof surface>, snap: Snapshot, slot = 0) => {
    const at = binnedSpot(snap.players.find(p => p.side === 'home' && p.slot === slot)!, snap)!;
    const f = toFieldPt(at), w = s.fieldToWorld(f.fx, f.fy);
    return { x: Math.round(w.x), y: Math.round(w.y) };
  };

  it('fades both bins with their sides at half/full time and the golden-point huddle, without moving or celebrating', () => {
    for (const [kind, golden, fade, gone] of [
      ['half-time', false, NINES.halfTimeTicks - HT_FADE, NINES.halfTimeTicks],
      ['full-time', false, FT_FADE, FT_GONE],
      ['half-time', true, NINES.goldenPointBreakTicks - 10, NINES.goldenPointBreakTicks],
    ] as const) {
      const { s, view, pictures } = make(), snap = fixture(kind, 0, golden);
      for (const age of [0, fade, (fade + gone) / 2, gone]) {
        const scene = breakScene(snap, age, age)!;
        const at = { ...snap, tick: snap.tick + age };
        view.draw(at, at, 1);
        for (const p of snap.players) {
          const man = breakMan(scene, p)!, a = s.players[p.side][p.slot]!;
          expect(a.alpha).toBe(man.alpha);
          if (age === gone) expect(a.alpha).toBe(0);
          if (!p.binned) continue;
          const peer = breakMan(scene, { side: p.side, slot: 1 })!;
          expect(man.alpha).toBe(peer.alpha);
          expect(man).toMatchObject({ dx: 0, dy: 0, action: null, gait: -1 });
          expect(pictures.get(`${p.side}/${p.slot}`)).toMatchObject({ action: 'armsFolded', possession: false });
          const at = binnedSpot(p, snap)!, f = toFieldPt(at), w = s.fieldToWorld(f.fx, f.fy);
          expect({ x: a.x, y: a.y }).toEqual({ x: Math.round(w.x), y: Math.round(w.y) });
        }
      }
      expect(seat(s, snap, 2)).not.toEqual(seat(s, snap));
    }
  });

  it('keeps live bins opaque, freezes on pause, seeks back exactly, and fades still-binned or returned men into the restart', () => {
    const { s, view, pictures } = make(), live = fixture('play'), whistle = fixture('half-time');
    const a = s.players.home[0]!, at = seat(s, live), clock = new BreakClock();
    view.draw(live, live, 1); expect(a.alpha).toBe(1); expect({ x: a.x, y: a.y }).toEqual(at);
    const held = clock.advance(whistle, (NINES.halfTimeTicks - HT_FADE / 2) * 50, 1, true);
    view.draw(whistle, whistle, 1, 1, held);
    const paused = { x: a.x, y: a.y, alpha: a.alpha, picture: pictures.get('home/0') };
    expect(paused.alpha).toBe(.5);
    for (let i = 0; i < 3; i++) view.draw(whistle, whistle, 1, 1, clock.advance(whistle, 1000, 1, false));
    expect({ x: a.x, y: a.y, alpha: a.alpha, picture: pictures.get('home/0') }).toEqual(paused);
    view.draw(whistle, whistle, 1, 1, NINES.halfTimeTicks); expect(a.alpha).toBe(0);
    view.draw(live, live, 1); expect(a.alpha).toBe(1);
    view.draw(whistle, whistle, 1, 1, held);
    expect({ x: a.x, y: a.y, alpha: a.alpha, picture: pictures.get('home/0') }).toEqual(paused);
    for (const golden of [false, true]) for (const returned of [false, true]) {
      for (const age of [0, RESTART_FADE / 2, RESTART_FADE]) {
        const restart = fixture('restart', age, golden);
        if (returned) restart.players[0] = { ...restart.players[0]!, binned: false, x: 45, y: 30 };
        view.draw(whistle, restart, 1);
        expect(a.alpha).toBe(age / RESTART_FADE);
        expect(pictures.get('home/0')!.action).toBe(returned ? 'idle' : 'armsFolded');
        if (!returned) expect({ x: a.x, y: a.y }).toEqual(at);
      }
    }
    view.draw(live, live, 1); expect(a.alpha).toBe(1);
  });

  it('clears contact and player-attached marks across a recorded real full-time whistle, and restores them on seek', () => {
    // Four real snapshots from seed 15 (Reapers v Wolves): contact ticks 140–141,
    // then the 8357–8358 final whistle with away8 Dane Fonoti in the bin. Frozen
    // presentation evidence keeps this view regression independent of later match RNG changes.
    const fixture = seed15Whistle as unknown as { contactPair: [Snapshot, Snapshot]; finalPair: [Snapshot, Snapshot] };
    const [contactPrev, contactCur] = fixture.contactPair;
    const [prev, snap] = fixture.finalPair;
    expect([prev.tick, snap.tick]).toEqual([8357, 8358]);
    const binned = snap.players.filter(p => p.binned);
    expect(snap.phase?.kind).toBe('full-time');
    expect(binned.map(p => [p.side, p.slot, p.who])).toEqual([['away', 8, 'Dane Fonoti']]);
    const { s, view, contacts, focus } = make();
    view.draw(contactPrev, contactCur, 1);
    expect(contacts[contacts.length - 1]).not.toBeNull();
    const participants = [contactCur.contact!.carrier, ...contactCur.contact!.defenders];
    expect(participants.every(p => !s.players[p.side][p.slot]!.visible)).toBe(true);
    view.draw(prev, snap, 1);
    expect(contacts[contacts.length - 1]).toBeNull();
    expect(focus[focus.length - 1]).toBeNull();
    expect(participants.every(p => s.players[p.side][p.slot]!.visible)).toBe(true);
    const seats = binned.map(p => ({ x: s.players[p.side][p.slot]!.x, y: s.players[p.side][p.slot]!.y }));
    for (const alpha of [0, 0.5, 0.999]) {
      view.draw(prev, snap, alpha, 1, FT_GONE);
      for (const p of snap.players) expect(s.players[p.side][p.slot]!.alpha, `${p.side}/${p.slot} at alpha ${alpha}`).toBe(0);
    }
    binned.forEach((p, i) => expect({ x: s.players[p.side][p.slot]!.x, y: s.players[p.side][p.slot]!.y }).toEqual(seats[i]));
    // A seek back into that exact live contact reconstructs the shared picture.
    view.draw(contactPrev, contactCur, 1);
    expect(contacts[contacts.length - 1]).not.toBeNull();
    expect(focus[focus.length - 1]).not.toBeNull();
    expect(participants.every(p => !s.players[p.side][p.slot]!.visible)).toBe(true);
    view.draw(snap, snap, 1);
    for (const p of snap.players) expect(s.players[p.side][p.slot]!.alpha).toBe(1);
  });
});

// ── The half-time card against the player's own pause (#682) ────────────────

/** Anything a Phaser layer asks of the scene: a callable that returns itself. */
const noop: unknown = new Proxy(function () {}, { get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop });
function fakeScene(): LivePlaybackScene & Phaser.Scene {
  const actor = () => ({ sprite: { x: 0, y: 0, flipX: false }, place() {}, play() {} });
  const base = {
    players: { home: Array.from({ length: 9 }, actor), away: Array.from({ length: 9 }, actor) },
    ball: { place() {} },
    cameras: { main: { zoom: 1, worldView: { x: 0, y: 0, width: 800, height: 400 }, shake() {} } },
    fieldToWorld: (fx: number, fy: number) => ({ x: fx * 10, y: fy * 4 }),
    focus: { carrier() {} },
    sideColors: { home: 0xffffff, away: 0 },
  };
  return new Proxy(base, { get: (t, p) => (p in t ? (t as Record<string | symbol, unknown>)[p] : noop) }) as unknown as LivePlaybackScene & Phaser.Scene;
}

describe('the walk-off behind the half-time card and under a pause (#682)', () => {
  it('plays on behind the card, stands still under the player’s pause, and plays on again when it is let go', () => {
    createNewGame('Walk-off', 682);
    const pb = new LivePlayback(fakeScene(), {
      home: sideSheet('H', { rating: 70 }), away: sideSheet('A', { rating: 45 }), seed: 11, weather: 'clear', calls: [], speed: 8,
      keyMoments: () => false, fixture: undefined, overlay: null, closeUpDone: () => {},
    });
    const inner = pb as unknown as { runner: { cur: Snapshot; tick: number }; view: { draw: (...a: unknown[]) => void } };
    const shown: number[] = [];
    const draw = inner.view.draw.bind(inner.view);
    inner.view.draw = (...a: unknown[]) => { shown.push((a[4] as number | undefined) ?? 0); draw(...a); };
    for (let i = 0; i < 400_000 && !pb.finished && inner.runner.cur.phase?.kind !== 'half-time'; i++) pb.update(16);
    expect(inner.runner.cur.phase?.kind).toBe('half-time');
    const frames = (n: number): number => { for (let i = 0; i < n; i++) pb.update(16); return shown[shown.length - 1]!; };
    const tick = inner.runner.tick;
    // The plan card holds the sim; the walk-off plays on behind it.
    pb.hold(true);
    const a = frames(10);
    expect(a).toBeGreaterThan(5);
    expect(frames(10)).toBeGreaterThan(a);
    // The player pauses over it (the pause sheet): the picture, walk-off included, stands still.
    pb.hold();
    const b = frames(1);
    expect(frames(60)).toBe(b);
    pb.release();
    expect(frames(10)).toBeGreaterThan(b);
    // A pause with no card is the same: the sim is stood still and so is the picture.
    pb.release(true);
    pb.hold();
    const c = frames(1);
    expect(frames(60)).toBe(c);
    expect(inner.runner.tick).toBe(tick);
  });
});
