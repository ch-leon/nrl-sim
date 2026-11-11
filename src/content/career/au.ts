// Additional fictional clubs and prototype tier targets only (#573). The
// supported single-league AU pack and its existing clubs are unchanged.
import { AU_PACK } from '../au';
import type { RegionalCareerProfile } from '../../data/divisions';
import { INITIAL_CALENDAR, INITIAL_FINALS_SLOTS, INITIAL_REGULAR_SLOTS, INITIAL_TRIAL_SLOTS } from './calendar';

// Version-one hypotheses: 44/54/64 tier centres overlap at their edges; the
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
    { id: 'au-premier', name: 'Premier League', rank: 2, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 64, entrants: [
      { clubId: 'rival-au-sandpipers', strength: 57 },
      { clubId: 'rival-crocs', strength: 59 },
      { clubId: 'rival-cyclones', strength: 61 },
      { clubId: 'rival-au-miners', strength: 63 },
      { clubId: 'rival-thunder', strength: 65 },
      { clubId: 'rival-stingrays', strength: 67 },
      { clubId: 'rival-wolves', strength: 69 },
      { clubId: 'rival-reapers', strength: 71 },
    ] },
  ],
};
