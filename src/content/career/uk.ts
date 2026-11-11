// Independent regional identities; UK is a locale, not a rank above AU (#573).
import { UK_PACK } from '../uk';
import type { RegionalCareerProfile } from '../../data/divisions';
import { INITIAL_CALENDAR, INITIAL_FINALS_SLOTS, INITIAL_REGULAR_SLOTS, INITIAL_TRIAL_SLOTS } from './calendar';

// The same provisional generation bands as AU, with independently authored
// clubs and membership. These values are not measured balance or annual caps.
export const UK_CAREER_PROFILE: RegionalCareerProfile = {
  id: 'uk-career-3x8', version: 1, pack: 'uk', slotCount: 25,
  calendarSlots: INITIAL_CALENDAR, trialSlots: INITIAL_TRIAL_SLOTS,
  startingDivisionId: 'uk-local', startingSquad: { firstGrade: 41, depthGap: 8, heroes: 1, size: 20 },
  clubs: [
    ...UK_PACK.clubs.map(c => ({ id: c.id, name: c.name, colors: [...c.colors] as [string, string], ...(c.home ? { home: { ...c.home } } : {}) })),
    { id: 'rival-uk-buntings', name: 'Mossford Buntings', colors: ['#4c6144', '#e6d29e'] },
    { id: 'rival-uk-looms', name: 'Nettlebridge Looms', colors: ['#64416d', '#e5b5a0'] },
    { id: 'rival-uk-beacons', name: 'Oatfen Beacons', colors: ['#3d5b77', '#eec778'] },
    { id: 'rival-uk-coppers', name: 'Puddlewick Coppers', colors: ['#79503c', '#bdd5cf'] },
    { id: 'rival-uk-flint', name: 'Quarryden Flint', colors: ['#45545f', '#e2caa4'] },
    { id: 'rival-uk-whistlers', name: 'Rookmere Whistlers', colors: ['#425a35', '#d6e1a8'] },
    { id: 'rival-uk-shuttles', name: 'Spindleton Shuttles', colors: ['#6e3951', '#dfcea9'] },
    { id: 'rival-uk-rattles', name: 'Thistlebrook Rattles', colors: ['#3f566f', '#bcceb7'] },
    { id: 'rival-uk-kilns', name: 'Umber Vale Kilns', colors: ['#754339', '#d9bb6f'] },
    { id: 'rival-uk-bells', name: 'Velvetwick Bells', colors: ['#5a436c', '#e8d17b'] },
    { id: 'rival-uk-sails', name: 'Wickerham Sails', colors: ['#2c6564', '#e6d5b7'] },
    { id: 'rival-uk-runners', name: 'Yewbridge Runners', colors: ['#424f76', '#c3d99b'] },
  ],
  divisions: [
    { id: 'uk-local', name: 'Local League', rank: 0, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 44, entrants: [
      { clubId: 'player', strength: 44 },
      { clubId: 'rival-uk-buntings', strength: 38 },
      { clubId: 'rival-uk-10', strength: 40 },
      { clubId: 'rival-uk-looms', strength: 42 },
      { clubId: 'rival-uk-9', strength: 44 },
      { clubId: 'rival-uk-beacons', strength: 46 },
      { clubId: 'rival-uk-8', strength: 48 },
      { clubId: 'rival-uk-coppers', strength: 50 },
    ] },
    { id: 'uk-championship', name: 'Championship', rank: 1, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 54, entrants: [
      { clubId: 'rival-uk-flint', strength: 47 },
      { clubId: 'rival-uk-7', strength: 49 },
      { clubId: 'rival-uk-whistlers', strength: 51 },
      { clubId: 'rival-uk-6', strength: 53 },
      { clubId: 'rival-uk-shuttles', strength: 55 },
      { clubId: 'rival-uk-5', strength: 57 },
      { clubId: 'rival-uk-rattles', strength: 59 },
      { clubId: 'rival-uk-4', strength: 61 },
    ] },
    { id: 'uk-premier', name: 'Premier League', rank: 2, regularRounds: 14, regularSlots: INITIAL_REGULAR_SLOTS, finalsSlots: INITIAL_FINALS_SLOTS, finalsSize: 4, ratingMean: 64, entrants: [
      { clubId: 'rival-uk-kilns', strength: 57 },
      { clubId: 'rival-uk-3', strength: 59 },
      { clubId: 'rival-uk-bells', strength: 61 },
      { clubId: 'rival-uk-2', strength: 63 },
      { clubId: 'rival-uk-sails', strength: 65 },
      { clubId: 'rival-uk-1', strength: 67 },
      { clubId: 'rival-uk-runners', strength: 69 },
      { clubId: 'rival-uk-0', strength: 71 },
    ] },
  ],
};
