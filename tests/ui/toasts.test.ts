// tests/ui/toasts.test.ts — the toast lane (#339): one toast at a time with a
// counter, how long each stays, and which colour each kind wears. The lane's
// placement is checked in WebKit (scripts/e2e-webkit.mjs, `toast-lane`); the
// vitest env has no DOM, so these pin the pure helpers and the CSS.
import { describe, it, expect } from 'vitest';
import {
  ACTION_LANE_PX, DOCK_GAP_PX, TOAST_CAP, TRIM_KEEP, MIN_LANE_PX, RESERVE_CLASS, RESERVE_GAP_PX, RESERVE_VAR,
  TOAST_BUSY_MS, TOAST_LIFT_GAP, TOAST_LIFT_VAR, TOAST_MAX_MS, TOAST_MIN_MS,
  dismissOnBodyTap, dockLane, moreInNews, trimQueue, trimmable, holdReserve, isActionToast, isLongInfo, laneIndex, laneMinPx, listReserve, queueBadge, toastLiftPx, toastMs,
  type ReserveList,
} from '../../src/ui/toasts';
import { UNDO_MS } from '../../src/systems/undo';
import { stopToastKind } from '../../src/core/advanceRules';
import { CSS } from '../../src/ui/dom';
import { OVERLAY_CSS, TICKER_WAIT_TEXT } from '../../src/ui/screens/matchOverlay';
import { CLUB_PAGES } from '../../src/ui/guide/pages';
import { NINES_PAGE } from '../../src/ui/guide/nines';
import { IOS_HINT_MS } from '../../src/fx/pwa';

/** The declarations of the rule whose selector list is exactly `selector`. */
function rule(css: string, selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

describe('how long a toast stays (toastMs)', () => {
  it('a short line gets the floor, a long one the ceiling', () => {
    expect(toastMs({ text: 'Signed Jo', kind: 'success' }, 0)).toBe(TOAST_MIN_MS);
    expect(toastMs({ text: 'x'.repeat(400), kind: 'info' }, 0)).toBe(TOAST_MAX_MS);
  });
  it('grows with the words, and a problem stays a second longer', () => {
    const text = 'Stopped after 3 weeks: Decision needed: Homesick youngster.';
    const info = toastMs({ text, kind: 'info' }, 0);
    expect(info).toBeGreaterThan(TOAST_MIN_MS);
    expect(toastMs({ text, kind: 'danger' }, 0)).toBe(Math.min(TOAST_MAX_MS, info + 1000));
  });
  it('with a queue behind it, none stays longer than the busy cap', () => {
    expect(toastMs({ text: 'x'.repeat(400), kind: 'danger' }, 3)).toBe(TOAST_BUSY_MS);
    expect(toastMs({ text: 'Hi', kind: 'info' }, 3)).toBe(TOAST_MIN_MS);
  });
  it('a toast can name its own time (the install hint), still capped by a queue', () => {
    expect(toastMs({ text: 'Tap Share', kind: 'info', ms: IOS_HINT_MS }, 0)).toBe(IOS_HINT_MS);
    expect(toastMs({ text: 'Tap Share', kind: 'info', ms: IOS_HINT_MS }, 1)).toBe(TOAST_BUSY_MS);
  });
});

describe('the counter (queueBadge)', () => {
  it('reads +n for the toasts waiting, nothing when none', () => {
    expect(queueBadge(0)).toBe('');
    expect(queueBadge(1)).toBe('+1');
    expect(queueBadge(3)).toBe('+3');
  });
});

describe('colour by meaning (#339)', () => {
  it('a stop is red only for a real problem', () => {
    expect(stopToastKind('forfeit')).toBe('danger');
    expect(stopToastKind('injury')).toBe('danger');
    expect(stopToastKind('bankruptcy')).toBe('danger');
    expect(stopToastKind('decision')).toBe('info');
    expect(stopToastKind('contract')).toBe('info');
    expect(stopToastKind('stopped')).toBe('info');
    expect(stopToastKind('busy')).toBe('info');
    expect(stopToastKind('target')).toBe('info');
  });
  it('info is neutral, success green, danger red', () => {
    expect(rule(CSS, '.nrl-toast-info')).toContain('background: rgba(14, 22, 48, 0.97)');
    expect(rule(CSS, '.nrl-toast-success')).toContain('background: #1d5a33');
    expect(rule(CSS, '.nrl-toast-danger')).toContain('background: #7a2a24');
  });
});

describe('one at a time', () => {
  it('only the lane\'s first toast shows; the rest wait under the counter', () => {
    expect(rule(CSS, '.nrl-toast')).toContain('display: none');
    expect(rule(CSS, '.nrl-toast:first-child')).toContain('display: flex');
    expect(rule(CSS, '.nrl-toast-more:empty')).toContain('display: none');
  });
  it('the lane takes no taps itself; the toast does (a tap dismisses it)', () => {
    expect(rule(CSS, '.nrl-toast-lane')).toContain('pointer-events: none');
    expect(rule(CSS, '.nrl-toast')).toContain('pointer-events: auto');
  });
  it('in a match it sits in the row under the scoreboard, not over the log', () => {
    expect(rule(CSS, '.nrl-toast-lane[data-lane="match"]')).toContain('var(--nrl-mo-board');
    expect(OVERLAY_CSS).not.toContain('.nrl-toast');
  });
});

describe('small feedback', () => {
  it('the ticker says kick-off is coming before its first line', () => {
    expect(TICKER_WAIT_TEXT).toMatch(/Kick-off soon/);
    expect(rule(OVERLAY_CSS, '.nrl-mo-line-wait')).toContain('opacity');
  });
  it('the guide says the half-time sheet waits for Start 2nd half', () => {
    const text = JSON.stringify([...CLUB_PAGES, NINES_PAGE]);
    expect(text).not.toMatch(/by itself|a tap holds it/);
    expect(text).toMatch(/waits (for|until you tap) Start 2nd half/);
  });
});

describe('the Undo toast (#370)', () => {
  const undo = { text: 'Training Paddock built!', kind: 'success' as const, ms: UNDO_MS, action: { label: 'Undo', run: () => {} } };
  const plain = { text: 'Signed Jo', kind: 'success' as const };

  it('is an action toast; a plain one is not', () => {
    expect(isActionToast(undo)).toBe(true);
    expect(isActionToast(plain)).toBe(false);
  });
  it('jumps the queue: it joins at the front, the rest at the back', () => {
    expect(laneIndex(undo, 3)).toBe(0);
    expect(laneIndex(plain, 3)).toBe(3);
  });
  it('keeps exactly UNDO_MS, even with toasts queued behind it', () => {
    expect(UNDO_MS).toBe(5000);
    expect(toastMs(undo, 0)).toBe(UNDO_MS);
    expect(toastMs(undo, 4)).toBe(UNDO_MS);
    expect(UNDO_MS).toBeGreaterThan(TOAST_BUSY_MS);
  });
  it('is not dismissed by a tap on its body; a plain one is', () => {
    expect(dismissOnBodyTap(undo)).toBe(false);
    expect(dismissOnBodyTap(plain)).toBe(true);
  });
  it('needs a wider gap in the top bar than a plain toast, else it takes the top centre', () => {
    expect(laneMinPx(undo)).toBe(ACTION_LANE_PX);
    expect(laneMinPx(plain)).toBe(MIN_LANE_PX);
    expect(ACTION_LANE_PX).toBeGreaterThan(MIN_LANE_PX);
  });
  it('its Undo and ✕ are 44px targets and take taps', () => {
    const btns = rule(CSS, '.nrl-toast-action .nrl-btn');
    expect(btns).toContain('min-height: 44px');
    expect(btns).toContain('min-width: 44px');
    expect(rule(CSS, '.nrl-toast-x')).toContain('width: 44px');
    expect(rule(CSS, '.nrl-toast-btn')).toContain('var(--nrl-toast-action-bg');
    // The base toast rule keeps taps; the action toast only drops the pointer cursor.
    expect(rule(CSS, '.nrl-toast')).toContain('pointer-events: auto');
    expect(rule(CSS, '.nrl-toast.nrl-toast-action')).not.toContain('pointer-events: none');
  });
});

describe('the dock lane keeps off the list rows (Wave 3, #339)', () => {
  const hint = { text: 'Tap Share → Add to Home Screen to install', kind: 'info' as const, ms: IOS_HINT_MS };
  const plain = { text: 'Signed Jo', kind: 'success' as const };
  const undo = { text: 'Built', kind: 'success' as const, ms: 9000, action: { label: 'Undo', run: () => {} } };
  // 667×375: a 56px dock with 8px under it, its left edge at 12, PLAY WEEK from x 520.
  const g667 = { vh: 375, navH: 64, playLeft: 520, dockLeft: 12, toastH: 34 };

  it('sits DOCK_GAP_PX above the dock; the toast\'s top is its bottom plus its height up from the foot', () => {
    const lane = dockLane(plain, g667);
    expect(lane.bottom).toBe(64 + DOCK_GAP_PX);
    expect(lane.top).toBe(375 - 64 - DOCK_GAP_PX - 34);
    expect(rule(CSS, '.nrl-toast-lane[data-lane="dock"]')).toContain(`bottom: calc(var(--nrl-nav-h, 0px) + ${DOCK_GAP_PX}px)`);
  });
  it('a plain toast, an Undo or a short info toast stays centred', () => {
    expect(dockLane(plain, g667)).toMatchObject({ left: null, width: null });
    expect(dockLane(undo, g667)).toMatchObject({ left: null, width: null });
    expect(dockLane({ text: 'Advanced 4 weeks.', kind: 'info' }, g667)).toMatchObject({ left: null, width: null });
  });
  it('the install hint is a long info toast; nothing else is', () => {
    expect(isLongInfo(hint)).toBe(true);
    expect(IOS_HINT_MS).toBeGreaterThan(TOAST_MAX_MS);
    expect(isLongInfo(plain)).toBe(false);
    expect(isLongInfo(undo)).toBe(false);
    expect(isLongInfo({ text: 'x', kind: 'danger', ms: IOS_HINT_MS })).toBe(false);
  });
  it('a long info toast narrows to the left of PLAY WEEK, 12px in from the dock\'s left edge', () => {
    const lane = dockLane(hint, { ...g667, playLeft: 400 });
    expect(lane.left).toBe(12 + 12);
    expect(lane.width).toBe(400 - 12 - 24);
    expect(lane.left! + lane.width!).toBeLessThan(400);
    // On a wide screen it is no wider than the centred lane (30rem).
    expect(dockLane(hint, { ...g667, playLeft: 1200 }).width).toBe(480);
  });
  it('with no PLAY WEEK, or too little room beside it, the long toast stays centred', () => {
    expect(dockLane(hint, { ...g667, playLeft: null })).toMatchObject({ left: null, width: null });
    expect(dockLane(hint, { ...g667, playLeft: 24 + 12 + MIN_LANE_PX - 1 })).toMatchObject({ left: null, width: null });
    expect(dockLane(hint, { ...g667, playLeft: 24 + 12 + MIN_LANE_PX }).width).toBe(MIN_LANE_PX);
  });
  it('a list under the toast reserves from the toast\'s top to its own foot, and a gap', () => {
    // The sheet's list ends 30px below the toast's top: it keeps 30 + the gap.
    expect(listReserve(287, 257)).toBe(30 + RESERVE_GAP_PX);
    expect(listReserve(287.4, 257)).toBe(31 + RESERVE_GAP_PX);
    // A list that ends above the toast keeps nothing.
    expect(listReserve(250, 257)).toBe(0);
    expect(listReserve(257, 257)).toBe(0);
  });
  it('the reserve is room after the list\'s last row, sized by its property', () => {
    expect(rule(CSS, `.${RESERVE_CLASS}::after`)).toContain(`height: var(${RESERVE_VAR}, 0px)`);
    expect(rule(CSS, `.${RESERVE_CLASS}::after`)).toContain('flex: 0 0 auto');
  });
  it('the install hint lifts a sheet clear of the rows it used to cover (#434)', () => {
    expect(toastLiftPx(0)).toBe(0);
    expect(toastLiftPx(34)).toBe(34 + DOCK_GAP_PX + TOAST_LIFT_GAP);
    expect(toastLiftPx(40.2)).toBe(Math.ceil(40.2 + DOCK_GAP_PX + TOAST_LIFT_GAP));
    expect(rule(CSS, '\n.nrl-screen-region')).toContain(`var(${TOAST_LIFT_VAR}, 0px)`);
    expect(rule(CSS, '\n.nrl-dialog-region')).toContain(`var(${TOAST_LIFT_VAR}, 0px)`);
    // A short screen's own bottom inset keeps the lift, or it would paint back over the list.
    expect(CSS).toContain(`bottom: calc(var(--nrl-nav-h, 0px) + 8px + var(${TOAST_LIFT_VAR}, 0px))`);
    expect(CSS).toContain(`bottom: calc(var(--nrl-nav-h, 0px) + 6px + var(${TOAST_LIFT_VAR}, 0px))`);
    expect(rule(CSS, '.nrl-toast-long .nrl-toast-text')).toContain('-webkit-line-clamp: 4');
  });
});

describe('the reserve comes off when the toast goes (holdReserve)', () => {
  /** A list's class list and style, recorded. */
  function list(): ReserveList & { classes: Set<string>; props: Map<string, string>; writes: number } {
    const classes = new Set<string>();
    const props = new Map<string, string>();
    const l = {
      classes, props, writes: 0,
      classList: { add: (c: string) => { classes.add(c); }, remove: (c: string) => { classes.delete(c); } },
      style: {
        setProperty: (k: string, v: string | null) => { props.set(k, v ?? ''); l.writes++; },
        removeProperty: (k: string) => { const v = props.get(k) ?? ''; props.delete(k); return v; },
        getPropertyValue: (k: string) => props.get(k) ?? '',
      },
    };
    return l;
  }
  /** Lists holding nothing yet. */
  const none = () => new Set<ReturnType<typeof list>>();

  it('gives each list under the toast its room', () => {
    const a = list();
    const held = holdReserve(none(), new Map([[a, 42]]));
    expect(held.has(a)).toBe(true);
    expect(a.classes.has(RESERVE_CLASS)).toBe(true);
    expect(a.props.get(RESERVE_VAR)).toBe('42px');
  });
  it('the toast gone (nothing next), every list it held is cleared', () => {
    const a = list();
    const b = list();
    let held = holdReserve(none(), new Map([[a, 42], [b, 30]]));
    held = holdReserve(held, new Map());
    expect(held.size).toBe(0);
    for (const l of [a, b]) {
      expect(l.classes.has(RESERVE_CLASS)).toBe(false);
      expect(l.props.has(RESERVE_VAR)).toBe(false);
    }
  });
  it('a sheet changed under the toast: the old list is cleared, the new one holds', () => {
    const a = list();
    const b = list();
    let held = holdReserve(none(), new Map([[a, 42]]));
    held = holdReserve(held, new Map([[b, 42]]));
    expect([...held]).toEqual([b]);
    expect(a.classes.has(RESERVE_CLASS)).toBe(false);
    expect(b.props.get(RESERVE_VAR)).toBe('42px');
  });
  it('a list the toast no longer reaches (reserve 0) is cleared, not held', () => {
    const a = list();
    let held = holdReserve(none(), new Map([[a, 42]]));
    held = holdReserve(held, new Map([[a, 0]]));
    expect(held.size).toBe(0);
    expect(a.classes.has(RESERVE_CLASS)).toBe(false);
  });
  it('writes the property only when the room changes (it runs every tick)', () => {
    const a = list();
    let held = holdReserve(none(), new Map([[a, 42]]));
    held = holdReserve(held, new Map([[a, 42]]));
    held = holdReserve(held, new Map([[a, 42]]));
    expect(a.writes).toBe(1);
    holdReserve(held, new Map([[a, 50]]));
    expect(a.writes).toBe(2);
  });
});

describe('a long run leaves a short tail, not minutes of stale toasts (#411)', () => {
  type N = Parameters<typeof trimQueue>[0][number];
  const info = (text: string): N => ({ text, kind: 'info' });
  const texts = (q: readonly N[]): string[] => q.map((n) => n.text);
  // What a run from week 8 to the finals queued while its cards held the lane (the play-test's 47).
  const run: N[] = [
    ...Array.from({ length: 17 }, (_, i) => info(`Round ${9 + i}: WIN`)),
    ...Array.from({ length: 5 }, (_, i) => ({ text: `Player ${i}'s contract expires in 8 weeks`, kind: 'success' as const })),
    { text: 'Squad short: forfeit risk', kind: 'danger' },
    ...Array.from({ length: 23 }, (_, i) => info(`Rival signing ${i}`)),
    info('Advanced to finals.'),
  ];

  it('keeps the newest few plain lines, the stop line among them, and one "+n more in News" for the rest', () => {
    const out = trimQueue(run);
    const plain = out.filter((n) => n.kind !== 'danger');
    expect(texts(plain)).toEqual(['+43 more in News', 'Rival signing 21', 'Rival signing 22', 'Advanced to finals.']);
    expect(plain.length - 1).toBe(TRIM_KEEP);
    expect(out.length).toBeLessThanOrEqual(TOAST_CAP);
    // Every toast dropped is counted: the kept ones plus the count make the whole run.
    expect(out.length - 1 + 43).toBe(run.length);
  });

  it('never drops a problem, an Undo or a match toast, and keeps the order', () => {
    const undo: N = { text: 'Built the gym', kind: 'success', action: { label: 'Undo', run: () => {} } };
    const q: N[] = [undo, info('a'), { text: 'Over budget', kind: 'danger' }, info('b'), info('c'), { text: 'Try!', kind: 'info', match: true }, info('d'), info('e'), info('f')];
    expect([trimmable(undo), trimmable(q[2]), trimmable(q[5]), trimmable(q[1])]).toEqual([false, false, false, true]);
    expect(texts(trimQueue(q))).toEqual(['Built the gym', '+3 more in News', 'Over budget', 'Try!', 'd', 'e', 'f']);
  });

  it('a later trim folds the earlier "+n more" into its own count', () => {
    const first = trimQueue([info('a'), info('b'), info('c'), info('d'), info('e')]);
    expect(texts(first)).toEqual(['+2 more in News', 'c', 'd', 'e']);
    const second = trimQueue([...first, info('f'), info('g'), info('h')]);
    expect(texts(second)).toEqual(['+5 more in News', 'f', 'g', 'h']);
  });

  it('a line said twice keeps only its newest, a problem too', () => {
    const fill: N = { text: 'Lineup: Goalby fills in at hooker.', kind: 'danger' };
    const q: N[] = [{ ...fill }, info('a'), { ...fill }, info('b'), info('c'), info('d')];
    expect(texts(trimQueue(q))).toEqual(['+2 more in News', 'Lineup: Goalby fills in at hooker.', 'b', 'c', 'd']);
  });

  it('leaves a short queue alone, and never swaps one toast for a "+1 more"', () => {
    const short = [info('a'), info('b'), info('c')];
    expect(trimQueue(short)).toEqual(short);
    const four = [info('a'), info('b'), info('c'), info('d')];
    expect(trimQueue(four)).toEqual(four);
    expect(texts(trimQueue([...four, info('e')]))).toEqual(['+2 more in News', 'c', 'd', 'e']);
  });

  it('the "+n more" line is a plain info line, short enough for the match lane', () => {
    expect(moreInNews(43)).toEqual({ text: '+43 more in News', kind: 'info' });
    expect(TOAST_CAP).toBeGreaterThan(TRIM_KEEP + 1);
  });
});
