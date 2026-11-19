// tests/native/iosBrandColors.test.ts — the widget extension's colours are the tokens'
// (docs/specs/ios.md §2). ios/App/BigCoachWidgets/BrandColors.swift is generated from
// src/ui/tokens.ts; this fails while it is out of date. Fix: `npx vite-node scripts/gen-ios-colors.mjs`.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { IOS_COLORS_PATH, rgbaOf, swiftBrandColors } from '../../scripts/ios-colors.mjs';
import { COLOR_TOKENS } from '../../src/ui/tokens';

describe('iOS brand colours', () => {
  it('BrandColors.swift is up to date with src/ui/tokens.ts (run npx vite-node scripts/gen-ios-colors.mjs)', () => {
    expect(readFileSync(IOS_COLORS_PATH, 'utf8')).toBe(swiftBrandColors());
  });

  it('writes every token, the lock screen\'s ink and the accent among them', () => {
    const src = swiftBrandColors();
    for (const name of Object.keys(COLOR_TOKENS)) expect(src).toContain(`static let ${name} = Color(`);
    expect(src).toContain('/// #05070d\n    static let ink = Color(.sRGB, red: 0.0196, green: 0.0275, blue: 0.051, opacity: 1)');
    expect(src).toContain('/// #ff6b1a\n    static let accent = Color(.sRGB, red: 1, green: 0.4196, blue: 0.102, opacity: 1)');
  });

  it('reads hex and rgba token values, and refuses anything else', () => {
    expect(rgbaOf('#ff6b1a')).toEqual([255, 107, 26, 1]);
    expect(rgbaOf('rgba(11, 18, 32, 0.98)')).toEqual([11, 18, 32, 0.98]);
    expect(() => rgbaOf('orange')).toThrow();
  });
});
