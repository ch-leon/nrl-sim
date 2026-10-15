import { describe, it, expect } from 'vitest';
import {
  NewsInbox, INBOX_CAPACITY, filterNews, groupByWeek, type NewsItem,
} from '../../src/ui/inbox';

const msg = (text: string, week = 1, season = 1, kind: NewsItem['kind'] = 'info') =>
  ({ text, kind, season, week });

describe('NewsInbox ring buffer', () => {
  it('defaults to a 100-message capacity', () => {
    expect(INBOX_CAPACITY).toBe(100);
  });

  it('caps at its capacity and overwrites the oldest message first', () => {
    const inbox = new NewsInbox(3);
    for (const t of ['a', 'b', 'c', 'd', 'e']) inbox.push(msg(t));
    expect(inbox.size).toBe(3);
    expect(inbox.items().map((i) => i.text)).toEqual(['e', 'd', 'c']);
  });

  it('caps at 100 with the default capacity', () => {
    const inbox = new NewsInbox();
    for (let i = 0; i < 250; i++) inbox.push(msg(`m${i}`));
    expect(inbox.size).toBe(100);
    const held = inbox.items();
    expect(held).toHaveLength(100);
    expect(held[0].text).toBe('m249');
    expect(held[99].text).toBe('m150');
  });

  it('keeps items newest first and stamps each with season and week', () => {
    const inbox = new NewsInbox(5);
    inbox.push(msg('first', 3, 2, 'success'));
    inbox.push(msg('second', 4, 2, 'danger'));
    const [newest, oldest] = inbox.items();
    expect(newest).toMatchObject({ text: 'second', season: 2, week: 4, kind: 'danger' });
    expect(oldest).toMatchObject({ text: 'first', season: 2, week: 3, kind: 'success' });
    expect(newest.seq).toBeGreaterThan(oldest.seq);
  });

  it('returns copies, so callers cannot mutate the ring', () => {
    const inbox = new NewsInbox(2);
    inbox.push(msg('x'));
    inbox.items()[0].text = 'changed';
    expect(inbox.items()[0].text).toBe('x');
  });

  it('rejects a non-positive capacity', () => {
    expect(() => new NewsInbox(0)).toThrow(RangeError);
  });
});

describe('NewsInbox unread count', () => {
  it('counts each message received since the last read', () => {
    const inbox = new NewsInbox(10);
    expect(inbox.unreadCount).toBe(0);
    inbox.push(msg('a'));
    inbox.push(msg('b'));
    expect(inbox.unreadCount).toBe(2);
  });

  it('resets to zero on markAllRead (what opening the screen does)', () => {
    const inbox = new NewsInbox(10);
    inbox.push(msg('a'));
    inbox.push(msg('b'));
    inbox.markAllRead();
    expect(inbox.unreadCount).toBe(0);
    expect(inbox.size).toBe(2); // reading does not drop messages
    inbox.push(msg('c'));
    expect(inbox.unreadCount).toBe(1);
  });

  it('never exceeds the number of messages still held', () => {
    const inbox = new NewsInbox(3);
    for (let i = 0; i < 10; i++) inbox.push(msg(`m${i}`));
    expect(inbox.unreadCount).toBe(3);
    expect(inbox.size).toBe(3);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const inbox = new NewsInbox(10);
    const seen: number[] = [];
    const off = inbox.onChange((n) => seen.push(n));
    inbox.push(msg('a'));
    inbox.markAllRead();
    inbox.markAllRead(); // already zero: no extra notification
    off();
    inbox.push(msg('b'));
    expect(seen).toEqual([1, 0]);
  });

  it('clear() empties the ring and the unread count', () => {
    const inbox = new NewsInbox(5);
    inbox.push(msg('a'));
    inbox.clear();
    expect(inbox.size).toBe(0);
    expect(inbox.unreadCount).toBe(0);
    expect(inbox.items()).toEqual([]);
  });
});

describe('news view-model', () => {
  const items: NewsItem[] = [
    { seq: 4, text: 'win', kind: 'success', season: 1, week: 3 },
    { seq: 3, text: 'injury', kind: 'danger', season: 1, week: 3 },
    { seq: 2, text: 'signing', kind: 'info', season: 1, week: 2 },
    { seq: 1, text: 'old season', kind: 'info', season: 0, week: 9 },
  ];

  it('filters by kind and keeps all messages for "all"', () => {
    expect(filterNews(items, 'all')).toHaveLength(4);
    expect(filterNews(items, 'danger').map((i) => i.text)).toEqual(['injury']);
    expect(filterNews(items, 'info').map((i) => i.text)).toEqual(['signing', 'old season']);
  });

  it('groups newest-first messages by season and week, preserving order', () => {
    const groups = groupByWeek(items);
    expect(groups.map((g) => [g.season, g.week])).toEqual([[1, 3], [1, 2], [0, 9]]);
    expect(groups[0].items.map((i) => i.text)).toEqual(['win', 'injury']);
  });
});
