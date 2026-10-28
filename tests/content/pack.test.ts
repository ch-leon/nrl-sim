import { describe, it, expect } from 'vitest';
import { AU_PACK, activeLeague, activePack, activeRules, activeVocab, type ContentPack } from '../../src/content';
import { MIN_NAMES, inlineIqStat, validatePack } from '../../src/content/pack';
import * as config from '../../src/config';
import { NINES } from '../../src/match/league/rules';
import { KNOBS } from '../../src/match/league/tuning';
import { RIVAL_CLUBS } from '../../src/data/league';
import { FIRST_NAMES, SURNAMES } from '../../src/data/names';
import { EVENT_CARDS, cardById, withCardText } from '../../src/data/events';

// Content packs (GitHub #361). The AU pack is today's game: these are the values
// the game shipped with before packs, written out so a slip in the move shows.

describe('AU pack', () => {
  it('is the active pack', () => {
    expect(activePack()).toBe(AU_PACK);
    expect(AU_PACK.id).toBe('au');
  });

  it("holds today's league shape and rating block", () => {
    expect(AU_PACK.league).toEqual({
      seasonRounds: 24,
      finalsWeeks: 3,
      onField: 9,
      setTackles: 5,
      forfeitScore: 24,
      squadMin: 13,
      squadCap: 30,
      rating: { MEAN: 55, START_STARS: 1, START_FIRST_GRADE: 52, START_DEPTH_GAP: 8, POOL_BELOW: 3 },
    });
  });

  it("holds today's Nines rules, in the order the harness lists them", () => {
    expect(Object.entries(AU_PACK.rules)).toEqual([
      ['halfMinutes', 7],
      ['tryPoints', 4],
      ['bonusTryPoints', 5],
      ['conversionPoints', 2],
      ['fieldGoalPoints', 1],
      ['halfTimeTicks', 60],
      ['halfTimeLegsBack', 0.5],
      ['playOnMaxS', 60],
      ['goldenPointMinutes', 4],
      ['goldenPointBreakTicks', 40],
    ]);
  });

  it("holds today's 15 clubs with their ids, colours and strengths", () => {
    expect(AU_PACK.clubs).toEqual([
      { id: 'rival-reapers', name: 'Redcliffe Reapers', colors: ['#8e1c1c', '#f2c14e'], strength: 70 },
      { id: 'rival-wolves', name: 'Woolloomooloo Wolves', colors: ['#37474f', '#b0bec5'], strength: 68 },
      { id: 'rival-thunder', name: 'Toowoomba Thunder', colors: ['#1a237e', '#ffd54f'], strength: 63 },
      { id: 'rival-cyclones', name: 'Cairns Cyclones', colors: ['#00695c', '#e0f2f1'], strength: 61 },
      { id: 'rival-brumbies', name: 'Ballarat Bushrangers', colors: ['#4e342e', '#d7a86e'], strength: 56 },
      { id: 'rival-mariners', name: 'Mackay Marlins', colors: ['#01579b', '#4fc3f7'], strength: 52 },
      { id: 'rival-diggers', name: 'Dubbo Diggers', colors: ['#5d4037', '#a1887f'], strength: 48 },
      { id: 'rival-scorpions', name: 'Shellharbour Scorpions', colors: ['#212121', '#ff7043'], strength: 46 },
      { id: 'rival-crocs', name: 'Katherine Crocs', colors: ['#33691e', '#aed581'], strength: 59 },
      { id: 'rival-swagmen', name: 'Wagga Swagmen', colors: ['#4a148c', '#ce93d8'], strength: 54 },
      { id: 'rival-gulls', name: 'Geelong Gulls', colors: ['#0d47a1', '#ffffff'], strength: 50 },
      { id: 'rival-brollys', name: 'Broken Hill Brollys', colors: ['#bf360c', '#ffcc80'], strength: 44 },
      { id: 'rival-stingrays', name: 'Southport Stingrays', colors: ['#006064', '#80deea'], strength: 65 },
      { id: 'rival-drovers', name: 'Darwin Drovers', colors: ['#3e2723', '#ffb300'], strength: 57 },
      { id: 'rival-larrikins', name: 'Launceston Larrikins', colors: ['#1b5e20', '#c5e1a5'], strength: 42 },
    ]);
  });

  it("holds today's name pools, in order (#398: invented, 60 × 60)", () => {
    expect(AU_PACK.names.first).toEqual([
      'Jarrah', 'Kobi', 'Reece', 'Tane', 'Bailey', 'Cooper', 'Kade', 'Jaxon',
      'Ryder', 'Hayden', 'Brayden', 'Lachie', 'Beau', 'Digger', 'Macca',
      'Nash', 'Zane', 'Corey', 'Blake', 'Darcy', 'Flynn', 'Hunter', 'Jett',
      'Kane', 'Levi', 'Marley', 'Nate', 'Ollie', 'Rhys', 'Sonny', 'Tyrese',
      'Wade', 'Xavier', 'Zeke', 'Angus', 'Bodhi', 'Cruz', 'Deakin', 'Ezra',
      'Finn', 'Archie', 'Brodie', 'Cash', 'Dane', 'Eli', 'Fletcher', 'Harley',
      'Isaac', 'Jed', 'Koa', 'Lenny', 'Mitch', 'Rafe', 'Rocco', 'Sione',
      'Taj', 'Toby', 'Wiremu', 'Sully', 'Tama',
    ]);
    expect(AU_PACK.names.last).toEqual([
      'Pembrook', 'Tackleford', 'Matagi', 'Thornwell', 'Bumpus', 'Faleupolu',
      'Gallagan', 'Hardcastle', 'Fonoti', 'Wexbury', 'Grubberton', 'Vaitohi',
      'Cobbleton', 'Scrumworth', 'Pulotu', 'Kellaway', 'Kickworth', 'Lefaga',
      'Quartermaine', 'Bootle', 'Moengaroa', 'Radbourne', 'Steplock', 'Haumate',
      'Whitbread', 'Draymore', 'Whakarua', 'Yeomans', 'Muddock', 'Ngatoro',
      'Zullo', 'Binnington', 'Tamihana', 'Iliffe', 'Fullbrook', 'Kahutia',
      'Edmunds', 'Tryhorn', 'Hetaraka', 'Vaughan', 'Ironbark', 'Maunga',
      'Addison', 'Ballantry', 'Paewai', 'Ashgrove', 'Wingfield', 'Rewiti',
      'Dunmore', 'Halfpenny', 'Faleolo', 'Pickering', 'Goalby', 'Nofa',
      'Wardrop', 'Stampton', 'Penhallow', 'Leggett', 'Treloar', 'Calderwood',
    ]);
  });

  it("holds today's words", () => {
    expect(AU_PACK.vocab.iqStat).toBe('Footy IQ');
    expect(inlineIqStat(AU_PACK)).toBe('footy IQ');
    expect(AU_PACK.vocab.sport).toBe('footy');
    expect(AU_PACK.vocab.stadiumSigns).toEqual({
      food: 'MEAT PIES', sport: 'FOOTY', home: 'GO TEAM', snack: 'SNAGS', score: 'TRY TIME', away: 'WELCOME', cheer: 'GO HARD',
    });
  });

  it('passes its own checks', () => {
    expect(validatePack(AU_PACK)).toEqual([]);
  });
});

describe('the season-end trip card', () => {
  it('keeps its card ids and flag id (saves store them)', () => {
    const trip = cardById('baliTrip')!;
    expect(trip).toBeDefined();
    expect(cardById('baliHangover')?.when?.flag).toBe('baliIncident');
    const chance = trip.choices[0]!.effects.find((e) => e.kind === 'chance');
    expect(chance && chance.kind === 'chance' && chance.hit).toContainEqual({ kind: 'flag', id: 'baliIncident' });
  });

  it("reads today's text from the pack", () => {
    const trip = cardById('baliTrip')!;
    expect(trip.title).toBe('Trip to Bali');
    expect(trip.text).toBe('The season is done and the squad wants the end-of-season trip to Bali. The group chat is already full of jet skis.');
    expect(trip.choices[0]!.outcome).toBe('The squad is off to Bali.');
    const chance = trip.choices[0]!.effects.find((e) => e.kind === 'chance');
    expect(chance?.kind === 'chance' && chance.hitNews).toEqual(AU_PACK.events.trip.hitNews);
    expect(chance?.kind === 'chance' && chance.missNews).toBe('The trip stayed in the group chat and off the back page.');
    expect(AU_PACK.events.trip.destination).toBe('Bali');
  });

  it('leaves the deck as it is when the pack overrides no card', () => {
    expect(AU_PACK.events.cardText).toEqual({});
    expect(withCardText(EVENT_CARDS, {})).toBe(EVENT_CARDS);
  });

  it("puts a pack's text on a card and leaves its id, effects and the rest of the deck", () => {
    const deck = withCardText(EVENT_CARDS, { baliTrip: { title: 'Trip to Magaluf' } });
    const trip = deck.find((c) => c.id === 'baliTrip')!;
    expect(trip.title).toBe('Trip to Magaluf');
    expect(trip.text).toBe(cardById('baliTrip')!.text);
    expect(trip.choices).toBe(cardById('baliTrip')!.choices);
    expect(deck.filter((c) => c.id !== 'baliTrip')).toEqual(EVENT_CARDS.filter((c) => c.id !== 'baliTrip'));
  });
});

describe('re-exported constants', () => {
  it("the workers' accessors give the active pack's own sections", () => {
    expect(activeLeague()).toBe(activePack().league);
    expect(activeRules()).toBe(activePack().rules);
    expect(activeVocab()).toBe(activePack().vocab);
  });

  it('config.ts reads the active pack', () => {
    const { league } = activePack();
    expect(config.SEASON_ROUNDS).toBe(league.seasonRounds);
    expect(config.FINALS_WEEKS).toBe(league.finalsWeeks);
    expect(config.WEEKS_PER_SEASON).toBe(league.seasonRounds + league.finalsWeeks);
    expect(config.ON_FIELD).toBe(league.onField);
    expect(config.SET_TACKLES).toBe(league.setTackles);
    expect(config.FORFEIT_SCORE).toBe(league.forfeitScore);
    expect(config.SQUAD_MIN).toBe(league.squadMin);
    expect(config.SQUAD_CAP).toBe(league.squadCap);
    expect(config.LEAGUE).toBe(league.rating);
  });

  it("rules.ts's NINES is the pack's rules object, the one the harness overrides", () => {
    expect(NINES).toBe(activePack().rules);
    expect(KNOBS.rules).toBe(NINES);
  });

  it('data/league.ts and data/names.ts read the active pack', () => {
    expect(RIVAL_CLUBS).toBe(activePack().clubs);
    expect(FIRST_NAMES).toBe(activePack().names.first);
    expect(SURNAMES).toBe(activePack().names.last);
  });
});

/** A small pack that is not AU: other clubs, other names, another trip. */
function fakePack(over: Partial<ContentPack> = {}): ContentPack {
  const names = (stem: string): string[] => Array.from({ length: MIN_NAMES }, (_, i) => `${stem}${i}`);
  return {
    id: 'test',
    league: { seasonRounds: 10, finalsWeeks: 2, onField: 13, setTackles: 6, forfeitScore: 20, squadMin: 17, squadCap: 25, rating: { MEAN: 50, START_STARS: 1, START_FIRST_GRADE: 48, START_DEPTH_GAP: 6, POOL_BELOW: 2 } },
    rules: { ...AU_PACK.rules, halfMinutes: 40 },
    clubs: [
      { id: 'rival-rovers', name: 'Riverside Rovers', colors: ['#112233', '#ffeedd'], strength: 50 },
      { id: 'rival-saints', name: 'Seaside Saints', colors: ['#aa0000', '#ffffff'], strength: 55 },
    ],
    names: { first: names('First'), last: names('Last') },
    vocab: {
      iqStat: 'Game Sense',
      sport: 'league',
      stadiumSigns: { food: 'PASTIES', sport: 'LEAGUE', home: 'COME ON', snack: 'CHIPS', score: 'TRY TIME', away: 'WELCOME', cheer: 'UP THE ROVERS' },
    },
    events: {
      trip: {
        destination: 'Magaluf',
        title: 'Trip to Magaluf',
        text: 'The season is done and the squad wants a week in Magaluf.',
        outcome: 'The squad is off to Magaluf.',
        hitNews: ['{player} missed the flight home. The club has stood him down.'],
        missNews: 'Nothing came back from Magaluf but sunburn.',
      },
      cardText: { baliHangover: { text: 'A sponsor saw the Magaluf footage.' } },
    },
    ...over,
  };
}

describe('validatePack', () => {
  it('accepts a minimal pack with other clubs and other trip text', () => {
    const pack = fakePack();
    expect(validatePack(pack)).toEqual([]);
    expect(inlineIqStat(pack)).toBe('game Sense');
  });

  it('rejects clubs that share an id, or use the player id', () => {
    const [a, b] = fakePack().clubs;
    expect(validatePack(fakePack({ clubs: [a!, { ...b!, id: a!.id }] }))).toEqual([`club id "${a!.id}" is used twice`]);
    expect(validatePack(fakePack({ clubs: [{ ...a!, id: 'player' }] }))).toHaveLength(1);
  });

  it('rejects a club without two hex colours', () => {
    const [a] = fakePack().clubs;
    const bad = { ...a!, colors: ['#112233', 'red'] as [string, string] };
    expect(validatePack(fakePack({ clubs: [bad] }))).toEqual([`club "${a!.id}" needs two hex colours`]);
  });

  it('rejects too few names', () => {
    const pack = fakePack();
    const short = fakePack({ names: { first: pack.names.first.slice(0, MIN_NAMES - 1), last: pack.names.last } });
    expect(validatePack(short)).toEqual([`first names: ${MIN_NAMES - 1} unique, need ${MIN_NAMES}`]);
  });

  it('rejects a season with no rounds', () => {
    const pack = fakePack();
    expect(validatePack(fakePack({ league: { ...pack.league, seasonRounds: 0 } }))).toHaveLength(1);
    expect(validatePack(fakePack({ league: { ...pack.league, seasonRounds: -3 } }))).toHaveLength(1);
  });

  it('rejects a squad that cannot field a side, and an empty league', () => {
    const pack = fakePack();
    expect(validatePack(fakePack({ league: { ...pack.league, squadMin: 12 } }))).toEqual(['squadMin 12 cannot field 13']);
    expect(validatePack(fakePack({ clubs: [] }))).toEqual(['pack has no clubs']);
  });
});
