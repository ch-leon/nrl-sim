import { el } from './dom';
import { fitRead, type Plan } from './matchupRead';
import { PRESET_LABEL } from '../match/league/presets';
import type { RosterEntry } from '../sim/events';

export function renderPlanFit(button: HTMLButtonElement, roster: readonly RosterEntry[], plan: Plan): void {
  const read = fitRead(roster, plan);
  button.setAttribute('data-fit', plan);
  button.setAttribute('aria-label', `${PRESET_LABEL[plan]}, ${read.stars}, ${read.reason}`);
  button.replaceChildren(el('span', { text: PRESET_LABEL[plan] }), el('span', { class: 'nrl-fit-stars', text: read.stars }), el('span', { class: 'nrl-fit-reason', text: read.reason }));
}
export const PLAN_FIT_CSS = `
[data-fit] { display: flex; flex-direction: column; gap: 0; justify-content: center; line-height: 1.15; white-space: nowrap; min-width: 0; }
.nrl-fit-stars { display: block; font-size: 0.75rem; color: var(--nrl-accent); letter-spacing: 0; }
[data-fit][aria-pressed="true"] .nrl-fit-stars { color: inherit; }
.nrl-fit-reason { display: block; max-width: 100%; font-family: var(--nrl-f-body); font-size: 0.6875rem; letter-spacing: 0; font-weight: 400; text-transform: none; }
.nrl-lineup-plan .nrl-seg > .nrl-btn[data-fit], .nrl-mo-plan .nrl-seg > .nrl-btn[data-fit] { height: auto; min-height: 54px; padding: 4px 2px; }
`;
