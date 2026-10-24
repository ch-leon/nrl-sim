// tests/match/view/replay.test.ts — a try's replay (N15.5): the window, the
// button's eight seconds, and the re-simulated ticks matching the live ones.
import { describe, it, expect } from 'vitest';
import { TICK_S, replayRange, replayTo } from '../../../src/match/core/engine';
import { LiveSim } from '../../../src/match/league/live';
import type { TeamSheet } from '../../../src/sim/events';
import {
  REPLAY_BLOCK_MS,
  REPLAY_OFFER_MS,
  REPLAY_SECONDS,
  REPLAY_TICKS,
  REPLAY_ZOOM,
  offerOpen,
  replayFrame,
  replayFrom,
} from '../../../src/match/view/replay';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;

function sheet(id: string): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: 60,
    defense: 60,
    kicking: 60,
    fitness: 60,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({
      name: `${id} ${i}`,
      position,
      stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60 },
    })),
  };
}

describe('replay window', () => {
  it('is eight seconds, one hundred and sixty ticks, offered for eight seconds', () => {
    expect(REPLAY_SECONDS).toBe(8);
    expect(REPLAY_TICKS).toBe(160);
    expect(REPLAY_OFFER_MS).toBe(8000);
    expect(REPLAY_BLOCK_MS).toBe(300);
    expect(REPLAY_ZOOM).toBe(1);
    expect(replayFrom(200)).toBe(40);
    expect(replayFrom(10)).toBe(0);
    expect(replayFrom(160)).toBe(0);
    expect(offerOpen(0)).toBe(true);
    expect(offerOpen(7999)).toBe(true);
    expect(offerOpen(8000)).toBe(false);
    expect(offerOpen(-1)).toBe(false);
    expect(replayFrame({ x: 12, y: 34 })).toEqual({ cx: 12, cy: 34, zoom: 1 });
  });

  it('re-simulates the same ticks the live match played', () => {
    const factory = (seed: number): LiveSim => new LiveSim(sheet('H'), sheet('A'), seed, { weather: 'clear' });
    const from = 20;
    const to = Math.round(4 / TICK_S);
    const range = replayRange(factory, 9, from, to);
    expect(range[0]?.tick).toBe(from);
    expect(range[range.length - 1]?.tick).toBe(to);
    expect(range).toHaveLength(to - from + 1);
    for (const s of range) {
      const live = replayTo(factory, 9, s.tick);
      expect(s.ball).toEqual(live.ball);
      expect(s.players.map((p) => [p.side, p.slot, p.x, p.y, p.pose])).toEqual(
        live.players.map((p) => [p.side, p.slot, p.x, p.y, p.pose]),
      );
      expect(s.events.map((e) => `${e.tick}:${e.kind}:${e.text}`)).toEqual(live.events.map((e) => `${e.tick}:${e.kind}:${e.text}`));
      expect(s.score).toEqual(live.score);
    }
    // The copy is the replay's own: a later sim step cannot wipe a stored tick's events.
    const again = replayRange(factory, 9, to, to);
    expect(again[0]?.events.map((e) => e.kind)).toEqual(range[range.length - 1]?.events.map((e) => e.kind));
  });
});
