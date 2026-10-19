import { describe, it, expect } from 'vitest';
import { placementBarText } from '../../src/ui/placementBar';

describe('placementBarText (#78)', () => {
  it('says what is being placed and what it costs', () => {
    expect(placementBarText({ kind: 'build', defId: 'weightsRoom' })).toBe('Building Weights Room: tap a free spot ($15,000).');
    expect(placementBarText({ kind: 'move', defId: 'weightsRoom', facilityId: 'a', fee: 1500 }))
      .toBe('Moving Weights Room: tap a free spot ($1,500), or its own spot to keep it.');
  });
});
