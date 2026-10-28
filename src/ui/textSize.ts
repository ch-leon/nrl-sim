// src/ui/textSize.ts — the Settings popup's Text size (#371). The DOM UI's font sizes
// are rem (1rem = 16px at Normal), and index.html sets the root's font-size from
// --nrl-text-scale, so one property on <html> scales every screen, the dock, the
// toasts, the tutorial bubble and the match overlay. Phaser-drawn text (the pop-ups
// over players, the grounds' signs) keeps its size. The setting is per save and
// optional: absent (every save from before it) reads as Normal, scale 1.
import type { TextSize } from '../core/state';

/** The three sizes, smallest first: the Settings popup's segments. */
export const TEXT_SIZES: readonly { id: TextSize; label: string; scale: number }[] = [
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.15 },
  { id: 'larger', label: 'Larger', scale: 1.3 },
];

/** The custom property on <html> the root font-size reads (index.html). */
export const TEXT_SCALE_VAR = '--nrl-text-scale';
/** The attribute on <html> naming the size, for the few rules a size needs (`[data-text-size="larger"]`). */
export const TEXT_SIZE_ATTR = 'data-text-size';

/** A saved size as one of the three: anything else (absent, an unknown string) is Normal. */
export function textSizeOf(raw: unknown): TextSize {
  return TEXT_SIZES.some((t) => t.id === raw) ? (raw as TextSize) : 'normal';
}

/** The root scale for a saved size: 1, 1.15 or 1.3. */
export function textScale(raw: unknown): number {
  const id = textSizeOf(raw);
  return TEXT_SIZES.find((t) => t.id === id)!.scale;
}

/** What applyTextSize touches on <html> (a stand-in in the tests). */
export interface TextSizeRoot {
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Put the save's text size on the root: the scale property and the attribute, or
 * neither at Normal, which leaves the page as it was before the setting. Returns the scale.
 */
export function applyTextSize(raw: unknown, root: TextSizeRoot | null = typeof document === 'undefined' ? null : document.documentElement): number {
  const id = textSizeOf(raw);
  const scale = textScale(id);
  if (!root) return scale;
  if (id === 'normal') {
    root.style.removeProperty(TEXT_SCALE_VAR);
    root.removeAttribute(TEXT_SIZE_ATTR);
  } else {
    root.style.setProperty(TEXT_SCALE_VAR, String(scale));
    root.setAttribute(TEXT_SIZE_ATTR, id);
  }
  return scale;
}

/**
 * Keep the root on the save's size: on load and on every state change after (the
 * Settings popup, an import). Re-applies only when the size moves. main.ts wires it.
 */
export function textSizeSync(root?: TextSizeRoot | null): (settings: { textSize?: unknown }) => void {
  let shown: TextSize | null = null;
  return (settings) => {
    const id = textSizeOf(settings.textSize);
    if (id === shown) return;
    shown = id;
    if (root === undefined) applyTextSize(id);
    else applyTextSize(id, root);
  };
}
