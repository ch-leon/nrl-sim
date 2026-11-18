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
import config from '../capacitor.config';
import { PWA_MANIFEST, brandIndexHtml } from '../src/brandBuild';

// #363: the game's name, short name, colours and logo live in src/brand.ts, and every
// place a player sees them reads from there. Today's values are SuperCOOKED's Big Coach
// (docs/specs/ui-supercooked.md §2); tests/brandRename.test.ts renames it and watches
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

describe('BRAND today (Big Coach, SuperCOOKED §2)', () => {
  it("keeps the game's current name, short name and title text", () => {
    expect(BRAND.name).toBe('Big Coach');
    expect(BRAND.shortName).toBe('BigCoach');
    expect(BRAND.titleText).toBe('BIG COACH');
    expect(BRAND.parentBrand).toEqual({ name: 'SuperCOOKED', show: true });
    expect(BRAND.logo).toEqual({ kind: 'text' });
    expect(BRAND.exportSlug).toBe('big-coach');
    expect(BRAND.supportUrl).toBeUndefined();
  });

  it("points its colours at the theme's tokens instead of copying them", () => {
    expect(BRAND.colors.background).toBe(COLOR_TOKENS.ink); // no navy flash on a cold start
    expect(BRAND.colors.primary).toBe(COLOR_TOKENS.accent);
    expect(BRAND.colors.onPrimary).toBe(COLOR_TOKENS.onAccent);
    expect(BRAND.colors.text).toBe(COLOR_TOKENS.text);
    // Only what the theme has no token for is the brand's own: the ball's colour. The
    // installed app's colour is ink, the title's and the loading screen's (#622, SuperCOOKED §2).
    expect(BRAND.colors.app).toBe(COLOR_TOKENS.ink);
    expect(BRAND.colors.app).toBe('#05070d');
    expect(BRAND.colors.iconBall).toBe('#e8e4d8');
  });

  it("the UI stylesheet's tokens are SuperCOOKED's values (§2)", () => {
    expect(CSS).toContain('--nrl-ink: #05070d;');
    expect(CSS).toContain('--nrl-navy: #0b1220;');
    expect(CSS).toContain('--nrl-accent: #ff6b1a;');
    expect(CSS).toContain('--nrl-on-accent: #0b1220;');
    expect(CSS).toContain('--nrl-sheet: rgba(11, 18, 32, 0.98);');
    expect(CSS).toContain('--nrl-text-2: #c8cdd8;');
    expect(CSS).toContain('--nrl-fit-bad: #ff3b1f;');
    expect(CSS).not.toContain('${');
    expect(CSS).not.toContain('undefined');
  });
});

describe('each consumer reads BRAND', () => {
  it("the title heading is the brand's title text, as the wordmark (its last word in the accent)", () => {
    stubDocument();
    const text = (e: StubEl): string => e.children.map((c) => c.textContent).join('');
    const [h1] = titleHeading() as unknown as StubEl[];
    expect(h1!.tagName).toBe('h1');
    expect(h1!.attrs.class).toBe('nrl-title-name');
    expect(h1!.attrs['aria-label']).toBe('BIG COACH');
    expect(text(h1!)).toBe('BIG COACH');
    expect(h1!.children.map((c) => [c.attrs.class, c.textContent])).toEqual([['nrl-wordmark-lead', 'BIG '], ['nrl-wordmark-accent', 'COACH']]);
    const [other] = titleHeading(withBrand({ titleText: 'OTHER GAME' })) as unknown as StubEl[];
    expect(text(other!)).toBe('OTHER GAME');
    expect(other!.attrs['aria-label']).toBe('OTHER GAME');
  });

  it('parentBrand.show toggles the "a SuperCOOKED game" line, COOKED in the accent', () => {
    stubDocument();
    const shown = titleHeading() as unknown as StubEl[];
    expect(shown).toHaveLength(2);
    expect(shown[1]!.children.map((c) => c.textContent).join('')).toBe('a SuperCOOKED game');
    expect(shown[1]!.children.find((c) => c.attrs.class === 'nrl-wordmark-accent')?.textContent).toBe('COOKED');
    expect(shown[1]!.attrs['data-nrl-parent-brand']).toBe('');
    expect(titleHeading(withBrand({ parentBrand: { name: 'SuperCOOKED', show: false } }))).toHaveLength(1);
  });

  it('an image logo draws an <img> from public/ in the heading, named for screen readers', () => {
    stubDocument();
    const [h1] = titleHeading(withBrand({ logo: { kind: 'image', src: 'brand/logo.png' } })) as unknown as StubEl[];
    expect(h1!.textContent).toBe('');
    const img = h1!.children[0]!;
    expect(img.tagName).toBe('img');
    expect(img.attrs.src).toBe('/brand/logo.png');
    expect(img.attrs.alt).toBe('Big Coach');
  });

  it("the rotate message names the game, with the brand's name", () => {
    expect(rotateText()).toBe('In Big Coach, the game plays in landscape. Turn your phone sideways to carry on.');
    expect(rotateText(withBrand({ name: 'Other Game' }))).toMatch(/^In Other Game, the game plays in landscape\./);
  });

  it('the manifest (the config object vite-plugin-pwa is given) carries the brand', () => {
    expect(PWA_MANIFEST.name).toBe(BRAND.name);
    expect(PWA_MANIFEST.short_name).toBe(BRAND.shortName);
    expect(PWA_MANIFEST.theme_color).toBe(BRAND.colors.app);
    expect(PWA_MANIFEST.background_color).toBe(BRAND.colors.app);
    expect(PWA_MANIFEST.orientation).toBe('landscape');
    // Today's values, as main shipped them.
    expect([PWA_MANIFEST.name, PWA_MANIFEST.short_name, PWA_MANIFEST.theme_color]).toEqual(['Big Coach', 'BigCoach', '#05070d']);
  });

  it("the Android WebView's background is the app's colour (#622)", () => {
    expect(config.backgroundColor).toBe(BRAND.colors.app);
  });

  it('index.html has placeholders, and the build fills in the brand', () => {
    const raw = INDEX_HTML;
    expect(raw).not.toMatch(/NRL ?Sim|Big ?Coach/i);
    const html = brandIndexHtml(raw);
    expect(html).not.toContain('%BRAND_');
    expect(html).toContain('<title>Big Coach</title>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Big Coach" />');
    expect(html).toContain('<meta name="theme-color" content="#05070d" />');
    expect(html).toContain('background: #05070d;');
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    // A name with markup in it is escaped, and an unknown placeholder fails the build.
    expect(brandIndexHtml('<title>%BRAND_NAME%</title>', withBrand({ name: 'A & B <C>' }))).toBe('<title>A &amp; B &lt;C></title>');
    expect(() => brandIndexHtml('%BRAND_NOPE%')).toThrow(/BRAND_NOPE/);
  });

  it("the stadium's own sign is the brand's title text", () => {
    const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'a');
    const away = kitFromColors(['#2e6fd8', '#ffffff'], 'b');
    const texts = panelsFor(home, away).map((p) => p.text);
    expect(texts).toContain('BIG COACH');
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
  it("leads the export file name with the brand's slug", () => {
    const s = createNewGame('Cavehole Crushers', 1);
    expect(exportFilename(s)).toBe(`big-coach-cavehole-crushers-s${s.season}w${s.week}.json`);
    expect(exportFilename(s).startsWith(`${BRAND.exportSlug}-`)).toBe(true);
  });

  it('an older save requires a new career; current exports still round-trip', () => {
    // A save from an older version, shaped the old way, as a player has it on their phone.
    const res = importSave(OLD_SAVE);
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
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

/**
 * SHA-256 of the RGBA pixels scripts/gen-icons.mjs draws. Until #622 these were the
 * pre-#363 bytes on the old navy-black field (eef08fbf…, c13d4c91…); then the page's
 * navy (9775c3f3…, 12b94087…). The ball and its shape are unchanged; SuperCOOKED (§2)
 * moved only the field colour, to ink.
 */
const MAIN_ICON_SHA = {
  192: 'b19c4b640d2ef79d7124fb6cf28a6ccd52a3466a4ffd1a0fb88ea19e346a646f',
  512: '48022b62a351e42fe5cb11155522589aa5592281e4dc7a15cd247f09722d65e5',
} as const;

describe('icons', () => {
  it("are today's icons, pixel for pixel", async () => {
    expect(await sha256(renderIcon(192, BRAND))).toBe(MAIN_ICON_SHA[192]);
    expect(await sha256(renderIcon(512, BRAND))).toBe(MAIN_ICON_SHA[512]);
  });

  it("draw the brand's colours and letters", () => {
    const at = (px: Uint8Array, size: number, x: number, y: number): number[] => [...px.subarray((y * size + x) * 4, (y * size + x) * 4 + 3)];
    const plain = renderIcon(192, BRAND);
    expect(at(plain, 192, 0, 0)).toEqual([0x05, 0x07, 0x0d]); // field (ink)
    expect(at(plain, 192, 70, 96)).toEqual([0xe8, 0xe4, 0xd8]); // ball
    const lettered = renderIcon(192, withBrand({ iconLetters: 'FM', colors: { ...BRAND.colors, app: '#102030' } }));
    expect(at(lettered, 192, 0, 0)).toEqual([0x10, 0x20, 0x30]);
    expect(lettered).not.toEqual(plain);
  });
});
