// tests/systems/fixtures.test.ts — fixture completeness/no-dupes/no self-play,
// ladder math + tie-breaks, cheap-sim determinism, finals bracket. See BAK-184.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateFixtures,
  applyResult,
  getCurrentFixture,
  simulateRivalRound,
  runFinals,
  ensureFinalsRound,
  cheapSimScore,
  sortLadder,
  emptyLadder,
  ladderPosition,
  initLeague,
  registerFixturesSystem,
  PLAYER_ID,
  FIXTURES_PER_ROUND,
  LEAGUE_SIZE,
  PREMIERSHIP_REP_BONUS,
} from '../../src/systems/fixtures';
import { RIVAL_CLUBS } from '../../src/data/league';
import { createNewGame, getState, setState, type Fixture, type LadderRow, type RivalClub, type GameState } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';
import { bus } from '../../src/core/events';
import { SEASON_ROUNDS } from '../../src/config';
import { advanceWeek, clearTickHooks, clearSeasonHooks } from '../../src/core/time';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

const ids16 = (): string[] => [PLAYER_ID, ...RIVAL_CLUBS.map((c) => c.id)];

// ── RIVAL_CLUBS data ──────────────────────────────────────────────────────────

describe('RIVAL_CLUBS data', () => {
  it('has 15 entries with strength in 35..85 and two hex colours', () => {
    expect(RIVAL_CLUBS).toHaveLength(15);
    for (const c of RIVAL_CLUBS) {
      expect(c.strength).toBeGreaterThanOrEqual(35);
      expect(c.strength).toBeLessThanOrEqual(85);
      expect(c.colors).toHaveLength(2);
      for (const hex of c.colors) expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.id.startsWith('rival-')).toBe(true);
    }
  });

  it('has unique ids and names, none matching the player id', () => {
    const idSet = new Set(RIVAL_CLUBS.map((c) => c.id));
    const nameSet = new Set(RIVAL_CLUBS.map((c) => c.name));
    expect(idSet.size).toBe(15);
    expect(nameSet.size).toBe(15);
    expect(idSet.has(PLAYER_ID)).toBe(false);
  });
});

// ── generateFixtures ──────────────────────────────────────────────────────────

describe('generateFixtures', () => {
  const ids = ids16();
  const fixtures = generateFixtures(ids, makeRng(1));

  it('yields SEASON_ROUNDS rounds of 8 fixtures (192 total)', () => {
    expect(fixtures).toHaveLength(SEASON_ROUNDS * FIXTURES_PER_ROUND);
    for (let r = 1; r <= SEASON_ROUNDS; r++) {
      const round = fixtures.filter((f) => f.round === r);
      expect(round).toHaveLength(FIXTURES_PER_ROUND);
    }
  });

  it('has no self-fixtures and no club twice in a round', () => {
    for (let r = 1; r <= SEASON_ROUNDS; r++) {
      const round = fixtures.filter((f) => f.round === r);
      const seen = new Set<string>();
      for (const f of round) {
        expect(f.homeId).not.toBe(f.awayId);
        expect(seen.has(f.homeId)).toBe(false);
        expect(seen.has(f.awayId)).toBe(false);
        seen.add(f.homeId);
        seen.add(f.awayId);
      }
      expect(seen.size).toBe(LEAGUE_SIZE);
    }
  });

  it('every pair of clubs meets at least once; mirrored pairs meet twice', () => {
    // 24 rounds for 16 clubs is NOT a full double round-robin (that needs 30).
    // Per the spec detail: 15 base rounds (single round-robin) + 9 mirrored
    // rounds → the base rounds 1..9 pairings meet twice, the rest once. So every
    // one of the C(16,2)=120 pairs appears, with count 1 or 2, and exactly the
    // mirrored count meet twice.
    const count = new Map<string, number>();
    const key = (a: string, b: string): string => [a, b].sort().join('|');
    for (const f of fixtures) count.set(key(f.homeId, f.awayId), (count.get(key(f.homeId, f.awayId)) ?? 0) + 1);
    expect(count.size).toBe((LEAGUE_SIZE * (LEAGUE_SIZE - 1)) / 2); // all 120 pairs present
    for (const n of count.values()) expect(n === 1 || n === 2).toBe(true);
    // Mirrored rounds = SEASON_ROUNDS - (LEAGUE_SIZE - 1) = 9 → 9×8 = 72 pairs twice.
    const mirroredPairs = (SEASON_ROUNDS - (LEAGUE_SIZE - 1)) * FIXTURES_PER_ROUND;
    const twice = [...count.values()].filter((n) => n === 2).length;
    expect(twice).toBe(mirroredPairs);
  });

  it('every club plays exactly SEASON_ROUNDS games (one per round)', () => {
    const games = new Map<string, number>();
    for (const f of fixtures) {
      games.set(f.homeId, (games.get(f.homeId) ?? 0) + 1);
      games.set(f.awayId, (games.get(f.awayId) ?? 0) + 1);
    }
    expect(games.size).toBe(LEAGUE_SIZE);
    for (const n of games.values()) expect(n).toBe(SEASON_ROUNDS);
  });

  it('mirrored pairings appear once at each venue', () => {
    // The 9 mirrored rounds (16..24) flip the venues of rounds 1..9.
    const orderedCount = new Map<string, number>();
    for (const f of fixtures) {
      const k = `${f.homeId}>${f.awayId}`;
      orderedCount.set(k, (orderedCount.get(k) ?? 0) + 1);
    }
    // For the 9 mirrored base rounds, the exact reverse ordered pair exists.
    for (let r = 1; r <= SEASON_ROUNDS - (LEAGUE_SIZE - 1); r++) {
      for (const f of fixtures.filter((x) => x.round === r)) {
        expect(orderedCount.get(`${f.awayId}>${f.homeId}`)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('is deterministic given the same rng seed', () => {
    const a = generateFixtures(ids, makeRng(99));
    const b = generateFixtures(ids, makeRng(99));
    expect(a).toEqual(b);
  });

  it('covers all pairings and stays structurally valid for any input ordering', () => {
    // Which specific pairs meet twice depends on the rotation order (input
    // ordering), so counts differ; but the coverage SET (all 120 pairs) and the
    // per-round structural guarantees must hold regardless of ordering.
    const shuffled = makeRng(7).shuffle(ids);
    const alt = generateFixtures(shuffled, makeRng(1));
    const key = (a: string, b: string): string => [a, b].sort().join('|');
    const pairSet = (fx: Fixture[]): Set<string> => new Set(fx.map((f) => key(f.homeId, f.awayId)));
    expect(alt).toHaveLength(SEASON_ROUNDS * FIXTURES_PER_ROUND);
    expect(pairSet(alt).size).toBe((LEAGUE_SIZE * (LEAGUE_SIZE - 1)) / 2);
    expect(pairSet(alt)).toEqual(pairSet(fixtures));
    // No self-fixtures / no club twice in a round, for the shuffled ordering too.
    for (let r = 1; r <= SEASON_ROUNDS; r++) {
      const seen = new Set<string>();
      for (const f of alt.filter((x) => x.round === r)) {
        expect(f.homeId).not.toBe(f.awayId);
        expect(seen.has(f.homeId)).toBe(false);
        expect(seen.has(f.awayId)).toBe(false);
        seen.add(f.homeId);
        seen.add(f.awayId);
      }
    }
  });

  it('throws on odd club counts', () => {
    expect(() => generateFixtures(['a', 'b', 'c'], makeRng(1))).toThrow();
  });
});

// ── applyResult / ladder math ─────────────────────────────────────────────────

function stateWithLadder(rows: LadderRow[]): GameState {
  createNewGame('Tester', 42);
  setState({ league: { clubs: [], fixtures: [], ladder: rows } });
  return getState();
}

describe('applyResult — points & re-sort', () => {
  it('awards 2 for a win, 0 for the loss, and accumulates PF/PA', () => {
    const s = stateWithLadder(emptyLadder(['a', 'b']));
    const fx: Fixture = { round: 1, homeId: 'a', awayId: 'b' };
    const next = applyResult(s, fx, { homeScore: 20, awayScore: 10 });
    const a = next.league.ladder.find((r) => r.clubId === 'a') as LadderRow;
    const b = next.league.ladder.find((r) => r.clubId === 'b') as LadderRow;
    expect(a.points).toBe(2);
    expect(a.wins).toBe(1);
    expect(a.played).toBe(1);
    expect(a.pointsFor).toBe(20);
    expect(a.pointsAgainst).toBe(10);
    expect(b.points).toBe(0);
    expect(b.losses).toBe(1);
    expect(b.pointsFor).toBe(10);
    expect(b.pointsAgainst).toBe(20);
  });

  it('awards 1 each for a draw', () => {
    const s = stateWithLadder(emptyLadder(['a', 'b']));
    const next = applyResult(s, { round: 1, homeId: 'a', awayId: 'b' }, { homeScore: 12, awayScore: 12 });
    expect(next.league.ladder.every((r) => r.points === 1 && r.draws === 1)).toBe(true);
  });

  it('does not mutate the input state or ladder', () => {
    const s = stateWithLadder(emptyLadder(['a', 'b']));
    const before = JSON.parse(JSON.stringify(s.league.ladder));
    applyResult(s, { round: 1, homeId: 'a', awayId: 'b' }, { homeScore: 20, awayScore: 10 });
    expect(s.league.ladder).toEqual(before);
  });

  it('stamps the result onto the matching fixture', () => {
    createNewGame('Tester', 42);
    const fx: Fixture = { round: 3, homeId: 'a', awayId: 'b' };
    setState({ league: { clubs: [], fixtures: [fx], ladder: emptyLadder(['a', 'b']) } });
    const next = applyResult(getState(), fx, { homeScore: 8, awayScore: 4 });
    expect(next.league.fixtures[0]?.result).toEqual({ homeScore: 8, awayScore: 4 });
  });

  it('sorts by points, then diff, then PF, then clubId', () => {
    // Construct rows that force each tie-break.
    const rows: LadderRow[] = [
      { clubId: 'lowpts', played: 1, wins: 0, draws: 0, losses: 1, pointsFor: 100, pointsAgainst: 0, points: 0 },
      { clubId: 'samePtsBigDiff', played: 1, wins: 1, draws: 0, losses: 0, pointsFor: 30, pointsAgainst: 0, points: 2 },
      { clubId: 'samePtsSmallDiff', played: 1, wins: 1, draws: 0, losses: 0, pointsFor: 10, pointsAgainst: 5, points: 2 },
      { clubId: 'samePtsSameDiffLowPF', played: 1, wins: 1, draws: 0, losses: 0, pointsFor: 5, pointsAgainst: 0, points: 2 },
      { clubId: 'samePtsSameDiffHighPF', played: 1, wins: 1, draws: 0, losses: 0, pointsFor: 20, pointsAgainst: 15, points: 2 },
    ];
    const sorted = sortLadder(rows).map((r) => r.clubId);
    expect(sorted[0]).toBe('samePtsBigDiff'); // diff +30
    // Next two both diff +5, break by PF: high PF (20) before low PF (5).
    expect(sorted.indexOf('samePtsSameDiffHighPF')).toBeLessThan(sorted.indexOf('samePtsSameDiffLowPF'));
    expect(sorted[sorted.length - 1]).toBe('lowpts'); // 0 points last
  });

  it('sortLadder is order-independent (stable & total)', () => {
    const rows = emptyLadder(['a', 'b', 'c', 'd']);
    rows[0]!.points = 4;
    rows[2]!.points = 4; // a and c tie on points & diff → clubId break: a before c
    const s1 = sortLadder(rows).map((r) => r.clubId);
    const s2 = sortLadder(rows.slice().reverse()).map((r) => r.clubId);
    expect(s1).toEqual(s2);
    expect(s1.indexOf('a')).toBeLessThan(s1.indexOf('c'));
  });
});

// ── getCurrentFixture ─────────────────────────────────────────────────────────

describe('getCurrentFixture', () => {
  it('returns the player fixture for the current week', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: 5 });
    const fx = getCurrentFixture(getState(), PLAYER_ID);
    expect(fx).toBeDefined();
    expect(fx!.round).toBe(5);
    expect(fx!.homeId === PLAYER_ID || fx!.awayId === PLAYER_ID).toBe(true);
  });

  it('returns undefined in finals weeks when the player has no tie', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: SEASON_ROUNDS + 1 });
    // No QF fixtures generated yet / player not in bracket → no fixture.
    expect(getCurrentFixture(getState(), PLAYER_ID)).toBeUndefined();
  });

  it('returns the player finals fixture when one exists for the week', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    const fx: Fixture = {
      round: SEASON_ROUNDS + 1,
      homeId: PLAYER_ID,
      awayId: 'rival-reapers',
    };
    setState({
      week: SEASON_ROUNDS + 1,
      league: { ...getState().league, fixtures: [...getState().league.fixtures, fx] },
    });
    expect(getCurrentFixture(getState(), PLAYER_ID)).toEqual(fx);
  });
});

// ── cheapSimScore / simulateRivalRound determinism ────────────────────────────

describe('cheapSimScore', () => {
  const strong: RivalClub = { id: 'x', name: 'X', colors: ['#000000', '#ffffff'], strength: 85 };
  const weak: RivalClub = { id: 'y', name: 'Y', colors: ['#000000', '#ffffff'], strength: 35 };

  it('is deterministic for a given seed', () => {
    const a = cheapSimScore(strong, weak, makeRng(3));
    const b = cheapSimScore(strong, weak, makeRng(3));
    expect(a).toEqual(b);
  });

  it('never returns negative scores', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = cheapSimScore(weak, strong, makeRng(seed));
      expect(r.homeScore).toBeGreaterThanOrEqual(0);
      expect(r.awayScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('the stronger side wins on average', () => {
    let strongWins = 0;
    const N = 400;
    for (let seed = 0; seed < N; seed++) {
      const r = cheapSimScore(strong, weak, makeRng(seed));
      if (r.homeScore > r.awayScore) strongWins++;
    }
    expect(strongWins / N).toBeGreaterThan(0.6);
  });
});

describe('simulateRivalRound', () => {
  it('is deterministic and skips player fixtures', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: 1 });
    const before = getState();
    const rA = simulateRivalRound(before, makeRng(5));
    const rB = simulateRivalRound(before, makeRng(5));
    expect(rA.league.ladder).toEqual(rB.league.ladder);

    // Player fixture for round 1 must remain unplayed.
    const playerFx = rA.league.fixtures.find(
      (f) => f.round === 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID),
    );
    expect(playerFx?.result).toBeUndefined();
  });

  it('applies exactly the 7 rival games of the round to the ladder', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: 1 });
    const next = simulateRivalRound(getState(), makeRng(5));
    const totalPlayed = next.league.ladder.reduce((a, r) => a + r.played, 0);
    // 7 rival-vs-rival games → 14 club-appearances (player's game excluded).
    expect(totalPlayed).toBe(14);
    const playerRow = next.league.ladder.find((r) => r.clubId === PLAYER_ID);
    expect(playerRow?.played).toBe(0);
  });
});

// ── runFinals ─────────────────────────────────────────────────────────────────

describe('runFinals', () => {
  function ladderTop(playerRank: number): GameState {
    // Build a league where the player sits at ladder position `playerRank`.
    createNewGame('Tester', 42);
    initLeague(getState());
    const clubs = getState().league.clubs;
    // Give descending points so ordering is deterministic; player gets a chosen slot.
    const others = clubs.filter((c) => c.id !== PLAYER_ID);
    const rows: LadderRow[] = [];
    let pts = clubs.length * 2;
    const ordered = [...others];
    // Insert player at desired rank.
    ordered.splice(playerRank - 1, 0, clubs.find((c) => c.id === PLAYER_ID)!);
    for (const c of ordered) {
      rows.push({ clubId: c.id, played: 24, wins: pts / 2, draws: 0, losses: 24 - pts / 2, pointsFor: pts * 10, pointsAgainst: 0, points: pts });
      pts -= 2;
    }
    setState({ league: { ...getState().league, ladder: sortLadder(rows) } });
    return getState();
  }

  it('records a history entry with the player regular-season ladder position', () => {
    const s = ladderTop(3);
    const before = getState().history.length;
    const next = runFinals(s, makeRng(11));
    expect(next.history).toHaveLength(before + 1);
    expect(next.history[next.history.length - 1]!.ladderPosition).toBe(3);
  });

  it('grants +15 reputation and premiership=true when the player wins the GF', () => {
    // Player as top seed with an overwhelming cheap-sim edge is not guaranteed,
    // so scan seeds until the player (seed 1) takes the premiership.
    const s = ladderTop(1);
    let premSeed = -1;
    for (let seed = 0; seed < 500; seed++) {
      const r = runFinals(s, makeRng(seed));
      if (r.history[r.history.length - 1]!.premiership) { premSeed = seed; break; }
    }
    expect(premSeed).toBeGreaterThanOrEqual(0);
    const won = runFinals(s, makeRng(premSeed));
    expect(won.reputation).toBe(s.reputation + PREMIERSHIP_REP_BONUS);
    expect(won.history[won.history.length - 1]!.premiership).toBe(true);
  });

  it('is deterministic given the same rng seed', () => {
    const s = ladderTop(4);
    const a = runFinals(s, makeRng(21));
    const b = runFinals(s, makeRng(21));
    expect(a.history).toEqual(b.history);
    expect(a.reputation).toBe(b.reputation);
    expect(a.league.fixtures.filter((f) => f.round > SEASON_ROUNDS)).toEqual(
      b.league.fixtures.filter((f) => f.round > SEASON_ROUNDS),
    );
  });

  it('returns the state unchanged when fewer than 8 clubs', () => {
    const s = stateWithLadder(emptyLadder(['a', 'b', 'c']));
    expect(runFinals(s, makeRng(1))).toEqual(s);
  });

  it('appends QF/SF/GF fixtures and stamps results (headless path)', () => {
    const s = ladderTop(1);
    const next = runFinals(s, makeRng(7));
    const finals = next.league.fixtures.filter((f) => f.round > SEASON_ROUNDS);
    expect(finals.filter((f) => f.round === SEASON_ROUNDS + 1)).toHaveLength(4);
    expect(finals.filter((f) => f.round === SEASON_ROUNDS + 2)).toHaveLength(2);
    expect(finals.filter((f) => f.round === SEASON_ROUNDS + 3)).toHaveLength(1);
    expect(finals.every((f) => !!f.result)).toBe(true);
    // Finals must not alter regular-season ladder points.
    expect(next.league.ladder.map((r) => r.points)).toEqual(
      s.league.ladder.map((r) => r.points),
    );
  });
});

// ── Playable finals helpers (GitHub #2) ───────────────────────────────────────

describe('ensureFinalsRound / playable finals', () => {
  function ladderTop(playerRank: number): GameState {
    createNewGame('Tester', 42);
    initLeague(getState());
    const clubs = getState().league.clubs;
    const others = clubs.filter((c) => c.id !== PLAYER_ID);
    const rows: LadderRow[] = [];
    let pts = clubs.length * 2;
    const ordered = [...others];
    ordered.splice(playerRank - 1, 0, clubs.find((c) => c.id === PLAYER_ID)!);
    for (const c of ordered) {
      rows.push({
        clubId: c.id, played: 24, wins: pts / 2, draws: 0, losses: 24 - pts / 2,
        pointsFor: pts * 10, pointsAgainst: 0, points: pts,
      });
      pts -= 2;
    }
    setState({ league: { ...getState().league, ladder: sortLadder(rows) } });
    return getState();
  }

  it('generates QF fixtures on week 25 from top-8 seeds', () => {
    ladderTop(1);
    setState({ week: SEASON_ROUNDS + 1 });
    const next = ensureFinalsRound(getState());
    const qf = next.league.fixtures.filter((f) => f.round === SEASON_ROUNDS + 1);
    expect(qf).toHaveLength(4);
    expect(qf.some((f) => f.homeId === PLAYER_ID || f.awayId === PLAYER_ID)).toBe(true);
  });

  it('skips the player when they finish outside the top 8', () => {
    ladderTop(9);
    setState({ week: SEASON_ROUNDS + 1 });
    const next = ensureFinalsRound(getState());
    const qf = next.league.fixtures.filter((f) => f.round === SEASON_ROUNDS + 1);
    expect(qf).toHaveLength(4);
    expect(qf.every((f) => f.homeId !== PLAYER_ID && f.awayId !== PLAYER_ID)).toBe(true);
    expect(getCurrentFixture(next, PLAYER_ID)).toBeUndefined();
  });

  it('builds SF from QF winners then GF from SF winners', () => {
    ladderTop(1);
    setState({ week: SEASON_ROUNDS + 1 });
    let s = ensureFinalsRound(getState());
    // Stamp QF results (player + rivals).
    for (const f of s.league.fixtures.filter((x) => x.round === SEASON_ROUNDS + 1)) {
      s = applyResult(s, f, { homeScore: 20, awayScore: 10 });
    }
    setState({ league: s.league, week: SEASON_ROUNDS + 2 });
    s = ensureFinalsRound(getState());
    const sf = s.league.fixtures.filter((f) => f.round === SEASON_ROUNDS + 2);
    expect(sf).toHaveLength(2);

    for (const f of sf) {
      s = applyResult(s, f, { homeScore: 18, awayScore: 12 });
    }
    setState({ league: s.league, week: SEASON_ROUNDS + 3 });
    s = ensureFinalsRound(getState());
    const gf = s.league.fixtures.filter((f) => f.round === SEASON_ROUNDS + 3);
    expect(gf).toHaveLength(1);
  });
});

// ── ladderPosition & initLeague ───────────────────────────────────────────────

describe('initLeague', () => {
  it('populates 16 clubs (player first), 192 fixtures and a zeroed ladder', () => {
    createNewGame('Cavehole Crushers', 42);
    const league = initLeague(getState());
    expect(league.clubs).toHaveLength(LEAGUE_SIZE);
    expect(league.clubs[0]?.id).toBe(PLAYER_ID);
    expect(league.clubs[0]?.name).toBe('Cavehole Crushers');
    expect(league.fixtures).toHaveLength(SEASON_ROUNDS * FIXTURES_PER_ROUND);
    expect(league.ladder).toHaveLength(LEAGUE_SIZE);
    expect(league.ladder.every((r) => r.played === 0 && r.points === 0)).toBe(true);
    // Committed to the store.
    expect(getState().league.clubs).toHaveLength(LEAGUE_SIZE);
  });

  it('advances the rng seed (deterministic per starting seed)', () => {
    createNewGame('A', 42);
    const seedBefore = getState().rngSeed;
    initLeague(getState());
    expect(getState().rngSeed).not.toBe(seedBefore);
  });
});

describe('ladderPosition', () => {
  it('is 1-based and 0 for absent clubs', () => {
    const s = stateWithLadder(sortLadder([
      { clubId: 'a', played: 1, wins: 1, draws: 0, losses: 0, pointsFor: 10, pointsAgainst: 0, points: 2 },
      { clubId: 'b', played: 1, wins: 0, draws: 0, losses: 1, pointsFor: 0, pointsAgainst: 10, points: 0 },
    ]));
    expect(ladderPosition(s, 'a')).toBe(1);
    expect(ladderPosition(s, 'b')).toBe(2);
    expect(ladderPosition(s, 'missing')).toBe(0);
  });
});

// ── registerFixturesSystem tick integration ───────────────────────────────────

describe('registerFixturesSystem', () => {
  it('rolls weather and simulates the rival round on a tick', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: 1 });
    registerFixturesSystem();
    advanceWeek(); // runs weather + rival sim + ladder refresh, then week -> 2
    const s = getState();
    expect(s.weather).toBeDefined();
    // Rival games for round 1 were applied (14 club-appearances).
    const totalPlayed = s.league.ladder.reduce((a, r) => a + r.played, 0);
    expect(totalPlayed).toBe(14);
    expect(s.week).toBe(2);
  });

  it('keeps the ladder sorted after a tick', () => {
    createNewGame('Tester', 42);
    initLeague(getState());
    setState({ week: 1 });
    registerFixturesSystem();
    advanceWeek();
    const ladder = getState().league.ladder;
    expect(ladder).toEqual(sortLadder(ladder));
  });
});
