# Commercial saves — storage adapter, save metadata and conflict rules
**GitHub:** #360 (commercial foundations 01) | **Status:** shipped, no cloud yet; iOS native mirror added (docs/specs/ios.md Phase 2)

## Problem
Saves are the whole `GameState` as JSON (v21, about 140 KB) in three localStorage
slots. Every platform will share one account with cloud saves, iOS can clear browser
storage, and the game is being renamed. We need a seam a cloud or native store can
plug into, enough metadata to compare two copies of a slot, and keys that survive the
rename. Nothing a player sees changes.

## What shipped
- **Frozen keys** (`src/core/storageKeys.ts`). Every persistent key lives here and is
  pinned by `tests/core/storageKeys.test.ts`. They are historical identifiers: they
  never follow the game's name.

  | Key | Holds |
  |---|---|
  | `nrl-sim-save-slot-<1..3>` | a slot's save JSON (unchanged bytes) |
  | `nrl-sim-save-v1` | the pre-slots save, until it is safely in slot 1 |
  | `nrl-sim-save-corrupt` | the last corrupt payload, for forensics |
  | `nrl-sim-save-meta-<1..3>` | the slot's `SaveMeta` (new) |
  | `nrl-sim-device-id` | this browser's random id (new; not personal data) |
  | `nrl-live-match-<1..3>` | the live match in progress beside a slot (coach calls #73) |
  | `nrlsim.iosInstallHintShown` | the iOS install hint has shown (BAK-204) |

- **The store** (`src/core/storage/`). `SaveStore` is `read(slot)`, `write(slot,
  payload, meta)`, `remove(slot)` and `list()` → `{ slot, present, meta }`, each
  allowed to return a promise. `LocalSaveStore` is the localStorage one, synchronous,
  and the only code that names `localStorage` (the live-match record and the PWA hint
  get the storage from it too). `MemorySaveStore` is for tests. `RemoteSaveStore` is an
  interface only: what a Supabase store must provide (meta listable without payloads,
  conditional writes, rejects when offline, never parses the payload). `save.ts` keeps
  its synchronous API and reaches storage only through `LocalSaveStore`.
- **Save metadata**, in the sidecar key and never inside the save JSON:
  `{ saveVersion, updatedAt, deviceId, checksum, revision, lastSyncedChecksum?, club?, season?, week? }`.
  - `checksum` is cyrb53 of the exact payload string (`src/utils/hash.ts`), 14 hex digits.
  - `revision` goes up by one on every write of the slot.
  - The meta is written just after its slot, when the current task ends (a microtask).
    A save is still one synchronous storage write; a burst of saves writes the meta
    once; a failed meta write (storage full) warns in the console and never touches
    the slot write before it.
  - A slot with no meta (every save from before this) is valid. Its meta is built from
    the payload when read, with `updatedAt` 0 (unknown, so the oldest) and revision 0.
    A meta whose checksum no longer matches its slot is rebuilt the same way, keeping
    its revision.
  - `listSlotMeta()` / `getSlotMeta(slot)` in `save.ts` read it.
- **Export and import** are unchanged: the file is the save JSON (plus the live match,
  as before). Meta is not exported; an import writes fresh meta like any save.

## Native mirror (iOS app only) — docs/specs/ios.md Phase 2
iOS may clear a web view's storage, so in the iOS app every save key also has a native
copy. localStorage stays the working copy; nothing changes on the web or Android.

- **Where it hooks in.** `browserStorage()` (`local.ts`) hands out localStorage wrapped by
  `mirroredStorage()` (`nativeMirror.ts`): each `setItem` / `removeItem` of a mirrored key
  that lands is also queued for the native side. The entitlement keys, the first-run
  record and the match log mode now reach storage through `browserStorage()` too.
- **Which keys** (`isMirroredKey`, named from `storageKeys.ts`): the slots, slot meta,
  live-match records and recovery copies (`-<slot>`), the legacy save, device id, Labs,
  the iOS hint, the log mode, and the commercial keys (entitlements cache and stub, first
  run). Not mirrored: the playtest career (`nrl-sim-devtest:*`, `-backup`, `-displaced`),
  and the corrupt-save copy, which `keepCorrupt` writes once only (restoring an old one
  would stop a newer one being kept).
- **Files.** One file per key in `Library/nrl-sim-saves/` (Capacitor Filesystem,
  `Directory.Library`: not shown in Files, included in device backups), named
  `encodeURIComponent(key) + '.txt'`. A write goes to `.tmp`, is renamed to `.ready`, then
  replaces the file. The sync prefers `.ready`, never reads `.tmp`, and a `.ready` with
  no file beside it is promoted, never deleted, so the only good copy is never lost.
- **Launch.** `main.ts` awaits `bootNativeMirror()` before anything reads a save, in the
  iOS app only. The boot sync reads the native copies in parallel. localStorage wins: a
  key it lacks is restored from native (unless marked deleted); a key it has is never
  overwritten, and is rewritten natively when the copy differs or is missing (a write
  cut short by suspension, or a career saved before the mirror). If the native side
  fails to load, boot goes on with localStorage and nothing is mirrored.
- **Writes.** One key's native writes run in order; while one is in flight the later
  ones collapse to the latest (last write wins). A failed native write is logged and
  never blocks or breaks the localStorage write. Nothing is timed: each native write is
  started by the storage write (or the boot sync) that caused it.
- **Deletes.** A delete first writes a `.gone` marker, then removes the copies. The sync
  treats a marked key as deleted and finishes the removal, so a delete cut short (or a
  failed removal) cannot bring a career back. The next write of the key clears it.
- **Export.** `downloadSave`, `downloadOriginalSave` and `downloadNames` go through
  `deliverFile()` (`native.ts`): a browser download everywhere, except the iOS app,
  which writes the file to the cache and opens the share sheet (`@capacitor/share`). On
  iOS the "exported" toast shows only once the share completes; a cancel shows nothing.
  Import is unchanged.
- **Packaging.** The Capacitor plugins load only by dynamic import on iOS
  (`capacitorFiles.ts`), each behind `IOS_CODE` (`platform.ts`), so the web bundle has no
  static dependency on them; their chunks are named `capacitor-*` and kept out of the PWA
  precache. `capacitor.config.ts` sets `android.includePlugins: []` so the Android project
  links none of them.
- **Platform.** `isIosNative()` (`platform.ts`) reads the native bridge's
  `Capacitor.getPlatform()`. Once there is a compile-time platform constant, setting
  `IOS_CODE` to it drops the Capacitor chunks from web and Android builds.
- **Known limits.** The Labs field length is read when `src/match/core/field.ts` loads
  (before the boot sync), so a restored Labs value applies from the next launch. File
  names assume no two keys differ only by case (the iOS volume is case-insensitive);
  none do today.
- Tests: `tests/core/nativeMirror.test.ts`.

## Conflict rules — `resolveSaveConflict(local, remote)`
`src/core/storage/conflict.ts`, pure (no UI, no network). It takes each side's
`SaveMeta` (null: no save on that side) and returns `'keep-local' | 'take-remote' |
'same' | 'ask'`. First match wins:

1. Same checksum → `same`. Both missing is `same` too.
2. One side missing → keep the side that exists.
3. Either side is a save version newer than this build supports → `ask`. This build can
   neither load it nor judge it, and must never overwrite it.
4. Same device, different revisions → the higher revision.
5. Different devices, both changed since the last sync (neither checksum is the local
   meta's `lastSyncedChecksum`, or the slot never synced) → `ask`. The future UI offers
   "This device / Cloud", showing each side's club, season, week and time.
6. Otherwise the newer `updatedAt` wins; unknown (0) is the oldest. Equal times → `ask`.

The sync that will call it records `lastSyncedChecksum` in the local meta after each
successful sync; nothing sets it yet.

## Out of scope (later tasks)
Supabase or any network code, login, the conflict-choice UI. Native storage is a
mirror of localStorage in the iOS app only (above), not a store of its own. `SAVE_VERSION`, the `GameState` shape and the slot count are unchanged.

## Tests
`tests/core/storageKeys.test.ts` (key pins), `tests/utils/hash.test.ts` (checksum pins),
`tests/core/saveStore.test.ts` (byte-identical round trip incl. every corpus save, meta
written / tolerated / rebuilt, revision, device id across reloads, legacy → slot 1
through the adapter, quota on the meta write, one test per conflict rule).
