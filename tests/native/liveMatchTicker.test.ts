// tests/native/liveMatchTicker.test.ts — the iPhone Live Activity's match ticker
// (docs/specs/ios.md §3 (a), Phase 3): what each match event turns the lock screen into.
// Pure, no Capacitor.
import { describe, expect, it } from 'vitest';
import {
  MOMENT_MAX,
  clockLabel,
  finishTicker,
  foldBurst,
  foldEvent,
  poseFor,
  startTicker,
  type Ticker,
} from '../../src/native/liveMatchTicker';
import { mkEvent, type MatchEvent, type MatchEventKind } from '../../src/sim/events';
import { runMatch } from '../../src/match/league/match';
import { sideSheet } from '../../src/match/balance/measure';
import { NINES } from '../../src/match/league/rules';
import { COLOR_TOKENS } from '../../src/ui/tokens';

const HALF = 2.5;
const home = { clubId: 'bri', name: 'Brisbane Broncos', colors: ['#6a1f3d', '#f6b512'] as [string, string] };
const away = { clubId: 'mel', name: 'Melbourne Storm', colors: ['#3c1a5b', '#ffffff'] as [string, string] };

function ticker(mine: 'home' | 'away' = 'home'): Ticker {
  const t = startTicker({ home, away, mine }, HALF);
  if (!t) throw new Error('no ticker');
  return t;
}

const ev = (t: number, kind: MatchEventKind, teamId = 'bri', player?: string, detail?: string): MatchEvent =>
  mkEvent(t, kind, teamId, { ...(player ? { player } : {}), ...(detail ? { detail } : {}) });

function fold(t: Ticker, events: MatchEvent[]): Ticker {
  for (const e of events) t = foldEvent(t, e).ticker;
  return t;
}

describe('startTicker', () => {
  it('ignores a match the player is not in', () => {
    expect(startTicker({ home, away }, HALF)).toBeNull();
    expect(startTicker({ home, away, mine: undefined }, HALF)).toBeNull();
  });

  it('carries both codes, the starred side and the club colours, at 0–0 live in the first half', () => {
    const t = ticker('away');
    expect(t.attributes).toEqual({ homeCode: 'BRI', awayCode: 'MEL', mine: 'away', homeColor: '#6a1f3d', awayColor: '#3c1a5b' });
    expect(t.content).toMatchObject({ homeScore: 0, awayScore: 0, half: 'first', minute: 0, clock: "1st half 0'", state: 'live', pose: 'carry' });
  });

  it('falls back to the home and away tokens for a colour that is not #rrggbb', () => {
    const t = startTicker({ home: { ...home, colors: ['red', '#000'] }, away: { ...away, colors: ['#12345', '#000'] }, mine: 'home' }, HALF)!;
    expect(t.attributes.homeColor).toBe(COLOR_TOKENS.home);
    expect(t.attributes.awayColor).toBe(COLOR_TOKENS.away);
  });
});

describe('score totals (the overlay reducer)', () => {
  it('try 4, bonus try 5, conversion 2, penalty goal 2, field goal 1, misses 0', () => {
    const t = fold(ticker(), [
      ev(0, 'try', 'bri', 'Reece Walsh'),
      ev(0, 'conversion', 'bri', 'Adam Reynolds', 'good'),
      ev(1, 'try', 'mel', 'Ryan Papenhuyzen', 'bonus'),
      ev(1, 'conversion', 'mel', 'Jahrome Hughes', 'missed'),
      ev(2, 'penalty-goal', 'mel', 'Jahrome Hughes', 'good'),
      ev(3, 'field-goal', 'bri', 'Adam Reynolds', 'good'),
      ev(4, 'field-goal', 'mel', 'Cameron Munster', 'missed'),
    ]);
    expect([t.content.homeScore, t.content.awayScore]).toEqual([7, 7]);
  });

  it('lands on the result exactly over whole matches, and Skip collapses to one final update with the alert', () => {
    for (let seed = 0; seed < 4; seed++) {
      const h = sideSheet('H', { rating: 45 + seed * 9 });
      const a = sideSheet('A', { rating: 70 - seed * 7 });
      const res = runMatch(h, a, { seed, weather: 'clear' });
      const t = startTicker({ home: h, away: a, mine: 'home' }, NINES.halfMinutes)!;
      const { ticker: end, update } = foldBurst(t, res.events);
      expect(update, `seed ${seed}`).not.toBeNull();
      expect(update!.content).toMatchObject({ homeScore: res.homeScore, awayScore: res.awayScore, state: 'full-time', pose: 'fulltime', clock: 'Full time' });
      expect(update!.alert?.title).toBe('Full time');
      expect(end.alerted).toBe(true);
    }
  });
});

describe('half and minute labels', () => {
  it('reads the half and the match minute as of the update; the breaks by name', () => {
    expect(clockLabel('live', 'first', 1)).toBe("1st half 1'");
    expect(clockLabel('paused', 'second', 4)).toBe("2nd half 4'");
    expect(clockLabel('live', 'golden', 0)).toBe("Golden point 0'");
    expect(clockLabel('half-time', 'second', 2)).toBe('Half-time');
    expect(clockLabel('full-time', 'second', 5)).toBe('Full time');
  });

  it('follows the events: first half, half-time, second half from its kick-off', () => {
    let t = fold(ticker(), [ev(1, 'tackle', 'mel'), ev(2, 'try', 'bri', 'Reece Walsh')]);
    expect(t.content.clock).toBe("1st half 2'");
    t = fold(t, [ev(2, 'half-time')]);
    expect(t.content).toMatchObject({ state: 'half-time', clock: 'Half-time', half: 'second' });
    t = fold(t, [ev(2, 'kickoff', 'mel'), ev(3, 'run', 'mel')]);
    expect(t.content).toMatchObject({ state: 'live', clock: "2nd half 3'" });
  });

  it('never runs the minute backwards', () => {
    const t = fold(ticker(), [ev(3, 'run'), ev(2, 'try', 'bri', 'Reece Walsh')]);
    expect(t.content.minute).toBe(3);
  });
});

describe('moment line', () => {
  it('names the moment, the man, his side and the minute', () => {
    const lines = (es: MatchEvent[]): string[] => {
      let t = ticker();
      return es.map((e) => (t = foldEvent(t, e).ticker).content.moment);
    };
    expect(lines([
      ev(1, 'try', 'bri', 'Reece Walsh'),
      ev(1, 'conversion', 'bri', 'Adam Reynolds', 'good'),
      ev(2, 'conversion', 'mel', 'Jahrome Hughes', 'missed'),
      ev(2, 'penalty-goal', 'mel', 'Jahrome Hughes', 'good'),
      ev(3, 'field-goal', 'bri', 'Adam Reynolds', 'good'),
      ev(3, 'big-hit', 'mel', 'Nelson Asofa-Solomona'),
      ev(4, 'sin-bin', 'bri', 'Pat Carrigan'),
      ev(4, 'try', 'mel', undefined, 'bonus'),
    ])).toEqual([
      "TRY, Reece Walsh (BRI) 1'",
      "CONVERTED, Adam Reynolds (BRI) 1'",
      "CONVERSION MISSED, Jahrome Hughes (MEL) 2'",
      "PENALTY GOAL, Jahrome Hughes (MEL) 2'",
      "FIELD GOAL, Adam Reynolds (BRI) 3'",
      "BIG HIT, Nelson Asofa-Solomona (MEL) 3'",
      "SIN BIN, Pat Carrigan (BRI) 4'",
      "BONUS TRY, MEL 4'",
    ]);
  });

  it('keeps the last big moment through routine play, and cuts a long line to fit', () => {
    let t = fold(ticker(), [ev(1, 'try', 'bri', 'Reece Walsh'), ev(1, 'tackle', 'mel'), ev(2, 'run', 'bri')]);
    expect(t.content.moment).toBe("TRY, Reece Walsh (BRI) 1'");
    t = foldEvent(t, ev(2, 'try', 'bri', 'Bartholomew Maximilian Featherstonehaugh-Worthington')).ticker;
    expect(t.content.moment.length).toBeLessThanOrEqual(MOMENT_MAX);
    expect(t.content.moment.endsWith('…')).toBe(true);
  });

  it('says who won at full time', () => {
    expect(fold(ticker(), [ev(1, 'try', 'mel', 'Ryan Papenhuyzen'), ev(5, 'full-time')]).content.moment).toBe('MEL win');
    expect(fold(ticker(), [ev(5, 'full-time')]).content.moment).toBe('A draw');
  });
});

describe('pose', () => {
  it('try dives, a big hit wraps up, full time is arms up, the rest carry', () => {
    expect(poseFor('try')).toBe('try');
    expect(poseFor('big-hit')).toBe('tackle');
    expect(poseFor('full-time')).toBe('fulltime');
    for (const k of ['conversion', 'penalty-goal', 'field-goal', 'sin-bin', 'half-time', 'kickoff'] as const) expect(poseFor(k)).toBe('carry');
  });

  it('holds until the next big moment', () => {
    let t = fold(ticker(), [ev(1, 'try', 'bri', 'Reece Walsh'), ev(1, 'tackle', 'mel')]);
    expect(t.content.pose).toBe('try');
    t = fold(t, [ev(1, 'conversion', 'bri', 'Adam Reynolds', 'good')]);
    expect(t.content.pose).toBe('carry');
    t = fold(t, [ev(2, 'big-hit', 'mel', 'Nelson Asofa-Solomona')]);
    expect(t.content.pose).toBe('tackle');
  });
});

describe('what is worth an update, and the alert', () => {
  it('big moments matter; routine play does not; the second-half kick-off does', () => {
    const t = ticker();
    for (const k of ['try', 'conversion', 'penalty-goal', 'field-goal', 'big-hit', 'sin-bin', 'half-time'] as const) expect(foldEvent(t, ev(1, k)).matters, k).toBe(true);
    for (const k of ['run', 'tackle', 'set-start', 'kick', 'error', 'kickoff', 'break', 'sin-bin-return'] as const) expect(foldEvent(t, ev(1, k)).matters, k).toBe(false);
    const ht = fold(t, [ev(2, 'half-time')]);
    expect(foldEvent(ht, ev(2, 'kickoff', 'mel')).matters).toBe(true);
  });

  it('only full time alerts, and only once; nothing after it changes the ticker', () => {
    let t = ticker();
    for (const e of [ev(1, 'try', 'bri', 'A'), ev(2, 'half-time'), ev(2, 'kickoff'), ev(3, 'big-hit', 'mel', 'B')]) {
      const r = foldEvent(t, e);
      expect(r.alert).toBeNull();
      t = r.ticker;
    }
    const ft = foldEvent(t, ev(5, 'full-time'));
    expect(ft.alert).toEqual({ title: 'Full time', body: 'BRI 4 – 0 MEL. BRI win.' });
    const after = foldEvent(ft.ticker, ev(5, 'try', 'mel', 'C'));
    expect(after).toEqual({ ticker: ft.ticker, matters: false, alert: null });
    expect(finishTicker(ft.ticker, { homeScore: 4, awayScore: 0, events: [] }).update).toBeNull();
  });

  it('a burst of routine play sends nothing; a burst with a try sends its end state, silently', () => {
    const t = ticker();
    expect(foldBurst(t, [ev(0, 'kickoff', 'mel'), ev(0, 'run', 'mel'), ev(0, 'tackle', 'bri')]).update).toBeNull();
    const r = foldBurst(t, [ev(1, 'try', 'bri', 'A'), ev(1, 'set-start', 'mel'), ev(1, 'run', 'mel')]);
    expect(r.update).toMatchObject({ content: { homeScore: 4, pose: 'try', state: 'live' }, alert: null });
  });

  it('finishes from the result when the whistle never arrived', () => {
    const t = fold(ticker(), [ev(1, 'try', 'bri', 'A')]);
    const r = finishTicker(t, { homeScore: 10, awayScore: 6, events: [] });
    expect(r.update).toEqual({
      content: expect.objectContaining({ homeScore: 10, awayScore: 6, state: 'full-time', pose: 'fulltime', moment: 'BRI win' }),
      alert: { title: 'Full time', body: 'BRI 10 – 6 MEL. BRI win.' },
    });
  });
});

describe('golden point', () => {
  it('the second whistle is golden point, with its own minute from 0, and the winner says so', () => {
    let t = fold(ticker(), [ev(1, 'try', 'bri', 'A'), ev(2, 'half-time'), ev(2, 'kickoff', 'mel'), ev(4, 'try', 'mel', 'B')]);
    const gp = foldEvent(t, ev(5, 'half-time'));
    expect(gp.matters).toBe(true);
    expect(gp.alert).toBeNull();
    t = gp.ticker;
    expect(t.content).toMatchObject({ half: 'golden', state: 'live', clock: "Golden point 0'", moment: 'GOLDEN POINT, next score wins' });
    t = fold(t, [ev(5, 'kickoff', 'bri'), ev(6, 'field-goal', 'mel', 'Cameron Munster', 'good')]);
    expect(t.content).toMatchObject({ clock: "Golden point 1'", moment: "FIELD GOAL, Cameron Munster (MEL) 1'", awayScore: 5 });
    const ft = foldEvent(t, ev(6, 'full-time', 'bri', undefined, 'golden-point'));
    expect(ft.ticker.content).toMatchObject({ state: 'full-time', moment: 'MEL win in golden point', homeScore: 4, awayScore: 5 });
    expect(ft.alert?.body).toBe('BRI 4 – 5 MEL. MEL win in golden point.');
  });
});

describe('payload', () => {
  it('stays far inside the 4 KB Live Activity limit', () => {
    let t = startTicker({ home: { ...home, name: 'X'.repeat(200) }, away: { ...away, name: 'Y'.repeat(200) }, mine: 'home' }, HALF)!;
    t = foldEvent(t, ev(1, 'try', 'bri', 'Z'.repeat(300))).ticker;
    const bytes = new TextEncoder().encode(JSON.stringify({ attributes: t.attributes, content: t.content, alert: { title: 'Full time', body: 'x'.repeat(60) } })).length;
    expect(bytes).toBeLessThan(1024);
  });
});
