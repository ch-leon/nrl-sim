import { describe, expect, it, vi } from 'vitest';
import { FIELD_LENGTHS, isFieldLength, fieldWorkerName, fieldFromWorkerName } from '../../src/labs/fieldLength';
import { __setLabs, readLabs, fieldLengthPreference, setFieldLengthPreference, setTestCareer, turnAllOff } from '../../src/labs/flags';
import { resolveBootField } from '../../src/match/fieldSettings';

describe('field experiment settings', () => {
  it('accepts exactly the three physical sizes, defaulting legacy and invalid settings to 100m', () => {
    expect(FIELD_LENGTHS).toEqual([100, 80, 60]);
    for (const x of ['80', 0, 70, null, undefined, Infinity]) expect(isFieldLength(x)).toBe(false);
    for (const x of FIELD_LENGTHS) expect(isFieldLength(x)).toBe(true);
    for (const fieldLength of [undefined, '80', 70, null]) {
      __setLabs({ visible: true, on: {}, hintsSeen: [], fieldLength } as never);
      expect(fieldLengthPreference()).toBe(100);
    }
    __setLabs(null);
  });
  it('keeps field length browser-local, visible in parsed settings and resettable', () => {
    const state = { visible: true, on: {}, hintsSeen: [], fieldLength: 80 as const };
    expect(readLabs(JSON.stringify(state))).toEqual(state);
    __setLabs(state);
    expect(fieldLengthPreference()).toBe(80);
    turnAllOff();
    expect(fieldLengthPreference()).toBe(100);
    __setLabs(null);
  });
  it('refuses an unpersisted setting instead of pretending it applied', () => {
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    expect(setFieldLengthPreference(60)).toBe(false); // Node has no browser storage.
    expect(fieldLengthPreference()).toBe(100);
    __setLabs(null);
  });
  it('freezes the same validated choice for the page and every worker type', () => {
    const stored = JSON.stringify({ visible: true, on: {}, hintsSeen: [], fieldLength: 60 });
    expect(resolveBootField({ worker: false, stored })).toBe(60);
    const hidden = stored.replace('true', 'false');
    try {
      vi.stubEnv('VITE_DEV_SETTINGS', '0');
      expect(resolveBootField({ worker: false, stored: hidden })).toBe(100);
    } finally { vi.unstubAllEnvs(); }
    expect(resolveBootField({ worker: false, stored: hidden })).toBe(60);
    for (const length of FIELD_LENGTHS) for (const name of ['match-skip', 'match-background', 'match-replay', 'match-art']) {
      const configured = fieldWorkerName(name, length);
      expect(resolveBootField({ worker: true, workerName: configured, stored })).toBe(length);
      expect(fieldFromWorkerName(configured)).toBe(length);
      if (length === 100) expect(configured).toBe(name);
    }
    expect(fieldFromWorkerName('match-art--field-70')).toBe(100);
    expect(fieldFromWorkerName('unrelated--field-80')).toBe(100);
    expect(resolveBootField({ worker: true, stored })).toBe(100);
  });
  it('supports a visible playtest career even when the ordinary developer-page flag is off', () => {
    const settings = { visible: false, on: {}, hintsSeen: [], fieldLength: 80 as const,
      testCareer: { preset: 'block-play' as const, fresh: false, from: 1 } };
    __setLabs(settings);
    expect(fieldLengthPreference()).toBe(80);
    expect(resolveBootField({ worker: false, stored: JSON.stringify(settings) })).toBe(80);
    __setLabs(null);
  });
  it('removes the stored choice on reset, so reopening Experiments starts at 100m', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value) });
    try {
      __setLabs({ visible: true, on: {}, hintsSeen: [] });
      expect(setFieldLengthPreference(60)).toBe(true);
      turnAllOff();
      const raw = memory.get('nrl-sim-labs')!;
      expect(readLabs(raw).fieldLength).toBeUndefined();
      const reopened = { ...JSON.parse(raw), visible: true };
      expect(resolveBootField({ worker: false, stored: JSON.stringify(reopened) })).toBe(100);
    } finally { __setLabs(null); vi.unstubAllGlobals(); }
  });
  it('does not revive a hidden playtest field after returning to a normal career', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value) });
    try {
      __setLabs({ visible: false, on: {}, hintsSeen: [], fieldLength: 60,
        testCareer: { preset: 'block-play', fresh: false, from: 1 } });
      expect(setTestCareer(null)).toBe(true);
      const stored = readLabs(memory.get('nrl-sim-labs'));
      expect(stored.fieldLength).toBeUndefined();
      expect(resolveBootField({ worker: false, stored: JSON.stringify({ ...stored, visible: true }) })).toBe(100);
    } finally { __setLabs(null); vi.unstubAllGlobals(); }
  });
});
