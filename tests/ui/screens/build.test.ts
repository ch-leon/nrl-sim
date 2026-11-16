// tests/ui/screens/build.test.ts — the Build menu's and the facility popup's
// blurbs say the real numbers (N12, #247). The DOM screen is not rendered here
// (the vitest env is 'node'); facilityBlurb is plain text.
import { describe, it, expect } from 'vitest';
import { facilityBlurb } from '../../../src/ui/screens/build';
import { FACILITY_CATALOG } from '../../../src/data/facility';

const board = FACILITY_CATALOG.sponsorBoard;

describe('the Sponsor Board blurb', () => {
  it('quotes played matches by tier, not passive weekly reputation income', () => {
    expect(facilityBlurb(board, { level: 1, reputation: 30, tier: 'local' })).toContain('+$240 per played non-trial match');
    expect(facilityBlurb(board, { level: 2, reputation: 100 })).toContain('+$1,620 per played non-trial match');
    expect(facilityBlurb(board, { level: 3, reputation: 0 })).toContain('+$3,240 per played non-trial match');
    expect(facilityBlurb(board)).toContain('No income while idle. One only');
  });
});

describe('the scouting blurbs (N12)', () => {
  it('say how much a level lifts the free-agent pool, in overall points', () => {
    expect(facilityBlurb(FACILITY_CATALOG.scoutOffice)).toBe('Better free-agent pool (+3 overall per level); signing fees 10% cheaper per level');
    expect(facilityBlurb(FACILITY_CATALOG.academy)).toContain('Better free-agent pool (+2.5 overall per level)');
  });
});

// Broadcast Quiet 3c: the Build menu's categories and why a tile can't be built.
import { buildBlocker, facilityCategory } from '../../../src/ui/screens/build';

describe('the Build menu (3c)', () => {
  it('TRAINING is every facility that trains a stat; CLUB the rest', () => {
    expect(facilityCategory(FACILITY_CATALOG.trainingPaddock)).toBe('training');
    expect(facilityCategory(FACILITY_CATALOG.academy)).toBe('training');
    expect(facilityCategory(FACILITY_CATALOG.canteen)).toBe('club');
    expect(facilityCategory(FACILITY_CATALOG.grandstand)).toBe('club');
  });

  it('says why a tile is out of reach: the money short, or a one-only facility already built', () => {
    const paddock = FACILITY_CATALOG.trainingPaddock;
    expect(buildBlocker(paddock, { money: paddock.cost, facilities: [] })).toBeNull();
    expect(buildBlocker(paddock, { money: paddock.cost - 2500, facilities: [] })).toBe('Need $2,500 more');
    expect(buildBlocker(paddock, { money: -1000, facilities: [] })).toBe(`Need $${paddock.cost.toLocaleString('en-US')} more`);
    expect(buildBlocker(board, { money: 1e7, facilities: [{ defId: 'sponsorBoard' }] })).toBe('Built: upgrade it on the grounds');
    // A second paddock is fine.
    expect(buildBlocker(paddock, { money: 1e7, facilities: [{ defId: 'trainingPaddock' }] })).toBeNull();
  });
});

describe('closed facility tiles (#481)', () => {
  it('gives the opening reason before the money reason', async () => {
    const { buildBlocker } = await import('../../../src/ui/screens/build');
    const { createNewGame } = await import('../../../src/core/state');
    const s = createNewGame('Test', 481);
    s.money = 0;
    expect(buildBlocker(FACILITY_CATALOG.teamGym, s)).toBe('Opens at round 8');
    expect(buildBlocker(FACILITY_CATALOG.trainingPaddock, s)).toMatch(/^Need \$/);
    s.unlocks = undefined;
    expect(buildBlocker(FACILITY_CATALOG.teamGym, s)).toMatch(/^Need \$/);
  });
});


describe('generic facility XP copy (#539)', () => {
  it('shows the same XP percentage and cap for every training building, scaled by level', () => {
    for (const def of Object.values(FACILITY_CATALOG).filter(d => d.training)) {
      expect(facilityBlurb(def)).toContain('+10% XP (total cap 50%)');
      expect(facilityBlurb(def, { level: 3, reputation: 30 })).toContain('+22% XP (total cap 50%)');
      expect(facilityBlurb(def)).not.toMatch(/Trains|adjacen/i);
    }
  });
});
