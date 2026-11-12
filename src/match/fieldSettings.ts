// Geometry is frozen for a page/worker lifetime. Applying a field choice reloads
// between matches, before any simulation constants or stadium textures exist.
import { browserStorage } from '../core/storage/local';
import { LABS_KEY } from '../core/storageKeys';
import { readLabs } from '../labs/flags';
import { fieldFromWorkerName, type FieldLength } from '../labs/fieldLength';

export function resolveBootField(input: { worker: boolean; workerName?: unknown; stored?: unknown }): FieldLength {
  if (input.worker) return fieldFromWorkerName(input.workerName);
  const settings = readLabs(input.stored);
  return settings.visible ? settings.fieldLength ?? 100 : 100;
}
export function bootFieldLength(): FieldLength {
  if (typeof window === 'undefined') return resolveBootField({ worker: true, workerName: (globalThis as { name?: unknown }).name });
  let stored: string | null = null;
  try { stored = browserStorage()?.getItem(LABS_KEY) ?? null; } catch { /* Blocked storage uses the normal field. */ }
  return resolveBootField({ worker: false, stored });
}
