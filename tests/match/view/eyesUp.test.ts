// #671: eyes on the bomb. Over real matches the men under a bomb in the air look up and level
// off as it comes down; nobody looks up at any other kick, a pass or a ball on the ground; the
// reading is a pure function of the two snapshots, so seek and replay show the same heads.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { EYES_UP, eyesUp, flightPeak } from '../../../src/match/view/eyesUp';
import { pictureContext, playerPicture } from '../../../src/match/view/playerPicture';
import { PlayerFrameCache } from '../../../src/scenes/matchPlayers';
import { kitFromColors } from '../../../src/art/match/kit';
import { appearanceFor } from '../../../src/art/prototype/player';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { headSpot } from '../../../src/art/match/lookUp';

interface Tick { prev: Snapshot; cur: Snapshot; kick: string }

/** Every tick of a match with the kind of the kick last struck (a kick-off or drop-out by its event). */
function playMatch(seed: number): Tick[] {
  const sim = new LiveSim(sideSheet('H', { rating: 62 }), sideSheet('A', { rating: 58 }), seed);
  const out: Tick[] = [];
  let prev = sim.snapshot();
  let kick = '';
  while (!sim.finished && sim.tick < 30_000) {
    sim.step();
    const cur = sim.snapshot();
    for (const e of cur.events) if (['kick', 'kickoff', 'drop-out'].includes(e.kind)) kick = e.kind === 'kick' ? e.detail ?? 'long' : e.kind;
    out.push({ prev, cur, kick });
    prev = cur;
  }
  return out;
}

describe('eyes on the bomb (#671)', () => {
  const ticks = [1, 2, 3, 4, 5, 6].flatMap(playMatch);

  it('reads a bomb’s peak off two ticks of its height', () => {
    const peaks = new Set<number>();
    for (const t of ticks) {
      if (t.kick !== 'bomb' || t.cur.ball.holder || t.prev.ball.holder || t.cur.ball.lift < 4) continue;
      const k = flightPeak(t.prev, t.cur);
      if (k !== null && k > 15) peaks.add(Math.round(k));
    }
    expect([...peaks].some((k) => k >= 20)).toBe(true);
  });

  it('has the catcher and a few chasers look up for a bomb, only a few, and never for any other kick', () => {
    let bombTicks = 0;
    let watched = 0;
    for (const t of ticks) {
      const up = eyesUp(t.prev, t.cur);
      if (!up) continue;
      // Only a bomb (or a kick-off as high) puts a head back.
      expect(['bomb', 'kickoff']).toContain(t.kick);
      expect(t.cur.ball.holder).toBeNull();
      expect(up.who.size).toBeGreaterThan(0);
      expect(up.who.size).toBeLessThanOrEqual(EYES_UP.watchers);
      bombTicks++;
      watched += up.who.size;
    }
    expect(bombTicks).toBeGreaterThan(50);
    expect(watched / bombTicks).toBeGreaterThan(1);
  });

  it('levels off as it comes down: right back high up, a glance low, nothing on the ground', () => {
    let sawBoth = false;
    for (const t of ticks) {
      const up = eyesUp(t.prev, t.cur);
      if (!up) continue;
      expect(up.level).toBe(t.cur.ball.lift >= EYES_UP.levelAtM[1]! ? 2 : 1);
      expect(t.cur.ball.lift).toBeGreaterThanOrEqual(EYES_UP.levelAtM[0]!);
      if (up.level === 1) sawBoth = true;
    }
    expect(sawBoth).toBe(true);
  });

  it('leaves everyone else’s picture alone, and is the same for the same snapshots', () => {
    let found = false;
    for (const t of ticks) {
      const up = eyesUp(t.prev, t.cur);
      if (!up) continue;
      found = true;
      const ctx = pictureContext(t.cur, t.prev);
      const plain = pictureContext(t.cur);
      for (const p of t.cur.players) {
        const before = t.prev.players.find((q) => q.side === p.side && q.slot === p.slot)!;
        const a = playerPicture(p, before, t.cur.tick, t.cur.ball.holder, 1, ctx);
        const b = playerPicture(p, before, t.cur.tick, t.cur.ball.holder, 1, plain);
        if (up.who.has(`${p.side}/${p.slot}`) && (a.action === 'idle' || a.action === 'run') && !a.possession) expect(a.lookUp).toBe(up.level);
        else expect(a).toEqual(b);
        expect(b.lookUp).toBeUndefined();
      }
      expect(pictureContext(structuredClone(t.cur), structuredClone(t.prev))).toEqual(ctx);
      break;
    }
    expect(found).toBe(true);
  });

  it('is unchanged away from the head: same pixels below the chin', () => {
    const look = appearanceFor('p1');
    const kit = kitFromColors(['#1e3a8a', '#ffffff'], 'x');
    for (const [action, frame, stride] of [['idle', 0, undefined], ['idle', 1, undefined], ['run', 2, 2], ['run', 4, 9]] as const) {
      const base = drawLivePlayer(look, kit, action, frame, 'front', false, stride, 0, 0);
      const up = drawLivePlayer(look, kit, action, frame, 'front', false, stride, 0, 2);
      const at = headSpot(action, frame, stride, 0, look.stature);
      let moved = 0;
      for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
        const a = base.get(x, y);
        const b = up.get(x, y);
        if (a.alpha !== b.alpha || a.color !== b.color) {
          moved++;
          expect(y).toBeLessThan(at.y + 17);
        }
      }
      expect(moved).toBeGreaterThan(0);
    }
  });

  it('keeps the frame cache within its cap through a bomb, adding a few frames only', () => {
    // Every picture over the match's bombs, drawn through a cache with and without the look-up.
    const kits = { home: kitFromColors(['#1e3a8a', '#ffffff'], 'h'), away: kitFromColors(['#b91c1c', '#ffffff'], 'a') };
    const withUp = new PlayerFrameCache(kits);
    const without = new PlayerFrameCache(kits);
    let bombs = 0;
    for (const t of ticks.slice(0, 40_000)) {
      const ctx = pictureContext(t.cur, t.prev);
      const plain = pictureContext(t.cur);
      if (ctx.eyesUp) bombs++;
      for (const p of t.cur.players) {
        const before = t.prev.players.find((q) => q.side === p.side && q.slot === p.slot)!;
        withUp.get(p.side, playerPicture(p, before, t.cur.tick, t.cur.ball.holder, 1, ctx));
        without.get(p.side, playerPicture(p, before, t.cur.tick, t.cur.ball.holder, 1, plain));
      }
    }
    expect(bombs).toBeGreaterThan(50);
    expect(withUp.stats().peak).toBeLessThanOrEqual(withUp.capacity);
    expect(withUp.size).toBeLessThanOrEqual(withUp.capacity);
    // A few heads, a few frames: nowhere near a second cache's worth.
    expect(withUp.stats().misses - without.stats().misses).toBeLessThan(600);
  }, 120_000);
});
