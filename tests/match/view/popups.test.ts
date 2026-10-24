// tests/match/view/popups.test.ts — which events get shouted about (BAK-208 §6).
import { describe, it, expect } from 'vitest';
import {
  BONUS_SUB,
  POPUP_BIG_MS,
  POPUP_EDGE,
  POPUP_LINE_H,
  POPUP_MS,
  SLOWMO_FACTOR,
  SLOWMO_MS,
  TONE_COLOR,
  POPUP_GAP,
  POPUP_HALF_W,
  clampPopupAnchor,
  placePopup,
  popupFor,
  popupTextHeight,
  surnameOf,
} from '../../../src/match/view/popups';
import type { SimEvent } from '../../../src/match/core/snapshot';

const ev = (kind: string, player = 'Jarrah Kavanagh'): SimEvent => ({ tick: 10, kind, text: '', side: 'home', slot: 3, player });

describe('popupFor', () => {
  it('announces breaks, fends, offloads, big hits, errors, kicks and tries with the surname', () => {
    expect(popupFor(ev('break-tackle'))).toEqual({ word: 'BUST!', sub: 'KAVANAGH', tone: 'attack', big: true, ms: POPUP_BIG_MS });
    expect(popupFor(ev('fend'))).toMatchObject({ word: 'FEND!', big: false, ms: POPUP_MS });
    expect(popupFor(ev('offload'))).toMatchObject({ word: 'OFFLOAD!', tone: 'attack' });
    expect(popupFor(ev('big-hit'))).toMatchObject({ word: 'BIG HIT!', tone: 'defence', big: true });
    expect(popupFor(ev('error'))).toMatchObject({ word: 'KNOCK-ON!', tone: 'bad' });
    expect(popupFor(ev('kick'))).toMatchObject({ word: 'KICK!', tone: 'neutral' });
    expect(popupFor(ev('try'))).toMatchObject({ word: 'TRY!', big: true });
    expect(popupFor(ev('handover'))).toMatchObject({ word: 'HANDOVER' });
  });
  it('points a bonus try at the zone (#77): its second line says where it came from', () => {
    expect(popupFor({ ...ev('try'), detail: 'bonus' })).toEqual({ word: 'BONUS TRY!', sub: BONUS_SUB, tone: 'attack', big: true, ms: POPUP_BIG_MS });
    expect(BONUS_SUB).toBe('FROM THE ZONE');
    expect(popupFor(ev('try'))?.sub).toBe('KAVANAGH');
  });
  it('stays quiet for routine events', () => {
    for (const k of ['tackle', 'set-start', 'kickoff', 'pass', 'turnover']) expect(popupFor(ev(k))).toBeNull();
  });
  it('names a firing trait on a third line, and shouts a tackle only when a trait shaped it', () => {
    const step = popupFor({ ...ev('step'), trait: 'Dancing Feet II' });
    expect(step).toMatchObject({ word: 'STEP!', sub: 'KAVANAGH', trait: 'DANCING FEET II' });
    expect(popupFor(ev('step'))?.trait).toBeUndefined();
    expect(popupFor({ ...ev('tackle'), trait: 'Wrecking Ball I' })).toMatchObject({ word: 'DRIVE!', tone: 'attack', trait: 'WRECKING BALL I' });
    expect(popupFor(ev('cut-out'))).toMatchObject({ word: 'CUT-OUT!', tone: 'attack' });
    expect(popupFor(ev('gamble'))).toMatchObject({ word: 'GAMBLED!', tone: 'bad' });
  });
  it('copes with a missing name and knows the future kinds', () => {
    expect(popupFor({ tick: 1, kind: 'fend', text: '', side: 'home', slot: 1 })?.sub).toBe('');
    expect(surnameOf('  Lachie   Tuilagi ')).toBe('Tuilagi');
    expect(surnameOf(undefined)).toBe('');
    for (const k of ['step', 'strip', 'intercept']) expect(popupFor(ev(k))).not.toBeNull();
  });
  it('the wrestle and legs: a late bust breaks free, a quick play-the-ball and a gassed player are shouted, a slow ruck is not', () => {
    expect(popupFor({ ...ev('break-tackle'), detail: 'wrestle' })).toMatchObject({ word: 'BROKE FREE!', tone: 'attack', big: true });
    expect(popupFor(ev('quick-ptb'))).toMatchObject({ word: 'QUICK PTB!', tone: 'attack', big: false });
    expect(popupFor(ev('gassed'))).toMatchObject({ word: 'COOKED!', tone: 'bad' });
    expect(popupFor(ev('slow-ptb'))).toBeNull();
    expect(popupFor(ev('run-down'))).toMatchObject({ word: 'RUN DOWN!', tone: 'defence', big: true });
    expect(popupFor(ev('blown'))).toBeNull(); // out of gas is commentary, not a shout
  });
  it('keeps a pop-up inside the view, including one lifted off the top at ×8', () => {
    const phone = { left: 0, top: 0, width: 844, height: 390 };
    const mid = { x: 400, y: 200 };
    const h = popupTextHeight(2, 1);
    expect(clampPopupAnchor(mid, h, phone, 1)).toEqual(mid);
    // ×8: the view is an eighth of the screen, and a 40 px world lift (BASE_LIFT) over a man near the top walks off it.
    const zoom = 8;
    const view = { left: 200, top: 100, width: 844 / zoom, height: 390 / zoom };
    const feetY = view.top + 6;
    const lifted = { x: view.left + view.width / 2, y: feetY - 40 };
    const textH = popupTextHeight(2, zoom);
    const clamped = clampPopupAnchor(lifted, textH, view, zoom);
    const top = view.top + POPUP_EDGE / zoom;
    expect(lifted.y).toBeLessThan(top);
    expect(clamped.y - textH).toBeGreaterThanOrEqual(top - 1e-6);
    expect(clamped.y).toBeLessThanOrEqual(view.top + view.height - POPUP_EDGE / zoom + 1e-6);
    expect(clamped.x).toBe(lifted.x);
    // The left edge keeps half a word on screen.
    const wide = clampPopupAnchor({ x: view.left, y: view.top + view.height / 2 }, popupTextHeight(1, zoom), view, zoom);
    expect(wide.x).toBeCloseTo(view.left + Math.min(64 / zoom, view.width / 2));
    expect(POPUP_LINE_H).toBeGreaterThan(0);
  });
  it('separates two shouts the clamp would pin to the same edge', () => {
    const zoom = 8;
    const view = { left: 200, top: 100, width: 844 / zoom, height: 390 / zoom };
    const textH = popupTextHeight(2, zoom);
    const a = { x: view.left + view.width / 2, y: view.top - 10 };
    const b = { x: a.x + 1, y: view.top - 4 };
    const first = placePopup(a, textH, [], view, zoom);
    const second = placePopup(b, textH, [{ x: first.x, y: first.y, h: textH }], view, zoom);
    const half = POPUP_HALF_W / zoom;
    const overlapX = Math.abs(first.x - second.x) < half * 2;
    const overlapY = second.y > first.y - textH && second.y - textH < first.y;
    expect(overlapX && overlapY).toBe(false);
    const top = view.top + POPUP_EDGE / zoom;
    const bottom = view.top + view.height - POPUP_EDGE / zoom;
    expect(second.y - textH).toBeGreaterThanOrEqual(top - 1e-6);
    expect(second.y).toBeLessThanOrEqual(bottom + 1e-6);
    expect(POPUP_GAP).toBeGreaterThan(0);
    // A view only one shout tall cannot drop the second one, so it steps aside.
    const short = { left: 0, top: 0, width: 400, height: 60 };
    const tall = 44;
    const left = placePopup({ x: 200, y: 30 }, tall, [], short, 1);
    const right = placePopup({ x: 200, y: 30 }, tall, [{ x: left.x, y: left.y, h: tall }], short, 1);
    const still = Math.abs(left.x - right.x) < POPUP_HALF_W * 2 && right.y > left.y - tall && right.y - tall < left.y;
    expect(still).toBe(false);
  });
  it('big moments last longer and get a short slow-motion beat', () => {
    expect(POPUP_BIG_MS).toBeGreaterThan(POPUP_MS);
    expect(SLOWMO_MS).toBeGreaterThan(200);
    expect(SLOWMO_MS).toBeLessThan(600);
    expect(SLOWMO_FACTOR).toBeGreaterThan(0.1);
    expect(SLOWMO_FACTOR).toBeLessThan(0.6);
    for (const tone of ['attack', 'defence', 'neutral', 'bad'] as const) expect(TONE_COLOR[tone]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
