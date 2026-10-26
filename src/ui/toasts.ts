// src/ui/toasts.ts — the toast renderer for 'ui:notify' (the §5 event every
// system emits). Placement lives in the shared stylesheet (.nrl-toast-stack: just
// below the HUD, above open screens); the match overlay re-anchors it clear of the
// scoreboard and the stats.
//
// #339: while a match is on screen (live, and full time until Back to Club) only
// the match's own toasts show. A club toast waits, and they all show once the club
// is back; the news inbox has every one either way.
import { bus, type Events } from '../core/events';
import { ensureStyles } from './dom';

type Notice = Events['ui:notify'];

/** How long a toast stays up. */
export const TOAST_MS = 4000;
/** Body class the match overlay sets while it is up (matchOverlay.ts MATCH_ACTIVE_CLASS). */
const MATCH_ON_CLASS = 'nrl-match-active';

/** A toast that waits for the club: anything not about the match while a match is on screen. */
export function toastWaits(n: Notice, matchOn: boolean): boolean {
  return matchOn && n.match !== true;
}

/** Mount the toast stack in `root` and show 'ui:notify' as toasts. */
export function initToasts(root: HTMLElement): void {
  ensureStyles();
  const stack = document.createElement('div');
  stack.className = 'nrl-toast-stack';
  // #45: announce toasts to screen readers without stealing focus.
  stack.setAttribute('aria-live', 'polite');
  root.appendChild(stack);
  const show = (n: Notice): void => {
    const toast = document.createElement('div');
    toast.className = `nrl-toast nrl-toast-${n.kind}`;
    toast.textContent = n.text;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), TOAST_MS);
  };
  const matchOn = (): boolean => document.body.classList.contains(MATCH_ON_CLASS);
  let waiting: Notice[] = [];
  bus.on('ui:notify', (n) => {
    if (n.quiet) return; // already on screen (the season review, N14)
    if (toastWaits(n, matchOn())) waiting.push(n);
    else show(n);
  });
  new MutationObserver(() => {
    if (matchOn() || waiting.length === 0) return;
    const due = waiting;
    waiting = [];
    for (const n of due) show(n);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
