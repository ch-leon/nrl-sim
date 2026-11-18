// tests/native/iosIsolation.test.ts — the website and Android bundles carry none of the
// iPhone code (docs/specs/ios.md §2). The only way into src/native is main.ts's dynamic
// import of ./native/ios behind `__NRL_PLATFORM__ === 'ios'`, which the build folds away;
// @capacitor/core is imported only by the plugin files, and nothing in src/native is
// imported from anywhere else. (The built chunks are compared in the PR.)
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.ts$/.test(name) ? [path] : [];
  });
}

/** Every module specifier a file imports (static, dynamic, or re-exported). */
function specifiers(src: string): string[] {
  return [...src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]!);
}

const SRC = files('src');
const outside = SRC.filter((f) => !f.startsWith(join('src', 'native')));

describe('iPhone code stays out of the website and Android', () => {
  it('nothing outside src/native imports it, except main.ts behind the ios flag', () => {
    const hits = outside.flatMap((f) => specifiers(readFileSync(f, 'utf8')).filter((s) => /(^|\/)native(\/|$)/.test(s)).map((s) => `${f}: ${s}`));
    expect(hits).toEqual([join('src', 'main.ts') + ': ./native/ios']);
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(/__NRL_PLATFORM__ === 'ios'\) \{\s*import\('\.\/native\/ios'\)/);
    expect(main).not.toMatch(/^import [^\n]*native\//m);
  });

  it('@capacitor/core is imported only by the two plugin files', () => {
    const users = SRC.filter((f) => specifiers(readFileSync(f, 'utf8')).some((s) => s.startsWith('@capacitor/')));
    expect(users.sort()).toEqual([join('src', 'native', 'clubWidgetsPlugin.ts'), join('src', 'native', 'liveMatchPlugin.ts')]);
  });

  it('the club widget modules are reached only through src/native/ios.ts', () => {
    const native = SRC.filter((f) => f.startsWith(join('src', 'native')));
    const importers = (mod: string) => native.filter((f) => specifiers(readFileSync(f, 'utf8')).includes(`./${mod}`)).map((f) => f.split('/').pop());
    expect(importers('clubWidgetsPlugin')).toEqual(['ios.ts']);
    expect(importers('clubWidgets').sort()).toEqual(['clubWidgetsPlugin.ts', 'ios.ts']);
    expect(importers('clubSnapshot')).toEqual(['clubWidgets.ts']);
  });
});
