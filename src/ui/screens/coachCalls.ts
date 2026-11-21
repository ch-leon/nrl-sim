// src/ui/screens/coachCalls.ts — the Coach calls page, an Office tile beside
// Staff & Board (and linked from the Coach's Office's Build card and the Guide).
// Every coach call, grouped by the Coach's Office level that unlocks it, each
// group locked or unlocked for this club, with what each call does and when it
// can be made; the club's level and what the next one unlocks; and the one-a-set
// rule. The words are coachCallsPageData's (coachCallsText.ts); this only lays
// them out as Build-style tiles, three across, the page scrolling.

import { el, ensureStyles, openScreen, screenHead } from '../dom';
import { statusPill } from '../parts';
import { getState } from '../../core/state';
import { bus } from '../../core/events';
import { coachsOfficeLevel } from '../../systems/matchday';
import { coachCallsPageData, type CallGroup, type CoachCallsPage } from '../coachCallsText';

/** The page's name, in the nav's Office sheet. */
export const COACH_CALLS_TITLE = 'Coach calls';

/** The Office tile's line: "10 of 18 unlocked". */
export function coachCallsStatus(level: number): string {
  const d = coachCallsPageData(level);
  return d.unlockedCount === d.total ? 'All unlocked' : `${d.unlockedCount} of ${d.total} unlocked`;
}

/** A group: its Coach's Office level and state, what opens it when locked (amber), then one Build-style tile per call. */
function groupEl(g: CallGroup): HTMLElement {
  const state = statusPill(g.unlocked ? 'Unlocked' : 'Locked', g.unlocked ? 'pos' : 'neg');
  state.classList.add('nrl-calls-state');
  return el('section', { class: 'nrl-calls-group', attrs: { 'data-calls-group': String(g.level), ...(g.unlocked ? {} : { 'data-locked': '' }) } },
    el('div', { class: 'nrl-calls-group-head' },
      el('h3', { class: 'nrl-calls-group-title', text: g.title }),
      ...(g.unlocked ? [] : [el('span', { class: 'nrl-calls-why', text: `Opens with ${g.title}` })]),
      state),
    el('ul', { class: 'nrl-calls-list' }, ...g.calls.map((c) =>
      el('li', { class: 'nrl-calls-call', attrs: { 'data-call': c.call } },
        el('div', { class: 'nrl-calls-call-top' },
          el('b', { class: 'nrl-calls-name', text: c.name }),
          el('span', { class: 'nrl-calls-side', text: c.side })),
        el('p', { class: 'nrl-calls-does', text: c.does }),
        el('p', { class: 'nrl-calls-when' },
          el('span', { class: 'nrl-label', text: 'When' }), ` ${c.when}${c.free ? ". Doesn't use up the set's call" : ''}`)))));
}

/** The page's body for `d` (exported for the DOM test). */
export function coachCallsBody(d: CoachCallsPage): HTMLElement {
  return el('div', { class: 'nrl-calls-body', attrs: { 'data-calls-body': '' } },
    el('div', { class: 'nrl-calls-summary', attrs: { 'data-calls-summary': '' } },
      el('p', { class: 'nrl-calls-next', text: d.nextLine }),
      el('p', { class: 'nrl-calls-limit', text: d.limitLine })),
    el('div', { class: 'nrl-calls-groups' }, ...d.groups.map(groupEl)),
    el('p', { class: 'nrl-calls-foot', attrs: { 'data-calls-plays': '' }, text: d.playsLine }));
}

/** Open the Coach calls page for the club as it is now (it follows a build or an upgrade while open). */
export function openCoachCallsScreen(): HTMLElement {
  ensureCoachCallsStyles();
  const sub = el('span', { class: 'nrl-screen-sub' });
  const body = el('div', { class: 'nrl-calls-scroll' });
  const render = (): void => {
    const d = coachCallsPageData(coachsOfficeLevel(getState()));
    sub.textContent = `${d.levelLine} · ${d.unlockedCount} of ${d.total} unlocked`;
    body.replaceChildren(coachCallsBody(d));
  };
  render();
  const sheet = el('div', { class: 'nrl-screen nrl-calls', attrs: { 'data-coach-calls': '' } }, screenHead(COACH_CALLS_TITLE, { sub }), body);
  const off = bus.on('state:changed', () => { if (sheet.isConnected) render(); });
  return openScreen(sheet, off, 'calls');
}

// ── Styles (injected once, beside the shared kit) ───────────────────────────

const CALLS_STYLE_ID = 'nrl-coach-calls-styles';

function ensureCoachCallsStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(CALLS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CALLS_STYLE_ID;
  style.textContent = COACH_CALLS_CSS;
  document.head.appendChild(style);
}

export const COACH_CALLS_CSS = `
/* The Coach calls page (SuperCOOKED 22's tiles): the summary, then a group per Coach's Office level, its calls as tiles three across; only the body scrolls. */
.nrl-calls-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-calls-body { display: flex; flex-direction: column; gap: 10px; }
.nrl-calls-summary { display: flex; flex-direction: column; gap: 4px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); border-radius: 12px; padding: 8px 12px; }
.nrl-calls-summary p { margin: 0; font-size: 0.8125rem; line-height: 1.35; }
.nrl-calls-next { color: var(--nrl-text); font-weight: 500; }
.nrl-calls-limit { color: var(--nrl-text-2); }
.nrl-calls-foot { margin: 0; font-size: 0.8125rem; color: var(--nrl-muted); }
.nrl-calls-groups { display: flex; flex-direction: column; gap: 10px; }
.nrl-calls-group { min-width: 0; }
.nrl-calls-group-head { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; padding: 0 2px 6px; min-height: 1.75rem; }
.nrl-calls-group .nrl-calls-group-title { margin: 0; font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; line-height: 1.2; text-transform: uppercase; }
.nrl-calls-state { flex: 0 0 auto; margin-left: auto; }
.nrl-calls-why { font-size: 0.75rem; font-weight: 600; color: var(--nrl-neg); }
.nrl-calls-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
@media (max-width: 600px) { .nrl-calls-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .nrl-calls-list { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.nrl-calls-call { display: flex; flex-direction: column; gap: 3px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); border-radius: 12px; padding: 8px 12px; box-sizing: border-box; min-width: 0; }
.nrl-calls-call-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.nrl-calls-name { font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; line-height: 1.15; text-transform: uppercase; min-width: 0; }
.nrl-calls-side { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-calls-call p { margin: 0; font-size: 0.8125rem; line-height: 1.3; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-calls-when { font-size: 0.75rem; }
.nrl-calls-when .nrl-label { font-size: 0.6875rem; }
/* A group the club hasn't opened yet: its tiles dim like Build's, and the group says in amber what opens it. */
.nrl-calls-group[data-locked] .nrl-calls-call { opacity: 0.55; }
`;
