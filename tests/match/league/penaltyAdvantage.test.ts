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
    if (tick >= from) ticks.push({
      snap: sim.snapshot(), mark: sim.originalMark, restart: sim.restartMark, tackles: sim.tackleCount, sets: { ...sim.sets },
    });
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
    // Seeds 1–200, Reapers v Crocs: the first advantage that includes a tackle and comes back to the mark.
    // The open-side shift moves seed 6. The first such passage is seed 4, ticks 6551–6583.
    // With the shift off, seed 6 at 4588–4635 is still that passage.
    const frames = passage(4, 6551, 6583);
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
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      const old = passage(6, 4588, 4635);
      expect(old[0]!.snap.events.map(e => e.kind)).toContain('advantage');
      expect(old[old.length - 1]!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', recalled: true, detail: 'offside' }));
    } finally { shiftOff(); }
  });

  it('takes advantage on a try even when the goal line is less than eight metres away', () => {
    // Seeds 1–200, Reapers v Crocs: the first advantage-over that shares its tick with a try inside 8 m.
    // The open-side shift moves seed 119. The first such try is seed 45, ticks 6064–6104.
    // With the shift off, seed 119 at 5832–5870 is still that try.
    const frames = passage(45, 6064, 6104);
    expect(frames[0]!.snap.advantage?.side).toBe('home');
    const scored = frames[frames.length - 1]!.snap;
    expect(scored.events.map(e => e.kind)).toEqual(['advantage-over', 'try']);
    expect(scored.advantage).toBeUndefined();
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      const old = passage(119, 5832, 5870);
      expect(old[old.length - 1]!.snap.events.map(e => e.kind)).toEqual(['advantage-over', 'try']);
    } finally { shiftOff(); }
  });

  it('recalls at the deadline when the passage has yielded neither ground nor a break', () => {
    // Seeds 1–200, Reapers v Crocs: the first advantage that runs the full window and is then recalled.
    // The open-side shift moves seed 2. The first full window is seed 5, from tick 2253.
    // With the shift off, seed 2 from 4760 is still that recall.
    const from = 2253;
    const frames = passage(5, from, from + PENALTY.advantageTicks);
    expect(frames[frames.length - 2]!.snap.advantage).toBeDefined();
    expect(frames[frames.length - 1]!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', recalled: true }));
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      const oldFrom = 4760;
      const old = passage(2, oldFrom, oldFrom + PENALTY.advantageTicks);
      expect(old[old.length - 2]!.snap.advantage).toBeDefined();
      expect(old[old.length - 1]!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', recalled: true }));
    } finally { shiftOff(); }
  });

  it('starts a new set after a recall on tackle zero', () => {
    // Seeds 1–400, Reapers v Crocs: the first tackle-zero advantage that is recalled
    // into a new set is seed 208, home, ticks 1476–1546. With the shift off, seed 107
    // at 1177–1229 is still the away recall.
    const frames = passage(208, 1476, 1546);
    const first = frames[0]!;
    const last = frames[frames.length - 1]!;
    expect(first.snap.advantage?.side).toBe('home');
    expect(first.tackles).toBe(0);
    expect(last.tackles).toBe(0);
    expect(last.sets.home).toBe(first.sets.home + 1);
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      const old = passage(107, 1177, 1229);
      expect(old[0]!.snap.advantage?.side).toBe('away');
      expect(old[0]!.tackles).toBe(0);
      expect(old[old.length - 1]!.tackles).toBe(0);
      expect(old[old.length - 1]!.sets.away).toBe(old[0]!.sets.away + 1);
    } finally { shiftOff(); }
  });

  it('keeps the immediate whistle when the window is disabled', () => {
    restore = applyTuning({ 'penalty.advantageTicks': 0 });
    // The same offside as the stopped-short witness is an immediate whistle with the window off.
    const [frame] = passage(4, 6551, 6551);
    expect(frame!.snap.advantage).toBeUndefined();
    expect(frame!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', detail: 'offside' }));
    const shiftOff = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      const [old] = passage(6, 4588, 4588);
      expect(old!.snap.advantage).toBeUndefined();
      expect(old!.snap.events).toContainEqual(expect.objectContaining({ kind: 'penalty', detail: 'offside' }));
    } finally { shiftOff(); }
  });
});
