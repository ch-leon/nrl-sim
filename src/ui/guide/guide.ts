// src/ui/guide/guide.ts — the Guide screen, under More (N7, GitHub #188, #344).
//
// A nav screen (it sits between the HUD and the nav like Fixtures) with a row
// of page tabs, the page, and a footer with the build label, an update button
// when a new build is waiting and Replay tutorial; the ✕ closes it. Pages are data
// (pages.ts for the club, nines.ts for the match) so they can be edited without
// touching this file. No Phaser.

import { buildLabel } from '../buildInfo';
import { button, closeScreen, el, openModal, screenHead } from '../dom';
import { startTutorial } from '../tutorial';
import { reloadForUpdate, updateReady } from '../../fx/pwa';
import { CLUB_PAGES, guidePageForCareer, type GuideFigure, type GuidePage, type GuideScreen, type GuideSection } from './pages';
import { openFinanceScreen } from '../screens/finance';
import { openSquadScreen } from '../screens/squad';
import { openLineupScreen } from '../screens/lineup';
import { openLadderScreen } from '../screens/fixtures';
import { openBuildScreen } from '../screens/build';
import { openCoachCallsScreen } from '../screens/coachCalls';
import { openPlaybookScreen } from '../screens/playbook';
import { openInboxScreen } from '../inbox';
import { NINES_PAGE } from './nines';
import { bonusZoneSvg } from './zonePicture';

/** Every page, in tab order. */
export const GUIDE_PAGES: readonly GuidePage[] = [...CLUB_PAGES, NINES_PAGE];

/** The page by id, or the first. */
export function guidePage(id: string | undefined): GuidePage {
  return guidePageForCareer(GUIDE_PAGES.find((p) => p.id === id) ?? GUIDE_PAGES[0]!);
}

/** Each linked screen: the button's label and how to open it (N14, #263). */
export const GUIDE_SCREENS: Record<GuideScreen, { label: string; open: () => void }> = {
  finance: { label: 'Open Finance', open: () => openFinanceScreen() },
  squad: { label: 'Open Squad', open: () => openSquadScreen() },
  lineup: { label: 'Open Lineup', open: () => openLineupScreen() },
  news: { label: 'Open News', open: () => openInboxScreen() },
  ladder: { label: 'Open Ladder', open: () => openLadderScreen() },
  build: { label: 'Open Build', open: () => openBuildScreen() },
  calls: { label: 'Open Coach calls', open: () => openCoachCallsScreen() },
  playbook: { label: 'Open Playbook', open: () => openPlaybookScreen() },
};

/** Each picture's markup (a static SVG built from the page's facts). */
const GUIDE_FIGURES: Record<GuideFigure, () => string> = {
  'bonus-zone': bonusZoneSvg,
};

/** A link to a screen (a page's, under its title; a section's, under its text): closes the Guide and opens it. */
function screenLink(screen: GuideScreen): HTMLButtonElement {
  const link = GUIDE_SCREENS[screen];
  const b = button(`${link.label} →`, () => {
    closeScreen();
    link.open();
  }, { class: 'nrl-guide-link' });
  b.setAttribute('data-guide-link', screen);
  return b;
}

/** The page the Guide reopens on. */
let lastPageId: string | undefined;

function renderSection(s: GuideSection): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (s.heading) out.push(el('h3', { text: s.heading }));
  if (s.text) out.push(el('p', { text: s.text }));
  if (s.figure) out.push(el('figure', { class: 'nrl-guide-figure', html: GUIDE_FIGURES[s.figure](), attrs: { 'data-guide-figure': s.figure, style: 'margin: 0.3rem 0' } }));
  if (s.bullets && s.bullets.length > 0) out.push(el('ul', {}, ...s.bullets.map((b) => el('li', { text: b }))));
  if (s.link) out.push(screenLink(s.link));
  return out;
}

/** The page's body: title (and the screen it describes), then its sections. */
export function renderGuidePage(page: GuidePage): HTMLElement {
  const body = el('div', { class: 'nrl-guide-page', attrs: { 'data-guide-page': page.id } });
  const head = el('div', { class: 'nrl-guide-head' }, el('h2', { text: page.title }));
  if (page.screen) head.append(screenLink(page.screen));
  body.append(head);
  for (const s of page.sections) body.append(...renderSection(s));
  return body;
}

/** Open the Guide on `pageId` (else where it was last, else the first page). */
export function openGuideScreen(pageId?: string): HTMLElement {
  // data-view says which half a narrow window shows (the topics or the page); a wide one shows both side by side.
  const picked = pageId ?? lastPageId;
  const content = el('div', { class: 'nrl-guide', attrs: { 'data-guide': '', 'data-view': picked ? 'page' : 'list' } });
  const tabs = el('div', { class: 'nrl-guide-tabs', attrs: { role: 'tablist', 'aria-label': 'Topics' } });
  const body = el('div', { class: 'nrl-guide-body' });
  const back = button('◂ Topics', () => content.setAttribute('data-view', 'list'), { class: 'nrl-back nrl-guide-back' });

  const show = (id: string): void => {
    const page = guidePage(id);
    lastPageId = page.id;
    content.setAttribute('data-view', 'page');
    body.replaceChildren(back, renderGuidePage(page));
    for (const b of tabs.querySelectorAll<HTMLButtonElement>('.nrl-guide-tab')) {
      const on = b.getAttribute('data-guide-tab') === page.id;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-selected', String(on));
    }
    body.scrollTop = 0;
    revealTab();
  };
  // The open topic's row comes into the list's view (a long list on a short screen; the sheet is on the page a frame later).
  const revealTab = (): void => {
    tabs.querySelector<HTMLElement>('.nrl-guide-tab[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest' });
  };
  // News-style rows: a topic's name and the screen it is about, a ▸ at the right.
  for (const p of GUIDE_PAGES) {
    const b = button('', () => show(p.id), { class: 'nrl-guide-tab' });
    b.append(el('span', { class: 'nrl-guide-tab-name', text: p.short }));
    if (p.title.toLowerCase() !== p.short.toLowerCase()) b.append(el('span', { class: 'nrl-guide-tab-title', text: p.title }));
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('data-guide-tab', p.id);
    b.setAttribute('role', 'tab');
    tabs.append(b);
  }

  const foot = el('div', { class: 'nrl-guide-foot' });
  foot.append(el('span', { class: 'nrl-guide-build', text: `Build ${buildLabel()}`, attrs: { 'data-nrl-build': '' } }));
  if (updateReady()) {
    foot.append(button('New version: reload', () => reloadForUpdate(), { class: 'nrl-guide-update nrl-btn-primary' }));
  }
  foot.append(
    button('Replay tutorial', () => {
      closeScreen();
      startTutorial(true);
    }, { class: 'nrl-guide-replay' }),
  );

  const rail = el('div', { class: 'nrl-guide-rail' }, tabs);
  const sub = el('span', { class: 'nrl-screen-sub', text: `${GUIDE_PAGES.length} topics` });
  content.append(
    screenHead('Guide', { sub, controls: [foot] }),
    el('div', { class: 'nrl-guide-split' }, rail, body));
  // A wide window always has a page open beside the topics; a narrow one opens on the topics until one is picked.
  show(picked ?? GUIDE_PAGES[0]!.id);
  if (!picked) content.setAttribute('data-view', 'list');
  const sheet = openModal(content, { class: 'nrl-guide-modal', screen: true, key: 'help' });
  // The sheet may be mounted, and sized, a moment later (the Guide loads lazily): keep the open row in view as the list
  // settles, until the first touch on it.
  if (typeof ResizeObserver !== 'undefined') {
    const watch = new ResizeObserver(() => { if (rail.clientHeight > 0) revealTab(); });
    watch.observe(rail);
    rail.addEventListener('pointerdown', () => watch.disconnect(), { once: true });
    tabs.addEventListener('click', () => watch.disconnect(), { once: true });
  }
  return sheet;
}
