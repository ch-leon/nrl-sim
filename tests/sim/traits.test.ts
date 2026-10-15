// tests/sim/traits.test.ts — player traits affect matches (#43). Each trait is
// checked over a fixed seed range against an otherwise-identical control roster.
import { describe, it, expect } from 'vitest';
import { rollBigHitInjury, simulateMatch, teamSheetFromSquad } from '../../src/sim/engine';
import type { MatchResult, RosterEntry, TeamSheet } from '../../src/sim/events';
import type { Player, Position, Trait } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';

const POSITIONS: Position[] = [
  'fullback', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row', 'lock',
];

function roster(prefix: string, traits: Record<string, Trait[]> = {}): RosterEntry[] {
  return POSITIONS.map((position, i) => {
    const name = `${prefix}${i}`;
    const t = traits[name];
    return {
      name,
      position,
      stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 },
      id: `id-${name}`,
      injuryRisk: 40,
      ...(t ? { traits: t } : {}),
    };
  });
}

function sheet(clubId: string, r: RosterEntry[]): TeamSheet {
  return {
    clubId, name: clubId, attack: 60, defense: 60, kicking: 60, fitness: 60,
    colors: ['#000000', '#ffffff'], roster: r,
  };
}

const SEEDS = 800;
const SEED_BASE = 9000;
// Injuries are rare per match, so the end-to-end injury check needs a bigger sample.
const INJURY_SEEDS = 3000;

function runSeeds(home: TeamSheet, away: TeamSheet): MatchResult[] {
  const out: MatchResult[] = [];
  for (let s = 0; s < SEEDS; s++) {
    out.push(simulateMatch(home, away, { seed: SEED_BASE + s, weather: 'clear' }));
  }
  return out;
}

const AWAY = sheet('A', roster('B'));
const count = (rs: MatchResult[], f: (e: MatchResult['events'][number]) => boolean): number =>
  rs.reduce((n, r) => n + r.events.filter(f).length, 0);

describe('traits — finisher', () => {
  const winger = 'H1';
  const withT = runSeeds(sheet('H', roster('H', { [winger]: ['finisher'] })), AWAY);
  const control = runSeeds(sheet('H', roster('H')), AWAY);
  const share = (rs: MatchResult[]): number => {
    const mine = count(rs, (e) => e.kind === 'try' && e.teamId === 'H' && e.player === winger);
    const all = count(rs, (e) => e.kind === 'try' && e.teamId === 'H');
    return mine / all;
  };

  it('scores a noticeably larger share of his side\'s tries', () => {
    expect(share(withT)).toBeGreaterThan(share(control) * 1.15);
  });
  it('team strength still dominates: team try count barely moves', () => {
    const tries = (rs: MatchResult[]): number => count(rs, (e) => e.kind === 'try' && e.teamId === 'H');
    expect(Math.abs(tries(withT) / tries(control) - 1)).toBeLessThan(0.1);
  });
});

describe('traits — hardMan', () => {
  const prop = 'A6'; // defending side in these runs is the away team
  const withT = runSeeds(sheet('H', roster('H')), sheet('A', roster('A', { [prop]: ['hardMan'] })));
  const control = runSeeds(sheet('H', roster('H')), sheet('A', roster('A')));
  const hits = (rs: MatchResult[], who?: string): number =>
    count(rs, (e) => e.kind === 'big-hit' && e.teamId === 'A' && (who === undefined || e.player === who));

  it('makes noticeably more big hits', () => {
    expect(hits(withT, prop)).toBeGreaterThan(hits(control, prop) * 1.2);
  });
  it('team big-hit volume only rises slightly', () => {
    expect(hits(withT) / hits(control)).toBeLessThan(1.15);
  });
});

describe('traits — playmaker', () => {
  const halfback = 'H4';
  const withT = runSeeds(sheet('H', roster('H', { [halfback]: ['playmaker'] })), AWAY);
  const control = runSeeds(sheet('H', roster('H')), AWAY);
  const kicks = (rs: MatchResult[]) => rs.flatMap((r) => r.events).filter((e) => e.kind === 'kick' && e.teamId === 'H');
  const goalKicks = (rs: MatchResult[]) =>
    rs.flatMap((r) => r.events).filter((e) => (e.kind === 'conversion' || e.kind === 'penalty-goal') && e.teamId === 'H');
  const rate = (xs: { detail?: string }[], pred: (d: string | undefined) => boolean): number =>
    xs.filter((e) => pred(e.detail)).length / xs.length;

  it('changes which kicks are chosen (more grubbers / 40-20s, fewer find-touch)', () => {
    const creative = (d?: string): boolean => d === 'grubber' || d === '40-20';
    expect(rate(kicks(withT), creative)).toBeGreaterThan(rate(kicks(control), creative) + 0.02);
    const safe = (d?: string): boolean => d === 'find-touch';
    expect(rate(kicks(withT), safe)).toBeLessThan(rate(kicks(control), safe) - 0.01);
  });
  it('slightly improves goal-kick completion', () => {
    const good = (d?: string): boolean => d === 'good';
    expect(rate(goalKicks(withT), good)).toBeGreaterThan(rate(goalKicks(control), good) + 0.01);
  });
});

describe('traits — injuryProne', () => {
  const entry = (traits?: Trait[]): RosterEntry[] => [
    { name: 'X', position: 'prop', injuryRisk: 40, id: 'x', ...(traits ? { traits } : {}) },
  ];
  const rate = (r: RosterEntry[], injuryRate: number): number => {
    const rng = makeRng(31337);
    let n = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) if (rollBigHitInjury(r, 'X', 'T', rng, injuryRate)) n++;
    return n / N;
  };

  it('raises the injury chance per big hit', () => {
    expect(rate(entry(['injuryProne']), 1)).toBeGreaterThan(rate(entry(), 1) * 1.25);
  });
  it('stacks with the difficulty injuryRate rather than replacing it', () => {
    const prone = entry(['injuryProne']);
    expect(rate(prone, 2)).toBeGreaterThan(rate(prone, 1) * 1.7);
    expect(rate(prone, 2)).toBeGreaterThan(rate(entry(), 2) * 1.25);
  });
  it('shows up in full matches: the prone carrier is hurt more often', () => {
    const name = 'H2';
    const injured = (traits?: Trait[]): number => {
      const home = sheet('H', roster('H', traits ? { [name]: traits } : {}));
      let n = 0;
      for (let s = 0; s < INJURY_SEEDS; s++) {
        const r = simulateMatch(home, AWAY, { seed: SEED_BASE + s, weather: 'clear' });
        n += r.injuries.filter((i) => i.playerName === name).length;
      }
      return n;
    };
    expect(injured(['injuryProne'])).toBeGreaterThan(injured() * 1.1);
  });
});

describe('traits — plumbing and determinism', () => {
  it('teamSheetFromSquad carries traits onto roster entries', () => {
    const mk = (i: number, traits: Trait[]): Player => ({
      id: `p${i}`, name: `P${i}`, age: 25, position: POSITIONS[i % 9]!,
      stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 },
      morale: 60, injuryRisk: 20, injuredWeeks: 0, traits, wage: 1000, contractWeeks: 10,
    });
    const squad = [mk(0, ['finisher', 'hardMan']), mk(1, [])];
    const s = teamSheetFromSquad(squad, 'P', 'P', ['#000', '#fff']);
    expect(s.roster!.find((r) => r.name === 'P0')!.traits).toEqual(['finisher', 'hardMan']);
    expect(s.roster!.find((r) => r.name === 'P1')!.traits).toBeUndefined();
  });

  it('same seed + same traited input → identical match', () => {
    const traits = { H1: ['finisher'], H2: ['injuryProne'], H4: ['playmaker'], H6: ['hardMan'] } as Record<string, Trait[]>;
    const h = sheet('H', roster('H', traits));
    const a = simulateMatch(h, AWAY, { seed: 123, weather: 'clear' });
    const b = simulateMatch(h, AWAY, { seed: 123, weather: 'clear' });
    expect(a).toEqual(b);
  });

  it('untraited rosters are unaffected (no stray draws)', () => {
    const a = simulateMatch(sheet('H', roster('H')), AWAY, { seed: 5, weather: 'clear' });
    const b = simulateMatch(sheet('H', roster('H', {})), AWAY, { seed: 5, weather: 'clear' });
    expect(a).toEqual(b);
  });
});
