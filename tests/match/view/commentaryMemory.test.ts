// tests/match/view/commentaryMemory.test.ts — the commentator's memory of the match (#637):
// a second try, the lead changing hands, a close finish, a long scoreless spell; each
// said when it should be and only then, in the same words however the match was heard.
import { describe, it, expect } from 'vitest';
import { Commentator, LINES, TICKER_FIT_CHARS, fillLine, isImportantKey, type LineFill } from '../../../src/match/view/commentary';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { FIRST_NAMES, SURNAMES } from '../../../src/data/names';
import { LADDER_NAME_MAX } from '../../../src/ui/screens/fixtures';
import type { Side, SimEvent } from '../../../src/match/core/snapshot';

const NAMES = { home: 'Larrikins', away: 'Scorpions' };
let tick = 100;
const ev = (kind: string, extra: Partial<SimEvent> = {}): SimEvent => ({ tick: (tick += 7), kind, text: `(sim ${kind})`, side: 'home', slot: 3, player: 'Jarrah Kavanagh', ...extra });
const score = (home: number, away: number): Record<Side, number> => ({ home, away });
/** Whether a line is one of a memory key's, filled as given. */
const isLine = (line: string | undefined, key: string, f: LineFill): boolean => LINES[key]!.map((t) => fillLine(t, f)).includes(line ?? null);
/** The memory lines an event adds after its own. */
const extras = (c: Commentator, e: SimEvent, s: Record<Side, number>, minute?: number): string[] => c.said(e, s, minute).slice(1).map((x) => x.text);

describe('the match memory', () => {
  it('says a lead change over a second try when it is both', () => {
    const c = new Commentator(5, NAMES);
    // Away lead throughout the opening so no lead change gets in the way.
    expect(extras(c, ev('try', { side: 'away', player: 'Zac Adams' }), score(0, 4), 1)).toEqual([]);
    expect(extras(c, ev('try', { player: 'Jarrah Kavanagh' }), score(4, 4), 2)).toEqual([]);
    const second = extras(c, ev('try', { player: 'Jarrah Kavanagh' }), score(8, 4), 3);
    expect(second).toHaveLength(1);
    // The second try also takes the lead, and a lead change is the bigger news.
    expect(isLine(second[0], 'memory:take-lead', { team: 'Larrikins' })).toBe(true);
  });

  it('a second try with no lead change says so by name', () => {
    const c = new Commentator(5, NAMES);
    c.said(ev('try', { player: 'A One' }), score(4, 0), 1);
    c.said(ev('try', { player: 'Jarrah Kavanagh' }), score(8, 0), 2);
    c.said(ev('try', { side: 'away', player: 'Zac Adams' }), score(8, 4), 3);
    const second = extras(c, ev('try', { player: 'Jarrah Kavanagh' }), score(12, 4), 4);
    expect(isLine(second[0], 'memory:second-try', { player: 'Jarrah Kavanagh' })).toBe(true);
    const third = extras(c, ev('try', { player: 'Jarrah Kavanagh' }), score(16, 4), 5);
    expect(isLine(third[0], 'memory:hat-trick', { player: 'Jarrah Kavanagh' })).toBe(true);
    const fourth = extras(c, ev('try', { player: 'Jarrah Kavanagh' }), score(20, 4), 6);
    expect(isLine(fourth[0], 'memory:many-tries', { player: 'Jarrah Kavanagh', n: 'four' })).toBe(true);
  });

  it("does not count another side's player of the same name, or a first try", () => {
    const c = new Commentator(5, NAMES);
    expect(extras(c, ev('try', { player: 'Pat Smith' }), score(4, 0), 1)).toEqual([]);
    expect(extras(c, ev('try', { side: 'away', player: 'Pat Smith' }), score(4, 4), 2)).toEqual([]);
  });

  it('says a lead change: "take the lead" the first time, "back in front" after, and not the first points or a level score', () => {
    const c = new Commentator(5, NAMES);
    expect(extras(c, ev('try'), score(4, 0), 1)).toEqual([]);
    expect(extras(c, ev('try', { side: 'away', player: 'Zac Adams' }), score(4, 4), 2)).toEqual([]);
    const take = extras(c, ev('try', { side: 'away', player: 'Ben Cole' }), score(4, 8), 3);
    expect(take).toHaveLength(1);
    expect(isLine(take[0], 'memory:take-lead', { team: 'Scorpions' })).toBe(true);
    const back = extras(c, ev('try', { player: 'Rory Hill' }), score(12, 8), 4);
    expect(isLine(back[0], 'memory:back-in-front', { team: 'Larrikins' })).toBe(true);
    // Extending the lead is not a lead change.
    expect(extras(c, ev('try', { player: 'Tom Hart' }), score(16, 8), 5).every((l) => !isLine(l, 'memory:back-in-front', { team: 'Larrikins' }))).toBe(true);
  });

  it('a penalty goal or a field goal can change the lead too', () => {
    const c = new Commentator(2, NAMES);
    c.said(ev('try'), score(4, 0), 1);
    c.said(ev('try', { side: 'away', player: 'Zac Adams' }), score(4, 4), 2);
    const out = extras(c, ev('field-goal', { side: 'away', detail: 'good' }), score(4, 5), 3);
    expect(out).toHaveLength(1);
    expect(isLine(out[0], 'memory:take-lead', { team: 'Scorpions' })).toBe(true);
  });

  it('uses the finals words when the match is a final', () => {
    const c = new Commentator(5, NAMES, undefined, { knockout: true });
    c.said(ev('try'), score(4, 0), 1);
    c.said(ev('try', { side: 'away', player: 'Zac Adams' }), score(4, 4), 2);
    const out = extras(c, ev('try', { side: 'away', player: 'Ben Cole' }), score(4, 8), 3);
    expect(isLine(out[0], 'memory:lead-final', { team: 'Scorpions' })).toBe(true);
  });

  it('says a side scoring twice running, and a try answered resets the run', () => {
    const c = new Commentator(5, NAMES);
    c.said(ev('try', { player: 'A One' }), score(4, 0), 1);
    const again = extras(c, ev('try', { player: 'B Two' }), score(8, 0), 2);
    expect(isLine(again[0], 'memory:in-a-row', { team: 'Larrikins', n: 'two' })).toBe(true);
    c.said(ev('try', { side: 'away', player: 'C Three' }), score(8, 4), 3);
    expect(extras(c, ev('try', { player: 'D Four' }), score(12, 4), 4)).toEqual([]);
  });

  it('says a close margin late, off a kick at goal, and not early, repeated, or when the game is gone', () => {
    // These scripted times describe the original fourteen-minute commentary fixture.
    const c = new Commentator(5, NAMES, undefined, { matchMinutes: 14 });
    expect(extras(c, ev('conversion', { detail: 'good' }), score(6, 4), 5)).toEqual([]);
    const late = extras(c, ev('conversion', { detail: 'good' }), score(8, 6), 11.2);
    expect(late).toHaveLength(1);
    expect(isLine(late[0], 'memory:close-late', { margin: 2, n: 'three minutes', leader: 'Larrikins' })).toBe(true);
    expect(extras(c, ev('conversion', { detail: 'missed' }), score(8, 6), 11.8)).toEqual([]);
    expect(extras(new Commentator(5, NAMES, undefined, { matchMinutes: 14 }), ev('conversion', { detail: 'good' }), score(26, 6), 12)).toEqual([]);
    const level = extras(new Commentator(5, NAMES, undefined, { matchMinutes: 14 }), ev('conversion', { detail: 'good' }), score(6, 6), 12.5);
    expect(isLine(level[0], 'memory:level-late', { n: 'two minutes' })).toBe(true);
    // No clock, no "to play".
    expect(extras(new Commentator(5, NAMES), ev('conversion', { detail: 'good' }), score(8, 6))).toEqual([]);
  });

  it('says a long scoreless spell once, by side, and rearms when the side scores', () => {
    const c = new Commentator(5, NAMES, undefined, { matchMinutes: 14 });
    expect(extras(c, ev('handover'), score(0, 0), 3)).toEqual([]);
    expect(isLine(extras(c, ev('handover'), score(0, 0), 7)[0], 'memory:scoreless', { n: '7' })).toBe(true);
    expect(extras(c, ev('handover'), score(0, 0), 8)).toEqual([]);
    c.said(ev('try'), score(4, 0), 5.5);
    expect(isLine(extras(c, ev('handover'), score(4, 0), 6.2)[0], 'memory:yet-to-score', { team: 'Scorpions' })).toBe(true);
    expect(extras(c, ev('handover'), score(4, 0), 6.5)).toEqual([]);
    expect(isLine(extras(c, ev('handover'), score(4, 0), 11.6)[0], 'memory:drought', { team: 'Larrikins', n: '6th', m: '4' })).toBe(true);
    expect(extras(c, ev('handover'), score(4, 0), 11.9)).toEqual([]);
  });

  it('uses the actual five-minute default for time remaining, and stops at full time', () => {
    const c = new Commentator(5, NAMES);
    const late = extras(c, ev('conversion', { detail: 'good' }), score(8, 6), 3.5);
    expect(isLine(late[0], 'memory:close-late', { margin: 2, n: 'two minutes', leader: 'Larrikins' })).toBe(true);
    expect(extras(new Commentator(5, NAMES), ev('conversion', { detail: 'good' }), score(8, 6), 5)).toEqual([]);
  });

  it('holds the memory lines, tries, sin bins, clean breaks and penalties, and not a half break or a tackle', () => {
    for (const k of ['try', 'try:bonus', 'sin-bin:high', 'line-break', 'penalty:high', 'golden-point', 'memory:second-try', '40-20']) expect(isImportantKey(k), k).toBe(true);
    for (const k of ['tackle', 'quick-ptb', 'handover', 'tap', 'kick:long']) expect(isImportantKey(k), k).toBe(false);
    expect(isImportantKey('line-break', 'half')).toBe(false);
    const c = new Commentator(5, NAMES);
    expect(c.said(ev('line-break', { detail: 'half' }), score(0, 0), 1)[0]!.important).toBe(false);
    expect(c.said(ev('tackle'), score(0, 0), 1)[0]!.important).toBe(false);
    expect(c.said(ev('try'), score(4, 0), 1)[0]!.important).toBe(true);
  });

  it('gives each high-value key at least three more lines than it had', () => {
    const had: Record<string, number> = { try: 4, 'line-break': 4, 'big-hit': 3, intercept: 3, '40-20': 3, 'field-goal:good': 3 };
    for (const [k, n] of Object.entries(had)) expect(LINES[k]!.length, k).toBeGreaterThanOrEqual(n + 3);
  });
});

describe('the memory is a function of what was heard', () => {
  /** A whole match, as LivePlayback feeds it: every tick's events with that tick's score and clock. */
  const play = (seed: number): string[][] => {
    const sim = new LiveSim(sideSheet('H', { rating: 62 }), sideSheet('A', { rating: 58 }), seed);
    const c = new Commentator(seed, { home: 'Launceston Larrikins', away: 'Shellharbour Scorpions' });
    const out: string[][] = [];
    while (!sim.finished && sim.tick < 100_000) {
      sim.step();
      const snap = sim.snapshot();
      for (const e of sim.tickEvents) out.push(c.said(e, snap.score, snap.clock?.minute, snap.ball.y).map((s) => s.text));
      c.ball(snap.ball, snap.tick);
    }
    return out;
  };

  it('reads a match the same way twice, and says memory lines in a real match', () => {
    const a = play(31);
    expect(play(31)).toEqual(a);
    expect(a.flatMap((l) => l.slice(1)).length).toBeGreaterThan(0);
  });
});

describe('the memory lines fit the strip', () => {
  const longest = (xs: readonly string[]): string => xs.reduce((a, b) => (b.length > a.length ? b : a), '');
  const player = `${longest(FIRST_NAMES)} ${longest(SURNAMES)}`;
  const club = 'W'.repeat(LADDER_NAME_MAX);

  it('holds every new line, filled with the longest names and the longest counts', () => {
    const fill = { player, team: club, other: club, leader: club, margin: 12, n: 'three minutes', m: '48' };
    const over = Object.entries(LINES)
      .filter(([k]) => k.startsWith('memory:') || ['try', 'line-break', 'big-hit', 'intercept', '40-20', 'field-goal:good'].includes(k))
      .flatMap(([key, lines]) => lines.map((l) => [key, fillLine(l, key === 'memory:drought' ? { ...fill, n: '14th' } : key === 'memory:many-tries' || key === 'memory:in-a-row' ? { ...fill, n: 'seven' } : fill)!] as const))
      .filter(([, l]) => l.length > TICKER_FIT_CHARS)
      .map(([key, l]) => `${key}: "${l}" (${l.length})`);
    expect(over).toEqual([]);
  });
});
