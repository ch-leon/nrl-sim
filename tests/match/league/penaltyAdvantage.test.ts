import { afterEach, describe, expect, it } from 'vitest';
import { labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { PENALTY } from '../../../src/match/league/penalties';
import { applyTuning } from '../../../src/match/league/tuning';
import { refereeSignal } from '../../../src/match/view/officials';
import { popupFor } from '../../../src/match/view/popups';

class AdvantageMatch extends LiveSim {
  constructor(seed: number) {
    super(labSheet('rival-reapers'), labSheet('rival-crocs'), seed);
  }

  get originalMark() { return this.advantage?.mark; }
  get restartMark() { return this.penaltyOpen()?.mark; }
  get tackleCount() { return this.tackles; }
}

function passage(seed: number, from: number, to: number) {
  const sim = new AdvantageMatch(seed);
  const ticks = [];
  for (let tick = 1; tick <= to; tick++) {
    sim.step();
    if (tick >= from) ticks.push({ snap: sim.snapshot(), mark: sim.originalMark, restart: sim.restartMark, tackles: sim.tackleCount });
  }
  return ticks;
}

describe('penalty advantage', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('plays advantage after retained possession and waives the penalty on real ground gained', () => {
    const frames = passage(10, 2231, 2272);
    const first = frames[0]!;
    const last = frames[frames.length - 1]!;
    expect(first.snap.events.map(e => e.kind)).toContain('advantage');
    expect(refereeSignal(first.snap)).toBe('advantage');
    expect(frames.slice(0, -1).every(f => f.snap.advantage?.side === 'away')).toBe(true);
    expect(frames.some(f => f.snap.ball.flight?.via === 'roll')).toBe(true);
    expect(last.snap.ball.holder?.side).toBe('away');
    expect(first.mark!.x - last.snap.ball.x).toBeGreaterThanOrEqual(PENALTY.advantageGainM);
    expect(last.snap.events.map(e => e.kind)).toContain('advantage-over');
    expect(last.snap.advantage).toBeUndefined();
    expect(last.tackles).toBe(first.tackles);
    expect(frames.flatMap(f => f.snap.events).some(e => e.kind === 'penalty')).toBe(false);
    expect(passage(10, 2231, 2272)).toEqual(frames);
  });

  it('awards one penalty at the original mark when the carry is stopped short', () => {
    const frames = passage(8, 667, 714);
    const first = frames[0]!;
    const last = frames[frames.length - 1]!;
    expect(first.snap.events.map(e => e.kind)).toContain('advantage');
    expect(frames.some(f => f.snap.phase?.kind === 'tackle')).toBe(true);
    expect(last.restart).toEqual(first.mark);
    expect(last.tackles).toBe(0);
    expect(last.snap.advantage).toBeUndefined();
    const penalties = frames.flatMap(f => f.snap.events).filter(e => e.kind === 'penalty');
    expect(penalties).toHaveLength(1);
    expect(penalties[0]).toMatchObject({ recalled: true, detail: 'offside', tick: last.snap.tick });
    expect(popupFor(penalties[0]!)?.word).toBe('BACK FOR PENALTY');
  });

  it('takes advantage on a try even when the goal line is less than eight metres away', () => {
    const frames = passage(62, 1423, 1471);
    expect(frames[0]!.snap.advantage?.side).toBe('home');
    const scored = frames[frames.length - 1]!.snap;
    expect(scored.events.map(e => e.kind)).toEqual(['advantage-over', 'try']);
    expect(scored.advantage).toBeUndefined();
  });

  it('recalls at the deadline when the passage has yielded neither ground nor a break', () => {
    const from = 2192;
    const frames = passage(29, from, from + PENALTY.advantageTicks);
    expect(frames[frames.length - 2]!.snap.advantage).toBeDefined();
    expect(frames[frames.length - 1]!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', recalled: true }));
  });

  it('keeps the immediate whistle when the window is disabled', () => {
    restore = applyTuning({ 'penalty.advantageTicks': 0 });
    const [frame] = passage(8, 667, 667);
    expect(frame!.snap.advantage).toBeUndefined();
    expect(frame!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', detail: 'offside' }));
  });
});
