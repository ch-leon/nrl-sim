import type { Fixture, GameState, Position } from '../core/state';
import { CARD_WEEK, cardDefById, type DecreeId } from '../data/cards';
import { isBasePlayId, PLAYS_BY_ID, type PlayId } from '../data/plays';
import { LINEUP_SLOTS, resolveLineup, type Selection } from './lineup';
import { awayPlayerIds } from './playerAssignments';
import { validPlays } from './playbook';

const MIDDLE_POSITIONS: ReadonlySet<Position> = new Set(['prop', 'second-row', 'lock', 'hooker']);

export function currentDecree(state: Pick<GameState, 'cardWeek' | 'season'>): DecreeId | undefined {
  const decree = state.cardWeek?.decree;
  const def = decree?.season === state.season ? cardDefById(decree.id) : undefined;
  return def?.kind === 'decree' ? def.id : undefined;
}

export interface CardSheetBonuses {
  ratingByPlayer: ReadonlyMap<string, number>;
  strengthByPlayer: ReadonlyMap<string, number>;
  attack: number;
  plays: PlayId[];
  /** Part of every player's rating budget used by the levelled play effects. */
  playRating: number;
}

export function cardSheetBonuses(state: GameState, fixture: Fixture, selection?: Selection): CardSheetBonuses {
  const ratingByPlayer = new Map<string, number>();
  const strengthByPlayer = new Map<string, number>();
  const cw = state.cardWeek;
  if (!cw || (fixture.homeId !== state.clubId && fixture.awayId !== state.clubId)) return { ratingByPlayer, strengthByPlayer, attack: 0, plays: [], playRating: 0 };
  const picked = selection ?? resolveLineup(state.lineup, state.squad, awayPlayerIds(state));
  const plays = validPlays(picked.plays ?? state.lineup.plays, state.playbook.owned);
  const instance = state.competitions?.instances.find(i => i.id === fixture.competitionId);
  const neutral = instance?.fixtures.find(f => f.id === fixture.id)?.neutral;
  const home = fixture.homeId === state.clubId && !neutral;
  const decree = currentDecree(state);
  const attack = decree === 'width' && plays.some(id => PLAYS_BY_ID[id].family === 'width') ? CARD_WEEK.WIDTH_ATTACK : 0;

  // Keep the existing called-play effects on the sheet and account for
  // their level in rating points before allocating the other bonuses.
  let playRating = 0;
  const levelled = plays.map((id): PlayId => {
    if (!isBasePlayId(id)) return id;
    const ownedLevel = Math.max(1, ...cw.active.flatMap(c => c.kind === 'setPlay' && c.playId === id ? [c.level] : []));
    const room = CARD_WEEK.SHEET_BONUS_CAP - attack - playRating;
    const level = Math.min(ownedLevel, 1 + Math.floor(room / CARD_WEEK.SET_PLAY_RATING_STEP));
    playRating += (level - 1) * CARD_WEEK.SET_PLAY_RATING_STEP;
    return level === 3 ? `${id}:III` : level === 2 ? `${id}:II` : id;
  });
  const buffs = cw.active.filter(c => c.kind === 'buff').filter(c => c.season <= state.season);
  const playerBudget = CARD_WEEK.SHEET_BONUS_CAP - attack - playRating;
  const add = (id: string, position: Position, bench: boolean): void => {
    const buffLevels = new Map<string, number>();
    for (const buff of buffs) {
      if (buff.playerId !== undefined && buff.playerId !== id) continue;
      buffLevels.set(buff.cardId, Math.max(buffLevels.get(buff.cardId) ?? 0, CARD_WEEK.BUFF_RATING[buff.level]));
    }
    const buffRating = [...buffLevels.values()].reduce((total, amount) => total + amount, 0);
    let decreeRating = 0;
    const strength = decree === 'throughTheMiddle' && MIDDLE_POSITIONS.has(position)
      ? Math.min(playerBudget, CARD_WEEK.MIDDLE_STRENGTH) : 0;
    if (strength > 0) strengthByPlayer.set(id, strength);
    if (decree === 'fortress' && home && !bench) decreeRating = CARD_WEEK.FORTRESS_RATING;
    if (decree === 'nextManUp' && bench) decreeRating = CARD_WEEK.BENCH_RATING;
    // Team attack also benefits players, so reserve that part of each cap.
    const rating = Math.min(playerBudget - strength, buffRating + decreeRating);
    if (rating > 0) ratingByPlayer.set(id, rating);
  };
  picked.starters.forEach((p, i) => { if (p) add(p.id, LINEUP_SLOTS[i]!, false); });
  picked.bench.forEach(p => add(p.id, p.position, true));
  return { ratingByPlayer, strengthByPlayer, attack, plays: levelled, playRating };
}
