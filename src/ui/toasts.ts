// src/ui/toasts.ts — the toast lane for 'ui:notify' (the §5 event every system
// emits). #339: one toast at a time with a "+n" counter for the rest, a tap
// dismisses it, and it sits where no control is:
//   - at the club, just above the dock, centred (the decisions chip has the
//     top-left corner and a sheet's header row its top edge); at the top while
//     Office's tiles take that place. The open sheet's list under it keeps room
//     at its foot while it shows, so the last row scrolls clear of it, and a
//     long info toast (the install hint) sits left of PLAY WEEK (Wave 3);
//   - in a match, in the row under the score bug, short of the full log, and
//     not while the Replay try chip, a key-moment banner or the stats are in that row;
//   - with no dock (the title, the lab), centred at the top.
// A toast's time only runs while it can be seen: under a dialog, a match card
// or the rotate card it waits.
//
// #370: a toast with an action (the 5-second Undo) jumps the queue, keeps its own
// time with toasts queued behind it, counts down even while something covers it
// (so it ends with the offer it carries), and closes only on its ✕ or its timer:
// a stray tap on it does nothing. One at a time: a new one replaces the last. A
// match never has one (starting one ends the offer), so it is dropped, not kept.
//
// While a match is on screen (live, and full time until Back to Club) only the
// match's own toasts show. A club toast waits, and they all show once the club
// is back; the news inbox has every one either way.
//
// #411: a long run (▾ To finals) queues a toast for every week while its summary
// and decision cards hold the lane, and they used to replay one by one for minutes
// after it. When a run ends, or the queue passes TOAST_CAP, the plain lines (all
// in News already) go but for the newest few, folded into one "+n more in News";
// an Undo and a problem always stay.
import { bus, type Events } from '../core/events';
import { NAV_INSET_VAR, button, el, ensureStyles } from './dom';

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
export const MIN_LANE_PX = 140;
/** An action toast's line, its button and its ✕ need this much (#370). */
export const ACTION_LANE_PX = 200;

/** Whether `n` carries an action button (the Undo, #370). */
export function isActionToast(n: Notice): boolean {
  return n.action !== undefined;
}

/** Where `n` joins the lane: an action toast goes to the front, the rest to the back (#370). */
export function laneIndex(n: Notice, queued: number): number {
  return isActionToast(n) ? 0 : queued;
}

/** Whether a tap on the toast's body closes it: not an action toast's (#370), only its ✕ or its time. */
export function dismissOnBodyTap(n: Notice): boolean {
  return !isActionToast(n);
}

/** The narrowest lane `n` can sit in. */
export function laneMinPx(n: Notice | undefined): number {
  return n && isActionToast(n) ? ACTION_LANE_PX : MIN_LANE_PX;
}

/** The dock lane's gap above the dock (its --nrl-nav-h already holds the 12px under the dock). */
export const DOCK_GAP_PX = 20;
/** Clear space between a list's last row, scrolled to the end, and the toast over it. */
export const RESERVE_GAP_PX = 8;
/** Gap kept between a long info toast and the sheet or dialog lifted clear of it (#434). */
export const TOAST_LIFT_GAP = 8;
/** Custom property added to a sheet or dialog's bottom inset while the install hint is up. */
export const TOAST_LIFT_VAR = '--nrl-toast-lift';

/**
 * How far a sheet or dialog rises so the install hint sits clear of its content
 * (#434). Sized for a dialog that rests on the nav (no pad of its own); a sheet
 * already inset above the nav clears by a little more. Nothing when there is no toast.
 */
export function toastLiftPx(toastH: number): number {
  if (toastH <= 0) return 0;
  return Math.ceil(toastH + DOCK_GAP_PX + TOAST_LIFT_GAP);
}
/** The narrowed lane's inset from the dock's left edge, and its gap to PLAY WEEK. */
const EDGE_PX = 12;
/** The centred lane's widest (30rem at Normal text, the CSS's min(30rem, …)). */
const LANE_MAX_PX = 480;

/** A long-lived info toast (the install hint): it names a time past the longest a toast stays. */
export function isLongInfo(n: Notice): boolean {
  return n.kind === 'info' && !isActionToast(n) && (n.ms ?? 0) > TOAST_MAX_MS;
}

/** What the dock lane is placed against: the viewport, the dock, and the toast in view. */
export interface DockLaneIn {
  vh: number;
  /** The dock's height with the 12px under it (--nrl-nav-h). */
  navH: number;
  /** PLAY WEEK's left edge, or null with no play button. */
  playLeft: number | null;
  /** The dock's left edge (12px in from the left safe-area inset). */
  dockLeft: number;
  /** The toast in view's height. */
  toastH: number;
}

/** Where the dock lane sits: its bottom edge, the toast's top, and for a long info toast its left and width. */
export interface DockLane {
  /** The lane's bottom edge, up from the viewport's bottom. */
  bottom: number;
  /** The toast's top edge (y): a list under it reserves room down to here. */
  top: number;
  /** A long info toast sits left of PLAY WEEK, not centred: its left and width (null: centred, as the CSS has it). */
  left: number | null;
  width: number | null;
}

/**
 * The dock lane at the club (#339, Wave 3): just above the dock, centred; a long
 * info toast (the install hint, up eight seconds) narrowed to the left of PLAY WEEK,
 * so it is never over the ▾ menu's column. Too little room there and it stays centred.
 */
export function dockLane(n: Notice | undefined, g: DockLaneIn): DockLane {
  const bottom = g.navH + DOCK_GAP_PX;
  const top = g.vh - bottom - g.toastH;
  if (!n || !isLongInfo(n) || g.playLeft === null) return { bottom, top, left: null, width: null };
  const left = g.dockLeft + EDGE_PX;
  const width = Math.min(LANE_MAX_PX, Math.floor(g.playLeft - EDGE_PX - left));
  return width >= MIN_LANE_PX ? { bottom, top, left, width } : { bottom, top, left: null, width: null };
}

/**
 * The room a scrolling list keeps at its foot while a toast is over it: from the
 * toast's top to the list's bottom, plus a gap, so its last row scrolls clear of
 * the toast. Nothing when the toast is below the list.
 */
export function listReserve(listBottom: number, toastTop: number): number {
  const overlap = Math.ceil(listBottom - toastTop);
  return overlap > 0 ? overlap + RESERVE_GAP_PX : 0;
}

/** Class and property a list holding a reserve wears (dom.ts's `.nrl-toast-reserve::after` is the room). */
export const RESERVE_CLASS = 'nrl-toast-reserve';
export const RESERVE_VAR = '--nrl-toast-pad';

/** What holdReserve touches on a scrolling list (a stand-in in the tests). */
export interface ReserveList {
  classList: Pick<DOMTokenList, 'add' | 'remove'>;
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty' | 'getPropertyValue'>;
}

/**
 * Give each list in `next` its reserve, and take it off every list in `held` that
 * is not in `next` (the toast went, moved off it, or the sheet changed). Returns
 * the lists holding one now. Writes only what changed.
 */
export function holdReserve<T extends ReserveList>(held: ReadonlySet<T>, next: ReadonlyMap<T, number>): Set<T> {
  for (const list of held) {
    if (next.has(list)) continue;
    list.classList.remove(RESERVE_CLASS);
    list.style.removeProperty(RESERVE_VAR);
  }
  const now = new Set<T>();
  for (const [list, px] of next) {
    if (px <= 0) {
      list.classList.remove(RESERVE_CLASS);
      list.style.removeProperty(RESERVE_VAR);
      continue;
    }
    const v = `${px}px`;
    if (list.style.getPropertyValue(RESERVE_VAR) !== v) list.style.setProperty(RESERVE_VAR, v);
    list.classList.add(RESERVE_CLASS);
    now.add(list);
  }
  return now;
}

/** A toast that waits for the club: anything not about the match while a match is on screen. */
export function toastWaits(n: Notice, matchOn: boolean): boolean {
  return matchOn && n.match !== true;
}

/** How long `n` stays in view: longer for more words and for a problem, shorter with a queue behind it. */
export function toastMs(n: Notice, queued: number): number {
  if (isActionToast(n)) return n.ms ?? TOAST_MAX_MS; // its offer's time, whatever waits behind it (#370)
  const read = 1500 + 45 * n.text.length + (n.kind === 'danger' ? 1000 : 0);
  const ms = n.ms ?? Math.min(TOAST_MAX_MS, Math.max(TOAST_MIN_MS, read));
  return queued > 0 ? Math.min(ms, TOAST_BUSY_MS) : ms;
}

/** Most toasts queued (in the lane, or waiting for the club) before the plain ones are trimmed (#411). */
export const TOAST_CAP = 8;
/** Plain toasts a trim keeps: the newest few, the stop line of a run among them (#411). */
export const TRIM_KEEP = 3;

/** The "+n more in News" line a trim leaves, by its count (#411). */
const moreCounts = new WeakMap<Notice, number>();

/** The line standing in for `count` trimmed toasts; News has every one of them. */
export function moreInNews(count: number): Notice {
  const n: Notice = { text: `+${count} more in News`, kind: 'info' };
  moreCounts.set(n, count);
  return n;
}

/** Whether a trim may drop `n`: a plain club line (News keeps it), not an Undo, a problem or a match's own. */
export function trimmable(n: Notice): boolean {
  return !isActionToast(n) && n.kind !== 'danger' && n.match !== true;
}

/**
 * The queue after a trim (#411): every Undo, problem and match toast, the newest
 * `keep` plain ones, and in place of the first dropped one a single "+n more in
 * News" (an earlier such line folds into it). A line said twice keeps only its
 * newest. Order is kept. Unchanged when it would only swap one toast for another.
 */
export function trimQueue(queue: readonly Notice[], keep = TRIM_KEEP): Notice[] {
  const seen = new Set<string>();
  const again = new Set<Notice>();
  for (let i = queue.length - 1; i >= 0; i--) {
    const n = queue[i]!;
    if (isActionToast(n) || n.match === true) continue;
    if (seen.has(n.text)) again.add(n);
    seen.add(n.text);
  }
  const plain = queue.filter((n) => trimmable(n) && !moreCounts.has(n) && !again.has(n));
  const drop = new Set([...again, ...plain.slice(0, Math.max(0, plain.length - keep))]);
  for (const n of queue) if (moreCounts.has(n)) drop.add(n);
  let count = 0;
  for (const n of drop) count += moreCounts.get(n) ?? 1;
  if (count < 2 || drop.size < 2) return [...queue];
  const out: Notice[] = [];
  let more: Notice | null = null;
  for (const n of queue) {
    if (!drop.has(n)) out.push(n);
    else if (!more) out.push((more = moreInNews(count)));
  }
  return out;
}

/** The counter on the toast in view: how many wait behind it. */
export function queueBadge(queued: number): string {
  return queued > 0 ? `+${queued}` : '';
}

/**
 * Mount the toast lane in `root` and show 'ui:notify' through it. `advancing` says
 * whether a multi-week run is under way (the club's advanceInProgress; the lab has none).
 */
export function initToasts(root: HTMLElement, opts: { advancing?: () => boolean } = {}): void {
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
  // The install hint lifts the open sheet and any dialog clear of itself (#434).
  const setLift = (px: number): void => {
    const v = px > 0 ? `${px}px` : '';
    const root = document.documentElement;
    if ((root.style.getPropertyValue(TOAST_LIFT_VAR) || '') === v) return;
    if (v) root.style.setProperty(TOAST_LIFT_VAR, v);
    else root.style.removeProperty(TOAST_LIFT_VAR);
  };
  // Lists holding room at their foot for the toast over them (Wave 3).
  let reserved = new Set<HTMLElement>();
  const release = (): void => {
    if (reserved.size) reserved = holdReserve(reserved, new Map());
  };
  /** The innermost scrolling list under (x, y), not the toast itself. */
  const listAt = (x: number, y: number): HTMLElement | null => {
    for (const e of document.elementsFromPoint(x, y)) {
      if (lane.contains(e) || !(e instanceof HTMLElement)) continue;
      if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e;
    }
    return null;
  };
  /** Each list the toast in view lies over keeps room for it, so its last row scrolls clear. */
  const reserve = (toastTop: number): void => {
    const r = shown?.getBoundingClientRect();
    const next = new Map<HTMLElement, number>();
    if (r && r.width > 0) {
      // Its left end, middle and right end: a two-column sheet has a list under each.
      for (const x of [r.left + 8, (r.left + r.right) / 2, r.right - 8]) {
        const list = listAt(x, r.top + 2);
        if (list && !next.has(list)) next.set(list, listReserve(list.getBoundingClientRect().bottom, toastTop));
      }
    }
    reserved = holdReserve(reserved, next);
  };
  const place = (): void => {
    if (matchOn()) {
      release();
      setLift(0);
      // From the left inset (CSS) up to the full log on the right, while it is open.
      setLane('match', '');
      const log = document.querySelector('.nrl-mo-full')?.getBoundingClientRect();
      if (log && log.width > 0) setLane('match', `width: ${Math.max(MIN_LANE_PX, Math.floor(log.left - 8 - lane.getBoundingClientRect().left))}px;`);
      return;
    }
    // A dialog up (a facility's popup over the grounds): the toast goes in the room beside it, so
    // an Undo is neither hidden under the dialog nor over its MOVE and DEMOLISH (#371, from #381's check).
    const dialog = document.querySelector('.nrl-modal')?.getBoundingClientRect();
    if (dialog && dialog.width > 0) {
      const leftRoom = Math.floor(dialog.left - 24);
      const rightRoom = Math.floor(window.innerWidth - dialog.right - 24);
      if (Math.max(leftRoom, rightRoom) >= MIN_LANE_PX) {
        setLane('beside', leftRoom >= rightRoom ? `width: ${leftRoom}px;` : `left: ${Math.ceil(dialog.right + 12)}px; width: ${rightRoom}px;`);
        release();
        setLift(0);
        return;
      }
    }
    // Office's tiles sit where the dock lane is: while the sheet is up the toast goes to the top.
    const office = document.querySelector('.nrl-nav-sheet:not([hidden])');
    const dock = document.querySelector('.nrl-dock')?.getBoundingClientRect();
    if (!dock || office) {
      setLane('top', '');
      release();
      setLift(0);
      return;
    }
    // Just above the dock; a long info toast left of PLAY WEEK. A list under it keeps room for it.
    const play = document.querySelector('.nrl-dock-play-group')?.getBoundingClientRect();
    const toastH = shown?.getBoundingClientRect().height ?? 0;
    const g = dockLane(shown ? notices.get(shown) : undefined, {
      vh: window.innerHeight,
      navH: parseFloat(document.documentElement.style.getPropertyValue(NAV_INSET_VAR)) || 0,
      playLeft: play && play.width > 0 ? play.left : null,
      dockLeft: dock.left,
      toastH,
    });
    setLane('dock', g.left === null ? '' : `left: ${g.left}px; width: ${g.width}px; transform: none; justify-content: flex-start;`);
    // A long info toast (the install hint) stays up for seconds: lift the sheet so it
    // does not cover the rows that are already on screen. A short toast keeps the reserve.
    const hint = shown ? notices.get(shown) : undefined;
    setLift(hint && isLongInfo(hint) ? toastLiftPx(toastH) : 0);
    reserve(g.top);
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
      const n = notices.get(first);
      if (queued > 0 && !(n && isActionToast(n))) left = Math.min(left, TOAST_BUSY_MS);
      // An action that can no longer be taken hides its button (#370).
      const act = first.querySelector<HTMLElement>('.nrl-toast-btn');
      if (act && n?.action?.enabled) act.hidden = !n.action.enabled();
    }
    lane.hidden = !first || rowTaken();
    if (!lane.hidden) place();
    else {
      release();
      setLift(0);
    }
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
    const n = shown ? notices.get(shown) : undefined;
    // An action toast's time is its offer's: it runs even while covered (#370).
    if (shown && ((n && isActionToast(n)) || (!lane.hidden && seen(shown)))) left -= dt;
    if (shown && left <= 0) shown.remove();
    render();
  }

  const close = (toast: Element): void => {
    toast.remove();
    render();
  };
  const build = (n: Notice): Element => {
    const more = el('span', { class: 'nrl-toast-more', attrs: { 'aria-hidden': 'true' } });
    const toast = el('div', { class: `nrl-toast nrl-toast-${n.kind}` }, el('span', { class: 'nrl-toast-text', text: n.text }), more);
    // The install hint is narrowed beside PLAY WEEK. At Larger text that column is
    // two lines too short, so it may wrap further (#434) and the sheet lifts with it.
    if (isLongInfo(n)) toast.classList.add('nrl-toast-long');
    if (dismissOnBodyTap(n)) {
      toast.title = 'Tap to dismiss';
      toast.addEventListener('click', () => close(toast));
    }
    if (n.action) {
      const { run } = n.action;
      toast.classList.add('nrl-toast-action');
      const act = button(n.action.label, () => {
        close(toast);
        run();
      }, { class: 'nrl-toast-btn' });
      const x = button('✕', () => close(toast), { class: 'nrl-toast-x' });
      x.setAttribute('aria-label', 'Close');
      toast.append(act, x);
    }
    notices.set(toast, n);
    return toast;
  };
  const show = (n: Notice): void => {
    const toast = build(n);
    // One at a time: the last offer's toast goes (its offer has been replaced).
    if (n.action) for (const t of [...lane.children]) if (t !== toast && notices.get(t)?.action) t.remove();
    const before = lane.children[laneIndex(n, lane.childElementCount)] ?? null;
    lane.insertBefore(toast, before);
    render();
  };

  /** Trim the lane to trimQueue's pick (#411); the toast in view stays put if it is kept. */
  const trimLane = (): void => {
    const els = [...lane.children];
    const queue = els.map((t) => notices.get(t)).filter((n): n is Notice => n !== undefined);
    const kept = trimQueue(queue);
    if (kept.length === queue.length) return;
    const byNotice = new Map(els.map((t) => [notices.get(t), t]));
    const stay = new Set(kept);
    for (const t of els) if (!stay.has(notices.get(t) as Notice)) t.remove();
    for (const n of kept) lane.appendChild(byNotice.get(n) ?? build(n));
    render();
  };

  let waiting: Notice[] = [];
  bus.on('ui:notify', (n) => {
    if (n.quiet) return; // already on screen (the season review, N14)
    if (n.action && matchOn()) return; // its offer ended with the kick-off (#370)
    if (toastWaits(n, matchOn())) {
      waiting.push(n);
      if (waiting.length > TOAST_CAP) waiting = trimQueue(waiting);
    } else {
      show(n);
      if (lane.childElementCount > TOAST_CAP) trimLane();
    }
  });
  // #411: when a run ends, trim what it queued. After its stop line has joined (it
  // is emitted just after the run's last state:changed), so that line is kept.
  const advancing = opts.advancing ?? ((): boolean => false);
  let wasAdvancing = false;
  bus.on('state:changed', () => {
    const on = advancing();
    if (wasAdvancing && !on) {
      queueMicrotask(() => {
        trimLane();
        waiting = trimQueue(waiting);
      });
    }
    wasAdvancing = on;
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
          if (!n.action) waiting.push(n); // an Undo ends with the kick-off (#370)
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
