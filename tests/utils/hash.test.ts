import { describe, expect, it } from 'vitest';
import { cyrb53 } from '../../src/utils/hash';

describe('cyrb53 (#360)', () => {
  it('is 14 hex digits, the same for the same text', () => {
    const a = cyrb53('{"version":21,"clubName":"Hash"}');
    expect(a).toMatch(/^[0-9a-f]{14}$/);
    expect(cyrb53('{"version":21,"clubName":"Hash"}')).toBe(a);
  });

  it('is pinned: a save checksum must not move between builds', () => {
    expect(cyrb53('')).toBe('0bdcb81aee8d83');
    expect(cyrb53('a')).toBe('1c2ba782c97901'); // 7929297801672961, bryc's reference value
  });

  it('changes when one character does', () => {
    expect(cyrb53('{"week":3}')).not.toBe(cyrb53('{"week":4}'));
  });
});
