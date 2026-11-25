// The Big Three (#840): three Premier clubs per region built and kept well
// above the rest, with a bigger budget, and a board that never asks a club to
// finish above all of them.
import { describe, expect, it } from 'vitest';
import { BIG_THREE, BIG_THREE_SQUAD_SIZE } from '../../src/content/career/bigThree';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import type { RegionalCareerProfile } from '../../src/data/divisions';
import type { GameState, RivalClub } from '../../src/core/state';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { activeSalary, publishedCap } from '../../src/systems/cap';
import { developDivisionRivals, developRivalsWeek, rolloverRivalPopulationChecked } from '../../src/systems/rivals';
import { AU_PACK } from '../../src/content/au';
import { buildDivisionSchedule, type LeagueFields } from '../../src/data/divisions';
import { buildSavedLeagueSchedule } from '../../src/data/leagueSchedule';
import { validateCompetitions, type CompetitionCareerState } from '../../src/data/competition';
import { buildDivisionTrials } from '../../src/systems/divisionCareer';
import { generateLeagueObjectives } from '../../src/systems/board';
import { makeRng } from '../../src/utils/rng';

const regions: [string, RegionalCareerProfile, { home?: { town: string; country: string } }][] = [
  ['AU', AU_CAREER_PROFILE, {}],
  ['UK', UK_CAREER_PROFILE, { home: { town: 'Here', country: 'GB' } }],
];

const premierOf = (profile: RegionalCareerProfile) => profile.divisions.find(d => d.rank === 2)!;
const club = (s: GameState, id: string): RivalClub => s.league.clubs.find(c => c.id === id)!;
const mean = (ns: number[]): number => ns.reduce((t, n) => t + n, 0) / ns.length;

describe('Big Three (#840)', () => {
  it('lists three Premier clubs per region at 74, 76 and 78', () => {
    for (const [, profile] of regions) {
      const levels = BIG_THREE[profile.id]!;
      expect(Object.values(levels).sort()).toEqual([74, 76, 78]);
      const premier = premierOf(profile);
      for (const [id, level] of Object.entries(levels)) {
        expect(premier.entrants.find(e => e.clubId === id)?.strength).toBe(level);
      }
      // The Premier average the anchor holds is the five ordinary clubs' average.
      const ordinary = premier.entrants.filter(e => !(e.clubId in levels));
      expect(ordinary).toHaveLength(5);
      expect(premier.ratingMean).toBe(mean(ordinary.map(e => e.strength)));
    }
  });

  for (const [name, profile, options] of regions) {
    it(`${name}: a new career builds the Big Three near their level, inside a $750k cap`, async () => {
      for (const seed of [1, 575, 4242]) {
        const s = await prepareLeagueCareer({ clubName: 'Big Three FC', seed, ...options });
        const levels = BIG_THREE[profile.id]!;
        for (const [id, level] of Object.entries(levels)) {
          const c = club(s, id);
          expect(Math.abs(c.strength - level)).toBeLessThanOrEqual(2);
          expect(c.squad).toHaveLength(BIG_THREE_SQUAD_SIZE);
          expect(publishedCap(c.capAccount!)).toBe(750_000);
          expect(c.squad!.reduce((t, p) => t + activeSalary(p, 1), 0)).toBeLessThanOrEqual(750_000);
        }
        for (const entrant of premierOf(profile).entrants.filter(e => !(e.clubId in levels))) {
          const c = club(s, entrant.clubId);
          expect(Math.abs(c.strength - entrant.strength)).toBeLessThanOrEqual(2);
          expect(publishedCap(c.capAccount!)).toBe(600_000);
        }
      }
    });
  }

  it('keeps the Big Three near their level and the leagues near their averages for eight seasons', async () => {
    let s = await prepareLeagueCareer({ clubName: 'Big Three FC', seed: 4242 });
    const levels = BIG_THREE[AU_CAREER_PROFILE.id]!;
    const fieldOf = (rank: number) => AU_CAREER_PROFILE.divisions.find(d => d.rank === rank)!.entrants
      .map(e => e.clubId).filter(id => id !== 'player');
    for (let season = 1; season <= 8; season++) {
      for (let week = 1; week <= 25; week++) {
        s = { ...s, week, league: { ...s.league, clubs: developDivisionRivals(s, s.league.clubs, makeRng((season * 100 + week) >>> 0)) } };
      }
      for (const [id, level] of Object.entries(levels)) expect(Math.abs(club(s, id).strength - level), `${id} season ${season}`).toBeLessThanOrEqual(3);
      const premier = fieldOf(2).filter(id => !(id in levels));
      expect(Math.abs(mean(premier.map(id => club(s, id).strength)) - 61), `ordinary Premier season ${season}`).toBeLessThanOrEqual(2);
      expect(Math.abs(mean(fieldOf(1).map(id => club(s, id).strength)) - 54), `Championship season ${season}`).toBeLessThanOrEqual(2);
      expect(Math.abs(mean(fieldOf(0).map(id => club(s, id).strength)) - 44), `Local season ${season}`).toBeLessThanOrEqual(2);
      const next = rolloverRivalPopulationChecked({ ...s, season: season + 1, week: 1 }, makeRng(season * 31));
      expect(next.ok).toBe(true);
      s = next.state;
    }
  });

  it('never asks a club to finish above all three, or above any one of them', async () => {
    const s = await prepareLeagueCareer({ clubName: 'Big Three FC', seed: 575 });
    const levels = BIG_THREE[AU_CAREER_PROFILE.id]!;
    const premier = premierOf(AU_CAREER_PROFILE).entrants.map(e => e.clubId);
    // The player takes the weakest club's place, as moving up does.
    const field = ['player', ...premier.slice(1)];
    for (const reputation of [30, 60, 80, 100]) {
      const goals = generateLeagueObjectives({ ...s, reputation, season: 4 }, field);
      expect(goals.find(o => o.kind === 'finals')!.target).toBeGreaterThanOrEqual(4);
      const rival = goals.find(o => o.kind === 'beatRival');
      if (rival) expect(rival.rivalId! in levels).toBe(false);
    }
  });

  it('leaves a career built before the Big Three exactly as it was', async () => {
    const s = await prepareLeagueCareer({ clubName: 'Old FC', seed: 575 });
    const { bigThree: _gone, ...world } = s.competitions!.world!;
    const old: GameState = { ...s, competitions: { ...s.competitions!, world } };
    // The pre-#840 rule: every division develops toward its own average, in order.
    const expected = (() => {
      const rng = makeRng(99); const updated = new Map<string, RivalClub>();
      for (const division of world.divisions) {
        const ids = new Set(old.competitions!.instances.find(i => i.id === division.instanceId)!.entrantIds);
        for (const c of developRivalsWeek(old.league.clubs.filter(c => ids.has(c.id)), rng, old.clubId, division.ratingMean, 25)) updated.set(c.id, c);
      }
      return old.league.clubs.map(c => updated.get(c.id) ?? c);
    })();
    expect(developDivisionRivals(old, old.league.clubs, makeRng(99))).toEqual(expected);
  });

  it('carries the Big Three into each new season and rejects a malformed list', () => {
    const profile = AU_CAREER_PROFILE; const seed = 573;
    const fields: LeagueFields = Object.fromEntries(profile.divisions.map(d => [d.id, d.entrants.map(e => e.clubId)]));
    const clubIds = ['player', ...profile.clubs.map(c => c.id)];
    const schedule = buildDivisionSchedule(profile, AU_PACK, 1, fields, seed);
    const source: CompetitionCareerState = { schemaVersion: 1,
      world: { profile: schedule.profile, divisions: schedule.divisions, bigThree: { ...BIG_THREE[profile.id]! } },
      instances: [...schedule.instances, ...buildDivisionTrials(schedule, profile, 1, seed)],
      calendar: { mode: 'structural', status: 'active', season: 1, elapsedIntervals: 0, slots: profile.calendarSlots.map(x => ({ ...x })) } };
    const context = { pack: 'au', season: 1, clubIds };
    expect(validateCompetitions(source, context)).toBeNull();
    expect(buildSavedLeagueSchedule(source, 2, fields, seed, clubIds).world.bigThree).toEqual(BIG_THREE[profile.id]);
    for (const bigThree of [{ 'rival-nobody': 78 }, { 'rival-reapers': 78.5 }, { 'rival-reapers': 0 }]) {
      expect(validateCompetitions({ ...source, world: { ...source.world!, bigThree } }, context)).not.toBeNull();
    }
  });
});
