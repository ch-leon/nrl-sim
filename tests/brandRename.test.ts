import { describe, it, expect, vi } from 'vitest';

// #363's dry run of a rename: src/brand.ts is swapped for a renamed brand, and every
// place a player sees the name follows it with no other file touched. The real
// brand.ts keeps today's values (tests/brand.test.ts pins them).

vi.mock('../src/brand', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/brand')>();
  return {
    ...real,
    BRAND: {
      ...real.BRAND,
      name: 'Footy Manager',
      shortName: 'FootyMgr',
      titleText: 'FOOTY MANAGER',
      iconLetters: 'FM',
      exportSlug: 'footy-manager',
    },
  };
});

const INDEX_HTML = Object.values(import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }))[0] as string;
const MAIN_ICON_SHA = {
  192: 'eef08fbfdec71735d4fa6bf062923339cb94eabf879eaeef47de32b5792e1440',
  512: 'c13d4c9110283a6ea435389aaae7427ac33ce5d9f19eac109ff194daa50d5883',
};
async function sha256(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const { BRAND } = await import('../src/brand');
const { titleHeading } = await import('../src/ui/title');
const { rotateText } = await import('../src/ui/orientation');
const { brandSign, panelsFor } = await import('../src/art/match/stadium');
const { kitFromColors } = await import('../src/art/match/kit');
const { renderIcon } = await import('../src/art/appIcon');
const { exportFilename, importSave } = await import('../src/core/save');
const { createNewGame, SAVE_VERSION } = await import('../src/core/state');
const { PWA_MANIFEST, brandIndexHtml } = await import('../src/brandBuild');
const { SAVE_SLOT_PREFIX, LEGACY_SAVE_KEY, CORRUPT_SAVE_KEY, SAVE_META_PREFIX, DEVICE_ID_KEY } = await import('../src/core/storageKeys');

describe('renaming the game is one file (dry run)', () => {
  it('the brand module is the renamed one', () => {
    expect(BRAND.name).toBe('Footy Manager');
  });

  it('1-2. index.html: the tab title and the home-screen name', () => {
    const html = brandIndexHtml(INDEX_HTML);
    expect(html).toContain('<title>Footy Manager</title>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Footy Manager" />');
    expect(html).not.toMatch(/NRL ?Sim/i);
  });

  it('3. the PWA manifest', () => {
    expect(PWA_MANIFEST.name).toBe('Footy Manager');
    expect(PWA_MANIFEST.short_name).toBe('FootyMgr');
  });

  it('4. the title heading', () => {
    const g = globalThis as { document?: unknown };
    const real = g.document;
    g.document = {
      createElement: (tag: string) => ({
        tagName: tag, textContent: '', attrs: {} as Record<string, string>,
        setAttribute(k: string, v: string) { this.attrs[k] = v; },
        appendChild() { /* unused for a text logo */ },
      }),
    };
    try {
      expect(titleHeading()[0]!.textContent).toBe('FOOTY MANAGER');
    } finally {
      g.document = real;
    }
  });

  it('5. the rotate message', () => {
    expect(rotateText()).toBe('Footy Manager plays in landscape. The game is paused until you rotate.');
  });

  it('6. the stadium sign', () => {
    const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'a');
    const away = kitFromColors(['#2e6fd8', '#ffffff'], 'b');
    expect(brandSign()).toBe('FOOTY MANAGER');
    expect(panelsFor(home, away).map((p) => p.text)).toContain('FOOTY MANAGER');
    expect(panelsFor(home, away).map((p) => p.text)).not.toContain('NRL SIM');
  });

  it('the newer-save message and the export file name', () => {
    const res = importSave(JSON.stringify({ ...createNewGame('F', 1), version: SAVE_VERSION + 1 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain('newer version of Footy Manager');
    expect(exportFilename(createNewGame('Crushers', 1))).toMatch(/^footy-manager-crushers-s\d+w\d+\.json$/);
  });

  it('the icons (what scripts/gen-icons.mjs encodes) change with it', async () => {
    // main's icons, as pinned in tests/brand.test.ts.
    expect(await sha256(renderIcon(192, BRAND))).not.toBe(MAIN_ICON_SHA[192]);
    expect(await sha256(renderIcon(512, BRAND))).not.toBe(MAIN_ICON_SHA[512]);
  });

  it('the storage keys do not move: no key is derived from the brand', () => {
    expect(SAVE_SLOT_PREFIX).toBe('nrl-sim-save-slot-');
    expect(LEGACY_SAVE_KEY).toBe('nrl-sim-save-v1');
    expect(CORRUPT_SAVE_KEY).toBe('nrl-sim-save-corrupt');
    expect(SAVE_META_PREFIX).toBe('nrl-sim-save-meta-');
    expect(DEVICE_ID_KEY).toBe('nrl-sim-device-id');
  });
});
