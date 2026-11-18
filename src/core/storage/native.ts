// src/core/storage/native.ts — where the iOS app's native storage meets the game
// (docs/specs/ios.md Phase 2): the save mirror at boot, and how an exported file
// leaves the app. Off iOS both are exactly the web behaviour, and the Capacitor
// plugins (capacitorFiles.ts) are only ever loaded by a dynamic import on iOS. Each
// import sits behind IOS_CODE (platform.ts), so a build where it is false drops them.

import { browserStorage, browserStorageKeys, setMirroredStorage } from './local';
import { startNativeMirror, type MirrorStart } from './nativeMirror';
import { IOS_CODE, isIosNative } from './platform';

const noIosCode = (): Promise<never> => Promise.reject(new Error('not an iOS build'));

/**
 * main.ts awaits this before anything reads a save, and only in the iOS app (on
 * the web it is not even awaited, so boot is unchanged). Restores what the web
 * view lost, refreshes stale native copies, then mirrors every storage-layer
 * write. Never rejects.
 */
export async function bootNativeMirror(): Promise<MirrorStart> {
  const { start } = await startNativeMirror({
    ios: isIosNative(),
    storage: browserStorage(),
    keys: browserStorageKeys,
    loadFiles: () => IOS_CODE ? import('./capacitorFiles').then((m) => m.capacitorFiles()) : noIosCode(),
    install: setMirroredStorage,
  });
  return start;
}

/** How a file the player exports leaves the game. */
export type ExportPath = 'share-sheet' | 'browser-download';

/** The iOS app's web view cannot follow an `<a download>`, so it shares; everywhere else downloads. */
export function exportPath(ios: boolean = isIosNative()): ExportPath {
  return ios ? 'share-sheet' : 'browser-download';
}

/** A browser download of `text` as `name` (a Blob behind an `<a download>`). */
export function browserDownload(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DeliverDeps {
  path: ExportPath;
  download: (name: string, text: string) => void;
  /** True when shared, false when the player cancelled; rejects when the sheet failed. */
  share: (name: string, text: string) => Promise<boolean>;
}

const pageDeliver = (): DeliverDeps => ({
  path: exportPath(),
  download: browserDownload,
  share: (name, text) => IOS_CODE ? import('./capacitorFiles').then((m) => m.shareTextFile(name, text)) : noIosCode(),
});

export interface DeliverOutcome {
  /** The file went out: at once for a download, once the share sheet completes on iOS. */
  onDelivered?: () => void;
  /** The share sheet could not open. A cancel calls neither. */
  onShareFailed: () => void;
}

/**
 * Hand the player `text` as a file called `name`: a browser download (synchronous,
 * as before), or in the iOS app the share sheet (Files, AirDrop…).
 */
export function deliverFile(name: string, text: string, outcome: DeliverOutcome, deps: DeliverDeps = pageDeliver()): void {
  if (deps.path === 'browser-download') {
    deps.download(name, text);
    outcome.onDelivered?.();
    return;
  }
  deps.share(name, text).then(
    (shared) => { if (shared) outcome.onDelivered?.(); },
    (err: unknown) => {
      console.warn('nrl-sim: share sheet failed', err);
      outcome.onShareFailed();
    },
  );
}
