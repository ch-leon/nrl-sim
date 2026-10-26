// src/ui/guide/guide.ts — the Guide screen, under More (N7, GitHub #188, #344).
//
// A nav screen (it sits between the HUD and the nav like Fixtures) with a row
// of page tabs, the page, and a footer with the build label, an update button
// when a new build is waiting and Replay tutorial; the ✕ closes it. Pages are data
// (pages.ts for the club, nines.ts for the match) so they can be edited without
// touching this file. No Phaser.

import { buildLabel } from '../buildInfo';
import { button, closeScreen, el, openModal } from '../dom';
import { startTutorial } from '../tutorial';
import { reloadForUpdate, updateReady } from '../../fx/pwa';
import { CLUB_PAGES, type GuideFigure, type GuidePage, type GuideScreen, type GuideSection } from './pages';
import { openFinanceScreen } from '../screens/finance';
import { openSquadScreen } from '../screens/squad';
import { openLineupScreen } from '../screens/lineup';
import { openLadderScreen } from '../screens/fixtures';
import { openBuildScreen } from '../screens/build';
import { openInboxScreen } from '../inbox';
import { NINES_PAGE } from './nines';
import { bonusZoneSvg } from './zonePicture';

/** Every page, in tab order. */
export const GUIDE_PAGES: readonly GuidePage[] = [...CLUB_PAGES, NINES_PAGE];

/** The page by id, or the first. */
export function guidePage(id: string | undefined): GuidePage {
  return GUIDE_PAGES.find((p) => p.id === id) ?? GUIDE_PAGES[0]!;
}

/** Each linked screen: the button's label and how to open it (N14, #263). */
export const GUIDE_SCREENS: Record<GuideScreen, { label: string; open: () => void }> = {
  finance: { label: 'Open Finance', open: () => openFinanceScreen() },
  squad: { label: 'Open Squad', open: () => openSquadScreen() },
  lineup: { label: 'Open Lineup', open: () => openLineupScreen() },
  news: { label: 'Open News', open: () => openInboxScreen() },
  ladder: { label: 'Open Ladder', open: () => openLadderScreen() },
  build: { label: 'Open Build', open: () => openBuildScreen() },
};

/** Each picture's markup (a static SVG built from the page's facts). */
const GUIDE_FIGURES: Record<GuideFigure, () => string> = {
  'bonus-zone': bonusZoneSvg,
};

/** The page the Guide reopens on. */
let lastPageId: string | undefined;

function renderSection(s: GuideSection): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (s.heading) out.push(el('h3', { text: s.heading }));
  if (s.text) out.push(el('p', { text: s.text }));
  if (s.figure) out.push(el('figure', { class: 'nrl-guide-figure', html: GUIDE_FIGURES[s.figure](), attrs: { 'data-guide-figure': s.figure, style: 'margin: 0.3rem 0' } }));
  if (s.bullets && s.bullets.length > 0) out.push(el('ul', {}, ...s.bullets.map((b) => el('li', { text: b }))));
  return out;
}

/** The page's body: title (and the screen it describes), then its sections. */
export function renderGuidePage(page: GuidePage): HTMLElement {
  const body = el('div', { class: 'nrl-guide-page', attrs: { 'data-guide-page': page.id } });
  const head = el('div', { class: 'nrl-guide-head' }, el('h2', { text: page.title }));
  if (page.screen) {
    const link = GUIDE_SCREENS[page.screen];
    const b = button(`${link.label} →`, () => {
      closeScreen();
      link.open();
    }, { class: 'nrl-guide-link' });
    b.setAttribute('data-guide-link', page.screen);
    head.append(b);
  }
  body.append(head);
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
  );

  content.append(tabs, body, foot);
  show(pageId ?? lastPageId ?? GUIDE_PAGES[0]!.id);
  return openModal(content, { class: 'nrl-guide-modal', screen: true, key: 'help' });
}
