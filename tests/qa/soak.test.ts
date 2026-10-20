// tests/qa/soak.test.ts — a small slice of the headless soak (npm run soak runs the full
// 5 seasons × 20 seeds): whole seasons through every system with the invariant checks,
// and old saves of every version migrating and playing on.
import { describe, it, expect } from 'vitest';
import {
  runSoak, checkState, nonFinitePaths, duplicatePlayers, asOldSave, OLD_VERSIONS, gapSample, bestNineMean, summariseSeasons,
  classifyReason, emptyTally, tallyNet, FINANCE_LINES, NEAR_RIVALS, nearestRivals, recordAgainst, advanceWeekAsTapped, registerAllSystems,
  type SeasonSample, type SoakResult,
} from '../../src/qa/soak';
import { STARTING_MONEY } from '../../src/config';
import { SEASON_ROUNDS } from '../../src/config';
import { createNewGame, getState, setState, type Fixture, type GameState } from '../../src/core/state';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { migrateState } from '../../src/core/save';
import { advanceWeek, weekHeld, withFastForward } from '../../src/core/time';
import { applyTuning } from '../../src/match/league/tuning';

describe('soak checks', () => {
  it('spots NaN, Infinity and players in two places', () => {
    expect(nonFinitePaths({ a: 1, b: [2, NaN], c: { d: Infinity } })).toEqual(['state.b[1]', 'state.c.d']);
    createNewGame('Check', 3);
    initLeague(getState());
    const s = getState();
    expect(checkState(s)).toEqual([]);
    const dupe = { ...s, freeAgents: [...s.freeAgents, s.squad[0]!] };
    expect(duplicatePlayers(dupe)).toEqual([s.squad[0]!.id]);
  });

  it('every old save version migrates', () => {
    createNewGame('Old', 9);
    initLeague(getState());
    for (const v of OLD_VERSIONS) {
      const res = migrateState(asOldSave(getState(), v));
      expect(res.ok, `v${v}`).toBe(true);
      if (res.ok) expect(checkState(res.state), `v${v}`).toEqual([]);
    }
  });
});

describe('soak P&L (#161)', () => {
  it('maps every ledger reason the game uses to a line, and the unknown to other', () => {
    expect(classifyReason('wages')).toBe('wages');
    expect(classifyReason('sponsor')).toBe('sponsor');
    expect(classifyReason('grant')).toBe('grant');
    expect(classifyReason('sponsor+grant')).toBe('grant'); // the pre-#172 combined reason
    expect(classifyReason('gate')).toBe('gate');
    expect(classifyReason('upkeep')).toBe('upkeep');
    expect(classifyReason('finals prize money')).toBe('prize');
    expect(classifyReason('board grant')).toBe('boardGrant');
    expect(classifyReason('event: Billboard offer')).toBe('events');
    for (const label of ['Merch royalties', 'Pizza win bonus', 'Food truck rent']) expect(classifyReason(label), label).toBe('events');
    expect(classifyReason('sign:p_1')).toBe('transfers');
    expect(classifyReason('sell:p_1')).toBe('transfers');
    expect(classifyReason('renew:p_1')).toBe('contracts');
    expect(classifyReason('release:p_1')).toBe('contracts');
    for (const verb of ['build', 'upgrade', 'move', 'demolish']) expect(classifyReason(`${verb}:grandstand`), verb).toBe('facilities');
    expect(classifyReason('something new')).toBe('other');
    const t = emptyTally();
    expect(Object.keys(t).sort()).toEqual([...FINANCE_LINES].sort());
    expect(Object.values(t).every((v) => v === 0)).toBe(true);
    expect(tallyNet({ ...t, wages: -5, gate: 8 })).toBe(3);
  });
});

describe('soak', () => {
  it('plays two seasons idle and managed with no problems, reporting the record and the gap (#138)', () => {
    const runs = [];
    for (const mode of ['idle', 'managed'] as const) {
      const r = runSoak({ seed: 101, seasons: 2, mode });
      expect(r.problems, mode).toEqual([]);
      expect(r.seasons.length).toBe(2);
      // The start gap is the new game's: the same squad and league whichever way it is managed.
      expect(r.start.bestNine).toBeGreaterThan(0);
      expect(r.start.rivalRange[0]).toBeLessThanOrEqual(r.start.rivalMean);
      expect(r.start.rivalMean).toBeLessThanOrEqual(r.start.rivalRange[1]);
      for (const s of r.seasons) {
        expect(s.wins + s.draws + s.losses).toBe(SEASON_ROUNDS);
        // N12.1: the finals cut is the top eight, and each near rival is met once or twice in 24 rounds.
        expect(s.madeFinals).toBe(s.ladderPosition <= 8);
        expect(s.nearRivalGames).toBeGreaterThanOrEqual(NEAR_RIVALS);
        expect(s.nearRivalGames).toBeLessThanOrEqual(2 * NEAR_RIVALS);
        expect(s.nearRivalWinRate).toBeGreaterThanOrEqual(0);
        expect(s.nearRivalWinRate).toBeLessThanOrEqual(1);
        expect(s.ladderPosition).toBeGreaterThanOrEqual(1);
        expect(s.ladderPosition).toBeLessThanOrEqual(16);
        expect(s.bestNine).toBeGreaterThan(30);
        expect(s.rivalMean).toBeGreaterThan(30);
        expect(s.rivalRange[0]).toBeLessThanOrEqual(s.rivalRange[1]);
        if (mode === 'idle') expect(s.signings).toBe(0);
        else expect(s.signingFees).toBeGreaterThanOrEqual(0);
        // The season's P&L adds up to the balance, line by line (#161).
        expect(s.finance.wages).toBeLessThan(0);
        expect(s.finance.grant).toBeGreaterThan(0);
        expect(s.finance.sponsor).toBe(0); // the soak manager never builds a Sponsor Board
        expect(s.finance.gate).toBeGreaterThan(0);
        expect(s.finance.other).toBe(0);
        if (mode === 'idle') {
          expect(s.finance.transfers).toBe(0);
          expect(s.finance.facilities).toBe(0);
          expect(s.finance.upkeep).toBe(0);
        } else {
          expect(s.finance.transfers).toBeCloseTo(-s.signingFees, 5); // −0 when nobody was signed
          expect(s.finance.upkeep).toBeLessThanOrEqual(0);
        }
      }
      expect(tallyNet(r.seasons[0]!.finance)).toBeCloseTo(r.seasons[0]!.money - STARTING_MONEY, 0);
      expect(tallyNet(r.seasons[1]!.finance)).toBeCloseTo(r.seasons[1]!.money - r.seasons[0]!.money, 0);
      runs.push(r);
    }
    expect(runs[0]!.start).toEqual(runs[1]!.start);
    // The game's own books (#172) agree with the soak's tally: the soak reports any line that differs as a problem (none above).
    // The managed manager builds and signs; its club should be at least as strong as the idle one.
    expect(runs[1]!.seasons[1]!.bestNine).toBeGreaterThanOrEqual(runs[0]!.seasons[1]!.bestNine);
    const summary = summariseSeasons(runs);
    expect(summary.map((s) => `${s.mode}:${s.season}`)).toEqual(['idle:1', 'idle:2', 'managed:1', 'managed:2']);
    // The managed manager built at least a Paddock over two seasons.
    expect(runs[1]!.seasons[0]!.finance.facilities + runs[1]!.seasons[1]!.finance.facilities).toBeLessThan(0);
    // …and pays upkeep on it from then on (#164).
    expect(runs[1]!.seasons[1]!.finance.upkeep).toBeLessThan(0);
    for (const row of summary) {
      expect(row.runs).toBe(1);
      expect(row.finance.wages).toBeLessThan(0);
      expect(tallyNet(row.finance)).toBeCloseTo(row.money - (row.season === 1 ? STARTING_MONEY : summary.find((x) => x.mode === row.mode && x.season === row.season - 1)!.money), -1);
      expect(row.gap).toBeCloseTo(row.bestNine - row.rivalMean, 0);
      expect(row.finals).toBe(row.ladderPosition <= 8 ? 1 : 0);
      const run = runs.find((r) => r.mode === row.mode)!;
      const sample = run.seasons[row.season - 1]!;
      expect(row.nearRivalGames).toBe(sample.nearRivalGames);
      expect(row.nearRivalWinRate).toBeCloseTo(sample.nearRivalWinRate, 2);
      expect(row.finalsAppearances).toBe(run.seasons.slice(0, row.season).filter((x) => x.madeFinals).length);
    }
  }, 180_000);

  it('gapSample reads the player\'s best nine against the rivals', () => {
    createNewGame('Gap', 5);
    initLeague(getState());
    const s = getState();
    const g = gapSample(s);
    expect(g.bestNine).toBe(bestNineMean(s.squad));
    const strengths = s.league.clubs.filter((c) => c.id !== 'player').map((c) => c.strength);
    expect(g.rivalMean).toBeCloseTo(strengths.reduce((t, x) => t + x, 0) / strengths.length, 1);
    expect(g.rivalRange).toEqual([Math.min(...strengths), Math.max(...strengths)]);
    expect(bestNineMean([])).toBe(0);
  });

  it('plays on from a v1 save and a v7 save', () => {
    for (const v of [1, 7]) {
      const r = runSoak({ seed: 202, seasons: 1, mode: 'managed', fromVersion: v });
      expect(r.problems, `v${v}`).toEqual([]);
    }
  }, 180_000);
});

describe('soak columns (N12.1)', () => {
  /** A season sample with everything zero but what the test sets. */
  const sample = (over: Partial<SeasonSample>): SeasonSample => ({
    season: 1, money: 0, minMoney: 0, squad: 20, freeAgents: 10, saveBytes: 1, rivalStrength: [40, 70], reputation: 30, sacked: false,
    wins: 12, draws: 0, losses: 12, marginPerGame: 0, ladderPosition: 9, premiership: false, madeFinals: false,
    nearRivalWinRate: 0, nearRivalGames: 0, bestNine: 55, rivalMean: 55, rivalRange: [40, 70],
    signings: 0, signingFees: 0, signedOverall: 0, finance: emptyTally(), ...over,
  });
  const run = (seed: number, seasons: SeasonSample[]): SoakResult => ({
    seed, mode: 'managed', start: { bestNine: 55, rivalMean: 55, rivalRange: [40, 70] }, seasons, problems: [], ms: 0,
  });

  it('picks the three rivals nearest the best nine, ties to the lower club id', () => {
    createNewGame('Near', 7);
    initLeague(getState());
    const s0 = getState();
    const nine = bestNineMean(s0.squad);
    const ids = s0.league.clubs.filter((c) => c.id !== s0.clubId).map((c) => c.id).sort();
    const [a, b, tieLow, tieHigh] = [ids[3]!, ids[7]!, ids[1]!, ids[5]!];
    const strength: Record<string, number> = { [a]: nine + 1, [b]: nine - 2, [tieLow]: nine + 4, [tieHigh]: nine + 4 };
    const s: GameState = { ...s0, league: { ...s0.league, clubs: s0.league.clubs.map((c) => ({ ...c, strength: strength[c.id] ?? nine + 12 })) } };
    expect(nearestRivals(s)).toEqual([a, b, tieLow]);
    expect(nearestRivals(s, 2)).toEqual([a, b]);
  });

  it('counts regular-season games against them only: a draw is a game not won, unplayed and finals games are out', () => {
    createNewGame('Record', 7);
    initLeague(getState());
    const s0 = getState();
    const [x, y, z, other] = s0.league.clubs.filter((c) => c.id !== PLAYER_ID).map((c) => c.id);
    const fixtures: Fixture[] = [
      { round: 1, homeId: PLAYER_ID, awayId: x!, result: { homeScore: 20, awayScore: 10 } }, // won at home
      { round: 2, homeId: y!, awayId: PLAYER_ID, result: { homeScore: 18, awayScore: 18 } }, // drawn
      { round: 3, homeId: z!, awayId: PLAYER_ID, result: { homeScore: 10, awayScore: 24 } }, // won away
      { round: 4, homeId: x!, awayId: PLAYER_ID, result: { homeScore: 30, awayScore: 6 } }, // lost
      { round: 5, homeId: PLAYER_ID, awayId: y! }, // not played yet
      { round: 6, homeId: PLAYER_ID, awayId: other!, result: { homeScore: 40, awayScore: 0 } }, // not a near rival
      { round: 7, homeId: x!, awayId: y!, result: { homeScore: 12, awayScore: 0 } }, // not the player's
      { round: SEASON_ROUNDS + 1, homeId: PLAYER_ID, awayId: z!, result: { homeScore: 30, awayScore: 0 } }, // a final
    ];
    const s: GameState = { ...s0, league: { ...s0.league, fixtures } };
    expect(recordAgainst(s, [x!, y!, z!])).toEqual({ wins: 2, games: 4 });
    expect(recordAgainst(s, [])).toEqual({ wins: 0, games: 0 });
  });

  it('summarises finals appearances so far and pools the near-rival games over the runs', () => {
    const runs = [
      run(1, [
        sample({ season: 1, madeFinals: true, ladderPosition: 4, nearRivalWinRate: 0.5, nearRivalGames: 4 }),
        sample({ season: 2, madeFinals: false, ladderPosition: 10, nearRivalWinRate: 0.333, nearRivalGames: 3 }),
      ]),
      run(2, [
        sample({ season: 1, madeFinals: true, ladderPosition: 2, nearRivalWinRate: 0.6, nearRivalGames: 5 }),
        sample({ season: 2, madeFinals: true, ladderPosition: 1, premiership: true, nearRivalWinRate: 0, nearRivalGames: 6 }),
      ]),
      run(3, [sample({ season: 1, madeFinals: false, ladderPosition: 12, sacked: true, nearRivalWinRate: 0.25, nearRivalGames: 4 })]),
    ];
    const [s1, s2] = summariseSeasons(runs);
    expect(s1).toMatchObject({ season: 1, runs: 3, finals: 0.67, finalsAppearances: 0.7, sacked: 0.33, nearRivalGames: 13, nearRivalWinRate: 0.46 });
    // Season 2 is the two runs that reached it: one finals appearance, then two.
    expect(s2).toMatchObject({ season: 2, runs: 2, finals: 0.5, finalsAppearances: 1.5, premierships: 0.5, nearRivalGames: 9, nearRivalWinRate: 0.11 });
  });

  it('--live-rivals: a tapped week plays the rival round on the live sim and the player\'s match headless', () => {
    // The live sim records every rival's match stats (applyRivalResults); the cheap sim records none.
    const rivalsWithGames = (s: GameState): string[] => {
      const round1 = s.league.fixtures.filter((f) => f.round === 1 && f.homeId !== PLAYER_ID && f.awayId !== PLAYER_ID);
      return round1.flatMap((f) => [f.homeId, f.awayId]).filter((id) => (s.league.clubs.find((c) => c.id === id)?.squad ?? []).some((p) => (p.career?.games ?? 0) > 0));
    };
    createNewGame('Live', 11);
    initLeague(getState());
    setState({ settings: { ...getState().settings, liveRivals: true } });
    registerAllSystems();
    advanceWeekAsTapped();
    const live = getState();
    expect(weekHeld()).toBe(false);
    expect(live.week).toBe(2);
    expect(live.league.fixtures.filter((f) => f.round === 1).every((f) => f.result)).toBe(true);
    expect(live.league.ladder.find((r) => r.clubId === PLAYER_ID)!.played).toBe(1);
    expect(rivalsWithGames(live)).toHaveLength(14);

    // The same week fast-forwarded keeps the cheap sim, as the game does for ×4 and "to finals".
    createNewGame('Live', 11);
    initLeague(getState());
    setState({ settings: { ...getState().settings, liveRivals: true } });
    registerAllSystems();
    withFastForward(advanceWeek);
    const cheap = getState();
    expect(cheap.week).toBe(2);
    expect(cheap.league.fixtures.filter((f) => f.round === 1).every((f) => f.result)).toBe(true);
    expect(rivalsWithGames(cheap)).toEqual([]);
  }, 60_000);

  it('a tapped week plays the player\'s match as fast-forward plays it, the rival\'s AI coach included', () => {
    // Without the live-rivals setting both weeks play the rival round on the cheap sim: the same week.
    const playerResult = (tapped: boolean): Fixture['result'] => {
      createNewGame('Tapped', 5);
      initLeague(getState());
      registerAllSystems();
      if (tapped) advanceWeekAsTapped(); else withFastForward(advanceWeek);
      expect(weekHeld()).toBe(false);
      return getState().league.fixtures.find((f) => f.round === 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID))!.result;
    };
    expect(playerResult(true)).toEqual(playerResult(false));
    const restore = applyTuning({ 'calls.ai.on': 1 });
    try {
      expect(playerResult(true)).toEqual(playerResult(false));
    } finally {
      restore();
    }
  }, 60_000);
});
