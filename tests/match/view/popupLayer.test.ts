// tests/match/view/popupLayer.test.ts — the pooled pop-ups: when the pool runs out the
// oldest shout is recycled, and its trait line must go with it (#647).
import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { PopupLayer } from '../../../src/match/view/popupLayer';
import type { Popup } from '../../../src/match/view/popups';

/** Just enough of a Phaser Text for the layer. */
class FakeText {
  visible = false;
  x = 0;
  y = 0;
  height = 20;
  lines: string[] = [];
  setOrigin() { return this; }
  setDepth() { return this; }
  setVisible(v: boolean) { this.visible = v; return this; }
  setText(t: string | string[]) { this.lines = Array.isArray(t) ? t : [t]; return this; }
  setFontSize() { return this; }
  setColor() { return this; }
  setAlpha() { return this; }
  setScale() { return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  destroy() {}
}

function makeLayer(): { layer: PopupLayer; texts: FakeText[] } {
  const texts: FakeText[] = [];
  const scene = { add: { text: () => { const t = new FakeText(); texts.push(t); return t; } } };
  return { layer: new PopupLayer(scene as never, 1), texts };
}

const pop = (word: string, trait?: string): Popup => ({ word, sub: 'SMITH', tone: 'attack', big: false, ms: 1200, ...(trait ? { trait } : {}) });
const feet = () => ({ x: 10, y: 10 });

/** The layer's live entries (private). */
const liveOf = (l: PopupLayer) => (l as unknown as { live: { text: FakeText; parent?: unknown }[] }).live;

describe('PopupLayer recycling', () => {
  it('leaves no live entry whose parent has gone when the pool is full', () => {
    const { layer: l } = makeLayer();
    l.show(pop('TRY', 'DANCING FEET'), 'home', 1); // a shout and its trait line: two texts
    for (let slot = 2; slot <= 5; slot++) l.show(pop('BREAK'), 'home', slot); // the other four
    expect(liveOf(l)).toHaveLength(6);
    l.show(pop('TACKLE'), 'away', 3); // pool empty: recycles the oldest, the TRY
    const live = liveOf(l);
    for (const e of live) if (e.parent) expect(live).toContain(e.parent);
  });

  it('shows no text that no live entry owns', () => {
    const { layer: l, texts } = makeLayer();
    l.show(pop('TRY', 'DANCING FEET'), 'home', 1);
    for (let slot = 2; slot <= 5; slot++) l.show(pop('BREAK'), 'home', slot);
    l.show(pop('TACKLE'), 'away', 3);
    const owned = liveOf(l).map((e) => e.text);
    for (const t of texts) if (t.visible) expect(owned).toContain(t);
  });

  it('clear() leaves nothing visible', () => {
    const { layer: l, texts } = makeLayer();
    l.show(pop('TRY', 'DANCING FEET'), 'home', 1);
    l.show(pop('BREAK'), 'home', 2);
    l.update(16, 1, feet);
    l.clear();
    expect(texts.some((t) => t.visible)).toBe(false);
    expect(liveOf(l)).toHaveLength(0);
  });
});
