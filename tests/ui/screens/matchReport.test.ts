// tests/ui/screens/matchReport.test.ts — the match report at full time (N9.5):
// built from the MatchResult, it agrees with the score and the overlay's tallies.
import { describe, it, expect } from 'vitest';
import { runMatch } from '../../../src/match/league/match';
import { buildMatchReport, planChangeLines, shortName } from '../../../src/ui/screens/matchReport';
import { playerOfTheMatch } from '../../../src/systems/stats';
import { summaryLines } from '../../../src/match/view/commentary';
import type { MatchEvent, MatchResult, TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const sheet = (id: string, name: string): TeamSheet => ({
  clubId: id,
  name,
  attack: 60,
  defense: 60,
  kicking: 60,
  fitness: 60,
  colors: ['#111', '#eee'],
  roster: POSITIONS.map((position, i) => ({ name: `${name} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60 } })),
});
const names = { player: 'Live Test FC', 'rival-gulls': 'Gulls' };
const fixture = { round: 3, homeId: 'player', awayId: 'rival-gulls' };

describe('match report (N9.5)', () => {
  const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
  const r = buildMatchReport(result, fixture, names, playerOfTheMatch(result, fixture.homeId, fixture.awayId));

  it('the score, a try line for every try, and the goals as kicked', () => {
    expect(r.title).toBe('Round 3 · Full time');
    expect([r.home.score, r.away.score]).toEqual([result.homeScore, result.awayScore]);
    // A line per scorer, a minute per try.
    const marks = (s: typeof r.home) => s.tries.flatMap((t) => t.match(/\d+'( \(5\))?/g) ?? []);
    expect([marks(r.home).length, marks(r.away).length]).toEqual(result.stats.tries);
    const goals = (id: string) => result.events.filter((e) => e.teamId === id && (e.kind === 'conversion' || e.kind === 'penalty-goal'));
    expect(r.home.goals).toEqual({ made: goals('player').filter((e) => e.detail === 'good').length, taken: goals('player').length });
    // The points add up: tries (4 or 5), goals 2, field goals 1.
    const pts = (s: typeof r.home) => marks(s).reduce((a, t) => a + (t.endsWith('(5)') ? 5 : 4), 0) + 2 * s.goals.made + s.fieldGoals;
    expect(pts(r.home)).toBe(result.homeScore);
    expect(pts(r.away)).toBe(result.awayScore);
  });

  it('the numbers match the overlay’s tallies, side by side', () => {
    const row = (label: string) => r.rows.find((x) => x.label === label)!;
    expect(row('Possession')).toMatchObject({ home: `${result.stats.possession[0]}%`, away: `${result.stats.possession[1]}%` });
    expect(row('Tackles')).toMatchObject({ home: String(result.stats.tackles[0]), away: String(result.stats.tackles[1]) });
    expect(row('Errors')).toMatchObject({ home: String(result.stats.errors[0]), away: String(result.stats.errors[1]) });
    expect(Number(row('Line breaks').home) + Number(row('Line breaks').away)).toBe(result.events.filter((e) => e.kind === 'break').length);
  });

  it('names the Player of the Match with his club', () => {
    expect(r.potm?.who).toMatch(/\((Live Test FC|Gulls)\)$/);
  });

  it('carries the commentary’s summary (N15.2): the final whistle with the score, then the tries', () => {
    expect(r.summary).toEqual(summaryLines(result, { id: 'player', name: 'Live Test FC' }, { id: 'rival-gulls', name: 'Gulls' }));
    expect(r.summary.length).toBe(2);
    const [hi, lo] = [Math.max(result.homeScore, result.awayScore), Math.min(result.homeScore, result.awayScore)];
    expect(r.summary[0]).toContain(`${hi}–${lo}`);
  });

  it('says a final was won in golden point, or drawn and decided on seeding', () => {
    const ev = (kind: MatchEvent['kind'], detail?: string): MatchEvent => ({ t: 18, kind, teamId: 'player', ...(detail ? { detail } : {}) });
    const base: MatchResult = { ...result, homeScore: 12, awayScore: 12, events: [ev('full-time')] };
    expect(buildMatchReport(base, { ...fixture, round: 26 }, names, null).note).toBe('Drawn — Live Test FC through on seeding');
    expect(buildMatchReport(base, fixture, names, null).note).toBe('Drawn');
    const gp: MatchResult = { ...result, homeScore: 16, awayScore: 12, events: [ev('try'), ev('full-time', 'golden-point')] };
    expect(buildMatchReport(gp, { ...fixture, round: 27 }, names, null)).toMatchObject({ title: 'Grand Final · Full time', note: 'Won in golden point' });
  });

  it('lists the injured with their weeks, the calls that paid off, and short names over the numbers', () => {
    const hurt: MatchResult = { ...result, injuries: [{ teamId: 'rival-gulls', playerName: 'Gulls 7', weeks: 3 }, { teamId: 'player', playerName: 'Live Test FC 2', weeks: 1 }], calls: { made: [5, 0], paid: [2, 0] } };
    const rep = buildMatchReport(hurt, fixture, names, null);
    expect(rep.away.injuries).toEqual(['Gulls 7 (3 weeks)']);
    expect(rep.home.injuries).toEqual(['Live Test FC 2 (1 week)']);
    expect(rep.rows.find((x) => x.label === 'Calls paid off')).toMatchObject({ home: '2/5', away: '0/0' });
    expect(buildMatchReport(result, fixture, names, null).rows.some((x) => x.label === 'Calls paid off')).toBe(result.calls !== undefined);
    expect(shortName('Launceston Larrikins')).toBe('Larrikins');
    expect(rep.home.short).toBe('Live Test FC');
    const same = buildMatchReport(result, fixture, { player: 'Brisbane Larrikins', 'rival-gulls': 'Launceston Larrikins' }, null);
    expect([same.home.short, same.away.short]).toEqual(['Brisbane Larrikins', 'Launceston Larrikins']);
  });

  it('names a plan change with the short name (N14.1)', () => {
    expect(planChangeLines([
      { minute: 9, side: 'away', attack: 'expansive', defence: 'rush', at: 'half-time' },
      { minute: 14, side: 'home', attack: 'grind', defence: 'compressed', at: 'try' },
    ], { home: 'Larrikins', away: 'Gulls' })).toEqual([
      'Half-time: Gulls went Expansive · Rush.',
      'Minute 14: Larrikins went Grind · Compressed.',
    ]);
    const changed: MatchResult = {
      ...result,
      planChanges: [{ minute: 9, side: 'away', attack: 'expansive', defence: 'rush', at: 'half-time' }],
    };
    expect(buildMatchReport(changed, fixture, names, null).changes).toEqual(['Half-time: Gulls went Expansive · Rush.']);
    expect(buildMatchReport(result, fixture, names, null).changes).toEqual([]);
  });
});
