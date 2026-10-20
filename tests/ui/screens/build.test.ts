// tests/ui/screens/build.test.ts — the Build menu's and the facility popup's
// blurbs say the real numbers (N12, #247). The DOM screen is not rendered here
// (the vitest env is 'node'); facilityBlurb is plain text.
import { describe, it, expect } from 'vitest';
import { facilityBlurb } from '../../../src/ui/screens/build';
import { FACILITY_CATALOG } from '../../../src/data/facility';
import { sponsorReturn } from '../../../src/systems/economy';

const board = FACILITY_CATALOG.sponsorBoard;

describe('the Sponsor Board blurb (N12)', () => {
  it('says what it pays a week at the club\'s reputation, the number the weekly tick pays', () => {
    expect(facilityBlurb(board, { level: 1, reputation: 30 })).toMatch(/^\+\$450\/week at L1 and reputation 30 /);
    expect(facilityBlurb(board, { level: 1, reputation: 60 })).toMatch(/^\+\$750\/week at L1 and reputation 60 /);
    expect(facilityBlurb(board, { level: 1, reputation: 100 })).toMatch(/^\+\$1,000\/week at L1 and reputation 100 /);
    for (const rep of [1, 30, 47, 85, 100]) {
      expect(facilityBlurb(board, { level: 1, reputation: rep })).toContain(`+$${sponsorReturn(1, rep).toLocaleString('en-US')}/week`);
    }
  });

  it('the popup quotes the board\'s own level', () => {
    expect(facilityBlurb(board, { level: 2, reputation: 30 })).toMatch(/^\+\$720\/week at L2 /);
    expect(facilityBlurb(board, { level: 3, reputation: 100 })).toMatch(/^\+\$2,200\/week at L3 /);
  });

  it('states the rule, the cap and the level steps, and that there is only one', () => {
    const text = facilityBlurb(board, { level: 1, reputation: 30 });
    expect(text).toContain('$150 + $10 a reputation point, up to $1,000; ×1.6 at L2, ×2.2 at L3');
    expect(text).toMatch(/One only$/);
    expect(text).not.toContain('3,000');
  });

  it('without a club to read, describes L1 at the baseline reputation', () => {
    expect(facilityBlurb(board)).toBe(facilityBlurb(board, { level: 1, reputation: 30 }));
  });
});

describe('the scouting blurbs (N12)', () => {
  it('say how much a level lifts the free-agent pool, in overall points', () => {
    expect(facilityBlurb(FACILITY_CATALOG.scoutOffice)).toBe('Better free-agent pool (+3 overall per level); signing fees 10% cheaper per level');
    expect(facilityBlurb(FACILITY_CATALOG.academy)).toContain('Better free-agent pool (+2.5 overall per level)');
  });
});
