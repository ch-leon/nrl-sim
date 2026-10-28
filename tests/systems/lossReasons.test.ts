import { describe, it, expect, beforeEach } from 'vitest';
import {
  lossReasons, trainingLevels, MAX_REASONS, MIN_REASONS, OUTGUNNED_GAP, ERROR_GAP, POSSESSION_FLOOR, FITNESS_GAP, TRAINING_LEVELS_PAR,
} from '../../src/systems/lossReasons';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { createNewGame, getState, type GameState, type PlacedFacility } from '../../src/core/state';
import { bus } from '../../src/core/events';
import type { MatchEvent, MatchResult, RosterEntry, TeamSheet } from '../../src/sim/events';

beforeEach(() => bus.clear());

/** A club with a strong training base (so "behind the league" stays quiet) and its picked nine. */
const club = (): GameState => {
  createNewGame('Test FC', 11);
  initLeague(getState());
  const s = getState();
  const paddock = (i: number): PlacedFacility => ({ id: `p${i}`, defId: 'trainingPaddock', level: 3, x: i * 2, y: 0 });
  return { ...s, facilities: [paddock(0), paddock(1)] };
};

/** Our sheet: the picked nine, each man at his own position, a full bench, rotation Standard. */
const ours = (s: GameState, over: Partial<TeamSheet> = {}): TeamSheet => {
  const byId = new Map(s.squad.map((p) => [p.id, p] as const));
  const nine = s.lineup.starters.flatMap((id) => (id && byId.get(id) ? [byId.get(id)!] : []));
  const bench = s.squad.filter((p) => !nine.includes(p)).slice(0, 4);
  const entry = (p: GameState['squad'][number]): RosterEntry => ({ id: p.id, name: p.name, position: p.position });
  return {
    clubId: PLAYER_ID, name: s.clubName, attack: 60, defense: 60, kicking: 60, fitness: 60, colors: ['#000', '#fff'],
    roster: nine.map(entry), bench: bench.map(entry), rotation: 'standard', ...over,
  };
};
const theirs = (s: GameState, over: Partial<TeamSheet> = {}): TeamSheet => ({
  clubId: rivalId(s), name: 'Rival', attack: 60, defense: 60, kicking: 60, fitness: 60, colors: ['#fff', '#000'], ...over,
});
const rivalId = (s: GameState): string => s.league.clubs.find((c) => c.id !== PLAYER_ID)!.id;

const result = (over: Partial<MatchResult> = {}, stats: Partial<MatchResult['stats']> = {}): MatchResult => ({
  homeScore: 10, awayScore: 20, events: [], weather: 'clear', momentumTimeline: [], injuries: [],
  stats: { possession: [50, 50], tackles: [30, 30], errors: [5, 5], tries: [2, 4], ...stats },
  ...over,
});
const fixtureFor = (s: GameState) => ({ round: 3, homeId: PLAYER_ID, awayId: rivalId(s) });

const why = (s: GameState, r: MatchResult, us: TeamSheet = ours(s), them: TeamSheet = theirs(s)) =>
  lossReasons(r, fixtureFor(s), { home: us, away: them }, s);

describe('lossReasons: when (#368)', () => {
  it('none for a win or a draw', () => {
    const s = club();
    expect(why(s, result({ homeScore: 20, awayScore: 10 }))).toEqual([]);
    expect(why(s, result({ homeScore: 14, awayScore: 14 }))).toEqual([]);
  });

  it('none for a match the club was not in', () => {
    const s = club();
    expect(lossReasons(result(), { homeId: 'a', awayId: 'b' }, { home: ours(s), away: theirs(s) }, s)).toEqual([]);
  });

  it('works from either end: the club away', () => {
    const s = club();
    const r = lossReasons(result({ homeScore: 30, awayScore: 10 }, { errors: [4, 12] }), { homeId: rivalId(s), awayId: PLAYER_ID },
      { home: theirs(s), away: ours(s) }, s);
    expect(r[0]!.text).toBe('You made 12 errors to their 4');
  });

  it('an even loss still gets two plain reasons', () => {
    const r = why(club(), result());
    expect(r).toHaveLength(MIN_REASONS);
    expect(r.map((x) => x.screen)).toEqual(['lineup', 'recruit']);
  });
});

describe('lossReasons: each rule (#368)', () => {
  it('out-gunned on attack or defence → Recruit', () => {
    const s = club();
    const attack = why(s, result(), ours(s), theirs(s, { attack: 60 + OUTGUNNED_GAP + 7 }))[0]!;
    expect(attack).toEqual({ text: 'Their attack rated 73 to your 60', screen: 'recruit', cta: 'Find a strike player' });
    const defence = why(s, result(), ours(s, { defense: 50 }), theirs(s))[0]!;
    expect(defence).toEqual({ text: 'Their defence rated 60 to your 50', screen: 'recruit', cta: 'Find a hard defender' });
  });

  it('errors well above theirs, or under 45% of the ball → Lineup', () => {
    const s = club();
    // Exactly 45% is not under it: with two clear reasons it stays off the list; 44% joins them.
    const two = (ball: number) => why(s, result({}, { possession: [ball, 100 - ball] }), ours(s, { rotation: 'off' }), theirs(s, { attack: 80 })).map((r) => r.cta);
    expect(two(POSSESSION_FLOOR)).toEqual(['Find a strike player', 'Turn the rotation on']);
    expect(two(POSSESSION_FLOOR - 1)).toHaveLength(3);
    expect(two(POSSESSION_FLOOR - 1)).toContain('Change the plan');
    expect(why(s, result({}, { errors: [5 + ERROR_GAP + 1, 5] }))[0]).toEqual({ text: 'You made 9 errors to their 5', screen: 'lineup', cta: 'Pick surer hands' });
    expect(why(s, result({}, { possession: [POSSESSION_FLOOR - 4, 59] }))[0]).toEqual({ text: 'You had 41% of the ball', screen: 'lineup', cta: 'Change the plan' });
  });

  it('out of legs: rotation Off, a short bench, or their fitness → Lineup', () => {
    const s = club();
    expect(why(s, result(), ours(s, { rotation: 'off' }))[0]).toMatchObject({ screen: 'lineup', cta: 'Turn the rotation on' });
    expect(why(s, result(), ours(s, { bench: ours(s).bench!.slice(0, 2) }))[0]).toMatchObject({ text: 'Only 2 on the bench to rotate', screen: 'lineup' });
    expect(why(s, result(), ours(s), theirs(s, { fitness: 60 + FITNESS_GAP }))[0]).toEqual({ text: 'Their fitness rated 68 to your 60', screen: 'lineup', cta: 'Rotate harder' });
  });

  it('a picked starter who missed it, or a man out of position in the nine → Lineup', () => {
    const s0 = club();
    const outId = s0.lineup.starters[6]!; // the hooker
    const s = { ...s0, squad: s0.squad.map((p) => (p.id === outId ? { ...p, injuredWeeks: 2 } : p)) };
    const out = s.squad.find((p) => p.id === outId)!;
    const cover = s.squad.find((p) => !s.lineup.starters.includes(p.id))!;
    const sheet = ours(s);
    const covered = { ...sheet, roster: sheet.roster!.map((r) => (r.id === outId ? { id: cover.id, name: cover.name, position: 'hooker' as const } : r)) };
    const missed = why(s, result(), covered)[0]!;
    expect(missed).toEqual({ text: `Your hooker ${out.name} missed it injured`, screen: 'lineup', cta: 'Rework the nine' });

    const s1 = club();
    const sheet1 = ours(s1);
    const wing = sheet1.roster!.find((r) => s1.squad.find((p) => p.id === r.id)!.position === 'winger')!;
    const odd = { ...sheet1, roster: sheet1.roster!.map((r) => (r === wing ? { ...r, position: 'prop' as const } : r)) };
    expect(why(s1, result(), odd)[0]).toEqual({ text: `${wing.name} played prop out of position`, screen: 'lineup', cta: 'Fix the nine' });
  });

  it('training behind the league → Build', () => {
    const s0 = club();
    const s = { ...s0, facilities: [], league: { ...s0.league, clubs: s0.league.clubs.map((c) => (c.id === PLAYER_ID ? c : { ...c, strength: 95 })) } };
    expect(trainingLevels(s)).toBe(0);
    expect(trainingLevels(club())).toBeGreaterThanOrEqual(TRAINING_LEVELS_PAR + 1);
    const r = why(s, result())[0]!;
    expect(r.screen).toBe('build');
    expect(r.cta).toBe('Build training');
    expect(r.text).toMatch(/^Your squad rates \d+ to the league's 95, on 0 training levels$/);
  });

  it('goal-kicking well under theirs → Lineup (kicker)', () => {
    const s = club();
    const kick = (teamId: string, good: boolean, t: number): MatchEvent => ({ t, kind: 'conversion', teamId, detail: good ? 'good' : 'miss' });
    const events = [kick(PLAYER_ID, false, 5), kick(PLAYER_ID, false, 12), kick(PLAYER_ID, true, 30), ...[3, 9, 20].map((t) => kick(rivalId(s), true, t))];
    expect(why(s, result({ events }))[0]).toEqual({ text: 'You kicked 1 from 3 at goal, they kicked 3 from 3', screen: 'lineup', cta: 'Pick a new kicker' });
  });
});

describe('lossReasons: ranking (#368)', () => {
  it('worst first, capped at three', () => {
    const s = club();
    const r = why(s, result({}, { errors: [5 + ERROR_GAP * 2, 5] }), ours(s, { rotation: 'off' }), theirs(s, { attack: 60 + OUTGUNNED_GAP * 4, fitness: 90 }));
    expect(r).toHaveLength(MAX_REASONS);
    // Out-gunned by 24 (×4), their fitness by 30 is masked by rotation Off (×1), errors by 6 (×2).
    expect(r.map((x) => x.cta)).toEqual(['Find a strike player', 'Pick surer hands', 'Turn the rotation on']);
  });

  it('one clear reason is topped up with the nearest miss', () => {
    const s = club();
    const r = why(s, result({}, { errors: [6, 5] }), ours(s), theirs(s, { attack: 80 }));
    expect(r.map((x) => x.cta)).toEqual(['Find a strike player', 'Pick surer hands']);
  });
});
