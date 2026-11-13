import { describe, expect, it } from 'vitest';
import type { Side, SimEvent } from '../../../src/match/core/snapshot';
import { MATCH_MINUTES, measureCell, type CellResult } from '../../../src/match/balance/measure';
import { reportMarkdown, sharesOf } from '../../../src/match/balance/report';
import { PlayWatch, ScoreLine, type TickView } from '../../../src/match/balance/watch';

const ev = (tick: number, kind: string, side?: Side, detail?: string): SimEvent => ({ tick, kind, text: '', ...(side ? { side } : {}), ...(detail ? { detail } : {}) });

describe('score line', () => {
  const END = 14 * 60;
  it('counts a lead change only when the lead passes to the other side', () => {
    const s = new ScoreLine(END);
    s.note(60, 'home', 4); // first score: not a change
    s.note(120, 'home', 2);
    s.note(180, 'away', 4); // 6-4, still home's
    s.note(200, 'away', 4); // 6-8: away takes it
    s.note(300, 'home', 2); // level
    s.note(310, 'away', 1); // away ahead again after being level: not a change
    s.note(400, 'home', 4); // home takes it back
    expect(s.leadChanges).toBe(2);
  });
  it('reads the margin a minute out and what the last minute decided', () => {
    const level = new ScoreLine(END);
    level.note(100, 'home', 4);
    level.note(200, 'away', 4);
    level.note(END - 30, 'home', 4); // the winner scores inside the last minute
    expect(level.result()).toMatchObject({ closeLate: 1, decidedLate: 1, comeback: 0 });
    const settled = new ScoreLine(END);
    settled.note(100, 'home', 12);
    settled.note(END - 90, 'away', 4);
    settled.note(END - 10, 'away', 2); // a late try that does not change the winner
    expect(settled.result()).toMatchObject({ closeLate: 0, decidedLate: 0 });
  });
  it('counts a siren conversion as the last minute, and a draw as decided by nobody', () => {
    const s = new ScoreLine(END);
    s.note(100, 'home', 4);
    s.note(END + 5, 'home', 2);
    expect(s.result().decidedLate).toBe(0); // home was already ahead a minute out
    const d = new ScoreLine(END);
    d.note(100, 'home', 4);
    d.note(END - 20, 'away', 4);
    expect(d.result()).toMatchObject({ decidedLate: 0, comeback: 0, closeLate: 1 });
  });
  it("takes the winner's biggest deficit, over the whole match", () => {
    const s = new ScoreLine(END);
    s.note(60, 'away', 4);
    s.note(120, 'away', 4);
    s.note(130, 'away', 2); // home 0-10
    s.note(300, 'home', 4);
    s.note(310, 'home', 4);
    s.note(500, 'home', 4); // 12-10
    expect(s.result().comeback).toBe(10);
    // A winner who never trailed overcame nothing; the loser's deficit does not count.
    const w = new ScoreLine(END);
    w.note(60, 'home', 4);
    w.note(100, 'home', 4);
    expect(w.result().comeback).toBe(0);
  });
  it('a match with no scoring is close, level and undecided', () => {
    expect(new ScoreLine(END).result()).toEqual({ leadChanges: 0, closeLate: 1, decidedLate: 0, comeback: 0 });
  });
});

/** A sim view for the watcher: x is where the ball is read, `phase` and friends are what the tick left. */
const view = (o: Partial<TickView> & { xs?: number } = {}): TickView => ({ phase: 'play', lastPlay: false, attacking: 'home', holder: -1, x: () => o.xs ?? 50, ...o });

describe('try origins', () => {
  const origin = (run: (w: PlayWatch) => void): Record<string, number> => {
    const w = new PlayWatch();
    run(w);
    return Object.fromEntries(Object.entries(w.origins).filter(([, n]) => n > 0));
  };
  const tryAt = (w: PlayWatch, tick: number, side: Side, x: number): void => w.tick([ev(tick, 'try', side)], view({ xs: x }));

  it('a try from nothing in particular is other', () => {
    expect(origin((w) => tryAt(w, 10, 'home', 100))).toEqual({ other: 1 });
  });
  it('a try off the side own bomb, grubber, chip or cross-field within 12 s is a kick try; a long kick is not', () => {
    for (const detail of ['bomb', 'grubber', 'chip', 'cross-field']) {
      expect(origin((w) => { w.tick([ev(10, 'kick', 'home', detail)], view()); tryAt(w, 10 + 240, 'home', 100); })).toEqual({ kick: 1 });
    }
    expect(origin((w) => { w.tick([ev(10, 'kick', 'home', 'long')], view()); tryAt(w, 40, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([ev(10, 'kick', 'home', 'bomb')], view()); tryAt(w, 10 + 241, 'home', 100); })).toEqual({ other: 1 });
  });
  it("the kicker's own regather keeps the link; the other side's, a tackle or a loss of the ball ends it", () => {
    const kick = ev(10, 'kick', 'home', 'grubber');
    expect(origin((w) => { w.tick([kick], view()); w.tick([ev(40, 'set-start', 'home', 'scramble')], view()); tryAt(w, 60, 'home', 0 + 100); })).toEqual({ kick: 1 });
    expect(origin((w) => { w.tick([kick], view()); w.tick([ev(40, 'set-start', 'away')], view()); tryAt(w, 60, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([kick], view()); w.tick([ev(40, 'tackle', 'away')], view({ xs: 60 })); tryAt(w, 60, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([kick], view()); w.tick([ev(40, 'error', 'home')], view()); tryAt(w, 60, 'home', 100); })).toEqual({ other: 1 });
    // The defender spilling the bomb leaves it a kick try for the chasers.
    expect(origin((w) => { w.tick([ev(10, 'kick', 'home', 'bomb')], view()); w.tick([ev(30, 'drop', 'away')], view()); tryAt(w, 50, 'home', 100); })).toEqual({ kick: 1 });
  });
  it('a try the coach\'s set play ran is a set-play try until the play has had its time', () => {
    expect(origin((w) => { w.tick([ev(10, 'set-play', 'home', 'inside-ball')], view()); tryAt(w, 40, 'home', 100); })).toEqual({ setPlay: 1 });
    expect(origin((w) => { w.tick([ev(10, 'set-play', 'home', 'inside-ball')], view()); tryAt(w, 71, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([ev(10, 'set-play', 'home', 'inside-ball')], view()); w.tick([ev(20, 'play-breaks-down', 'home')], view()); tryAt(w, 30, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([ev(10, 'set-play', 'home', 'inside-ball')], view()); w.tick([ev(20, 'tackle', 'away')], view({ xs: 70 })); tryAt(w, 40, 'home', 100); })).toEqual({ other: 1 });
  });
  it('an offload in the same play makes it an offload try, but not across a tackle', () => {
    expect(origin((w) => { w.tick([ev(10, 'offload', 'home')], view()); tryAt(w, 40, 'home', 100); })).toEqual({ offload: 1 });
    expect(origin((w) => { w.tick([ev(10, 'offload', 'home')], view()); w.tick([ev(20, 'tackle', 'away')], view({ xs: 97 })); tryAt(w, 40, 'home', 100); })).toEqual({ drive: 1 });
  });
  it('a line break counts when the scorer got 20 m or more from it, either way up the pitch', () => {
    expect(origin((w) => { w.tick([ev(10, 'line-break', 'home')], view({ xs: 60 })); tryAt(w, 40, 'home', 100); })).toEqual({ break: 1 });
    expect(origin((w) => { w.tick([ev(10, 'line-break', 'home')], view({ xs: 81 })); tryAt(w, 40, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { w.tick([ev(10, 'line-break', 'away')], view({ xs: 40 })); tryAt(w, 40, 'away', 0); })).toEqual({ break: 1 });
    expect(origin((w) => { w.tick([ev(10, 'line-break', 'home')], view({ xs: 80 })); tryAt(w, 40, 'home', 100); })).toEqual({ break: 1 });
    // A break by the other side is no help.
    expect(origin((w) => { w.tick([ev(10, 'line-break', 'away')], view({ xs: 20 })); tryAt(w, 40, 'home', 100); })).toEqual({ other: 1 });
  });
  it('a try off a play-the-ball within 5 m is a drive, from the side that was tackled', () => {
    const tackled = (w: PlayWatch, by: Side, x: number): void => w.tick([ev(10, 'tackle', by)], view({ xs: x }));
    expect(origin((w) => { tackled(w, 'away', 96); tryAt(w, 60, 'home', 100); })).toEqual({ drive: 1 });
    expect(origin((w) => { tackled(w, 'away', 95); tryAt(w, 60, 'home', 100); })).toEqual({ drive: 1 });
    expect(origin((w) => { tackled(w, 'away', 94); tryAt(w, 60, 'home', 100); })).toEqual({ other: 1 });
    expect(origin((w) => { tackled(w, 'home', 98); tryAt(w, 60, 'away', 0); })).toEqual({ other: 1 }); // away had been the tackler's side, not the carrier
    expect(origin((w) => { tackled(w, 'home', 4); tryAt(w, 60, 'away', 0); })).toEqual({ drive: 1 });
    expect(origin((w) => { tackled(w, 'away', 98); w.tick([ev(30, 'penalty', 'away')], view()); tryAt(w, 60, 'home', 100); })).toEqual({ other: 1 });
  });
  it('takes the first rule that fits: kick, set play, offload, break, drive', () => {
    expect(origin((w) => {
      w.tick([ev(1, 'tackle', 'away')], view({ xs: 97 }));
      w.tick([ev(2, 'set-play', 'home')], view());
      w.tick([ev(3, 'line-break', 'home')], view({ xs: 50 }));
      w.tick([ev(4, 'offload', 'home')], view());
      tryAt(w, 5, 'home', 100);
    })).toEqual({ setPlay: 1 });
    expect(origin((w) => {
      w.tick([ev(1, 'tackle', 'away')], view({ xs: 97 }));
      w.tick([ev(3, 'line-break', 'home')], view({ xs: 50 }));
      w.tick([ev(4, 'offload', 'home')], view());
      tryAt(w, 5, 'home', 100);
    })).toEqual({ offload: 1 });
  });
  it('each try is counted once and clears the play', () => {
    const w = new PlayWatch();
    w.tick([ev(1, 'offload', 'home'), ev(2, 'try', 'home')], view({ xs: 100 }));
    w.tick([ev(900, 'try', 'home')], view({ xs: 100 }));
    expect(w.origins).toMatchObject({ offload: 1, other: 1 });
  });
});

describe('last tackles', () => {
  /** Run ticks as the sim would show them: the phase, the man holding the ball, and the events. */
  const play = (steps: { phase?: string; lastPlay?: boolean; holder?: number; es?: SimEvent[] }[]): Record<string, number> => {
    const w = new PlayWatch();
    for (const s of steps) w.tick(s.es ?? [], view({ phase: s.phase ?? 'play', lastPlay: s.lastPlay ?? true, holder: s.holder ?? -1 }));
    w.finish();
    return w.lastTackles;
  };
  it('a kick on the last is a kick, even one the kicker is still running onto', () => {
    expect(play([{ phase: 'ruck' }, { holder: -1 }, { holder: 5 }, { holder: -1, lastPlay: false, es: [ev(9, 'kick', 'home', 'bomb')] }])).toEqual({ kick: 1, run: 0, pass: 0 });
    expect(play([{ phase: 'ruck' }, { holder: 5 }, { holder: -1, lastPlay: false, es: [ev(9, 'drop-goal', 'home')] }])).toEqual({ kick: 1, run: 0, pass: 0 });
  });
  it('a ball one man carries to the tackle is a run, including a dart; a ball that changes hands is a pass', () => {
    expect(play([{ phase: 'ruck' }, { holder: 5 }, { holder: 5 }, { phase: 'tackle' }])).toEqual({ kick: 0, run: 1, pass: 0 });
    expect(play([{ phase: 'ruck' }, { holder: 5 }, { holder: -1 }, { holder: 7 }, { phase: 'tackle', holder: 7 }])).toEqual({ kick: 0, run: 0, pass: 1 });
  });
  it('counts one window per play: only a play that starts on the last tackle, once', () => {
    const w = new PlayWatch();
    // Not a last tackle.
    w.tick([], view({ phase: 'ruck' }));
    w.tick([], view({ phase: 'play', lastPlay: false, holder: 3 }));
    w.tick([], view({ phase: 'tackle', lastPlay: false }));
    // A last-tackle play, and the tackle, the ruck and handover that follow.
    w.tick([], view({ phase: 'ruck', lastPlay: false }));
    w.tick([], view({ phase: 'play', lastPlay: true, holder: 3 }));
    w.tick([], view({ phase: 'tackle', lastPlay: true }));
    w.tick([], view({ phase: 'ruck', lastPlay: true }));
    w.tick([], view({ phase: 'ruck', lastPlay: false, attacking: 'away' }));
    w.tick([], view({ phase: 'play', lastPlay: false, attacking: 'away', holder: 9 }));
    w.finish();
    expect(w.lastTackles).toEqual({ kick: 0, run: 1, pass: 0 });
  });
  it('ignores the other side\'s kick while the window is open', () => {
    expect(play([{ phase: 'ruck' }, { holder: 5 }, { holder: 5, es: [ev(9, 'kick', 'away', 'bomb')] }, { phase: 'tackle' }])).toEqual({ kick: 0, run: 1, pass: 0 });
  });
});

describe('shares', () => {
  const st = (mean: number) => ({ mean, se: 0 });
  it('shares a set of counts in percent, with the binomial error over the events', () => {
    const { shares, perMatch } = sharesOf({ a: st(3), b: st(1) }, ['a', 'b'], 100, MATCH_MINUTES);
    expect(perMatch).toBe(4);
    expect(shares.a.mean).toBeCloseTo(75);
    expect(shares.b.mean).toBeCloseTo(25);
    // 400 events: sqrt(.75 * .25 / 400) = 2.17 points.
    expect(shares.a.se).toBeCloseTo(100 * Math.sqrt((0.75 * 0.25) / 400), 6);
    expect(sharesOf({ a: st(0), b: st(0) }, ['a', 'b'], 10, 14).shares.a).toEqual({ mean: 0, se: 0 });
  });
});

describe('measuring a cell', () => {
  const cell = { variant: { name: 'baseline' }, scenario: { name: 'even', home: { rating: 60 }, away: { rating: 60 } } };
  const sum = (o: Record<string, { mean: number }>): number => Object.values(o).reduce((a, v) => a + v.mean, 0);
  it('every try has one origin and every flow reading is in range', () => {
    const r = measureCell(cell, 3, 6, 5);
    const w = r.watch!;
    expect(sum(w.origins)).toBeCloseTo(r.counts.tries.mean);
    expect(sum(w.lastTackles)).toBeGreaterThan(0);
    expect(w.flow.closeLate.mean).toBeGreaterThanOrEqual(0);
    expect(w.flow.closeLate.mean).toBeLessThanOrEqual(1);
    expect(w.flow.decidedLate.mean).toBeLessThanOrEqual(w.flow.closeLate.mean + 1);
    expect(w.flow.comeback.mean).toBeGreaterThanOrEqual(0);
  });
  it('lead changes scale with a stretch like the other counts, and shares do not', () => {
    const r = measureCell(cell, 2, 2, 5);
    const again = measureCell(cell, 2, 2, 5);
    expect(again.watch).toEqual(r.watch); // deterministic
    // A 2-minute stretch scales counts x7: each match's lead changes read 0, 7, 14…, so the mean of two is a multiple of 3.5.
    const steps = r.watch!.flow.leadChanges.mean / 3.5;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    expect(r.watch!.flow.closeLate.mean).toBeLessThanOrEqual(1);
  });
  it('adds nothing to the existing measurements: the same cell with the watch stripped equals itself', () => {
    const r = measureCell(cell, 2, 3, 9);
    const { watch: _w, ms: _m, ...rest } = r;
    const { watch: _w2, ms: _m2, ...rest2 } = measureCell(cell, 2, 3, 9);
    expect(rest2).toEqual(rest);
    expect(Object.keys(r).slice(-2)).toEqual(['ms', 'watch']);
  });
});

describe('the report', () => {
  const stat = (mean: number) => ({ mean, se: 0.1 });
  const old = measureCell({ variant: { name: 'baseline' }, scenario: { name: 'even', home: { rating: 60 }, away: { rating: 60 } } }, 2, 1, 1);
  const { watch: fresh, ...before } = old;
  const plan = { name: 't', seeds: 2, minutes: 1 };
  const meta = { commit: 'x' };
  it('writes the watchability table after the existing one', () => {
    const md = reportMarkdown({ plan, meta, results: [old] });
    expect(md).toContain('| Variant | Lead changes | Within 6, 1 min out % | Decided last min % |');
    expect(md.indexOf('Legs end H/A')).toBeLessThan(md.indexOf('Lead changes'));
    expect(md).toContain('Last tackle pass %');
  });
  it('reads results from before the measures as absent: no table, no zeros, no failure', () => {
    const noWatch = JSON.parse(JSON.stringify(before)) as CellResult;
    const md = reportMarkdown({ plan, meta, results: [noWatch] });
    expect(md).not.toContain('Lead changes');
    // The existing table is the same with or without the new measures.
    const withIt = reportMarkdown({ plan, meta, results: [old] });
    expect(withIt.startsWith(md.slice(0, md.indexOf('_1 cells')))).toBe(true);
  });
  it('shows a dash for a row that lacks them and compares only rows that have them', () => {
    const variant = { ...JSON.parse(JSON.stringify(before)), variant: 'other' } as CellResult;
    const md = reportMarkdown({ plan, meta, results: [old, variant] });
    const line = md.split('\n').find((l) => l.startsWith('| other | —'))!;
    expect(line).toBeDefined();
    expect(line).not.toContain('(');
    const both = reportMarkdown({ plan, meta, results: [old, { ...old, variant: 'again', watch: { ...fresh!, flow: { ...fresh!.flow, leadChanges: stat(fresh!.flow.leadChanges.mean + 3) } } }] });
    expect(both).toMatch(/\| again \| [\d.]+ \(\+3\.0/);
  });
});
