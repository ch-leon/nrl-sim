import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { playerPicture } from '../../../src/match/view/playerPicture';

describe('moment presentation facts', () => {
  it('reports actual kicks, successful high takes and the scored try, without render reads affecting play', () => {
    const home = labSheet(DEFAULT_HOME); const away = labSheet(DEFAULT_AWAY);
    const sim = new LiveSim(home, away, 1); const control = new LiveSim(home, away, 1);
    const found = new Set<string>();
    for (let i = 0; i < 2600; i++) {
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
