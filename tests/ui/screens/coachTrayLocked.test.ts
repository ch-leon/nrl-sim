// tests/ui/screens/coachTrayLocked.test.ts — locked calls in the coach tray
// (N9.6): greyed under the usable ones, tagged with the Coach's Office level that
// unlocks them, never tappable into a call, and never taking a usable call's place
// in the five rows; what doesn't fit goes to the footer. And the Coach calls page's
// body: four groups, the locked ones marked. Built on the stub DOM.
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { TRAY_MAX_BUTTONS, TRAY_MAX_ROWS, callsUnlockLine, trayCallsOn, trayRowEls, trayRows, trayWithLocked, type TrayButton } from '../../../src/ui/screens/matchOverlay';
import { unlockLevel, type CoachCall } from '../../../src/match/league/calls';
import { coachCallsPageData } from '../../../src/ui/coachCallsText';
import { coachCallsBody } from '../../../src/ui/screens/coachCalls';

const on = (...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why: null }));
const locked = (...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why: null, locked: unlockLevel(call) }));
const tiles = (els: HTMLElement[]): StubNode[] => (els as unknown as StubNode[]).flatMap((e) => [e, ...e.all()]).filter((n) => n.tagName === 'BUTTON');

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

describe('locked calls in the coach tray', () => {
  it('a new club with the ball: Hit-up to call, Shift and Offload greyed under it, tagged Coach\'s Office 1', () => {
    const usable = trayRows(on('hit-up', 'fresh-legs'), true);
    const { rows, overflow } = trayWithLocked(usable, locked('shift-left', 'shift-right', 'offload'));
    expect(overflow).toEqual([]);
    expect(rows.slice(0, usable.length)).toEqual(usable);
    const calls: CoachCall[] = [];
    const notes: number[] = [];
    const els = tiles(trayRowEls(rows, (c) => calls.push(c), (lv) => notes.push(lv)));
    const lockedTiles = els.filter((b) => b.getAttribute('data-locked') !== null);
    expect(lockedTiles.map((b) => b.getAttribute('data-call'))).toEqual(['shift-left', 'shift-right', 'offload']);
    for (const b of lockedTiles) {
      expect(b.className).toContain('nrl-mo-tray-locked');
      expect(b.getAttribute('aria-disabled')).toBe('true');
      expect(b.textContent).toContain("Coach's Office 1");
      b.click();
    }
    // A tap on a locked tile never makes a call: it only asks for the note.
    expect(calls).toEqual([]);
    expect(notes).toEqual([1, 1, 1]);
    // The usable ones still call, and aren't marked locked.
    const hit = els.find((b) => b.getAttribute('data-call') === 'hit-up')!;
    expect(hit.getAttribute('aria-disabled')).toBeNull();
    hit.click();
    expect(calls).toEqual(['hit-up']);
    // The badge counts only what can be called.
    expect(trayCallsOn(rows)).toBe(2);
  });

  it('never pushes a usable call out of the five rows; the locked ones that don\'t fit go to the footer', () => {
    // Late in the set with every attack call unlocked but the top tier: the tray is full of usable rows.
    const usable = trayRows(on('hit-up', 'shift-left', 'shift-right', 'offload', 'run-it', 'grubber', 'fresh-legs'), true);
    const { rows, overflow } = trayWithLocked(usable, locked('bomb', 'forty-twenty'));
    for (const r of usable) expect(rows).toContainEqual(r);
    expect(rows.length).toBeLessThanOrEqual(TRAY_MAX_ROWS);
    expect(rows.reduce((n, r) => n + r.buttons.length, 0)).toBeLessThanOrEqual(TRAY_MAX_BUTTONS);
    expect(overflow.map((b) => b.call).sort()).toEqual(['bomb', 'forty-twenty']);
    expect(callsUnlockLine([], overflow.map((b) => ({ call: b.call, level: b.locked! })))).toBe("+2 locked: Coach's Office 3");
  });

  it('fills what room there is with the nearest level first', () => {
    const usable = trayRows(on('hit-up', 'fresh-legs'), true);
    const { rows, overflow } = trayWithLocked(usable, locked('bomb', 'run-it', 'grubber', 'shift-left', 'shift-right', 'offload'));
    expect(rows.length).toBe(TRAY_MAX_ROWS);
    expect(rows.slice(2).map((r) => r.id)).toEqual(['shift', 'offload', 'run-it']);
    expect(overflow.map((b) => b.call)).toEqual(['grubber', 'bomb']);
  });

  it('a locked penalty pair shows as one greyed row, tagged Coach\'s Office 2', () => {
    const { rows } = trayWithLocked(trayRows(on('hold'), false), locked('take-two', 'tap-go'));
    expect(rows.map((r) => r.id)).toEqual(['hold', 'penalty']);
    const pair = tiles(trayRowEls(rows, () => {}, () => {})).filter((b) => b.getAttribute('data-locked') === '2');
    expect(pair.map((b) => b.getAttribute('data-call'))).toEqual(['take-two', 'tap-go']);
  });
});

describe('the Coach calls page body', () => {
  it('shows the four groups, the locked ones marked, for a new club', () => {
    const body = coachCallsBody(coachCallsPageData(0)) as unknown as StubNode;
    const groups = body.querySelectorAll('[data-calls-group]');
    expect(groups.map((g) => g.getAttribute('data-calls-group'))).toEqual(['0', '1', '2', '3']);
    expect(groups.map((g) => g.hasAttribute('data-locked'))).toEqual([false, true, true, true]);
    expect(groups[1]!.textContent).toContain('Locked');
    expect(body.querySelectorAll('[data-call]').length).toBe(18);
    expect(body.querySelector('[data-calls-summary]')!.textContent).toContain("Build a Coach's Office to unlock");
  });

  it('a club at level 3 has nothing locked', () => {
    const body = coachCallsBody(coachCallsPageData(3)) as unknown as StubNode;
    expect(body.querySelectorAll('[data-locked]')).toEqual([]);
    expect(body.textContent).toContain('Every call is unlocked.');
  });
});
