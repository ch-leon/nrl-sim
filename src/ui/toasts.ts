// src/ui/toasts.ts — the toast lane for 'ui:notify' (the §5 event every system
// emits). #339: one toast at a time with a "+n" counter for the rest, a tap
// dismisses it, and it sits where no control is:
//   - at the club, in the top bar's row between the money tile and the next-match chip
//     (screens run from the bar to the nav, so anywhere lower sits on their rows
//     and buttons);
//   - in a match, in the row under the scoreboard the open log keeps free, and
//     not while the Replay try chip or a score banner is in that row;
//   - with neither (the title, the lab), centred at the top.
// A toast's time only runs while it can be seen: under a dialog, a match card
// or the rotate card it waits.
//
// While a match is on screen (live, and full time until Back to Club) only the
// match's own toasts show. A club toast waits, and they all show once the club
// is back; the news inbox has every one either way.
import { bus, type Events } from '../core/events';
import { el, ensureStyles } from './dom';

type Notice = Events['ui:notify'];

/** Shortest and longest a toast stays in view, unless it names its own time. */
export const TOAST_MIN_MS = 2500;
export const TOAST_MAX_MS = 6500;
/** With more queued behind it, no toast stays longer than this. */
export const TOAST_BUSY_MS = 3500;
/** Body class the match overlay sets while it is up (matchOverlay.ts MATCH_ACTIVE_CLASS). */
const MATCH_ON_CLASS = 'nrl-match-active';
const TICK_MS = 200;
/** Below this the top bar's gap is too narrow to read, and the toast goes to the top centre. */
export const MIN_LANE_PX = 140;

/** A toast that waits for the club: anything not about the match while a match is on screen. */
export function toastWaits(n: Notice, matchOn: boolean): boolean {
  return matchOn && n.match !== true;
}

/** How long `n` stays in view: longer for more words and for a problem, shorter with a queue behind it. */
export function toastMs(n: Notice, queued: number): number {
  const read = 1500 + 45 * n.text.length + (n.kind === 'danger' ? 1000 : 0);
  const ms = n.ms ?? Math.min(TOAST_MAX_MS, Math.max(TOAST_MIN_MS, read));
  return queued > 0 ? Math.min(ms, TOAST_BUSY_MS) : ms;
}

/** The counter on the toast in view: how many wait behind it. */
export function queueBadge(queued: number): string {
  return queued > 0 ? `+${queued}` : '';
}

/** Mount the toast lane in `root` and show 'ui:notify' through it. */
export function initToasts(root: HTMLElement): void {
  ensureStyles();
  // Every queued toast is a child; only the first shows (#45: announced without stealing focus).
  const lane = el('div', { class: 'nrl-toast-lane', attrs: { 'aria-live': 'polite', 'data-lane': 'top' } });
  root.appendChild(lane);
  const notices = new WeakMap<Element, Notice>();
  let shown: Element | null = null;
  let left = 0;
  let last = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const matchOn = (): boolean => document.body.classList.contains(MATCH_ON_CLASS);
  const visible = (sel: string): boolean => {
    const e = document.querySelector<HTMLElement>(sel);
    return !!e && !e.hidden && e.getBoundingClientRect().height > 0;
  };
  /** The under-scoreboard row is the Replay try chip's and the score banner's while they are up. */
  const rowTaken = (): boolean => matchOn() && (visible('.nrl-mo-replay') || visible('.nrl-mo-banner'));

  const setLane = (mode: string, css: string): void => {
    if (lane.dataset.lane !== mode) lane.dataset.lane = mode;
    if (lane.style.cssText !== css) lane.style.cssText = css;
  };
  const place = (): void => {
    if (matchOn()) {
      // From the left inset (CSS) up to the stats panel on the right.
      setLane('match', '');
      const stats = document.querySelector('.nrl-mo-stats')?.getBoundingClientRect();
      if (stats && stats.width > 0) setLane('match', `width: ${Math.max(MIN_LANE_PX, Math.floor(stats.left - 8 - lane.getBoundingClientRect().left))}px;`);
      return;
    }
    const money = document.querySelector('.nrl-hud [data-hud="money"]')?.getBoundingClientRect();
    const actions = document.querySelector('.nrl-hud-actions')?.getBoundingClientRect();
    // The next-match chip is a button too, and so is the board chip beside it (#368): the lane stops short of the first shown.
    const chips = [...document.querySelectorAll('.nrl-hud .nrl-hud-next')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
    const end = chips.length > 0 ? Math.min(...chips.map((r) => r.left)) : actions?.left ?? 0;
    const gap = money && actions ? Math.floor(end - money.right - 12) : 0;
    if (money && actions && money.height > 0 && gap >= MIN_LANE_PX) {
      setLane('hud', `left: ${Math.round(money.right + 6)}px; top: ${Math.round(actions.top)}px; width: ${gap}px; height: ${Math.round(actions.height)}px;`);
      return;
    }
    setLane('top', '');
  };

  /** The toast in view, under nothing: its middle takes a tap. */
  const seen = (t: Element): boolean => {
    const r = t.getBoundingClientRect();
    if (r.width < 1) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && t.contains(hit);
  };

  const render = (): void => {
    const first = lane.firstElementChild;
    if (first !== shown) {
      shown = first;
      const n = first ? notices.get(first) : undefined;
      left = n ? toastMs(n, lane.childElementCount - 1) : 0;
      first?.classList.add('nrl-toast-in');
    }
    const queued = lane.childElementCount - 1;
    if (first) {
      const more = first.querySelector('.nrl-toast-more');
      if (more) more.textContent = queueBadge(queued);
      if (queued > 0) left = Math.min(left, TOAST_BUSY_MS);
    }
    lane.hidden = !first || rowTaken();
    if (!lane.hidden) place();
    if (first && !timer) {
      last = performance.now();
      timer = setInterval(tick, TICK_MS);
    } else if (!first && timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  function tick(): void {
    const now = performance.now();
    // A tab in the background throttles timers: count at most one tick of it.
    const dt = Math.min(now - last, 2 * TICK_MS);
    last = now;
    if (shown && !lane.hidden && seen(shown)) left -= dt;
    if (shown && left <= 0) shown.remove();
    render();
  }

  const show = (n: Notice): void => {
    const more = el('span', { class: 'nrl-toast-more', attrs: { 'aria-hidden': 'true' } });
    const toast = el('div', { class: `nrl-toast nrl-toast-${n.kind}` }, el('span', { class: 'nrl-toast-text', text: n.text }), more);
    toast.title = 'Tap to dismiss';
    toast.addEventListener('click', () => {
      toast.remove();
      render();
    });
    notices.set(toast, n);
    lane.appendChild(toast);
    render();
  };

  let waiting: Notice[] = [];
  bus.on('ui:notify', (n) => {
    if (n.quiet) return; // already on screen (the season review, N14)
    if (toastWaits(n, matchOn())) waiting.push(n);
    else show(n);
  });
  let wasOn = matchOn();
  new MutationObserver(() => {
    const on = matchOn();
    if (on === wasOn) return;
    wasOn = on;
    if (on) {
      // Club toasts still queued when the match comes up wait for the club again.
      for (const t of [...lane.children]) {
        const n = notices.get(t);
        if (n && toastWaits(n, true)) {
          waiting.push(n);
          t.remove();
        }
      }
      render();
      return;
    }
    const due = waiting;
    waiting = [];
    for (const n of due) show(n);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
