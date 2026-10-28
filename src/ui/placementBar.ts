// src/ui/placementBar.ts — the strip shown while placing or moving a facility
// (GitHub #78): what to do, a Build here / Move here button with the price (#395),
// and a Cancel button, so a phone player can always back out of placement mode.
// Listens to world/placement's mode and aim changes; the model is pure and
// unit-tested. No Phaser.
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import { getState } from '../core/state';
import { activeGroundsScene, onPlacementAim, onPlacementMode, type PlacementAim, type PlacementMode } from '../world/placement';
import { button, el, mount } from './dom';

const money = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** Instruction line for a placement mode. */
export function placementBarText(mode: PlacementMode): string {
  const def = FACILITY_CATALOG[mode.defId];
  if (mode.kind === 'move') return `Moving ${def.name}: tap a green spot, then Move here.`;
  return `Building ${def.name}: tap a green spot, then Build here.`;
}

/** What the bar shows for the ghost's current aim (#395). */
export interface PlacementBarModel {
  text: string;
  /** The confirm button's label, with the price: "Build here · $15,000". */
  action: string;
  disabled: boolean;
  /** Why the button is disabled ("Overlaps the Gym", "Need $1,200 more"); empty when enabled. */
  why: string;
}

/** Why a spot is refused, in the bar's words. */
function whyNot(aim: PlacementAim, cost: number, cash: number): string {
  switch (aim.v.reason) {
    case 'overlap':
      return aim.blocker ? `Overlaps the ${FACILITY_CATALOG[aim.blocker as FacilityDefId].name}` : 'Something is built there';
    case 'path':
      return 'Keep the entrance path clear';
    case 'duplicate':
      return 'You already have one';
    case 'insufficient-funds':
      return `Need ${money(Math.max(0, cost - cash))} more`;
    case 'missing':
      return 'It is no longer there';
    default:
      return "It won't fit there";
  }
}

/** The bar for a placement mode and the ghost's aim (null before the first aim). */
export function placementBarModel(mode: PlacementMode, aim: PlacementAim | null, cash: number): PlacementBarModel {
  const def = FACILITY_CATALOG[mode.defId];
  const cost = mode.kind === 'move' ? mode.fee : def.cost;
  const text = placementBarText(mode);
  const action =
    mode.kind === 'move' ? (aim?.home ? 'Keep it here' : `Move here · ${money(cost)}`) : `Build here · ${money(cost)}`;
  if (!aim) return { text, action, disabled: true, why: '' };
  if (aim.v.ok) return { text, action, disabled: false, why: '' };
  return { text, action, disabled: true, why: whyNot(aim, cost, cash) };
}

/** Mount the bar (hidden until placement mode starts). Returns the teardown. */
export function initPlacementBar(): () => void {
  const text = el('span', { class: 'nrl-placebar-text' });
  const label = el('span', { class: 'nrl-placebar-go-label' });
  const why = el('span', { class: 'nrl-placebar-go-why' });
  const go = button('', () => activeGroundsScene()?.confirmPlacement(), { class: 'nrl-placebar-go nrl-btn-primary' });
  go.replaceChildren(label, why);
  go.setAttribute('data-place-go', '');
  const cancel = button('Cancel', () => activeGroundsScene()?.cancelPlacement(), { class: 'nrl-placebar-cancel' });
  const bar = el('div', { class: 'nrl-placebar', attrs: { role: 'status', hidden: '' } }, text, go, cancel);
  mount(bar);
  let mode: PlacementMode | null = null;
  let aim: PlacementAim | null = null;
  const render = (): void => {
    bar.hidden = mode === null;
    if (!mode) return;
    const m = placementBarModel(mode, aim, getState().money);
    text.textContent = m.text;
    label.textContent = m.action;
    why.textContent = m.why;
    why.hidden = !m.why;
    go.disabled = m.disabled;
    go.setAttribute('aria-label', m.why ? `${m.action}: ${m.why}` : m.action);
  };
  const offMode = onPlacementMode((next) => {
    mode = next;
    aim = null;
    render();
  });
  const offAim = onPlacementAim((next) => {
    aim = next;
    render();
  });
  return () => {
    offMode();
    offAim();
    bar.remove();
  };
}
