// tests/ui/screens/kickoffTray.test.ts — the kick-off pair in the coach tray (#397):
// one more trayRows pair (#396), under the same five-row, six-button cap.
import { describe, it, expect } from 'vitest';
import { CALL_TILE, CALL_WHEN, OVERLAY_CSS, TRAY_MAX_BUTTONS, TRAY_MAX_ROWS, callEffect, trayHidden, trayRows, type TrayButton } from '../../../src/ui/screens/matchOverlay';
import { CALL_LABEL, unlockedCalls, type CoachCall } from '../../../src/match/league/calls';

const on = (...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why: null }));
const off = (why: string, ...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why }));

describe('the kick-off pair in the coach tray (#397)', () => {
  it('is one row, Short then Long, first in the tray, whichever way the picture shows the ball', () => {
    for (const attacking of [true, false]) {
      const rows = trayRows([...on('kickoff-short', 'kickoff-long'), ...on('rush', 'hold')], attacking);
      expect(rows[0]).toEqual({ id: 'kickoff', buttons: on('kickoff-short', 'kickoff-long') });
    }
  });

  it('is not there when the sim refuses it (their kick-off, or not the break)', () => {
    expect(trayRows([...off('their kick-off', 'kickoff-short', 'kickoff-long'), ...on('rush')], false).map((r) => r.id)).toEqual(['rush']);
    expect(trayRows([...off('at the kick-off', 'kickoff-short', 'kickoff-long'), ...on('hit-up')], true).map((r) => r.id)).toEqual(['hit-up']);
    // Called: the pair goes (the sim refuses both once one is made).
    expect(trayRows(off('called', 'kickoff-short', 'kickoff-long'), false)).toEqual([]);
  });

  it('shares the cap: with every defence call and Fresh legs on, the tray still fits, the kick-off first', () => {
    const all = [...on('kickoff-short', 'kickoff-long', 'rush', 'hold', 'gang-tackle', 'fresh-legs')];
    const rows = trayRows(all, false);
    expect(rows.length).toBeLessThanOrEqual(TRAY_MAX_ROWS);
    expect(rows.reduce((n, r) => n + r.buttons.length, 0)).toBeLessThanOrEqual(TRAY_MAX_BUTTONS);
    expect(rows[0]!.id).toBe('kickoff');
    expect(trayHidden(all, false, rows)).toEqual([]);
  });

  it('fits a short narrow phone (568×320 at Larger text, #403 review): three a line, the footer kept to one', () => {
    // A pair and four singles is three lines two a line, more than a 320-high screen has room for.
    const block = (head: string): string => OVERLAY_CSS.match(new RegExp(`${head.replace(/[()]/g, '\\$&')} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    expect(block('@media (max-height: 360px) and (max-width: 759px)')).toContain('.nrl-mo-tray-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }');
    expect(block('@media (max-height: 360px)')).toContain('.nrl-mo-tray-foot { flex-shrink: 0; -webkit-line-clamp: 1; }');
  });

  it('keeps the whole footer at Large on a 375-tall phone without a scrolling tray (#432)', () => {
    const block = (head: string): string => OVERLAY_CSS.match(new RegExp(`${head.replace(/[()]/g, '\\$&')} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    const mid = block('@media (min-height: 361px) and (max-height: 400px)');
    expect(mid).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(mid).toContain('flex-shrink: 0');
    expect(mid).toContain('-webkit-line-clamp: unset');
  });

  it('is on from Office level 0, with short tile words', () => {
    expect(unlockedCalls(0)).toEqual(expect.arrayContaining(['kickoff-short', 'kickoff-long']));
    for (const c of ['kickoff-short', 'kickoff-long'] as const) {
      expect(CALL_LABEL[c].length).toBeLessThanOrEqual(11);
      expect(CALL_TILE[c].length).toBeLessThanOrEqual(22);
      expect(callEffect(c)).not.toContain('your kick-off');
    }
    expect(CALL_WHEN['kickoff-long']).toContain('dead');
  });
});
