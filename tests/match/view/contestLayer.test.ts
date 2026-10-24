// tests/match/view/contestLayer.test.ts — the line-break flash and the driven
// tackle's dust (N15.6). Pure over an event and a snapshot.
import { describe, it, expect } from 'vitest';
import { BREAK_SPAN_M, CONTEST_MS, DRIVE_DUST_M, contestAlpha, contestMarkFor } from '../../../src/match/view/contestLayer';
import type { PlayerSnap, Side, SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const man = (side: Side, slot: number, x: number, y: number, headX = 1): PlayerSnap => ({
  side,
  slot,
  x,
  y,
  pose: 'run',
  headX,
  speed: 5,
});

const snap = (players: PlayerSnap[], holder: { side: Side; slot: number } | null): Snapshot => ({
  tick: 40,
  players,
  ball: { x: holder ? players.find((p) => p.side === holder.side && p.slot === holder.slot)!.x : 50, y: 34, lift: 1, holder },
  label: 'play',
  events: [],
});

const ev = (kind: string, side: Side = 'home', slot = 0): SimEvent => ({ tick: 40, kind, text: '', side, slot, player: 'A' });

describe('contest marks', () => {
  const home = man('home', 3, 62, 30, 1);
  const tackler = man('away', 1, 64, 31, -1);
  const picture = snap([home, tackler], { side: 'home', slot: 3 });

  it('flashes a line break on the man who broke it, and nowhere else', () => {
    const m = contestMarkFor(ev('line-break', 'home', 3), picture);
    expect(m).toMatchObject({ kind: 'break', x: 62, y: 30, headX: 1, side: 'home', slot: 3 });
    expect(contestMarkFor(ev('break-tackle', 'home', 3), picture)).toBeNull();
    expect(contestMarkFor(ev('tackle', 'away', 1), picture)).toBeNull();
    expect(contestMarkFor({ tick: 1, kind: 'line-break', text: '' }, picture)).toBeNull();
    expect(BREAK_SPAN_M).toBeGreaterThan(4);
  });

  it('puffs dust on the carrier a big hit drove back, not on the tackler the event names', () => {
    const m = contestMarkFor(ev('big-hit', 'away', 1), picture);
    expect(m).toMatchObject({ kind: 'dust', x: 62, y: 30, side: 'home', slot: 3 });
    expect(DRIVE_DUST_M).toBe(1);
    // No holder: the man the event names, so a hit still leaves a mark.
    const loose = contestMarkFor(ev('big-hit', 'away', 1), snap([home, tackler], null));
    expect(loose).toMatchObject({ kind: 'dust', side: 'away', slot: 1 });
    expect(contestMarkFor(ev('fend'), picture)).toBeNull();
  });

  it('fades out inside a second', () => {
    expect(contestAlpha(0)).toBe(1);
    expect(contestAlpha(CONTEST_MS / 2)).toBe(1);
    expect(contestAlpha(CONTEST_MS - 1)).toBeGreaterThan(0);
    expect(contestAlpha(CONTEST_MS - 1)).toBeLessThan(1);
    expect(contestAlpha(CONTEST_MS)).toBe(0);
    expect(CONTEST_MS).toBeLessThanOrEqual(1000);
  });
});
