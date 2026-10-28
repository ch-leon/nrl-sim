import { describe, it, expect } from 'vitest';
import { placementBarText, placementBarModel } from '../../src/ui/placementBar';
import type { PlacementAim, PlacementMode } from '../../src/world/placement';

const build: PlacementMode = { kind: 'build', defId: 'weightsRoom' };
const move: PlacementMode = { kind: 'move', defId: 'weightsRoom', facilityId: 'a', fee: 1500 };
const aim = (v: PlacementAim['v'], extra: Partial<PlacementAim> = {}): PlacementAim => ({ x: 3, y: 4, v, home: false, ...extra });

describe('placementBarText (#78, #395)', () => {
  it('says what is being placed and how', () => {
    expect(placementBarText(build)).toBe('Building Weights Room: tap a green spot, then Build here.');
    expect(placementBarText(move)).toBe('Moving Weights Room: tap a green spot, then Move here.');
  });
});

describe('placementBarModel (#395)', () => {
  it('Build here carries the cost and is enabled on a good spot', () => {
    expect(placementBarModel(build, aim({ ok: true }), 50_000)).toEqual({
      text: 'Building Weights Room: tap a green spot, then Build here.',
      action: 'Build here · $15,000',
      disabled: false,
      why: '',
    });
  });

  it('is disabled until the ghost has been aimed', () => {
    const m = placementBarModel(build, null, 50_000);
    expect(m.disabled).toBe(true);
    expect(m.action).toBe('Build here · $15,000');
  });

  it('says why a spot is refused', () => {
    const why = (v: PlacementAim['v'], extra: Partial<PlacementAim> = {}, cash = 50_000) =>
      placementBarModel(build, aim(v, extra), cash);
    expect(why({ ok: false, reason: 'overlap' }, { blocker: 'teamGym' })).toMatchObject({ disabled: true, why: 'Overlaps the Team Gym' });
    expect(why({ ok: false, reason: 'overlap' }).why).toBe('Something is built there');
    expect(why({ ok: false, reason: 'path' }).why).toBe('Keep the entrance path clear');
    expect(why({ ok: false, reason: 'out-of-bounds' }).why).toBe("It won't fit there");
    expect(why({ ok: false, reason: 'duplicate' }).why).toBe('You already have one');
    expect(why({ ok: false, reason: 'insufficient-funds' }, {}, 13_800)).toMatchObject({
      action: 'Build here · $15,000',
      disabled: true,
      why: 'Need $1,200 more',
    });
  });

  it('a move says Move here with the fee, or Keep it here on its own spot', () => {
    expect(placementBarModel(move, aim({ ok: true }), 50_000)).toMatchObject({ action: 'Move here · $1,500', disabled: false });
    expect(placementBarModel(move, aim({ ok: true }, { home: true }), 0)).toMatchObject({ action: 'Keep it here', disabled: false });
    expect(placementBarModel(move, aim({ ok: false, reason: 'insufficient-funds' }), 1000).why).toBe('Need $500 more');
  });
});
