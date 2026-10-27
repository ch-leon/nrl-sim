// A Map-backed localStorage for the commercial tests, with every write kept so a
// test can say which keys were touched.
import { vi } from 'vitest';

export interface MemStorage extends Storage {
  map: Map<string, string>;
  writes: string[];
}

export function stubLocalStorage(initial: Record<string, string> = {}): MemStorage {
  const map = new Map(Object.entries(initial));
  const writes: string[] = [];
  const s = {
    map,
    writes,
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => { writes.push(k); map.set(k, String(v)); }),
    removeItem: vi.fn((k: string) => { writes.push(k); map.delete(k); }),
    clear: () => map.clear(),
  };
  vi.stubGlobal('localStorage', s);
  return s as unknown as MemStorage;
}
