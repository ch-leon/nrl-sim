// tests/match/view/tackleHold.test.ts — the tackle count chip stays on screen (Leon
// on iPhone: it flashed on and off). LivePlayback holds the count through passes and
// kicks in flight, loose balls, rucks and dead time (holdTackle), and the overlay's
// chip writes the page only when its words change (TackleChip). Every expected
// label is built from SET_TACKLES: Nines and full sets read it from the league.
import { describe, it, expect } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import { Runner } from '../../../src/match/core/engine';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { holdTackle, LivePlayback, type LivePlaybackScene, type ShownTackle } from '../../../src/match/view/livePlayback';
import { TackleChip, tackleLabel, type MatchOverlayHandle, type TackleChipEl } from '../../../src/ui/screens/matchOverlay';
import type { Side } from '../../../src/match/core/snapshot';
import type Phaser from 'phaser';

const FIRST = `TACKLE 1/${SET_TACKLES}`;
const LAST = `LAST TACKLE · ${SET_TACKLES}/${SET_TACKLES}`;
/** Every label the chip may show: TACKLE 1 to SET_TACKLES - 1, then the last. */
const LABELS = new Set([...Array.from({ length: SET_TACKLES - 1 }, (_, i) => `TACKLE ${i + 1}/${SET_TACKLES}`), LAST]);

/** A chip element that counts every write to it. */
function spyEl() {
  const writes = { text: 0, hidden: 0, cls: 0 };
  let text = '', hidden = false, last = false;
  const el = {
    get textContent() { return text; },
    set textContent(v: string) { writes.text++; text = v; },
    get hidden() { return hidden; },
    set hidden(v: boolean) { writes.hidden++; hidden = v; },
    classList: { toggle(_c: string, on?: boolean) { writes.cls++; last = !!on; return last; } },
    get last() { return last; },
  };
  return { el: el as unknown as TackleChipEl & { last: boolean }, writes };
}

describe('tackleLabel and holdTackle', () => {
  it('labels from SET_TACKLES', () => {
    expect(tackleLabel(0)).toBe(FIRST);
    expect(tackleLabel(SET_TACKLES - 1)).toBe(LAST);
    for (let n = 0; n < SET_TACKLES; n++) expect(LABELS.has(tackleLabel(n))).toBe(true);
  });

  it('follows the set in play, holds through dead time, and hands over without a gap', () => {
    let h: ShownTackle | null = null;
    h = holdTackle(h, 'restart', 'home', 0);
    expect(h).toEqual({ side: 'home', count: 0 });
    h = holdTackle(h, 'play', 'home', 2);
    expect(h).toEqual({ side: 'home', count: 2 });
    // Unchanged: the same object back.
    expect(holdTackle(h, 'ruck', 'home', 2)).toBe(h);
    // A try and its conversion hold the count; the kick-off to the other side is their first.
    expect(holdTackle(h, 'try', 'home', 0)).toBe(h);
    expect(holdTackle(h, 'conversion', 'home', 0)).toBe(h);
    expect(holdTackle(h, 'restart', 'away', 0)).toEqual({ side: 'away', count: 0 });
    // The tackle that makes it SET_TACKLES is the other side's first, through the ruck.
    h = holdTackle(h, 'ruck', 'home', SET_TACKLES);
    expect(h).toEqual({ side: 'away', count: 0 });
    expect(holdTackle(h, 'ruck', 'away', 0)).toBe(h);
  });
});

describe('TackleChip', () => {
  it('writes only on a change: the same count twice touches nothing', () => {
    const { el, writes } = spyEl();
    const chip = new TackleChip(el);
    expect(el.hidden).toBe(true);
    chip.show(0);
    expect(el.textContent).toBe(FIRST);
    expect(el.hidden).toBe(false);
    const after = { ...writes };
    chip.show(0);
    chip.show(0);
    expect(writes).toEqual(after);
    chip.show(SET_TACKLES - 1);
    expect(el.textContent).toBe(LAST);
    expect(el.last).toBe(true);
    expect(writes.text).toBe(after.text + 1);
    chip.show(0);
    expect(el.last).toBe(false);
  });

  it('hides for a replay and comes back; full time hides it for good', () => {
    const { el } = spyEl();
    const chip = new TackleChip(el);
    chip.show(2);
    chip.show(null);
    expect(el.hidden).toBe(true);
    chip.show(2);
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe(tackleLabel(2));
    chip.fullTime();
    expect(el.hidden).toBe(true);
    chip.show(3);
    expect(el.hidden).toBe(true);
  });
});

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

it.each([['off', undefined], ['on', 'home']] as const)('LivePlayback keeps the chip up and steady through a whole match (Labs %s)', (_labs, controlsSide) => {
  const { el } = spyEl();
  const chip = new TackleChip(el);
  const overlay = { setTackle: (c: number | null) => chip.show(c), setClock() {}, comment() {}, offerReplay() {} } as unknown as MatchOverlayHandle;
  const pb = new LivePlayback(fakeScene(), {
    home: sideSheet('H', { rating: 60 }), away: sideSheet('A', { rating: 60 }),
    seed: 11, weather: 'clear', calls: [], speed: 8, keyMoments: () => false, fixture: undefined, overlay, closeUpDone: () => {}, ...(controlsSide ? { controlsSide } : {}),
  });
  const seen = { ruck: false, pass: false, lastKick: false, handover: false, restart: false };
  let prevSide: Side = pb.controlAttacking;
  let prevPhase = pb.controlPhase;
  pb.update(16);
  while (!pb.finished) {
    pb.update(50);
    if (pb.finished) break;
    const phase = pb.controlPhase;
    const holder = pb.controlPicture.ball.holder;
    expect(el.hidden).toBe(false);
    expect(el.textContent).not.toBe('');
    expect(LABELS.has(el.textContent!)).toBe(true);
    if (phase === 'ruck') seen.ruck = true;
    if (phase === 'play' && !holder) {
      if (pb.controlTackle === SET_TACKLES - 1) { seen.lastKick = true; expect(el.textContent).toBe(LAST); }
      else seen.pass = true;
    }
    if (phase === 'restart' && prevPhase !== 'restart') seen.restart = true;
    // The ball changed hands in a set (a handover, an intercept, a last-tackle kick caught): their first, straight away.
    if (pb.controlAttacking !== prevSide && ['play', 'tackle', 'ruck'].includes(phase)) {
      seen.handover = true;
      expect(el.textContent).toBe(FIRST);
    }
    prevSide = pb.controlAttacking;
    prevPhase = phase;
  }
  expect(seen).toEqual({ ruck: true, pass: true, lastKick: true, handover: true, restart: true });
  pb.update(16);
  expect(el.hidden).toBe(true);
  pb.destroy();
}, 60000);

it('a seed-pinned match: the held count is up on ≥99% of ticks and changes only with the set', () => {
  const r = new Runner((s) => new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), s, { weather: 'clear' }), 1);
  let held: ShownTackle | null = null;
  let ticks = 0, up = 0, changes = 0, tackles = 0, handovers = 0;
  // The rule it replaces, for the record: up only with the ball in hand, in a set, short of the last.
  let oldUp = 0, oldToggles = 0, oldWas = false;
  let label = '';
  while (!r.finished) {
    r.step();
    const sim = r.current as LiveSim;
    for (const e of sim.tickEvents) {
      if (e.kind === 'tackle' || e.kind === 'big-hit') tackles++;
      if (e.kind === 'handover' || e.kind === 'set-start') handovers++;
    }
    const before = held;
    held = holdTackle(held, sim.phaseKind, sim.inPossession, sim.tackleCount);
    ticks++;
    if (held) up++;
    const now = tackleLabel(held.count);
    if (before && now !== label) changes++;
    label = now;
    const old = !!r.cur.ball.holder && sim.tackleCount < SET_TACKLES && ['play', 'tackle', 'ruck'].includes(sim.phaseKind);
    if (old) oldUp++;
    if (old !== oldWas) oldToggles++;
    oldWas = old;
  }
  console.log(`tackle chip, seed 1, ${ticks} ticks: before ${(100 * oldUp / ticks).toFixed(1)}% up, ${oldToggles} toggles; after ${(100 * up / ticks).toFixed(1)}% up, ${changes} label changes (${tackles} tackles, ${handovers} handovers/new sets)`);
  expect(up / ticks).toBeGreaterThanOrEqual(0.99);
  expect(changes).toBeLessThanOrEqual(2 * (tackles + handovers));
}, 60000);
