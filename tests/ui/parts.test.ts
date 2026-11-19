// SuperCOOKED's shared parts (docs/specs/ui-supercooked.md §4, src/ui/parts.ts and
// src/ui/wordmark.ts): the pure helpers, and each part built on the stand-in DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import {
  PARTS_CSS, barPct, confirmDialog, disableWithReason, emptyState, fitnessTone, lockedTile, playerCard,
  starFills, starsEl, starsLabel, statTile, statusDot, statusPill, whyLine,
} from '../../src/ui/parts';
import { parentBrandParts, wordmarkParts } from '../../src/ui/wordmark';
import { CSS, closeModal, dialogOpen } from '../../src/ui/dom';

const node = (n: unknown): StubNode => n as StubNode;
const byClass = (n: unknown, cls: string): StubNode[] => node(n).querySelectorAll(`.${cls}`);

describe('the pure parts', () => {
  it('stars come in half steps, five of them, clamped', () => {
    expect(starFills(3.5)).toEqual([1, 1, 1, 0.5, 0]);
    expect(starFills(5)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(0.5)).toEqual([0.5, 0, 0, 0, 0]);
    expect(starFills(-1)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(7)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(2.3)).toEqual([1, 1, 0.5, 0, 0]);
  });

  it('say the rating, never a number', () => {
    expect(starsLabel(3.5)).toBe('3 and a half stars');
    expect(starsLabel(1)).toBe('1 star');
    expect(starsLabel(1.5)).toBe('1 and a half stars');
    expect(starsLabel(0.5)).toBe('Half a star');
    expect(starsLabel(0)).toBe('No stars');
    expect(starsLabel(5)).toBe('5 stars');
  });

  it('fitness tones follow the Squad table: 85+ good, 65+ watch, else bad', () => {
    expect(fitnessTone(100)).toBe('pos');
    expect(fitnessTone(85)).toBe('pos');
    expect(fitnessTone(84)).toBe('neg');
    expect(fitnessTone(65)).toBe('neg');
    expect(fitnessTone(64)).toBe('alert');
    expect(fitnessTone(0)).toBe('alert');
  });

  it('bars are out of the stat maximum', () => {
    expect(barPct(81)).toBe(81);
    expect(barPct(0)).toBe(0);
    expect(barPct(140)).toBe(100);
  });

  it('the wordmark puts the last word in the accent; the parent line its trailing capitals', () => {
    expect(wordmarkParts('BIG COACH')).toEqual(['BIG ', 'COACH']);
    expect(wordmarkParts('THE FOOTY MANAGER')).toEqual(['THE FOOTY ', 'MANAGER']);
    expect(wordmarkParts('COACH')).toEqual(['', 'COACH']);
    expect(parentBrandParts('SuperCOOKED')).toEqual(['Super', 'COOKED']);
    expect(parentBrandParts('Studio')).toEqual(['Studio', '']);
    expect(parentBrandParts('ACME')).toEqual(['ACME', '']);
  });
});

describe('the parts on the page', () => {
  beforeEach(() => stubDocument());
  afterEach(() => {
    closeModal();
    vi.unstubAllGlobals();
  });

  it('a status pill is a dot and a word, with its tone; a dot alone is named', () => {
    const pill = node(statusPill('Fit 88%', 'pos'));
    expect(pill.attrs['data-tone']).toBe('pos');
    expect(pill.textContent).toBe('Fit 88%');
    expect(byClass(pill, 'nrl-pill-dot')).toHaveLength(1);
    const dot = node(statusDot('alert', 'Injured'));
    expect(dot.attrs['aria-label']).toBe('Injured');
    expect(dot.attrs.role).toBe('img');
  });

  it('five stars, the half one half filled, spoken as words', () => {
    const row = node(starsEl(3.5));
    const stars = byClass(row, 'nrl-star');
    expect(stars).toHaveLength(5);
    expect(stars.map((s) => s.children[0]?.style.width ?? '')).toEqual(['100%', '100%', '100%', '50%', '']);
    expect(row.attrs['aria-label']).toBe('3 and a half stars');
    expect(row.attrs.role).toBe('img');
  });

  it('a stat tile: label, number, the bar now and its ceiling; the focus is marked', () => {
    const tile = node(statTile({ label: 'Kicking', value: 74, ceiling: 85, focus: true }));
    expect(byClass(tile, 'nrl-stat-label')[0]!.textContent).toBe('Kicking');
    expect(byClass(tile, 'nrl-stat-value')[0]!.textContent).toBe('74');
    expect(byClass(tile, 'nrl-stat-fill')[0]!.style.width).toBe('74%');
    expect(byClass(tile, 'nrl-stat-cap')[0]!.style.width).toBe('85%');
    expect(tile.hasAttribute('data-focus')).toBe(true);
    expect(tile.attrs['aria-label']).toBe('Kicking 74, can reach 85, training focus');
    const plain = node(statTile({ label: 'Speed', value: 60.4 }));
    expect(byClass(plain, 'nrl-stat-cap')).toHaveLength(0);
    expect(plain.hasAttribute('data-focus')).toBe(false);
    expect(byClass(plain, 'nrl-stat-value')[0]!.textContent).toBe('60');
  });

  it('a player card: portrait, name, stars, position, fitness dot and the C / K tag; a tap opens him', () => {
    const open = vi.fn();
    const card = node(playerCard({
      portrait: 'data:image/png;base64,x', name: 'J. Mere', stars: 4, position: 'FB',
      fitness: { tone: 'pos', word: 'Fit 92%' }, captain: true, onClick: open,
    }));
    expect(card.tagName).toBe('BUTTON');
    expect(byClass(card, 'nrl-pcard-name')[0]!.textContent).toBe('J. Mere');
    expect(byClass(card, 'nrl-pcard-pos')[0]!.textContent).toBe('FB');
    expect(byClass(card, 'nrl-pcard-tag')[0]!.textContent).toBe('C');
    expect(byClass(card, 'nrl-pcard-fit')[0]!.attrs['data-tone']).toBe('pos');
    expect(byClass(card, 'nrl-stars')[0]!.attrs['aria-label']).toBe('4 stars');
    expect(card.attrs['aria-label']).toBe('J. Mere, FB, 4 stars, Fit 92%, captain');
    card.click();
    expect(open).toHaveBeenCalledOnce();
    const both = node(playerCard({ portrait: '', name: 'Kai', stars: 2.5, position: 'HB', fitness: { tone: 'alert', word: 'Injured' }, captain: true, kicker: true }));
    expect(byClass(both, 'nrl-pcard-tag')[0]!.textContent).toBe('C K');
    expect(byClass(both, 'nrl-pcard-face')[0]!.children).toHaveLength(0);
    const none = node(playerCard({ portrait: '', name: 'Lui', stars: 3, position: 'PR', fitness: { tone: 'neg', word: 'Fit 70%' } }));
    expect(byClass(none, 'nrl-pcard-tag')).toHaveLength(0);
  });

  it('disabled stays visible and says why', () => {
    const b = node(document.createElement('button'));
    b.textContent = 'Sign';
    const line = node(whyLine(''));
    disableWithReason(b as unknown as HTMLButtonElement, 'Need $18k', line as unknown as HTMLElement);
    expect(b.disabled).toBe(true);
    expect(b.attrs['aria-label']).toBe('Sign: Need $18k');
    expect(line.textContent).toBe('Need $18k');
    expect(line.className).toBe('nrl-why');
  });

  it('a confirm dialog: title, one line, cancel on the left and the answer on the right; each answers once', () => {
    const yes = vi.fn();
    const no = vi.fn();
    const back = node(confirmDialog({ title: 'A decision is waiting', line: 'Sponsor offer', cancel: 'Advance anyway', confirm: 'Answer now', onConfirm: yes, onCancel: no }));
    expect(dialogOpen()).toBe(true);
    expect(back.words()).toContain('A decision is waiting');
    const [left, right] = byClass(back, 'nrl-confirm-actions')[0]!.children;
    expect(left!.textContent).toBe('Advance anyway');
    expect(left!.className).toContain('nrl-btn-outline');
    expect(right!.textContent).toBe('Answer now');
    expect(right!.className).toContain('nrl-btn-primary');
    right!.click();
    expect(yes).toHaveBeenCalledOnce();
    expect(no).not.toHaveBeenCalled();
    expect(dialogOpen()).toBe(false);
  });

  it('a destructive confirm is the amber button, never orange; closing the dialog any other way cancels', () => {
    const no = vi.fn();
    const back = node(confirmDialog({ title: 'Release him?', line: 'It costs $40k.', cancel: 'Cancel', confirm: 'Really release?', destructive: true, onConfirm: () => {}, onCancel: no }));
    const right = byClass(back, 'nrl-confirm-actions')[0]!.children[1]!;
    expect(right.className).toContain('nrl-btn-danger');
    expect(right.className).not.toContain('nrl-btn-primary');
    closeModal();
    expect(no).toHaveBeenCalledOnce();
  });

  it('an empty state and a locked tile', () => {
    const empty = node(emptyState('No news yet', 'Matches, injuries and signings land here.'));
    expect(empty.words()).toContain('No news yet');
    const locked = node(lockedTile('Playbook', 'Hire an attack coach first'));
    expect(locked.attrs['aria-disabled']).toBe('true');
    expect(locked.attrs['aria-label']).toBe('Playbook: Hire an attack coach first');
  });
});

describe('the stylesheet', () => {
  it('pills tint their colour at 12% with a 45% edge, and use the tokens', () => {
    expect(PARTS_CSS).toContain('background: rgba(var(--nrl-tone-rgb), 0.12)');
    expect(PARTS_CSS).toContain('inset 0 0 0 1px rgba(var(--nrl-tone-rgb), 0.45)');
    expect(PARTS_CSS).toContain('color: var(--nrl-star-empty)');
    expect(CSS).toContain('--nrl-star-empty: #3a4566;');
  });

  it('a selected tab inside a sheet is white with navy words; the screen switch keeps the orange', () => {
    expect(CSS).toMatch(/\.nrl-seg > \.nrl-btn\[aria-pressed="true"\][^{]*\{\s*background: var\(--nrl-text\);\s*color: var\(--nrl-on-accent\);/);
    expect(CSS).toMatch(/\.nrl-seg\.nrl-seg-main[^{]*\{\s*background: var\(--nrl-accent\);/);
  });

  it('PLAY WEEK turns navy while an open sheet or dialog has its own primary', () => {
    expect(CSS).toContain('#ui-root:has(> :is(.nrl-screen-region, .nrl-modal-backdrop) .nrl-btn-primary:not(:disabled):not([hidden])) .nrl-dock-play-group { background: var(--nrl-raised); color: var(--nrl-text); }');
  });

  it('the type is the four families, self-hosted', () => {
    expect(CSS).toContain("--nrl-f-label: 'Oswald'");
    expect(CSS).toContain("--nrl-f-body: 'Inter'");
    expect(CSS).toContain("--nrl-f-num: 'JetBrains Mono'");
    expect(CSS).toContain("--nrl-f-display: 'Archivo Black'");
    expect(CSS).not.toMatch(/(font-family|--nrl-f-[a-z]+):[^;]*(Barlow|Plex)/);
  });
});
