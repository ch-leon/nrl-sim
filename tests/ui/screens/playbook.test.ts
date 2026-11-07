// tests/ui/screens/playbook.test.ts — the club's set-play screens (#326, plan
// §4.1–4.2, §11 phase 2), on the stand-in DOM: the Staff & Board attack-coach
// row (four Hire buttons with the reputation gate, or the holder and Release);
// the Playbook (the coach card or the way to hire one, your plays with their
// fit line and the take switch, the coach's plays to buy, the other coaches'
// folded away); the Lineup's Plays sheet (its own sheet, not the plan's); the
// half-time line; the words behind them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { createNewGame, getState, setState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { closeModal } from '../../../src/ui/dom';
import { PLAYS_BY_ID, PLAY_IDS } from '../../../src/data/plays';
import { hireAttackCoach, releaseStaff } from '../../../src/systems/staff';
import { buyPlay, ownedPlays } from '../../../src/systems/playbook';
import { attackCoachRow, staffRows, openStaffScreen } from '../../../src/ui/screens/board';
import { openPlaybookScreen, playbookStatus } from '../../../src/ui/screens/playbook';
import { openLineupScreen } from '../../../src/ui/screens/lineup';
import { showPlanCard } from '../../../src/ui/screens/matchOverlay';
import { halfTimePlaysLine, playFitLine, playFitShort, playWhenLine, playsButtonLabel, todaysNine } from '../../../src/ui/playbookText';
import { setPlaysBullets } from '../../../src/ui/guide/pages';

const body = (): StubNode => document.body as unknown as StubNode;
const q = (sel: string): StubNode | null => body().querySelector(sel);
const qa = (sel: string): StubNode[] => body().querySelectorAll(sel);
const tap = (n: StubNode | null): void => { expect(n).not.toBeNull(); n!.click(); };

beforeEach(() => {
  bus.clear();
  stubDocument();
  createNewGame('Playbook FC', 7);
  setState({ money: 200_000 });
});
afterEach(() => {
  closeModal();
  bus.clear();
  vi.unstubAllGlobals();
});

describe('Staff & Board: the attack coach’s row', () => {
  it('four Hire buttons at their wages, Razzle locked under reputation 50; a hire turns it into the holder and Release', () => {
    setState({ reputation: 30 });
    const rows = staffRows(getState()) as unknown as StubNode[];
    expect(rows.map((r) => r.attrs['data-staff'])).toEqual(['assistantCoach', 'analyst', 'welfare', 'attackCoach']);
    const row = attackCoachRow(getState()) as unknown as StubNode;
    const hires = row.querySelectorAll('[data-hire-attack]');
    expect(hires.map((b) => b.attrs['data-hire-attack'])).toEqual(['direct', 'width', 'kicking', 'razzle']);
    expect(hires.map((b) => b.textContent)).toEqual(['Hire Direct$800/wk', 'Hire Width$950/wk', 'Hire Kicking$900/wk', 'Hire RazzleNeeds reputation 50']);
    expect(hires.map((b) => b.disabled)).toEqual([false, false, false, true]);
    expect(row.words()).toContain('Plays you buy stay if he goes.');

    openStaffScreen();
    tap(q('[data-hire-attack="direct"]'));
    const held = q('[data-staff="attackCoach"]')!;
    expect(held.attrs['data-speciality']).toBe('direct');
    expect(held.textContent).toContain(`Attack Coach (direct play): ${getState().staff[0]!.name} · $800/wk`);
    expect(held.querySelectorAll('[data-hire-attack]')).toHaveLength(0);
    expect(body().words()).toContain('Staff · 1 of 4 hired');
    const release = held.all().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Release')!;
    tap(release);
    expect(getState().staff).toEqual([]);
    expect(qa('[data-hire-attack]')).toHaveLength(4);
  });

  it('at reputation 50 the Razzle coach can be hired', () => {
    setState({ reputation: 50 });
    const row = attackCoachRow(getState()) as unknown as StubNode;
    expect(row.querySelector('[data-hire-attack="razzle"]')!.disabled).toBe(false);
  });
});

describe('the Playbook (plan §4.1)', () => {
  it('with no coach: the hire card links to Staff & Board, nothing to buy, every play folded under the other coaches', () => {
    openPlaybookScreen();
    expect(q('[data-playbook]')).not.toBeNull();
    expect(q('[data-playbook-coach]')!.textContent).toContain('No attack coach: hire one on Staff & Board');
    // A new career's Staff & Board opens at round 4: the link says so and waits.
    expect(q('[data-playbook-staff]')!.disabled).toBe(true);
    expect(q('[data-playbook-coach]')!.textContent).toContain('Staff & Board opens at round 4.');
    expect(q('[data-playbook-buy]')).toBeNull();
    expect(q('[data-playbook-owned]')!.textContent).toContain('Hire an attack coach to buy plays.');
    expect(q('[data-playbook-others]')!.querySelectorAll('[data-other]')).toHaveLength(PLAY_IDS.length);
    expect(playbookStatus(getState())).toBe('No attack coach');
  });

  it('with Staff & Board open the link takes you there', () => {
    createNewGame('Playbook FC', 7, { openAll: true });
    openPlaybookScreen();
    const go = q('[data-playbook-staff]')!;
    expect(go.disabled).toBe(false);
    tap(go);
    expect(q('[data-playbook]')).toBeNull();
    expect(qa('[data-hire-attack]')).toHaveLength(4);
  });

  it('hire the direct coach: his three to buy with price, fit line and Buy; Buy moves a play up, books the money and offers the take switch', () => {
    hireAttackCoach('direct');
    openPlaybookScreen();
    expect(q('[data-playbook-coach]')!.attrs['data-playbook-coach']).toBe('direct');
    expect(q('[data-playbook-coach]')!.textContent).toContain('Opens Block play, Inside ball, Short-side raid.');
    const buy = q('[data-playbook-buy]')!;
    expect(buy.querySelectorAll('[data-to-buy]').map((r) => r.attrs['data-play'])).toEqual(['block-play', 'inside-ball', 'short-side-raid']);
    const block = buy.querySelector('[data-play-buy="block-play"]')!;
    expect(block.textContent).toBe('Buy · $8,000');
    const nine = todaysNine(getState());
    expect(buy.words()).toContain(playFitLine(PLAYS_BY_ID['block-play'], nine));
    expect(buy.words()).toContain(playWhenLine(PLAYS_BY_ID['block-play']));
    // The other coaches' plays, one line each, folded.
    const others = q('[data-playbook-others]')!;
    expect(others.querySelectorAll('[data-other]')).toHaveLength(PLAY_IDS.length - 3);
    expect(others.querySelector('[data-play="cut-out-winger"]')!.textContent).toContain('Hire the shift and width coach to buy');

    tap(block);
    expect(getState().money).toBe(200_000 - 8000);
    expect(ownedPlays(getState())).toEqual(['block-play']);
    const owned = q('[data-playbook-owned]')!;
    expect(owned.querySelector('[data-play="block-play"]')).not.toBeNull();
    expect(q('[data-playbook-buy]')!.querySelector('[data-play="block-play"]')).toBeNull();
    expect(playbookStatus(getState())).toBe('1 play · 0 taken');

    tap(q('[data-play-take="block-play"]'));
    expect(getState().lineup.plays).toEqual(['block-play']);
    expect(q('[data-play-take="block-play"]')!.textContent).toBe('Taken · 1');
    expect(q('[data-play="block-play"]')!.attrs['data-taken']).toBe('1');
    expect(playbookStatus(getState())).toBe('1 play · 1 taken');
    tap(q('[data-play-take="block-play"]'));
    expect(getState().lineup.plays).toEqual([]);
  });

  it('short of money: Buy says so when tapped and buys nothing', () => {
    hireAttackCoach('direct');
    setState({ money: 5000 });
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    openPlaybookScreen();
    const b = q('[data-play-buy="block-play"]')!;
    expect(b.hasAttribute('data-refused')).toBe(true);
    tap(b);
    expect(toasts).toContain('Not enough money');
    expect(ownedPlays(getState())).toEqual([]);
    expect(getState().money).toBe(5000);
  });

  it('three taken is the most: a fourth’s switch is greyed with "Three is the most"', () => {
    hireAttackCoach('width');
    for (const id of ['cut-out-winger', 'second-man', 'block-shift'] as const) buyPlay(id);
    releaseStaff('attackCoach');
    hireAttackCoach('direct');
    buyPlay('block-play');
    setState({ lineup: { ...getState().lineup, plays: ['cut-out-winger', 'second-man', 'block-shift'] } });
    openPlaybookScreen();
    const fourth = q('[data-play-take="block-play"]')!;
    expect(fourth.disabled).toBe(true);
    expect(q('[data-play="block-play"]')!.textContent).toContain('Three is the most');
    // Bought plays stay when the coach who opened them is gone.
    expect(q('[data-playbook-owned]')!.querySelectorAll('[data-owned]').map((r) => r.attrs['data-play'])).toEqual(['block-play', 'cut-out-winger', 'second-man', 'block-shift']);
    expect(q('[data-play-take="second-man"]')!.textContent).toBe('Taken · 2');
  });
});

describe('the Lineup’s Plays sheet (plan §4.2)', () => {
  it('a Plays button beside Plan opens its own sheet: owned plays as rows, ticked in the order tapped, three at most', () => {
    hireAttackCoach('direct');
    for (const id of ['block-play', 'inside-ball', 'short-side-raid'] as const) buyPlay(id);
    releaseStaff('attackCoach');
    hireAttackCoach('kicking');
    buyPlay('kick-pass');
    openLineupScreen();
    const btn = q('[data-plays]')! as unknown as HTMLButtonElement & StubNode;
    const full = (): string => btn.querySelector('.nrl-lineup-plays-full')!.textContent;
    const short = (): string => btn.querySelector('.nrl-lineup-plays-short')!.textContent;
    expect(full()).toBe('Plays: — · — · —');
    expect(short()).toBe('Plays 0/3');
    btn.onclick!.call(btn, {} as PointerEvent);
    const sheet = q('[data-plays-sheet]')!;
    expect(sheet).not.toBeNull();
    // Not inside the plan sheet: no presets in it.
    expect(sheet.querySelectorAll('[data-tactic]')).toHaveLength(0);
    expect(q('[data-plan-done]')).toBeNull();
    const rows = (): StubNode[] => q('[data-plays-list]')!.querySelectorAll('[data-play]');
    expect(rows().map((r) => r.attrs['data-play'])).toEqual(['block-play', 'inside-ball', 'short-side-raid', 'kick-pass']);
    tap(rows().find((r) => r.attrs['data-play'] === 'kick-pass')!);
    tap(rows().find((r) => r.attrs['data-play'] === 'block-play')!);
    expect(getState().lineup.plays).toEqual(['kick-pass', 'block-play']);
    expect(rows().find((r) => r.attrs['data-play'] === 'kick-pass')!.attrs['aria-pressed']).toBe('true');
    expect(full()).toBe('Plays: Kick-pass · Block play · —');
    expect(short()).toBe('Plays 2/3');
    expect(btn.title).toContain('Plays: Kick-pass · Block play · —: the set plays you take into the match');
    tap(rows().find((r) => r.attrs['data-play'] === 'inside-ball')!);
    // The fourth is greyed and refused.
    const fourth = rows().find((r) => r.attrs['data-play'] === 'short-side-raid')!;
    expect(fourth.hasAttribute('data-full')).toBe(true);
    tap(fourth);
    expect(getState().lineup.plays).toEqual(['kick-pass', 'block-play', 'inside-ball']);
    // A second tap leaves one out; the others keep their order.
    tap(rows().find((r) => r.attrs['data-play'] === 'block-play')!);
    expect(getState().lineup.plays).toEqual(['kick-pass', 'inside-ball']);
    expect(q('[data-plays-playbook]')).not.toBeNull();
    // Auto pick keeps the plays.
    tap(q('[data-auto-pick]'));
    expect(getState().lineup.plays).toEqual(['kick-pass', 'inside-ball']);
  });

  it('with nothing bought the sheet points at the Playbook', () => {
    openLineupScreen();
    const btn = q('[data-plays]')! as unknown as HTMLButtonElement & StubNode;
    btn.onclick!.call(btn, {} as PointerEvent);
    expect(q('[data-plays-list]')!.textContent).toContain('Buy plays on the Playbook');
  });
});

describe('the half-time card’s read-only line and the words', () => {
  it('"Plays: …" under the tendency when the side took any; nothing otherwise', () => {
    const card = showPlanCard({ head: 'Half-time', tactics: { attack: 'balanced', defence: 'slide' }, onPick: () => null, onDone: () => {}, plays: halfTimePlaysLine(['block-play', 'cut-out-winger']) ?? undefined });
    const line = (card.el as unknown as StubNode).querySelector('[data-plan-plays]')!;
    expect(line.textContent).toBe('Plays: Block play · Cut-out');
    expect((card.el as unknown as StubNode).querySelectorAll('[data-play-take]')).toHaveLength(0);
    card.close();
    const none = showPlanCard({ head: 'Half-time', tactics: { attack: 'balanced', defence: 'slide' }, onPick: () => null, onDone: () => {}, plays: halfTimePlaysLine(undefined) ?? undefined });
    expect((none.el as unknown as StubNode).querySelector('[data-plan-plays]')).toBeNull();
    none.close();
    expect(halfTimePlaysLine([])).toBeNull();
  });

  it('fit lines name each man against the need; when lines read the catalogue', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ name: `Man Number${i}`, footyIQ: 55 }));
    expect(playFitLine(PLAYS_BY_ID['block-play'], nine)).toBe('Needs: Number5 55/58 ⚠ · Number7 55/50 ✓ · Number8 55/52 ✓');
    expect(playFitShort(PLAYS_BY_ID['block-play'], nine)).toEqual({ ok: false, text: '⚠ Number5 55/58' });
    expect(playFitShort(PLAYS_BY_ID['inside-ball'], nine)).toEqual({ ok: true, text: '✓ IQ' });
    expect(playWhenLine(PLAYS_BY_ID['block-play'])).toBe('Tackles 1–3 · your half to their half');
    expect(playWhenLine(PLAYS_BY_ID['short-side-raid'])).toBe('Tackles 1–3 · anywhere but your 20 · down the short side');
    expect(playWhenLine(PLAYS_BY_ID['kick-pass'])).toBe('Tackles 4–5 · inside 25 m of their line · to the open side');
    expect(playWhenLine(PLAYS_BY_ID['tap-rambo'])).toBe('Off a tap · their half to their 20');
    expect(playWhenLine(PLAYS_BY_ID['long-ball'])).toBe('Off a tap or the play-the-ball · tackle 1 · anywhere but your 20 · to the open side');
    expect(playsButtonLabel([])).toBe('Plays: — · — · —');
    expect(playsButtonLabel(['block-play', 'cut-out-winger'])).toBe('Plays: Block play · Cut-out · —');
  });

  it('the Guide’s set-plays bullets come from the staff table and the catalogue', () => {
    const text = setPlaysBullets().join(' ');
    expect(text).toContain('Direct ($800 a week on Normal), Width ($950 a week on Normal), Kicking ($900 a week on Normal), Razzle ($1,250 a week on Normal)');
    expect(text).toContain('reputation 50');
    for (const id of PLAY_IDS) expect(text).toContain(PLAYS_BY_ID[id].name);
    expect(text).toContain('Take up to 3');
  });
});
