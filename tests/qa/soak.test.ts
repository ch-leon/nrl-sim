// tests/qa/soak.test.ts — a small slice of the headless soak (npm run soak runs the full
// 5 seasons × 20 seeds): whole seasons through every system with the invariant checks,
// and old saves of every version migrating and playing on.
import { describe, it, expect } from 'vitest';
import {
  runSoak, checkState, nonFinitePaths, duplicatePlayers, asOldSave, OLD_VERSIONS, gapSample, bestNineMean, summariseSeasons,
  classifyReason, emptyTally, tallyNet, FINANCE_LINES, NEAR_RIVALS, nearestRivals, recordAgainst, advanceWeekAsTapped, registerAllSystems,
  styleTable, styleMixOf, levelWinRates, fieldedTable, offTheLevelMean, type SeasonSample, type SoakResult, type StyleGame,
} from '../../src/qa/soak';
import { STARTING_MONEY } from '../../src/config';
import { SEASON_ROUNDS, SQUAD_CAP } from '../../src/config';
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
    // Each version's old save lacks what its migration adds, so the step really runs: v18's board
    // loan, v19's staff, and v20's playback speed (left absent, so an old save plays at ×4).
    const owing = { ...getState(), boardLoan: { owed: 12_000 } };
    expect(asOldSave(owing, 17)).not.toHaveProperty('boardLoan');
    expect(asOldSave(owing, 18)).toHaveProperty('boardLoan', { owed: 12_000 });
    const back = migrateState(asOldSave(owing, 17));
    expect(back.ok && back.state.boardLoan).toEqual({ owed: 0 });
    const welfare = { role: 'welfare' as const, name: 'Pat Doyle', wage: 1_500, hiredSeason: 1 };
    const staffed = { ...getState(), staff: [welfare] };
    expect(asOldSave(staffed, 18)).not.toHaveProperty('staff');
    expect(asOldSave(staffed, 19)).toHaveProperty('staff', [welfare]);
    const unstaffed = migrateState(asOldSave(staffed, 18));
    expect(unstaffed.ok && unstaffed.state.staff).toEqual([]);
    const sped = { ...getState(), settings: { ...getState().settings, playbackSpeed: 8 as const } };
    const oldSpeed = asOldSave(sped, 19).settings as { playbackSpeed?: number };
    expect(oldSpeed.playbackSpeed).toBeUndefined();
    const kept = migrateState(asOldSave(sped, 19));
    expect(kept.ok && kept.state.settings.playbackSpeed).toBeUndefined();
    // v20 has no bans and no event-chain flags; v21 fills both (#324).
    const v20 = asOldSave(getState(), 20);
    const deck = v20.eventDeck as { flags?: string[] };
    expect(deck.flags).toBeUndefined();
    expect((v20.squad as { suspendedWeeks?: number }[])[0]).not.toHaveProperty('suspendedWeeks');
    const v21 = migrateState(v20);
    expect(v21.ok).toBe(true);
    if (v21.ok) {
      expect(v21.state.version).toBe(21);
      expect(v21.state.eventDeck.flags).toEqual([]);
      expect(v21.state.squad.every((p) => p.suspendedWeeks === 0)).toBe(true);
      expect(v21.state.freeAgents.every((p) => p.suspendedWeeks === 0)).toBe(true);
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
        // A squad with room for the Academy's call-up (#285) never forfeits (finding 20).
        expect(s.forfeits, `${mode} S${s.season}`).toBe(0);
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
    nearRivalWinRate: 0, nearRivalGames: 0, forfeits: 0, bestNine: 55, rivalMean: 55, rivalRange: [40, 70],
    signings: 0, signingFees: 0, signedOverall: 0, finance: emptyTally(),
    styleMix: { attacks: 0, defences: 0, switches: 0, games: 0 }, ...over,
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

  it('counts the rounds forfeited short of 13 fit, per season and in the summary (finding 20)', () => {
    // A club short of 13 fit forfeits. Since #285 the Academy calls up juniors first, but never
    // past SQUAD_CAP: a full squad with all but 12 hurt (and money enough that nobody is sold)
    // forfeits until they heal. The soak said "No problems" over whole seasons of 0-0-24.
    const shortAtTheCap = (hurtWeeks: number): SoakResult => {
      createNewGame('Short', 12);
      initLeague(getState());
      const s0 = getState();
      const squad = Array.from({ length: SQUAD_CAP }, (_, i) => {
        const p = s0.squad[i % s0.squad.length]!;
        const copy = i < s0.squad.length ? p : { ...p, id: `${p.id}-${i}`, name: `${p.name} ${i}` };
        return { ...copy, injuredWeeks: i < 12 ? 0 : hurtWeeks };
      });
      return runSoak({ seed: 12, seasons: 1, mode: 'idle', fromSave: { ...s0, squad, money: 10_000_000 } });
    };
    // Hurt all season: every round forfeited, nothing played.
    const all = shortAtTheCap(99);
    expect(all.problems).toEqual([]);
    const season = all.seasons[0]!;
    expect(season.forfeits).toBe(SEASON_ROUNDS);
    expect([season.wins, season.draws, season.losses]).toEqual([0, 0, SEASON_ROUNDS]);
    expect(summariseSeasons([all])[0]!.forfeits).toBe(SEASON_ROUNDS);
    // Hurt for the first weeks: those rounds forfeited, the rest played (and counted as played).
    const some = shortAtTheCap(6).seasons[0]!;
    expect(some.forfeits).toBeGreaterThan(0);
    expect(some.forfeits).toBeLessThan(SEASON_ROUNDS - 10);
    expect(some.losses).toBeGreaterThanOrEqual(some.forfeits);
    expect(some.wins + some.draws).toBeGreaterThan(0);
    // The summary averages the runs, season by season.
    expect(summariseSeasons([run(1, [sample({ forfeits: 3 }), sample({ season: 2 })]), run(2, [sample({ forfeits: 4 })])]).map((s) => s.forfeits)).toEqual([3.5, 0]);
  }, 120_000);

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
    const playerResult = (tapped: boolean, difficulty?: 'easy' | 'hard'): Fixture['result'] => {
      createNewGame('Tapped', 5, difficulty ? { difficulty } : undefined);
      initLeague(getState());
      registerAllSystems();
      if (tapped) advanceWeekAsTapped(); else withFastForward(advanceWeek);
      expect(weekHeld()).toBe(false);
      return getState().league.fixtures.find((f) => f.round === 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID))!.result;
    };
    expect(playerResult(true)).toEqual(playerResult(false));
    // Off Normal the rival carries the difficulty's edge (N12.2) both ways too.
    expect(playerResult(true, 'hard')).toEqual(playerResult(false, 'hard'));
    expect(playerResult(true, 'easy')).toEqual(playerResult(false, 'easy'));
    const restore = applyTuning({ 'calls.ai.on': 1 });
    try {
      expect(playerResult(true)).toEqual(playerResult(false));
    } finally {
      restore();
    }
  }, 60_000);
});

describe('rival styles over a season (#249, N11)', () => {
  const g = (home: string, away: string, homeStrength: number, awayStrength: number, homeScore: number, switches = 0): StyleGame => ({
    home: { attack: home as StyleGame['home']['attack'], defence: 'slide' },
    away: { attack: away as StyleGame['away']['attack'], defence: 'slide' },
    homeStrength, awayStrength, homeScore, switches,
  });

  it('scores each style against what its strength gaps alone predict', () => {
    // All-out is only played by the strong side; it wins what strength wins, no more.
    // Expansive wins its even games, which an even gap predicts at a half.
    const games: StyleGame[] = [
      ...Array.from({ length: 30 }, (_, i) => g('all-out', 'balanced', 70, 60, i % 3 === 0 ? 0 : 1)),
      ...Array.from({ length: 30 }, (_, i) => g('grind', 'balanced', 70, 60, i % 3 === 0 ? 0 : 1)),
      ...Array.from({ length: 20 }, () => g('expansive', 'balanced', 60, 60, 1)),
      ...Array.from({ length: 20 }, () => g('balanced', 'grind', 60, 60, 0)),
    ];
    const rows = new Map(styleTable(games, 'attack').map((r) => [r.style, r]));
    const allOut = rows.get('all-out')!;
    expect(allOut.games).toBe(30);
    expect(allOut.score).toBeCloseTo(2 / 3);
    expect(allOut.expected).toBeCloseTo(2 / 3);
    const expansive = rows.get('expansive')!;
    expect(expansive.score).toBe(1);
    expect(expansive.expected).toBeCloseTo(0.5);
    expect(expansive.score - expansive.expected).toBeGreaterThan(2 * expansive.se);
    // Every game counts once for each side.
    expect([...rows.values()].reduce((t, r) => t + r.games, 0)).toBe(games.length * 2);
    // Defence: every side played Slide, so it scores what it is expected to.
    const [slide] = styleTable(games, 'defence');
    expect(slide!.score).toBeCloseTo(slide!.expected);
  });

  it('a --live-rivals soak records every rival-v-rival game with the styles it was played with', () => {
    const r = runSoak({ seed: 11, seasons: 1, weeks: 1, mode: 'idle', liveRivals: true });
    expect(r.problems).toEqual([]);
    expect(r.styleGames).toHaveLength(7);
    for (const game of r.styleGames!) {
      expect(game.home.attack).toBeTruthy();
      expect(game.away.defence).toBeTruthy();
      expect([0, 0.5, 1]).toContain(game.homeScore);
      expect(game.switches).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(game.switches)).toBe(true);
      // The fielded nine is never better than the best nine of the whole squad (#322).
      expect(game.homeFielded!).toBeLessThanOrEqual(game.homeStrength + 0.5);
      expect(game.awayFielded!).toBeLessThanOrEqual(game.awayStrength + 0.5);
    }
    expect(runSoak({ seed: 11, seasons: 1, weeks: 1, mode: 'idle' }).styleGames).toBeUndefined();
  }, 60_000);

  it('a level rating is wins ÷ games, and a style more than 4 points from even is logged', () => {
    const games: StyleGame[] = [
      ...Array.from({ length: 10 }, () => g('expansive', 'balanced', 60, 60, 1, 2)),
      ...Array.from({ length: 10 }, () => g('grind', 'balanced', 60, 61, 0.5, 1)),
      // A big gap is not a level rating, so All-out's perfect record does not count.
      ...Array.from({ length: 10 }, () => g('all-out', 'balanced', 70, 55, 1)),
    ];
    const rows = new Map(levelWinRates(games, 'attack').map((row) => [row.style, row]));
    expect(rows.get('all-out')).toBeUndefined();
    expect(rows.get('expansive')!.games).toBe(10);
    expect(rows.get('expansive')!.score).toBe(1);
    expect(rows.get('grind')!.score).toBe(0.5);
    // Balanced played both level sets: 0 against Expansive, 0.5 against Grind.
    expect(rows.get('balanced')!.games).toBe(20);
    expect(rows.get('balanced')!.score).toBeCloseTo(0.25);
    const logged = offTheLevelMean([...rows.values()]).map((row) => row.style).sort();
    expect(logged).toEqual(['balanced', 'expansive']);
    expect(styleMixOf(games)).toEqual({ attacks: 4, defences: 1, switches: 30, games: 30 });
  });

  it('the fielded nine (#322): what a style leaves out of its strength, and wins ÷ games between level fielded nines', () => {
    const fielded = (x: StyleGame, homeFielded: number, awayFielded: number): StyleGame => ({ ...x, homeFielded, awayFielded });
    const games: StyleGame[] = [
      // Rated level, but Expansive fields 4 points short: not level on the field, so it is left out of Level.
      ...Array.from({ length: 10 }, () => fielded(g('expansive', 'balanced', 60, 60, 0), 56, 60)),
      // Level on the field.
      ...Array.from({ length: 10 }, () => fielded(g('expansive', 'balanced', 60, 60, 1), 59, 60)),
      g('grind', 'balanced', 60, 60, 1), // recorded before #322: skipped
    ];
    const rows = new Map(fieldedTable(games, 'attack').map((row) => [row.style, row]));
    expect(rows.get('expansive')).toEqual({ style: 'expansive', sides: 20, shortfall: 2.5, level: 10, levelScore: 1 });
    expect(rows.get('balanced')!.shortfall).toBe(0);
    expect(rows.get('balanced')!.levelScore).toBe(0);
    expect(rows.get('grind')).toBeUndefined();
  });
});

