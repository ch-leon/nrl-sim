// src/ui/inbox.ts — News inbox nav screen (GitHub #45, part of #49).
// Keeps the last INBOX_CAPACITY 'ui:notify' messages in memory so toasts that
// vanish after 4s can still be read later. Each message is stamped with the
// season and week it arrived in. Not persisted: no state field, no save change.
// The ring buffer and filtering are pure and unit-tested without the DOM; the
// DOM part only renders them. No Phaser.
//
// Event cards waiting for a choice (GitHub #75) are answered in their own popup
// (ui/decisions.ts, #345). News keeps one row for them at the top, which opens it,
// so the feed below always has the screen.

import { bus, type Events } from '../core/events';
import { getState } from '../core/state';
import { decisionViews, openDecisions } from './decisions';
import { el, button, openModal, segmented } from './dom';

/** How many messages the ring buffer holds before the oldest is overwritten. */
export const INBOX_CAPACITY = 100;

export type NewsKind = Events['ui:notify']['kind'];
/** Kind filter on the screen: a single kind, or everything. */
export type NewsFilter = NewsKind | 'all';

export const NEWS_KINDS: readonly NewsKind[] = ['info', 'success', 'danger'];

export interface NewsItem {
  /** Monotonic id; never reused, so it orders messages even across wraps. */
  seq: number;
  text: string;
  kind: NewsKind;
  season: number;
  week: number;
}

export interface NewsStamp {
  season: number;
  week: number;
}

// ── Ring buffer ────────────────────────────────────────────────────────────────

/**
 * Fixed-capacity ring of news messages with an unread counter. push() writes
 * into the next slot and overwrites the oldest entry once full. The unread count
 * is the number of messages received since markAllRead() that are still held,
 * so it never exceeds the capacity.
 */
export class NewsInbox {
  private slots: (NewsItem | undefined)[];
  private next = 0; // slot the next push writes into
  private count = 0; // messages currently held (≤ capacity)
  private seq = 0;
  private unread = 0;
  private listeners = new Set<(unread: number) => void>();

  constructor(private readonly capacity: number = INBOX_CAPACITY) {
    if (capacity < 1) throw new RangeError('NewsInbox capacity must be ≥ 1');
    this.slots = new Array<NewsItem | undefined>(capacity);
  }

  /** Append a message, overwriting the oldest once the ring is full. */
  push(msg: { text: string; kind: NewsKind } & NewsStamp): NewsItem {
    const item: NewsItem = { seq: ++this.seq, ...msg };
    this.slots[this.next] = item;
    this.next = (this.next + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    this.unread = Math.min(this.unread + 1, this.count);
    this.emit();
    return item;
  }

  /** Held messages, newest first. Copies, so callers can't mutate the ring. */
  items(): NewsItem[] {
    const out: NewsItem[] = [];
    for (let i = 1; i <= this.count; i++) {
      const slot = this.slots[(this.next - i + this.capacity) % this.capacity];
      if (slot) out.push({ ...slot });
    }
    return out;
  }

  get size(): number {
    return this.count;
  }

  /** Messages received since the last markAllRead() that are still held. */
  get unreadCount(): number {
    return this.unread;
  }

  /** Called when the screen is opened: everything held is now read. */
  markAllRead(): void {
    if (this.unread === 0) return;
    this.unread = 0;
    this.emit();
  }

  /** Subscribe to unread-count changes; returns the unsubscribe closure. */
  onChange(fn: (unread: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  clear(): void {
    this.slots = new Array<NewsItem | undefined>(this.capacity);
    this.next = 0;
    this.count = 0;
    this.unread = 0;
    this.emit();
  }

  private emit(): void {
    for (const fn of [...this.listeners]) fn(this.unread);
  }
}

/** The app-wide inbox, fed by initNewsInbox(). */
export const newsInbox = new NewsInbox();

/** Season/week for a new message. Falls back to 1/1 before a game exists. */
function currentStamp(): NewsStamp {
  try {
    const { season, week } = getState();
    return { season, week };
  } catch {
    return { season: 1, week: 1 };
  }
}

/**
 * Subscribe an inbox to 'ui:notify', stamping each message with the current
 * season/week. Call once from main.ts. Returns the unsubscribe.
 */
export function initNewsInbox(inbox: NewsInbox = newsInbox): () => void {
  return bus.on('ui:notify', ({ text, kind }) => {
    inbox.push({ text, kind, ...currentStamp() });
  });
}

// ── View-model ─────────────────────────────────────────────────────────────────

export interface NewsWeekGroup {
  season: number;
  week: number;
  items: NewsItem[];
}

/** Keep the messages of one kind, or all of them. Order is preserved. */
export function filterNews(items: NewsItem[], filter: NewsFilter): NewsItem[] {
  return filter === 'all' ? items : items.filter((i) => i.kind === filter);
}

/**
 * Group newest-first messages by season/week, newest week first. Within a
 * group the order is preserved (newest first), so the list reads top-down.
 */
export function groupByWeek(items: NewsItem[]): NewsWeekGroup[] {
  const groups: NewsWeekGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.season === item.season && last.week === item.week) {
      last.items.push(item);
    } else {
      groups.push({ season: item.season, week: item.week, items: [item] });
    }
  }
  return groups;
}

// ── DOM screen ─────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<NewsFilter, string> = {
  all: 'All',
  info: 'Info',
  success: 'Good',
  danger: 'Alert',
};

/** Open the News screen. Opening it marks every held message as read. */
export function openInboxScreen(inbox: NewsInbox = newsInbox): HTMLElement {
  inbox.markAllRead();
  let filter: NewsFilter = 'all';

  const content = el('div', { class: 'nrl-news' });
  const body = el('div', { class: 'nrl-news-body' });
  const list = el('div', { class: 'nrl-news-list' });
  const decisions = el('div', { class: 'nrl-news-decisions' });

  // One row however many cards wait: their titles and a button to the popup.
  const renderDecisions = (): void => {
    const views = decisionViews(getState());
    decisions.replaceChildren();
    decisions.hidden = views.length === 0;
    if (views.length === 0) return;
    const answer = button('Review', () => openDecisions(), { class: 'nrl-news-answer nrl-btn-primary' });
    answer.setAttribute('data-decisions-open', '');
    decisions.append(
      el('span', { class: 'nrl-news-decisions-text' },
        el('b', { text: `${views.length} ${views.length === 1 ? 'DECISION' : 'DECISIONS'}` }),
        views.map((v) => v.title).join(', ')),
      answer,
    );
  };

  const renderList = (): void => {
    list.replaceChildren();
    const groups = groupByWeek(filterNews(inbox.items(), filter));
    if (groups.length === 0) {
      list.append(el('p', {
        class: 'nrl-news-empty',
        text: filter === 'all'
          ? 'No news yet. Messages from matches, injuries and signings land here.'
          : 'No messages of this kind.',
      }));
      return;
    }
    for (const g of groups) {
      const section = el('section', { class: 'nrl-news-week' });
      section.append(el('h3', { text: `S${g.season} · Week ${g.week}` }));
      for (const item of g.items) {
        section.append(el('div', {
          class: `nrl-news-item nrl-news-${item.kind}`,
          text: item.text,
        }));
      }
      list.append(section);
    }
  };

  // ALL / INFO / GOOD / ALERT: the segmented control in the header row.
  const filters = segmented<NewsFilter>(
    (['all', ...NEWS_KINDS] as NewsFilter[]).map((f) => ({ id: f, label: FILTER_LABELS[f] })),
    filter,
    (f) => setFilter(f),
    { class: 'nrl-news-filters', label: 'Show' },
  );
  for (const b of filters.buttons.values()) b.classList.add('nrl-news-filter');
  const setFilter = (f: NewsFilter): void => {
    filter = f;
    filters.set(f);
    renderList();
  };

  body.append(list);
  // Title and filters share the header row.
  content.append(el('div', { class: 'nrl-news-head' }, el('h2', { text: 'News' }), filters.el), decisions, body);
  setFilter('all');
  renderDecisions();
  const offState = bus.on('state:changed', () => {
    if (!content.isConnected) {
      offState();
      return;
    }
    renderDecisions();
  });

  // Messages arriving while the screen is open are read on sight.
  const off = bus.on('ui:notify', () => {
    if (!content.isConnected) {
      off();
      return;
    }
    inbox.markAllRead();
    renderList();
  });

  return openModal(content, { class: 'nrl-news-modal', screen: true, key: 'news' });
}
