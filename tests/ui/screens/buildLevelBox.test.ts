// tests/ui/screens/buildLevelBox.test.ts — the facility card's "Now" and "Level n" boxes (SuperCOOKED 21),
// on the stand-in DOM. levelBox and levelPips are private to build.ts, so they are read through the card
// openFacilityPopup draws for a placed facility.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from '../stubDom';
import { createNewGame, getState, setState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { closeModal } from '../../../src/ui/dom';
import { facilityBlurb, openFacilityPopup } from '../../../src/ui/screens/build';
import { FACILITY_CATALOG, type FacilityDefId } from '../../../src/data/facility';

const body = (): StubNode => document.body as unknown as StubNode;

/** Open the card for a facility of `defId` at `level`. */
function open(defId: FacilityDefId, level: 1 | 2 | 3): StubNode {
  const facility = { id: `f-${defId}`, defId, level, x: 0, y: 0 };
  getState().facilities.push(facility);
  openFacilityPopup(facility);
  return body().querySelector('[data-facility-popup]')!;
}
const boxes = (card: StubNode): StubNode[] => card.querySelectorAll('.nrl-facility-box');
const tag = (b: StubNode): string => b.querySelector('.nrl-facility-box-tag')!.textContent;
const big = (b: StubNode): string | undefined => b.querySelector('.nrl-facility-box-big')?.textContent;
const text = (b: StubNode): string => b.querySelector('.nrl-facility-box-text')!.textContent;

beforeEach(() => {
  bus.clear();
  stubDocument();
  setState(createNewGame('Test Club', 21));
});
afterEach(() => { closeModal(); bus.clear(); vi.unstubAllGlobals(); });

describe('the facility card level boxes', () => {
  it('a training facility shows its XP boost as the big figure, with the cap kept in the line', () => {
    const [now, next] = boxes(open('trainingPaddock', 1));
    expect(tag(now!)).toBe('Now');
    expect(big(now!)).toBe('+10% XP');
    expect(text(now!)).toMatch(/^Training boost \(total cap \d+%\)\./);
    expect(text(now!)).not.toContain('+10% XP');
    expect(tag(next!)).toBe('Level 2');
    expect(big(next!)).toMatch(/^\+\d+% XP$/);
    expect(big(next!)).not.toBe('+10% XP');
  });

  it('a training facility\'s big figure grows with the level', () => {
    const [now, next] = boxes(open('trainingPaddock', 2));
    expect(tag(next!)).toBe('Level 3');
    expect(parseInt(big(next!)!.slice(1), 10)).toBeGreaterThan(parseInt(big(now!)!.slice(1), 10));
  });

  it('a non-training facility shows its whole line and no big figure', () => {
    const def = FACILITY_CATALOG.canteen;
    expect(def.training).toBeFalsy();
    const [now, next] = boxes(open('canteen', 1));
    expect(big(now!)).toBeUndefined();
    expect(big(next!)).toBeUndefined();
    expect(text(now!)).toBe(facilityBlurb(def, { level: 1, reputation: getState().reputation }));
  });

  it('the Now box keeps .nrl-facility-blurb, the next-level box does not', () => {
    for (const id of ['trainingPaddock', 'canteen'] as const) {
      const [now, next] = boxes(open(id, 1));
      expect(now!.querySelector('.nrl-facility-blurb')).not.toBeNull();
      expect(next!.querySelector('.nrl-facility-blurb')).toBeNull();
      expect(next!.classList.contains('nrl-facility-next')).toBe(true);
      expect(now!.classList.contains('nrl-facility-next')).toBe(false);
      closeModal();
    }
  });

  it('at level 3 there is only the Now box', () => {
    const card = open('trainingPaddock', 3);
    const bs = boxes(card);
    expect(bs).toHaveLength(1);
    expect(tag(bs[0]!)).toBe('Now');
  });

  it('shows "Level n of 3" above the boxes', () => {
    const card = open('canteen', 2);
    expect(card.querySelector('.nrl-facility-level-text')!.textContent).toBe('Level 2 of 3');
    expect(card.querySelector('.nrl-facility-level')!.attrs['aria-label']).toBe('Level 2 of 3');
    expect(card.querySelectorAll('.nrl-facility-pip-on')).toHaveLength(2);
    expect(card.querySelectorAll('.nrl-facility-pips')[0]!.children).toHaveLength(3);
  });
});
