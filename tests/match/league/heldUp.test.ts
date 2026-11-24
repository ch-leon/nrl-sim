// Held up over the line (#652 part 1, BAK-208 §8.1): a carrier in contact as he
// reaches the line can be held up by any defender on him (a lone tackler only with
// little drive left under the first rule, heldUp.oneManFight 0.35). One roll, only then; off (heldUp.on 0) plays as before.
import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import { TICK_S } from '../../../src/match/core/engine';
import { FIELD_LENGTH, MID_Y } from '../../../src/match/core/field';
import { LiveSim } from '../../../src/match/league/live';
import { HELD_UP, heldUpChance, heldUpContest, type HeldUpInputs } from '../../../src/match/league/wrestle';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { popupFor } from '../../../src/match/view/popups';
import { impactTier } from '../../../src/match/view/impact';
import { Commentator, LINES } from '../../../src/match/view/commentary';

const even: HeldUpInputs = { men: 2, hold: 1, carrierHold: 1, fightLeft: 0, speedDiff: 0, wreckingBall: 0, brickWall: 0 };

describe('held up: the odds', () => {
  it('any defender on him is a contest at the default; a lone one at full pace has small odds', () => {
    expect(HELD_UP.oneManFight).toBe(1);
    expect(heldUpContest(2, 1)).toBe(true);
    expect(heldUpContest(3, 0.9)).toBe(true);
    expect(heldUpContest(1, 1)).toBe(true);
    expect(heldUpContest(0, 0)).toBe(false);
    const lone = heldUpChance({ ...even, men: 1, fightLeft: 0.9 });
    expect(lone).toBeGreaterThan(0);
    expect(lone).toBeLessThan(heldUpChance({ ...even, fightLeft: 0.9 }));
  });
  it('the first rule by override: a lone tackler only with little drive left', () => {
    const restore = applyTuning({ 'heldUp.oneManFight': 0.35, 'heldUp.base': 0.6 });
    try {
      expect(heldUpContest(1, 0.35)).toBe(true);
      expect(heldUpContest(1, 0.36)).toBe(false);
      expect(heldUpContest(2, 1)).toBe(true);
      expect(heldUpChance({ ...even, men: 1, fightLeft: 0.9 })).toBe(0);
    } finally {
      restore();
    }
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
    // Half his drive left, so neither side of it meets the cap.
    const mid = { ...even, fightLeft: 0.5 };
    const p = heldUpChance(mid);
    expect(heldUpChance({ ...mid, wreckingBall: 1.6 })).toBeCloseTo(p - HELD_UP.wreckingBall * 1.6, 10);
    expect(heldUpChance({ ...mid, brickWall: 1 })).toBeCloseTo(p + HELD_UP.brickWall, 10);
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

  it('off (heldUp.on 0) plays exactly as before it existed: same events, points and rolls (pinned from main at 5b7d08c3)', () => {
    // Re-pinned against main at 5b7d08c3 (the last-tackle call, #650, on), which this branch carries; before #650 the
    // pins were a65edf9's, and with the last-tackle call off too the match is still a65edf9's (below).
    // Early DH commitment (#672), attacking structures (#649), the centre shoulder
    // read, later kicking mechanics, kick returns, quick taps and goal-line stands are off for the historical fingerprints.
    const historical = { 'heldUp.on': 0, 'live.dhDecisionLeadTicks': 0, 'shapes.on': 0, 'live.centreShoulderTicks': 0, 'longKick.on': 0, 'wingBomb.on': 0, 'secondKicker.on': 0, 'kickReturn.on': 0, 'quickTap.on': 0, 'goalLineStand.on': 0 };
    withTuning(historical, () => {
      expect(play(31)).toEqual({ events: 122, home: 4, away: 10, draws: 813, heldUp: 0 });
      expect(play(13)).toEqual({ events: 147, home: 10, away: 10, draws: 725, heldUp: 0 });
      // Its other knobs do nothing while it is off.
      withTuning({ 'heldUp.base': 1, 'heldUp.max': 1, 'heldUp.oneManFight': 1, 'heldUp.reachM': 9 }, () => {
        expect(play(13)).toEqual({ events: 147, home: 10, away: 10, draws: 725, heldUp: 0 });
      });
    });
    withTuning({ ...historical, 'lastTackle.on': 0 }, () => {
      expect(play(31)).toEqual({ events: 122, home: 0, away: 12, draws: 752, heldUp: 0 });
      expect(play(13)).toEqual({ events: 148, home: 19, away: 18, draws: 772, heldUp: 0 });
    });
  });

  it('draws once only when the line crossing meets the active contact rule', () => {
    class LineCarry extends LiveSim {
      draws = 0;

      constructor(men: number, pace: number) {
        super(home, away, 20);
        this.tick = 100;
        this.attacking = 'home';
        this.dir = this.dirOf('home');
        this.phase = { kind: 'play' };
        for (const p of this.players) p.body.pos = { x: FIELD_LENGTH / 2, y: MID_Y };
        const carrier = this.at('home', 0);
        const speed = pace * carrier.body.maxSpeed;
        const line = this.dir > 0 ? FIELD_LENGTH : 0;
        // The previous movement tick crossed the line, with the chasers still alongside him.
        carrier.body.pos = { x: line + this.dir * speed * TICK_S / 2, y: MID_Y };
        carrier.body.vel = { x: this.dir * speed, y: 0 };
        for (let i = 0; i < men; i++) {
          this.at('away', i).body.pos = { x: carrier.body.pos.x, y: MID_Y + (i === 0 ? 1 : -1) };
        }
        this.ball = { kind: 'held', by: this.indexOf(carrier) };
        this.rng.next = () => { this.draws++; return 0.99; }; // Let the try through if there is a contest.
      }
    }

    const draws = (men: number, pace = 0.75) => {
      const sim = new LineCarry(men, pace);
      sim.step();
      expect(sim.tickEvents).toContainEqual(expect.objectContaining({ kind: 'try', side: 'home' }));
      return sim.draws;
    };
    expect(draws(0)).toBe(0);
    expect(draws(1)).toBe(1);
    withTuning({ 'heldUp.oneManFight': 0.35, 'heldUp.base': 0.6 }, () => {
      expect(draws(1)).toBe(0);
      expect(draws(1, 0.2)).toBe(1);
      expect(draws(2)).toBe(1);
    });
    withTuning({ 'heldUp.on': 0 }, () => expect(draws(2)).toBe(0));
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
