// tests/match/view/walkOff.test.ts — the whistle's pictures (#675): the walk-off at half-time and
// full time, the huddle before golden point, and nobody snapping when the next phase takes over.
import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { BreakClock, CAPTAIN_SLOT, FT_GONE, TUNNEL, breakMan, breakScene } from '../../../src/match/view/walkOff';

interface Drawn { x: number; y: number; alpha: number }
function surface() {
  const off = fieldOffsetX();
  const make = (): ActorView & Drawn => {
    const a = { x: 0, y: 0, alpha: 1, place(x: number, y: number) { a.x = x; a.y = y; }, play() {}, fade(v: number) { a.alpha = v; } };
    return a;
  };
  return {
    players: { home: Array.from({ length: 9 }, make), away: Array.from({ length: 9 }, make) },
    ball: { place() {} },
    fieldToWorld: (fx: number, fy: number) => fieldToWorldPoint(fx, fy, off),
  };
}

/** Seed 28 with golden point on (the lab's `final=1`) and the historical seven-minute halves (#678 cut them to 2:30) is level at full time with the lab's default sides (seed 12 before the weighted receiver, #649; 28 is the first of 1–60 since). */
const GOLDEN_SEED = 28;

function play(): Snapshot[] {
  const sim = new LiveSim(labSheet(DEFAULT_HOME), labSheet(DEFAULT_AWAY), GOLDEN_SEED, { goldenPoint: true, length: { halves: 2, halfMinutes: 7 } });
  const snaps: Snapshot[] = [sim.snapshot()];
  while (!sim.finished) { sim.step(); snaps.push(sim.snapshot()); }
  return snaps;
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
      // Closer to the tunnel, never further from it, and fully gone by FT_GONE.
      const d0 = Math.hypot(TUNNEL.x - p.x, TUNNEL.y - p.y); const d1 = Math.hypot(TUNNEL.x - p.x - l.dx, TUNNEL.y - p.y - l.dy);
      expect(d1).toBeLessThan(d0);
      expect(breakMan(gone, p)!.alpha).toBe(0);
    }
    // The half-time walk-off is gone by the end of the sim's own break.
    const h = snaps[ht]!;
    expect(breakScene(h, 0)!.men.every((m) => m.alpha === 1 && m.action === 'run')).toBe(true);
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
        for (const side of ['home', 'away'] as const) s.players[side].forEach((p, slot) => now.set(`${side}/${slot}`, { x: p.x, y: p.y, alpha: p.alpha }));
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
});
