// src/core/storageKeys.ts — every key the game keeps in browser storage (#360).
//
// These are historical identifiers, not branding. Careers live under them, so they
// must NEVER follow the game's name: a rebrand that derived a key from the new name
// would show every player an empty title screen. tests/core/storageKeys.test.ts pins
// each string, so renaming one fails CI. A new key gets a new name here and a pin
// there; an existing one never changes.
//
// No imports: save.ts, the live-match record and the PWA all read from here.

/** One save slot: `nrl-sim-save-slot-<1..3>`. */
export const SAVE_SLOT_PREFIX = 'nrl-sim-save-slot-';
/** The single save from before slots (GitHub #34). Kept until its data is safely in slot 1. */
export const LEGACY_SAVE_KEY = 'nrl-sim-save-v1';
/** The raw payload of the last corrupt save, kept for forensics. */
export const CORRUPT_SAVE_KEY = 'nrl-sim-save-corrupt';
/** A slot's metadata sidecar (#360): `nrl-sim-save-meta-<slot>`. Never inside the save JSON. */
export const SAVE_META_PREFIX = 'nrl-sim-save-meta-';
/** A random id for this browser, made once (#360). Not personal data. */
export const DEVICE_ID_KEY = 'nrl-sim-device-id';
/** The live match in progress beside a slot (coach calls #73): `nrl-live-match-<slot>`. */
export const LIVE_MATCH_PREFIX = 'nrl-live-match-';
/** Set once the iOS "Add to Home Screen" hint has shown (BAK-204). */
export const IOS_INSTALL_HINT_KEY = 'nrlsim.iosInstallHintShown';

export function slotKey(slot: number): string {
  return `${SAVE_SLOT_PREFIX}${slot}`;
}

export function saveMetaKey(slot: number): string {
  return `${SAVE_META_PREFIX}${slot}`;
}

export function liveMatchKey(slot: number): string {
  return `${LIVE_MATCH_PREFIX}${slot}`;
}

/** Local experiments, never part of a career (Labs: match controls (Leon, 30 Oct)). */
export const LABS_KEY = 'nrl-sim-labs';
