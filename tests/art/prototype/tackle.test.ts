import { describe, expect, it } from 'vitest';
import { drawTacklePair, tacklePoseAt, TACKLE_FPS, TACKLE_START } from '../../../src/art/prototype/tackle';
import { appearanceFor, HEAD_OPTIONS } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { opaqueBounds } from '../../../src/art/match/players';
import { momentAt } from '../../../src/labs/art/sequence';

const home = appearanceFor('p-art-4'); const away = appearanceFor('p-art-11');
const kit = buildKit(0xe6b632, 0x21394a, 'v'); const opposition = buildKit(0x669ba4, 0xf3eee2, 'hoops');
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);

describe('coordinated wrap tackle', () => {
  it('keeps the hands at the carrier through the drive and fall, then releases', () => {
    for (let t = 5.95; t < 7.55; t += .025) {
      const pose = tacklePoseAt(t);
      expect(pose.grip).toBe(1);
      for (const hand of pose.hands) expect(distance(hand, pose.carrier.shoulder)).toBeLessThan(7);
    }
    const released = tacklePoseAt(8.3);
    expect(released.grip).toBe(0);
    for (const hand of released.hands) expect(distance(hand, released.carrier.shoulder)).toBeGreaterThan(20);
  });
  it('moves joints continuously through phase boundaries and is independent of playback history', () => {
    for (let t = 5.5; t < 8.3; t += 1 / 240) {
      const a = tacklePoseAt(t); const b = tacklePoseAt(t + 1 / 240);
      for (const actor of ['carrier', 'defender'] as const) {
        for (const joint of ['hip', 'shoulder', 'head', 'knee', 'foot', 'farKnee', 'farFoot'] as const) {
          expect(distance(a[actor][joint], b[actor][joint])).toBeLessThan(.5);
        }
      }
    }
    const pose = tacklePoseAt(6.8); tacklePoseAt(8.3);
    expect(tacklePoseAt(6.8)).toEqual(pose);
  });
  it('protects possession and moves the carrier backwards during the connected drive', () => {
    const start = momentAt(6.25).actors.find(p => p.id === 'p-art-4')!;
    const end = momentAt(7.15).actors.find(p => p.id === 'p-art-4')!;
    expect(end.x).toBeLessThan(start.x);
    for (let t = 5.5; t <= 10; t += .05) {
      const state = momentAt(t);
      expect(state.tackleFrame).toBeDefined();
      expect(state.ball).toBeNull();
      expect(state.actors.filter(p => p.possession).map(p => p.id)).toEqual(['p-art-4']);
    }
  });
  it('fits the pair for every build and head, including landing and recovery', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) {
      for (const facing of ['front', 'back'] as const) for (const t of [5.5, 5.7, 5.95, 6.25, 6.7, 6.95, 7.15, 7.55, 7.85, 8.25, 8.3, 9.95]) {
        const image = drawTacklePair({ ...home, build, head }, { ...away, build, head }, kit, opposition, Math.round((t - TACKLE_START) * TACKLE_FPS), facing);
        const bounds = opaqueBounds(image)!;
        expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
        expect(bounds.x1).toBeLessThan(image.w - 1); expect(bounds.y1).toBeLessThan(image.h - 1);
      }
    }
  });
});
