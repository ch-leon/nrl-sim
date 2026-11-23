import { describe, expect, it } from 'vitest';
import { dist } from '../../../src/match/core/vec';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { labSheet } from '../../../src/match/lab/sheets';
import { CORNER_COVER } from '../../../src/match/league/cornerCover';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { advanceContactAnimation } from '../../../src/match/view/contactAnimation';
import { popupFor } from '../../../src/match/view/popups';

const home = labSheet('rival-reapers');
const away = labSheet('rival-wolves');

function replay(seed: number, from: number, until: number): Snapshot[] {
  const sim = new LiveSim(home, away, seed);
  const frames: Snapshot[] = [];
  while (sim.tick < until) {
    sim.step();
    if (sim.tick >= from) frames.push(sim.snapshot());
  }
  return frames;
}

const isCover = (e: Snapshot['events'][number]) => e.detail === 'try-saver' || e.kind === 'cover-miss';

describe('corner cover in ordinary live matches', () => {
  it('lets an on-field fullback make a low tackle on a winger short of the line', () => {
    const [save, ...after] = replay(47, 6952, 6962);
    const event = save!.events.find(isCover)!;
    expect(event).toMatchObject({ kind: 'tackle', detail: 'try-saver', side: 'away', slot: 0 });
    const fullback = save!.players.find(p => p.side === 'away' && p.slot === 0)!;
    const winger = save!.players.find(p => p.side === 'home' && p.slot === 2)!;
    expect(winger.x).toBeGreaterThan(0);
    expect(winger.x).toBeLessThanOrEqual(CORNER_COVER.fromM);
    expect(dist(fullback, winger)).toBeLessThanOrEqual(CORNER_COVER.reachM);
    expect(save!.ball.holder).toEqual({ side: 'home', slot: 2 });
    expect(save!.phase?.kind).toBe('tackle');
    expect(advanceContactAnimation(null, save!)?.variant).toBe('ankle');
    expect(popupFor(event)?.word).toBe('TRY-SAVER!');
    expect(after.some(s => s.phase?.kind === 'ruck')).toBe(true);
    expect(after.flatMap(s => s.events).some(e => e.kind === 'try')).toBe(false);
  });

  it('leaves the winger free to ground it when the same fullback misses in another match', () => {
    const [miss, ...after] = replay(44, 5155, 5160);
    expect(miss!.events.find(isCover)).toMatchObject({ kind: 'cover-miss', side: 'away', slot: 0 });
    expect(miss!.players.find(p => p.side === 'away' && p.slot === 0)?.pose).toBe('dive');
    expect(miss!.ball.holder).toEqual({ side: 'home', slot: 2 });
    expect(miss!.phase?.kind).toBe('play');
    expect(after.at(-1)?.events.find(e => e.kind === 'try')).toMatchObject({ side: 'home', slot: 2 });
    expect(after.at(-1)?.score?.home).toBeGreaterThan(miss!.score!.home);
  });

  it('turns the cover rule off in the same two reproductions', () => {
    const restore = applyTuning({ 'cornerCover.on': 0 });
    try {
      const events = [...replay(47, 0, 6962), ...replay(44, 0, 5160)].flatMap(s => s.events);
      expect(events.some(isCover)).toBe(false);
    } finally {
      restore();
    }
  });
});
