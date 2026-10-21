// src/data/events.ts — the random events deck (GitHub #75). Pure data: each card
// says when it can turn up, who it is about and what each choice does. The rules
// that draw, resolve and expire cards live in src/systems/events.ts. No Phaser,
// no store.
//
// Text placeholders: {player} = the card's subject (a squad player, or a rival's
// player for 'rivalStar'), {club} = the player's club name; rival-player cards
// also have {rival}, {ovr}, {position} and {fee}. Money is in dollars; morale and
// reputation in points.
import type { TraitId } from './traits';

/** One thing a choice does. Effects on "the player" target the card's subject. */
export type EventEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'reputation'; amount: number }
  | { kind: 'squadMorale'; amount: number }
  | { kind: 'playerMorale'; amount: number }
  /** Pay rise (or cut) as a fraction of the current weekly wage, e.g. 0.15. */
  | { kind: 'playerWage'; pct: number }
  /** Adds the trait at level I, or raises it one level (never above III). */
  | { kind: 'playerTrait'; trait: TraitId }
  /** Sign the card's rival-player subject for the fee quoted on the card (#74). */
  | { kind: 'signSubject' }
  /** A temporary modifier: `effects` fire on each matching week for `weeks` weeks. */
  | { kind: 'modifier'; label: string; trigger: ModifierTrigger; weeks: number; effects: ImmediateEffect[] };

export type ImmediateEffect = Exclude<EventEffect, { kind: 'modifier' }>;

/** When a modifier's effects fire: every week, or only on a week the club wins / loses. */
export type ModifierTrigger = 'weekly' | 'win' | 'loss';

export interface EventChoice {
  /** Button label, short enough for a phone. */
  label: string;
  effects: EventEffect[];
  /** News line once chosen (placeholders allowed). */
  outcome: string;
}

/** Which squad player a card is about. Cards with a subject skip when nobody fits. */
export type SubjectRule =
  | 'star'       // the best fit player by overall
  | 'youngster'  // the youngest fit player aged 21 or under
  | 'veteran'    // the oldest fit player aged 30 or over
  | 'unhappy'    // the lowest-morale fit player, if under 45
  | 'any'        // any fit player (seeded pick)
  | 'rivalStar'; // a rival club's best player, if they'd walk into your side (#74)

/** Conditions for a card to be drawn. Every listed condition must hold. */
export interface EventConditions {
  /** Inclusive season-week range. */
  weeks?: [number, number];
  /** Inclusive reputation range. */
  reputation?: [number, number];
  minMoney?: number;
  minFacilities?: number;
  /** The club must have a match next week (and, if set, at home / away). */
  nextMatch?: 'any' | 'home' | 'away';
}

export interface EventCardDef {
  id: string;
  title: string;
  text: string;
  /** Relative draw weight among the eligible cards. */
  weight: number;
  /** Weeks before this card can be drawn again. */
  cooldown: number;
  when?: EventConditions;
  subject?: SubjectRule;
  choices: EventChoice[];
  /** Index into `choices` taken if the card is left unanswered. */
  defaultChoice: number;
}

/** The starter deck. Order is irrelevant; ids must be unique and stable (saves keep them). */
export const EVENT_CARDS: readonly EventCardDef[] = [
  {
    id: 'billboardSponsor',
    title: 'Billboard offer',
    text: 'A local car yard offers $5,000 to put a billboard on the hill at the {club} ground.',
    weight: 10, cooldown: 20,
    choices: [
      { label: 'Take the cash', effects: [{ kind: 'money', amount: 5_000 }], outcome: 'The car yard billboard goes up on the hill.' },
      { label: 'Keep it clean', effects: [{ kind: 'reputation', amount: 1 }], outcome: 'The fans like the clear view of the hill.' },
    ],
    defaultChoice: 0,
  },
  {
    id: 'starPayRise',
    title: 'Pay rise demand',
    text: '{player} wants a 15% pay rise and is threatening to sulk if the club says no.',
    weight: 8, cooldown: 30, subject: 'star',
    choices: [
      { label: 'Pay up (+15%)', effects: [{ kind: 'playerWage', pct: 0.15 }, { kind: 'playerMorale', amount: 15 }], outcome: '{player} gets the pay rise and is all smiles.' },
      { label: 'Say no', effects: [{ kind: 'playerMorale', amount: -20 }], outcome: '{player} is sulking after the club refused a pay rise.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'tvFeature',
    title: 'TV feature',
    text: 'A TV crew wants to follow the squad this week. A win on camera would do wonders; a loss will be replayed all week.',
    weight: 8, cooldown: 12, when: { nextMatch: 'any', weeks: [1, 24] },
    choices: [
      {
        label: 'Let them in',
        effects: [
          { kind: 'modifier', label: 'TV feature: win next week', trigger: 'win', weeks: 1, effects: [{ kind: 'reputation', amount: 4 }] },
          { kind: 'modifier', label: 'TV feature: lose next week', trigger: 'loss', weeks: 1, effects: [{ kind: 'reputation', amount: -1 }] },
        ],
        outcome: 'The TV crew is filming the squad this week.',
      },
      { label: 'Closed doors', effects: [], outcome: 'The club turned the TV crew away.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'fanDay',
    title: 'Fan day',
    text: 'The supporters\' group asks for an open training day with a sausage sizzle. It costs $5,000 to run.',
    weight: 8, cooldown: 16, when: { minMoney: 5_000 },
    choices: [
      { label: 'Run it ($5k)', effects: [{ kind: 'money', amount: -5_000 }, { kind: 'squadMorale', amount: 6 }, { kind: 'reputation', amount: 1 }], outcome: 'Fan day was a hit: the squad loved it.' },
      { label: 'Not this year', effects: [], outcome: 'No fan day this year.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'charityGala',
    title: 'Charity gala',
    text: 'A children\'s hospital asks for {player} to speak at its charity gala.',
    weight: 6, cooldown: 20, subject: 'any',
    choices: [
      { label: 'Send them', effects: [{ kind: 'playerMorale', amount: 5 }, { kind: 'reputation', amount: 2 }], outcome: '{player} was a star at the charity gala.' },
      { label: 'Training first', effects: [], outcome: '{player} stayed home to train.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'homesick',
    title: 'Homesick youngster',
    text: '{player} is homesick and not sleeping. Flying the family in for a week costs $2,000.',
    weight: 6, cooldown: 20, subject: 'youngster',
    choices: [
      { label: 'Fly them in ($2k)', effects: [{ kind: 'money', amount: -2_000 }, { kind: 'playerMorale', amount: 15 }], outcome: '{player} is beaming after a week with family.' },
      { label: 'Tough love', effects: [{ kind: 'playerMorale', amount: -10 }], outcome: '{player} is still homesick.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'veteranMentor',
    title: 'Mentor sessions',
    text: '{player} offers to run extra sessions for the young players. The club would cover $3,000 in costs.',
    weight: 5, cooldown: 24, subject: 'veteran', when: { minMoney: 3_000 },
    choices: [
      { label: 'Back it ($3k)', effects: [{ kind: 'money', amount: -3_000 }, { kind: 'squadMorale', amount: 3 }, { kind: 'playerMorale', amount: 5 }], outcome: '{player}\'s sessions have lifted the whole squad.' },
      { label: 'Not now', effects: [{ kind: 'playerMorale', amount: -5 }], outcome: '{player} is disappointed the club said no.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'preseasonCamp',
    title: 'Coastal camp',
    text: 'A beach resort offers the squad a cut-price training camp for $10,000.',
    weight: 8, cooldown: 27, when: { weeks: [1, 4], minMoney: 10_000 },
    choices: [
      { label: 'Book it ($10k)', effects: [{ kind: 'money', amount: -10_000 }, { kind: 'squadMorale', amount: 8 }], outcome: 'The squad is back from camp tanned and together.' },
      { label: 'Train at home', effects: [], outcome: 'The squad trains at home.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'radioGaffe',
    title: 'Radio gaffe',
    text: '{player} said something daft about the referees on breakfast radio.',
    weight: 6, cooldown: 20, subject: 'any',
    choices: [
      { label: 'Fine them $600', effects: [{ kind: 'money', amount: 600 }, { kind: 'playerMorale', amount: -10 }, { kind: 'reputation', amount: 1 }], outcome: '{player} was fined $600 for the radio gaffe.' },
      { label: 'Back them', effects: [{ kind: 'playerMorale', amount: 8 }, { kind: 'reputation', amount: -3 }], outcome: 'The club stood by {player}; the papers were less kind.' },
    ],
    defaultChoice: 0,
  },
  {
    id: 'merchDeal',
    title: 'Merchandise deal',
    text: 'A merch company wants the rights to {club} jerseys: $7,000 now, or $900 a week for 12 weeks.',
    weight: 6, cooldown: 40, when: { reputation: [30, 100] },
    choices: [
      { label: '$7k now', effects: [{ kind: 'money', amount: 7_000 }], outcome: 'The merch deal paid $7,000 up front.' },
      { label: '$900 a week', effects: [{ kind: 'modifier', label: 'Merch royalties', trigger: 'weekly', weeks: 12, effects: [{ kind: 'money', amount: 900 }] }], outcome: 'Merch royalties will pay $900 a week for 12 weeks.' },
    ],
    defaultChoice: 0,
  },
  {
    id: 'stormDamage',
    title: 'Storm damage',
    text: 'A storm ripped through the grounds overnight. A proper repair costs $6,000.',
    weight: 5, cooldown: 30, when: { minFacilities: 1 },
    choices: [
      { label: 'Repair ($6k)', effects: [{ kind: 'money', amount: -6_000 }], outcome: 'The grounds are repaired after the storm.' },
      { label: 'Patch it up', effects: [{ kind: 'squadMorale', amount: -5 }, { kind: 'reputation', amount: -1 }], outcome: 'The patched-up grounds are getting the squad down.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'councilClinics',
    title: 'Junior clinics',
    text: 'The council will pay $3,000 if the squad runs junior clinics on their day off.',
    weight: 6, cooldown: 24,
    choices: [
      { label: 'Run them (+$3k)', effects: [{ kind: 'money', amount: 3_000 }, { kind: 'squadMorale', amount: -2 }, { kind: 'reputation', amount: 1 }], outcome: 'The squad ran the junior clinics for the council.' },
      { label: 'Rest day', effects: [], outcome: 'The squad kept its day off.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'specialistCoach',
    title: 'Specialist coach',
    text: 'A famous conditioning coach is in town and offers {player} a week of one-on-one work for $8,000.',
    weight: 4, cooldown: 40, subject: 'youngster', when: { minMoney: 8_000 },
    choices: [
      { label: 'Hire ($8k)', effects: [{ kind: 'money', amount: -8_000 }, { kind: 'playerTrait', trait: 'workhorse' }], outcome: '{player} came back from the week a workhorse.' },
      { label: 'Too dear', effects: [], outcome: 'The club passed on the specialist coach.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'shortsSponsor',
    title: 'Win bonus sponsor',
    text: 'A pizza chain will pay $2,000 for every win in the next 4 weeks if its logo goes on the shorts.',
    weight: 7, cooldown: 20, when: { weeks: [1, 20] },
    choices: [
      { label: 'Deal', effects: [{ kind: 'modifier', label: 'Pizza win bonus', trigger: 'win', weeks: 4, effects: [{ kind: 'money', amount: 2_000 }] }], outcome: 'The pizza chain logo is on the shorts: $2,000 a win for 4 weeks.' },
      { label: 'No thanks', effects: [], outcome: 'The shorts stay sponsor-free.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'unhappyTalk',
    title: 'Unsettled player',
    text: '{player} is unhappy and has asked for a meeting with the coach.',
    weight: 7, cooldown: 12, subject: 'unhappy',
    choices: [
      { label: 'Sit down', effects: [{ kind: 'playerMorale', amount: 12 }, { kind: 'squadMorale', amount: -1 }], outcome: 'A long chat has {player} feeling better.' },
      { label: 'Ignore it', effects: [{ kind: 'playerMorale', amount: -8 }], outcome: '{player} feels ignored.' },
    ],
    defaultChoice: 1,
  },
  {
    id: 'foodTruck',
    title: 'Food truck',
    text: 'A food truck wants to park at home games and will pay $250 a week for 8 weeks.',
    weight: 6, cooldown: 30, when: { nextMatch: 'home' },
    choices: [
      { label: 'Let it park', effects: [{ kind: 'modifier', label: 'Food truck rent', trigger: 'weekly', weeks: 8, effects: [{ kind: 'money', amount: 250 }] }], outcome: 'The food truck pays $250 a week for 8 weeks.' },
      { label: 'Club canteen only', effects: [{ kind: 'squadMorale', amount: 1 }], outcome: 'The canteen staff are pleased to keep the trade.' },
    ],
    defaultChoice: 0,
  },
  {
    id: 'rivalUnsettled',
    title: 'Unsettled at a rival',
    text: '{player}, a {ovr}-rated {position}, wants out of {rival} and would join {club} for a {fee} signing fee.',
    weight: 6, cooldown: 30, subject: 'rivalStar', when: { weeks: [1, 24] },
    choices: [
      { label: 'Sign them', effects: [{ kind: 'signSubject' }], outcome: '{player} has crossed from {rival} to {club}!' },
      { label: 'Not interested', effects: [], outcome: '{player} stays at {rival} for now.' },
    ],
    defaultChoice: 1,
  },
];

/** Card by id (undefined for an id no longer in the deck, e.g. from an old save). */
export function cardById(id: string): EventCardDef | undefined {
  return EVENT_CARDS.find((c) => c.id === id);
}
