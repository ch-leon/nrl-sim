// tests/systems/rivals.test.ts — rival squads and rival free agency (GitHub #74).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRivalSquad, squadStrength, withRivalSquads, pickSigning, rivalSigningTick, healRivals,
  injureRivalPlayers, rolloverRivals, rivalPlayer, weakestPosition, developmentDelta, registerRivalsSystem,
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

  it('young players tend to improve and veterans to fade', () => {
    const rng = makeRng(9);
    const mean = (age: number) => Array.from({ length: 200 }, () => developmentDelta(age, rng)).reduce((t, n) => t + n, 0) / 200;
    expect(mean(19)).toBeGreaterThan(2);
    expect(mean(34)).toBeLessThan(-2);
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
        const t0 = performance.now();
        advanceWeek();
        if (rollover) rolloverMs = Math.max(rolloverMs, performance.now() - t0);
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
    expect(champions).toHaveLength(5);
    expect(new Set(champions).size).toBeGreaterThan(1);
    const perRivalSeason = signings / (15 * 5);
    expect(perRivalSeason).toBeGreaterThanOrEqual(1);
    expect(perRivalSeason).toBeLessThanOrEqual(3);
    // The whole final week: the grand final, rollover and every season hook (~10ms here).
    expect(rolloverMs).toBeLessThan(100);
  }, 60_000);
});
