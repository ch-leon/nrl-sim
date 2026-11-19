import { bus } from '../core/events';
import { getState, stateInstallation } from '../core/state';
import { eventOpportunities, type OpportunityId, type EventOpportunity } from '../systems/eventOpportunities';
import { button, closeModal, el, openModal } from './dom';
import { openIndividualChallenge } from './screens/individualChallenges';
import { openSkillsCamp } from './screens/playerAssignments';
import { openOpenCupEntry } from './screens/openCupEntry';

function openEvent(id: OpportunityId): void {
  if (id === 'skills-camp') openSkillsCamp(() => document.querySelector('[data-open-events]'));
  else if (id === 'open-cup') openOpenCupEntry(() => document.querySelector('[data-open-events]'));
  else openIndividualChallenge(id);
}

/** A bounded list, reached directly from the club. The existing dialogs own entry. */
export function openEvents(): HTMLElement {
  const installation = stateInstallation();
  const list = el('div', {class:'nrl-opportunities-list', attrs:{'data-events-list':''}});
  const content = el('div', {class:'nrl-opportunities', attrs:{role:'dialog', 'aria-label':'Events', tabindex:'-1'}},
    el('h2', {text:'Events'}), el('p', {text:'Optional entries for your club and players.'}), list);
  let off: (() => void) | undefined;
  const keydown = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeModal(); };
  const modal = openModal(content, {class:'nrl-opportunities-modal', region:true, closeButton:true, onRemove:()=>{
    off?.(); document.removeEventListener('keydown', keydown);
    document.querySelector<HTMLElement>('[data-open-events]')?.focus();
  }});
  document.addEventListener('keydown', keydown);
  content.focus();
  const render = (): void => {
    if (stateInstallation() !== installation) { closeModal(); return; }
    list.replaceChildren(...eventOpportunities(getState()).map(event => {
      const action = button(event.status === 'available' ? 'Entry details' : 'View details', () => openEvent(event.id));
      action.setAttribute('data-open-opportunity', event.id);
      action.setAttribute('aria-label', `${action.textContent}: ${event.name}`);
      action.setAttribute('aria-haspopup', 'dialog');
      return el('section', {class:'nrl-opportunity', attrs:{'data-opportunity':event.id}},
        el('h3', {text:event.name}), el('p', {text:event.detail}), action);
    }));
  };
  off = bus.on('state:changed', render);
  render();
  return modal;
}

/** No preference is persisted: continuing acknowledges only this advance's rows. */
export function remindClosingEvents(events: readonly EventOpportunity[], proceed: () => void): void {
  const installation = stateInstallation();
  const { week, season } = getState();
  const current = (): boolean => stateInstallation() === installation && getState().week === week && getState().season === season;
  const review = button('Review events', () => { closeModal(); if (current()) openEvents(); }, {class:'nrl-btn-primary'});
  review.setAttribute('data-review-events', '');
  const skip = button('Continue without entering', () => {
    closeModal();
    if (current()) proceed();
  });
  skip.setAttribute('data-skip-events', '');
  const content = el('div', {class:'nrl-opportunities', attrs:{'data-event-reminder':'', role:'dialog', 'aria-label':'Event entry reminder', tabindex:'-1'}},
    el('h2', {text:'Entries close before this advance finishes'}),
    el('p', {text:'Review these optional events now, or continue without entering.'}),
    el('ul', {}, ...events.map(event => el('li', {},
      el('strong', {text:event.name}), el('span', {text:` · ${event.detail}`})))),
    el('div', {class:'nrl-decisions-actions'}, review, skip));
  const keydown = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeModal(); };
  openModal(content, {class:'nrl-opportunities-modal', region:true, closeButton:true, onRemove:()=>{
    document.removeEventListener('keydown', keydown);
    document.querySelector<HTMLElement>('[data-hud="advance"]')?.focus();
  }});
  document.addEventListener('keydown', keydown);
  content.focus();
}
