import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { playerPicture } from '../../../src/match/view/playerPicture';

describe('moment presentation facts', () => {
  it('reports actual kicks, successful high takes and the scored try, without render reads affecting play', () => {
    const home = labSheet(DEFAULT_HOME); const away = labSheet(DEFAULT_AWAY);
    // Preserve the historical presentation trajectory with all kick types and a scored try.
    const opts = { length: { halves: 2 as const, halfMinutes: 7 } };
    const sim = new LiveSim(home, away, 2, opts); const control = new LiveSim(home, away, 2, opts);
    const found = new Set<string>();
    // Seed 2 includes every presentation fact after retreat completion (#625).
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
  });
});
