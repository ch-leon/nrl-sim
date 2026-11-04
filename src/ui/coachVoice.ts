// The same speaker in the existing channels; presentation only, never saved.
import { coachFaceDataUrl } from '../art/coachFace';
import { el } from './dom';
import type { WeekSummary } from './weekSummary';

export const COACH_NAME = 'Mick Dorney';
export const COACH_ROLE = 'Football manager';

export const SUMMARY_REMARKS = {
  loss: 'That is a heavy week on the books; check the costs before spending again.',
  injury: 'We have men on the sidelines; check the lineup before the next match.',
  worried: 'The board needs progress; start with the objective furthest off track.',
  watching: 'The board is watching; keep the season goals in view.',
  good: 'The books are ahead this week; keep some aside for the lean ones.',
  quiet: 'A quiet week; keep the training going and the bills covered.',
} as const;

/** A heavy loss costs at least as much as all the week's income (minimum $5k). */
export function summaryRemark(v: WeekSummary): string {
  if (v.net <= -Math.max(5_000, v.moneyIn)) return SUMMARY_REMARKS.loss;
  if (v.injuries.length) return SUMMARY_REMARKS.injury;
  if (v.board.mood === 'worried') return SUMMARY_REMARKS.worried;
  if (v.board.mood === 'watching') return SUMMARY_REMARKS.watching;
  if (v.net > 0) return SUMMARY_REMARKS.good;
  return SUMMARY_REMARKS.quiet;
}

export const EVENT_COMMENTS: Readonly<Record<string, string>> = {
  billboardSponsor: 'A billboard pays once; weigh it against what the club stands for.',
  starPayRise: 'A pay rise stays on the books long after the argument is over.',
  tvFeature: 'Cameras do not win matches; keep the squad on the job.',
  fanDay: 'Supporters keep a club alive; check we can cover the cost.',
  charityGala: 'A club has neighbours as well as opponents.',
  homesick: 'A young player needs more than a training schedule.',
  preseasonCamp: 'A camp costs money; make sure the work is worth it.',
};

/** Compact enough for a tutorial bar, with the role available to assistive tools. */
export function coachLine(text: string, opts: { class?: string } = {}): HTMLElement {
  ensureCoachStyles();
  return el('div', { class: `nrl-coach-line${opts.class ? ` ${opts.class}` : ''}`, attrs: { 'data-coach-line': '' } },
    el('img', { class: 'nrl-coach-face', attrs: { src: coachFaceDataUrl(), alt: '', width: '32', height: '32' } }),
    el('div', { class: 'nrl-coach-copy' },
      el('b', { class: 'nrl-coach-name', text: COACH_NAME, attrs: { title: COACH_ROLE } }),
      el('span', { class: 'nrl-coach-text', text })));
}

function ensureCoachStyles(): void {
  if (document.getElementById('nrl-coach-styles')) return;
  const style = document.createElement('style');
  style.id = 'nrl-coach-styles';
  style.textContent = `
.nrl-coach-line { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 0.8125rem; line-height: 1.3; }
.nrl-coach-face { width: 32px; height: 32px; flex: 0 0 32px; image-rendering: pixelated; }
.nrl-coach-copy { min-width: 0; overflow-wrap: anywhere; }
.nrl-coach-name { color: var(--nrl-accent, #f4d03f); margin-right: 0.5em; }
.nrl-coach-text { color: var(--nrl-text-2, #c9d1ea); }
.nrl-event-card > .nrl-coach-line { margin: 6px 0; }
/* The existing summary body scrolls; its two actions stay outside that scroll. */
.nrl-summary-modal .nrl-modal-scroll:has(.nrl-summary) { display: flex; flex-direction: column; overflow: hidden; }
.nrl-summary { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.nrl-summary > h2, .nrl-summary > .nrl-coach-line, .nrl-summary > .nrl-decisions-actions { flex-shrink: 0; }
.nrl-summary > .nrl-coach-line { margin-bottom: 4px; }
.nrl-summary-cols { min-height: 0; overflow-y: auto; }
`;
  document.head.appendChild(style);
}
