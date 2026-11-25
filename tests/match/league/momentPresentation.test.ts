import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { playerPicture } from '../../../src/match/view/playerPicture';
import { REACT_SNAP_TICKS, type SimEvent } from '../../../src/match/core/snapshot';

describe('moment presentation facts', () => {
  it('reports actual kicks, successful high takes and the scored try, without render reads affecting play', () => {
    const home = labSheet(DEFAULT_HOME); const away = labSheet(DEFAULT_AWAY);
    // Preserve the historical presentation trajectory with all kick types and a scored try.
    const opts = { length: { halves: 2 as const, halfMinutes: 7 } };
    const sim = new LiveSim(home, away, 1, opts); const control = new LiveSim(home, away, 1, opts);
    const found = new Set<string>();
    // Seed 2 included every presentation fact after retreat completion (#625); since the weighted
    // receiver (#649) it has no grubber, and seed 1 had them all. The open-play dummy takes
    // seed 1's grubber. Seed 3 had every fact until the open-side shift. Seeds 1–12, seven-minute
    // halves: the first whose set is punt, high, grubber, try, rise and drop is seed 1.
    // With the shift and the dummy off, seed 1 still has that set.
    // Observe its whole match rather than depending on the opening carries.
    while (!sim.finished) {
      sim.step(); control.step();
      const s = sim.snapshot(); sim.snapshot();
      expect(s).toEqual(control.snapshot());
      for (const p of s.players) {
        const picture = playerPicture(p, p, s.tick, s.ball.holder, 1);
        if (p.kick) {
          found.add(p.kick.kind);
          if (s.tick === p.kick.strikeTick) {
            expect(s.ball.holder).toBeNull(); expect(picture.frame).toBe(3);
          }
        }
        if (p.aerialCatchTick === s.tick) {
          found.add('high'); expect(s.ball.holder).toMatchObject({ side: p.side, slot: p.slot });
          expect(picture.action).toBe('airCatch');
        }
        if (p.tryTick !== undefined) {
          found.add('try'); expect(s.ball.holder).toMatchObject({ side: p.side, slot: p.slot });
          expect(s.players.filter(q => q.tryTick !== undefined)).toHaveLength(1);
          expect(s.players.filter(q => q.celebrationTick !== undefined).every(q => q.side === p.side)).toBe(true);
          if (s.tick === p.tryTick + 10) { expect(p.pose).toBe('celebrate'); expect(picture.action).toBe('tryRise'); found.add('rise'); }
        }
      }
    }
    expect(found).toEqual(new Set(['punt', 'high', 'grubber', 'try', 'rise', 'drop']));
    const restore = applyTuning({ 'shapes.openSide.on': 0, 'live.dummyChance': 0 });
    try {
      const old = new LiveSim(home, away, 1, opts);
      const oldFound = new Set<string>();
      while (!old.finished) {
        old.step();
        const s = old.snapshot();
        for (const p of s.players) {
          if (p.kick) oldFound.add(p.kick.kind);
          if (p.aerialCatchTick === s.tick) oldFound.add('high');
          if (p.tryTick !== undefined) {
            oldFound.add('try');
            if (s.tick === p.tryTick + 10 && p.pose === 'celebrate') oldFound.add('rise');
          }
        }
      }
      expect(oldFound).toEqual(found);
    } finally { restore(); }
  });
  it('stamps the man behind an error, a missed goal or a sin bin, on the tick the sim says so (#667)', () => {
    const home = labSheet(DEFAULT_HOME); const away = labSheet(DEFAULT_AWAY);
    const found = new Set<string>();
    const kindOf = (e: SimEvent): 'error' | 'miss' | 'bin' | null => ['error', 'drop', 'strip'].includes(e.kind) ? 'error'
      : e.kind === 'sin-bin' ? 'bin' : ['conversion', 'penalty-goal', 'field-goal'].includes(e.kind) && e.detail === 'missed' ? 'miss' : null;
    // Matches until each kind has turned up: a sin bin is rare enough that one match need not have one.
    // To seed 60: since the weighted receiver (#649) the first sin bin from seed 11 is seed 32's.
    for (let seed = 11; seed < 61 && found.size < 3; seed++) {
      const sim = new LiveSim(home, away, seed);
      for (let i = 0; i < 9000 && !sim.finished; i++) {
        sim.step();
        const s = sim.snapshot();
        for (const e of s.events) {
          const kind = kindOf(e);
          if (!kind) continue;
          // A strip is told about the tackler; the reaction is the stripped carrier's, on the other side.
          const who = e.kind === 'strip' ? s.players.find(p => p.reactTick === s.tick && p.side !== e.side) : e;
          const p = s.players.find(q => q.side === who!.side && q.slot === who!.slot)!;
          expect(p).toMatchObject({ reactTick: s.tick, react: kind });
          found.add(kind);
        }
        // Reported for a short while only.
        for (const p of s.players) if (p.reactTick !== undefined) expect(s.tick - p.reactTick).toBeLessThan(REACT_SNAP_TICKS);
      }
    }
    expect(found).toEqual(new Set(['error', 'miss', 'bin']));
  });
});
