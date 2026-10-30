import { afterEach, describe, expect, it } from 'vitest';
import { __setLabs, experimentOn, labsVisible, labsVisibleFrom, readLabs, setExperiment, turnAllOff } from '../../src/labs/flags';
import { exportSave } from '../../src/core/save';
import { createNewGame, SAVE_VERSION } from '../../src/core/state';

afterEach(() => __setLabs(null));
describe('browser-local Labs', () => {
  it('is visible from labs=1 on every build or remembered visibility', () => {
    expect(labsVisibleFrom('?labs=1', null)).toBe(true);
    expect(labsVisibleFrom('?labs=0', null)).toBe(false);
    expect(labsVisibleFrom('', JSON.stringify({ visible: true, on: {}, hintsSeen: [] }))).toBe(true);
  });
  it('defaults off, switches independently, and turns everything including visibility off', () => {
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    expect(experimentOn('match-controls')).toBe(false);
    setExperiment('match-controls', true);
    expect(experimentOn('match-controls')).toBe(true);
    turnAllOff();
    expect(labsVisible()).toBe(false);
    expect(experimentOn('match-controls')).toBe(false);
  });
  it('rejects bad or incomplete stored data as all off', () => {
    for (const raw of [null, '{', '[]', '{"visible":true}', '{"visible":true,"on":{"match-controls":"true"},"hintsSeen":[]}']) {
      expect(readLabs(raw)).toEqual({ visible: false, on: {}, hintsSeen: [] });
    }
  });
  it('never adds Labs to a save payload', () => {
    __setLabs({ visible: true, on: { 'match-controls': true }, hintsSeen: ['match-controls'] });
    const state = createNewGame('Labs', 1);
    expect(SAVE_VERSION).toBe(21);
    expect(JSON.stringify(state)).not.toContain('match-controls');
    expect(JSON.stringify(state)).not.toContain('nrl-sim-labs');
    expect(exportSave(state)).not.toContain('nrl-sim-labs');
    expect(exportSave(state)).not.toContain('hintsSeen');
  });
});
