// src/ui/toasts.ts — the toast lane for 'ui:notify' (the §5 event every system
// emits). #339: one toast at a time with a "+n" counter for the rest, a tap
// dismisses it, and it sits where no control is:
//   - at the club, just above the dock, centred (the decisions chip has the
//     top-left corner and a sheet's header row its top edge);
//   - in a match, in the row under the score bug, short of the full log, and
//     not while the Replay try chip, a key-moment banner or the stats are in that row;
//   - with no dock (the title, the lab), centred at the top.
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
/** The match lane is never narrower than this. */
const MIN_LANE_PX = 140;

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
  const rowTaken = (): boolean => matchOn() && (visible('.nrl-mo-replay') || visible('.nrl-mo-banner') || visible('.nrl-mo-statsheet'));

  const setLane = (mode: string, css: string): void => {
    if (lane.dataset.lane !== mode) lane.dataset.lane = mode;
    if (lane.style.cssText !== css) lane.style.cssText = css;
  };
  const place = (): void => {
    if (matchOn()) {
      // From the left inset (CSS) up to the full log on the right, while it is open.
      setLane('match', '');
      const log = document.querySelector('.nrl-mo-full')?.getBoundingClientRect();
      if (log && log.width > 0) setLane('match', `width: ${Math.max(MIN_LANE_PX, Math.floor(log.left - 8 - lane.getBoundingClientRect().left))}px;`);
      return;
    }
    setLane(document.querySelector('.nrl-dock') ? 'dock' : 'top', '');
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
