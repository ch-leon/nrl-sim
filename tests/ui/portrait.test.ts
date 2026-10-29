import { describe, it, expect } from 'vitest';
import { PORTRAIT_CSS, currentView, wantsClubHome, type ViewFacts } from '../../src/ui/portrait';
import { PORTRAIT_QUERY } from '../../src/ui/orientation';

// #350 P1: which view is up, from what the UI shows, and when Club home stands in for the grounds.
const bare: ViewFacts = {
  matchStarting: false, matchActive: false, matchFinal: false, placing: false, facility: false, screen: false, office: false, dialog: false,
};

describe('what is on screen (#350)', () => {
  it('the bare grounds', () => {
    expect(currentView(bare)).toBe('grounds');
  });

  it('a sheet, Office or a dialog over them is a menu', () => {
    expect(currentView({ ...bare, screen: true })).toBe('menu');
    expect(currentView({ ...bare, office: true })).toBe('menu');
    expect(currentView({ ...bare, dialog: true })).toBe('menu');
  });

  it('placing or moving a building, and a building’s card', () => {
    expect(currentView({ ...bare, placing: true })).toBe('placement');
    expect(currentView({ ...bare, facility: true })).toBe('facility');
    // The card is a dialog too: the card wins.
    expect(currentView({ ...bare, facility: true, dialog: true })).toBe('facility');
    // Placement mode closes the Build sheet, but a sheet left open still means the ghost needs landscape.
    expect(currentView({ ...bare, placing: true, screen: true })).toBe('placement');
  });

  it('the live match (its pause sheet and half time too), from the kick-off until full time', () => {
    expect(currentView({ ...bare, matchStarting: true })).toBe('match');
    expect(currentView({ ...bare, matchActive: true })).toBe('match');
    expect(currentView({ ...bare, matchActive: true, dialog: true })).toBe('match');
  });

  it('full time: the match report is a menu', () => {
    expect(currentView({ ...bare, matchActive: true, matchFinal: true })).toBe('menu');
    expect(currentView({ ...bare, matchActive: true, matchFinal: true, dialog: true })).toBe('menu');
  });
});

describe('Club home stands in for the grounds upright (#350)', () => {
  it('opens on the bare grounds when upright', () => {
    expect(wantsClubHome(bare, true, false)).toBe(true);
  });

  it('not sideways, not when the player asked to see the grounds', () => {
    expect(wantsClubHome(bare, false, false)).toBe(false);
    expect(wantsClubHome(bare, true, true)).toBe(false);
  });

  it('never over a menu, a dialog, placement or the match', () => {
    for (const f of [{ screen: true }, { office: true }, { dialog: true }, { placing: true }, { facility: true }, { matchActive: true }, { matchStarting: true }, { matchActive: true, matchFinal: true }]) {
      expect(wantsClubHome({ ...bare, ...f }, true, false)).toBe(false);
    }
  });
});

describe('the portrait stylesheet leaves landscape alone (#350)', () => {
  it('is one block, inside the portrait media query', () => {
    const css = PORTRAIT_CSS.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    expect(css.startsWith(`@media ${PORTRAIT_QUERY} {`)).toBe(true);
    // The query's block closes at the very end: no rule outside it.
    let depth = 0;
    let closedAt = -1;
    for (let i = 0; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) { closedAt = i; break; }
    }
    expect(closedAt).toBe(css.length - 1);
  });

  it('the grounds’ chips give way to Club home’s rows (decisions, the board)', () => {
    expect(PORTRAIT_CSS).toMatch(/\.nrl-hub-chips \{ display: none; \}/);
  });

  it('the install hint can lift a sheet clear of the list (#434)', () => {
    expect(PORTRAIT_CSS).toContain('var(--nrl-toast-lift, 0px)');
  });

  it('the tabs and PLAY WEEK keep a finger’s height', () => {
    expect(PORTRAIT_CSS).toMatch(/\.nrl-dock-tabs > \.nrl-btn \{[^}]*height: 48px/);
    expect(PORTRAIT_CSS).toMatch(/\.nrl-dock-play \{[^}]*height: 48px/);
  });
});
