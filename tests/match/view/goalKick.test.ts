import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { GOALS } from '../../../src/match/league/goals';
import { playerPicture } from '../../../src/match/view/playerPicture';
import { ROUTINE_BEATS, goalRoutineFrame } from '../../../src/match/view/goalKick';

describe('the goal kicker\'s routine (#669)', () => {
  it('plays every beat between his spot and the strike, and none outside it', () => {
    const g = { readyTick: 100, strikeTick: 130, toward: 1 as const };
    expect(goalRoutineFrame(g, 99)).toBeNull();
    expect(goalRoutineFrame(g, 130)).toBeNull();
    const frames = Array.from({ length: 30 }, (_, i) => goalRoutineFrame(g, 100 + i)!);
    expect(frames[0]).toBe(0); expect(frames[29]).toBe(5);
    for (let i = 1; i < frames.length; i++) expect(frames[i]! - frames[i - 1]!).toBeGreaterThanOrEqual(0);
    // At the sim's gap every beat holds for at least three ticks: none is cut off mid-pose.
    for (let f = 0; f < ROUTINE_BEATS.length; f++) expect(frames.filter(x => x === f).length).toBeGreaterThanOrEqual(3);
    expect(GOALS.conversionTicks).toBe(30);
    expect(goalRoutineFrame({ readyTick: 5, strikeTick: 5, toward: -1 }, 5)).toBeNull();
  });

  it('ends exactly on the sim\'s strike, off the tee, facing the posts, without changing the match', () => {
    const home = labSheet(DEFAULT_HOME); const away = labSheet(DEFAULT_AWAY);
    let shots = 0;
    // Seeds 1–3: since the weighted receiver (#649) seeds 1 and 2 alone have four goal kicks.
    for (const seed of [1, 2, 3]) {
      const sim = new LiveSim(home, away, seed); const control = new LiveSim(home, away, seed);
      let beats: number[] = [];
      while (!sim.finished) {
        sim.step(); control.step();
        const s = sim.snapshot();
        expect(s).toEqual(control.snapshot());
        const kickers = s.players.filter(p => p.goalKick);
        expect(kickers.length).toBeLessThanOrEqual(1);
        const k = kickers[0];
        if (!k) continue;
        const g = k.goalKick!;
        const pic = playerPicture(k, k, s.tick, s.ball.holder, 1);
        if (pic.action === 'goalRoutine' || pic.action === 'teeKick') expect(pic.left).toBe(g.toward < 0);
        if (s.tick < g.strikeTick) {
          expect(s.ball.holder).toMatchObject({ side: k.side, slot: k.slot });
          expect(pic.action).toBe('goalRoutine');
          beats.push(pic.frame);
        } else if (k.kick) {
          expect(k.kick.startedTick).toBe(g.strikeTick);
          if (s.tick === g.strikeTick) {
            expect(pic.action).toBe('teeKick');
            expect(new Set(beats)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
            expect(beats[beats.length - 1]).toBe(5);
            beats = [];
            shots++;
          }
        }
      }
    }
    expect(shots).toBeGreaterThan(4);
  });
});
