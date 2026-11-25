// Challenge outcomes on iPhone must be recoverable before the game reveals them.
// The caller captures the physical slot key, the verified save bytes and its
// gameplay ownership before awaiting. Ordinary saves never wait on this bridge.
import { classicRetiredNoticeKey, LEGACY_SAVE_KEY, liveMatchKey, retiredSaveKey, SAVE_SLOT_PREFIX, saveMetaKey, slotKey } from '../storageKeys';
import { careerNamespace, type StorageLike } from './local';
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

function retirementReady(): NativeCheckpointResult | null {
  if (!ios) return 'inactive';
  if (careerNamespace() !== null) return 'inactive';
  if (!active || !boot) return 'unavailable';
  return null;
}

/**
 * Confirm the archived Classic bytes are the copy a wiped web view would restore.
 * Does not touch the live slot. Off iPhone, and for a playtest career, this is
 * `inactive`.
 */
export async function acknowledgeClassicArchive(slot: number, raw: string): Promise<NativeCheckpointResult> {
  const early = retirementReady();
  if (early) return early;
  const archive = retiredSaveKey(slot);
  if (!isMirroredKey(archive)) return 'unavailable';
  const {storage, mirror} = active!;
  return mirror.confirm(archive, raw, () => storage.getItem(archive) === raw, boot!.signal);
}

/**
 * Confirm the live slot, its meta, its live-match record and (for slot 1) the
 * legacy key are gone. Call this only after `acknowledgeClassicArchive` has
 * confirmed, so a wipe cannot find the slot marked deleted and the archive missing.
 */
export async function acknowledgeClassicSlotGone(slot: number): Promise<NativeCheckpointResult> {
  const early = retirementReady();
  if (early) return early;
  const live = slotKey(slot);
  if (!isMirroredKey(live)) return 'unavailable';
  const {storage, mirror} = active!;
  const signal = boot!.signal;
  const goneKeys = [live, saveMetaKey(slot), liveMatchKey(slot), ...(slot === 1 ? [LEGACY_SAVE_KEY] : [])];
  for (const key of goneKeys) {
    const gone = await mirror.confirmGone(key, () => storage.getItem(key) === null, signal);
    if (gone !== 'confirmed') return gone;
  }
  const notice = classicRetiredNoticeKey(slot);
  const noted = storage.getItem(notice);
  if (noted === null || !isMirroredKey(notice)) return 'confirmed';
  return mirror.confirm(notice, noted, () => storage.getItem(notice) === noted, signal);
}

/**
 * A retired Classic slot must not come back from the native mirror (#819). Confirms
 * the archived bytes, then confirms the live slot is gone. The caller must already
 * have deleted the slot; to keep that order, use `retireClassicSlotDurable`.
 */
export async function acknowledgeRetiredClassicSave(slot: number, raw: string): Promise<NativeCheckpointResult> {
  const archived = await acknowledgeClassicArchive(slot, raw);
  if (archived !== 'confirmed') return archived;
  return acknowledgeClassicSlotGone(slot);
}
