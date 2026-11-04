import { describe, it, expect } from 'vitest';
import { coachAddress } from '../../src/ui/coachName';

describe('coachAddress', () => {
  it('uses the name', () => expect(coachAddress({ coachName: 'Sam Hale' })).toBe('Sam Hale'));
  it('falls back when missing', () => expect(coachAddress({})).toBe('Coach'));
  it.each(['', '  ', '\t\n'])('falls back when blank: %j', (coachName) => {
    expect(coachAddress({ coachName })).toBe('Coach');
  });
});
