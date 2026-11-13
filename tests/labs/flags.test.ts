import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __setLabs, devSettingsBuildOn, devSettingsEntryVisible, devSettingsFrom, experimentOn, labsBlocksAnalytics,
  labsVisible, labsVisibleFrom, overrideOn, readLabs, setExperiment, turnAllOff, OPEN_SCREENS,
} from '../../src/labs/flags';
import { exportSave } from '../../src/core/save';
import { createNewGame, SAVE_VERSION } from '../../src/core/state';
import { resolveBootField } from '../../src/match/fieldSettings';

afterEach(() => { __setLabs(null); vi.unstubAllEnvs(); });
describe('browser-local Labs', () => {
  it('is visible from labs=1 on every build or remembered visibility', () => {
    expect(labsVisibleFrom('?labs=1', null)).toBe(true);
    expect(labsVisibleFrom('?labs=0', null)).toBe(false);
    expect(labsVisibleFrom('', JSON.stringify({ visible: true, on: {}, hintsSeen: [] }))).toBe(true);
  });
  it('shows the Settings entry unless the build switch is off, without remembering that', () => {
    expect(devSettingsFrom({})).toBe(true);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: '' })).toBe(true);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: '1' })).toBe(true);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: '0' })).toBe(false);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: ' false ' })).toBe(false);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: 'off' })).toBe(false);
    expect(devSettingsFrom({ VITE_DEV_SETTINGS: 'no' })).toBe(false);
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    expect(devSettingsBuildOn()).toBe(true);
    expect(devSettingsEntryVisible()).toBe(true);
    expect(labsVisible()).toBe(false);
    expect(labsBlocksAnalytics()).toBe(false);
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    expect(devSettingsEntryVisible()).toBe(false);
    expect(labsVisibleFrom('?labs=1', null)).toBe(true);
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    expect(devSettingsEntryVisible()).toBe(true);
    expect(labsBlocksAnalytics()).toBe(true);
  });
  it('keeps a stored choice inert while the page is hidden and the switch is off', () => {
    const hidden = { visible: false, on: { 'match-controls': true }, hintsSeen: [], overrides: { [OPEN_SCREENS]: true }, fieldLength: 80 as const };
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    __setLabs(hidden);
    expect(experimentOn('match-controls')).toBe(false);
    expect(overrideOn(OPEN_SCREENS)).toBe(false);
    expect(resolveBootField({ worker: false, stored: JSON.stringify(hidden) })).toBe(100);
    expect(labsBlocksAnalytics()).toBe(false);
    vi.unstubAllEnvs();
    __setLabs(hidden);
    expect(experimentOn('match-controls')).toBe(true);
    expect(overrideOn(OPEN_SCREENS)).toBe(true);
    expect(resolveBootField({ worker: false, stored: JSON.stringify(hidden) })).toBe(80);
    expect(labsBlocksAnalytics()).toBe(true);
  });
  it('defaults off, switches independently, and turns everything including visibility off', () => {
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    expect(experimentOn('match-controls')).toBe(false);
    setExperiment('match-controls', true);
    expect(experimentOn('match-controls')).toBe(true);
    turnAllOff();
    expect(labsVisible()).toBe(false);
    expect(experimentOn('match-controls')).toBe(false);
    expect(devSettingsEntryVisible()).toBe(true);
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    expect(devSettingsEntryVisible()).toBe(false);
  });
  it('rejects bad or incomplete stored data as all off', () => {
    for (const raw of [null, '{', '[]', '{"visible":true}', '{"visible":true,"on":{"match-controls":"true"},"hintsSeen":[]}']) {
      expect(readLabs(raw)).toEqual({ visible: false, on: {}, hintsSeen: [] });
    }
  });
  it('never adds Labs to a save payload', () => {
    __setLabs({ visible: true, on: { 'match-controls': true }, hintsSeen: ['match-controls'] });
    const state = createNewGame('Labs', 1);
    expect(state.version).toBe(SAVE_VERSION);
    expect(JSON.stringify(state)).not.toContain('match-controls');
    expect(JSON.stringify(state)).not.toContain('nrl-sim-labs');
    expect(exportSave(state)).not.toContain('nrl-sim-labs');
    expect(exportSave(state)).not.toContain('hintsSeen');
  });
});
