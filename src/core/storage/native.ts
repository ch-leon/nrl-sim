// src/core/storage/native.ts — where the iOS app's native storage meets the game
// (docs/specs/ios.md Phase 2): the save mirror at boot, and how an exported file
// leaves the app. Off iOS both are exactly the web behaviour, and the Capacitor
// plugins (capacitorFiles.ts) are only ever loaded by a dynamic import on iOS.

import { browserStorage, browserStorageKeys, setMirroredStorage } from './local';
import { startNativeMirror, type MirrorStart } from './nativeMirror';
import { isIosNative } from './platform';

/**
 * main.ts awaits this before anything reads a save, and only in the iOS app (on
 * the web it is not even awaited, so boot is unchanged). Restores what the web
 * view lost, then mirrors every storage-layer write. Never rejects.
 */
export function bootNativeMirror(): Promise<MirrorStart> {
  return startNativeMirror({
    ios: isIosNative(),
    storage: browserStorage(),
    keys: browserStorageKeys,
    loadFiles: () => import('./capacitorFiles').then((m) => m.capacitorFiles()),
    install: setMirroredStorage,
  });
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
  share: (name: string, text: string) => Promise<void>;
}

const pageDeliver = (): DeliverDeps => ({
  path: exportPath(),
  download: browserDownload,
  share: (name, text) => import('./capacitorFiles').then((m) => m.shareTextFile(name, text)),
});

/**
 * Hand the player `text` as a file called `name`: a browser download (synchronous,
 * as before), or in the iOS app the share sheet (Files, AirDrop…). `onShareFailed`
 * runs if the share sheet could not open; a cancel is not a failure.
 */
export function deliverFile(name: string, text: string, onShareFailed: () => void, deps: DeliverDeps = pageDeliver()): void {
  if (deps.path === 'browser-download') {
    deps.download(name, text);
    return;
  }
  deps.share(name, text).catch((err: unknown) => {
    console.warn('nrl-sim: share sheet failed', err);
    onShareFailed();
  });
}
