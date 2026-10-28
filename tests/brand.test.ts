import { describe, it, expect, afterEach } from 'vitest';
import { BRAND, signText, type Brand } from '../src/brand';
import { COLOR_TOKENS } from '../src/ui/tokens';
import { CSS } from '../src/ui/dom';
import { titleHeading } from '../src/ui/title';
import { rotateText } from '../src/ui/orientation';
import { brandSign, panelsFor } from '../src/art/match/stadium';
import { kitFromColors } from '../src/art/match/kit';
import { textWidth } from '../src/art/match/font';
import { renderIcon } from '../src/art/appIcon';
import { exportFilename, exportSave, importSave, pickSaveFile } from '../src/core/save';
import { createNewGame, SAVE_VERSION } from '../src/core/state';
import { PWA_MANIFEST, brandIndexHtml } from '../src/brandBuild';

// #363: the game's name, short name, colours and logo live in src/brand.ts, and every
// place a player sees them reads from there. Today's values are the game as it was,
// so nothing on screen changes; tests/brandRename.test.ts renames it and watches
// every consumer follow.

// No Node types in the tsconfig: files come in as text through Vite's ?raw glob.
const INDEX_HTML = Object.values(import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }))[0] as string;
const OLD_SAVE = Object.values(import.meta.glob('./fixtures/saves/v19-mid-season.json', { query: '?raw', import: 'default', eager: true }))[0] as string;

/** Hex SHA-256 of some bytes (Web Crypto: no Node types needed). */
async function sha256(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Just enough of a DOM element for the title heading and the save picker. */
class StubEl {
  tagName: string;
  textContent = '';
  attrs: Record<string, string> = {};
  children: StubEl[] = [];
  listeners: Record<string, () => void> = {};
  files: { text: () => Promise<string>; name: string }[] = [];
  type = '';
  accept = '';
  constructor(tag: string) { this.tagName = tag; }
  setAttribute(k: string, v: string): void { this.attrs[k] = v; }
  getAttribute(k: string): string | null { return this.attrs[k] ?? null; }
  appendChild(c: StubEl): StubEl { this.children.push(c); return c; }
  addEventListener(ev: string, fn: () => void): void { this.listeners[ev] = fn; }
  click(): void { /* the picker opens; the test picks a file with change() */ }
  change(): void { this.listeners.change?.(); }
}

const g = globalThis as { document?: unknown };
const realDocument = g.document;
let created: StubEl[] = [];
function stubDocument(): void {
  created = [];
  g.document = { createElement: (tag: string) => { const e = new StubEl(tag); created.push(e); return e; } };
}
afterEach(() => { g.document = realDocument; });

const withBrand = (over: Partial<Brand>): Brand => ({ ...BRAND, ...over });

describe('BRAND today (players see no change)', () => {
  it("keeps the game's current name, short name and title text", () => {
    expect(BRAND.name).toBe('NRL Sim');
    expect(BRAND.shortName).toBe('NRLSim');
    expect(BRAND.titleText).toBe('NRL SIM');
    expect(BRAND.parentBrand).toEqual({ name: 'SuperCOOKED', show: false });
    expect(BRAND.logo).toEqual({ kind: 'text' });
    expect(BRAND.exportSlug).toBe('nrl-sim');
    expect(BRAND.supportUrl).toBeUndefined();
  });

  it("points its colours at the theme's tokens instead of copying them", () => {
    expect(BRAND.colors.background).toBe(COLOR_TOKENS.navy);
    expect(BRAND.colors.primary).toBe(COLOR_TOKENS.accent);
    expect(BRAND.colors.onPrimary).toBe(COLOR_TOKENS.onAccent);
    expect(BRAND.colors.text).toBe(COLOR_TOKENS.text);
    // Only what the theme has no token for is the brand's own: the manifest and icon colours.
    expect(BRAND.colors.app).toBe('#1a1a2e');
    expect(BRAND.colors.iconBall).toBe('#e8e4d8');
  });

  it("the UI stylesheet's tokens are the same values as before the move", () => {
    expect(CSS).toContain('--nrl-navy: #0e1630;');
    expect(CSS).toContain('--nrl-accent: #f4d03f;');
    expect(CSS).toContain('--nrl-on-accent: #0e1630;');
    expect(CSS).toContain('--nrl-sheet: rgba(14, 22, 48, 0.97);');
    expect(CSS).toContain('--nrl-text-2: #c9d1ea;');
    expect(CSS).toContain('--nrl-fit-bad: #d9534f;');
    expect(CSS).not.toContain('${');
    expect(CSS).not.toContain('undefined');
  });
});

describe('each consumer reads BRAND', () => {
  it("the title heading is the brand's title text", () => {
    stubDocument();
    const out = titleHeading() as unknown as StubEl[];
    expect(out).toHaveLength(1);
    expect(out[0]!.tagName).toBe('h1');
    expect(out[0]!.attrs.class).toBe('nrl-title-name');
    expect(out[0]!.textContent).toBe('NRL SIM');
    expect(titleHeading(withBrand({ titleText: 'OTHER GAME' }))[0]!.textContent).toBe('OTHER GAME');
  });

  it('parentBrand.show toggles the "a SuperCOOKED game" line', () => {
    stubDocument();
    expect(titleHeading()).toHaveLength(1);
    const shown = titleHeading(withBrand({ parentBrand: { name: 'SuperCOOKED', show: true } })) as unknown as StubEl[];
    expect(shown).toHaveLength(2);
    expect(shown[1]!.textContent).toBe('a SuperCOOKED game');
    expect(shown[1]!.attrs['data-nrl-parent-brand']).toBe('');
  });

  it('an image logo draws an <img> from public/ in the heading, named for screen readers', () => {
    stubDocument();
    const [h1] = titleHeading(withBrand({ logo: { kind: 'image', src: 'brand/logo.png' } })) as unknown as StubEl[];
    expect(h1!.textContent).toBe('');
    const img = h1!.children[0]!;
    expect(img.tagName).toBe('img');
    expect(img.attrs.src).toBe('/brand/logo.png');
    expect(img.attrs.alt).toBe('NRL Sim');
  });

  it("the rotate message (#350) names the match and the grounds, with the brand's name", () => {
    expect(rotateText()).toBe('In NRL Sim, the match and the grounds play in landscape. Turn your phone sideways to carry on.');
    expect(rotateText(withBrand({ name: 'Other Game' }))).toMatch(/^In Other Game, the match and the grounds play in landscape\./);
  });

  it('the manifest (the config object vite-plugin-pwa is given) carries the brand', () => {
    expect(PWA_MANIFEST.name).toBe(BRAND.name);
    expect(PWA_MANIFEST.short_name).toBe(BRAND.shortName);
    expect(PWA_MANIFEST.theme_color).toBe(BRAND.colors.app);
    expect(PWA_MANIFEST.background_color).toBe(BRAND.colors.app);
    // Today's values, as main shipped them.
    expect([PWA_MANIFEST.name, PWA_MANIFEST.short_name, PWA_MANIFEST.theme_color]).toEqual(['NRL Sim', 'NRLSim', '#1a1a2e']);
  });

  it('index.html has placeholders, and the build fills in the brand', () => {
    const raw = INDEX_HTML;
    expect(raw).not.toMatch(/NRL ?Sim/i);
    const html = brandIndexHtml(raw);
    expect(html).not.toContain('%BRAND_');
    expect(html).toContain('<title>NRL Sim</title>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="NRL Sim" />');
    expect(html).toContain('<meta name="theme-color" content="#0e1630" />');
    expect(html).toContain('background: #0e1630;');
    // A name with markup in it is escaped, and an unknown placeholder fails the build.
    expect(brandIndexHtml('<title>%BRAND_NAME%</title>', withBrand({ name: 'A & B <C>' }))).toBe('<title>A &amp; B &lt;C></title>');
    expect(() => brandIndexHtml('%BRAND_NOPE%')).toThrow(/BRAND_NOPE/);
  });

  it("the stadium's own sign is the brand's title text", () => {
    const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'a');
    const away = kitFromColors(['#2e6fd8', '#ffffff'], 'b');
    const texts = panelsFor(home, away).map((p) => p.text);
    expect(texts).toContain('NRL SIM');
    expect(brandSign()).toBe(BRAND.titleText);
  });

  it('a title too long for a hoarding panel falls back to the short name', () => {
    const long = withBrand({ titleText: 'THE EXTREMELY LONG FOOTY MANAGER DELUXE EDITION', shortName: 'Footy' });
    expect(textWidth(long.titleText)).toBeGreaterThan(108);
    expect(brandSign(long)).toBe('FOOTY');
    // And a short name too long for it is cut to fit rather than run off the panel.
    const both = withBrand({ titleText: long.titleText, shortName: 'AbsolutelyEnormousShortNameThatWontFit' });
    expect(textWidth(brandSign(both))).toBeLessThanOrEqual(108);
    expect(signText(both, textWidth, 11)).toBe('ABS');
  });

  it("the newer-version save message names the brand", () => {
    const res = importSave(JSON.stringify({ ...createNewGame('F', 1), version: SAVE_VERSION + 1 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain(`newer version of ${BRAND.name} (save v${SAVE_VERSION + 1}`);
  });
});

describe('export file name and import', () => {
  it("leads the export file name with the brand's slug, as before", () => {
    const s = createNewGame('Cavehole Crushers', 1);
    expect(exportFilename(s)).toBe(`nrl-sim-cavehole-crushers-s${s.season}w${s.week}.json`);
    expect(exportFilename(s).startsWith(`${BRAND.exportSlug}-`)).toBe(true);
  });

  it('an old-style export file (old name, an older save version) still imports: import reads content', () => {
    // A save from an older version, shaped the old way, as a player has it on their phone.
    const res = importSave(OLD_SAVE);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.version).toBe(SAVE_VERSION);
    // Today's export round-trips too.
    const s = createNewGame('Crushers', 1);
    expect(importSave(exportSave(s)).ok).toBe(true);
  });

  it('the file picker hands back the text whatever the file is called', async () => {
    for (const name of ['nrl-sim-crushers-s1w3.json', 'renamed-game-crushers-s1w3.json', 'my save.txt']) {
      stubDocument();
      const picked = pickSaveFile();
      const input = created[0]!;
      expect(input.accept).toBe('application/json,.json');
      input.files = [{ name, text: async () => '{"hello":1}' }];
      input.change();
      expect(await picked).toBe('{"hello":1}');
    }
  });
});

/** SHA-256 of the RGBA pixels main's scripts/gen-icons.mjs drew (before #363). */
const MAIN_ICON_SHA = {
  192: 'eef08fbfdec71735d4fa6bf062923339cb94eabf879eaeef47de32b5792e1440',
  512: 'c13d4c9110283a6ea435389aaae7427ac33ce5d9f19eac109ff194daa50d5883',
} as const;

describe('icons', () => {
  it("are today's icons, pixel for pixel (main's renderer hashed these bytes)", async () => {
    expect(await sha256(renderIcon(192, BRAND))).toBe(MAIN_ICON_SHA[192]);
    expect(await sha256(renderIcon(512, BRAND))).toBe(MAIN_ICON_SHA[512]);
  });

  it("draw the brand's colours and letters", () => {
    const at = (px: Uint8Array, size: number, x: number, y: number): number[] => [...px.subarray((y * size + x) * 4, (y * size + x) * 4 + 3)];
    const plain = renderIcon(192, BRAND);
    expect(at(plain, 192, 0, 0)).toEqual([0x1a, 0x1a, 0x2e]); // field
    expect(at(plain, 192, 70, 96)).toEqual([0xe8, 0xe4, 0xd8]); // ball
    const lettered = renderIcon(192, withBrand({ iconLetters: 'FM', colors: { ...BRAND.colors, app: '#102030' } }));
    expect(at(lettered, 192, 0, 0)).toEqual([0x10, 0x20, 0x30]);
    expect(lettered).not.toEqual(plain);
  });
});
