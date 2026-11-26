// Challenge outcomes on iPhone must be recoverable before the game reveals them.
// The caller captures the physical slot key, the verified save bytes and its
// gameplay ownership before awaiting. Ordinary saves never wait on this bridge.
import { SAVE_SLOT_PREFIX } from '../storageKeys';
import type { StorageLike } from './local';
import { isMirroredKey, type NativeMirror } from './nativeMirror';
import { isIosNative } from './platform';

export type NativeCheckpointResult = 'confirmed' | 'inactive' | 'unavailable' | 'failed' | 'timeout' | 'superseded';

let ios = isIosNative();
let boot: AbortController | null = null;
let active: { storage: StorageLike; mirror: NativeMirror } | null = null;

/** The synchronous advance gate uses the same boot mode as acknowledgement. */
export function nativeCheckpointRequired(): boolean { return ios; }

/** A fresh boot invalidates all pending confirmations, including when loading the plugin fails. */
export function beginNativeCheckpointBoot(isIos: boolean): (storage: StorageLike, mirror: NativeMirror) => boolean {
  boot?.abort();
  const owner = isIos ? new AbortController() : null;
  boot = owner;
  active = null;
  ios = isIos;
  return (storage, mirror) => {
    if (!owner || owner.signal.aborted || active) return false;
    active = { storage, mirror };
    return true;
  };
}

/** Each call checks the native bytes and may make one repair attempt. A retry uses the same saved bytes. */
export function acknowledgeNativeCheckpoint(key: string, payload: string): Promise<NativeCheckpointResult> {
  if (!ios) return Promise.resolve('inactive');
  if (!active || !boot || !key.startsWith(SAVE_SLOT_PREFIX) || !isMirroredKey(key)) return Promise.resolve('unavailable');
  const {storage, mirror} = active;
  return mirror.confirm(key, payload, () => storage.getItem(key) === payload, boot.signal);
}
