// tests/match/league/kickContest.test.ts — the contests a kick sets up (#99,
// BAK-208 §4.3–4.4): the high ball (pure), the race to a grubber in the in-goal
// (pure), and in the live sim a bomb won back, spilled into a scramble and
// caught, a grubber scored and grounded in-goal, the scramble said and counted.
import { describe, it, expect } from 'vitest';
import { KICK_CONTEST, bombPeak, chaserWins, grubberRace, highBall } from '../../../src/match/league/kickContest';
import { KICKOFF, regatherChance } from '../../../src/match/league/kickoff';
import { WEATHER } from '../../../src/match/league/weather';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { toMatchEvent } from '../../../src/match/league/events';
import { popupFor } from '../../../src/match/view/popups';
import { Commentator, LINES, fillLine } from '../../../src/match/view/commentary';
import { buildMatchReport } from '../../../src/ui/screens/matchReport';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { MatchResult } from '../../../src/sim/events';

describe('the high ball (pure)', () => {
  it('the kick-off regather is the same contest: chaserWins on the Short knobs', () => {
    for (const [speed, skill] of [[60, 60], [90, 30], [30, 90], [75, 50]] as const) {
      expect(regatherChance(speed, skill)).toBe(chaserWins(KICKOFF.short, speed, skill));
    }
    expect(regatherChance(60, 60)).toBe(KICKOFF.short.base);
  });

  it('goes the chaser’s way with his Speed, the catcher’s way with his Skill, and stays inside its bounds', () => {
    let last = -1;
    for (let speed = 20; speed <= 99; speed += 5) {
      const { won, spill } = highBall(speed, 60, 20, false);
      expect(won).toBeGreaterThanOrEqual(last);
      last = won;
      expect(won).toBeGreaterThanOrEqual(KICK_CONTEST.bomb.won.min);
      expect(won).toBeLessThanOrEqual(KICK_CONTEST.bomb.won.max);
      expect(won + spill).toBeLessThan(1);
      expect(spill).toBeGreaterThanOrEqual(0);
    }
    let lastSpill = 2;
    let lastWon = 2;
    for (let skill = 20; skill <= 99; skill += 5) {
      const { won, spill } = highBall(60, skill, 20, false);
      expect(won).toBeLessThanOrEqual(lastWon);
      expect(won + spill).toBeLessThanOrEqual(lastSpill + lastWon);
      lastWon = won;
      lastSpill = spill;
    }
    // The extremes are clamped, never certain.
    expect(highBall(99, 1, 40, true, 3).won).toBe(KICK_CONTEST.bomb.won.max);
    expect(highBall(1, 99, 20, false).won).toBe(KICK_CONTEST.bomb.won.min);
    expect(highBall(99, 1, 40, true, 3).won + highBall(99, 1, 40, true, 3).spill).toBeLessThanOrEqual(1);
  });

  it('rain makes the catcher spill more and win nothing back for it', () => {
    const dry = highBall(60, 60, 20, false, 1);
    const wet = highBall(60, 60, 20, false, WEATHER.rainHandling);
    expect(wet.spill).toBeGreaterThan(dry.spill);
    expect(wet.won).toBe(dry.won);
    expect(1 - wet.won - wet.spill).toBeLessThan(1 - dry.won - dry.spill); // fewer clean catches
  });

  it('a higher kick (Big Boot) and a Kick-chase side win more of them back', () => {
    expect(bombPeak(0)).toBe(KICK_CONTEST.bomb.peak);
    expect(bombPeak(3)).toBeGreaterThan(bombPeak(1));
    const plain = highBall(60, 60, bombPeak(0), false);
    expect(highBall(60, 60, bombPeak(3), false).won).toBeGreaterThan(plain.won);
    expect(highBall(60, 60, bombPeak(0), true).won).toBeGreaterThan(plain.won);
    expect(highBall(60, 60, bombPeak(3), true).won).toBeGreaterThan(highBall(60, 60, bombPeak(3), false).won);
  });
});

describe('the race to a grubber in the in-goal (pure)', () => {
  it('a dead heat is a coin toss; the quicker man wins more of them; a big edge always wins', () => {
    expect(grubberRace(1, 1)).toBeCloseTo(0.5);
    expect(grubberRace(0.8, 1)).toBeGreaterThan(0.5);
    expect(grubberRace(1.2, 1)).toBeLessThan(0.5);
    expect(grubberRace(0, 2 * KICK_CONTEST.grubber.bounceS)).toBe(1);
    expect(grubberRace(2 * KICK_CONTEST.grubber.bounceS, 0)).toBe(0);
    let last = 2;
    for (let a = 0; a <= 3; a += 0.1) {
      const p = grubberRace(a, 1.5);
      expect(p).toBeLessThanOrEqual(last);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      last = p;
    }
    expect(grubberRace(1, 1, true)).toBeGreaterThan(grubberRace(1, 1, false));
  });
});

/** Play seeds of whole even matches and keep every event; stop early once `enough` says so. */
function play(seeds: readonly number[], enough: (es: readonly SimEvent[]) => boolean, attack: 'balanced' | 'kick-chase' = 'kick-chase'): { es: SimEvent[]; matches: { seed: number; es: SimEvent[] }[] } {
  const es: SimEvent[] = [];
  const matches: { seed: number; es: SimEvent[] }[] = [];
  for (const seed of seeds) {
    const sim = new LiveSim(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { attack } }), seed);
    const mine: SimEvent[] = [];
    while (!sim.finished && sim.tick < 100_000) {
      sim.step();
      mine.push(...sim.tickEvents);
    }
    es.push(...mine);
    matches.push({ seed, es: mine });
    if (enough(es)) break;
  }
  return { es, matches };
}

/** What the next event that settles a bomb is: won back, spilled, or caught (set-start with no other kick between). */
function bombEnds(es: readonly SimEvent[]): string[] {
  const out: string[] = [];
  let open = false;
  for (const e of es) {
    if (e.kind === 'kick') open = e.detail === 'bomb';
    else if (!open) continue;
    else if (e.kind === 'regather') (out.push(e.detail === 'contest' ? 'won-contest' : 'won'), (open = false));
    else if (e.kind === 'drop') (out.push(e.detail === 'knock-on' ? 'knock-on' : 'spilled'), (open = false));
    else if (e.kind === 'set-start') (out.push('caught'), (open = false));
    else if (e.kind === 'touch' || e.kind === 'dead-ball' || e.kind === 'on-full' || e.kind === 'try' || e.kind === 'kickoff') open = false;
  }
  return out;
}

describe('kick contests in the live sim (#99)', () => {
  // A handful of whole Kick-chase matches: bombs and grubbers aplenty. Few named seeds, not a scan (CI's 10-minute check).
  const { es, matches } = play([1, 2, 3, 4, 5, 6, 7, 8], (all) => {
    const ends = bombEnds(all);
    return ends.includes('won-contest') && ends.includes('spilled') && ends.includes('caught') && all.filter((e) => e.kind === 'loose-ball' && e.detail === 'in-goal').length >= 6 && all.filter((e) => e.kind === 'set-start' && e.detail === 'scramble').length >= 3;
  });

  it('a bomb can be won back in the air, spilled into a scramble, and caught', () => {
    const ends = bombEnds(es);
    expect(ends).toContain('won-contest');
    expect(ends).toContain('spilled');
    expect(ends).toContain('caught');
    // A spill that goes back is a scramble: LOOSE BALL! follows it before anyone has it.
    let sawScramble = false;
    for (let i = 0; i < es.length; i++) {
      if (es[i]!.kind !== 'drop' || es[i]!.detail === 'knock-on') continue;
      const next = es.slice(i + 1).find((e) => e.kind === 'loose-ball' || e.kind === 'set-start' || e.kind === 'regather' || e.kind === 'touch' || e.kind === 'dead-ball');
      if (next?.kind === 'loose-ball') sawScramble = true;
    }
    expect(sawScramble).toBe(true);
  });

  it('a grubber into the in-goal is a race: the attacker can score it and the defender can ground it', () => {
    /** After LOOSE BALL! in the in-goal: who got it (a regather is the attacker, a set-start the defender), then what came of it. */
    const races = (all: readonly SimEvent[]): { scored: number; grounded: number } => {
      let scored = 0;
      let grounded = 0;
      for (let i = 0; i < all.length; i++) {
        const e = all[i]!;
        if (e.kind !== 'loose-ball' || e.detail !== 'in-goal') continue;
        const rest = all.slice(i + 1);
        const won = rest.find((x) => x.kind === 'set-start' || x.kind === 'regather' || x.kind === 'dead-ball' || x.kind === 'kickoff');
        if (won?.detail !== 'scramble') continue;
        const after = rest.find((x) => x.kind === 'try' || x.kind === 'dead-ball' || x.kind === 'kickoff' || x.kind === 'kick');
        if (won.kind === 'regather' && won.side === e.side && after?.kind === 'try' && after.side === e.side) scored++;
        if (won.kind === 'set-start' && won.side !== e.side && after?.kind === 'dead-ball' && after.detail === '20m') grounded++;
      }
      return { scored, grounded };
    };
    let r = races(es);
    // Seeds 1–8 hold both; if a sim change moves them, look a little further than these.
    if (r.scored === 0 || r.grounded === 0) {
      const more = races(play([9, 10, 11, 12, 13, 14, 15, 16], () => false).es);
      r = { scored: r.scored + more.scored, grounded: r.grounded + more.grounded };
    }
    expect(r.scored).toBeGreaterThan(0);
    expect(r.grounded).toBeGreaterThan(0);
  }, 60_000);

  it('a scramble is said: LOOSE BALL! as it goes, the winner named on the ticker, the report counts it', () => {
    const loose = es.find((e) => e.kind === 'loose-ball')!;
    expect(popupFor(loose)).toMatchObject({ word: 'LOOSE BALL!', tone: 'neutral' });
    const won = es.find((e) => e.kind === 'set-start' && e.detail === 'scramble')!;
    expect(won.player).toBeTruthy();
    const c = new Commentator(1, { home: 'H', away: 'A' });
    const line = c.line(won, { home: 0, away: 0 });
    expect(LINES['set-start:scramble']!.map((t) => fillLine(t, { player: won.player!, team: 'H', other: 'A' })).concat(LINES['set-start:scramble']!.map((t) => fillLine(t, { player: won.player!, team: 'A', other: 'H' })))).toContain(line);
    expect(line).toContain(won.player!);
    // The report's row counts each side's, off the contract events.
    const snap: Snapshot = { tick: won.tick, players: [], ball: { x: 50, y: 34, lift: 0, holder: null }, label: '', events: [] };
    const match = matches.find((m) => m.es.includes(won))!;
    const events = match.es.map((e) => toMatchEvent(e, snap, { home: 'H', away: 'A' })).filter((e): e is NonNullable<typeof e> => e !== null);
    const result: MatchResult = { homeScore: 0, awayScore: 0, events, stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] }, weather: 'clear', momentumTimeline: [], injuries: [] };
    const row = buildMatchReport(result, { round: 1, homeId: 'H', awayId: 'A' }, { H: 'Home Side', A: 'Away Side' }, null).rows.find((r) => r.label === 'Scrambles won')!;
    const of = (side: 'home' | 'away'): number => match.es.filter((e) => (e.kind === 'set-start' || e.kind === 'regather') && e.detail === 'scramble' && e.side === side).length;
    expect(row).toEqual({ label: 'Scrambles won', home: String(of('home')), away: String(of('away')) });
    // A match with none has no row.
    const none = buildMatchReport({ ...result, events: events.filter((e) => e.detail !== 'scramble') }, { round: 1, homeId: 'H', awayId: 'A' }, { H: 'Home Side', A: 'Away Side' }, null);
    expect(none.rows.some((r) => r.label === 'Scrambles won')).toBe(false);
  });

  it('a bomb won in the air and a spill that goes forward have their own words', () => {
    expect(popupFor({ tick: 1, kind: 'regather', detail: 'contest', text: '', player: 'Ari Dunn', side: 'home', slot: 1 })).toMatchObject({ word: 'TAPS IT BACK!', big: true });
    expect(popupFor({ tick: 1, kind: 'drop', detail: 'knock-on', text: '', player: 'Ari Dunn', side: 'home', slot: 1 })).toMatchObject({ word: 'KNOCK-ON!', tone: 'bad' });
    expect(popupFor({ tick: 1, kind: 'drop', text: '', player: 'Ari Dunn', side: 'home', slot: 1 })).toMatchObject({ word: 'DROPPED!' });
  });

  it('is deterministic: the same seed plays the same match', () => {
    const again = play([matches[0]!.seed], () => true).es;
    expect(again.map((e) => `${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`)).toEqual(matches[0]!.es.map((e) => `${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`));
  });
});
