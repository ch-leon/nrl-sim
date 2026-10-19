// src/ui/placementBar.ts — the strip shown while placing or moving a facility
// (GitHub #78): what to do, the price, and a Cancel button, so a phone player can
// always back out of placement mode. Listens to world/placement's mode changes;
// the text is pure and unit-tested. No Phaser.
import { FACILITY_CATALOG } from '../data/facility';
import { activeGroundsScene, onPlacementMode, type PlacementMode } from '../world/placement';
import { button, el, mount } from './dom';

/** Instruction line for a placement mode. */
export function placementBarText(mode: PlacementMode): string {
  const def = FACILITY_CATALOG[mode.defId];
  if (mode.kind === 'move') {
    return `Moving ${def.name}: tap a free spot ($${mode.fee.toLocaleString('en-US')}), or its own spot to keep it.`;
  }
  return `Building ${def.name}: tap a free spot ($${def.cost.toLocaleString('en-US')}).`;
}

/** Mount the bar (hidden until placement mode starts). Returns the teardown. */
export function initPlacementBar(): () => void {
  const text = el('span', { class: 'nrl-placebar-text' });
  const cancel = button('Cancel', () => activeGroundsScene()?.cancelPlacement(), { class: 'nrl-placebar-cancel' });
  const bar = el('div', { class: 'nrl-placebar', attrs: { role: 'status', hidden: '' } }, text, cancel);
  mount(bar);
  const off = onPlacementMode((mode) => {
    bar.hidden = mode === null;
    if (mode) text.textContent = placementBarText(mode);
  });
  return () => {
    off();
    bar.remove();
  };
}
