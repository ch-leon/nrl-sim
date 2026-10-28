// tests/qa/phaserSlim.test.ts — the build's Phaser (src/vendor/phaser-slim.js, #400)
// carries every game object the game makes. The dev server and vitest run the full
// package, so a scene calling add.container() (left out of the slim entry) would
// type-check and work in dev, then fail only in the production build. This reads
// the source for every factory call and checks the slim entry registers it.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', 'src');
const SLIM = readFileSync(join(SRC, 'vendor', 'phaser-slim.js'), 'utf8');

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tsFiles(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

/** Every `X.add.<name>(` / `X.make.<name>(` in the game, across line breaks. */
function factoryCalls(): Set<string> {
  const out = new Set<string>();
  for (const f of tsFiles(SRC)) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\.(?:add|make)\s*\.\s*([a-z][A-Za-z]*)\s*\(/g)) out.add(m[1]!);
  }
  return out;
}

/** The factory names the slim entry registers (`Factories: { Blitter: …, … }`). */
function slimFactories(): Set<string> {
  const block = /Factories:\s*\{([^}]*)\}/.exec(SLIM)?.[1] ?? '';
  return new Set([...block.matchAll(/(\w+):/g)].map((m) => m[1]!.charAt(0).toLowerCase() + m[1]!.slice(1)));
}

describe('the slim Phaser (#400)', () => {
  it('registers a factory for every add.*() and make.*() the game calls', () => {
    const calls = factoryCalls();
    expect(calls.size).toBeGreaterThan(3);
    // `particles` is ParticleEmitterFactory's add.particles().
    const have = slimFactories();
    for (const c of calls) expect(have.has(c), `add.${c}() is not in src/vendor/phaser-slim.js`).toBe(true);
  });

  it('keeps both renderers (Phaser.AUTO) and leaves out the 3D camera and Facebook plugins', () => {
    const config = readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/CANVAS_RENDERER: true/);
    expect(config).toMatch(/WEBGL_RENDERER: true/);
    expect(config).toMatch(/PLUGIN_CAMERA3D: false/);
    expect(config).toMatch(/PLUGIN_FBINSTANT: false/);
  });
});
