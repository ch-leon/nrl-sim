import { describe, expect, it } from 'vitest';
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_X, toFieldPt } from '../../src/match/core/field';
import { MATCH_PREVIEW } from '../../src/match/preview';
import { previewSheet } from '../../src/match/lab/previewSheets';
import { NINES } from '../../src/match/league/rules';
import { kickoffLanding } from '../../src/match/league/kickoff';
import { CALLS } from '../../src/match/league/calls';
import { exitPoint, isFortyTwenty, twentySpot } from '../../src/match/league/touch';
import { bonusZone, fieldToGrid, PLAY_LONG } from '../../src/scenes/matchField';
import { LiveSim } from '../../src/match/league/live';

describe('compiled field rules (run once per preview build)', () => {
  it('shares the physical field, clock, markings and restart geometry', () => {
    expect(FIELD_LENGTH).toBe(MATCH_PREVIEW?.fieldLength ?? 100);
    expect(NINES.halfMinutes).toBe(MATCH_PREVIEW?.halfMinutes ?? 7);
    expect(FIELD_WIDTH).toBe(68);
    expect(PLAY_LONG).toBeCloseTo(FIELD_LENGTH * 0.24);
    expect(fieldToGrid(100, 50).gx - fieldToGrid(0, 50).gx).toBeCloseTo(PLAY_LONG);
    expect(toFieldPt({ x: MID_X, y: 34 })).toEqual({ fx: 50, fy: 50 });
    for (const dir of [1, -1] as const) {
      const short = kickoffLanding('kickoff-short', dir, 0.5, 60).to;
      expect(Math.abs(short.x - MID_X)).toBe(12);
      expect(twentySpot(dir, 34).x).toBe(dir === 1 ? 20 : FIELD_LENGTH - 20);
      const bonus = bonusZone(dir);
      expect(bonus.x1 - bonus.x0).toBe(IN_GOAL);
    }
    expect(exitPoint({ x: FIELD_LENGTH - 5, y: 34 }, { x: FIELD_LENGTH + IN_GOAL + 1, y: 34 })?.how).toBe('dead');
    expect(exitPoint({ x: MID_X, y: 34 }, { x: MID_X, y: 70 })?.how).toBe('touch');
    expect(CALLS.fortyTwentyFromM).toBe(FIELD_LENGTH - 40);
    expect(isFortyTwenty(FIELD_LENGTH - 40, 15)).toBe(FIELD_LENGTH > 60);
  });

  it('uses identical neutral squads with a real bench and finishes both halves', () => {
    const home = previewSheet('preview-home')!;
    const away = previewSheet('preview-away')!;
    expect(home.roster?.map(p => p.stats)).toEqual(away.roster?.map(p => p.stats));
    expect(home.bench).toHaveLength(4);
    const sim = new LiveSim(home, away, 1);
    const halves = new Set<number>();
    let halfTime = 0;
    let fullTime = 0;
    while (!sim.finished && sim.tick < 60000) {
      sim.step();
      const snap = sim.snapshot();
      halves.add(snap.clock!.half);
      halfTime += snap.events.filter(e => e.kind === 'half-time').length;
      fullTime += snap.events.filter(e => e.kind === 'full-time').length;
      expect(Number.isFinite(snap.ball.x)).toBe(true);
    }
    expect(sim.finished).toBe(true);
    expect([...halves]).toEqual([1, 2]);
    expect(halfTime).toBe(1);
    expect(fullTime).toBe(1);
  });
});
