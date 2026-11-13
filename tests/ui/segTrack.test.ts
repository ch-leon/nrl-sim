// tests/ui/segTrack.test.ts — a segmented track too long for its room (#611): where it
// scrolls to so the selection is whole, and which side fades. The scroll itself and the
// mask are measured in the running game (the vitest env has no layout); these pin the
// two decisions and the CSS text.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CSS, segCut, segScrollLeft, segmented } from '../../src/ui/dom';
import { stubDocument } from './stubDom';

// The Guide's eight tabs at 667×375, Normal text: 614px of tabs in a 476px track.
const GUIDE_667 = { room: 476, full: 614 };
const TAB = { week: [3, 94], ladder: [392, 71], grounds: [467, 80], nines: [551, 61] } as const;
const at = (scrollLeft: number) => ({ ...GUIDE_667, scrollLeft });

describe('segScrollLeft: the selected button comes wholly into its track (#611)', () => {
  it('leaves a button alone that is whole and clear of the cut side', () => {
    expect(segScrollLeft(at(0), ...TAB.week)).toBeNull();
    expect(segScrollLeft(at(138), ...TAB.nines)).toBeNull();
    expect(segScrollLeft(at(95), ...TAB.grounds)).toBeNull();
  });

  it('brings in a button cut at the end, with 24px of the next one beside it', () => {
    // GROUNDS showed 9px of itself: 467 + 80 + 24 - 476.
    expect(segScrollLeft(at(0), ...TAB.grounds)).toBe(95);
    // NINES is the last: the track ends, so it scrolls as far as it goes.
    expect(segScrollLeft(at(0), ...TAB.nines)).toBe(GUIDE_667.full - GUIDE_667.room);
  });

  it('brings in a button cut at the start, back to the first one at 0', () => {
    expect(segScrollLeft(at(138), ...TAB.week)).toBe(0);
    expect(segScrollLeft(at(138), 101, 65)).toBe(77);
  });

  it('moves a whole button that sits under the fade clear of it', () => {
    // LADDER ends 13px short of the cut: inside the track, but in the 24px that fades.
    expect(segScrollLeft(at(0), ...TAB.ladder)).toBe(11);
  });

  it('never scrolls a track that fits', () => {
    const fits = { scrollLeft: 0, room: 614, full: 614 };
    for (const [left, width] of Object.values(TAB)) expect(segScrollLeft(fits, left, width)).toBeNull();
  });

  it('keeps the start of a button wider than the room on show', () => {
    expect(segScrollLeft({ scrollLeft: 0, room: 100, full: 600 }, 300, 160)).toBe(300);
  });
});

describe('segCut: the side a scrolled track fades on (#611)', () => {
  it('is none for a track that fits, to the pixel', () => {
    expect(segCut({ scrollLeft: 0, room: 614, full: 614 })).toBeNull();
    expect(segCut({ scrollLeft: 0, room: 242, full: 243 })).toBeNull();
  });

  it('is the end at rest, both mid-way and the start at the far end', () => {
    expect(segCut(at(0))).toBe('end');
    expect(segCut(at(95))).toBe('both');
    expect(segCut(at(138))).toBe('start');
    // A phone at 3× reports a scroll position a fraction short of the end.
    expect(segCut(at(137.67))).toBe('start');
  });
});

describe('the track in the stylesheet (#611)', () => {
  it('fades by a mask on the cut side only, and not at all without data-cut', () => {
    expect(CSS).toContain('.nrl-seg[data-cut] { -webkit-mask-image: var(--nrl-seg-cut); mask-image: var(--nrl-seg-cut); }');
    expect(CSS).toContain('.nrl-seg[data-cut="end"] { --nrl-seg-cut: linear-gradient(to left, transparent, #000 24px); }');
    expect(CSS).toContain('.nrl-seg[data-cut="start"] { --nrl-seg-cut: linear-gradient(to right, transparent, #000 24px); }');
    expect(CSS).toContain('.nrl-seg[data-cut="both"] { --nrl-seg-cut: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent); }');
  });

  it('gives the build label\'s room to the Guide\'s tabs up to 900px, so all eight fit at 844', () => {
    expect(CSS).toContain('@media (max-width: 900px) { .nrl-guide-build { display: none; } }');
  });
});

describe('segmented() off the page (#611)', () => {
  beforeEach(stubDocument);
  afterEach(() => vi.unstubAllGlobals());

  it('marks the selection and leaves the track alone until it has a box', () => {
    const seg = segmented([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], 'a', () => {});
    seg.set('b');
    expect(seg.buttons.get('b')!.getAttribute('aria-pressed')).toBe('true');
    expect(seg.buttons.get('a')!.getAttribute('aria-pressed')).toBe('false');
    expect(seg.el.hasAttribute('data-cut')).toBe(false);
  });
});
