// tests/ui/toasts.test.ts — the toast lane (#339): one toast at a time with a
// counter, how long each stays, and which colour each kind wears. The lane's
// placement is checked in WebKit (scripts/e2e-webkit.mjs, `toast-lane`); the
// vitest env has no DOM, so these pin the pure helpers and the CSS.
import { describe, it, expect } from 'vitest';
import {
  ACTION_LANE_PX, MIN_LANE_PX, TOAST_BUSY_MS, TOAST_MAX_MS, TOAST_MIN_MS, dismissOnBodyTap, isActionToast, laneIndex, laneMinPx, queueBadge, toastMs,
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
