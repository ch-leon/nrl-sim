import { describe, expect, it } from 'vitest';
import {
  LABS_KEY, DEV_TEST_BACKUP_KEY, DEV_TEST_DISPLACED_KEY, DEV_TEST_PREFIX, CORRUPT_SAVE_KEY, DEVICE_ID_KEY, IOS_INSTALL_HINT_KEY, LEGACY_SAVE_KEY, LIVE_MATCH_PREFIX,
  liveMatchKey, recoveryKey, SAVE_META_PREFIX, SAVE_SLOT_PREFIX, saveMetaKey, slotKey,
} from '../../src/core/storageKeys';
import { CORRUPT_KEY, SAVE_KEY, slotKey as saveSlotKey } from '../../src/core/save';
import { liveMatchKey as recordKey } from '../../src/systems/liveMatchRecord';

// #360: these keys hold players' careers. They are historical identifiers and must
// never follow the game's name. If this test fails, a rename is about to wipe saves:
// put the old string back.

describe('frozen storage keys (#360)', () => {
  it('pins every key string', () => {
    expect(LABS_KEY).toBe('nrl-sim-labs');
    expect(DEV_TEST_PREFIX).toBe('nrl-sim-devtest:');
    expect(DEV_TEST_BACKUP_KEY).toBe('nrl-sim-devtest-backup');
    expect(DEV_TEST_DISPLACED_KEY).toBe('nrl-sim-devtest-displaced');
    expect(SAVE_SLOT_PREFIX).toBe('nrl-sim-save-slot-');
    expect([1, 2, 3].map(slotKey)).toEqual(['nrl-sim-save-slot-1', 'nrl-sim-save-slot-2', 'nrl-sim-save-slot-3']);
    expect(LEGACY_SAVE_KEY).toBe('nrl-sim-save-v1');
    expect(CORRUPT_SAVE_KEY).toBe('nrl-sim-save-corrupt');
    expect([1, 2, 3].map(recoveryKey)).toEqual(['nrl-sim-save-recovery-1', 'nrl-sim-save-recovery-2', 'nrl-sim-save-recovery-3']);
    expect(SAVE_META_PREFIX).toBe('nrl-sim-save-meta-');
    expect([1, 2, 3].map(saveMetaKey)).toEqual(['nrl-sim-save-meta-1', 'nrl-sim-save-meta-2', 'nrl-sim-save-meta-3']);
    expect(DEVICE_ID_KEY).toBe('nrl-sim-device-id');
    expect(LIVE_MATCH_PREFIX).toBe('nrl-live-match-');
    expect([1, 2, 3].map(liveMatchKey)).toEqual(['nrl-live-match-1', 'nrl-live-match-2', 'nrl-live-match-3']);
    expect(IOS_INSTALL_HINT_KEY).toBe('nrlsim.iosInstallHintShown');
  });

  it('is the one source the save code and the live-match record use', () => {
    expect(SAVE_KEY).toBe('nrl-sim-save-v1');
    expect(CORRUPT_KEY).toBe('nrl-sim-save-corrupt');
    expect(saveSlotKey(2)).toBe('nrl-sim-save-slot-2');
    expect(recordKey(3)).toBe('nrl-live-match-3');
  });
});
