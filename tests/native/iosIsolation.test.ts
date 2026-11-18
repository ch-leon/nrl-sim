// tests/native/iosIsolation.test.ts — the website and Android bundles carry none of the
// iPhone code (docs/specs/ios.md §2). The only way into src/native is main.ts's dynamic
// import of ./native/ios behind `__NRL_PLATFORM__ === 'ios'`, which the build folds away;
// @capacitor/core is imported only by the plugin files, and nothing in src/native is
// imported from anywhere else. (The built chunks are compared in the PR.)
//
// The durable-saves work (#732) adds a second, separate route: src/core/storage/native.ts
// (not src/native) is imported statically by main.ts and save.ts, and it reaches
// src/core/storage/capacitorFiles.ts (which imports @capacitor/filesystem and /share) only
// by a dynamic import written `IOS_CODE ? import('./capacitorFiles') : …`, so the build
// folds it away off iOS. The allowlists below name those modules, and the last test pins
// the route: no static import of capacitorFiles, no unguarded dynamic one. They are
// harmless while #732 is not on the branch: each rule only bites when the file exists.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

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

/** The import statements that load a module up front (not `import(...)`), as specifiers. */
function staticSpecifiers(src: string): string[] {
  return [...src.matchAll(/^\s*(?:import|export)\b[^'"\n;]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm)].map((m) => (m[1] ?? m[2])!);
}

const SRC = files('src');
const NATIVE_DIR = join('src', 'native');
const STORAGE_NATIVE = join('src', 'core', 'storage', 'native.ts');
const CAPACITOR_FILES = join('src', 'core', 'storage', 'capacitorFiles.ts');
/** True when `spec`, imported from `from`, lands in the iPhone tree src/native. */
const reachesNativeTree = (from: string, spec: string) => {
  if (!spec.startsWith('.')) return false;
  const target = normalize(join(dirname(from), spec));
  return target === NATIVE_DIR || target.startsWith(NATIVE_DIR + '/');
};
const outside = SRC.filter((f) => !f.startsWith(join('src', 'native')));

describe('iPhone code stays out of the website and Android', () => {
  it('nothing outside src/native imports it, except main.ts behind the ios flag', () => {
    // Resolved, so ./storage/native (#732's save module, src/core/storage/native.ts) is not
    // mistaken for the iPhone tree; only paths that land in src/native count.
    const hits = outside.flatMap((f) => specifiers(readFileSync(f, 'utf8')).filter((s) => reachesNativeTree(f, s)).map((s) => `${f}: ${s}`));
    expect(hits).toEqual([join('src', 'main.ts') + ': ./native/ios']);
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(/__NRL_PLATFORM__ === 'ios'\) \{\s*import\('\.\/native\/ios'\)/);
    expect(main).not.toMatch(/^import [^\n]*native\//m);
  });

  it('@capacitor/* is imported only by the two plugin files (and #732\'s capacitorFiles.ts once it exists)', () => {
    const users = SRC.filter((f) => specifiers(readFileSync(f, 'utf8')).some((s) => s.startsWith('@capacitor/')));
    const expected = [join('src', 'native', 'clubWidgetsPlugin.ts'), join('src', 'native', 'liveMatchPlugin.ts'), ...(existsSync(CAPACITOR_FILES) ? [CAPACITOR_FILES] : [])];
    expect(users.sort()).toEqual(expected.sort());
  });

  it('the save-file Capacitor code is reached only by a dynamic import behind IOS_CODE', () => {
    if (!existsSync(CAPACITOR_FILES)) return; // #732 not on this branch yet
    const importers = SRC.filter((f) => specifiers(readFileSync(f, 'utf8')).some((s) => s === './capacitorFiles' || s.endsWith('/capacitorFiles')));
    expect(importers).toEqual([STORAGE_NATIVE]);
    const native = readFileSync(STORAGE_NATIVE, 'utf8');
    expect(staticSpecifiers(native).filter((s) => /capacitorFiles|^@capacitor\//.test(s))).toEqual([]);
    const dynamic = native.split('\n').filter((l) => /import\(\s*['"]\.\/capacitorFiles['"]/.test(l));
    expect(dynamic.length).toBeGreaterThan(0);
    for (const line of dynamic) expect(line).toMatch(/IOS_CODE\s*\?/);
    // and only the save layer and the entry point load native.ts, statically, as a module with no plugin imports of its own
    const loaders = SRC.filter((f) => specifiers(readFileSync(f, 'utf8')).some((s) => normalize(join(dirname(f), s)) + '.ts' === STORAGE_NATIVE));
    expect(loaders.sort()).toEqual([join('src', 'core', 'save.ts'), join('src', 'main.ts')].sort());
  });

  it('the club widget modules are reached only through src/native/ios.ts', () => {
    const native = SRC.filter((f) => f.startsWith(join('src', 'native')));
    const importers = (mod: string) => native.filter((f) => specifiers(readFileSync(f, 'utf8')).includes(`./${mod}`)).map((f) => f.split('/').pop());
    expect(importers('clubWidgetsPlugin')).toEqual(['ios.ts']);
    expect(importers('clubWidgets').sort()).toEqual(['clubWidgetsPlugin.ts', 'ios.ts']);
    expect(importers('clubSnapshot')).toEqual(['clubWidgets.ts']);
  });
});
