// tests/match/view/popups.test.ts — which events get shouted about (BAK-208 §6).
import { describe, it, expect } from 'vitest';
import { POPUP_BIG_MS, POPUP_MS, SLOWMO_FACTOR, SLOWMO_MS, TONE_COLOR, popupFor, surnameOf } from '../../../src/match/view/popups';
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
    expect(popupFor(ev('gassed'))).toMatchObject({ word: 'GASSED!', tone: 'bad' });
    expect(popupFor(ev('slow-ptb'))).toBeNull();
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
