// Phaser keeps one MatchScene between matches and runs init() for each: a field set
// during one match lives on into the next unless init() puts it back. The half-time
// sheet's "already shown for this half" did, so after a session's first match no
// half-time card came up (#408). Phaser does not run under node, so
// this reads the scene's source, as labNoSave.test.ts does; e2e-webkit's runPlaytest
// plays the two matches.
import { describe, expect, it } from 'vitest';

const src = Object.values(import.meta.glob('../../src/scenes/MatchScene.ts', { query: '?raw', import: 'default', eager: true }))[0] as string;

/** A method's body, from its signature to the closing brace at its indent. */
function body(signature: string): string {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(0);
  return src.slice(start, src.indexOf('\n  }\n', start));
}

describe('MatchScene between matches', () => {
  it('init() resets the half-time sheet\'s half, so each match gets its card', () => {
    expect(src).toContain('private planCardHalf = 0;');
    expect(body('  init(data: MatchSceneData): void {')).toMatch(/this\.planCardHalf = 0;/);
  });

  it('the half-time card is gated on that half', () => {
    expect(body('  private refreshPlan(): void {')).toContain('this.planCardHalf !== pb.half');
  });
});
