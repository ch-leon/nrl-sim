import { describe, expect, it } from 'vitest';
import { FIELD_LENGTH } from '../../../src/match/core/field';
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
  // The open-play dummy moves the revision-21 clips. Seed 47's try-saver is tick 4707
  // (ruck at 4716). Seed 19's miss at 2991 is grounded at 3006. With the dummy off,
  // seed 47 at 6952 and seed 44 at 5155 are still those clips.
  // Penalty advantage moves seed 47. Seeds 1–120, Reapers v Wolves: the first ankle
  // try-saver by the away fullback on the home winger, inside the last 10 m, was seed 79
  // at tick 3037. The open-side shift moves it. The first such save is seed 38 at tick 868
  // (ruck at 877). With the shift and advantage off, seed 47 at 4707 is still that clip,
  // and with the dummy off as well seed 47 at 6952 still is. Seed 19's miss at 2991 is unchanged.
  const expectSave = (seed: number, from: number, until: number) => {
    const [save, ...after] = replay(seed, from, until);
    const event = save!.events.find(isCover)!;
    expect(event).toMatchObject({ kind: 'tackle', detail: 'try-saver', side: 'away', slot: 0 });
    const fullback = save!.players.find(p => p.side === 'away' && p.slot === 0)!;
    const winger = save!.players.find(p => p.side === 'home' && p.slot === 2)!;
    const toLine = Math.min(winger.x, FIELD_LENGTH - winger.x);
    expect(toLine).toBeGreaterThan(0);
    expect(toLine).toBeLessThanOrEqual(CORNER_COVER.fromM);
    expect(dist(fullback, winger)).toBeLessThanOrEqual(CORNER_COVER.reachM);
    expect(save!.ball.holder).toEqual({ side: 'home', slot: 2 });
    expect(save!.phase?.kind).toBe('tackle');
    expect(advanceContactAnimation(null, save!)?.variant).toBe('ankle');
    expect(popupFor(event)?.word).toBe('TRY-SAVER!');
    expect(after.some(s => s.phase?.kind === 'ruck')).toBe(true);
    expect(after.flatMap(s => s.events).some(e => e.kind === 'try')).toBe(false);
  };
  const expectMiss = (seed: number, from: number, until: number) => {
    const [miss, ...after] = replay(seed, from, until);
    expect(miss!.events.find(isCover)).toMatchObject({ kind: 'cover-miss', side: 'away', slot: 0 });
    expect(miss!.players.find(p => p.side === 'away' && p.slot === 0)?.pose).toBe('dive');
    expect(miss!.ball.holder).toEqual({ side: 'home', slot: 2 });
    expect(miss!.phase?.kind).toBe('play');
    const grounding = after[after.length - 1]!;
    expect(grounding.events.find(e => e.kind === 'try')).toMatchObject({ side: 'home', slot: 2 });
    expect(grounding.score?.home).toBeGreaterThan(miss!.score!.home);
  };

  it('lets an on-field fullback make a low tackle on a winger short of the line', () => {
    expectSave(38, 868, 878);
    const advantageOff = applyTuning({ 'shapes.openSide.on': 0, 'penalty.advantageTicks': 0 });
    try {
      expectSave(47, 4707, 4717);
      const restore = applyTuning({ 'shapes.openSide.on': 0, 'live.dummyChance': 0 });
      try { expectSave(47, 6952, 6962); } finally { restore(); }
    } finally { advantageOff(); }
  });

  it('leaves the winger free to ground it when the same fullback misses in another match', () => {
    expectMiss(19, 2991, 3006);
    const restore = applyTuning({ 'shapes.openSide.on': 0, 'live.dummyChance': 0 });
    try { expectMiss(44, 5155, 5160); } finally { restore(); }
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
