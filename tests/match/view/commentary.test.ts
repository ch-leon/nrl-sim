// tests/match/view/commentary.test.ts — the ticker's lines for the live sim (N15.2):
// every kind live.ts emits has lines of its own, three or more; the same seed reads
// the same; no line is wider than the ticker at 844×390.
import { describe, it, expect } from 'vitest';
import { Commentator, LINES, TICKER_FIT_CHARS, fillLine, lineKey, shortName, summaryLines, variantIndex } from '../../../src/match/view/commentary';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { CALL_LABEL, COACH_CALLS } from '../../../src/match/league/calls';
import { PRESET_LABEL } from '../../../src/match/league/presets';
import { FIRST_NAMES, SURNAMES } from '../../../src/data/names';
import { LADDER_NAME_MAX } from '../../../src/ui/screens/fixtures';
import type { Side, SimEvent } from '../../../src/match/core/snapshot';
import type { MatchEvent, MatchResult } from '../../../src/sim/events';

/** Every event kind the live sim emits, read off its source: a kind added there without lines fails here. */
const LIVE_SRC = Object.values(import.meta.glob('../../../src/match/league/live.ts', { query: '?raw', import: 'default', eager: true }))[0] as string;
function emittedKinds(): string[] {
  const src = LIVE_SRC;
  const kinds = new Set<string>();
  // this.emit(<kind>, ...): the first argument's string literals (one is a ternary of two kinds).
  for (const m of src.matchAll(/this\.emit\(([^,]+),/g)) for (const k of m[1]!.matchAll(/'([a-z0-9-]+)'/g)) kinds.add(k[1]!);
  // Events pushed whole (a call paying off).
  for (const m of src.matchAll(/events\.push\(\{[^}]*kind: '([a-z0-9-]+)'/g)) kinds.add(m[1]!);
  return [...kinds].sort();
}

const linesFor = (kind: string): string[] => Object.keys(LINES).filter((k) => k === kind || k.startsWith(`${kind}:`));

const ev = (kind: string, extra: Partial<SimEvent> = {}): SimEvent => ({ tick: 500, kind, text: `(the sim's own ${kind} text)`, side: 'home', slot: 3, player: 'Jarrah Kavanagh', ...extra });
/** An event that names nobody (a dead ball, the whistle): no player, and no side unless given. */
const nobody = (kind: string, extra: Partial<SimEvent> = {}): SimEvent => {
  const e = ev(kind, extra);
  delete e.player;
  delete e.slot;
  if (!extra.side) delete e.side;
  return e;
};

/** One event per kind and detail the sim emits, as live.ts makes them (who it names, what detail it carries). */
const SAMPLES: SimEvent[] = [
  ev('kickoff'), ev('drop-out'),
  ...['long', 'bomb', 'grubber', 'chip', 'cross-field'].map((d) => ev('kick', { detail: d })),
  ev('set-start'), ev('regather'), ev('drop'), ev('40-20'), ev('on-full'),
  // Kick contests (#99).
  ev('regather', { detail: 'contest' }), ev('drop', { detail: 'knock-on' }), ev('loose-ball'), ev('loose-ball', { detail: 'in-goal' }), ev('set-start', { detail: 'scramble' }), ev('regather', { detail: 'scramble' }),
  ev('touch', { detail: 'kick' }), ev('touch', { detail: 'penalty' }), ev('touch', { detail: 'bundled' }),
  nobody('touch', { detail: 'loose' }), nobody('touch'),
  nobody('dead-ball', { detail: '20m' }), ev('dead-ball', { detail: '20m' }), ev('dead-ball'),
  nobody('dead-ball', { detail: 'drop-out' }), ev('dead-ball', { detail: 'held' }),
  nobody('dead-ball'),
  ev('charge-down'), ev('handover'), ev('six-again'), ev('quick-ptb'), ev('slow-ptb'), ev('dart'),
  ev('line-break'), ev('step'), ev('fend'), ev('break-tackle'), ev('break-tackle', { detail: 'wrestle' }), ev('offload'), ev('cut-out'),
  ev('tackle'), ev('tackle', { trait: 'Wrecking Ball II' }), ev('big-hit'), ev('run-down'), ev('intercept'), ev('gamble'), ev('strip'),
  ev('loose'), nobody('loose'), ev('error'), ev('error', { detail: 'contact' }),
  ev('gassed'), ev('blown'), ev('injury'), ev('interchange'),
  ev('penalty', { detail: 'offside' }), ev('penalty', { detail: 'high' }),
  ...['goal', 'tap', 'touch'].map((d) => ev('penalty-choice', { detail: d })), ev('tap'),
  ...['high', 'professional', 'repeat', 'offside'].map((d) => ev('sin-bin', { detail: d })), ev('sin-bin-return'),
  ev('try'), ev('try', { detail: 'bonus' }),
  ...['conversion', 'penalty-goal', 'field-goal'].flatMap((k) => ['good', 'missed'].map((d) => ev(k, { detail: d }))), ev('drop-goal'),
  ...COACH_CALLS.flatMap((c) => [ev('coach-call', { detail: c }), nobody('call-paid', { detail: c, side: 'home' })]),
  ev('plan', { detail: 'kick-chase/compressed' }),
  nobody('siren'),
  nobody('half-time', { side: 'home' }), nobody('golden-point', { side: 'home' }),
  nobody('full-time', { side: 'home' }), nobody('full-time', { side: 'home', detail: 'golden-point' }),
];

describe('the lines', () => {
  it('cover every kind the live sim emits (read off live.ts)', () => {
    const kinds = emittedKinds();
    expect(kinds.length).toBeGreaterThan(50);
    const missing = kinds.filter((k) => linesFor(k).length === 0);
    expect(missing, `kinds with no lines: ${missing.join(', ')}`).toEqual([]);
    // And every kind has a sample here, so its every detail is said below.
    const sampled = new Set(SAMPLES.map((e) => e.kind));
    expect(kinds.filter((k) => !sampled.has(k))).toEqual([]);
  });

  it('give every moment at least three lines, all different', () => {
    for (const [key, lines] of Object.entries(LINES)) {
      expect(lines.length, key).toBeGreaterThanOrEqual(3);
      expect(new Set(lines).size, key).toBe(lines.length);
    }
  });

  it('say every sampled moment in their own words, never the sim\'s text', () => {
    const score = { home: 18, away: 12 };
    for (const e of SAMPLES) {
      const c = new Commentator(7, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' });
      const key = lineKey(e, false, score);
      expect(LINES[key], `${e.kind}:${e.detail ?? ''} → ${key}`).toBeDefined();
      const line = c.line(e, score);
      expect(line, `${e.kind}:${e.detail ?? ''}`).not.toBe(e.text);
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('use the words the pop-ups and the Guide use', () => {
    const all = Object.values(LINES).flat().join(' ');
    for (const w of ['Six again', 'tap and go', '40/20', 'sin bin', 'drop-out', 'bomb', 'grubber', 'offload', 'line break', 'golden point', 'bonus try', 'knock-on', 'dummy-half', 'play-the-ball', 'handover', 'interchange']) {
      expect(all.toLowerCase(), w).toContain(w.toLowerCase());
    }
  });

  it('name kicks by type, the captain\'s call, a bonus try and a kick at goal good or missed', () => {
    const c = new Commentator(3, { home: 'Home Side', away: 'Away Side' });
    expect(lineKey(ev('kick', { detail: 'bomb' }), false)).toBe('kick:bomb');
    expect(lineKey(ev('kick', { detail: 'mystery' }), false)).toBe('kick:long');
    expect(lineKey(ev('penalty-choice', { detail: 'touch' }), false)).toBe('penalty-choice:touch');
    expect(lineKey(ev('try', { detail: 'bonus' }), false)).toBe('try:bonus');
    expect(lineKey(ev('conversion', { detail: 'missed' }), false)).toBe('conversion:missed');
    expect(LINES['try:bonus']!.every((l) => /zone|bonus|five/i.test(l))).toBe(true);
    expect(c.line(ev('coach-call', { detail: 'shift-left' }))).toMatch(/shift left/i);
    expect(c.line(ev('plan', { detail: 'kick-chase/compressed' }))).toContain('Kick-chase / Compressed');
  });

  it('tell a kick that is caught from a loose ball scooped up', () => {
    const c = new Commentator(5, { home: 'Home Side', away: 'Away Side' });
    c.line(ev('kick', { tick: 10, detail: 'bomb' }));
    // A chaser blowing hard under the ball does not bring the kick down.
    c.line(ev('blown', { tick: 11 }));
    expect(LINES['set-start:caught']).toContain(templateOf(c.line(ev('set-start', { tick: 12 })), 'set-start:caught'));
    expect(LINES['set-start:gathered']).toContain(templateOf(c.line(ev('set-start', { tick: 40 })), 'set-start:gathered'));
  });

  it('read a kick that came to ground and was picked up as a scoop, not a catch', () => {
    const c = new Commentator(5, { home: 'Home Side', away: 'Away Side' });
    c.line(ev('kick', { tick: 10, detail: 'long' }));
    // The kick's own tick, and a ball up in the air or in a man's hands, do not bring it down.
    c.ball({ lift: 0, holder: null }, 10);
    c.ball({ lift: 6, holder: null }, 30);
    c.ball({ lift: 0, holder: { side: 'away', slot: 1 } }, 40);
    expect(LINES['set-start:caught']).toContain(templateOf(c.line(ev('set-start', { tick: 41 })), 'set-start:caught'));
    // Down to the ground on its last tick and caught the tick after: still a catch.
    c.line(ev('kick', { tick: 50, detail: 'bomb' }));
    c.ball({ lift: 0, holder: null }, 60);
    c.ball({ lift: 1, holder: { side: 'home', slot: 2 } }, 61);
    expect(LINES['set-start:caught']).toContain(templateOf(c.line(ev('set-start', { tick: 61 })), 'set-start:caught'));
    // It lands with nobody under it and bounces (on the ground two ticks running): whoever picks it up scoops it.
    c.line(ev('kick', { tick: 70, detail: 'long' }));
    c.ball({ lift: 3, holder: null }, 75);
    c.ball({ lift: 0, holder: null }, 80);
    c.ball({ lift: 0, holder: null }, 81);
    c.ball({ lift: 0.6, holder: null }, 82);
    expect(LINES['set-start:gathered']).toContain(templateOf(c.line(ev('set-start', { tick: 99 })), 'set-start:gathered'));
  });

  it('score the whistles from the snapshot: who leads, level, golden point', () => {
    expect(lineKey(ev('half-time'), false, { home: 6, away: 4 })).toBe('half-time:lead');
    expect(lineKey(ev('half-time'), false, { home: 4, away: 4 })).toBe('half-time:level');
    expect(lineKey(ev('full-time'), false, { home: 4, away: 10 })).toBe('full-time:win');
    expect(lineKey(ev('full-time'), false, { home: 10, away: 10 })).toBe('full-time:draw');
    const c = new Commentator(9, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' });
    expect(c.line(nobody('full-time'), { home: 4, away: 10 })).toMatch(/Zone Test FC.*10–4/);
  });
});

/** Which of a moment's templates a line came from (by filling each the same way). */
function templateOf(line: string, key: string): string {
  return LINES[key]!.find((t) => fillLine(t, { player: 'Jarrah Kavanagh', team: 'Side', other: 'Side' }) === line) ?? `(no ${key} template gives "${line}")`;
}

describe('the voice is seeded, never rolled', () => {
  /** A whole match through a Commentator as LivePlayback drives it: each tick's events, then its ball. */
  const play = (seed: number): { lines: string[]; kinds: Set<string>; pickups: { text: string; line: string; player: string }[] } => {
    const sim = new LiveSim(sideSheet('H', { rating: 62 }), sideSheet('A', { rating: 58 }), seed);
    const c = new Commentator(seed, { home: 'Launceston Larrikins', away: 'Shellharbour Scorpions' });
    const lines: string[] = [];
    const kinds = new Set<string>();
    const pickups: { text: string; line: string; player: string }[] = [];
    while (!sim.finished && sim.tick < 100_000) {
      sim.step();
      const snap = sim.snapshot();
      for (const e of sim.tickEvents) {
        kinds.add(e.kind);
        // A kind the sim emits always has lines of ours (caught or not).
        expect(LINES[lineKey(e, false, snap.score)] && LINES[lineKey(e, true, snap.score)], `${e.kind}:${e.detail ?? ''}`).toBeDefined();
        const line = c.line(e, snap.score);
        lines.push(line);
        if (e.kind === 'set-start') pickups.push({ text: e.text, line, player: e.player ?? '' });
      }
      c.ball(snap.ball, snap.tick);
    }
    return { lines, kinds, pickups };
  };

  it('says a catch where the sim has the kick taken and a scoop where it has the ball scooped up', () => {
    const said = (key: string, p: { line: string; player: string }): boolean => LINES[key]!.some((t) => fillLine(t, { player: p.player }) === p.line);
    let caught = 0;
    let scooped = 0;
    for (const seed of [21, 22, 23, 24]) {
      for (const p of play(seed).pickups) {
        if (p.text.includes('takes the kick')) {
          caught++;
          expect(said('set-start:caught', p), `${p.text} → ${p.line}`).toBe(true);
        } else if (p.text.includes('scoops it up')) {
          scooped++;
          expect(said('set-start:gathered', p), `${p.text} → ${p.line}`).toBe(true);
        }
      }
    }
    expect(caught).toBeGreaterThan(5);
    expect(scooped).toBeGreaterThan(5);
  });

  it('reads a match the same way twice with the same seed, and differently with another', () => {
    const a = play(11);
    expect(a.lines.length).toBeGreaterThan(100);
    expect(play(11).lines).toEqual(a.lines);
    expect(play(12).lines).not.toEqual(a.lines);
  });

  it('hashes the seed, the tick and the moment: no state but what it heard', () => {
    expect(variantIndex(3, 42, 'tackle', 100, 0)).toBe(variantIndex(3, 42, 'tackle', 100, 0));
    const spread = new Set(Array.from({ length: 60 }, (_, t) => variantIndex(4, 42, 'tackle', t, 0)));
    expect(spread.size).toBe(4);
    // The whistles hash the seed alone: a skipped match ends on the line a played one would.
    expect(variantIndex(3, 42, 'full-time:win', 100, 0)).toBe(variantIndex(3, 42, 'full-time:win', 9999, 3));
  });

  it('never says the same line twice running for a moment', () => {
    const c = new Commentator(1, { home: 'Home Side', away: 'Away Side' });
    let prev = '';
    for (let t = 0; t < 200; t++) {
      const line = c.line(ev('tackle', { tick: t }));
      expect(line).not.toBe(prev);
      prev = line;
    }
  });

  it('ends a match skipped in the Worker on the line it would have ended on', () => {
    const score: Record<Side, number> = { home: 22, away: 16 };
    const played = new Commentator(77, { home: 'Home Side', away: 'Away Side' });
    const skipped = new Commentator(77, { home: 'Home Side', away: 'Away Side' });
    expect(skipped.fullTime(score, false)).toBe(played.line(nobody('full-time', { tick: 12345 }), score));
    expect(skipped.fullTime({ home: 5, away: 4 }, true)).toBe(
      new Commentator(77, { home: 'Home Side', away: 'Away Side' }).line(nobody('full-time', { detail: 'golden-point' }), { home: 5, away: 4 }),
    );
  });
});

describe('the ticker at 844×390', () => {
  // The longest names the game makes: a generated player, a club named to the ladder's
  // limit (a longer one has its last word, or the ticker's ellipsis), the longest call and plan.
  const longest = (xs: readonly string[]): string => xs.reduce((a, b) => (b.length > a.length ? b : a), '');
  const player = `${longest(FIRST_NAMES)} ${longest(SURNAMES)}`;
  const club = 'W'.repeat(LADDER_NAME_MAX);
  const call = longest(Object.values(CALL_LABEL)).toLowerCase();
  const presets = Object.values(PRESET_LABEL);
  const plan = `${longest(presets)} / ${longest(presets)}`;

  it('holds every line, filled with the longest names', () => {
    const fill = { player, team: club, other: club, leader: club, winner: club, hi: 48, lo: 44, margin: 4, call, plan, n: 'three', m: 'three' };
    const over = Object.entries(LINES)
      .flatMap(([key, lines]) => lines.map((l) => [key, fillLine(l, fill)!] as const))
      .filter(([, l]) => l.length > TICKER_FIT_CHARS)
      .map(([key, l]) => `${key}: "${l}" (${l.length})`);
    expect(player.length).toBeGreaterThanOrEqual(20);
    expect(over).toEqual([]);
  });

  it('names a club by its last word, as the report does', () => {
    expect(shortName('Shellharbour Scorpions')).toBe('Scorpions');
    expect(shortName('Zone Test FC')).toBe('Zone Test FC');
    expect(shortName('Live Test FC')).toBe('Live Test FC');
  });

  it('a long typed club whose last word is too short to stand alone uses an earlier word (#433)', () => {
    expect(shortName('Murwillumbah Mountain Go')).toBe('Mountain');
    expect(shortName('Go')).toBe('Go');
    const player = 'Mackenzie Tuilagi-Fonoti';
    expect([...player].length).toBe(24);
    const team = shortName('Murwillumbah Mountain Go');
    const line = fillLine('TRY! {player} scores for {team}.', { player, team });
    expect(line).toBe('TRY! Mackenzie Tuilagi-Fonoti scores for Mountain.');
    expect(line!.length).toBeLessThanOrEqual(TICKER_FIT_CHARS);
  });
});

describe('the report summary', () => {
  const t = (teamId: string, player: string, detail?: string): MatchEvent => ({ t: 5, kind: 'try', teamId, player, ...(detail ? { detail } : {}) });
  const result = (homeScore: number, awayScore: number, events: MatchEvent[]): MatchResult => ({
    homeScore,
    awayScore,
    events: [...events, { t: 18, kind: 'full-time', teamId: 'H' }],
    stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
    weather: 'clear',
    momentumTimeline: [],
    injuries: [],
  });
  const H = { id: 'H', name: 'Launceston Larrikins' };
  const A = { id: 'A', name: 'Zone Test FC' };

  it('leads with the final whistle, then the tries', () => {
    const r = result(8, 13, [t('A', 'Jett Iliffe'), t('A', 'Jett Iliffe', 'bonus'), t('H', 'Kade Mbyerson'), t('H', 'Kobi Lomax')]);
    const [whistle, story] = summaryLines(r, H, A);
    expect(LINES['full-time:win']!.map((l) => fillLine(l, { winner: 'Zone Test FC', hi: 13, lo: 8 }))).toContain(whistle);
    expect(story).toMatch(/Jett Iliffe/);
    expect(story).toMatch(/two|2/i);
    expect(summaryLines(r, H, A)).toEqual([whistle, story]);
  });

  it('tells a draw, tries apiece, a tryless match and golden point', () => {
    const draw = summaryLines(result(4, 4, [t('H', 'A One'), t('A', 'B Two')]), H, A);
    expect(LINES['full-time:draw']!.map((l) => fillLine(l, { hi: 4, lo: 4 }))).toContain(draw[0]);
    expect(LINES['story:even']!.map((l) => fillLine(l, { n: 'one' }))).toContain(draw[1]);
    const none = summaryLines(result(2, 0, []), H, A);
    expect(LINES['story:none']).toContain(none[1]);
    const gp = result(5, 4, [t('H', 'A One'), t('A', 'B Two')]);
    gp.events[gp.events.length - 1] = { t: 20, kind: 'full-time', teamId: 'H', detail: 'golden-point' };
    expect(LINES['full-time:golden-point']!.map((l) => fillLine(l, { winner: 'Larrikins', hi: 5, lo: 4 }))).toContain(summaryLines(gp, H, A)[0]);
  });
});
