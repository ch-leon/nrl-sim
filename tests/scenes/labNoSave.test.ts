// The match lab (/#lab) plays with no save loaded (#385's check): every frame of the
// match scene it extends must update without one. Phaser does not run under node, so
// this checks the per-frame read the lab hit (Team letters, #371) with a real missing
// save, and that the scene's per-frame update reads no setting unguarded.
import { describe, expect, it } from 'vitest';
import { getState } from '../../src/core/state';
import { teamLettersOn } from '../../src/ui/teamTag';

describe('the match lab with no save', () => {
  it('has no save in this file (a fresh module, as the lab boots)', () => {
    expect(() => getState()).toThrow();
  });

  it('reads Team letters as off instead of throwing', () => {
    expect(teamLettersOn(() => getState().settings)).toBe(false);
  });

  it('reads Team letters from a save: on only when switched on', () => {
    expect(teamLettersOn(() => ({ teamLetters: true }))).toBe(true);
    expect(teamLettersOn(() => ({ teamLetters: false }))).toBe(false);
    expect(teamLettersOn(() => ({}))).toBe(false);
  });

  it('MatchScene updates every frame without a bare getState()', () => {
    // The source as text through Vite's ?raw glob (the tsconfig has no Node types).
    const src = Object.values(import.meta.glob('../../src/scenes/MatchScene.ts', { query: '?raw', import: 'default', eager: true }))[0] as string;
    const start = src.indexOf('  private updateReadability(');
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, src.indexOf('\n  }\n', start));
    // The one read it makes goes through the guard; nothing else reaches for the save.
    expect(body).toContain('teamLettersOn(() => getState().settings)');
    expect(body.replace('teamLettersOn(() => getState().settings)', '')).not.toContain('getState(');
  });
});
