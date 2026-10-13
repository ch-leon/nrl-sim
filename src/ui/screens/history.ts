// src/ui/screens/history.ts — season-end feedback + past-seasons History screen
// (GitHub #3 / BAK-206 backlog S2). Pure helpers are exported for node tests;
// DOM open/init follow the fixtures.ts / hud.ts conventions (no Phaser).

import { bus } from '../../core/events';
import { getState, type GameState } from '../../core/state';
import { el, panel, button, openModal, closeModal } from '../dom';

export interface SeasonHistoryEntry {
  season: number;
  ladderPosition: number;
  premiership: boolean;
}

/**
 * One-line season summary, e.g. "Season 1 — finished 4th" or
 * "Season 2 — PREMIERS (ladder 2nd)".
 */
export function fmtSeasonSummary(entry: SeasonHistoryEntry): string {
  const pos = entry.ladderPosition > 0 ? ordinal(entry.ladderPosition) : 'unranked';
  if (entry.premiership) {
    return `Season ${entry.season} — PREMIERS (ladder ${pos})`;
  }
  return `Season ${entry.season} — finished ${pos}`;
}

/** Toast copy for the season:ended event. */
export function fmtSeasonEndToast(entry: SeasonHistoryEntry): string {
  if (entry.premiership) {
    return `Season ${entry.season} complete — PREMIERS! (ladder ${ordinal(entry.ladderPosition)})`;
  }
  if (entry.ladderPosition > 0) {
    return `Season ${entry.season} complete — finished ${ordinal(entry.ladderPosition)} on the ladder.`;
  }
  return `Season ${entry.season} complete.`;
}

/** Kind for the season-end toast. */
export function seasonEndToastKind(
  entry: SeasonHistoryEntry,
): 'info' | 'success' | 'danger' {
  if (entry.premiership) return 'success';
  if (entry.ladderPosition > 0 && entry.ladderPosition <= 8) return 'info';
  return 'info';
}

function ordinal(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** History entries newest-first for display. */
export function historyNewestFirst(
  history: readonly SeasonHistoryEntry[],
): SeasonHistoryEntry[] {
  return history.slice().reverse();
}

/** Open the History modal listing past seasons from GameState.history. */
export function openHistoryScreen(): HTMLElement {
  const state = getState();
  const content = el('div', { class: 'nrl-history' });
  content.append(el('h2', { text: 'Season History' }));

  if (state.history.length === 0) {
    content.append(panel({}, el('p', { text: 'No completed seasons yet — finish a season to see results here.' })));
  } else {
    const list = el('div', { class: 'nrl-history-list' });
    for (const entry of historyNewestFirst(state.history)) {
      const line = el('div', {
        class: entry.premiership ? 'nrl-history-row nrl-history-premiers' : 'nrl-history-row',
        text: fmtSeasonSummary(entry),
      });
      list.append(line);
    }
    content.append(list);
  }

  content.append(button('Close', () => closeModal()));
  return openModal(content, { class: 'nrl-history-modal' });
}

/**
 * Subscribe to season:ended and surface a clear toast with ladder position /
 * premiership. Idempotent if called once from main.ts. Returns unsubscribe.
 */
export function initSeasonEndFeedback(): () => void {
  return bus.on('season:ended', ({ season, ladderPosition, premiership }) => {
    const entry = { season, ladderPosition, premiership };
    bus.emit('ui:notify', {
      text: fmtSeasonEndToast(entry),
      kind: seasonEndToastKind(entry),
    });
  });
}

/** Latest history entry from state, if any. */
export function latestHistoryEntry(state: GameState): SeasonHistoryEntry | undefined {
  return state.history.length > 0
    ? state.history[state.history.length - 1]
    : undefined;
}
