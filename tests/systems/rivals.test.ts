// tests/systems/rivals.test.ts — rival squads and rival free agency (GitHub #74).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRivalSquad, squadStrength, withRivalSquads, pickSigning, rivalSigningTick, healRivals,
  injureRivalPlayers, rolloverRivals, rivalPlayer, weakestPosition, developmentRate, registerRivalsSystem,
  developRivalsWeek, developRivalPlayerWeek, rivalMeanStrength, anchorPerSeason, RIVAL_LEAGUE_MEAN, RIVAL_DEVELOPMENT,
  RIVAL_SQUAD_SIZE, RIVAL_SQUAD_MIN, RIVAL_SQUAD_MAX, RIVAL_NOTABLE_OVERALL,
} from '../../src/systems/rivals';
import { STRENGTH_MIN, STRENGTH_MAX } from '../../src/systems/league';
import { RIVAL_CLUBS } from '../../src/data/league';
import { POSITIONS, overallRating, generatePlayer } from '../../src/data/player';
import { createNewGame, getState, type Player, type RivalClub } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { makeRng } from '../../src/utils/rng';
import { initLeague, registerFixturesSystem, knockoutWinner, PLAYER_ID, FINALS_ROUNDS } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { registerFreeAgencySystem } from '../../src/systems/freeagency';
import { registerAgingSystem } from '../../src/systems/aging';
import { advanceWeek, clearSeasonHooks, clearTickHooks, registerTickHook, withFastForward } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

const club = (strength: number, id = 'rival-test'): RivalClub => ({ id, name: 'Test Rivals', colors: ['#000000', '#ffffff'], strength });
const agent = (rng = makeRng(1), over: Partial<Player> = {}): Player => ({ ...generatePlayer(rng), ...over });

describe('generateRivalSquad', () => {
  it('matches the club strength across the band, covering every position', () => {
    for (const strength of [35, 45, 55, 65, 75, 85]) {
      const squad = generateRivalSquad(club(strength), 1234 + strength);
      expect(squad).toHaveLength(RIVAL_SQUAD_SIZE);
      expect(Math.abs(squadStrength(squad) - strength)).toBeLessThanOrEqual(2);
      for (const pos of POSITIONS) expect(squad.filter((p) => p.position === pos).length).toBeGreaterThanOrEqual(2);
      expect(squad.every((p) => p.id.startsWith('rival-test:') && p.morale === 50)).toBe(true);
    }
  });

  it('is deterministic per seed, and ids are unique', () => {
    expect(generateRivalSquad(club(60), 9)).toEqual(generateRivalSquad(club(60), 9));
    expect(generateRivalSquad(club(60), 9)).not.toEqual(generateRivalSquad(club(60), 10));
    const all = withRivalSquads(RIVAL_CLUBS.map((c) => ({ ...c })), 77).flatMap((c) => c.squad!);
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
  });

  it('withRivalSquads skips the player club, keeps existing squads and derives strength', () => {
    const player: RivalClub = { id: 'player', name: 'Me', colors: ['#000000', '#ffffff'], strength: 55 };
    const out = withRivalSquads([player, ...RIVAL_CLUBS.map((c) => ({ ...c }))], 5);
    expect(out[0]).toBe(player);
    out.slice(1).forEach((c, i) => {
      expect(c.squad).toHaveLength(RIVAL_SQUAD_SIZE);
      expect(c.strength).toBe(squadStrength(c.squad!));
      expect(Math.abs(c.strength - RIVAL_CLUBS[i]!.strength)).toBeLessThanOrEqual(2);
    });
    expect(withRivalSquads(out, 999)).toEqual(out);
  });
});

describe('signings', () => {
  it('picks the best free agent at the weakest position who beats the current best there', () => {
    const rng = makeRng(3);
    const squad = POSITIONS.map((pos) => rivalPlayer(rng, 'c', pos, pos === 'hooker' ? 40 : 60));
    expect(weakestPosition(squad)).toBe('hooker');
    const okHooker = rivalPlayer(rng, 'fa', 'hooker', 55);
    const bestHooker = rivalPlayer(rng, 'fa', 'hooker', 62);
    const prop = rivalPlayer(rng, 'fa', 'prop', 80);
    expect(pickSigning(squad, [okHooker, prop, bestHooker])?.id).toBe(bestHooker.id);
    // No hooker beats theirs → the best player who would walk into the side.
    expect(pickSigning(squad, [prop])?.id).toBe(prop.id);
    // Nobody good enough, or only academy prospects → nobody.
    expect(pickSigning(squad, [rivalPlayer(rng, 'fa', 'prop', 30)])).toBeNull();
    expect(pickSigning(squad, [{ ...bestHooker, junior: true }])).toBeNull();
  });

  it('a signing leaves the pool, joins the squad, and notable ones make the news', () => {
    const rng = makeRng(4);
    const c: RivalClub = { ...club(50), squad: generateRivalSquad(club(50), 4) };
    const star = rivalPlayer(rng, 'fa', weakestPosition(c.squad!), 80);
    // Find a seed whose first roll is a hit.
    let r = rivalSigningTick([c], [star], makeRng(0));
    for (let seed = 1; r.signed.length === 0; seed++) r = rivalSigningTick([c], [star], makeRng(seed));
    expect(r.freeAgents).toEqual([]);
    expect(r.clubs[0]!.squad!.some((p) => p.id === star.id)).toBe(true);
    expect(r.clubs[0]!.strength).toBe(squadStrength(r.clubs[0]!.squad!));
    expect(overallRating(star)).toBeGreaterThanOrEqual(RIVAL_NOTABLE_OVERALL);
    expect(r.news[0]).toContain(star.name);
  });

  it('a full squad releases its weakest player into the pool first', () => {
    const rng = makeRng(5);
    const squad = Array.from({ length: RIVAL_SQUAD_MAX }, (_, i) => rivalPlayer(rng, 'c', POSITIONS[i % 9]!, 50 + (i === 7 ? -20 : 0)));
    const worst = squad[7]!;
    const c: RivalClub = { ...club(50), squad };
    const star = rivalPlayer(rng, 'fa', 'fullback', 85);
    let r = rivalSigningTick([c], [star], makeRng(0));
    for (let seed = 1; r.signed.length === 0; seed++) r = rivalSigningTick([c], [star], makeRng(seed));
    expect(r.clubs[0]!.squad).toHaveLength(RIVAL_SQUAD_MAX);
    expect(r.freeAgents.map((p) => p.id)).toEqual([worst.id]);
  });

  it('never touches the player club', () => {
    const me: RivalClub = { id: 'player', name: 'Me', colors: ['#000000', '#ffffff'], strength: 55 };
    for (let seed = 0; seed < 50; seed++) {
      expect(rivalSigningTick([me], [agent()], makeRng(seed)).clubs[0]).toBe(me);
    }
  });
});

describe('injuries', () => {
  it('injuries land on the right rival player and heal a week at a time', () => {
    const c: RivalClub = { ...club(60), squad: generateRivalSquad(club(60), 6) };
    const who = c.squad![3]!;
    const hurt = injureRivalPlayers([c], [{ teamId: c.id, playerId: who.id, weeks: 2 }]);
    expect(hurt[0]!.squad!.find((p) => p.id === who.id)!.injuredWeeks).toBe(2);
    const once = healRivals(hurt);
    expect(once[0]!.squad!.find((p) => p.id === who.id)!.injuredWeeks).toBe(1);
    const twice = healRivals(once);
    expect(healRivals(twice)).toBe(twice); // nothing left to heal
  });
});

describe('rolloverRivals', () => {
  it('ages everyone, retires the old, develops by age and tops up with juniors', () => {
    const rng = makeRng(8);
    const squad = generateRivalSquad(club(60), 8).map((p, i) => ({ ...p, age: i < 4 ? 38 : p.age }));
    const r = rolloverRivals([{ ...club(60), squad }], rng);
    const out = r.clubs[0]!.squad!;
    expect(r.retired).toBeGreaterThanOrEqual(4);
    expect(out.length).toBeGreaterThanOrEqual(RIVAL_SQUAD_MIN);
    expect(r.juniors).toBe(out.length - (squad.length - r.retired));
    const kept = out.filter((p) => squad.some((q) => q.id === p.id));
    for (const p of kept) expect(p.age).toBe(squad.find((q) => q.id === p.id)!.age + 1);
    expect(r.clubs[0]!.strength).toBe(squadStrength(out));
  });

  it('no longer develops anyone at the rollover: development is weekly (#143)', () => {
    const rng = makeRng(9);
    const squad = generateRivalSquad(club(60), 9).map((p) => ({ ...p, age: 25 }));
    const r = rolloverRivals([{ ...club(60), squad }], rng);
    for (const p of r.clubs[0]!.squad!) {
      const was = squad.find((q) => q.id === p.id);
      if (was) expect(p.stats).toEqual(was.stats);
    }
  });
});

describe('weekly development and the league anchor (#143)', () => {
  const season = (p: Player, seed: number): Player => {
    const rng = makeRng(seed);
    let out = p;
    for (let w = 0; w < WEEKS_PER_SEASON; w++) out = developRivalPlayerWeek(out, rng);
    return out;
  };

  it('young players gain about the BY_AGE rate over a season and veterans fade, stats staying whole', () => {
    const rng = makeRng(10);
    const gain = (age: number): number => {
      let total = 0;
      for (let i = 0; i < 40; i++) {
        const p = rivalPlayer(rng, 'c', 'lock', RIVAL_LEAGUE_MEAN, age); // at the mean, so no pull
        const after = season(p, 100 + i);
        for (const k of Object.keys(after.stats) as (keyof Player['stats'])[]) expect(Number.isInteger(after.stats[k])).toBe(true);
        total += overallRating(after) - overallRating(p);
      }
      return total / 40;
    };
    expect(developmentRate(19)).toBe(4);
    expect(developmentRate(34)).toBe(-4);
    expect(gain(19)).toBeGreaterThan(2.5);
    expect(gain(19)).toBeLessThan(5.5);
    expect(gain(27)).toBeGreaterThan(-1);
    expect(gain(27)).toBeLessThan(1);
    expect(gain(34)).toBeLessThan(-2.5);
  });

  it('the pull brings a star down and a battler up over a season', () => {
    const rng = makeRng(11);
    const star = rivalPlayer(rng, 'c', 'prop', 80, 27);
    const battler = rivalPlayer(rng, 'c', 'prop', 35, 27);
    expect(overallRating(season(star, 1))).toBeLessThan(overallRating(star));
    expect(overallRating(season(battler, 1))).toBeGreaterThan(overallRating(battler));
  });

  it('the anchor pulls a drifted league back toward the mean and leaves a centred one alone', () => {
    expect(anchorPerSeason(RIVAL_LEAGUE_MEAN)).toBe(0);
    expect(anchorPerSeason(RIVAL_LEAGUE_MEAN + RIVAL_DEVELOPMENT.ANCHOR_DEADBAND)).toBe(0);
    expect(anchorPerSeason(RIVAL_LEAGUE_MEAN + 3)).toBeLessThan(0);
    expect(anchorPerSeason(RIVAL_LEAGUE_MEAN - 3)).toBeGreaterThan(0);
    const league = (centre: number): RivalClub[] => RIVAL_CLUBS.map((c, i) => {
      const strength = centre + (i - 7) * 2;
      return { ...c, strength, squad: generateRivalSquad({ id: c.id, strength }, 500 + i).map((p) => ({ ...p, age: 27 })) };
    });
    const run = (centre: number): number => {
      let clubs = league(centre);
      const rng = makeRng(12);
      for (let w = 0; w < WEEKS_PER_SEASON; w++) clubs = developRivalsWeek(clubs, rng);
      return rivalMeanStrength(clubs);
    };
    const high = run(RIVAL_LEAGUE_MEAN + 6);
    const low = run(RIVAL_LEAGUE_MEAN - 6);
    expect(high).toBeLessThan(RIVAL_LEAGUE_MEAN + 3);
    expect(high).toBeGreaterThan(RIVAL_LEAGUE_MEAN - 1);
    expect(low).toBeGreaterThan(RIVAL_LEAGUE_MEAN - 3);
    expect(low).toBeLessThan(RIVAL_LEAGUE_MEAN + 1);
    expect(Math.abs(run(RIVAL_LEAGUE_MEAN) - RIVAL_LEAGUE_MEAN)).toBeLessThan(1.5);
  });

  it('is deterministic for a seed and never touches the player club', () => {
    const me: RivalClub = { id: 'player', name: 'Me', colors: ['#000000', '#ffffff'], strength: 55 };
    const clubs = withRivalSquads([me, ...RIVAL_CLUBS.map((c) => ({ ...c }))], 3);
    const a = developRivalsWeek(clubs, makeRng(7));
    const b = developRivalsWeek(clubs, makeRng(7));
    expect(a).toEqual(b);
    expect(a[0]).toBe(me);
  });

  it('handles 15 rival squads in well under 100ms', () => {
    const clubs = withRivalSquads(RIVAL_CLUBS.map((c) => ({ ...c })), 10);
    const t0 = performance.now();
    rolloverRivals(clubs, makeRng(10));
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe('five-season headless league', () => {
  it('keeps rival strength in the band, crowns different champions, and signs 1–3 a season', () => {
    createNewGame('Five FC', 2026);
    initLeague(getState());
    registerFixturesSystem();
    registerPlayerMatchSystem();
    registerFreeAgencySystem();
    registerAgingSystem();
    registerRivalsSystem();
    const champions: string[] = [];
    registerTickHook('test-champion', 99, (ctx) => {
      if (ctx.week !== FINALS_ROUNDS.GF) return;
      const gf = getState().league.fixtures.find((f) => f.round === FINALS_ROUNDS.GF && f.result);
      if (gf) champions.push(knockoutWinner(gf)!);
    });
    const rivalIds = () => new Set(getState().league.clubs.flatMap((c) => (c.squad ?? []).map((p) => p.id)));
    let signings = 0;
    let rolloverMs = 0;
    withFastForward(() => {
      for (let i = 0; i < 5 * WEEKS_PER_SEASON; i++) {
        const before = rivalIds();
        const rollover = getState().week === WEEKS_PER_SEASON;
        // A final the club itself plays is a live match (a few hundred ms). The
        // budget below is the other final weeks: the rival grand final, the
        // rollover and the season hooks. N13's preset retune puts this seed in
        // the season-1 grand final, which it used to miss.
        const playing = getState().league.fixtures.some((f) => f.round === getState().week && !f.result && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID));
        const t0 = performance.now();
        advanceWeek();
        if (rollover && !playing) rolloverMs = Math.max(rolloverMs, performance.now() - t0);
        const s = getState();
        expect(s.freeAgents.length).toBeGreaterThan(0);
        for (const c of s.league.clubs) {
          if (c.id === PLAYER_ID) continue;
          expect(c.strength).toBeGreaterThanOrEqual(STRENGTH_MIN);
          expect(c.strength).toBeLessThanOrEqual(STRENGTH_MAX);
          expect(c.squad!.length).toBeGreaterThanOrEqual(RIVAL_SQUAD_MIN);
        }
        if (!rollover) for (const id of rivalIds()) if (!before.has(id)) signings++;
      }
    });
    expect(getState().season).toBe(6);
    // The league anchor (#143): the rival mean stays near LEAGUE.MEAN at the end of five seasons.
    expect(Math.abs(rivalMeanStrength(getState().league.clubs) - RIVAL_LEAGUE_MEAN)).toBeLessThanOrEqual(3);
    expect(champions).toHaveLength(5);
    expect(new Set(champions).size).toBeGreaterThan(1);
    const perRivalSeason = signings / (15 * 5);
    expect(perRivalSeason).toBeGreaterThanOrEqual(1);
    expect(perRivalSeason).toBeLessThanOrEqual(3);
    // A final week the club does not play: the rival grand final, rollover and every season hook.
    expect(rolloverMs).toBeGreaterThan(0);
    expect(rolloverMs).toBeLessThan(100);
  }, 60_000);
});
