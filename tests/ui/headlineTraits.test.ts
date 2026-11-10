import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { openPlayerPage } from '../../src/ui/screens/player';

vi.mock('../../src/art/portrait', async original => ({ ...await original<typeof import('../../src/art/portrait')>(), portraitDataUrl: () => '' }));
const slot = vi.hoisted(() => ({ modal: null as unknown }));
vi.mock('../../src/ui/dom', async original => ({
  ...await original<typeof import('../../src/ui/dom')>(),
  ensureStyles: () => {},
  openModal: (content: unknown) => { slot.modal = content; return content; },
}));

beforeEach(() => {
  bus.clear(); stubDocument(); createNewGame('Headline Test', 543); initLeague(getState());
  Object.assign(document, { createElementNS: (_ns: string, tag: string) => new StubNode(tag) });
});
afterEach(() => { bus.clear(); vi.unstubAllGlobals(); });

describe('player screen headline copy (#543 PM ruling)', () => {
  it('renders the existing traitless copy without a prefix, blank headline or trait row', () => {
    const s = getState();
    const p = s.squad.find(p => p.traits.length === 0)!;
    expect(p).toBeDefined();
    const before = structuredClone(p);
    const seed = s.rngSeed;
    openPlayerPage(p, { kind: 'squad' });
    const root = slot.modal as StubNode;
    expect(root.textContent).toContain('None — a solid citizen');
    expect(root.textContent).not.toContain('Headline trait.');
    expect(root.querySelectorAll('.nrl-player-trait')).toHaveLength(0);
    expect(root.querySelectorAll('.nrl-player-line').filter(n => n.textContent === 'None — a solid citizen')).toHaveLength(1);
    expect(p).toEqual(before);
    expect(s.rngSeed).toBe(seed);
  });

  it('marks one headline while retaining all existing trait rows', () => {
    const p = getState().squad.find(p => p.traits.length > 0)!;
    expect(p).toBeDefined();
    openPlayerPage(p, { kind: 'squad' });
    const root = slot.modal as StubNode;
    const rows = root.querySelectorAll('.nrl-player-trait');
    expect(rows).toHaveLength(p.traits.length);
    expect(rows.filter(n => n.textContent.includes('Headline trait. '))).toHaveLength(1);
    expect(rows.every(n => n.textContent.trim().length > 0)).toBe(true);
    expect(root.textContent).not.toContain('None — a solid citizen');
  });
});
