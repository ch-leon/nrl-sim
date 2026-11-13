// Held up over the line (#652 part 1, BAK-208 §8.1): a carrier in contact as he
// reaches the line, with two or three men on him or one and little drive left,
// can be held up. One roll, only then; off (heldUp.on 0) plays as before.
import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import { FIELD_LENGTH } from '../../../src/match/core/field';
import { LiveSim } from '../../../src/match/league/live';
import { HELD_UP, heldUpChance, heldUpContest, type HeldUpInputs } from '../../../src/match/league/wrestle';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { popupFor } from '../../../src/match/view/popups';
import { impactTier } from '../../../src/match/view/impact';
import { Commentator, LINES } from '../../../src/match/view/commentary';

const even: HeldUpInputs = { men: 2, hold: 1, carrierHold: 1, fightLeft: 0, speedDiff: 0, wreckingBall: 0, brickWall: 0 };

describe('held up: the odds', () => {
  it('is a contest only with two or three men on him, or one and little drive left', () => {
    expect(heldUpContest(2, 1)).toBe(true);
    expect(heldUpContest(3, 0.9)).toBe(true);
    expect(heldUpContest(1, HELD_UP.oneManFight)).toBe(true);
    expect(heldUpContest(1, HELD_UP.oneManFight + 0.01)).toBe(false);
    expect(heldUpContest(0, 0)).toBe(false);
    expect(heldUpChance({ ...even, men: 1, fightLeft: 0.9 })).toBe(0);
  });
  it('two average men on a carrier with no drive left: the base', () => {
    expect(heldUpChance(even)).toBeCloseTo(HELD_UP.base, 10);
  });
  it('more men, stronger men and fresher legs hold him up more; drive and momentum less', () => {
    const p = heldUpChance(even);
    expect(heldUpChance({ ...even, men: 3 })).toBeGreaterThan(p);
    expect(heldUpChance({ ...even, men: 1 })).toBeLessThan(p);
    expect(heldUpChance({ ...even, hold: 1.2 })).toBeGreaterThan(p);
    expect(heldUpChance({ ...even, carrierHold: 1.2 })).toBeLessThan(p);
    expect(heldUpChance({ ...even, fightLeft: 0.8 })).toBeLessThan(p);
    expect(heldUpChance({ ...even, speedDiff: 2 })).toBeLessThan(p);
    expect(heldUpChance({ ...even, speedDiff: -2 })).toBeGreaterThan(p);
    // Momentum is capped either way.
    expect(heldUpChance({ ...even, speedDiff: 50 })).toBeCloseTo(p - HELD_UP.momentumCap, 10);
  });
  it('a Wrecking Ball carrier is held up less, a Brick Wall among two or more more (not alone)', () => {
    const p = heldUpChance(even);
    expect(heldUpChance({ ...even, wreckingBall: 1.6 })).toBeCloseTo(p - HELD_UP.wreckingBall * 1.6, 10);
    expect(heldUpChance({ ...even, brickWall: 1 })).toBeCloseTo(p + HELD_UP.brickWall, 10);
    const alone = { ...even, men: 1, fightLeft: 0.2 };
    expect(heldUpChance({ ...alone, brickWall: 1 })).toBe(heldUpChance(alone));
  });
  it('stays between 0 and its cap', () => {
    expect(heldUpChance({ ...even, men: 3, hold: 3, brickWall: 2.2 })).toBe(HELD_UP.max);
    expect(heldUpChance({ ...even, fightLeft: 1, speedDiff: 9, carrierHold: 2, wreckingBall: 2.2 })).toBe(0);
  });
  it('its knobs are named for the harness', () => {
    const names = listKnobs().map((k) => k.path);
    for (const k of Object.keys(HELD_UP)) expect(names).toContain(`heldUp.${k}`);
  });
});

describe('held up: in the sim', () => {
  const home = labSheet(DEFAULT_HOME, 'gen');
  const away = labSheet(DEFAULT_AWAY, 'gen');
  /** A whole match: events, points and every roll drawn. */
  const play = (seed: number): { events: number; home: number; away: number; draws: number; heldUp: number } => {
    const sim = new LiveSim(home, away, seed);
    const rng = (sim as unknown as { rng: { next: () => number } }).rng;
    const next = rng.next.bind(rng);
    let draws = 0;
    rng.next = () => { draws++; return next(); };
    let events = 0;
    let heldUp = 0;
    while (!sim.finished) {
      sim.step();
      events += sim.tickEvents.length;
      heldUp += sim.tickEvents.filter((e) => e.kind === 'held-up').length;
    }
    return { events, home: sim.points.home, away: sim.points.away, draws, heldUp };
  };
  const withTuning = <T>(over: Record<string, number>, f: () => T): T => {
    const restore = applyTuning(over);
    try {
      return f();
    } finally {
      restore();
    }
  };

  it('off (heldUp.on 0) plays exactly as before it existed: same events, points and rolls (pinned from a65edf9)', () => {
    withTuning({ 'heldUp.on': 0 }, () => {
      expect(play(31)).toEqual({ events: 122, home: 0, away: 12, draws: 752, heldUp: 0 });
      expect(play(13)).toEqual({ events: 148, home: 19, away: 18, draws: 772, heldUp: 0 });
      // Its other knobs do nothing while it is off.
      withTuning({ 'heldUp.base': 1, 'heldUp.max': 1, 'heldUp.oneManFight': 1, 'heldUp.reachM': 9 }, () => {
        expect(play(13)).toEqual({ events: 148, home: 19, away: 18, draws: 772, heldUp: 0 });
      });
    });
  });

  it('on, the roll is drawn only when a carrier in contact reaches the line: a match with none plays as off', () => {
    // Most matches have no contest at the line and play exactly as off; one that has one draws
    // its roll there and goes another way (more draws or fewer, but a different match).
    let same = 0;
    let moved = 0;
    for (const seed of [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]) {
      const off = withTuning({ 'heldUp.on': 0 }, () => play(seed));
      const on = play(seed);
      if (on.draws === off.draws && on.events === off.events && on.home === off.home && on.away === off.away) same++;
      else moved++;
    }
    expect(same).toBeGreaterThan(moved);
    expect(moved).toBeGreaterThan(0);
  });

  it('held up: no try; a play-the-ball 10 m out with the tackle counted, a handover there on the last', () => {
    // Odds forced to certain so every contest at the line is held up.
    withTuning({ 'heldUp.base': 5, 'heldUp.max': 1, 'heldUp.oneManFight': 1 }, () => {
      let counted = 0;
      let handovers = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const sim = new LiveSim(home, away, seed);
        const s = sim as unknown as { tackles: number; attacking: 'home' | 'away'; phase: { kind: string; spot?: { x: number }; side?: string; how?: string } };
        while (!sim.finished) {
          const tackles = s.tackles;
          const side = s.attacking;
          sim.step();
          const e = sim.tickEvents.find((x) => x.kind === 'held-up');
          if (!e) continue;
          expect(sim.tickEvents.some((x) => x.kind === 'try')).toBe(false);
          // Named for the first man in the tackle, with every man in it on the event's contact.
          expect(e.side).not.toBe(side);
          expect(e.contact?.defenders.length).toBeGreaterThan(0);
          expect(e.contact?.carrier.side).toBe(side);
          if (s.phase.kind === 'half-time' || s.phase.kind === 'full-time' || sim.finished) continue; // held up on the siren: the ball is dead
          expect(s.phase.kind).toBe('set-piece');
          expect(s.phase.how).toBe('ptb');
          const line = s.phase.spot!.x > FIELD_LENGTH / 2 ? FIELD_LENGTH : 0;
          expect(Math.abs(s.phase.spot!.x - line)).toBeCloseTo(HELD_UP.restartM, 6);
          if (tackles + 1 >= SET_TACKLES) {
            expect(sim.tickEvents.some((x) => x.kind === 'handover')).toBe(true);
            expect(s.attacking).not.toBe(side);
            expect(s.tackles).toBe(0);
            handovers++;
          } else {
            expect(s.attacking).toBe(side);
            expect(s.tackles).toBe(tackles + 1);
            counted++;
          }
        }
      }
      expect(counted).toBeGreaterThan(0);
      expect(handovers + counted).toBeGreaterThan(3);
    });
  });
});

describe('held up: shown (presentation only reads the event)', () => {
  const e = { tick: 400, kind: 'held-up', text: 'Held up! A and B keep C off the ground', side: 'away' as const, slot: 7, player: 'Wade Fullbrook' };
  it('a HELD UP! pop-up over the first man, a big defensive moment at impact tier 2', () => {
    const p = popupFor(e)!;
    expect(p.word).toBe('HELD UP!');
    expect(p.sub).toBe('FULLBROOK');
    expect(p.tone).toBe('defence');
    expect(p.big).toBe(true);
    expect(impactTier(e, p)).toBe(2);
    // A Brick Wall that leaned it shows under the word.
    expect(popupFor({ ...e, trait: 'Brick Wall II' })!.trait).toBe('BRICK WALL II');
  });
  it('a commentary line of its own, naming the man, held on the strip', () => {
    const c = new Commentator(7, { home: 'Redcliffe Reapers', away: 'Woolloomooloo Wolves' });
    const said = c.said(e, { home: 6, away: 4 });
    const lines = LINES['held-up']!.map((l) => l.replace('{player}', 'Wade Fullbrook').replace('{team}', 'Wolves'));
    expect(lines).toContain(said[0]!.text);
    expect(said[0]!.important).toBe(true);
    expect(LINES['held-up']!.length).toBeGreaterThanOrEqual(3);
  });
});
