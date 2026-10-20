// GitHub #46: full-time Player of the Match modal (separate from matchOverlay).
import { bus } from '../../core/events';
import { getState, setState } from '../../core/state';
import type { MatchResult } from '../../sim/events';
import { playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { el, button, openModal, closeModal } from '../dom';
import { MATCH_ACTIVE_CLASS } from './matchOverlay';
import { addPotm } from './seasonReview';

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
  const backdrop = openModal(content, { class: 'nrl-potm-modal', region: true });
  // #203: at full time the award card must not swallow the first tap on Back to
  // Club. Its backdrop lets taps through (only the card itself is solid), and the
  // card closes when the match view does (the overlay drops MATCH_ACTIVE_CLASS).
  backdrop.classList.add('nrl-potm-backdrop');
  const body = typeof document === 'undefined' ? null : document.body;
  if (body?.classList.contains(MATCH_ACTIVE_CLASS) && typeof MutationObserver !== 'undefined') {
    const watch = new MutationObserver(() => {
      if (!backdrop.isConnected) { watch.disconnect(); return; }
      if (!body.classList.contains(MATCH_ACTIVE_CLASS)) { watch.disconnect(); closeModal(); }
    });
    watch.observe(body, { attributes: true, attributeFilter: ['class'] });
  }
  return backdrop;
}

/** Show the modal on every full-time, and count the club's awards for the season review (#190). Returns unsubscribe. */
export function initPlayerOfMatch(): () => void {
  return bus.on('match:finished', ({ fixture, result }: { fixture: { homeId: string; awayId: string }; result: MatchResult }) => {
    const p = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
    if (!p) return;
    const s = getState();
    if (p.teamId === 'player') setState({ potmTally: addPotm(s.potmTally, s.season, p.name) });
    openPlayerOfMatchModal(p, s.clubName, p.teamId === 'player');
  });
}
