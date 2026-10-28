// WCAG AA over the theme's tokens (#371): a theme change that drops a text/background
// pair under 4.5:1 fails here.
import { describe, expect, it } from 'vitest';
import { AA_TEXT, TEXT_PAIRS, contrastFailures, contrastRatio, parseColor } from '../../src/ui/contrast';
import { COLOR_TOKENS } from '../../src/ui/tokens';

describe('contrast', () => {
  it('measures as WCAG does', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
    // #767676 on white is the classic just-passing grey.
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(AA_TEXT);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(AA_TEXT);
  });

  it('reads hex and rgba, and judges a translucent background at its worst', () => {
    expect(parseColor('#0e1630')).toEqual([14, 22, 48, 1]);
    expect(parseColor('rgba(14, 22, 48, 0.97)')).toEqual([14, 22, 48, 0.97]);
    expect(contrastRatio('#ffffff', 'rgba(0, 0, 0, 0.5)')).toBeLessThan(contrastRatio('#ffffff', '#000000'));
  });

  it('every text/background pair the theme uses passes AA', () => {
    const fails = contrastFailures().map((f) => `${f.pair.where} (${f.pair.text} on ${f.pair.on}): ${f.ratio.toFixed(2)}:1`);
    expect(fails).toEqual([]);
  });

  it('catches a pair a theme change would break', () => {
    const dim = { ...COLOR_TOKENS, muted: '#4a5677' };
    const fails = contrastFailures(TEXT_PAIRS, dim);
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.every((f) => f.pair.text === 'muted')).toBe(true);
    expect(fails[0]!.ratio).toBeLessThanOrEqual(fails[fails.length - 1]!.ratio);
  });
});
