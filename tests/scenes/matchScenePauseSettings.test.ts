// The pause sheet's Settings (#421): closing the dialog went straight back to the
// match, the clock running, though only the sheet's Resume should play on. Phaser
// does not run under node, so this reads the scene's source, as matchSceneReset.test.ts
// does; e2e-webkit's runPauseSettings reads the clock across ❚❚ → Settings → ✕.
import { describe, expect, it } from 'vitest';

const src = Object.values(import.meta.glob('../../src/scenes/MatchScene.ts', { query: '?raw', import: 'default', eager: true }))[0] as string;

/** A method's body, from its signature to the closing brace at its indent. */
function body(signature: string): string {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(0);
  return src.slice(start, src.indexOf('\n  }\n', start));
}

describe('Settings from the pause sheet (#421)', () => {
  const settings = body('  private openSettings(open: () => void): void {');

  it('closing it goes back to the pause sheet, not to the match', () => {
    const back = settings.slice(settings.indexOf('const back = ('), settings.indexOf('};', settings.indexOf('const back = (')));
    expect(back).toContain('this.openPauseSheet();');
    // The sheet holds the match before Settings lets go of it: the hold never drops to none.
    expect(back.indexOf('this.openPauseSheet();')).toBeLessThan(back.indexOf('pb.release();'));
  });

  it('every way out of it goes back to the sheet (the dialog closing, or never opening)', () => {
    expect(settings.match(/back\(\);/g)).toHaveLength(2);
    expect(settings.replace(/const back = [\s\S]*?\};/, '')).not.toContain('pb.release()');
  });

  it('the sheet\'s Settings is the only way in, and its own Resume plays on', () => {
    const pause = body('  private openPauseSheet(): void {');
    expect(pause).toContain("onTap: () => this.openSettings(settings)");
    expect(pause).toMatch(/label: 'Resume', onTap: \(\) => \{\}/);
  });
});
