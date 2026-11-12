// Impact tiers (#631): screen-only time scaling and camera nudges. The sim is the
// same for a seed whatever the beats do; reduced motion turns them all off.
import { describe, it, expect } from 'vitest';
import { Runner, TICK_MS, slowFactorAt, type MatchSim } from '../../../src/match/core/engine';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { popupFor } from '../../../src/match/view/popups';
import {
  FREEZE_MS, SHAKE_MS, SHAKE_PX, TIER1_FACTOR, TIER1_MS, TIER1_RAMP_MS,
  impactTier, playImpact, shakeIntensity, type ImpactRig,
} from '../../../src/match/view/impact';
import { blendPace, KEY_CAP_IN_MS, KEY_CAP_OUT_MS } from '../../../src/match/view/livePlayback';
import { contestMarkFor } from '../../../src/match/view/contestLayer';

function counter(seed: number): MatchSim {
  let tick = 0;
  return {
    get tick() { return tick; },
    get finished() { return tick >= 5000; },
    step() { tick++; },
    snapshot(): Snapshot {
      return { tick, players: [], ball: { x: tick + seed, y: 0, lift: 0, holder: null }, label: '', events: [] };
    },
  };
}

const ev = (kind: string, extra: object = {}) => ({ tick: 1, kind, text: '', side: 'home' as const, slot: 1, player: 'A B', ...extra });

describe('which tier a moment is', () => {
  it('tier 1: a try, a clean line break, a 40/20', () => {
    for (const k of ['try', 'line-break', '40-20']) expect(impactTier(ev(k), popupFor(ev(k)))).toBe(1);
  });
  it('tier 2: a big hit, a bust, a strip, an intercept', () => {
    for (const k of ['big-hit', 'break-tackle', 'strip', 'intercept']) expect(impactTier(ev(k), popupFor(ev(k))), k).toBe(2);
  });
  it('tier 3: the other big pop-ups, the pop-up alone', () => {
    for (const k of ['regather', 'run-down', 'penalty', 'field-goal', 'charge-down']) expect(impactTier(ev(k), popupFor(ev(k))), k).toBe(3);
  });
  it('no tier for a small shout, a half break, a missed goal or nothing to say', () => {
    expect(impactTier(ev('step'), popupFor(ev('step')))).toBeNull();
    expect(impactTier(ev('line-break', { detail: 'half' }), popupFor(ev('line-break', { detail: 'half' })))).toBeNull();
    expect(impactTier(ev('conversion', { detail: 'missed' }), popupFor(ev('conversion', { detail: 'missed' })))).toBeNull();
    expect(impactTier(ev('tackle'), popupFor(ev('tackle')))).toBeNull();
  });
  it('every tier-2 contact moment leaves dust at the contact point', () => {
    const snap = { players: [{ side: 'home' as const, slot: 1, x: 40, y: 30, headX: 1 }], ball: { holder: { side: 'home' as const, slot: 1 } } };
    for (const k of ['big-hit', 'break-tackle', 'strip', 'intercept']) expect(contestMarkFor(ev(k), snap as never)?.kind, k).toBe('dust');
  });
});

function rig(zoom = 1, width = 800) {
  const calls: string[] = [];
  const shakes: { ms: number; intensity: number }[] = [];
  const r: ImpactRig = {
    runner: { slowMo: (ms, f, ramp) => calls.push(`slow ${ms} ${f} ${ramp}`), freeze: (ms) => calls.push(`freeze ${ms}`) },
    camera: { zoom, width, worldView: { width: width / zoom }, shake: (ms, intensity) => shakes.push({ ms, intensity }) },
  };
  return { r, calls, shakes };
}

describe('playing a tier', () => {
  it('tier 1 ramps a long slow-motion and asks for the close-up; tier 2 freezes and shakes; tier 3 does nothing to the clock', () => {
    const a = rig();
    expect(playImpact(1, a.r, false)).toBe(true);
    expect(a.calls).toEqual([`slow ${TIER1_MS} ${TIER1_FACTOR} ${TIER1_RAMP_MS}`]);
    expect(a.shakes).toEqual([]);
    const b = rig();
    expect(playImpact(2, b.r, false)).toBe(false);
    expect(b.calls).toEqual([`freeze ${FREEZE_MS}`]);
    expect(b.shakes).toHaveLength(1);
    expect(b.shakes[0]!.ms).toBe(SHAKE_MS);
    const c = rig();
    expect(playImpact(3, c.r, false)).toBe(false);
    expect(c.calls).toEqual([]);
    expect(c.shakes).toEqual([]);
  });
  it('under reduced motion there is no freeze, shake or slow-motion', () => {
    for (const t of [1, 2, 3] as const) {
      const a = rig();
      playImpact(t, a.r, true);
      expect(a.calls, `tier ${t}`).toEqual([]);
      expect(a.shakes, `tier ${t}`).toEqual([]);
    }
  });
  it('a shake throws the picture the same distance on screen at any zoom', () => {
    // Phaser throws it intensity × width × zoom world px, and the zoom scales that again on screen.
    for (const zoom of [0.5, 1, 2, 4]) {
      const onScreen = shakeIntensity(SHAKE_PX, 800, zoom) * 800 * zoom * zoom;
      expect(onScreen).toBeCloseTo(SHAKE_PX, 6);
    }
  });
});

describe('the runner scales time only', () => {
  it('a freeze stands still for its real ms, then runs on', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.freeze(90);
    r.update(90);
    expect(r.tick).toBe(0);
    r.update(100);
    expect(r.tick).toBe(2);
    r.freeze(50);
    r.update(100); // 50 frozen, 50 played
    expect(r.tick).toBe(3);
  });
  it('a ramped beat eases in and out and costs the ticks its factor says', () => {
    expect(slowFactorAt(900, 900, 0.35, 250)).toBe(1);
    expect(slowFactorAt(900, 650, 0.35, 250)).toBeCloseTo(0.35, 9);
    expect(slowFactorAt(900, 450, 0.35, 250)).toBeCloseTo(0.35, 9);
    expect(slowFactorAt(900, 125, 0.35, 250)).toBeCloseTo(0.675, 9);
    expect(slowFactorAt(900, 0, 0.35, 250)).toBe(1);
    const r = new Runner(counter, 1);
    r.play();
    r.slowMo(900, 0.35, 250);
    for (let i = 0; i < 100; i++) r.update(10);
    // 900 ms of the beat: two half ramps (250 × 0.675) and 400 × 0.35 = 2 × 168.75 + 140 = 477.5 sim ms, then 100 ms at full rate.
    expect(r.tick).toBe(Math.floor((477.5 + 100) / TICK_MS));
  });
  it('the same ticks come out whatever the beats are: only the real time they take differs', () => {
    const plain = new Runner(counter, 3);
    plain.play();
    plain.update(2000);
    const beat = new Runner(counter, 3);
    beat.play();
    beat.slowMo(900, 0.35, 250);
    beat.freeze(90);
    beat.update(2000 + 90 + (900 - 477.5));
    expect(beat.tick).toBeGreaterThanOrEqual(plain.tick - 1);
    expect(beat.tick).toBeLessThanOrEqual(plain.tick + 1);
    expect(beat.cur.ball.x - beat.tick).toBe(plain.cur.ball.x - plain.tick);
  });
  it('a ramped beat is not cut short by a shorter one, and seeking clears it', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.slowMo(900, 0.35, 250);
    r.slowMo(420, 0.4);
    r.update(450);
    const slowed = r.tick;
    expect(slowed).toBeLessThan(450 / TICK_MS);
    r.freeze(500);
    r.seek(0);
    r.play();
    r.update(100);
    expect(r.tick).toBe(2);
  });
});

describe('the key-moment cap', () => {
  it('arrives in about 100 ms and releases slowly', () => {
    let v = 4;
    for (let t = 0; t < 100; t += 16) v = blendPace(v, 1, 16, KEY_CAP_IN_MS);
    expect(v).toBeLessThan(1.3);
    let up = 1;
    for (let t = 0; t < 400; t += 16) up = blendPace(up, 4, 16, KEY_CAP_OUT_MS);
    expect(up).toBeLessThan(3);
  });
});
