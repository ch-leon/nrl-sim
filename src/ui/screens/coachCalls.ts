// src/ui/screens/coachCalls.ts — the Coach calls page, an Office tile beside
// Staff & Board (and linked from the Coach's Office's Build card and the Guide).
// Every coach call, grouped by the Coach's Office level that unlocks it, each
// group locked or unlocked for this club, with what each call does and when it
// can be made; the club's level and what the next one unlocks; and the one-a-set
// rule. The words are coachCallsPageData's (coachCallsText.ts); this only lays
// them out. One column that scrolls, two or more side by side when there's room.

import { el, ensureStyles, openScreen, screenHead } from '../dom';
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

function groupEl(g: CallGroup): HTMLElement {
  return el('section', { class: 'nrl-calls-group', attrs: { 'data-calls-group': String(g.level), ...(g.unlocked ? {} : { 'data-locked': '' }) } },
    el('div', { class: 'nrl-calls-group-head' },
      el('h3', { class: 'nrl-calls-group-title', text: g.title }),
      el('span', { class: 'nrl-calls-state', text: g.unlocked ? 'Unlocked' : 'Locked' })),
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
    el('div', { class: 'nrl-calls-groups' }, ...d.groups.map(groupEl)));
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
/* The Coach calls page: the summary, then the four groups, as many across as fit (one upright); only the body scrolls. */
.nrl-calls-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-calls-body { display: flex; flex-direction: column; gap: 8px; }
.nrl-calls-summary { display: flex; flex-direction: column; gap: 4px; background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; }
.nrl-calls-summary p { margin: 0; font-size: 0.8125rem; line-height: 1.35; }
.nrl-calls-next { color: var(--nrl-text); font-weight: 500; }
.nrl-calls-limit { color: var(--nrl-text-2); }
.nrl-calls-groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 8px; align-items: start; }
.nrl-calls-group { background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; min-width: 0; }
.nrl-calls-group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.nrl-calls-group .nrl-calls-group-title { margin: 0; font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.03em; line-height: 1.2; min-width: 0; }
.nrl-calls-state { flex: 0 0 auto; font-family: var(--nrl-f-label); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-pos); }
.nrl-calls-group[data-locked] .nrl-calls-state { color: var(--nrl-accent); }
.nrl-calls-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.nrl-calls-call { padding: 5px 0; border-top: 1px solid var(--nrl-line); min-width: 0; }
.nrl-calls-call-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.nrl-calls-name { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.02em; }
.nrl-calls-side { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-calls-call p { margin: 1px 0 0; font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-calls-when .nrl-label { font-size: 0.6875rem; }
/* A group the club hasn't unlocked yet: its calls in grey, the group's tag in yellow. */
.nrl-calls-group[data-locked] .nrl-calls-name { color: var(--nrl-muted); }
.nrl-calls-group[data-locked] .nrl-calls-call p { color: var(--nrl-muted); }
`;
