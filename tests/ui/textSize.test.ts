// Settings › Text size (#371): the save's size as a root scale on <html>.
import { describe, expect, it } from 'vitest';
import { TEXT_SCALE_VAR, TEXT_SIZES, TEXT_SIZE_ATTR, applyTextSize, textScale, textSizeOf, textSizeSync, type TextSizeRoot } from '../../src/ui/textSize';
import { CSS } from '../../src/ui/dom';
import { createNewGame } from '../../src/core/state';

/** A stand-in <html>: its custom properties and attributes. */
function fakeRoot(): TextSizeRoot & { props: Map<string, string>; attrs: Map<string, string>; writes: number } {
  const props = new Map<string, string>();
  const attrs = new Map<string, string>();
  const root = {
    props,
    attrs,
    writes: 0,
    style: {
      setProperty: (k: string, v: string | null) => { root.writes++; props.set(k, String(v)); },
      removeProperty: (k: string) => { root.writes++; props.delete(k); return ''; },
    },
    setAttribute: (k: string, v: string) => { attrs.set(k, v); },
    removeAttribute: (k: string) => { attrs.delete(k); },
  };
  return root;
}

describe('text size', () => {
  it('maps Normal, Large and Larger to 1, 1.15 and 1.3', () => {
    expect(TEXT_SIZES.map((t) => [t.id, t.scale])).toEqual([['normal', 1], ['large', 1.15], ['larger', 1.3]]);
    expect(textScale('normal')).toBe(1);
    expect(textScale('large')).toBe(1.15);
    expect(textScale('larger')).toBe(1.3);
  });

  it('absent (an old save) or anything unknown is Normal, scale 1', () => {
    expect(textSizeOf(undefined)).toBe('normal');
    expect(textScale(undefined)).toBe(1);
    expect(textScale('huge')).toBe(1);
    expect(textScale(2)).toBe(1);
    // A new game sets nothing: it reads as Normal, as every save from before the setting does.
    expect(createNewGame('Text Size FC').settings.textSize).toBeUndefined();
  });

  it('puts the scale on the root, and takes it off again at Normal', () => {
    const root = fakeRoot();
    expect(applyTextSize('larger', root)).toBe(1.3);
    expect(root.props.get(TEXT_SCALE_VAR)).toBe('1.3');
    expect(root.attrs.get(TEXT_SIZE_ATTR)).toBe('larger');
    expect(applyTextSize(undefined, root)).toBe(1);
    expect(root.props.has(TEXT_SCALE_VAR)).toBe(false);
    expect(root.attrs.has(TEXT_SIZE_ATTR)).toBe(false);
  });

  it('is applied on load and follows the setting after, writing only when it moves', () => {
    const root = fakeRoot();
    const sync = textSizeSync(root);
    sync({ textSize: 'large' }); // the save as it loads
    expect(root.props.get(TEXT_SCALE_VAR)).toBe('1.15');
    const writes = root.writes;
    sync({ textSize: 'large' }); // any other state change
    expect(root.writes).toBe(writes);
    sync({}); // back to Normal
    expect(root.props.has(TEXT_SCALE_VAR)).toBe(false);
  });

  it('the stylesheet sizes text in rem, so the root scale reaches every font size', () => {
    expect(CSS).not.toMatch(/font-size:\s*[\d.]+px/);
  });
});
