import { describe, expect, it } from 'vitest';
import { agePlayer } from '../../src/systems/aging';
import { generatePlayer } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';

describe('agePlayer', () => {
  it('increments age by one', () => {
    const p = generatePlayer(makeRng(1), { age: 25 });
    expect(agePlayer(p).age).toBe(26);
  });

  it('drops youngGun once past the young-gun age', () => {
    const p = { ...generatePlayer(makeRng(2), { age: 20 }), traits: ['youngGun' as const] };
    expect(agePlayer(p).traits).not.toContain('youngGun');
  });

  it('adds veteran at 31', () => {
    const p = { ...generatePlayer(makeRng(3), { age: 30 }), traits: [] };
    expect(agePlayer(p).traits).toContain('veteran');
  });

  it('does not duplicate veteran', () => {
    const p = { ...generatePlayer(makeRng(4), { age: 32 }), traits: ['veteran' as const] };
    expect(agePlayer(p).traits.filter((t) => t === 'veteran')).toHaveLength(1);
  });
});
