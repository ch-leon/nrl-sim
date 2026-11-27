// src/data/cards.ts — the card week deck (#846, Labs). Pure data: each card says
// what kind it is, how often it turns up and what its face promises. The rules
// that draw, resolve and take cards live in src/systems/cardWeek.ts. No Phaser,
// no store.
//
// Tiers: grey is the everyday card, gold the rarer, stronger one. Weights are
// relative within the cards eligible for a pick. Money is in dollars.
import type { AttackCoachSpeciality, Position, StaffRole } from '../core/state';
import { POSITIONS } from './player';
import { isBasePlayId } from './plays';
import type { TraitId } from './traits';

export type CardTier = 'grey' | 'gold';

/** Picks and owing (#846). Tuning values: Leon changes these. */
export const CARD_WEEK = {
  /** Picks waiting when a card-week career starts (before round 1). */
  STARTER_PICKS: 3,
  /** The most match picks that can wait; a new grant replaces the oldest at the cap. */
  MAX_OWED: 3,
  HAND_CAP: 5,
  /** Cards shown and kept in each kind of pick. */
  PICKS: {
    starter: { show: 5, keep: 1 },
    match: { show: 5, keep: 2 },
    decree: { show: 3, keep: 1 },
  },
  /** Tries at generating a player card's man before the card sits this pick out. */
  PLAYER_TRIES: 6,
  REROLL_BASE: 1_500,
  REROLL_STEP: 1_500,
  STAFF_WAGE_FACTOR: { 1: 1, 2: 0.75, 3: 0.5 },
  CASH_FACTOR: { 1: 1, 2: 1.5, 3: 2 },
  DILEMMA_MARGIN_STEP: 2,
  RECRUIT_RATING_STEP: 2,
  STRIKE_MARGIN: 24,
  STRIKE_LOSS_RUN: 3,
  STRIKE_PATIENCE_COST: 1,
  PATIENCE_FLOOR: 1,
  DECREE_MATCH: 5,
  WIDTH_ATTACK: 3,
  MIDDLE_STRENGTH: 2,
  YOUTH_MAX_AGE: 21,
  YOUTH_XP_FACTOR: 1.25,
  WAGE_SAVING_RATE: 0.05,
  FORTRESS_RATING: 2,
  BENCH_RATING: 3,
  SHEET_BONUS_CAP: 8,
  SET_PLAY_RATING_STEP: 1,
  BUFF_RATING: { 1: 2, 2: 3, 3: 4 },
} as const;

/**
 * How far above the card floor (the club's best natural player at the position,
 * systems/cardWeek.ts cardFloor) a player card's man is generated, in overall
 * points. Each of his stats lands within ±AROUND_SPREAD (6) of that, and he must
 * still beat the floor. Gold is meant to read about five stars in Local
 * (STAR_BANDS in config.ts). Tuning values: Leon changes these.
 */
export const PLAYER_CARD_MARGIN: Readonly<Record<CardTier, number>> = { grey: 4, gold: 18 };

export const SIGNATURE_TRAIT: Record<Position, TraitId> = {
  fullback: 'lastLine', winger: 'finisher', centre: 'finisher',
  'five-eighth': 'playmaker', halfback: 'playmaker', hooker: 'playmaker',
  prop: 'wreckingBall', 'second-row': 'wreckingBall', lock: 'wreckingBall',
};

interface CardBase {
  id: string;
  title: string;
  tier: CardTier;
  weight: number;
}

/** A generated player who joins now with no signing fee. */
export interface PlayerCardDef extends CardBase { kind: 'player'; position: Position; margin: number }
/** A stronger player at the cost of board patience. He plays where the club is weakest. */
export interface DilemmaCardDef extends CardBase { kind: 'dilemma'; margin: number; patience: number }
/** A hire with the appointment fee waived; his wage still runs. */
export interface StaffCardDef extends CardBase { kind: 'staff'; role: Exclude<StaffRole, 'attackCoach'> | { attackCoach: AttackCoachSpeciality } }
/** A set play the club could buy today, free. Which play is settled when it is drawn. */
export interface SetPlayCardDef extends CardBase { kind: 'setPlay' }
/** A trait for a squad member the coach chooses; a second copy raises it to II, a third to III. */
export interface TraitCardDef extends CardBase { kind: 'trait'; trait: TraitId }
/** Money now. */
export interface CashCardDef extends CardBase { kind: 'cash'; amount: number }

export type DecreeId = 'width' | 'throughTheMiddle' | 'youthFirst' | 'tightShip' | 'fortress' | 'nextManUp';
export interface DecreeCardDef extends CardBase { kind: 'decree'; id: DecreeId; effect: string }

export const DECREES: readonly DecreeCardDef[] = [
  { id: 'width', kind: 'decree', title: 'Width', tier: 'gold', weight: 0, effect: '+3 attack when you bring a width set play.' },
  { id: 'throughTheMiddle', kind: 'decree', title: 'Through the middle', tier: 'gold', weight: 0, effect: '+2 strength for props, second-rowers, locks and hookers.' },
  { id: 'youthFirst', kind: 'decree', title: 'Youth first', tier: 'gold', weight: 0, effect: 'Players aged 21 and under earn 25% more training XP.' },
  { id: 'tightShip', kind: 'decree', title: 'Tight ship', tier: 'gold', weight: 0, effect: 'Save 5% of weekly wages this season.' },
  { id: 'fortress', kind: 'decree', title: 'Fortress', tier: 'gold', weight: 0, effect: '+2 rating for every starter at home.' },
  { id: 'nextManUp', kind: 'decree', title: 'Next man up', tier: 'gold', weight: 0, effect: '+3 rating for interchange players when they come on.' },
];

export type CardDef = PlayerCardDef | DilemmaCardDef | StaffCardDef | SetPlayCardDef | TraitCardDef | CashCardDef | DecreeCardDef;
export type CardKind = CardDef['kind'];

export const CARDS: readonly CardDef[] = [
  ...DECREES,
  // Players: one per position line, the halfback the gold one.
  { id: 'fullbackSigning', kind: 'player', title: 'Fullback off the market', tier: 'grey', weight: 10, position: 'fullback', margin: PLAYER_CARD_MARGIN.grey },
  { id: 'centreSigning', kind: 'player', title: 'Centre off the market', tier: 'grey', weight: 10, position: 'centre', margin: PLAYER_CARD_MARGIN.grey },
  { id: 'hookerSigning', kind: 'player', title: 'Hooker off the market', tier: 'grey', weight: 10, position: 'hooker', margin: PLAYER_CARD_MARGIN.grey },
  { id: 'propSigning', kind: 'player', title: 'Prop off the market', tier: 'grey', weight: 10, position: 'prop', margin: PLAYER_CARD_MARGIN.grey },
  { id: 'starHalfback', kind: 'player', title: 'Star halfback', tier: 'gold', weight: 4, position: 'halfback', margin: PLAYER_CARD_MARGIN.gold },
  // Staff.
  { id: 'assistantCoach', kind: 'staff', title: 'Assistant Coach', tier: 'grey', weight: 6, role: 'assistantCoach' },
  { id: 'analyst', kind: 'staff', title: 'Analyst', tier: 'grey', weight: 6, role: 'analyst' },
  { id: 'welfareManager', kind: 'staff', title: 'Welfare Manager', tier: 'grey', weight: 6, role: 'welfare' },
  { id: 'directAttackCoach', kind: 'staff', title: 'Attack Coach (direct)', tier: 'gold', weight: 4, role: { attackCoach: 'direct' } },
  // Set play.
  { id: 'setPlay', kind: 'setPlay', title: 'Set play', tier: 'grey', weight: 8 },
  // Traits: good ones only, never the edge traits with a downside.
  { id: 'wreckingBall', kind: 'trait', title: 'Wrecking Ball', tier: 'grey', weight: 7, trait: 'wreckingBall' },
  { id: 'playmaker', kind: 'trait', title: 'Playmaker', tier: 'grey', weight: 7, trait: 'playmaker' },
  { id: 'lastLine', kind: 'trait', title: 'Last Line', tier: 'grey', weight: 7, trait: 'lastLine' },
  { id: 'finisher', kind: 'trait', title: 'Finisher', tier: 'gold', weight: 4, trait: 'finisher' },
  // Cash and the dilemma.
  { id: 'cashInjection', kind: 'cash', title: 'Cash injection', tier: 'grey', weight: 8, amount: 15_000 },
  { id: 'marqueeGamble', kind: 'dilemma', title: 'Marquee gamble', tier: 'gold', weight: 3, margin: PLAYER_CARD_MARGIN.gold, patience: -1 },
];

/** The history's id for a pick passed rather than taken. No card has it. */
export const CARD_PASS = 'pass';

const BY_ID: ReadonlyMap<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));

/** The card with `id`, or undefined (a card dropped since the save was made). */
export function cardDefById(id: string): CardDef | undefined {
  const known = BY_ID.get(id);
  if (known) return known;
  const [kind, key, ...personId] = id.split(':');
  if (kind === 'steal-player' && POSITIONS.includes(key as Position) && personId.join(':')) {
    return { id, kind: 'player', title: 'Rival signing', tier: 'grey', weight: 0, position: key as Position, margin: 0 };
  }
  if (kind === 'steal-play' && !personId.length && isBasePlayId(key)) {
    return { id, kind: 'setPlay', title: 'Rival set play', tier: 'grey', weight: 0 };
  }
  return undefined;
}
