import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { ratingText, overallRating, playerStars } from '../../src/data/player';
import { starsLabel } from '../../src/ui/parts';
import { openSquadScreen } from '../../src/ui/screens/squad';
import { openRecruitScreen } from '../../src/ui/screens/recruit';
import { openRivalSquad } from '../../src/ui/screens/rivalSquad';
import { openPlayerPage } from '../../src/ui/screens/player';

vi.mock('../../src/art/portrait', async original => ({ ...await original<typeof import('../../src/art/portrait')>(), portraitDataUrl: () => '' }));
const slot = vi.hoisted(() => ({ screen: null as unknown, modal: null as unknown, close: null as (() => void) | null }));
vi.mock('../../src/ui/dom', async original => ({
  ...await original<typeof import('../../src/ui/dom')>(),
  ensureStyles: () => {},
  screenKey: () => 'squad',
  openScreen: (screen: unknown, close: () => void) => { slot.close?.(); slot.screen = screen; slot.close = close; },
  openModal: (content: unknown) => { slot.modal = content; return content; },
}));
beforeEach(() => {
  bus.clear(); stubDocument(); createNewGame('Stars Test', 537); initLeague(getState());
  Object.assign(document, { createElementNS: (_ns: string, tag: string) => new StubNode(tag) });
});
afterEach(() => { slot.close?.(); slot.close = null; vi.unstubAllGlobals(); });

describe('temporary stars on existing screens (#537)', () => {
  it('renders stars beside existing overall on Squad', () => {
    openSquadScreen('list'); // SuperCOOKED 31: the list shows stars in place of the number
    const root = slot.screen as StubNode;
    const ratings = root.querySelectorAll('.nrl-row-ovr').map(n => n.attrs['aria-label']);
    expect(ratings).toHaveLength(getState().squad.length);
    for (const p of getState().squad) expect(ratings).toContain(starsLabel(playerStars(p)));
  });
  it('renders stars beside existing overall on Recruit', () => {
    openRecruitScreen();
    const root = slot.screen as StubNode;
    for (const row of root.querySelectorAll('[data-row-player]')) {
      const p = getState().freeAgents.find(p => p.id === row.attrs['data-row-player'])!;
      expect(row.querySelector('.nrl-row-ovr')!.attrs['aria-label']).toBe(starsLabel(playerStars(p))); // SuperCOOKED 34: stars, no number
    }
  });
  it('renders stars beside existing overall on the rival squad', () => {
    const club = getState().league.clubs.find(c => c.id !== getState().clubId)!;
    openRivalSquad(club);
    const root = slot.modal as StubNode;
    // SuperCOOKED Phase 6: the squad opens on the pitch (stars only); the list is the table with the numbers.
    root.querySelector('[data-rival-view="list"]')!.click();
    for (const p of club.squad!) expect(root.textContent).toContain(ratingText(overallRating(p)));
  });
  it('renders his rating as five stars, no number (SuperCOOKED §3.5), and his four stats on the player screen', () => {
    const p = getState().squad[0]!;
    openPlayerPage(p, { kind: 'squad' });
    const root = slot.modal as StubNode;
    expect(root.querySelector('[data-stars]')!.getAttribute('aria-label')).toBe(starsLabel(playerStars(p)));
    expect(root.textContent).not.toContain(ratingText(overallRating(p)));
    expect(root.querySelector('.nrl-player-stats')!.children).toHaveLength(4);
  });
});
