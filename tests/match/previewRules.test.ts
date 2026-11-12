import { describe, expect, it } from 'vitest';
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_X, toFieldPt } from '../../src/match/core/field';
import { MATCH_PREVIEW } from '../../src/match/preview';
import { previewSheet } from '../../src/match/lab/previewSheets';
import { NINES } from '../../src/match/league/rules';
import { kickoffLanding } from '../../src/match/league/kickoff';
import { CALLS } from '../../src/match/league/calls';
import { exitPoint, isFortyTwenty, twentySpot } from '../../src/match/league/touch';
import { bonusZone, fieldToGrid, FIELD_LONG, PLAY_LONG } from '../../src/scenes/matchField';
import { LiveSim } from '../../src/match/league/live';
import { LabController, parseLabHash } from '../../src/match/lab/controller';

describe('compiled field rules (run once per preview build)', () => {
  it('restarts a pristine seeded comparison without queued calls', () => {
    const ctrl = new LabController((_h, _a, seed) => new LiveSim(previewSheet('preview-home')!, previewSheet('preview-away')!, seed),
      parseLabHash('#lab?seed=7', { home: 'preview-home', away: 'preview-away' }));
    ctrl.calls.push({ tick: 1, side: 'home', call: 'hit-up' });
    ctrl.step();
    ctrl.restart();
    expect(ctrl.seed).toBe(7);
    expect(ctrl.tick).toBe(0);
    expect(ctrl.runner.playing).toBe(false);
    expect(ctrl.calls).toEqual([]);
    if (ctrl.watchClock) {
      expect(ctrl.watchClock.clean).toBe(true);
      expect(ctrl.watchClock.milliseconds).toEqual([0, 0]);
    }
  });
  it('shares the physical field, clock, markings and restart geometry', () => {
    if (process.env.NRL_MATCH_PREVIEW_LENGTH) expect(MATCH_PREVIEW?.fieldLength).toBe(Number(process.env.NRL_MATCH_PREVIEW_LENGTH));
    expect(FIELD_LENGTH).toBe(MATCH_PREVIEW?.fieldLength ?? 100);
    expect(NINES.halfMinutes).toBe(2.5);
    expect(FIELD_WIDTH).toBe(68);
    expect(PLAY_LONG).toBeCloseTo(FIELD_LENGTH * 0.24);
    expect(fieldToGrid(100, 50).gx - fieldToGrid(0, 50).gx).toBeCloseTo(PLAY_LONG);
    expect(toFieldPt({ x: MID_X, y: 34 })).toEqual({ fx: 50, fy: 50 });
    if (MATCH_PREVIEW) {
      expect(fieldToGrid(toFieldPt({ x: -IN_GOAL, y: 34 }).fx, 50).gx).toBeCloseTo(0);
      expect(fieldToGrid(toFieldPt({ x: FIELD_LENGTH + IN_GOAL, y: 34 }).fx, 50).gx).toBeCloseTo(FIELD_LONG);
    }
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

  it('keeps receiving targets ten metres on their side of halfway in either direction', () => {
    class Formation extends LiveSim {
      receivers(half: number) {
        this.half = half;
        this.assignTargets();
        return this.side(this.attacking).map(p => ({ x: p.target.x, dir: this.dirOf(p.side) }));
      }
    }
    const sim = new Formation(previewSheet('preview-home')!, previewSheet('preview-away')!, 1);
    for (const half of [1, 2]) for (const p of sim.receivers(half)) expect((MID_X - p.x) * p.dir).toBeGreaterThanOrEqual(10);
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
