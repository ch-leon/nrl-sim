import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setSaveLockClock, SAVE_LEASE_MS, SaveLockBusy, saveLeaseHeld, withSaveLease, withSaveLock } from '../../src/core/storage/saveLock';
import { SAVE_LOCK_KEY } from '../../src/core/storageKeys';
import { stubLocalStorage } from '../commercial/memStorage';

afterEach(() => { __setSaveLockClock(null); vi.unstubAllGlobals(); });

describe('the cross-tab save lease (#819)', () => {
  it('runs one section at a time and releases afterwards', () => {
    const storage = stubLocalStorage();
    expect(withSaveLease(storage, () => saveLeaseHeld(storage))).toBe(true);
    expect(storage.getItem(SAVE_LOCK_KEY)).toBeNull();
  });

  it('refuses while another tab holds a live lease, and takes an expired one', () => {
    const storage = stubLocalStorage();
    let now = 1000;
    __setSaveLockClock(() => now);
    storage.setItem(SAVE_LOCK_KEY, JSON.stringify({ token: 'other-tab:1', expires: now + SAVE_LEASE_MS }));
    const ran = vi.fn();
    expect(() => withSaveLease(storage, ran)).toThrow(SaveLockBusy);
    expect(ran).not.toHaveBeenCalled();
    now += SAVE_LEASE_MS + 1;
    withSaveLease(storage, ran);
    expect(ran).toHaveBeenCalledOnce();
  });

  it('backs off when a second tab claims at the same moment', () => {
    const storage = stubLocalStorage();
    const set = storage.setItem.bind(storage);
    // The other tab's claim lands right after ours.
    storage.setItem = (key: string, value: string) => {
      set(key, value);
      if (key === SAVE_LOCK_KEY) set(key, JSON.stringify({ token: 'other-tab:9', expires: Date.now() + SAVE_LEASE_MS }));
    };
    const ran = vi.fn();
    expect(() => withSaveLease(storage, ran)).toThrow(SaveLockBusy);
    expect(ran).not.toHaveBeenCalled();
    // Ours is never released over theirs.
    expect(JSON.parse(storage.getItem(SAVE_LOCK_KEY)!).token).toBe('other-tab:9');
  });

  it('is re-entrant within a tab and leaves another tab\'s lease alone', () => {
    const storage = stubLocalStorage();
    expect(withSaveLease(storage, () => withSaveLease(storage, () => 7))).toBe(7);
    expect(storage.getItem(SAVE_LOCK_KEY)).toBeNull();
  });

  it('waits for a busy lease, through navigator.locks where it exists', async () => {
    const storage = stubLocalStorage();
    const requests: string[] = [];
    vi.stubGlobal('navigator', { locks: { request: (name: string, _o: unknown, cb: () => unknown) => { requests.push(name); return Promise.resolve(cb()); } } });
    storage.setItem(SAVE_LOCK_KEY, JSON.stringify({ token: 'other-tab:1', expires: Date.now() + SAVE_LEASE_MS }));
    setTimeout(() => storage.removeItem(SAVE_LOCK_KEY), 60);
    await expect(withSaveLock(storage, () => 'done')).resolves.toBe('done');
    expect(requests).toEqual(['nrl-sim-saves']);
  });

  it('gives up with SaveLockBusy when the lease never frees', async () => {
    const storage = stubLocalStorage();
    storage.setItem(SAVE_LOCK_KEY, JSON.stringify({ token: 'other-tab:1', expires: Date.now() + 60_000 }));
    await expect(withSaveLock(storage, () => 1, 80)).rejects.toBeInstanceOf(SaveLockBusy);
  });
});
