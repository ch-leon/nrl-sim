// tests/ui/screens/matchTrayPlays.test.ts — set plays on the match screen (#326,
// phase 3): the coach tray's Plays section (three tiles at most, only with the ball,
// none for a club with no playbook), each tile's caption (its worst man's IQ, the
// refusal, or "next play" once called), the COACH badge counting plays and naming
// one called, the calls giving way while the plays show, the result tag for the four
// outcomes, the pop-ups, the commentary's new moments and the Coach calls page's
// footnote. Built on the stub DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import {
  TRAY_CAP,
  TRAY_CAP_WITH_PLAYS,
  coachBadge,
  playCaption,
  renderCoachBadge,
  trayHidden,
  trayPlayEls,
  trayPlays,
  trayPlaysKey,
  trayPlaysOn,
  trayRows,
  trayWithLocked,
  type TrayButton,
  type TrayPlay,
} from '../../../src/ui/screens/matchOverlay';
import { PLAYS } from '../../../src/match/league/plays';
import { callResultText, unlockLevel, type CallVerdict, type CoachCall } from '../../../src/match/league/calls';
import type { PlayId } from '../../../src/data/plays';
import { popupFor } from '../../../src/match/view/popups';
import { Commentator, LINES } from '../../../src/match/view/commentary';
import type { SimEvent } from '../../../src/match/core/snapshot';
import { SET_PLAYS_FOOTNOTE, coachCallsPageData } from '../../../src/ui/coachCallsText';
import { coachCallsBody } from '../../../src/ui/screens/coachCalls';
import { KeyMoments } from '../../../src/match/view/livePlayback';

const met = { name: 'Nathan Cleary', iq: 64, short: 0 };
const tile = (play: PlayId, over: Partial<TrayPlay> = {}): TrayPlay => ({ play, why: null, pending: false, worst: met, ...over });
const three: TrayPlay[] = [tile('block-play'), tile('cut-out-winger', { why: 'not from here' }), tile('kick-pass', { worst: { name: 'Tom Jones', iq: 49.4, short: 11 } })];
const on = (...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why: null }));
const buttonsOf = (els: HTMLElement[]): StubNode[] => els as unknown as StubNode[];

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

describe('the tray’s Plays section (#326)', () => {
  it('shows the side’s plays in its order while it has the ball, none while defending or with no playbook', () => {
    expect(trayPlays(three, true).map((p) => p.play)).toEqual(['block-play', 'cut-out-winger', 'kick-pass']);
    expect(trayPlays(three, false)).toEqual([]);
    expect(trayPlays([], true)).toEqual([]);
    expect(trayPlays([], false)).toEqual([]);
  });

  it('never holds more than PLAYS.takeMax (3) tiles', () => {
    expect(PLAYS.takeMax).toBe(3);
    expect(trayPlays([...three, tile('second-man')], true)).toHaveLength(3);
  });

  it('captions a tile with its worst man’s IQ, its refusal, or "next play" once called', () => {
    expect(playCaption(tile('block-play'))).toBe('✓ IQ');
    expect(playCaption(three[2]!)).toBe('⚠ Jones 49');
    expect(playCaption(tile('block-play', { why: 'not from here' }))).toBe('not from here');
    expect(playCaption(tile('block-play', { why: 'one play a set' }))).toBe('one play a set');
    expect(playCaption(tile('block-play', { why: 'last tackle' }))).toBe('last tackle');
    expect(playCaption(tile('block-play', { why: 'the kick’s away' }))).toBe('kick’s away');
    expect(playCaption(tile('block-play', { why: 'at the breaks' }))).toBe('wait for play');
    // Called and waiting for the play-the-ball: the sim already refuses a second ("one play a set").
    expect(playCaption(tile('block-play', { why: 'one play a set', pending: true }))).toBe('next play');
  });

  it('counts the plays that can be called now', () => {
    expect(trayPlaysOn(three)).toBe(2);
    expect(trayPlaysOn([tile('block-play', { pending: true, why: 'one play a set' })])).toBe(0);
    expect(trayPlaysOn([])).toBe(0);
  });

  it('builds a 44px call tile per play: short name on top, caption under, a tap calls it; a refused or waiting play is greyed', () => {
    const called: PlayId[] = [];
    const tiles = buttonsOf(trayPlayEls([...three, tile('second-man', { why: 'one play a set', pending: true })], (id) => called.push(id)));
    expect(tiles.map((b) => b.getAttribute('data-play'))).toEqual(['block-play', 'cut-out-winger', 'kick-pass', 'second-man']);
    for (const b of tiles) {
      expect(b.className).toContain('nrl-mo-tray-call');
      expect(b.getAttribute('data-call')).toBe('set-play');
    }
    expect(tiles.map((b) => b.children[0]?.textContent)).toEqual(['Block play', 'Cut-out', 'Kick-pass', 'Second man']);
    expect(tiles.map((b) => b.children[1]?.textContent)).toEqual(['✓ IQ', 'not from here', '⚠ Jones 49', 'next play']);
    expect(tiles.map((b) => b.disabled)).toEqual([false, true, false, true]);
    expect(tiles[3]!.getAttribute('data-pending')).not.toBeNull();
    expect((tiles[2] as unknown as { title: string }).title).toContain('Tom Jones has footy IQ 49, 11 short');
    tiles[0]!.click();
    tiles[2]!.click();
    expect(called).toEqual(['block-play', 'kick-pass']);
  });

  it('keys the section on what each tile says, so a tile is not rebuilt under the finger', () => {
    expect(trayPlaysKey(three)).toBe(trayPlaysKey([...three]));
    expect(trayPlaysKey(three)).not.toBe(trayPlaysKey([tile('block-play', { why: 'one play a set' }), three[1]!, three[2]!]));
    expect(trayPlaysKey([])).toBe('');
  });
});

describe('the COACH badge with plays (#326)', () => {
  it('counts plays beside the calls, and alone', () => {
    expect(coachBadge(2, true, null, { on: 1 })).toEqual({ text: '2 calls · 1 play', state: 'on' });
    expect(coachBadge(1, true, null, { on: 3 })).toEqual({ text: '1 call · 3 plays', state: 'on' });
    expect(coachBadge(0, true, null, { on: 2 })).toEqual({ text: '2 plays', state: 'on' });
  });

  it('names a called play like a made call', () => {
    expect(coachBadge(2, true, null, { on: 0, made: 'cut-out-winger' })).toEqual({ text: 'Cut-out', state: 'made' });
    expect(coachBadge(2, true, 'hit-up', { made: 'block-play' })).toEqual({ text: 'Block play', state: 'made' });
  });

  it('reads as before for a club with no playbook', () => {
    expect(coachBadge(3, true, null)).toEqual(coachBadge(3, true, null, {}));
    expect(coachBadge(3, true, null, { on: 0 })).toEqual({ text: '3 calls', state: 'on' });
    expect(coachBadge(0, false, null, { on: 0 })).toEqual({ text: 'Their ball', state: 'off' });
    expect(coachBadge(0, true, 'hit-up', { made: null })).toEqual({ text: 'Hit-up', state: 'made' });
  });
});

describe('the COACH badge’s element (#326)', () => {
  it('holds calls and plays as two parts (stacked on a narrow phone), and anything else as plain text as before', () => {
    const el = document.createElement('span') as unknown as StubNode;
    const badge = el as unknown as HTMLElement;
    renderCoachBadge(badge, '3 calls');
    expect(el.textContent).toBe('3 calls');
    expect(el.children).toHaveLength(0);
    expect(el.getAttribute('data-parts')).toBeNull();
    renderCoachBadge(badge, '2 calls · 1 play');
    expect(el.textContent).toBe('2 calls · 1 play');
    expect(el.children.map((c) => c.className)).toEqual(['nrl-mo-badge-calls', 'nrl-mo-badge-sep', 'nrl-mo-badge-plays']);
    expect(el.getAttribute('data-parts')).not.toBeNull();
    renderCoachBadge(badge, 'Block play');
    expect(el.textContent).toBe('Block play');
    expect(el.children).toHaveLength(0);
    expect(el.getAttribute('data-parts')).toBeNull();
  });
});

describe('the calls give way while the plays show (#326)', () => {
  const full = on('hit-up', 'shift-left', 'shift-right', 'offload', 'kick-early', 'fresh-legs', 'run-it');

  it('the default cap is today’s: five rows, six buttons', () => {
    expect(TRAY_CAP).toEqual({ rows: 5, buttons: 6 });
    expect(trayRows(full, true)).toEqual(trayRows(full, true, TRAY_CAP));
    const locked = (['bomb', 'grubber'] as CoachCall[]).map((call) => ({ call, why: null, locked: unlockLevel(call) }));
    expect(trayWithLocked(trayRows(on('hit-up'), true), locked)).toEqual(trayWithLocked(trayRows(on('hit-up'), true), locked, TRAY_CAP));
  });

  it('with plays the calls keep three tiles, the most pressing first, and the footer names the rest', () => {
    const rows = trayRows(full, true, TRAY_CAP_WITH_PLAYS);
    const shown = rows.flatMap((r) => r.buttons.map((b) => b.call));
    expect(shown.length).toBeLessThanOrEqual(3);
    // The set's kicks (on two tackles only) and the bench outrank the next play's calls (TRAY_PRIORITY).
    expect(shown).toEqual(['kick-early', 'run-it', 'fresh-legs'].filter((c) => shown.includes(c as CoachCall)));
    expect(trayHidden(full, true, rows).length).toBe(full.length - shown.length);
  });

  it('with plays a locked teaser never pushes past the three', () => {
    const locked = (['shift-left', 'shift-right', 'offload'] as CoachCall[]).map((call) => ({ call, why: null, locked: unlockLevel(call) }));
    const { rows, overflow } = trayWithLocked(trayRows(on('hit-up', 'fresh-legs'), true, TRAY_CAP_WITH_PLAYS), locked, TRAY_CAP_WITH_PLAYS);
    expect(rows.reduce((n, r) => n + r.buttons.length, 0)).toBeLessThanOrEqual(3);
    expect(overflow.length).toBeGreaterThan(0);
  });
});

describe('the result tag over COACH for a play (#326)', () => {
  const v = (how: string, extra: Partial<CallVerdict> = {}): CallVerdict => ({ side: 'home', call: 'set-play', paid: false, metres: 0, how, play: 'block-play', ...extra });
  it('says the metres, a line break, a breakdown and an intercept, by the play’s short name', () => {
    expect(callResultText(v('gain', { metres: 9, paid: true }))).toBe('Block play +9m');
    expect(callResultText(v('line-break', { paid: true, play: 'cut-out-winger' }))).toBe('Cut-out: line break!');
    expect(callResultText(v('breakdown'))).toBe('Block play: broke down');
    expect(callResultText(v('intercept', { play: 'long-ball' }))).toBe('Long ball: intercepted');
  });
});

describe('the pop-ups for a play (#326)', () => {
  const ev = (kind: string, detail?: string): SimEvent => ({ tick: 5, kind, text: '', side: 'home', slot: 5, player: 'Jarrah Kavanagh', ...(detail ? { detail } : {}) });
  it('shouts the play’s short name in caps over the caller, not as a big moment', () => {
    expect(popupFor(ev('set-play', 'block-play'))).toMatchObject({ word: 'BLOCK PLAY!', sub: 'KAVANAGH', tone: 'attack', big: false });
    expect(popupFor(ev('set-play', 'tap-rambo'))?.word).toBe('RAMBO!');
    expect(popupFor(ev('set-play'))?.word).toBe('PLAY!');
  });
  it('a breakdown is neutral and small', () => {
    expect(popupFor(ev('play-breaks-down', 'cut-out-winger'))).toMatchObject({ word: 'BROKE DOWN', sub: 'KAVANAGH', tone: 'neutral', big: false });
  });
  it('a play is not a key moment by itself: the ×1/×2 pacing is unchanged', () => {
    const k = new KeyMoments();
    for (const kind of ['coach-call', 'set-play', 'play-breaks-down', 'call-paid']) k.note({ kind });
    expect(k.cap({ half: 1, seconds: 60 }, 20)).toBeNull();
  });
});

describe('the commentary for a play (#326)', () => {
  const ev = (kind: string, over: Partial<SimEvent> = {}): SimEvent => ({ tick: 5, kind, text: `sim: ${kind}`, side: 'home', slot: 5, player: 'Jarrah Kavanagh', ...over });
  /** The coach's own moments name no player. */
  const box = (kind: string, over: Partial<SimEvent> = {}): SimEvent => ({ tick: 5, kind, text: `sim: ${kind}`, side: 'home', ...over });
  const said = (key: string, line: string, fill: Record<string, string>): boolean =>
    LINES[key]!.some((l) => l.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? '').replace(/^./, (c) => c.toUpperCase()) === line);
  const fill = { player: 'Jarrah Kavanagh', team: 'Scorpions', play: 'the block play' };

  it('has three lines each for the half’s own call and a play paying off', () => {
    expect(LINES['set-play:half']).toHaveLength(3);
    expect(LINES['call-paid:play']).toHaveLength(3);
  });

  it('tells the half’s own call from the coach’s', () => {
    const c = new Commentator(3, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' });
    const half = c.line(ev('set-play', { detail: 'block-play', tick: 1 }));
    expect(said('set-play:half', half, fill)).toBe(true);
    c.line(ev('coach-call', { detail: 'set-play:block-play', tick: 2 }));
    const coach = c.line(ev('set-play', { detail: 'block-play', tick: 3 }));
    expect(said('set-play', coach, fill)).toBe(true);
    // The call was run: the next launch is the half's again.
    expect(said('set-play:half', c.line(ev('set-play', { detail: 'block-play', tick: 9 })), fill)).toBe(true);
  });

  it('a call that never ran is forgotten at the next set', () => {
    const c = new Commentator(3, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' });
    c.line(ev('coach-call', { detail: 'set-play:block-play', tick: 2 }));
    c.line(ev('set-start', { side: 'away', tick: 3 }));
    expect(said('set-play:half', c.line(ev('set-play', { detail: 'block-play', tick: 9 })), fill)).toBe(true);
  });

  it('names the play the coach called when it pays off, and falls back to the call’s line when it never heard one', () => {
    const c = new Commentator(3, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' });
    c.line(ev('coach-call', { detail: 'set-play:block-play', tick: 2 }));
    c.line(ev('set-play', { detail: 'block-play', tick: 3 }));
    const paid = c.line(box('call-paid', { detail: 'set-play', tick: 4 }));
    expect(said('call-paid:play', paid, fill)).toBe(true);
    const cold = new Commentator(3, { home: 'Shellharbour Scorpions', away: 'Zone Test FC' }).line(box('call-paid', { detail: 'set-play', tick: 4 }));
    expect(said('call-paid', cold, { ...fill, call: 'set play' })).toBe(true);
  });
});

describe('the Coach calls page’s footnote (#326)', () => {
  it('says set plays come from the Playbook, at every Coach’s Office level', () => {
    expect(SET_PLAYS_FOOTNOTE).toBe('Set plays come from the Playbook');
    for (const level of [0, 1, 2, 3]) expect(coachCallsPageData(level).playsLine.startsWith(SET_PLAYS_FOOTNOTE)).toBe(true);
    // Set plays are not a Coach's Office call: no group lists them.
    expect(coachCallsPageData(3).groups.flatMap((g) => g.calls.map((c) => c.call))).not.toContain('set-play');
  });

  it('shows it on the page, under the groups', () => {
    const body = coachCallsBody(coachCallsPageData(1)) as unknown as StubNode;
    const foot = body.querySelector('[data-calls-plays]');
    expect(foot?.textContent?.startsWith(SET_PLAYS_FOOTNOTE)).toBe(true);
    expect(body.children[body.children.length - 1]).toBe(foot);
  });
});
