// src/analytics/events.ts — the only events analytics may send, and their only properties (#450).
//
// Pure, no SDK. The agreed list (#450 "Key events, no free text and no personal
// data"): a new career, a match finished (result and difficulty only), a season
// finished, a view of one of the dock's five tabs, push turned on or off, a pop-up
// shown, clicked or dismissed, and an email sign-up done. Every property is an
// enum, a boolean or a slug: no names (players, clubs, coaches, grounds), no save,
// no money, no free text, no email address. sanitize() is the gate: index.ts runs
// every event through it before queueing, and the SDK's before_send runs it again,
// so an event or a property not listed here never leaves the page.

import type { Difficulty } from '../config';

/** The dock's five tabs, by what the player reads on them (nav.ts's ids map onto these). */
export const DOCK_TABS = ['club', 'squad', 'league', 'build', 'office'] as const;
export type DockTab = (typeof DOCK_TABS)[number];

export type MatchOutcome = 'win' | 'loss' | 'draw';

/** Every event and its properties. */
export interface EventProps {
  career_started: { difficulty: Difficulty };
  match_finished: { result: MatchOutcome; difficulty: Difficulty };
  season_finished: Record<string, never>;
  tab_viewed: { tab: DockTab };
  push_opt_in_changed: { enabled: boolean };
  popup_shown: { popup_id: string };
  popup_clicked: { popup_id: string };
  popup_dismissed: { popup_id: string };
  email_signup_completed: Record<string, never>;
}
export type EventName = keyof EventProps;

/** Context on every event: which build sent it and from where. No device or person id. */
export interface EventContext {
  app_build: string;
  platform: 'web' | 'android';
}

type Check = (v: unknown) => boolean;
const oneOf = (...xs: readonly string[]): Check => (v) => typeof v === 'string' && xs.includes(v);
const bool: Check = (v) => typeof v === 'boolean';
/** A pop-up's id as #451 will author it: a short lowercase slug, never its text. */
const slug: Check = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v);
const DIFFICULTY = oneOf('easy', 'normal', 'hard');

const SCHEMA: { [K in EventName]: { [P in keyof EventProps[K]]-?: Check } } = {
  career_started: { difficulty: DIFFICULTY },
  match_finished: { result: oneOf('win', 'loss', 'draw'), difficulty: DIFFICULTY },
  season_finished: {},
  tab_viewed: { tab: oneOf(...DOCK_TABS) },
  push_opt_in_changed: { enabled: bool },
  popup_shown: { popup_id: slug },
  popup_clicked: { popup_id: slug },
  popup_dismissed: { popup_id: slug },
  email_signup_completed: {},
};

const CONTEXT: { [P in keyof EventContext]-?: Check } = {
  app_build: (v) => typeof v === 'string' && /^[0-9a-z -]{1,32}$/.test(v),
  platform: oneOf('web', 'android'),
};

export const EVENT_NAMES = Object.keys(SCHEMA) as EventName[];

export function isEventName(name: unknown): name is EventName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(SCHEMA, name);
}

/**
 * Pure: the event's own properties and the context, checked and copied, or null
 * when the name is not on the list or a property is missing or not what it should
 * be. Keys that are on neither list are left out.
 */
export function sanitize(name: unknown, props: Record<string, unknown>): Record<string, string | boolean> | null {
  if (!isEventName(name)) return null;
  const out: Record<string, string | boolean> = {};
  const rules: Record<string, Check> = { ...SCHEMA[name], ...CONTEXT };
  for (const [key, ok] of Object.entries(rules)) {
    const v = props[key];
    if (!ok(v)) return null;
    out[key] = v as string | boolean;
  }
  return out;
}

/** nav.ts's tab ids to the names the player reads on the dock; null for anything else. */
export function dockTab(id: string): DockTab | null {
  if (id === 'fixtures') return 'league';
  return (DOCK_TABS as readonly string[]).includes(id) && id !== 'league' ? (id as DockTab) : null;
}
