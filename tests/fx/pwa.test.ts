import { describe, it, expect, afterEach, vi } from 'vitest';

// This suite runs under the Vitest node runtime, but the project's tsconfig type
// set is ['vitest/globals'] (no @types/node), so we must not statically import
// node builtins or reference Buffer. We reach node APIs through indirect dynamic
// imports (specifier held in a variable) so tsc cannot try to resolve/type them,
// and treat their exports as `any`.

/* eslint-disable @typescript-eslint/no-explicit-any */
async function nodeRequire(spec: string): Promise<any> {
  const dynamicImport: (s: string) => Promise<any> = (s) => import(/* @vite-ignore */ s);
  return dynamicImport(spec);
}

// --- Icon generator: produces spec-valid PNGs ---------------------------------
// Run the prebuild script and assert each emitted file parses as a PNG of the
// declared dimensions (8-byte signature + IHDR with width/height/depth/colour).

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function u32be(bytes: Uint8Array, off: number): number {
  return (
    (bytes[off] << 24) |
    (bytes[off + 1] << 16) |
    (bytes[off + 2] << 8) |
    bytes[off + 3]
  ) >>> 0;
}

describe('gen-icons.mjs', () => {
  it('emits valid 192 and 512 PNGs with correct signature and IHDR dims', async () => {
    const cp = await nodeRequire('node:child_process');
    const fs = await nodeRequire('node:fs');
    const path = await nodeRequire('node:path');
    const url = await nodeRequire('node:url');

    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const root = path.join(here, '..', '..');
    // vite-node: the script reads the brand's TypeScript (#363), as npm's prebuild runs it.
    cp.execFileSync(path.join(root, 'node_modules', '.bin', 'vite-node'), ['scripts/gen-icons.mjs'], { cwd: root });

    for (const size of [192, 512]) {
      const p = path.join(root, 'public', 'icons', `icon-${size}.png`);
      expect(fs.existsSync(p)).toBe(true);
      const bytes: Uint8Array = new Uint8Array(fs.readFileSync(p));

      // Signature.
      for (let i = 0; i < 8; i++) expect(bytes[i]).toBe(PNG_SIG[i]);
      // First chunk must be IHDR.
      const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
      expect(type).toBe('IHDR');
      // IHDR data starts at offset 16.
      expect(u32be(bytes, 16)).toBe(size); // width
      expect(u32be(bytes, 20)).toBe(size); // height
      expect(bytes[24]).toBe(8); // bit depth
      expect(bytes[25]).toBe(6); // colour type RGBA
    }
  });
});

// --- Detection helpers --------------------------------------------------------
// The vitest env is 'node' (no window/navigator), so we stub globals per case.

afterEach(() => {
  vi.unstubAllGlobals();
});

async function freshPwa() {
  vi.resetModules();
  return import('../../src/fx/pwa');
}

describe('isIosSafari()', () => {
  it('is true for an iPhone Safari UA', async () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
    });
    const { isIosSafari } = await freshPwa();
    expect(isIosSafari()).toBe(true);
  });

  it('is false for Chrome on iOS (CriOS)', async () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
    });
    const { isIosSafari } = await freshPwa();
    expect(isIosSafari()).toBe(false);
  });

  it('is false for Android Chrome', async () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
      maxTouchPoints: 5,
    });
    const { isIosSafari } = await freshPwa();
    expect(isIosSafari()).toBe(false);
  });

  it('is false when navigator is undefined (node/SSR)', async () => {
    const { isIosSafari } = await freshPwa();
    expect(isIosSafari()).toBe(false);
  });
});

describe('isStandalone()', () => {
  it('is true when display-mode:standalone matches', async () => {
    vi.stubGlobal('navigator', { userAgent: 'x', maxTouchPoints: 0 });
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
    });
    const { isStandalone } = await freshPwa();
    expect(isStandalone()).toBe(true);
  });

  it('is true when navigator.standalone is set (iOS)', async () => {
    vi.stubGlobal('navigator', { userAgent: 'x', maxTouchPoints: 0, standalone: true });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const { isStandalone } = await freshPwa();
    expect(isStandalone()).toBe(true);
  });

  it('is false in a normal browser tab', async () => {
    vi.stubGlobal('navigator', { userAgent: 'x', maxTouchPoints: 0 });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const { isStandalone } = await freshPwa();
    expect(isStandalone()).toBe(false);
  });

  it('is false when window is undefined', async () => {
    const { isStandalone } = await freshPwa();
    expect(isStandalone()).toBe(false);
  });
});

describe('canInstall() / promptInstall()', () => {
  it('reports no install available before any beforeinstallprompt', async () => {
    const { canInstall } = await freshPwa();
    expect(canInstall()).toBe(false);
  });

  it("promptInstall() returns 'unavailable' with no deferred prompt", async () => {
    const { promptInstall } = await freshPwa();
    await expect(promptInstall()).resolves.toBe('unavailable');
  });
});

describe('update prompt (N7, #181)', () => {
  it('reports no update waiting until a build is', async () => {
    const { updateReady, reloadForUpdate } = await freshPwa();
    expect(updateReady()).toBe(false);
    expect(() => reloadForUpdate()).not.toThrow();
  });

  it('startUpdateChecks polls on the interval and when the app is shown again', async () => {
    vi.useFakeTimers();
    try {
      const { startUpdateChecks } = await freshPwa();
      const check = vi.fn(() => Promise.resolve());
      const handlers = new Map<string, () => void>();
      const doc = {
        visibilityState: 'hidden' as DocumentVisibilityState,
        addEventListener: (type: string, cb: EventListenerOrEventListenerObject) => handlers.set(type, cb as () => void),
        removeEventListener: (type: string) => handlers.delete(type),
      };
      const stop = startUpdateChecks(check, { intervalMs: 1000, doc });
      expect(check).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2500);
      expect(check).toHaveBeenCalledTimes(2);
      handlers.get('visibilitychange')?.(); // hidden: nothing
      expect(check).toHaveBeenCalledTimes(2);
      doc.visibilityState = 'visible';
      handlers.get('visibilitychange')?.();
      expect(check).toHaveBeenCalledTimes(3);
      stop();
      vi.advanceTimersByTime(5000);
      expect(check).toHaveBeenCalledTimes(3);
      expect(handlers.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('startUpdateChecks swallows a failed check (offline, mid-deploy)', async () => {
    vi.useFakeTimers();
    try {
      const { startUpdateChecks } = await freshPwa();
      const check = vi.fn(() => Promise.reject(new Error('offline')));
      const stop = startUpdateChecks(check, { intervalMs: 10, doc: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} } });
      vi.advanceTimersByTime(25);
      await vi.runAllTicks();
      expect(check).toHaveBeenCalledTimes(2);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
