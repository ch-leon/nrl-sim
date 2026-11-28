import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as state from '../../src/core/state';
import { openTitleSettings } from '../../src/fx/audio';
import { captureInstallPrompt } from '../../src/fx/pwa';
import { closeModal, getRoot } from '../../src/ui/dom';
import { stubLocalStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from '../ui/stubDom';

beforeEach(() => {
  stubDocument();
  stubLocalStorage();
});
afterEach(() => {
  closeModal();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('opens without a career and closes back to the title host', () => {
  vi.stubEnv('VITE_DEV_SETTINGS', '1');
  expect(state.hasCareer()).toBe(false);
  const getState = vi.spyOn(state, 'getState');
  const host = getRoot() as unknown as StubNode;
  const title = new StubNode('div');
  host.appendChild(title);
  const onRemove = vi.fn();

  openTitleSettings(onRemove);

  expect(getState).not.toHaveBeenCalled();
  const modal = host.querySelector('.nrl-settings-modal')!;
  expect(modal.querySelector('.nrl-settings-head')?.textContent).toBe('Settings');
  expect(modal.all().filter(node => node.tagName === 'BUTTON').map(node => node.textContent)).toEqual(['✕', 'Developer settings']);
  expect(modal.querySelector('.nrl-labs-open')).not.toBeNull();
  for (const row of ['.nrl-live-toggle', '.nrl-settings-textsize', '.nrl-settings-import', '.nrl-unlocks-row', '.nrl-audio-volume']) {
    expect(modal.querySelector(row)).toBeNull();
  }

  modal.querySelector('.nrl-screen-x')!.click();
  expect(onRemove).toHaveBeenCalledOnce();
  expect(host.children).toEqual([title]);
});

it('offers installation on the title when the browser supplies a prompt', () => {
  vi.stubEnv('VITE_DEV_SETTINGS', '0');
  const browser = new EventTarget();
  vi.stubGlobal('window', browser);
  captureInstallPrompt();
  const prompt = vi.fn(async () => {});
  browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
    prompt, userChoice: Promise.resolve({ outcome: 'accepted' }),
  }));
  const host = getRoot() as unknown as StubNode;
  openTitleSettings();
  expect(host.querySelector('.nrl-labs-open')).toBeNull();
  const install = host.querySelector('.nrl-audio-install')!;
  expect(install.textContent).toBe('Install app');
  install.click();
  expect(prompt).toHaveBeenCalledOnce();
  expect(host.querySelector('.nrl-audio-install')).toBeNull();
});
