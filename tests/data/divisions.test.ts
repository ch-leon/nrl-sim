import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { activePack, preparePack, selectPack } from '../../src/content';
import { AU_PACK } from '../../src/content/au';
import { UK_PACK } from '../../src/content/uk';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { createNewGame, getState, SAVE_VERSION } from '../../src/core/state';
import { validateInput, isPlayer } from '../../src/core/saveValidation';
import { validateCompetitions } from '../../src/data/competition';
import { createDivisionWorld, divisionPairings, validateRegionalCareerProfile, type RegionalCareerProfile } from '../../src/data/divisions';
import { overallRating, POSITIONS, shownStats } from '../../src/data/player';

beforeAll(async () => { await preparePack('uk'); });
afterEach(() => { selectPack('au'); });

const player = { name: 'Prototype Club', colors: ['#123456', '#abcdef'] as [string, string] };
const regions = [
  { pack: AU_PACK, profile: AU_CAREER_PROFILE, additions: 8 },
  { pack: UK_PACK, profile: UK_CAREER_PROFILE, additions: 12 },
];
const copy = (): RegionalCareerProfile => JSON.parse(JSON.stringify(AU_CAREER_PROFILE));

describe('authored regional career profiles', () => {
  it.each(regions)('covers the $pack.id world once without replacing legacy clubs', ({ pack, profile, additions }) => {
    expect(validateRegionalCareerProfile(profile, pack)).toEqual([]);
    expect(profile.clubs).toHaveLength(pack.clubs.length + additions);
    expect(profile.clubs).toHaveLength(23);
    for (const existing of pack.clubs) {
      const retained = profile.clubs.find(c => c.id === existing.id);
      expect(retained?.name).toBe(existing.name);
      expect(retained?.colors).toEqual(existing.colors);
      expect(retained).not.toBe(existing);
      expect(retained?.colors).not.toBe(existing.colors);
      if (existing.home) expect(retained?.home).not.toBe(existing.home);
    }
    expect(profile.divisions.map(d => d.rank)).toEqual([0, 1, 2]);
    expect(profile.divisions.map(d => d.ratingMean)).toEqual([44, 54, 64]);
    expect(profile.divisions.every(d => d.regularRounds === 14 && d.finalsSize === 4 && d.entrants.length === 8)).toBe(true);
    const ids = profile.divisions.flatMap(d => d.entrants.map(e => e.clubId));
    expect(new Set(ids).size).toBe(24);
    expect(ids.filter(id => id === 'player')).toHaveLength(1);
    expect(profile.divisions[0]!.entrants.some(e => e.clubId === 'player')).toBe(true);
    expect(profile).not.toHaveProperty('cap');
    expect(profile).not.toHaveProperty('budget');
  });

  it('keeps the supported AU and UK league shapes unchanged', () => {
    expect(AU_PACK.clubs).toHaveLength(15);
    expect(AU_PACK.league.seasonRounds).toBe(24);
    expect(UK_PACK.clubs).toHaveLength(11);
    expect(UK_PACK.league.seasonRounds).toBe(22);
  });

  it.each([
    ['wrong pack', (p: RegionalCareerProfile) => ({ ...p, pack: 'uk' })],
    ['duplicate club', (p: RegionalCareerProfile) => ({ ...p, clubs: [...p.clubs, p.clubs[0]!] })],
    ['missing club', (p: RegionalCareerProfile) => ({ ...p, clubs: p.clubs.slice(1) })],
    ['duplicate membership', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map((d, i) => i ? d : { ...d, entrants: [d.entrants[0]!, d.entrants[0]!, ...d.entrants.slice(2)] }) })],
    ['odd field', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map((d, i) => i ? d : { ...d, entrants: d.entrants.slice(1) }) })],
    ['duplicate rank', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map(d => ({ ...d, rank: 0 })) })],
    ['unknown start', (p: RegionalCareerProfile) => ({ ...p, startingDivisionId: 'missing' })],
    ['insufficient rounds', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map(d => ({ ...d, regularRounds: 6 })) })],
    ['impossible finals', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map(d => ({ ...d, finalsSize: 16 })) })],
    ['short calendar', (p: RegionalCareerProfile) => ({ ...p, slotCount: 15 })],
    ['infinite target', (p: RegionalCareerProfile) => ({ ...p, divisions: p.divisions.map(d => ({ ...d, ratingMean: Infinity })) })],
    ['invalid squad size', (p: RegionalCareerProfile) => ({ ...p, startingSquad: { ...p.startingSquad, size: 13 } })],
  ])('rejects %s before generating a world', (_name, change) => {
    const p = change(copy());
    expect(validateRegionalCareerProfile(p, AU_PACK).length).toBeGreaterThan(0);
    expect(() => createDivisionWorld(p, AU_PACK, 3, player)).toThrow('Invalid regional career');
  });
});

describe('explicit-length round robins', () => {
  it.each([2, 4, 6, 8, 10])('gives %i clubs every ordered pairing and equal home/away fixtures', size => {
    const ids = Array.from({ length: size }, (_, n) => `club-${n}`);
    const before = [...ids];
    const fixtures = divisionPairings(ids, 2 * (size - 1), 50);
    expect(ids).toEqual(before);
    expect(fixtures).toHaveLength(size * (size - 1));
    const pairs = new Set(fixtures.map(f => `${f.homeId}/${f.awayId}`));
    expect(pairs.size).toBe(fixtures.length);
    for (const home of ids) for (const away of ids) {
      expect(pairs.has(`${home}/${away}`)).toBe(home !== away);
    }
    for (let round = 1; round <= 2 * (size - 1); round++) {
      const games = fixtures.filter(f => f.round === round);
      expect(games).toHaveLength(size / 2);
      expect(new Set(games.flatMap(f => [f.homeId, f.awayId])).size).toBe(size);
    }
    for (const id of ids) {
      expect(fixtures.filter(f => f.homeId === id)).toHaveLength(size - 1);
      expect(fixtures.filter(f => f.awayId === id)).toHaveLength(size - 1);
    }
  });

  it('supports explicit single and partial return legs independently of active pack rounds', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(divisionPairings(ids, 3, 1)).toHaveLength(6);
    expect(divisionPairings(ids, 4, 1)).toHaveLength(8);
    expect(divisionPairings(ids, 6, 1)).toHaveLength(12);
    expect(divisionPairings(ids, 4, 1)).toEqual(divisionPairings(ids, 4, 1));
    expect(divisionPairings(ids, 6, 2)).not.toEqual(divisionPairings(ids, 6, 1));
  });

  it.each([
    [[], 1, 0], [['a'], 1, 0], [['a', 'b', 'c'], 4, 0], [['a', 'a'], 2, 0],
    [['a', ''], 2, 0], [['a', 'b'], 0, 0], [['a', 'b'], 3, 0], [['a', 'b'], 2, -1],
  ] as const)('rejects an impossible field/length/seed %j', (ids, rounds, seed) => {
    expect(() => divisionPairings(ids, rounds, seed)).toThrow('Invalid division schedule');
  });
});

describe('dormant regional world construction', () => {
  it.each(regions)('builds one legal persistent $pack.id registry and valid league metadata', ({ pack, profile }) => {
    selectPack(pack.id);
    const world = createDivisionWorld(profile, pack, 573, player);
    expect(world.clubs).toHaveLength(24);
    expect(world.squad).toHaveLength(20);
    expect(world.clubs.find(c => c.id === 'player')).not.toHaveProperty('squad');
    expect(world.clubs.filter(c => c.id !== 'player').every(c => c.squad?.length === 20)).toBe(true);
    const allPlayers = [...world.squad, ...world.clubs.flatMap(c => c.squad ?? [])];
    expect(allPlayers).toHaveLength(480);
    expect(new Set(allPlayers.map(p => p.id)).size).toBe(480);
    expect(allPlayers.every(p => isPlayer(p))).toBe(true);
    expect(allPlayers.every(p => p.xp === 0 && p.level === 1 && p.unspentPoints === 0)).toBe(true);
    expect(allPlayers.every(p => shownStats(p.position).every(key => p.ceilings[key]! >= p.stats[key]))).toBe(true);
    for (const p of allPlayers) {
      const [first, last] = p.name.split(' ');
      expect(pack.names.first).toContain(first);
      expect(pack.names.last).toContain(last);
    }
    for (const position of POSITIONS) expect(world.squad.filter(p => p.position === position).length).toBeGreaterThanOrEqual(2);
    expect(world.divisions.map(d => d.rank)).toEqual([0, 1, 2]);
    expect(world.instances).toHaveLength(3);
    expect(world.instances.flatMap(i => i.fixtures)).toHaveLength(168);
    expect(validateCompetitions({ schemaVersion: 1, instances: world.instances }, { pack: pack.id, season: 1, clubIds: world.clubs.map(c => c.id) })).toBeNull();
    expect(world.instances.every(i => i.fixtures.length === 56 && i.fixtures.every(f => f.status === 'pending' && f.slot === undefined))).toBe(true);
    expect(world.instances.every(i => i.definition.rewards.length === 0)).toBe(true);
    expect(world).not.toHaveProperty('calendar');
    expect(world).not.toHaveProperty('money');
    expect(world).not.toHaveProperty('cap');
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });

  it('is deterministic, independent of display names and isolated from the live state/RNG', () => {
    selectPack('au');
    const live = createNewGame('Existing', 5150);
    const before = JSON.stringify(live);
    const source = JSON.stringify(AU_CAREER_PROFILE);
    const a = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 7, player);
    const b = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 7, { ...player, name: 'Renamed' });
    expect(a.squad).toEqual(b.squad);
    expect(a.instances).toEqual(b.instances);
    expect(a.clubs.slice(1)).toEqual(b.clubs.slice(1));
    expect(createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 7, player)).toEqual(a);
    expect(createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 8, player).squad).not.toEqual(a.squad);
    expect(JSON.stringify(AU_CAREER_PROFILE)).toBe(source);
    expect(JSON.stringify(getState())).toBe(before);
    expect(createNewGame('Existing', 5150)).toEqual(live);
  });

  it('constructs a different legal field size without changing the world algorithm', () => {
    selectPack('au');
    const clubs = AU_CAREER_PROFILE.clubs.slice(0, 5);
    const profile: RegionalCareerProfile = {
      ...AU_CAREER_PROFILE, id: 'six-club-prototype', slotCount: 14, trialSlots: [1, 2],
      calendarSlots: Array.from({ length: 14 }, (_, i) => ({ id: i + 1, kind: i < 2 ? 'preseason' : 'competition' })), startingDivisionId: 'small-local', clubs,
      divisions: [{ id: 'small-local', name: 'Small Local', rank: 0, regularRounds: 10,
        regularSlots: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], finalsSlots: [13, 14], finalsSize: 4, ratingMean: 44,
        entrants: [{ clubId: 'player', strength: 44 }, ...clubs.map((c, n) => ({ clubId: c.id, strength: 40 + n }))] }],
    };
    const world = createDivisionWorld(profile, AU_PACK, 6, player);
    expect(world.clubs).toHaveLength(6);
    expect(world.instances).toHaveLength(1);
    expect(world.instances[0]!.fixtures).toHaveLength(30);
    expect(validateCompetitions({ schemaVersion: 1, instances: world.instances }, { pack: 'au', season: 1, clubIds: world.clubs.map(c => c.id) })).toBeNull();
  });

  it('uses the existing starting-difficulty offsets without changing hero ability', () => {
    selectPack('au');
    const normal = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 44, player);
    const easy = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 44, { ...player, difficulty: 'easy' });
    const hard = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 44, { ...player, difficulty: 'hard' });
    for (let n = 0; n < normal.squad.length; n++) {
      const current = normal.squad[n]!;
      if (overallRating(current) >= 68) {
        expect(easy.squad[n]).toEqual(current);
        expect(hard.squad[n]).toEqual(current);
      } else {
        expect(overallRating(easy.squad[n]!)).toBe(overallRating(current) + 4);
        expect(overallRating(hard.squad[n]!)).toBe(overallRating(current) - 4);
      }
    }
    expect(easy.clubs.slice(1)).toEqual(normal.clubs.slice(1));
    expect(hard.clubs.slice(1)).toEqual(normal.clubs.slice(1));
  });

  it('retains the source registry and snapshots rather than sharing mutable career objects', () => {
    selectPack('au');
    const p = copy();
    const original = JSON.stringify(p);
    const world = createDivisionWorld(p, AU_PACK, 5, player);
    world.clubs[1]!.name = 'A renamed club';
    world.clubs[1]!.colors[0] = '#ffffff';
    world.clubs[1]!.squad![0]!.stats.speed = 1;
    expect(JSON.stringify(p)).toBe(original);
    const frozen = JSON.stringify(world.instances[0]!.definition);
    p.divisions[0]!.name = 'New catalogue wording';
    p.divisions[0]!.regularRounds = 10;
    expect(JSON.stringify(world.instances[0]!.definition)).toBe(frozen);
    expect(world.instances.every(i => !('squad' in i) && !('clubs' in i))).toBe(true);
  });

  it('has lower, overlapping initial strength bands without repricing stats or ceilings', () => {
    selectPack('au');
    const world = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 73, player);
    const mean = (rank: number): number => {
      const ids = new Set(world.instances[rank]!.entrantIds);
      const clubs = world.clubs.filter(c => ids.has(c.id) && c.id !== 'player');
      return clubs.reduce((sum, c) => sum + c.strength, 0) / clubs.length;
    };
    expect(mean(1) - mean(0)).toBeGreaterThan(5);
    expect(mean(2) - mean(1)).toBeGreaterThan(5);
    const hero = world.squad.map(overallRating).sort((a, b) => b - a)[0]!;
    expect(hero).toBeGreaterThanOrEqual(68);
    const normal = world.squad.filter(p => overallRating(p) < 68);
    expect(normal.every(p => overallRating(p) <= 47)).toBe(true);
  });

  it('accepts a constructed world at the existing save boundary without installing or activating it', () => {
    selectPack('au');
    const existing = createNewGame('Dormant', 9);
    const world = createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 9, player);
    const draft = { ...existing, clubName: player.name, squad: world.squad, league: { clubs: world.clubs, fixtures: [], ladder: [] }, competitions: { schemaVersion: 1, instances: world.instances } };
    expect(validateInput(draft, SAVE_VERSION)).toBeNull();
    expect(getState()).toBe(existing);
    expect(existing).not.toHaveProperty('competitions');
  });

  it('rejects the wrong active region, invalid seed and invalid player before changing anything', () => {
    selectPack('au');
    const live = createNewGame('Still here', 4);
    expect(() => createDivisionWorld(UK_CAREER_PROFILE, UK_PACK, 4, player)).toThrow('Invalid regional career');
    expect(() => createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, -1, player)).toThrow('Invalid regional career');
    expect(() => createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 4, { ...player, name: '' })).toThrow('Invalid regional career');
    expect(() => createDivisionWorld(AU_CAREER_PROFILE, AU_PACK, 4, { ...player, colors: ['red', '#ffffff'] })).toThrow('Invalid regional career');
    expect(activePack()).toBe(AU_PACK);
    expect(getState()).toBe(live);
  });
});
