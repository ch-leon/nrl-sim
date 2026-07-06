// src/systems/fixtures.ts — season fixtures, ladder, rival cheap-sim and finals
// for the 16-club league (BAK-184, WU-7). Pure TypeScript, no Phaser.
//
// Ownership boundary (per spec §Integration note): this module generates the
// fixture list, maintains the ladder, cheap-sims the RIVAL-vs-rival games each
// round, and runs the finals bracket. The PLAYER's own match each round is run
// by the orchestrator (WU-12) using getCurrentFixture + applyResult — this
// module never simulates the player's match via the full engine.
//
// Registration is OPT-IN: importing this module has no side effects. The
// orchestrator calls registerFixturesSystem() from main.ts to install the tick /
// season hooks, and initLeague(state) at boot to populate clubs/fixtures/ladder.

import {
  getState,
  setState,
  type GameState,
  type Fixture,
  type LadderRow,
  type LeagueState,
  type RivalClub,
} from '../core/state';
import { makeRng, type Rng } from '../utils/rng';
import { rollWeather } from '../sim/weather';
import { registerTickHook, registerSeasonHook, TICK_ORDER, type TickContext } from '../core/time';
import { SEASON_ROUNDS, FINALS_WEEKS } from '../config';
import { RIVAL_CLUBS } from '../data/league';

// ── Constants ────────────────────────────────────────────────────────────────

/** The player's league id (matches GameState.clubId). */
export const PLAYER_ID = 'player';

/** Fixtures per round for a 16-club, no-bye competition. */
export const FIXTURES_PER_ROUND = 8;

/** Number of clubs in the competition (15 rivals + player). */
export const LEAGUE_SIZE = RIVAL_CLUBS.length + 1;

// Finals round numbers (weeks 25..27 = SEASON_ROUNDS + 1..3).
const QF_ROUND = SEASON_ROUNDS + 1; // 25
const SF_ROUND = SEASON_ROUNDS + 2; // 26
const GF_ROUND = SEASON_ROUNDS + 3; // 27

/** Reputation granted for winning the premiership (grand final). */
export const PREMIERSHIP_REP_BONUS = 15;

// ── Fixture generation (circle / round-robin method) ─────────────────────────

/**
 * Generate a full home-and-away fixture list for the given club ids using the
 * circle method:
 *   - Rounds 1..(N-1): each club plays every other once (all-play-all).
 *   - Then the first (SEASON_ROUNDS-(N-1)) base rounds are appended again with
 *     venues flipped, so the total is exactly SEASON_ROUNDS rounds.
 *
 * For 16 clubs: 15 all-play-all rounds + 9 mirrored rounds = 24 rounds × 8 = 192
 * fixtures. Home/away for the base rounds is decided by the circle pairing;
 * `rng` is threaded so any future tie-breaking stays deterministic (the current
 * scheme is deterministic on its own, so rng is consumed once to keep the seed
 * advancing predictably alongside other systems).
 *
 * Guarantees: 8 fixtures per round, no self-fixtures, no club appears twice in a
 * round, and every mirrored pairing appears once home / once away.
 */
export function generateFixtures(clubIds: string[], rng: Rng): Fixture[] {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0) {
    throw new Error(`generateFixtures needs an even club count >= 2, got ${n}`);
  }

  // Consume one rng draw so the seed advances in step with the season rollover
  // (keeps determinism observable and reserves rng for future tie-breaks).
  rng.next();

  // Circle method: fix index 0, rotate the rest. `ids` is a working copy.
  const ids = clubIds.slice();
  const rounds = n - 1; // 15 for 16 clubs
  const half = n / 2;

  const baseRounds: Fixture[][] = [];
  for (let r = 0; r < rounds; r++) {
    const roundFixtures: Fixture[] = [];
    for (let i = 0; i < half; i++) {
      const a = ids[i] as string;
      const b = ids[n - 1 - i] as string;
      // Alternate home/away by round+pairing parity for a fairer home split.
      const homeIsA = (r + i) % 2 === 0;
      roundFixtures.push({
        round: r + 1,
        homeId: homeIsA ? a : b,
        awayId: homeIsA ? b : a,
      });
    }
    baseRounds.push(roundFixtures);
    rotate(ids);
  }

  const fixtures: Fixture[] = [];
  for (const rf of baseRounds) fixtures.push(...rf);

  // Mirror the first (SEASON_ROUNDS - rounds) base rounds with venues flipped.
  const mirrorCount = SEASON_ROUNDS - rounds; // 24 - 15 = 9
  for (let m = 0; m < mirrorCount; m++) {
    const source = baseRounds[m] as Fixture[];
    const mirrorRound = rounds + 1 + m; // 16..24
    for (const f of source) {
      fixtures.push({ round: mirrorRound, homeId: f.awayId, awayId: f.homeId });
    }
  }

  return fixtures;
}

/** Rotate all but the first element one step (circle-method step). */
function rotate(ids: string[]): void {
  if (ids.length <= 2) return;
  // Keep ids[0] fixed; move the last element to position 1.
  const last = ids.pop() as string;
  ids.splice(1, 0, last);
}

// ── Ladder ───────────────────────────────────────────────────────────────────

/** A fresh ladder row for a club (all counters zeroed). */
function emptyRow(clubId: string): LadderRow {
  return {
    clubId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    points: 0,
  };
}

/** Build a zeroed ladder for the given clubs, in club order. */
export function emptyLadder(clubIds: string[]): LadderRow[] {
  return clubIds.map(emptyRow);
}

/**
 * Total, stable ladder comparator: points desc → (PF − PA) desc → PF desc →
 * clubId asc (final deterministic tie-break so sort order never depends on the
 * input array order).
 */
function ladderCompare(a: LadderRow, b: LadderRow): number {
  if (b.points !== a.points) return b.points - a.points;
  const diffA = a.pointsFor - a.pointsAgainst;
  const diffB = b.pointsFor - b.pointsAgainst;
  if (diffB !== diffA) return diffB - diffA;
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
  return a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0;
}

/** Sort a ladder, returning a NEW sorted array (input not mutated). */
export function sortLadder(ladder: LadderRow[]): LadderRow[] {
  return ladder.slice().sort(ladderCompare);
}

/**
 * Apply a completed result to the ladder and return a NEW GameState with the
 * re-sorted ladder. 2 pts win / 1 pt draw / 0 loss; accumulates played, W/D/L,
 * pointsFor/Against. Missing rows are created on demand. Does NOT mutate the
 * passed state or its ladder; also stamps the result onto the matching fixture.
 */
export function applyResult(
  state: GameState,
  fixture: Fixture,
  result: { homeScore: number; awayScore: number },
): GameState {
  const rows = new Map<string, LadderRow>();
  for (const row of state.league.ladder) rows.set(row.clubId, { ...row });

  const home = rows.get(fixture.homeId) ?? emptyRow(fixture.homeId);
  const away = rows.get(fixture.awayId) ?? emptyRow(fixture.awayId);

  home.played++;
  away.played++;
  home.pointsFor += result.homeScore;
  home.pointsAgainst += result.awayScore;
  away.pointsFor += result.awayScore;
  away.pointsAgainst += result.homeScore;

  if (result.homeScore > result.awayScore) {
    home.wins++;
    home.points += 2;
    away.losses++;
  } else if (result.homeScore < result.awayScore) {
    away.wins++;
    away.points += 2;
    home.losses++;
  } else {
    home.draws++;
    away.draws++;
    home.points += 1;
    away.points += 1;
  }

  rows.set(home.clubId, home);
  rows.set(away.clubId, away);

  const ladder = sortLadder([...rows.values()]);

  // Stamp the result onto the matching regular-season fixture (by round + teams).
  const fixtures = state.league.fixtures.map((f) =>
    f.round === fixture.round && f.homeId === fixture.homeId && f.awayId === fixture.awayId
      ? { ...f, result }
      : f,
  );

  const league: LeagueState = { ...state.league, fixtures, ladder };
  return { ...state, league };
}

/** 1-based ladder position of a club, or 0 if absent. */
export function ladderPosition(state: GameState, clubId: string): number {
  const idx = state.league.ladder.findIndex((r) => r.clubId === clubId);
  return idx < 0 ? 0 : idx + 1;
}

// ── Current fixture lookup ────────────────────────────────────────────────────

/**
 * The club's fixture for the current week's regular-season round, or undefined
 * during finals weeks / when no such fixture exists. `state.week` maps directly
 * to the round number for weeks 1..SEASON_ROUNDS.
 */
export function getCurrentFixture(state: GameState, clubId: string): Fixture | undefined {
  const round = state.week;
  if (round < 1 || round > SEASON_ROUNDS) return undefined;
  return state.league.fixtures.find(
    (f) => f.round === round && (f.homeId === clubId || f.awayId === clubId),
  );
}

// ── Cheap rival-vs-rival simulation ───────────────────────────────────────────

/**
 * Cheap-sim a single fixture from the two clubs' strength ratings. Deterministic
 * given `rng`. Per BAK-184:
 *   base(home) = 12 + (H.strength − A.strength) × 0.2 + 2 (home advantage)
 *   base(away) = 12 + (A.strength − H.strength) × 0.2
 *   score = clamp(round(base + rng.int(0,12)), 0, ∞)
 * Draws are allowed.
 */
export function cheapSimScore(
  home: RivalClub,
  away: RivalClub,
  rng: Rng,
): { homeScore: number; awayScore: number } {
  const homeBase = 12 + (home.strength - away.strength) * 0.2 + 2;
  const awayBase = 12 + (away.strength - home.strength) * 0.2;
  const homeScore = Math.max(0, Math.round(homeBase + rng.int(0, 12)));
  const awayScore = Math.max(0, Math.round(awayBase + rng.int(0, 12)));
  return { homeScore, awayScore };
}

/**
 * Cheap-sim every RIVAL-vs-rival fixture in the current round and apply the
 * results to the ladder. Fixtures involving the player are skipped (the
 * orchestrator runs the player's match). Already-played fixtures are skipped.
 * Returns a NEW GameState. Deterministic given `rng`.
 */
export function simulateRivalRound(state: GameState, rng: Rng): GameState {
  const round = state.week;
  const byId = new Map(state.league.clubs.map((c) => [c.id, c] as const));

  let next = state;
  for (const fixture of state.league.fixtures) {
    if (fixture.round !== round) continue;
    if (fixture.result) continue;
    if (fixture.homeId === PLAYER_ID || fixture.awayId === PLAYER_ID) continue;

    const home = byId.get(fixture.homeId);
    const away = byId.get(fixture.awayId);
    if (!home || !away) continue;

    const result = cheapSimScore(home, away, rng);
    next = applyResult(next, fixture, result);
  }
  return next;
}

// ── Finals (top-8 knockout, weeks 25..27) ─────────────────────────────────────

/**
 * Run the finals series for the current season and return a NEW GameState.
 *   - QF (round 25): seeds 1v8, 2v7, 3v6, 4v5.
 *   - SF (round 26): QF winners re-seeded by ladder rank (best survivors paired
 *     1v4 & 2v3).
 *   - GF (round 27): SF winners.
 * All ties are cheap-simmed here (player finals playback is orchestrated by
 * WU-12; this provides the headless resolution and premiership bookkeeping).
 * A premiership win pushes a `history` entry and grants +15 reputation.
 */
export function runFinals(state: GameState, rng: Rng): GameState {
  const seeds = sortLadder(state.league.ladder).slice(0, 8).map((r) => r.clubId);
  if (seeds.length < 8) return state; // not enough clubs to run finals

  const byId = new Map(state.league.clubs.map((c) => [c.id, c] as const));
  const winner = (homeId: string, awayId: string): string => {
    const home = byId.get(homeId);
    const away = byId.get(awayId);
    if (!home || !away) return homeId;
    const res = cheapSimScore(home, away, rng);
    // Break a drawn knockout in favour of the home (better-seeded) side.
    return res.homeScore >= res.awayScore ? homeId : awayId;
  };

  // Ranking helper for re-seeding survivors (lower index = better seed).
  const rankOf = (id: string): number => seeds.indexOf(id);
  const higherSeedFirst = (a: string, b: string): [string, string] =>
    rankOf(a) <= rankOf(b) ? [a, b] : [b, a];

  // Quarter-finals: 1v8, 2v7, 3v6, 4v5 (home = better seed).
  const qfPairs: Array<[string, string]> = [
    [seeds[0] as string, seeds[7] as string],
    [seeds[1] as string, seeds[6] as string],
    [seeds[2] as string, seeds[5] as string],
    [seeds[3] as string, seeds[4] as string],
  ];
  const qfWinners = qfPairs.map(([h, a]) => winner(h, a));

  // Semi-finals: re-seed the four QF winners by ladder rank, pair 1v4 & 2v3.
  const sfSeeds = qfWinners.slice().sort((a, b) => rankOf(a) - rankOf(b));
  const sf1 = higherSeedFirst(sfSeeds[0] as string, sfSeeds[3] as string);
  const sf2 = higherSeedFirst(sfSeeds[1] as string, sfSeeds[2] as string);
  const sfWinners = [winner(sf1[0], sf1[1]), winner(sf2[0], sf2[1])];

  // Grand final: SF winners, higher seed at home.
  const [gfHome, gfAway] = higherSeedFirst(sfWinners[0] as string, sfWinners[1] as string);
  const premier = winner(gfHome, gfAway);

  // Premiership bookkeeping: history + reputation. Ladder position recorded is
  // the pre-finals ladder rank (regular-season finish) for the player.
  const playerPos = ladderPosition(state, PLAYER_ID);
  const playerPremiership = premier === PLAYER_ID;

  // runFinals executes inside the season hook, AFTER resetForNewSeason() has
  // already bumped state.season — the season that just ended is season - 1.
  const history = [
    ...state.history,
    { season: state.season - 1, ladderPosition: playerPos, premiership: playerPremiership },
  ];
  const reputation = playerPremiership
    ? Math.min(100, state.reputation + PREMIERSHIP_REP_BONUS)
    : state.reputation;

  return { ...state, history, reputation };
}

// ── League initialisation ─────────────────────────────────────────────────────

/**
 * Populate a league (clubs + fixtures + zeroed ladder) for the player club and
 * commit it to the store. The built LeagueState is also returned. Uses and
 * advances the state RNG seed for determinism (same pattern as data/club.ts).
 */
export function initLeague(state: GameState): LeagueState {
  const playerClub: RivalClub = {
    id: PLAYER_ID,
    name: state.clubName,
    colors: ['#f4d03f', '#1a1a2e'],
    strength: 55, // baseline used only if the player is ever cheap-simmed
  };
  const clubs: RivalClub[] = [playerClub, ...RIVAL_CLUBS.map((c) => ({ ...c }))];
  const clubIds = clubs.map((c) => c.id);

  const rng = makeRng(state.rngSeed);
  const fixtures = generateFixtures(clubIds, rng);
  const league: LeagueState = { clubs, fixtures, ladder: emptyLadder(clubIds) };

  setState({ league, rngSeed: rng.state() });
  return league;
}

// ── System registration (tick + season hooks) ────────────────────────────────

/**
 * Install the fixtures system's tick and season hooks. Idempotent (re-registers
 * by name). Call ONCE from the orchestrator (main.ts). No import side effects.
 *
 * Hooks:
 *   - 'weather' (order match-1): roll state.weather for the round via rollWeather
 *     (BAK-198 boundary — the fixtures system owns writing per-round weather).
 *   - 'fixtures-rivals' (order 40 / TICK_ORDER.match): cheap-sim the rival-vs-
 *     rival games for the round. The player's own match is run by the
 *     orchestrator alongside this via getCurrentFixture + applyResult.
 *   - 'fixtures-ladder' (order 50 / TICK_ORDER.ladder): keep the ladder sorted
 *     (defensive re-sort after all results for the round have landed).
 *   - season hook (order 10): record the previous season's finals outcome, then
 *     regenerate fixtures + reset the ladder for the new season (defensive init
 *     if the league is empty).
 */
export function registerFixturesSystem(): void {
  // (a) Weather roll — must run before the match hook so the sim reads it.
  registerTickHook('weather', TICK_ORDER.match - 1, () => {
    const s = getState();
    const rng = makeRng(s.rngSeed);
    const weather = rollWeather(rng.next);
    setState({ weather, rngSeed: rng.state() });
  });

  // (b) Rival-vs-rival cheap sim for the round (order 40, alongside player match).
  registerTickHook('fixtures-rivals', TICK_ORDER.match, (ctx: TickContext) => {
    const s = getState();
    // Only simulate during the regular season; finals are handled by runFinals.
    if (ctx.week < 1 || ctx.week > SEASON_ROUNDS) return;
    if (s.league.clubs.length === 0) return; // league not initialised yet
    const rng = makeRng(s.rngSeed);
    const next = simulateRivalRound(s, rng);
    setState({ league: next.league, rngSeed: rng.state() });
  });

  // (c) Ladder refresh — defensive re-sort after the round's results land.
  registerTickHook('fixtures-ladder', TICK_ORDER.ladder, () => {
    const s = getState();
    if (s.league.ladder.length === 0) return;
    setState({ league: { ...s.league, ladder: sortLadder(s.league.ladder) } });
  });

  // Season rollover: record finals outcome, then regenerate the season.
  registerSeasonHook('fixtures-season', 10, () => {
    const s = getState();

    // If the league is missing (fresh game / defensive), initialise from scratch.
    if (s.league.clubs.length === 0) {
      initLeague(s);
      return;
    }

    // Record the just-completed season's finals result & premiership rep.
    const rngFinals = makeRng(s.rngSeed);
    const afterFinals = runFinals(s, rngFinals);
    setState({
      history: afterFinals.history,
      reputation: afterFinals.reputation,
      rngSeed: rngFinals.state(),
    });

    // Regenerate a fresh fixture list + zeroed ladder for the new season.
    const s2 = getState();
    const clubIds = s2.league.clubs.map((c) => c.id);
    const rng = makeRng(s2.rngSeed);
    const fixtures = generateFixtures(clubIds, rng);
    setState({
      league: { ...s2.league, fixtures, ladder: emptyLadder(clubIds) },
      rngSeed: rng.state(),
    });
  });
}

/** Finals round numbers, exported for the orchestrator / UI. */
export const FINALS_ROUNDS = { QF: QF_ROUND, SF: SF_ROUND, GF: GF_ROUND } as const;
export { FINALS_WEEKS };
