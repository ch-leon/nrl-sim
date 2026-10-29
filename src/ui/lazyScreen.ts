// src/ui/lazyScreen.ts — a screen whose code is a separate chunk, fetched the
// first time it opens (#400). The opener stands in for the screen's own open
// function behind the same nav entry:
//
//  - Loaded already (every open after the first): it opens at once, as a static
//    import would.
//  - The first open: the chunk is fetched (from the PWA precache once the game has
//    been visited, so offline too). Under LOADING_DELAY_MS nothing shows; past it
//    the screen's slot shows its title and "Loading…" until the chunk arrives.
//  - The player moved on while it loaded (opened another screen, closed the
//    "Loading…" one, went back to the club): the late chunk is kept for next time
//    and opens nothing. A second tap of the same entry supersedes the first.
//  - The fetch failed: `failed` runs (a toast), and the next tap tries again.
import { closeScreen, el, openModal, activeScreen, screenKey } from './dom';
import { HOME_ID } from './nav';

/** Under this a first open shows nothing in between (#400's DECISION default). */
export const LOADING_DELAY_MS = 150;

/** What the opener reads and schedules, so the tests can drive it without a DOM or a clock. */
export interface LazyDeps {
  /** The open screen (any value compared by identity), or null. */
  current(): unknown;
  /** Show the screen's "Loading…" state in its slot; returns what current() then reads. */
  loading(): unknown;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
}

/**
 * An opener for a screen in its own chunk: `load` fetches the module (a dynamic
 * import()), `open` opens the screen from it. The returned promise settles when
 * the screen opened, was given up, or failed (after `failed` has run).
 */
export function lazyOpener<M>(
  load: () => Promise<M>,
  open: (mod: M) => void,
  deps: LazyDeps,
  failed: (err: unknown) => void = () => {},
): () => Promise<void> {
  let mod: M | null = null;
  let pending: Promise<M> | null = null;
  let latest = 0;
  return async () => {
    if (mod !== null) {
      open(mod);
      return;
    }
    const call = ++latest;
    const before = deps.current();
    let placeholder: unknown = null;
    let shown = false;
    const timer = deps.setTimer(() => {
      if (call !== latest) return;
      shown = true;
      placeholder = deps.loading();
    }, LOADING_DELAY_MS);
    pending ??= load();
    try {
      mod = await pending;
    } catch (err) {
      pending = null;
      deps.clearTimer(timer);
      if (call === latest) failed(err);
      return;
    }
    deps.clearTimer(timer);
    if (call !== latest) return;
    // Still where the tap left it: on the "Loading…" screen if that showed, else on whatever was open then.
    if (deps.current() !== (shown ? placeholder : before)) return;
    open(mod);
  };
}

/**
 * The DOM's deps: the screen slot, a title-and-"Loading…" sheet keyed like the real one, and real timers.
 * Upright, the Club home sheet is home (#350), as the bare grounds are sideways: it opens by itself
 * while a tile's chunk loads, so it reads as nothing open, not as the player moving on.
 */
export function screenDeps(title: string, opts: { key: string; class?: string }): LazyDeps {
  return {
    current: () => (screenKey() === HOME_ID ? null : activeScreen()),
    loading: () => {
      const body = el('div', { class: 'nrl-lazy-loading', attrs: { 'data-lazy-loading': opts.key, 'aria-busy': 'true' } });
      body.append(el('div', { class: 'nrl-screen-title', text: title }), el('p', { text: 'Loading…' }));
      openModal(body, { screen: true, key: opts.key, ...(opts.class ? { class: opts.class } : {}) });
      return activeScreen();
    },
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
}

/** Close a "Loading…" sheet that is still up after a failed fetch. */
export function closeLoading(key: string): void {
  if (activeScreen()?.querySelector(`[data-lazy-loading="${key}"]`)) closeScreen();
}
