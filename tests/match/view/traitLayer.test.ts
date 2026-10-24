// tests/match/view/traitLayer.test.ts — traits you can see (N15.4): a move is drawn
// only when the event names the trait that fired, it lasts a second, and a
// Playmaker's line goes through the man on it.
import { describe, it, expect } from 'vitest';
import { CUT_NEAR_M, TRAIT_MOVE_MS, manOnTheLine, moveAlpha, traitMoveFor } from '../../../src/match/view/traitLayer';
import { TRAITS, traitTip } from '../../../src/data/traits';
import type { PlayerSnap, SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const man = (side: 'home' | 'away', slot: number, x: number, y: number): PlayerSnap => ({
  side, slot, x, y, pose: 'run', headX: 1, speed: 0,
});

const snap = (players: PlayerSnap[]): Snapshot => ({
  tick: 10,
  players,
  ball: { x: 40, y: 30, lift: 0.8, holder: { side: 'home', slot: 6 } },
  label: '',
  events: [],
});

const ev = (kind: string, extra: Partial<SimEvent> = {}): SimEvent => ({
  tick: 10, kind, text: '', side: 'home', slot: 6, player: 'Kade Waratah', ...extra,
});

describe('trait moves', () => {
  const players = [man('home', 6, 40, 30), man('home', 2, 38, 34), man('home', 5, 36, 48), man('away', 1, 42, 30)];
  const s = snap(players);

  it('draws a move only when the event names the trait', () => {
    expect(traitMoveFor(ev('fend'), s)).toBeNull();
    expect(traitMoveFor(ev('step'), s)).toBeNull();
    expect(traitMoveFor(ev('cut-out', { toSlot: 5 }), s)).toBeNull();
    expect(traitMoveFor(ev('break-tackle'), s)).toBeNull();
    expect(traitMoveFor(ev('tackle'), s)).toBeNull();
    expect(traitMoveFor(ev('big-hit'), s)).toBeNull();
    // A kind with no move, even with a trait named (a Hothead's penalty).
    expect(traitMoveFor(ev('penalty', { trait: 'Hothead II' }), s)).toBeNull();
    // Workhorse and the rest never arrive as a trait on these kinds; a named one does.
    expect(traitMoveFor(ev('fend', { trait: "Don't Argue II" }), s)).toMatchObject({ kind: 'fend', side: 'home', slot: 6, x: 40, y: 30 });
    expect(traitMoveFor(ev('step', { trait: 'Dancing Feet' }), s)?.kind).toBe('step');
    expect(traitMoveFor(ev('break-tackle', { trait: 'Wrecking Ball III' }), s)?.kind).toBe('drive');
    expect(traitMoveFor(ev('tackle', { trait: 'Wrecking Ball' }), s)?.kind).toBe('drive');
    expect(traitMoveFor(ev('big-hit', { trait: 'Hitman II' }), s)?.kind).toBe('hit');
    // Not on the snapshot: nothing to draw on.
    expect(traitMoveFor(ev('fend', { trait: "Don't Argue", slot: 9 }), s)).toBeNull();
  });

  it('draws the cut-out through the man who stands on the line, and not one off it', () => {
    const move = traitMoveFor(ev('cut-out', { trait: 'Playmaker II', toSlot: 5 }), s);
    expect(move?.to).toEqual({ x: 36, y: 48, slot: 5 });
    // Slot 2 sits between the passer (40, 30) and the receiver (36, 48).
    expect(move?.through).toEqual({ x: 38, y: 34 });
    // Nobody between them: the line still goes to the man he found.
    const wide = traitMoveFor(ev('cut-out', { trait: 'Playmaker', toSlot: 5 }), snap([man('home', 6, 40, 30), man('home', 5, 36, 48)]));
    expect(wide?.to?.slot).toBe(5);
    expect(wide?.through).toBeUndefined();
    // Off the line by more than the band: not the man skipped.
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: 5, y: CUT_NEAR_M + 0.1 }])).toBeNull();
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: 5, y: 1 }])).toEqual({ x: 5, y: 1 });
    // A pass too short to skip anyone.
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 0.5, y: 0 }, [{ x: 0.25, y: 0 }])).toBeNull();
  });

  it('lasts a second and no longer', () => {
    expect(moveAlpha(0)).toBe(1);
    expect(moveAlpha(700)).toBe(1);
    expect(moveAlpha(TRAIT_MOVE_MS - 1)).toBeGreaterThan(0);
    expect(moveAlpha(TRAIT_MOVE_MS - 1)).toBeLessThan(1);
    expect(moveAlpha(TRAIT_MOVE_MS)).toBe(0);
    expect(moveAlpha(-1)).toBe(0);
    expect(TRAIT_MOVE_MS).toBeLessThanOrEqual(1000);
  });
});

describe('the player page says what to look for', () => {
  it('names the move for the six, and for Finisher who shares three of them', () => {
    expect(traitTip('dontArgue')).toBe(`${TRAITS.dontArgue.blurb}. You will see it as a straight arm`);
    expect(traitTip('dancingFeet')).toContain('You will see it as a sidestep cut');
    expect(traitTip('playmaker')).toContain('You will see it as a line through the man he skips');
    expect(traitTip('bigBoot')).toContain('You will see it as a longer, higher kick');
    expect(traitTip('wreckingBall')).toContain('You will see it as a drive through the tackle');
    expect(traitTip('hitman')).toContain('You will see it as a shock on the big hit');
    expect(traitTip('finisher')).toContain('You will see it as the step, the fend or the drive');
  });

  it('says nothing of the sort for a passive trait', () => {
    for (const id of ['workhorse', 'hothead', 'jets', 'offloadKing', 'lastLine', 'brickWall'] as const) {
      expect(traitTip(id), id).toBe(TRAITS[id].blurb);
      expect(TRAITS[id].seen, id).toBeUndefined();
    }
  });
});
