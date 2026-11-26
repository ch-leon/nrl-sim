// Additional fictional clubs and prototype tier targets only (#573). The
// supported single-league AU pack and its existing clubs are unchanged.
import { AU_PACK } from '../au';
import type { RegionalCareerProfile } from '../../data/divisions';
import { INITIAL_CALENDAR, INITIAL_FINALS_SLOTS, INITIAL_REGULAR_SLOTS, INITIAL_TRIAL_SLOTS } from './calendar';
import { BIG_THREE } from './bigThree';

// The Premier League's Big Three (#840) read their levels from one list. The
// Premier ratingMean (61) is the five ordinary clubs' average, which is what
// the league anchor holds; each Big Three club is anchored to its own level.
const big = BIG_THREE['au-career-3x8']!;

// Version-one hypotheses: 44/54/61 tier centres overlap at their edges, with
// the Premier Big Three (74/76/78) above them; the
// player's 41 target leaves room for original young recruits to reach the top.
// Stars/XP still belong to the progression tuning pass, annual caps to finance.
export const AU_CAREER_PROFILE: RegionalCareerProfile = {
  id: 'au-career-3x8', version: 1, pack: 'au', slotCount: 25,
  calendarSlots: INITIAL_CALENDAR, trialSlots: INITIAL_TRIAL_SLOTS,
  startingDivisionId: 'au-local', startingSquad: { firstGrade: 41, depthGap: 8, heroes: 1, size: 20 },
  clubs: [
    ...AU_PACK.clubs.map(c => ({ id: c.id, name: c.name, colors: [...c.colors] as [string, string], ...(c.home ? { home: { ...c.home } } : {}) })),
    { id: 'rival-au-bellbirds', name: 'Bendigo Bellbirds', colors: ['#365c52', '#f1c870'] },
    { id: 'rival-au-cutters', name: 'Bundaberg Cane Cutters', colors: ['#375027', '#f4ce89'] },
    { id: 'rival-au-saltbush', name: 'Port Augusta Saltbush', colors: ['#80583f', '#d7e3a8'] },
    { id: 'rival-au-fireflies', name: 'Lismore Fireflies', colors: ['#4d386b', '#e4ea78'] },
    { id: 'rival-au-breakers', name: 'Warrnambool Breakers', colors: ['#244c78', '#e3d5ae'] },
    { id: 'rival-au-timberjacks', name: 'Tumut Timberjacks', colors: ['#5c4135', '#d8b35f'] },
    { id: 'rival-au-sandpipers', name: 'Busselton Sandpipers', colors: ['#276a68', '#ece0c4'] },
    { id: 'rival-au-miners', name: 'Mount Isa Miners', colors: ['#703b2c', '#b9cbd0'] },
  ],
  divisions: [
    { id: 'au-local', name: 'Local League', rank: 0, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 44, entrants: [
      { clubId: 'player', strength: 44 },
      { clubId: 'rival-au-bellbirds', strength: 38 },
      { clubId: 'rival-larrikins', strength: 40 },
      { clubId: 'rival-brollys', strength: 42 },
      { clubId: 'rival-au-cutters', strength: 44 },
      { clubId: 'rival-scorpions', strength: 46 },
      { clubId: 'rival-au-saltbush', strength: 48 },
      { clubId: 'rival-diggers', strength: 50 },
    ] },
    { id: 'au-championship', name: 'Championship', rank: 1, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 54, entrants: [
      { clubId: 'rival-au-fireflies', strength: 47 },
      { clubId: 'rival-gulls', strength: 49 },
      { clubId: 'rival-mariners', strength: 51 },
      { clubId: 'rival-au-breakers', strength: 53 },
      { clubId: 'rival-swagmen', strength: 55 },
      { clubId: 'rival-au-timberjacks', strength: 57 },
      { clubId: 'rival-brumbies', strength: 59 },
      { clubId: 'rival-drovers', strength: 61 },
    ] },
    { id: 'au-premier', name: 'Premier League', rank: 2, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 61, entrants: [
      { clubId: 'rival-au-sandpipers', strength: 57 },
      { clubId: 'rival-crocs', strength: 59 },
      { clubId: 'rival-cyclones', strength: 61 },
      { clubId: 'rival-au-miners', strength: 63 },
      { clubId: 'rival-thunder', strength: 65 },
      { clubId: 'rival-stingrays', strength: big['rival-stingrays']! },
      { clubId: 'rival-wolves', strength: big['rival-wolves']! },
      { clubId: 'rival-reapers', strength: big['rival-reapers']! },
    ] },
  ],
};
