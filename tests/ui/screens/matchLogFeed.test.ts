// tests/ui/screens/matchLogFeed.test.ts — the full log's trim (#414): it still keeps
// MAX_LOG lines, but the one that goes is the oldest untagged line, so the coach's
// calls and the scores stay under their filters all match; a filter with nothing
// under it says so. The vitest env has no DOM: this pins the pure rule and the CSS.
import { describe, it, expect } from 'vitest';
import { LOG_EMPTY_TEXT, MAX_LOG, OVERLAY_CSS, logLineToDrop } from '../../../src/ui/screens/matchOverlay';

interface Line { text: string; kind?: string }

/** addLine's trim on a stand-in feed (newest first). */
function add(feed: Line[], line: Line): void {
  feed.unshift(line);
  while (feed.length > MAX_LOG) feed.splice(logLineToDrop(feed.map((l) => l.kind)), 1);
}

describe('the full log keeps its tagged lines (#414)', () => {
  it('an 81st line drops the oldest untagged line, not a tagged one', () => {
    const feed: Line[] = [];
    add(feed, { text: 'Your call: Hit-up.', kind: 'call' });
    add(feed, { text: 'Try! Whitbread', kind: 'score try' });
    for (let i = 0; i < MAX_LOG - 2; i++) add(feed, { text: `line ${i}` });
    expect(feed).toHaveLength(MAX_LOG);
    add(feed, { text: 'the 81st' });
    expect(feed).toHaveLength(MAX_LOG);
    expect(feed.map((l) => l.text)).not.toContain('line 0');
    expect(feed.slice(-2).map((l) => l.kind)).toEqual(['score try', 'call']);
    expect(feed[0]!.text).toBe('the 81st');
  });

  it('a call from minute 3 is still listed at minute 70, and every try with it', () => {
    const feed: Line[] = [];
    for (let min = 1; min <= 70; min++) {
      for (let i = 0; i < 4; i++) add(feed, { text: `${min}' play ${i}` });
      if (min === 3) add(feed, { text: "3' Your call: Hit-up.", kind: 'call' });
      if (min % 9 === 0) add(feed, { text: `${min}' Try!`, kind: 'score try' });
    }
    expect(feed).toHaveLength(MAX_LOG);
    expect(feed.filter((l) => l.kind?.split(' ').includes('call')).map((l) => l.text)).toEqual(["3' Your call: Hit-up."]);
    expect(feed.filter((l) => l.kind?.split(' ').includes('score'))).toHaveLength(7);
    // The live lines are still the newest ones.
    expect(feed[0]!.text).toBe("70' play 3");
  });

  it('with every line tagged, the oldest goes', () => {
    expect(logLineToDrop(['call', 'score', 'call'])).toBe(2);
    expect(logLineToDrop(['call', undefined, 'score', undefined, 'call'])).toBe(3);
  });

  it('a filter with nothing under it says so', () => {
    expect(LOG_EMPTY_TEXT).toEqual({ scoring: 'No scores yet.', calls: 'No calls yet.' });
    expect(OVERLAY_CSS).toContain('.nrl-mo-full[data-filter="calls"]:not(:has(.nrl-mo-line[data-kind~="call"])) .nrl-mo-log-empty[data-for="calls"]');
    expect(OVERLAY_CSS).toContain('.nrl-mo-full[data-filter="scoring"]:not(:has(.nrl-mo-line[data-kind~="score"])) .nrl-mo-log-empty[data-for="scoring"]');
    expect(OVERLAY_CSS).toMatch(/\.nrl-mo-log-empty \{ display: none;/);
  });
});
