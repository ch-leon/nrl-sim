// tests/systems/rivals.test.ts — rival squads and rival free agency (GitHub #74).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRivalSquad, squadStrength, withRivalSquads, pickSigning, rivalSigningTick, healRivals,
  injureRivalPlayers, rolloverRivals, rivalPlayer, weakestPosition, developmentRate, registerRivalsSystem,
  developRivalsWeek, developRivalPlayerWeek, rivalMeanStrength, anchorPerSeason, RIVAL_LEAGUE_MEAN, RIVAL_DEVELOPMENT,
  RIVAL_SQUAD_SIZE, RIVAL_SQUAD_MIN, RIVAL_SQUAD_MAX, RIVAL_POOL_FLOOR, RIVAL_SIGNINGS_OFFSEASON,
  rivalNeed, pickNeedSigning, notableOverall, squadWages, RIVAL_WAGE_CAP, RIVALS_TICK_ORDER, RIVAL_NOTABLE_ABOVE_TARGET,
} from '../../src/systems/rivals';
import { STRENGTH_MIN, STRENGTH_MAX } from '../../src/systems/league';
import { RIVAL_CLUBS } from '../../src/data/league';
import { POSITIONS, overallRating, generatePlayer } from '../../src/data/player';
import { createNewGame, getState, setState, type Player, type RivalClub } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { makeRng } from '../../src/utils/rng';
import { initLeague, registerFixturesSystem, knockoutWinner, PLAYER_ID, FINALS_ROUNDS } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { registerFreeAgencySystem, FREE_AGENT_POOL_SIZE, poolTarget } from '../../src/systems/freeagency';
import { registerAgingSystem } from '../../src/systems/aging';
import { advanceWeek, clearSeasonHooks, clearTickHooks, registerTickHook, withFastForward, TICK_ORDER } from '../../src/core/time';
import { SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../src/config';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

const club = (strength: number, id = 'rival-test'): RivalClub => ({ id, name: 'Test Rivals', colors: ['#000000', '#ffffff'], strength });
const agent = (rng = makeRng(1), over: Partial<Player> = {}): Player => ({ ...generatePlayer(rng), ...over });
/** Weak free agents nobody signs, so a test pool sits above RIVAL_POOL_FLOOR. */
const filler = (n = RIVAL_POOL_FLOOR): Player[] => {
  const rng = makeRng(99);
  return Array.from({ length: n }, (_, i) => ({ ...rivalPlayer(rng, 'fill', POSITIONS[i % POSITIONS.length]!, 15), id: `fill-${i}` }));
};

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
    const pool = [star, ...filler()];
    let r = rivalSigningTick([c], pool, makeRng(0));
    for (let seed = 1; r.signed.length === 0; seed++) r = rivalSigningTick([c], pool, makeRng(seed));
    expect(r.freeAgents).toEqual(filler());
    expect(r.clubs[0]!.squad!.some((p) => p.id === star.id)).toBe(true);
    expect(r.clubs[0]!.strength).toBe(squadStrength(r.clubs[0]!.squad!));
    expect(r.news[0]).toContain(star.name);
  });

  it('a full squad releases its weakest player into the pool first', () => {
    const rng = makeRng(5);
    const squad = Array.from({ length: RIVAL_SQUAD_MAX }, (_, i) => rivalPlayer(rng, 'c', POSITIONS[i % 9]!, 50 + (i === 7 ? -20 : 0)));
    // Index 7 is a second-rower, one of only two: releasing him would leave the position thin.
    squad[2] = rivalPlayer(rng, 'c', POSITIONS[2]!, 25);
    const worst = squad[2]!;
    const c: RivalClub = { ...club(50), squad };
    const star = rivalPlayer(rng, 'fa', 'fullback', 85);
    const pool = [star, ...filler()];
    let r = rivalSigningTick([c], pool, makeRng(0));
    for (let seed = 1; r.signed.length === 0; seed++) r = rivalSigningTick([c], pool, makeRng(seed));
    expect(r.clubs[0]!.squad).toHaveLength(RIVAL_SQUAD_MAX);
    expect(r.freeAgents.map((p) => p.id)).toEqual([...filler().map((p) => p.id), worst.id]);
  });

  it('never touches the player club', () => {
    const me: RivalClub = { id: 'player', name: 'Me', colors: ['#000000', '#ffffff'], strength: 55 };
    for (let seed = 0; seed < 50; seed++) {
      expect(rivalSigningTick([me], [agent(), ...filler()], makeRng(seed)).clubs[0]).toBe(me);
    }
  });
});

// Wave 3 task 04: rivals fill gaps from the pool, within the cap, a signing a week.
describe('need signings', () => {
  const full = (strength = 55, seed = 20): RivalClub => ({ ...club(strength), squad: generateRivalSquad(club(strength), seed) });
  /** Two at every position but one hooker (17), at overall 45. */
  const c0 = (): Player[] => {
    const rng = makeRng(32);
    return POSITIONS.flatMap((pos) => (pos === 'hooker' ? [pos] : [pos, pos])).map((pos) => rivalPlayer(rng, 'c', pos, 45));
  };
  /** A pool with a decent player at every position, plus filler. */
  const market = (target = 50, seed = 21): Player[] => {
    const rng = makeRng(seed);
    return [...POSITIONS.map((pos) => rivalPlayer(rng, 'fa', pos, target)), ...filler()];
  };
  /** Run the tick over seeds until a club signs (the need roll is a chance, not a certainty). */
  const firstSigning = (clubs: RivalClub[], pool: Player[], opts = {}) => {
    for (let seed = 0; seed < 200; seed++) {
      const r = rivalSigningTick(clubs, pool, makeRng(seed), opts);
      if (r.signed.length > 0) return r;
    }
    throw new Error('nobody signed in 200 seeds');
  };

  it('a full, fit squad needs nobody; a retirement leaves the position thin; a short squad fills its thinnest spot', () => {
    const c = full();
    expect(c.squad).toHaveLength(RIVAL_SQUAD_SIZE);
    expect(rivalNeed(c.squad!)).toBeNull();
    const hookers = c.squad!.filter((p) => p.position === 'hooker');
    const noHooker = c.squad!.filter((p) => p.id !== hookers[0]!.id);
    expect(rivalNeed(noHooker)).toEqual({ kind: 'thin', position: 'hooker' });
    // Injured or suspended players don't count as cover.
    const hurt = c.squad!.map((p) => (p.id === hookers[0]!.id ? { ...p, injuredWeeks: 3 } : p));
    expect(rivalNeed(hurt)).toEqual({ kind: 'thin', position: 'hooker' });
    const banned = c.squad!.map((p) => (p.id === hookers[0]!.id ? { ...p, suspendedWeeks: 2 } : p));
    expect(rivalNeed(banned)?.position).toBe('hooker');
    // Two short, but every position still has two: a size need.
    const spares = c.squad!.filter((p) => c.squad!.filter((q) => q.position === p.position).length > 2);
    const short = c.squad!.filter((p) => !spares.slice(0, 2).some((x) => x.id === p.id));
    expect(short.length).toBeLessThan(RIVAL_SQUAD_SIZE);
    expect(rivalNeed(short)?.kind).toBe('size');
  });

  it('fills the gap with the best affordable player at that position', () => {
    const c = full();
    const hooker = c.squad!.find((p) => p.position === 'hooker')!;
    const thin: RivalClub = { ...c, squad: c.squad!.filter((p) => p.id !== hooker.id) };
    const rng = makeRng(30);
    const okHooker = rivalPlayer(rng, 'fa', 'hooker', 48);
    const goodHooker = rivalPlayer(rng, 'fa', 'hooker', 58);
    const star = rivalPlayer(rng, 'fa', 'prop', 80);
    const pool = [okHooker, star, goodHooker, ...filler()];
    expect(pickNeedSigning(thin.squad!, pool, { kind: 'thin', position: 'hooker' })?.id).toBe(goodHooker.id);
    const r = firstSigning([thin], pool);
    expect(r.signed).toEqual([{ clubId: c.id, playerId: goodHooker.id, overall: overallRating(goodHooker), reason: 'thin' }]);
    expect(rivalNeed(r.clubs[0]!.squad!)).toBeNull();
    expect(r.freeAgents.some((p) => p.id === goodHooker.id)).toBe(false);
  });

  it('respects the salary cap: a player it cannot afford is passed over for one it can', () => {
    const rng = makeRng(31);
    const pricey = rivalPlayer(rng, 'fa', 'hooker', 90);
    const cheap = rivalPlayer(rng, 'fa', 'hooker', 35);
    // Two at every position but hooker, everyone the same: find a level that leaves
    // room for the cheap hooker but not the dear one, even after a release.
    const base = c0();
    let squad: Player[] | null = null;
    for (let level = 30; level <= 99 && !squad; level++) {
      const sq = base.map((p) => ({ ...p, stats: { speed: level, strength: level, stamina: level, skill: level, footyIQ: level } }));
      const room = RIVAL_WAGE_CAP - squadWages(sq);
      const freed = squadWages(sq.slice(0, 1));
      if (room >= squadWages([cheap]) && room + freed < squadWages([pricey])) squad = sq;
    }
    expect(squad).not.toBeNull();
    const need = { kind: 'thin', position: 'hooker' } as const;
    expect(rivalNeed(squad!)).toEqual(need);
    expect(pickNeedSigning(squad!, [pricey, cheap], need)?.id).toBe(cheap.id);
    expect(pickNeedSigning(squad!, [pricey], need)).toBeNull();
    // Without the cap in the way, the better one.
    expect(pickNeedSigning(c0(), [pricey, cheap], need)?.id).toBe(pricey.id);
  });

  it('never goes past RIVAL_SQUAD_MAX, and never leaves the pool at or below RIVAL_POOL_FLOOR', () => {
    const c = full();
    let clubs: RivalClub[] = [{ ...c, squad: c.squad!.slice(0, RIVAL_SQUAD_MIN) }];
    let pool = market(50);
    for (let w = 0; w < 60; w++) {
      const r = rivalSigningTick(clubs, [...pool, ...market(50, 100 + w).slice(0, 3)], makeRng(w), { perClub: RIVAL_SIGNINGS_OFFSEASON });
      clubs = r.clubs;
      pool = r.freeAgents;
      expect(clubs[0]!.squad!.length).toBeLessThanOrEqual(RIVAL_SQUAD_MAX);
      expect(pool.filter((p) => !p.junior).length).toBeGreaterThanOrEqual(RIVAL_POOL_FLOOR);
    }
    // A pool already down to the floor is left alone.
    const thin = { ...c, squad: c.squad!.slice(0, 10) };
    for (let seed = 0; seed < 30; seed++) expect(rivalSigningTick([thin], filler(), makeRng(seed)).signed).toEqual([]);
  });

  it('signs at most one a club a week in season, and up to RIVAL_SIGNINGS_OFFSEASON in the finals weeks', () => {
    const short = (id: string, seed: number): RivalClub => {
      const base = { ...club(55, id), squad: generateRivalSquad(club(55, id), seed) };
      return { ...base, squad: base.squad.slice(0, 12) };
    };
    const clubs = [short('a', 1), short('b', 2), short('c', 3)];
    const pool = [...market(50, 40), ...market(50, 41), ...market(50, 42)];
    for (let seed = 0; seed < 40; seed++) {
      const inSeason = rivalSigningTick(clubs, pool, makeRng(seed));
      for (const id of ['a', 'b', 'c']) expect(inSeason.signed.filter((x) => x.clubId === id).length).toBeLessThanOrEqual(1);
      const off = rivalSigningTick(clubs, pool, makeRng(seed), { perClub: RIVAL_SIGNINGS_OFFSEASON });
      for (const id of ['a', 'b', 'c']) expect(off.signed.filter((x) => x.clubId === id).length).toBeLessThanOrEqual(RIVAL_SIGNINGS_OFFSEASON);
    }
    const most = Math.max(...Array.from({ length: 40 }, (_, seed) => rivalSigningTick(clubs, pool, makeRng(seed), { perClub: RIVAL_SIGNINGS_OFFSEASON }).signed.length));
    expect(most).toBeGreaterThan(clubs.length); // some club made two
  });

  it('a club in need doesn\'t take a player instantly: some weeks it waits', () => {
    const c = full();
    const thin: RivalClub = { ...c, squad: c.squad!.filter((p) => p.position !== 'lock' || p !== c.squad!.find((q) => q.position === 'lock')) };
    const pool = market(50);
    const signedWeeks = Array.from({ length: 100 }, (_, seed) => rivalSigningTick([thin], pool, makeRng(seed)).signed.length);
    const rate = signedWeeks.reduce((t, n) => t + n, 0) / 100;
    expect(rate).toBeGreaterThan(0.3);
    expect(rate).toBeLessThan(0.7);
  });

  it('is deterministic for a seed, and the first pick turns with the week', () => {
    const clubs = withRivalSquads(RIVAL_CLUBS.map((c) => ({ ...c })), 50).map((c) => ({ ...c, squad: c.squad!.slice(0, 16) }));
    const pool = [...market(50, 60), ...market(50, 61)];
    expect(rivalSigningTick(clubs, pool, makeRng(5), { start: 3 })).toEqual(rivalSigningTick(clubs, pool, makeRng(5), { start: 3 }));
    // Two clubs short of a lock, a star and a journeyman lock: when both sign, the club picking first gets the star.
    const rng = makeRng(62);
    const star = rivalPlayer(rng, 'fa', 'lock', 75);
    const journeyman = rivalPlayer(rng, 'fa', 'lock', 45);
    const lockless = [full(50, 63), { ...full(50, 64), id: 'rival-other' }].map((c) => ({ ...c, squad: c.squad!.filter((p) => p.position !== 'lock') }));
    const winner = (start: number): string | undefined => {
      for (let seed = 0; seed < 200; seed++) {
        const r = rivalSigningTick(lockless, [star, journeyman, ...filler()], makeRng(seed), { start });
        if (r.signed.length === 2) return r.signed.find((x) => x.playerId === star.id)?.clubId;
      }
      return undefined;
    };
    expect(winner(0)).toBe(lockless[0]!.id);
    expect(winner(1)).toBe(lockless[1]!.id);
  });

  it('news only for the top of the pool', () => {
    const rng = makeRng(70);
    const pool = Array.from({ length: 10 }, (_, i) => rivalPlayer(rng, 'fa', POSITIONS[i % 9]!, 40 + i * 3));
    const ovr = pool.map(overallRating).sort((a, b) => b - a);
    expect(notableOverall(pool)).toBe(ovr[1]); // top 20% of 10 = the best two
    expect(notableOverall([])).toBe(Infinity);
    const c = full();
    const thin: RivalClub = { ...c, squad: c.squad!.filter((p) => p.position !== 'lock') };
    const lockMid = { ...rivalPlayer(rng, 'fa', 'lock', 50), id: 'lock-mid' };
    const r = firstSigning([thin], [lockMid, ...filler()], { notable: overallRating(lockMid) + 1 });
    expect(r.signed[0]!.playerId).toBe('lock-mid');
    expect(r.news).toEqual([]);
    const r2 = firstSigning([thin], [lockMid, ...filler()], { notable: overallRating(lockMid) });
    expect(r2.news[0]).toContain(lockMid.name);
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

describe('the weekly hook (Wave 3 task 04)', () => {
  it('runs before the pool refresh, so a fresh pool is the user\'s for a week', () => {
    expect(RIVALS_TICK_ORDER).toBeLessThan(TICK_ORDER.freeagents);
  });

  it('signs from the store\'s pool, two a club in the finals weeks, with news at the pool target + RIVAL_NOTABLE_ABOVE_TARGET', () => {
    const run = (week: number): { signed: number; news: string[]; perClub: Map<string, number> } => {
      bus.clear();
      clearTickHooks();
      createNewGame('Hook FC', 404);
      initLeague(getState());
      const s0 = getState();
      // Every rival short of players, and a deep pool of good players.
      const clubs = s0.league.clubs.map((c) => (c.squad ? { ...c, squad: c.squad.slice(0, 12) } : c));
      const rng = makeRng(405);
      const pool = Array.from({ length: 80 }, (_, i) => rivalPlayer(rng, 'fa', POSITIONS[i % 9]!, 40 + (i % 30)));
      setState({ week, league: { ...s0.league, clubs }, freeAgents: pool });
      const news: string[] = [];
      bus.on('ui:notify', ({ text }) => { if (/ sign \d+-rated /.test(text)) news.push(text); });
      registerRivalsSystem();
      const before = new Map(getState().league.clubs.map((c) => [c.id, c.squad?.length ?? 0] as const));
      advanceWeek();
      const perClub = new Map<string, number>();
      for (const c of getState().league.clubs) if (c.squad) perClub.set(c.id, c.squad.length - before.get(c.id)!);
      const signed = [...perClub.values()].reduce((t, n) => t + n, 0);
      expect(getState().freeAgents.length).toBe(pool.length - signed);
      return { signed, news, perClub };
    };
    const inSeason = run(5);
    expect(inSeason.signed).toBeGreaterThan(0);
    expect(Math.max(...inSeason.perClub.values())).toBeLessThanOrEqual(1);
    const finals = run(SEASON_ROUNDS + 1);
    expect(Math.max(...finals.perClub.values())).toBe(RIVAL_SIGNINGS_OFFSEASON);
    // The news line is for the top of the pool only.
    const cut = Math.round(poolTarget(getState())) + RIVAL_NOTABLE_ABOVE_TARGET;
    for (const line of [...inSeason.news, ...finals.news]) expect(Number(/ sign (\d+)-rated /.exec(line)![1])).toBeGreaterThanOrEqual(cut);
    expect(finals.news.length).toBeGreaterThan(0);
    expect(finals.news.length).toBeLessThan(finals.signed);
  });
});

describe('five-season headless league', () => {
  it('keeps rival strength in the band and squads in their limits, crowns different champions, signs 1–3 a season, and the pool stays healthy', () => {
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
    const poolSizes: number[] = [];
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
          expect(c.squad!.length).toBeLessThanOrEqual(RIVAL_SQUAD_MAX);
        }
        // Wave 3 task 04: the pool stays healthy: never empty, never piling up.
        const signable = s.freeAgents.filter((p) => !p.junior).length;
        poolSizes.push(signable);
        expect(signable).toBeGreaterThan(0);
        expect(s.freeAgents.length).toBeLessThanOrEqual(3 * FREE_AGENT_POOL_SIZE);
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
    const meanPool = poolSizes.reduce((t, n) => t + n, 0) / poolSizes.length;
    expect(meanPool).toBeGreaterThanOrEqual(RIVAL_POOL_FLOOR);
    expect(Math.min(...poolSizes)).toBeGreaterThan(0);
    // A final week the club does not play: the rival grand final, rollover and every season hook.
    expect(rolloverMs).toBeGreaterThan(0);
    expect(rolloverMs).toBeLessThan(100);
  }, 60_000);
});
