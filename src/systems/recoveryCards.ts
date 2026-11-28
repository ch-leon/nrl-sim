// #856: one-shot, free squad recovery, kept separate from persistent card upgrades.
import type { GameState, Player } from '../core/state';
import { CARD_RECOVERY, RECOVERY_CARDS, RECOVERY_CARD_SAVE_VERSION, WEEKLY_FATIGUE, type RecoveryCardDef, type RecoveryCardId } from '../data/cards';
import { weeklyFatigueOf } from './weeklyFatigue';

function recoveryPlayers(state: GameState, card: RecoveryCardId): Player[] {
  return state.squad.filter(p => card === 'injuryRepair'
    ? p.injuredWeeks >= CARD_RECOVERY.INJURY_REPAIR_MIN_WEEKS
    : weeklyFatigueOf(state, p.id) > WEEKLY_FATIGUE.MIN);
}

/** Eligible faces even when the hand is full; they can still be played from the pick. */
export function recoveryCandidates(state: GameState): RecoveryCardDef[] {
  if (!state.cardWeek || state.version < RECOVERY_CARD_SAVE_VERSION) return [];
  return RECOVERY_CARDS.filter(card => recoveryPlayers(state, card.id).length > 0);
}

function injuryAfter(before: number): number {
  return Math.max(0, before - CARD_RECOVERY.INJURY_REPAIR_WEEKS);
}

function weeksOut(weeks: number): string {
  return weeks === 0 ? 'No injury' : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} out`;
}

export function recoveryTargetViews(state: GameState, id: RecoveryCardId) {
  return id === 'iceBaths' ? undefined : recoveryPlayers(state, id).map(player => ({
    playerId: player.id, name: player.name,
    label: id === 'injuryRepair'
      ? `${weeksOut(player.injuredWeeks)} → ${weeksOut(injuryAfter(player.injuredWeeks))}`
      : `Fatigue ${weeklyFatigueOf(state, player.id)} → 0`,
  }));
}

export function recoveryEffect(id: RecoveryCardId): string {
  switch (id) {
    case 'fatigueWipe': return "Clear one player's fatigue. Free to play.";
    case 'iceBaths': return `Whole squad: −${CARD_RECOVERY.ICE_BATHS_FATIGUE} fatigue. Free to play.`;
    case 'injuryRepair': return `One injured player: −${CARD_RECOVERY.INJURY_REPAIR_WEEKS} weeks out. Free to play.`;
  }
}

/** Update current squad state only; caller handles the pick/hand and records the receipt. */
export function applyRecoveryCard(state: GameState, card: RecoveryCardDef, targetId?: string): { state: GameState; outcome: string } | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const players = recoveryPlayers(state, card.id);
  if (!players.length) return card.id === 'injuryRepair'
    ? 'No squad player has at least one week left injured.'
    : 'No squad player is carrying fatigue.';

  if (card.id === 'iceBaths') {
    const weeklyFatigue = { ...cw.weeklyFatigue };
    for (const player of players) {
      const remaining = Math.max(WEEKLY_FATIGUE.MIN, weeklyFatigueOf(state, player.id) - CARD_RECOVERY.ICE_BATHS_FATIGUE);
      if (remaining > WEEKLY_FATIGUE.MIN) weeklyFatigue[player.id] = remaining;
      else delete weeklyFatigue[player.id];
    }
    return { state: { ...state, cardWeek: { ...cw, weeklyFatigue } }, outcome: `Ice baths: up to ${CARD_RECOVERY.ICE_BATHS_FATIGUE} less fatigue for every squad player.` };
  }

  if (!targetId) return card.id === 'injuryRepair' ? 'Choose an injured player.' : 'Choose a tired player.';
  const player = players.find(p => p.id === targetId);
  if (!player) return card.id === 'injuryRepair'
    ? 'Choose a squad player with at least one week left injured.'
    : 'Choose a squad player carrying fatigue.';
  if (card.id === 'injuryRepair') {
    const injuredWeeks = injuryAfter(player.injuredWeeks);
    const squad = state.squad.map(p => p === player ? { ...p, injuredWeeks } : p);
    return { state: { ...state, squad }, outcome: injuredWeeks > 0
      ? `${player.name} now has ${weeksOut(injuredWeeks)}.` : `${player.name} has recovered from injury.` };
  }
  const weeklyFatigue = { ...cw.weeklyFatigue };
  delete weeklyFatigue[player.id];
  return { state: { ...state, cardWeek: { ...cw, weeklyFatigue } }, outcome: `${player.name}'s fatigue is back to 0.` };
}
