// src/ui/updatePrompt.ts — "New version ready: reload" (N7, GitHub #181).
//
// The service worker no longer swaps itself under a running game
// (vite.config.ts: registerType 'prompt'). When a new build is waiting,
// src/fx/pwa.ts asks this module to put up a small bar with a Reload button.
// It never appears during a match: while the match overlay is mounted <body>
// carries `nrl-match-active` (src/ui/screens/matchOverlay.ts), so the prompt
// waits for that class to go, and the stylesheet hides the bar should a match
// start while it is up. The scheduling is pure so it can be tested without a DOM.

import { button, el, ensureStyles, mount } from './dom';

/** Mirrors MATCH_ACTIVE_CLASS in screens/matchOverlay.ts (a test keeps them equal). */
export const MATCH_ACTIVE_CLASS = 'nrl-match-active';

/** What the scheduler needs from its surroundings. */
export interface UpdatePromptHooks {
  /** Is a match on screen right now? */
  matchActive(): boolean;
  /** Call `cb` each time the match flag may have changed; returns a disposer. */
  onMatchFlagChange(cb: () => void): () => void;
  /** Put the prompt up. */
  show(): void;
}

/**
 * Show the prompt now, or once the match on screen has ended. Returns what it
 * did. The deferred show happens exactly once, the first time the flag is seen
 * clear, and then stops listening.
 */
export function scheduleUpdatePrompt(h: UpdatePromptHooks): 'shown' | 'deferred' {
  if (!h.matchActive()) {
    h.show();
    return 'shown';
  }
  let done = false;
  let off: (() => void) | null = null;
  const check = (): void => {
    if (done || h.matchActive()) return;
    done = true;
    off?.();
    h.show();
  };
  off = h.onMatchFlagChange(check);
  // The flag may already have cleared between the test above and subscribing.
  check();
  return 'deferred';
}

/** The real hooks for `show`: <body>'s class list watched with a MutationObserver. */
export function domMatchHooks(show: () => void): UpdatePromptHooks {
  return {
    matchActive: () => document.body.classList.contains(MATCH_ACTIVE_CLASS),
    onMatchFlagChange: (cb) => {
      if (typeof MutationObserver === 'undefined') return () => {};
      const mo = new MutationObserver(cb);
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return () => mo.disconnect();
    },
    show,
  };
}

/** The hooks that put up the update bar. */
export function domUpdateHooks(onReload: () => void): UpdatePromptHooks {
  return domMatchHooks(() => { showUpdateToast(onReload); });
}

/** Run `show` now, or once the match on screen has ended (the season review, #190, uses it too). */
export function whenNoMatch(show: () => void): 'shown' | 'deferred' {
  return scheduleUpdatePrompt(domMatchHooks(show));
}

/**
 * The bar itself: "New version ready" with Reload and Later. One at a time; a
 * second call returns the bar already up. Later removes it until the next load
 * (the waiting worker takes over on its own once every tab of the game closes).
 */
export function showUpdateToast(onReload: () => void): HTMLElement {
  ensureStyles();
  const existing = document.querySelector<HTMLElement>('.nrl-update-toast');
  if (existing) return existing;
  const text = el('span', { class: 'nrl-update-text', text: 'New version ready' });
  const reload = button('Reload', () => {
    reload.disabled = true;
    reload.textContent = 'Reloading…';
    onReload();
  }, { class: 'nrl-update-reload nrl-btn-primary' });
  const later = button('Later', () => toast.remove(), { class: 'nrl-update-later' });
  later.setAttribute('aria-label', 'Not now');
  const toast = el('div', { class: 'nrl-update-toast', attrs: { role: 'status', 'data-nrl-update': '' } }, text, reload, later);
  mount(toast);
  return toast;
}
