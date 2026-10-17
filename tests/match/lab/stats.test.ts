// tests/match/lab/stats.test.ts — the lab's five-minute stats window.
import { describe, it, expect } from 'vitest';
import { WINDOW_TICKS, statsLine, statsWindow } from '../../../src/match/lab/stats';
import type { SimEvent } from '../../../src/match/core/snapshot';

const e = (tick: number, kind: string, trait?: string): SimEvent => ({ tick, kind, text: '', ...(trait ? { trait } : {}) });

describe('statsWindow', () => {
  it('counts the kinds inside the window only', () => {
    const h = [e(10, 'tackle'), e(20, 'big-hit'), e(30, 'break-tackle'), e(40, 'fend'), e(50, 'offload'), e(60, 'error'), e(70, 'kick'), e(80, 'try'), e(90, 'set-start')];
    const s = statsWindow(h, 100, 1000);
    expect(s).toMatchObject({ tackles: 2, breaks: 2, offloads: 1, errors: 1, kicks: 1, tries: 1 });
    expect(s.seconds).toBeCloseTo(5); // 100 ticks of history exist
    const late = statsWindow(h, 100, 45); // (55, 100]
    expect(late).toMatchObject({ tackles: 0, breaks: 0, offloads: 0, errors: 1, kicks: 1, tries: 1 });
    expect(late.seconds).toBeCloseTo(45 / 20);
  });
  it('counts the events a special skill shaped', () => {
    const h = [e(10, 'step', 'Dancing Feet II'), e(20, 'tackle', 'Wrecking Ball I'), e(30, 'tackle')];
    expect(statsWindow(h, 100, 1000).traits).toBe(2);
  });
  it('defaults to five minutes and ignores future events', () => {
    expect(WINDOW_TICKS).toBe(6000);
    const s = statsWindow([e(7000, 'try'), e(600, 'try'), e(500, 'try'), e(100, 'try')], 6500);
    expect(s.tries).toBe(1); // tick 600 only: 500 is the window's open edge, 100 is before it, 7000 is in the future
    expect(s.seconds).toBe(300);
  });
  it('prints a compact line', () => {
    expect(statsLine({ tackles: 31, breaks: 7, offloads: 2, errors: 3, kicks: 4, tries: 1, traits: 5, seconds: 252 })).toBe('last 4:12 · T 31 · Brk 7 · Off 2 · Err 3 · K 4 · Try 1 · Skill 5');
  });
});
