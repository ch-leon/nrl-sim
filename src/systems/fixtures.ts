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
import { topTryScorer } from './stats';
import { registerTickHook, registerSeasonHook, resumeWeek, TICK_ORDER, type TickContext } from '../core/time';
import { applyRivalResults, canUseWorker, playRivalJob, playRivalJobsInWorker, rivalJobs } from './rivalRound';
import { applyBoardReview } from './board';
import { SEASON_ROUNDS, FINALS_WEEKS, WEEKS_PER_SEASON, DEFAULT_PLAYER_COLORS } from '../config';
import { RIVAL_CLUBS } from '../data/league';
import { bus } from '../core/events';
import { strengthChanges, applySeasonReputation } from './league';
import { rolloverRivals, withRivalSquads } from './rivals';

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

/** True for finals weeks (25..27). Knockout results do not update the ladder. */
export function isFinalsRound(round: number): boolean {
  return round > SEASON_ROUNDS && round <= WEEKS_PER_SEASON;
}

/**
 * Stamp a result onto the matching fixture without touching the ladder.
 * Used for finals knockout ties (ladder reflects regular-season finish only).
 */
export function stampFixtureResult(
  state: GameState,
  fixture: Fixture,
  result: { homeScore: number; awayScore: number },
): GameState {
  const fixtures = state.league.fixtures.map((f) =>
    f.round === fixture.round && f.homeId === fixture.homeId && f.awayId === fixture.awayId
      ? { ...f, result }
      : f,
  );
  return { ...state, league: { ...state.league, fixtures } };
}

/**
 * Apply a completed result to the ladder and return a NEW GameState with the
 * re-sorted ladder. 2 pts win / 1 pt draw / 0 loss; accumulates played, W/D/L,
 * pointsFor/Against. Missing rows are created on demand. Does NOT mutate the
 * passed state or its ladder; also stamps the result onto the matching fixture.
 *
 * Finals fixtures (round > SEASON_ROUNDS) only stamp the score — knockout ties
 * must not alter regular-season ladder bookkeeping.
 */
export function applyResult(
  state: GameState,
  fixture: Fixture,
  result: { homeScore: number; awayScore: number },
): GameState {
  if (isFinalsRound(fixture.round)) {
    return stampFixtureResult(state, fixture, result);
  }

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
 * The club's fixture for the current week/round, or undefined on a bye /
 * finals-skip (not qualified / already eliminated). `state.week` maps directly
 * to the round number for weeks 1..WEEKS_PER_SEASON (regular season + finals).
 */
export function getCurrentFixture(state: GameState, clubId: string): Fixture | undefined {
  const round = state.week;
  if (round < 1 || round > WEEKS_PER_SEASON) return undefined;
  return state.league.fixtures.find(
    (f) => f.round === round && (f.homeId === clubId || f.awayId === clubId),
  );
}

// ── Cheap rival-vs-rival simulation ───────────────────────────────────────────

/**
 * The cheap rival sim's numbers (N9.2, tuning reference §24), on the live
 * sim's scale so the ladder reads the same whichever engine played a fixture:
 * between rival clubs the live sim scores about 15 a side (30 a match), wins by
 * about 10, has no home edge, and the stronger side wins about 65% at a
 * 12-point strength gap and 75% at 25 (run 20261019-235506-rival-scores).
 */
export const CHEAP = {
  /** A side's score before the dice: this plus `gap` × the strength difference. */
  base: 0.5,
  /** Points per point of strength over the other side. */
  gap: 0.17,
  /** Home side's extra points (the live sim has no home edge). */
  home: 0,
  /** The dice: each side adds a whole number from 0 to this. */
  spread: 29,
};

/**
 * Cheap-sim a single fixture from the two clubs' strength ratings, on the live
 * sim's scale (CHEAP). Deterministic given `rng`. Draws are allowed.
 *   score = max(0, round(base ± gap × (H − A) (+ home) + rng.int(0, spread)))
 */
export function cheapSimScore(
  home: RivalClub,
  away: RivalClub,
  rng: Rng,
): { homeScore: number; awayScore: number } {
  const homeBase = CHEAP.base + (home.strength - away.strength) * CHEAP.gap + CHEAP.home;
  const awayBase = CHEAP.base + (away.strength - home.strength) * CHEAP.gap;
  const homeScore = Math.max(0, Math.round(homeBase + rng.int(0, CHEAP.spread)));
  const awayScore = Math.max(0, Math.round(awayBase + rng.int(0, CHEAP.spread)));
  return { homeScore, awayScore };
}

/**
 * Cheap-sim every RIVAL-vs-rival fixture in the current round and apply the
 * results (ladder for regular season; stamp-only for finals). Fixtures involving
 * the player are skipped (the orchestrator runs the player's match).
 * Already-played fixtures are skipped. Returns a NEW GameState. Deterministic.
 */
export function simulateRivalRound(state: GameState, rng: Rng): GameState {
  const round = state.week;
  if (round < 1 || round > WEEKS_PER_SEASON) return state;
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

/** Knockout winner from a completed fixture. Draws favour home (higher seed). */
export function knockoutWinner(fixture: Fixture): string | undefined {
  if (!fixture.result) return undefined;
  return fixture.result.homeScore >= fixture.result.awayScore
    ? fixture.homeId
    : fixture.awayId;
}

function roundFixtures(state: GameState, round: number): Fixture[] {
  return state.league.fixtures.filter((f) => f.round === round);
}

function appendFixtures(state: GameState, added: Fixture[]): GameState {
  if (added.length === 0) return state;
  return {
    ...state,
    league: { ...state.league, fixtures: [...state.league.fixtures, ...added] },
  };
}

/** Top-8 club ids from the current ladder (regular-season seeds). */
export function finalsSeeds(state: GameState): string[] {
  return sortLadder(state.league.ladder).slice(0, 8).map((r) => r.clubId);
}

function higherSeedFirst(
  seeds: readonly string[],
  a: string,
  b: string,
): [string, string] {
  const rankOf = (id: string): number => {
    const i = seeds.indexOf(id);
    return i < 0 ? 999 : i;
  };
  return rankOf(a) <= rankOf(b) ? [a, b] : [b, a];
}

/** QF pairs: 1v8, 2v7, 3v6, 4v5 (home = better seed). */
export function quarterFinalPairs(seeds: readonly string[]): Array<[string, string]> {
  if (seeds.length < 8) return [];
  return [
    [seeds[0] as string, seeds[7] as string],
    [seeds[1] as string, seeds[6] as string],
    [seeds[2] as string, seeds[5] as string],
    [seeds[3] as string, seeds[4] as string],
  ];
}

/** Build QF fixtures for round 25 from the current ladder. */
export function makeQuarterFinalFixtures(state: GameState): Fixture[] {
  return quarterFinalPairs(finalsSeeds(state)).map(([homeId, awayId]) => ({
    round: QF_ROUND,
    homeId,
    awayId,
  }));
}

/** Build SF fixtures for round 26 from completed QF results. */
export function makeSemiFinalFixtures(state: GameState): Fixture[] {
  const seeds = finalsSeeds(state);
  const qf = roundFixtures(state, QF_ROUND);
  if (qf.length < 4 || qf.some((f) => !f.result)) return [];
  const winners = qf.map((f) => knockoutWinner(f)!);
  const sfSeeds = winners.slice().sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
  const pairs: Array<[string, string]> = [
    higherSeedFirst(seeds, sfSeeds[0] as string, sfSeeds[3] as string),
    higherSeedFirst(seeds, sfSeeds[1] as string, sfSeeds[2] as string),
  ];
  return pairs.map(([homeId, awayId]) => ({ round: SF_ROUND, homeId, awayId }));
}

/** Build GF fixture for round 27 from completed SF results. */
export function makeGrandFinalFixtures(state: GameState): Fixture[] {
  const seeds = finalsSeeds(state);
  const sf = roundFixtures(state, SF_ROUND);
  if (sf.length < 2 || sf.some((f) => !f.result)) return [];
  const winners = sf.map((f) => knockoutWinner(f)!);
  const [homeId, awayId] = higherSeedFirst(seeds, winners[0] as string, winners[1] as string);
  return [{ round: GF_ROUND, homeId, awayId }];
}

/**
 * Ensure the current finals week's fixtures exist (generated from the ladder /
 * prior round winners). No-op outside finals weeks or when fixtures already
 * exist. Returns a NEW GameState when fixtures are appended.
 */
export function ensureFinalsRound(state: GameState): GameState {
  const week = state.week;
  if (!isFinalsRound(week)) return state;
  if (roundFixtures(state, week).length > 0) return state;

  if (week === QF_ROUND) return appendFixtures(state, makeQuarterFinalFixtures(state));
  if (week === SF_ROUND) return appendFixtures(state, makeSemiFinalFixtures(state));
  if (week === GF_ROUND) return appendFixtures(state, makeGrandFinalFixtures(state));
  return state;
}

/**
 * Cheap-sim every unplayed fixture in `round` (including the player's tie).
 * Used by the headless `runFinals` catch-up path / unit tests — not by the
 * interactive week tick (player ties go through MatchScene via matchday).
 */
function cheapSimRoundAll(state: GameState, round: number, rng: Rng): GameState {
  const byId = new Map(state.league.clubs.map((c) => [c.id, c] as const));
  let next = state;
  for (const fixture of state.league.fixtures) {
    if (fixture.round !== round || fixture.result) continue;
    const home = byId.get(fixture.homeId);
    const away = byId.get(fixture.awayId);
    if (!home || !away) continue;
    next = applyResult(next, fixture, cheapSimScore(home, away, rng));
  }
  return next;
}

/**
 * Record premiership history + reputation from the completed grand final.
 * Ladder position is the player's regular-season finish. Season number is
 * `state.season - 1` because this runs after `resetForNewSeason()`.
 */
export function recordPremiership(state: GameState): GameState {
  const gf = roundFixtures(state, GF_ROUND).find((f) => f.result);
  const premier = gf ? knockoutWinner(gf) : undefined;
  const playerPos = ladderPosition(state, PLAYER_ID);
  const playerPremiership = premier === PLAYER_ID;

  const row = state.league.ladder.find((r) => r.clubId === PLAYER_ID);
  const top = topTryScorer(state.squad, state.season - 1);
  const history = [
    ...state.history,
    {
      season: state.season - 1, ladderPosition: playerPos, premiership: playerPremiership,
      ...(row ? {
        wins: row.wins, losses: row.losses, draws: row.draws,
        pointsFor: row.pointsFor, pointsAgainst: row.pointsAgainst,
      } : {}),
      ...(top ? { topScorer: top } : {}),
    },
  ];
  const reputation = playerPremiership
    ? Math.min(100, state.reputation + PREMIERSHIP_REP_BONUS)
    : state.reputation;

  return { ...state, history, reputation };
}

/**
 * Resolve the finals series and record premiership bookkeeping.
 *
 * Interactive path: weeks 25–27 generate fixtures via `ensureFinalsRound`, player
 * ties via MatchScene, rivals via `simulateRivalRound`. At season rollover this
 * only records history if the GF is already complete.
 *
 * Headless / catch-up: if any finals round is missing or unfinished, generate
 * and cheap-sim the remainder (including player ties) so tests and mid-season
 * saves still produce a correct history entry.
 */
export function runFinals(state: GameState, rng: Rng): GameState {
  const seeds = finalsSeeds(state);
  if (seeds.length < 8) return state;

  let next = state;

  if (roundFixtures(next, QF_ROUND).length === 0) {
    next = appendFixtures(next, makeQuarterFinalFixtures(next));
  }
  next = cheapSimRoundAll(next, QF_ROUND, rng);

  if (roundFixtures(next, SF_ROUND).length === 0) {
    next = appendFixtures(next, makeSemiFinalFixtures(next));
  }
  next = cheapSimRoundAll(next, SF_ROUND, rng);

  if (roundFixtures(next, GF_ROUND).length === 0) {
    next = appendFixtures(next, makeGrandFinalFixtures(next));
  }
  next = cheapSimRoundAll(next, GF_ROUND, rng);

  return recordPremiership(next);
}

// ── League initialisation ─────────────────────────────────────────────────────

/**
 * Populate a league (clubs + fixtures + zeroed ladder) for the player club and
 * commit it to the store. The built LeagueState is also returned. Uses and
 * advances the state RNG seed for determinism (same pattern as data/club.ts).
 */
export function initLeague(
  state: GameState,
  colors: [string, string] = DEFAULT_PLAYER_COLORS,
): LeagueState {
  const playerClub: RivalClub = {
    id: PLAYER_ID,
    name: state.clubName,
    colors: [colors[0], colors[1]],
    strength: 55, // baseline used only if the player is ever cheap-simmed
  };
  // Rivals get real squads (#74), seeded per club so the main RNG is untouched.
  const clubs: RivalClub[] = withRivalSquads([playerClub, ...RIVAL_CLUBS.map((c) => ({ ...c }))], state.rngSeed, PLAYER_ID);
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
 *     when no forecast set it (BAK-198 boundary — the fixtures system owns writing
 *     per-round weather).
 *   - 'weather-forecast' (order ladder+2): roll next week's weather into
 *     state.weather once this round is in (N14), so the next-match card shows it.
 *   - 'fixtures-finals' (order match-2): generate this week's finals fixtures
 *     (QF/SF/GF) when entering weeks 25–27.
 *   - 'fixtures-rivals' (order 40 / TICK_ORDER.match): cheap-sim rival-vs-rival
 *     (and rival-only finals) for the round. The player's own match is run by
 *     matchday via getCurrentFixture + applyResult.
 *   - 'fixtures-ladder' (order 50 / TICK_ORDER.ladder): keep the ladder sorted
 *     (defensive re-sort after all results for the round have landed).
 *   - 'fixtures-finals-next' (order ladder+1): once the round is settled,
 *     generate the NEXT week's finals ties (QF after R24, SF after QF, GF after
 *     SF) so they are visible before the player advances.
 *   - season hook (order 10): record the previous season's finals outcome (or
 *     catch-up cheap-sim if unfinished), then regenerate fixtures + reset the
 *     ladder for the new season.
 */
export function registerFixturesSystem(): void {
  // (a) Weather: the round's conditions were rolled at the end of last week (the
  // forecast, (e) below), so the next-match card can say them; the match plays in
  // them. Only a new game, or a save from before the forecast, rolls on the day.
  registerTickHook('weather', TICK_ORDER.match - 1, () => {
    const s = getState();
    if (s.weather !== undefined) return;
    const rng = makeRng(s.rngSeed);
    const weather = rollWeather(rng.next);
    setState({ weather, rngSeed: rng.state() });
  });

  // (e) The forecast (N14, #263): next week's conditions, rolled once the round is in,
  // from the same seeded stream as before (one roll a week, a week early).
  registerTickHook('weather-forecast', TICK_ORDER.ladder + 2, () => {
    const s = getState();
    const rng = makeRng(s.rngSeed);
    const weather = rollWeather(rng.next);
    setState({ weather, rngSeed: rng.state() });
  });

  // (a2) Generate this week's finals bracket ties before rivals/player match.
  registerTickHook('fixtures-finals', TICK_ORDER.match - 2, (ctx: TickContext) => {
    if (!isFinalsRound(ctx.week)) return;
    const s = getState();
    if (s.league.clubs.length === 0) return;
    const next = ensureFinalsRound(s);
    if (next !== s) setState({ league: next.league });
  });

  // (b) Rival-vs-rival matches for the round (order 40, alongside the player's
  // match). With "Rival matches on the match engine" on (N9.2) an interactive
  // week plays them on the live sim — off the main thread where it can, holding
  // the week until they're in — and fast-forward keeps the cheap sim.
  registerTickHook('fixtures-rivals', TICK_ORDER.match, (ctx: TickContext) => {
    const s = getState();
    if (ctx.week < 1 || ctx.week > WEEKS_PER_SEASON) return;
    if (s.league.clubs.length === 0) return; // league not initialised yet
    const rng = makeRng(s.rngSeed);
    if (s.settings.liveRivals === true && !ctx.fastForward) {
      const jobs = rivalJobs(s, rng, PLAYER_ID);
      setState({ rngSeed: rng.state() });
      const land = (results: Parameters<typeof applyRivalResults>[2]): void => {
        // A result missing from the worker's answer is played here, so no fixture is left unplayed.
        const all = jobs.map((job, i) => results[i] ?? playRivalJob(job));
        const next = applyRivalResults(getState(), jobs, all, applyResult);
        setState({ league: next.league });
      };
      if (ctx.hold && canUseWorker() && jobs.length > 0) {
        ctx.hold();
        // The week always resumes, even if landing the results throws.
        void playRivalJobsInWorker(jobs)
          .then(land)
          .catch((err: unknown) => {
            // Never leave the round unplayed: play it here (fixtures already landed are skipped).
            console.error('rival round failed to land; playing it on the main thread', err);
            try {
              land(jobs.map(playRivalJob));
            } catch (again: unknown) {
              console.error('rival round failed to land again', again);
            }
          })
          .finally(resumeWeek);
        return;
      }
      land(jobs.map(playRivalJob));
      return;
    }
    const next = simulateRivalRound(s, rng);
    setState({ league: next.league, rngSeed: rng.state() });
  });

  // (c) Ladder refresh — defensive re-sort after the round's results land.
  registerTickHook('fixtures-ladder', TICK_ORDER.ladder, () => {
    const s = getState();
    if (s.league.ladder.length === 0) return;
    setState({ league: { ...s.league, ladder: sortLadder(s.league.ladder) } });
  });

  // (d) Pre-generate NEXT week's finals ties once this round's results are in,
  // so the upcoming QF/SF/GF shows on the Fixtures screen before the player
  // advances, and the economy hook (which runs before the match hooks) sees a
  // home final for gate receipts. 'fixtures-finals' above stays as a fallback
  // for saves made before this hook existed.
  registerTickHook('fixtures-finals-next', TICK_ORDER.ladder + 1, (ctx: TickContext) => {
    const nextWeek = ctx.week + 1;
    if (!isFinalsRound(nextWeek)) return;
    const s = getState();
    if (s.league.clubs.length === 0) return;
    const next = ensureFinalsRound({ ...s, week: nextWeek });
    if (next.league !== s.league) setState({ league: next.league });
  });

  // Season rollover: record finals outcome, then regenerate the season.
  registerSeasonHook('fixtures-season', 10, () => {
    const s = getState();

    // If the league is missing (fresh game / defensive), initialise from scratch.
    if (s.league.clubs.length === 0) {
      initLeague(s);
      return;
    }

    // Record premiership from the completed GF (or catch-up cheap-sim leftovers).
    // Prefer recordPremiership alone when the GF is already done so we do not
    // re-roll played ties; runFinals handles the unfinished / test path.
    const rngFinals = makeRng(s.rngSeed);
    const gfDone = roundFixtures(s, GF_ROUND).some((f) => !!f.result);
    const afterFinals = gfDone ? recordPremiership(s) : runFinals(s, rngFinals);
    // Reputation from the season's results (ladder finish, finals, decay). The
    // premiership bonus is already in afterFinals.reputation.
    const playerFinals = [QF_ROUND, SF_ROUND, GF_ROUND].flatMap((r) =>
      roundFixtures(afterFinals, r).filter((f) => f.result && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID)),
    );
    const grandFinal = playerFinals.find((f) => f.round === GF_ROUND);
    const lastEntry = afterFinals.history[afterFinals.history.length - 1];
    const rep = applySeasonReputation(afterFinals.reputation, {
      ladderPosition: lastEntry ? lastEntry.ladderPosition : 0,
      clubCount: s.league.clubs.length,
      finalsWins: playerFinals.filter(
        (f) => f.round !== GF_ROUND && knockoutWinner(f) === PLAYER_ID,
      ).length,
      playedGrandFinal: !!grandFinal,
      premiership: !!lastEntry && lastEntry.premiership,
    });
    setState({
      history: afterFinals.history,
      reputation: rep.reputation,
      rngSeed: gfDone ? s.rngSeed : rngFinals.state(),
    });

    // Board review (#47): prize money, objectives, patience — needs the final
    // ladder, so it runs before the ladder is regenerated below.
    const finalPositions = Object.fromEntries(
      sortLadder(s.league.ladder).map((r, i) => [r.clubId, i + 1] as const),
    );
    applyBoardReview({
      ladderPosition: lastEntry ? lastEntry.ladderPosition : 0,
      positions: finalPositions,
      finalsPlayed: playerFinals.length,
      playedGrandFinal: !!grandFinal,
      premiership: !!lastEntry && lastEntry.premiership,
    });

    // Regenerate a fresh fixture list + zeroed ladder for the new season. Rival
    // squads age, retire, develop and take on juniors (#74); their strength
    // follows from the squad.
    const s2 = getState();
    const clubIds = s2.league.clubs.map((c) => c.id);
    const rng = makeRng(s2.rngSeed);
    const fixtures = generateFixtures(clubIds, rng);
    const clubs = rolloverRivals(withRivalSquads(s2.league.clubs, s2.rngSeed, PLAYER_ID), rng, PLAYER_ID).clubs;
    setState({
      league: { ...s2.league, clubs, fixtures, ladder: emptyLadder(clubIds) },
      rngSeed: rng.state(),
    });

    // Tell the player why things changed (the season-end toast covers the finish).
    const repText = rep.reputation === s.reputation
      ? `Reputation steady at ${rep.reputation}.`
      : `Reputation ${rep.reputation > s.reputation ? 'up' : 'down'} ${Math.abs(rep.reputation - s.reputation)} to ${rep.reputation}.`;
    const movers = strengthChanges(s2.league.clubs, clubs).slice(0, 2)
      .map((c) => `${c.name} ${c.to > c.from ? 'rising' : 'sliding'} (${c.from}→${c.to})`);
    bus.emit('ui:notify', {
      text: `${repText}${movers.length ? ` Rivals: ${movers.join(', ')}.` : ''}`,
      kind: rep.reputation >= s.reputation ? 'success' : 'info',
      quiet: true, // the review's Reputation and Rivals lines (N14)
    });
  });
}

/** Finals round numbers, exported for the orchestrator / UI. */
export const FINALS_ROUNDS = { QF: QF_ROUND, SF: SF_ROUND, GF: GF_ROUND } as const;
export { FINALS_WEEKS };
