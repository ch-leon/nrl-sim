// GitHub #46: full-time Player of the Match modal (separate from matchOverlay).
import { bus } from '../../core/events';
import { getState } from '../../core/state';
import type { MatchResult } from '../../sim/events';
import { playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { el, button, openModal, closeModal } from '../dom';

/** One-line stat summary, e.g. "2 tries · 14 tackles · 1 line break". */
export function fmtPotmLine(p: PlayerOfMatch): string {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  return [n(p.tries, 'try', 'tries'), n(p.tackles, 'tackle', 'tackles'), n(p.lineBreaks, 'line break', 'line breaks')].join(' · ');
}

export function openPlayerOfMatchModal(p: PlayerOfMatch, clubName: string, own: boolean): HTMLElement {
  const content = el('div', { class: 'nrl-potm' });
  content.append(
    el('h2', { text: 'Player of the Match' }),
    el('p', { text: `${p.name}${own ? ` (${clubName})` : ''}` }),
    el('p', { text: fmtPotmLine(p) }),
    button('Close', () => closeModal()),
  );
  return openModal(content, { class: 'nrl-potm-modal' });
}

/** Show the modal on every full-time. Returns unsubscribe. */
export function initPlayerOfMatch(): () => void {
  return bus.on('match:finished', ({ fixture, result }: { fixture: { homeId: string; awayId: string }; result: MatchResult }) => {
    const p = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
    if (!p) return;
    openPlayerOfMatchModal(p, getState().clubName, p.teamId === 'player');
  });
}
