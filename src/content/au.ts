// src/content/au.ts — the AU pack (GitHub #361): today's game, a Nines league of
// invented Aussie clubs. Every value here is the one the game shipped with
// before packs; config.ts, match/league/rules.ts and src/data/* re-export them
// under their old names. Change a value here and its tuning-reference row with it.
//
// The league, the rules and the words are exported on their own as well: the
// match and art workers read only those (src/content/index.ts activeLeague and
// friends), so the clubs, names and card text stay out of their bundles.
import type { ContentPack, LeagueShape, MatchRules, Vocabulary } from './pack';

/**
 * The Nines rules (tuning reference §13; match/league/rules.ts says how they
 * play and why the halves are 7:00). Re-exported as NINES, the object the
 * balance harness overrides by name (tuning.ts), so it is not frozen.
 */
export const AU_RULES: MatchRules = {
  /** Length of each half, minutes of sim time. Was 9. */
  halfMinutes: 7,
  /** Points for a try, a conversion (a drop kick in Nines) and a field goal (penalty goals come with 2e). */
  tryPoints: 4,
  /** A try grounded in the bonus zone, the in-goal between the posts (Nines; goals.ts). */
  bonusTryPoints: 5,
  conversionPoints: 2,
  fieldGoalPoints: 1,
  /** The half-time break on screen, ticks (3 s), before the second-half kick-off. */
  halfTimeTicks: 60,
  /** At half-time each player gets back this share of the legs he has lost (BAK-208 §8.2). */
  halfTimeLegsBack: 0.5,
  /** After the siren the half ends at the next dead ball, or after this many seconds whatever happens. */
  playOnMaxS: 60,
  /**
   * Golden point (N9.4): a final level at full time plays on this many minutes, next score wins (0 = no golden point).
   * Was 5 of an 18-minute match. 5 × 7/9 ≈ 3.9; 4 keeps that share of a 14-minute match (4/14 against 5/18).
   */
  goldenPointMinutes: 4,
  /** The break before golden point, ticks (2 s); no legs come back in it. */
  goldenPointBreakTicks: 40,
};

export const AU_LEAGUE: LeagueShape = {
  seasonRounds: 24,  // home & away vs 15 rivals + repeats
  finalsWeeks: 3,    // weeks 25-27 if qualified
  onField: 9,        // Nines trial — BAK-206 / #1
  setTackles: 5,     // Nines trial — BAK-206 / #1
  forfeitScore: 24,
  squadMin: 13,
  squadCap: 30,
  // config.ts LEAGUE (N5, #140; #148) says what each of these does.
  rating: {
    MEAN: 55,
    START_STARS: 1,
    START_FIRST_GRADE: 52,
    START_DEPTH_GAP: 8,
    POOL_BELOW: 3,
  },
};

export const AU_VOCAB: Vocabulary = {
  iqStat: 'Footy IQ',
  sport: 'footy',
  stadiumSigns: {
    food: 'MEAT PIES',
    sport: 'FOOTY',
    home: 'GO TEAM',
    snack: 'SNAGS',
    score: 'TRY TIME',
    away: 'WELCOME',
    cheer: 'GO HARD',
  },
};

export const AU_PACK: ContentPack = {
  id: 'au',
  league: AU_LEAGUE,
  rules: AU_RULES,

  // The 15 fictional rival clubs (BAK-184, WU-7). Invented Aussie rugby-league
  // flavour ONLY: no real NRL club names or trademarks, and no nickname another
  // code's club is known by (#398: the Brumbies and the Mariners became the
  // Bushrangers and the Marlins; their ids stay, as saves and seeds key on them;
  // tests/content/names.test.ts blocks the NRL nicknames). Each club carries two hex
  // kit colours (cosmetic) and a `strength` baseline (42–70, spread around
  // LEAGUE.MEAN) that seeds each rival's squad at a new game (systems/rivals.ts),
  // rival team sheets (src/match/league/sheets.ts teamSheetFromRival) and the
  // cheap round sim. `strength` is spread across the 42–70 band, two points apart
  // and centred on LEAGUE.MEAN (a mix of cellar-dwellers, mid-table sides and
  // title contenders) so the ladder has a believable shape before the player's
  // results land: a 35 side lost every week and a 78 side ran away (#140). ids
  // are stable, kebab-case, and prefixed `rival-` so they never collide with the
  // player's `'player'` id. New games only — a save's rivals keep the strength
  // their squads give them.
  clubs: [
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
  ],

  // Fictional name pools (BAK-166; #398). Invented surnames only: Anglo-Australian,
  // Pacific- and Māori-sounding, and a footy-flavoured twenty for fun. None is a
  // current NRL or NRLW player's surname, a pun on one, or a well-known name from
  // the game's past (tests/content/names.test.ts holds the block list). Order
  // matters: the seeded picker indexes into them, so reordering renames every
  // generated player in a new career (a save keeps the names it has).
  names: {
    first: [
      'Jarrah', 'Kobi', 'Reece', 'Tane', 'Bailey', 'Cooper', 'Kade', 'Jaxon',
      'Ryder', 'Hayden', 'Brayden', 'Lachie', 'Beau', 'Digger', 'Macca',
      'Nash', 'Zane', 'Corey', 'Blake', 'Darcy', 'Flynn', 'Hunter', 'Jett',
      'Kane', 'Levi', 'Marley', 'Nate', 'Ollie', 'Rhys', 'Sonny', 'Tyrese',
      'Wade', 'Xavier', 'Zeke', 'Angus', 'Bodhi', 'Cruz', 'Deakin', 'Ezra',
      'Finn', 'Archie', 'Brodie', 'Cash', 'Dane', 'Eli', 'Fletcher', 'Harley',
      'Isaac', 'Jed', 'Koa', 'Lenny', 'Mitch', 'Rafe', 'Rocco', 'Sione',
      'Taj', 'Toby', 'Wiremu', 'Sully', 'Tama',
    ],
    last: [
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
    ],
  },

  vocab: AU_VOCAB,

  events: {
    // The end-of-season trip (#324, #325): card `baliTrip`, flag `baliIncident`.
    trip: {
      destination: 'Bali',
      title: 'Trip to Bali',
      text: 'The season is done and the squad wants the end-of-season trip to Bali. The group chat is already full of jet skis.',
      outcome: 'The squad is off to Bali.',
      hitNews: [
        '{player} came off a jet ski on day two. The clip is everywhere, and the club has stood him down.',
        '{player} missed the flight home. The airport-bar video is doing the rounds, and the club has stood him down.',
        '{player} came back with the club crest tattooed upside down and a bar tab the sponsor has already seen. The club has stood him down.',
      ],
      missNews: 'The trip stayed in the group chat and off the back page.',
    },
    cardText: {},
  },
};
