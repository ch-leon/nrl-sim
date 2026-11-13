// tests/match/view/traitLayer.test.ts — traits you can see (N15.4): a move is drawn
// only when the event names the trait that fired, it lasts a second, and a
// Playmaker's line goes through the man on it.
import { describe, it, expect } from 'vitest';
import {
  CUT_END_M, CUT_NEAR_M, LAST_LINE_BEATEN, LAST_MEN_BEHIND, TRAIT_FAST_FROM, TRAIT_FAST_HOLD, TRAIT_MOVE_MS, WORKHORSE_TACKLES, TackleTally, TraitRoster,
  lastLineSave, manOnTheLine, moveAlpha, moveHold, traitCuesFor, traitMoveFor, traitOwnsMove,
} from '../../../src/match/view/traitLayer';
import { TRAITS, traitTip, type TraitId } from '../../../src/data/traits';
import type { PlayerSnap, Side, SimEvent, Snapshot } from '../../../src/match/core/snapshot';

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
    // Finisher shares the three attacking pictures. A Hothead's big hit is not a Hitman's shock.
    expect(traitMoveFor(ev('fend', { trait: 'Finisher III' }), s)?.kind).toBe('fend');
    expect(traitMoveFor(ev('step', { trait: 'Finisher I' }), s)?.kind).toBe('step');
    expect(traitMoveFor(ev('break-tackle', { trait: 'Finisher II' }), s)?.kind).toBe('drive');
    expect(traitMoveFor(ev('big-hit', { trait: 'Hothead II' }), s)).toBeNull();
    expect(traitMoveFor(ev('big-hit', { trait: 'Wrecking Ball II' }), s)).toBeNull();
    expect(traitOwnsMove('hit', 'Hitman')).toBe(true);
    expect(traitOwnsMove('hit', 'Hothead II')).toBe(false);
    // Not on the snapshot: nothing to draw on.
    expect(traitMoveFor(ev('fend', { trait: "Don't Argue", slot: 9 }), s)).toBeNull();
  });

  it('draws the cut-out through the man who stands on the line, and not one off it', () => {
    const move = traitMoveFor(ev('cut-out', { trait: 'Playmaker II', toSlot: 5 }), s);
    expect(move?.to).toEqual({ x: 36, y: 48, slot: 5 });
    // Slot 2 sits between the passer (40, 30) and the receiver (36, 48).
    expect(move?.through).toEqual({ x: 38, y: 34, slot: 2 });
    // Nobody between them: the line still goes to the man he found.
    const wide = traitMoveFor(ev('cut-out', { trait: 'Playmaker', toSlot: 5 }), snap([man('home', 6, 40, 30), man('home', 5, 36, 48)]));
    expect(wide?.to?.slot).toBe(5);
    expect(wide?.through).toBeUndefined();
    // Off the line by more than the band: not the man skipped.
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: 5, y: CUT_NEAR_M + 0.1 }])).toBeNull();
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: 5, y: 1 }])).toEqual({ x: 5, y: 1 });
    // A pass too short to skip anyone.
    expect(manOnTheLine({ x: 0, y: 0 }, { x: 0.5, y: 0 }, [{ x: 0.25, y: 0 }])).toBeNull();
    // A long cut-out: the man beside the passer is the one skipped, even though a
    // trailer further down sits closer to the line. A 12% cutoff dropped the near man.
    const from = { x: 40, y: 20 };
    const far = { x: 42, y: 44 };
    const near = { x: 38.2, y: 22.7, slot: 2 };
    const trailer = { x: 41.2, y: 32, slot: 4 };
    expect(manOnTheLine(from, far, [trailer, near])).toEqual(near);
    expect(CUT_END_M).toBeLessThan(1);
  });

  it('lasts a second and no longer', () => {
    expect(moveAlpha(0)).toBe(1);
    expect(moveAlpha(700)).toBe(1);
    expect(moveAlpha(TRAIT_MOVE_MS - 1)).toBeGreaterThan(0);
    expect(moveAlpha(TRAIT_MOVE_MS - 1)).toBeLessThan(1);
    expect(moveAlpha(TRAIT_MOVE_MS)).toBe(0);
    expect(moveAlpha(-1)).toBe(0);
    expect(TRAIT_MOVE_MS).toBeLessThanOrEqual(1000);
    // ×8 holds the mark for two real seconds. ×1 stays a second.
    expect(moveHold(1)).toBe(1);
    expect(moveHold(2)).toBe(1);
    expect(moveHold(TRAIT_FAST_FROM)).toBe(TRAIT_FAST_HOLD);
    expect(moveHold(8)).toBe(TRAIT_FAST_HOLD);
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

  it('every on-field trait says what to look for; only the off-field four say nothing', () => {
    for (const id of ['offloadKing', 'jets', 'lastLine', 'pickpocket', 'brickWall', 'poacher', 'hothead', 'razzleDazzle', 'gambler', 'workhorse'] as const) {
      expect(TRAITS[id].seen, id).toBeTruthy();
      expect(traitTip(id), id).toContain('You will see it as ');
    }
    for (const id of ['youngGun', 'veteran', 'clubLegend', 'injuryProne'] as const) {
      expect(TRAITS[id].seen, id).toBeUndefined();
      expect(traitTip(id), id).toBe(TRAITS[id].blurb);
    }
  });
});

// ── #654: the ten that had no picture ─────────────────────────────────────────

const walker = (side: Side, slot: number, x: number, y: number, who: string, extra: Partial<PlayerSnap> = {}): PlayerSnap => ({
  side, slot, x, y, pose: 'run', headX: side === 'home' ? 1 : -1, speed: 0, who, ...extra,
});
const sheet = (rows: { id: string; traits: { id: TraitId; level: 1 | 2 | 3 }[] }[]) => ({
  roster: rows.map((r) => ({ name: r.id, id: r.id, position: 'prop' as const, traits: r.traits })),
});
const roster = new TraitRoster({
  home: sheet([{ id: 'h1', traits: [{ id: 'workhorse', level: 3 }] }, { id: 'h2', traits: [{ id: 'jets', level: 2 }] }]),
  away: sheet([{ id: 'a1', traits: [{ id: 'brickWall', level: 3 }] }, { id: 'a2', traits: [{ id: 'lastLine', level: 3 }] }]),
});
const contactOf = (carrier: [Side, number, string], defenders: [Side, number, string][]): NonNullable<SimEvent['contact']> => ({
  startedTick: 9, carrier: { side: carrier[0], slot: carrier[1], who: carrier[2] }, defenders: defenders.map((d) => ({ side: d[0], slot: d[1], who: d[2] })),
});

describe('the ten new cues come from the events the sim already emits', () => {
  const field = [
    walker('home', 6, 40, 30, 'h1'), walker('home', 2, 38, 34, 'h2'), walker('home', 5, 36, 48, 'h3'), walker('home', 7, 60, 30, 'h4'),
    walker('away', 1, 42, 30, 'a1'), walker('away', 2, 44, 31, 'a2'),
  ];
  const s = snap(field);

  it('Offload King: the ball out the back, to the nearest teammate in reach; Razzle Dazzle the same flourish', () => {
    const king = traitCuesFor(ev('offload', { trait: 'Offload King II' }), s, roster);
    expect(king).toHaveLength(1);
    expect(king[0]).toMatchObject({ kind: 'offload', slot: 6, to: { slot: 2 } });
    // Nobody within reach: no arc to draw for an Offload King.
    expect(traitCuesFor(ev('offload', { trait: 'Offload King' }), snap([walker('home', 6, 40, 30, 'h1'), walker('home', 5, 60, 30, 'h3')]), roster)).toEqual([]);
    // Razzle Dazzle flourishes even with no one in reach, on the offload whether or not it is later spilled.
    expect(traitCuesFor(ev('offload', { trait: 'Razzle Dazzle I' }), snap([walker('home', 6, 40, 30, 'h1')]), roster)[0]?.kind).toBe('razz');
    expect(traitCuesFor(ev('offload'), s, roster)).toEqual([]);
  });

  it('Gambler: a failed read (the gamble event) and a good one (the intercept) both draw', () => {
    expect(traitCuesFor(ev('gamble', { trait: 'Gambler III', side: 'away', slot: 1 }), s, roster)[0]).toMatchObject({ kind: 'gamble', ok: false, side: 'away' });
    expect(traitCuesFor(ev('intercept', { trait: 'Gambler', side: 'away', slot: 1 }), s, roster)[0]).toMatchObject({ kind: 'gamble', ok: true });
  });

  it('Poacher: the lane back to the man still in his passing pose; Pickpocket: the carrier he stripped', () => {
    const poach = traitCuesFor(ev('intercept', { trait: 'Poacher II', side: 'away', slot: 1 }), s, roster)[0];
    expect(poach).toMatchObject({ kind: 'pluck', ok: true, side: 'away', slot: 1 });
    // The passer is on the other side and in his pass pose: here, nobody is.
    expect(poach?.other).toBeUndefined();
    const passing = snap([walker('away', 1, 42, 30, 'a1'), walker('home', 6, 30, 30, 'h1', { pose: 'pass' })]);
    expect(traitCuesFor(ev('intercept', { trait: 'Poacher', side: 'away', slot: 1 }), passing, roster)[0]?.other).toMatchObject({ side: 'home', slot: 6 });
    const strip = traitCuesFor(ev('strip', { trait: 'Pickpocket I', side: 'away', slot: 1, contact: contactOf(['home', 6, 'h1'], [['away', 1, 'a1']]) }), s, roster)[0];
    expect(strip).toMatchObject({ kind: 'pluck', side: 'away', slot: 1, other: { side: 'home', slot: 6 } });
    expect(strip?.ok).toBeUndefined();
    // A strip with no trait named, or a pick-off by a plain defender, draws nothing.
    expect(traitCuesFor(ev('strip', { side: 'away', slot: 1 }), s, roster)).toEqual([]);
    expect(traitCuesFor(ev('intercept', { side: 'away', slot: 1 }), s, roster)).toEqual([]);
  });

  it('Hothead: temper after a penalty against him, not on any other event', () => {
    expect(traitCuesFor(ev('penalty', { trait: 'Hothead II', side: 'away', slot: 1 }), s, roster)[0]?.kind).toBe('temper');
    expect(traitCuesFor(ev('penalty', { side: 'away', slot: 1 }), s, roster)).toEqual([]);
  });

  it('Brick Wall: a two-man tackle with the Brick Wall man in it, not a one-man one or one without him', () => {
    const two = ev('tackle', { side: 'away', slot: 2, contact: contactOf(['home', 6, 'h1'], [['away', 2, 'a2'], ['away', 1, 'a1']]) });
    const wall = traitCuesFor(two, s, roster);
    expect(wall).toHaveLength(1);
    expect(wall[0]).toMatchObject({ kind: 'wall', side: 'home', slot: 6, other: { side: 'away', slot: 1 } });
    expect(traitCuesFor(ev('tackle', { side: 'away', slot: 1, contact: contactOf(['home', 6, 'h1'], [['away', 1, 'a1']]) }), s, roster)).toEqual([]);
    expect(traitCuesFor(ev('tackle', { side: 'away', slot: 2, contact: contactOf(['home', 6, 'h1'], [['away', 2, 'a2'], ['home', 5, 'h3']]) }), s, roster)).toEqual([]);
    // Without the sheets there is nobody to name.
    expect(traitCuesFor(two, s)).toEqual([]);
  });

  describe('Last Line', () => {
    // The home side runs right, towards the away side's line; away's a2 stands deepest.
    const line = (x2: number) => [
      walker('home', 6, 80, 30, 'h1'),
      walker('away', 2, x2, 30, 'a2'), walker('away', 3, 60, 20, 'a3'), walker('away', 4, 62, 25, 'a4'), walker('away', 5, 64, 35, 'a5'),
      walker('away', 6, 66, 40, 'a6'), walker('away', 7, 55, 30, 'a7'),
    ];
    const tackleBy = (extra: Partial<SimEvent> = {}) => ev('tackle', { side: 'away', slot: 2, contact: contactOf(['home', 6, 'h1'], [['away', 2, 'a2']]), ...extra });
    it('the deepest defender, once the runner has beaten the line, gets the marker and a held frame', () => {
      const cues = traitCuesFor(tackleBy(), snap(line(90)), roster);
      expect(cues).toHaveLength(1);
      expect(cues[0]).toMatchObject({ kind: 'last-line', side: 'away', slot: 2, tier: 2, other: { side: 'home', slot: 6 } });
    });
    it('no extra beat when the moment already has one (a big hit already freezes)', () => {
      const big = snap(line(90));
      big.events = [ev('big-hit', { side: 'away', slot: 2, trait: 'Hitman' })];
      const cues = traitCuesFor(tackleBy({ kind: 'big-hit' }), big, roster);
      expect(cues[0]?.kind).toBe('last-line');
      expect(cues[0]?.tier).toBeUndefined();
    });
    it('not when others stand behind him, or the runner has beaten too few', () => {
      expect(lastLineSave(snap(line(90)), { side: 'away', slot: 2, x: 90 }, { x: 80, headX: 1 })).toBe(true);
      expect(lastLineSave(snap(line(90)), { side: 'away', slot: 2, x: 90 }, { x: 58, headX: 1 })).toBe(false);
      expect(lastLineSave(snap(line(50)), { side: 'away', slot: 2, x: 50 }, { x: 80, headX: 1 })).toBe(false);
      // The winger covering the fullback is still the last line: one man deeper is allowed, two is not.
      expect(lastLineSave(snap(line(63)), { side: 'away', slot: 2, x: 63 }, { x: 80, headX: 1 })).toBe(true);
      expect(lastLineSave(snap(line(61)), { side: 'away', slot: 2, x: 61 }, { x: 80, headX: 1 })).toBe(false);
      expect(LAST_MEN_BEHIND).toBe(1);
      expect(LAST_LINE_BEATEN).toBeGreaterThan(1);
    });
    it('only a Last Line man', () => {
      expect(traitCuesFor(tackleBy({ slot: 3, contact: contactOf(['home', 6, 'h1'], [['away', 3, 'a3']]) }), snap(line(90)), roster)).toEqual([]);
    });
  });
});

describe('Workhorse: his third tackle in a set', () => {
  const tackle = (tick: number): SimEvent => ({ tick, kind: 'tackle', text: '', side: 'home', slot: 6 });
  const hear = (t: TackleTally, e: SimEvent) => t.hear(e, e.kind === 'tackle' ? 'home|h1' : null);

  it('counts tackles by tick, restarts on a change of possession, and counts a heard event once', () => {
    const t = new TackleTally();
    for (const k of [10, 30, 50]) hear(t, tackle(k));
    expect(t.count('home|h1', 10)).toBe(1);
    expect(t.count('home|h1', 50)).toBe(3);
    hear(t, tackle(50)); // heard twice (a replay): still three
    expect(t.count('home|h1', 50)).toBe(3);
    // A replay that reaches tick 30 counts the two up to it, not the one after.
    expect(t.count('home|h1', 30)).toBe(2);
    hear(t, { tick: 60, kind: 'handover', text: '' });
    hear(t, tackle(80));
    expect(t.count('home|h1', 80)).toBe(1);
    expect(t.count('home|h1', 50)).toBe(3);
    // A tackle on the very tick a set ends still belongs to the old set.
    hear(t, tackle(100));
    hear(t, { tick: 100, kind: 'penalty', text: '' });
    expect(t.count('home|h1', 100)).toBe(2);
    t.clear();
    expect(t.count('home|h1', 100)).toBe(0);
    expect(WORKHORSE_TACKLES).toBe(3);
  });
});
