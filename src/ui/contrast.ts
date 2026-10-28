// src/ui/contrast.ts — the theme's text against its backgrounds, checked against
// WCAG AA (#371). Every text colour the Broadcast Quiet tokens put on a surface is
// listed here once; tests/ui/contrast.test.ts runs them all, so a later theme change
// that drops a pair under 4.5:1 fails CI rather than quietly going out. Pure: no DOM.
import { COLOR_TOKENS, type ColorToken } from './tokens';

/** WCAG 2 AA for body text. */
export const AA_TEXT = 4.5;

/** A text colour on a background, both theme tokens, and where the theme draws it. */
export interface TextPair {
  text: ColorToken;
  on: ColorToken;
  where: string;
}

/** The surfaces body text sits on: the dock and dialogs, the tiles and rows, buttons, sheets, your club's row. */
const SURFACES: readonly ColorToken[] = ['navy', 'panel', 'raised', 'button', 'sheet', 'me'];
/** The text colours used on them: words, secondary words, labels, the yellow, up and down. */
const INKS: readonly ColorToken[] = ['text', 'text2', 'muted', 'accent', 'pos', 'neg'];

/** Every text/background pair the theme uses. */
export const TEXT_PAIRS: readonly TextPair[] = [
  ...INKS.flatMap((text) => SURFACES.map((on) => ({ text, on, where: `${text} words on ${on}` }))),
  { text: 'onAccent', on: 'accent', where: 'the yellow primary button, the selected chip, the clock box' },
  { text: 'onAccent', on: 'neg', where: 'an armed Sell or Release' },
  { text: 'text', on: 'win', where: 'the WIN BY tag and a W in the form guide' },
  { text: 'text', on: 'out', where: 'the DEBT badge and an L in the form guide' },
  { text: 'text', on: 'injured', where: 'an injured tile' },
];

type Rgba = [number, number, number, number];

/** '#rrggbb' or 'rgba(r, g, b, a)' as 0–255 channels and alpha. */
export function parseColor(c: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 1];
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(c.trim());
  if (fn) {
    const [r = 0, g = 0, b = 0, a = 1] = fn[1]!.split(',').map((v) => Number(v.trim()));
    return [r, g, b, a];
  }
  throw new Error(`not a colour: ${c}`);
}

/** `top` laid over the opaque `under` (a translucent sheet over what is behind it). */
function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgba): number {
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * The contrast ratio (1–21) of `text` on `background`. A translucent background is
 * judged at its worst: over white and over black, whichever reads less well
 * (a sheet over the bright grass or the dark pitch).
 */
export function contrastRatio(text: string, background: string): number {
  const bg = parseColor(background);
  const backs = bg[3] >= 1 ? [bg] : [over(bg, [255, 255, 255, 1]), over(bg, [0, 0, 0, 1])];
  return Math.min(...backs.map((b) => {
    const fg = over(parseColor(text), b);
    const x = luminance(fg);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }));
}

/** The pairs under `min` with these colours, worst first: "muted words on me 4.2:1". */
export function contrastFailures(
  pairs: readonly TextPair[] = TEXT_PAIRS,
  colors: Readonly<Record<ColorToken, string>> = COLOR_TOKENS,
  min = AA_TEXT,
): { pair: TextPair; ratio: number }[] {
  return pairs
    .map((pair) => ({ pair, ratio: contrastRatio(colors[pair.text], colors[pair.on]) }))
    .filter((r) => r.ratio < min)
    .sort((a, b) => a.ratio - b.ratio);
}
