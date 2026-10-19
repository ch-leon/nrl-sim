// src/ui/guide/guide.ts — the Guide screen under "?" (N7, GitHub #188).
//
// A nav screen (it sits between the HUD and the nav like Fixtures) with a row
// of page tabs, the page, and a footer with the build label, an update button
// when a new build is waiting, Replay tutorial and Close. Pages are data
// (pages.ts for the club, nines.ts for the match) so they can be edited without
// touching this file. No Phaser.

import { buildLabel } from '../buildInfo';
import { button, closeScreen, el, openModal } from '../dom';
import { startTutorial } from '../tutorial';
import { reloadForUpdate, updateReady } from '../../fx/pwa';
import { CLUB_PAGES, type GuidePage, type GuideSection } from './pages';
import { NINES_PAGE } from './nines';

/** Every page, in tab order. */
export const GUIDE_PAGES: readonly GuidePage[] = [...CLUB_PAGES, NINES_PAGE];

/** The page by id, or the first. */
export function guidePage(id: string | undefined): GuidePage {
  return GUIDE_PAGES.find((p) => p.id === id) ?? GUIDE_PAGES[0]!;
}

/** The page the Guide reopens on. */
let lastPageId: string | undefined;

function renderSection(s: GuideSection): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (s.heading) out.push(el('h3', { text: s.heading }));
  if (s.text) out.push(el('p', { text: s.text }));
  if (s.bullets && s.bullets.length > 0) out.push(el('ul', {}, ...s.bullets.map((b) => el('li', { text: b }))));
  return out;
}

/** The page's body: title, then its sections. */
export function renderGuidePage(page: GuidePage): HTMLElement {
  const body = el('div', { class: 'nrl-guide-page', attrs: { 'data-guide-page': page.id } });
  body.append(el('h2', { text: page.title }));
  for (const s of page.sections) body.append(...renderSection(s));
  return body;
}

/** Open the Guide on `pageId` (else where it was last, else the first page). */
export function openGuideScreen(pageId?: string): HTMLElement {
  const content = el('div', { class: 'nrl-guide', attrs: { 'data-guide': '' } });
  const tabs = el('div', { class: 'nrl-guide-tabs', attrs: { role: 'tablist' } });
  const body = el('div', { class: 'nrl-guide-body' });

  const show = (id: string): void => {
    const page = guidePage(id);
    lastPageId = page.id;
    body.replaceChildren(renderGuidePage(page));
    for (const b of tabs.querySelectorAll<HTMLButtonElement>('.nrl-btn')) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-guide-tab') === page.id));
    }
    body.scrollTop = 0;
  };
  for (const p of GUIDE_PAGES) {
    const b = button(p.short, () => show(p.id), { class: 'nrl-guide-tab' });
    b.setAttribute('data-guide-tab', p.id);
    b.setAttribute('role', 'tab');
    tabs.append(b);
  }

  const foot = el('div', { class: 'nrl-guide-foot' });
  foot.append(el('span', { class: 'nrl-guide-build', text: `Build ${buildLabel()}`, attrs: { 'data-nrl-build': '' } }));
  if (updateReady()) {
    foot.append(button('New version: reload', () => reloadForUpdate(), { class: 'nrl-guide-update' }));
  }
  foot.append(
    button('Replay tutorial', () => {
      closeScreen();
      startTutorial(true);
    }, { class: 'nrl-guide-replay' }),
    button('Close', () => closeScreen(), { class: 'nrl-guide-close' }),
  );

  content.append(tabs, body, foot);
  show(pageId ?? lastPageId ?? GUIDE_PAGES[0]!.id);
  return openModal(content, { class: 'nrl-guide-modal', screen: true });
}
