import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { ratingText, overallRating } from '../../src/data/player';
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
    openSquadScreen();
    const root = slot.screen as StubNode;
    const ratings = root.querySelectorAll('.nrl-row-ovr').map(n => n.textContent);
    expect(ratings).toHaveLength(getState().squad.length);
    for (const p of getState().squad) expect(ratings).toContain(ratingText(overallRating(p)));
  });
  it('renders stars beside existing overall on Recruit', () => {
    openRecruitScreen();
    const root = slot.screen as StubNode;
    for (const row of root.querySelectorAll('[data-row-player]')) {
      const p = getState().freeAgents.find(p => p.id === row.attrs['data-row-player'])!;
      expect(row.querySelector('.nrl-row-ovr')!.textContent).toBe(ratingText(overallRating(p)));
    }
  });
  it('renders stars beside existing overall on the rival squad', () => {
    const club = getState().league.clubs.find(c => c.id !== getState().clubId)!;
    openRivalSquad(club);
    const root = slot.modal as StubNode;
    for (const p of club.squad!) expect(root.textContent).toContain(ratingText(overallRating(p)));
  });
  it('renders stars beside existing overall and four bars on the player screen', () => {
    const p = getState().squad[0]!;
    openPlayerPage(p, { kind: 'squad' });
    const root = slot.modal as StubNode;
    expect(root.textContent).toContain(ratingText(overallRating(p)));
    expect(root.querySelector('.nrl-player-stats')!.children).toHaveLength(4);
  });
});
