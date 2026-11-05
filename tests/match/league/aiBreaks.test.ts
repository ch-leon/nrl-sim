import { describe, expect, it } from 'vitest';
import { defaultBreakRule, type BreakFacts } from '../../../src/match/league/breaks';
import { DEFAULT_TACTICS, type TeamTactics } from '../../../src/match/league/presets';
import { styleFit } from '../../../src/match/league/fit';
import { applyTuning } from '../../../src/match/league/tuning';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';

const fit = styleFit([]);
const observed: TeamTactics[] = [{ attack: 'expansive', defence: 'compressed' }];
const facts: BreakFacts = { score: { home: 0, away: 8 }, minute: 5, plan: DEFAULT_TACTICS, side: 'home', at: 'try', concededInARow: 0 };
const reaction = { difficulty: 'normal' as const, observed, ownFit: fit, playerFit: fit, keyDown: true };

describe('difficulty break reactions', () => {
  it('Easy retains the score rule, including when observed counter numbers are down', () => {
    expect(defaultBreakRule({ ...facts, reaction: { ...reaction, difficulty: 'easy' } })).toBeNull();
    expect(defaultBreakRule({ ...facts, at: 'half-time', reaction: { ...reaction, difficulty: 'easy' } })).toEqual({ attack: 'expansive', defence: 'rush' });
  });
  it('Normal switches a failing counter only with the existing score margin and its key number down', () => {
    expect(defaultBreakRule({ ...facts, reaction })).toEqual({ attack: 'expansive', defence: 'slide' });
    expect(defaultBreakRule({ ...facts, reaction: { ...reaction, keyDown: false } })).toBeNull();
    expect(defaultBreakRule({ ...facts, score: { home: 0, away: 6 }, reaction })).toBeNull();
  });
  it('Hard can counter the first-half observed plan even at level scores, only at half-time', () => {
    const level = { ...facts, score: { home: 0, away: 0 }, reaction: { ...reaction, difficulty: 'hard' as const, keyDown: false } };
    expect(defaultBreakRule({ ...level, at: 'half-time' })).toEqual({ attack: 'expansive', defence: 'slide' });
    expect(defaultBreakRule(level)).toBeNull();
    expect(defaultBreakRule({ ...level, at: 'half-time', reaction: { ...level.reaction, observed: [] } })).toBeNull();
  });
  it('break knobs disable the new reactions', () => {
    const restore = applyTuning({ 'counters.ai.normalBreak': 0, 'counters.ai.hardHalfTime': 0 });
    try {
      expect(defaultBreakRule({ ...facts, reaction })).toBeNull();
      expect(defaultBreakRule({ ...facts, score: { home: 0, away: 0 }, at: 'half-time', reaction: { ...reaction, difficulty: 'hard' } })).toBeNull();
    } finally { restore(); }
  });
});

class ObservedSim extends LiveSim {
  sample(plan: TeamTactics, secondHalf = false): void {
    this.half = secondHalf ? 2 : 1;
    this.tactics.away = { ...plan };
    this.phase = { kind: 'play' };
    this.observeRivalPlay();
  }
  halfTimePick(pending: TeamTactics): TeamTactics {
    this.half = 1;
    this.phase = { kind: 'half-time', t0: this.tick };
    this.setTactics('away', pending);
    this.considerBreak('half-time');
    return this.planFor('home');
  }
}

it('Hard reads the plan played in first-half open play, never a pending half-time pick', () => {
  const make = () => new ObservedSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 17,
    { breakRuleSides: ['home'], aiRival: { side: 'home', difficulty: 'hard' } });
  const a = make(), b = make();
  a.sample(observed[0]!); b.sample(observed[0]!);
  expect(a.halfTimePick({ attack: 'grind', defence: 'rush' })).toEqual(b.halfTimePick(DEFAULT_TACTICS));
  expect(a.planFor('home')).toEqual({ attack: 'expansive', defence: 'slide' });
  const empty = make();
  expect(empty.halfTimePick(observed[0]!)).toEqual(DEFAULT_TACTICS);
});
