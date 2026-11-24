// A repeat one-on-one is said by the playback, and a tactic counter on a tagged
// clean bust is still heard (#468, #662). The seeds below are the first the
// search found, stepping the live playback from kick-off.
import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { LivePlayback, type LivePlaybackScene } from '../../../src/match/view/livePlayback';
import { sideSheet } from '../../../src/match/balance/measure';
import type { MatchOverlayHandle } from '../../../src/ui/screens/matchOverlay';
import type { TeamTactics } from '../../../src/match/league/presets';
import type { SimEvent } from '../../../src/match/core/snapshot';

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

interface Heard { text: string; weight: string; follow: boolean }

/** Step the live playback to `tick` and return what that tick said. */
function hear(home: Partial<TeamTactics>, away: Partial<TeamTactics>, seed: number, tick: number): { event: SimEvent; heard: Heard[] } {
  const heard: Heard[] = [];
  const overlay = {
    setTackle() {}, setClock() {}, offerReplay() {}, setScore() {},
    comment(text: string, weight: string = 'routine', follow = false) { heard.push({ text, weight, follow }); },
  } as unknown as MatchOverlayHandle;
  const pb = new LivePlayback(fakeScene(), {
    home: sideSheet('H', { rating: 70, tactics: home }),
    away: sideSheet('A', { rating: 70, tactics: away }),
    seed, weather: 'clear', calls: [], speed: 8, keyMoments: () => false, fixture: undefined, overlay, closeUpDone: () => {},
  });
  const runner = (pb as unknown as { runner: { step(): void; finished: boolean; tick: number; cur: { events: SimEvent[] } } }).runner;
  try {
    let from = 0;
    while (!runner.finished && runner.tick < tick) {
      from = heard.length;
      runner.step();
    }
    const event = runner.cur.events.find(e => e.kind === 'break-tackle' && e.detail !== 'wrestle' && e.duel);
    expect(runner.tick).toBe(tick);
    expect(event).toBeTruthy();
    return { event: event!, heard: heard.slice(from) };
  } finally {
    pb.destroy();
  }
}

const ALL_OUT: Partial<TeamTactics> = { attack: 'all-out', defence: 'rush' };
const SLIDE: Partial<TeamTactics> = { attack: 'balanced', defence: 'slide' };
const EXPANSIVE: Partial<TeamTactics> = { attack: 'expansive', defence: 'slide' };
const COMPRESSED: Partial<TeamTactics> = { attack: 'balanced', defence: 'compressed' };

describe('a tactic counter survives a tagged clean bust', () => {
  it('keeps the All-out read on a first win', () => {
    const { event, heard } = hear(ALL_OUT, SLIDE, 1, 2480);
    expect(event.duel).toBeTruthy();
    expect(heard.map(h => h.text)).toEqual(['All-out breaks through Slide.']);
    expect(heard[0]!.weight).toBe('routine');
  });

  it('says the Expansive read on a first win', () => {
    const { heard } = hear(EXPANSIVE, COMPRESSED, 1, 634);
    expect(heard.map(h => h.text)).toEqual(['Expansive breaks the Compressed line.']);
  });

  it('appends a second win after the counter and holds the strip for that win only', () => {
    const second = hear(ALL_OUT, SLIDE, 4, 3287);
    expect(second.heard.map(h => h.text)).toEqual([
      'All-out finds a gap in Slide.',
      'H five-eighth 4 busts through A five-eighth 4 again!',
    ]);
    expect(second.heard[0]).toMatchObject({ weight: 'routine', follow: false });
    expect(second.heard[1]).toMatchObject({ weight: 'important', follow: true });

    const later = hear(ALL_OUT, SLIDE, 2, 5898);
    expect(later.heard.map(h => h.text)).toEqual([
      'All-out finds a gap in Slide.',
      'H halfback 5 busts through A hooker 6 for win number 4!',
    ]);
    expect(later.heard[1]).toMatchObject({ weight: 'routine', follow: true });
  });
});
