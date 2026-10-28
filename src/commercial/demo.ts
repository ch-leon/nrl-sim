// src/commercial/demo.ts — the demo gate (commercial foundations 03, #362).
//
// A demo club plays season 1 up to round DEMO.lastWeek, then time stops: Advance
// Week, the ▾ runs and fast forward all end there. The gate is one check at the
// top of advanceWeek (core/time.ts), after a held week has had its chance to
// finish, so it never stops mid-match; the ▾ run (core/advance.ts) stops before
// the week it would refuse. Blocked, it emits commercial:demoEnded, which the
// game answers with the paywall (#364, src/ui/screens/paywall.ts).
//
// Everything here returns at once with the flag off: no state read, no key written.

import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import type { SlotSummary } from '../core/save';
import { commercialEnabled } from './flags';
import { type Entitlements, PLATFORM, commercialStorage, entitlementsFor, getEntitlementService, hasFullGame } from './entitlements';

/**
 * DECISION (Leon): demo scope. The demo plays season `season` up to and
 * including round `lastWeek` (week n plays round n), then stops with the club at
 * week lastWeek + 1. lastWeek 0 is preseason only: the club can build and sign
 * but not play a round.
 */
export const DEMO = { season: 1, lastWeek: 3 };

/**
 * DECISION (Leon): careers already on this device when the commercial build
 * first runs here keep the full game (source 'grandfathered'), so people playing
 * the free web build today don't lose them.
 */
export const GRANDFATHER_EXISTING_SAVES = true;

export const DEMO_ENDED_TEXT = "That's the end of the demo.";

/** When the commercial build first ran on this device, and the careers it found then. */
export const FIRST_RUN_KEY = 'nrl-sim-commercial-first-run';

export interface FirstRun {
  at: number;
  slots: { slot: number; clubName: string }[];
}

/**
 * Pure: whether `ent` may play the week `state` is on. False only with the flag
 * on, for a club without the full game, past the demo's last week.
 */
export function demoAllowsAdvance(state: Pick<GameState, 'season' | 'week'>, ent: Entitlements): boolean {
  if (!commercialEnabled() || hasFullGame(ent, PLATFORM)) return true;
  if (state.season !== DEMO.season) return state.season < DEMO.season;
  return state.week <= DEMO.lastWeek;
}

// ── Grandfathering ──────────────────────────────────────────────────────────

let firstRun: FirstRun | null | undefined;

function readFirstRun(): FirstRun | null {
  if (firstRun !== undefined) return firstRun;
  try {
    const raw = commercialStorage()?.getItem(FIRST_RUN_KEY);
    firstRun = raw ? (JSON.parse(raw) as FirstRun) : null;
  } catch {
    firstRun = null;
  }
  return firstRun;
}

/**
 * Note the first run on this device and the careers in the slots then (the title
 * screen's summaries). Call before the title flow, so a new game can't count.
 * Once only; nothing with the flag off.
 */
export function recordFirstRun(slots: readonly SlotSummary[], now = Date.now()): void {
  if (!commercialEnabled() || readFirstRun()) return;
  firstRun = {
    at: now,
    slots: slots.filter((s) => s.status === 'ok').map((s) => ({ slot: s.slot, clubName: s.clubName ?? '' })),
  };
  try {
    commercialStorage()?.setItem(FIRST_RUN_KEY, JSON.stringify(firstRun));
  } catch {
    // Not kept: the next page load records it again.
  }
}

/** The slot being played, set once its game is loaded or made (main.ts). */
let activeSlot = 0;

export function setDemoSlot(slot: number): void {
  activeSlot = slot;
}

/** Whether the career in `slot` was on the device before the commercial build: the same slot, the same club. */
export function isGrandfathered(slot: number, state: Pick<GameState, 'clubName'>): boolean {
  if (!GRANDFATHER_EXISTING_SAVES) return false;
  return readFirstRun()?.slots.some((s) => s.slot === slot && s.clubName === state.clubName) === true;
}

/** What the career being played owns: grandfathered, or what the service says. */
export function slotEntitlements(state: Pick<GameState, 'clubName'>): Entitlements {
  if (isGrandfathered(activeSlot, state)) return entitlementsFor('standard', 'grandfathered');
  return getEntitlementService().snapshot();
}

// ── The gate ────────────────────────────────────────────────────────────────

/** True when the demo stops the week `state` is on. False with the flag off, before anything is read. */
export function demoBlocked(state: GameState = getState()): boolean {
  return commercialEnabled() && !demoAllowsAdvance(state, slotEntitlements(state));
}

/** advanceWeek's check: blocked, it says so (commercial:demoEnded) and the week isn't played. */
export function demoStops(): boolean {
  if (!demoBlocked()) return false;
  const { season, week } = getState();
  bus.emit('commercial:demoEnded', { season, week });
  return true;
}

/**
 * Start the commercial side for the page (main.ts, flag on only). `onDemoEnded`
 * answers the demo's end: the paywall in the game (#364), a plain toast without one.
 */
export function initCommercial(
  slot: number,
  onDemoEnded: () => void = () => bus.emit('ui:notify', { text: DEMO_ENDED_TEXT, kind: 'info' }),
): void {
  setDemoSlot(slot);
  getEntitlementService();
  bus.on('commercial:demoEnded', onDemoEnded);
}

/** Test hook: forget the first-run record read and the slot. */
export function __resetDemo(): void {
  firstRun = undefined;
  activeSlot = 0;
}
