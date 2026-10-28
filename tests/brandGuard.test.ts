import { describe, it, expect } from 'vitest';

// #363's guard: the game's name lives in src/brand.ts only. A player-visible
// "NRL Sim" / "NRL SIM" (or "NRLSim") anywhere else in src/**/*.ts, index.html or
// vite.config.ts fails CI. Comments are fine, and so are the lower-case nrl- CSS
// classes and nrl-sim- storage keys (the pattern is case-sensitive). docs/ and
// tests are not scanned.

// The files as text through Vite's ?raw glob (the tsconfig has no Node types).
const raw = (files: Record<string, unknown>): [string, string][] =>
  Object.entries(files).map(([p, text]) => [p.replace(/^\.\.\//, ''), text as string]);
const SOURCES: [string, string][] = [
  ...raw(import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true })),
  ...raw(import.meta.glob(['../index.html', '../vite.config.ts'], { query: '?raw', import: 'default', eager: true })),
];
const NAME = /NRL ?Sim|NRL ?SIM/;

/** The source with its comments blanked: block comments, `//` line comments (not `://` in URLs) and HTML comments. */
function stripComments(src: string): string {
  return src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/** Each line (1-based) where the brand's name turns up outside a comment. */
function strayNames(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  stripComments(src).split('\n').forEach((text, i) => {
    if (NAME.test(text)) out.push({ line: i + 1, text: text.trim() });
  });
  return out;
}

describe('the brand guard', () => {
  it('finds no "NRL Sim" in player-visible strings outside src/brand.ts', () => {
    const files = SOURCES.filter(([p]) => p !== 'src/brand.ts');
    expect(files.length).toBeGreaterThan(100);
    expect(files.map(([p]) => p)).toEqual(expect.arrayContaining(['index.html', 'vite.config.ts', 'src/ui/title.ts']));
    const hits = files.flatMap(([p, text]) => strayNames(text).map((h) => `${p}:${h.line}: ${h.text}`));
    expect(hits, 'read the name from BRAND (src/brand.ts) instead').toEqual([]);
  });

  it('src/brand.ts is where the name is', () => {
    const brand = SOURCES.find(([p]) => p === 'src/brand.ts');
    expect(brand).toBeDefined();
    expect(strayNames(brand![1]).length).toBeGreaterThan(0);
  });

  it('catches a stray name in a string, a template, markup or a manifest', () => {
    expect(strayNames("const t = 'Welcome to NRL Sim';")).toHaveLength(1);
    expect(strayNames('el.textContent = `${n} — NRL SIM`;')).toHaveLength(1);
    expect(strayNames('<title>NRL Sim</title>')).toHaveLength(1);
    expect(strayNames("  short_name: 'NRLSim',")).toHaveLength(1);
    expect(strayNames("a\nb\nfoo('NRL Sim')")).toEqual([{ line: 3, text: "foo('NRL Sim')" }]);
  });

  it('lets comments, CSS classes, storage keys and URLs through', () => {
    expect(strayNames('// NRL Sim plays in landscape')).toEqual([]);
    expect(strayNames('/* NRL Sim\n NRL SIM */ const x = 1;')).toEqual([]);
    expect(strayNames('<!-- NRL Sim -->')).toEqual([]);
    expect(strayNames("const k = 'nrl-sim-save-slot-'; const h = 'nrlsim.iosInstallHintShown';")).toEqual([]);
    expect(strayNames("mk('div', 'nrl-title-name')")).toEqual([]);
    // A `//` inside a URL is not a comment: the name after it is still caught.
    expect(strayNames("const u = 'https://example.com/NRL Sim';")).toHaveLength(1);
  });
});
