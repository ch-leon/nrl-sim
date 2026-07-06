// tests/sim/commentary.test.ts — variant count, interpolation, determinism (BAK-196).
import { describe, it, expect } from 'vitest';
import { commentaryFor, variantCount } from '../../src/sim/commentary';
import { makeRng } from '../../src/utils/rng';
import type { MatchEvent, MatchEventKind } from '../../src/sim/events';

const SCORING_IMPACT: MatchEventKind[] = [
  'try', 'conversion', 'penalty-goal', 'field-goal', 'big-hit', 'break', 'error',
];

const HOME = 'Reapers';
const AWAY = 'Wolves';

describe('commentaryFor — variant coverage', () => {
  it('has ≥4 non-empty variants per scoring/impact kind', () => {
    for (const kind of SCORING_IMPACT) {
      expect(variantCount(kind)).toBeGreaterThanOrEqual(4);
    }
  });

  it('returns empty string for low-signal kinds (no feed spam)', () => {
    const ev: MatchEvent = { t: 5, kind: 'set-start', teamId: 'H' };
    expect(commentaryFor(ev, HOME, AWAY, makeRng(1).next, 'H')).toBe('');
  });
});

describe('commentaryFor — interpolation', () => {
  it('substitutes {player} and {team}', () => {
    // Try templates all include {player} and most include {team}. Sample a variant
    // that has both by scanning until one appears.
    let line = '';
    for (let seed = 0; seed < 20; seed++) {
      const ev: MatchEvent = { t: 60, kind: 'try', teamId: 'H', player: 'Jonno Blue' };
      const candidate = commentaryFor(ev, HOME, AWAY, makeRng(seed).next, 'H');
      if (candidate.includes(HOME)) { line = candidate; break; }
    }
    expect(line).toContain('Jonno Blue');
    expect(line).toContain(HOME);
    expect(line).not.toContain('{player}');
    expect(line).not.toContain('{team}');
  });

  it('resolves {team} to away name for away events', () => {
    let line = '';
    for (let seed = 0; seed < 20; seed++) {
      const ev: MatchEvent = { t: 60, kind: 'penalty-goal', teamId: 'A' };
      const candidate = commentaryFor(ev, HOME, AWAY, makeRng(seed).next, 'H');
      if (candidate.includes(AWAY)) { line = candidate; break; }
    }
    expect(line).toContain(AWAY);
    expect(line).not.toContain(HOME);
  });

  it('falls back to a generic player when ev.player is absent', () => {
    const ev: MatchEvent = { t: 12, kind: 'run', teamId: 'H' };
    const line = commentaryFor(ev, HOME, AWAY, makeRng(3).next, 'H');
    expect(line).not.toContain('{player}');
    expect(line.length).toBeGreaterThan(0);
  });
});

describe('commentaryFor — determinism', () => {
  it('same seed → identical line', () => {
    const ev: MatchEvent = { t: 60, kind: 'try', teamId: 'H', player: 'Sam' };
    const a = commentaryFor(ev, HOME, AWAY, makeRng(99).next, 'H');
    const b = commentaryFor(ev, HOME, AWAY, makeRng(99).next, 'H');
    expect(a).toBe(b);
  });

  it('advancing one rng across a stream is reproducible', () => {
    const stream: MatchEvent[] = [
      { t: 5, kind: 'run', teamId: 'H', player: 'A' },
      { t: 60, kind: 'try', teamId: 'H', player: 'B' },
      { t: 61, kind: 'big-hit', teamId: 'A', player: 'C' },
    ];
    const collect = (): string[] => {
      const rng = makeRng(7);
      return stream.map((e) => commentaryFor(e, HOME, AWAY, rng.next, 'H'));
    };
    expect(collect()).toEqual(collect());
  });

  it('produces variety across different seeds for a busy kind', () => {
    const ev: MatchEvent = { t: 60, kind: 'try', teamId: 'H', player: 'X' };
    const lines = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      lines.add(commentaryFor(ev, HOME, AWAY, makeRng(seed).next, 'H'));
    }
    expect(lines.size).toBeGreaterThan(1);
  });
});
