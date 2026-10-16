// tests/match/league/events.test.ts — SimEvent → contract MatchEvent mapping.
import { describe, it, expect } from 'vitest';
import { minuteOf, toMatchEvent } from '../../../src/match/league/events';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const IDS = { home: 'H', away: 'A' } as const;
const snap = (x: number, y: number, tick = 1200): Snapshot => ({ tick, players: [], ball: { x, y, lift: 0, holder: null }, label: '', events: [] });
const ev = (kind: string, side: 'home' | 'away' = 'away', player?: string): SimEvent => ({ tick: 1200, kind, text: '', side, slot: 7, ...(player ? { player } : {}) });

describe('toMatchEvent', () => {
  it('maps the known kinds, positions them at the ball and keeps the contract teamId', () => {
    // A tackle is credited to the DEFENDING side, as the sim names the tackler.
    const t = toMatchEvent(ev('tackle', 'away', 'Flynn Hetherton'), snap(40, 34), IDS);
    expect(t).toEqual({ t: 1, kind: 'tackle', teamId: 'A', x: 40, y: 50, player: 'Flynn Hetherton' });
    expect(toMatchEvent(ev('big-hit'), snap(10, 0), IDS)).toMatchObject({ kind: 'big-hit', x: 10, y: 0 });
    expect(toMatchEvent(ev('try', 'home'), snap(102, 68), IDS)).toMatchObject({ kind: 'try', teamId: 'H', x: 102, y: 100 });
    expect(toMatchEvent(ev('kick', 'home'), snap(50, 34), IDS)).toMatchObject({ kind: 'kick', detail: 'find-touch' });
    expect(toMatchEvent(ev('dart', 'home'), snap(50, 34), IDS)).toMatchObject({ kind: 'run' });
    expect(toMatchEvent(ev('break-tackle', 'home'), snap(50, 34), IDS)).toMatchObject({ kind: 'break-tackle' });
    expect(toMatchEvent(ev('error', 'home'), snap(50, 34), IDS)).toMatchObject({ kind: 'error' });
  });
  it('returns null for lab-only kinds and events with no side', () => {
    expect(toMatchEvent(ev('offload'), snap(1, 1), IDS)).toBeNull();
    expect(toMatchEvent(ev('handover'), snap(1, 1), IDS)).toBeNull();
    const noSide: SimEvent = { tick: 1, kind: 'tackle', text: '' };
    expect(toMatchEvent(noSide, snap(1, 1), IDS)).toBeNull();
  });
  it('minutes come from sim seconds', () => {
    expect(minuteOf(0)).toBe(0);
    expect(minuteOf(1199)).toBe(0);
    expect(minuteOf(1200)).toBe(1);
    expect(minuteOf(20 * 60 * 9)).toBe(9);
  });
});
