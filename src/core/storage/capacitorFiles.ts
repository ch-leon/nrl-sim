// src/core/storage/capacitorFiles.ts — the iOS app's native file calls (Capacitor
// Filesystem and Share), for the save mirror (nativeMirror.ts) and the share-sheet
// export (fileExport.ts). Only ever reached through a dynamic import made after
// isIosNative() said yes, so the web bundle has no static path to these plugins.

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { NativeFiles } from './nativeMirror';

/** The mirror's directory, under the app's Library: not shown in Files, included in device backups. */
const MIRROR_DIR = 'nrl-sim-saves';
/** Exports wait here for the share sheet. Cache: iOS may clear it, which is fine once shared. */
const SHARE_DIR = 'nrl-sim-export';

async function exists(path: string, directory: Directory): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory });
    return true;
  } catch {
    return false;
  }
}

/** The save mirror's files, flat in Library/nrl-sim-saves. */
export function capacitorFiles(): NativeFiles {
  const dir = Directory.Library;
  const at = (name: string): string => `${MIRROR_DIR}/${name}`;
  return {
    async list() {
      try {
        const { files } = await Filesystem.readdir({ path: MIRROR_DIR, directory: dir });
        return files.filter((f) => f.type === 'file').map((f) => f.name);
      } catch (err) {
        if (!(await exists(MIRROR_DIR, dir))) return []; // first launch: no mirror yet
        throw err;
      }
    },
    exists: (name) => exists(at(name), dir),
    async read(name) {
      const { data } = await Filesystem.readFile({ path: at(name), directory: dir, encoding: Encoding.UTF8 });
      return typeof data === 'string' ? data : await data.text();
    },
    async write(name, text) {
      await Filesystem.writeFile({ path: at(name), directory: dir, data: text, encoding: Encoding.UTF8, recursive: true });
    },
    async rename(from, to) {
      await Filesystem.rename({ from: at(from), to: at(to), directory: dir, toDirectory: dir });
    },
    async remove(name) {
      try {
        await Filesystem.deleteFile({ path: at(name), directory: dir });
      } catch (err) {
        if (await exists(at(name), dir)) throw err; // already gone is a successful delete
      }
    },
  };
}

/**
 * Write `text` to a temporary file named `name` and open the iOS share sheet on it
 * (Save to Files, AirDrop, Mail…). Resolves once the sheet closes: true when the
 * player shared it, false when they cancelled. Rejects when the file could not be
 * written or the sheet failed.
 */
export async function shareTextFile(name: string, text: string): Promise<boolean> {
  const path = `${SHARE_DIR}/${name}`;
  const { uri } = await Filesystem.writeFile({ path, directory: Directory.Cache, data: text, encoding: Encoding.UTF8, recursive: true });
  try {
    await Share.share({ title: name, files: [uri] });
    return true;
  } catch (err) {
    if (/cancel/i.test(err instanceof Error ? err.message : String(err))) return false;
    throw err;
  } finally {
    try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch { /* the cache is cleared in time anyway */ }
  }
}
