// src/world/readability.ts — Phaser-free helpers for match readability (#17):
// the commentary ticker, name tags, the carrier marker and the situational
// camera zoom. Presentation only; nothing here touches the sim.
import type { MatchEvent, MatchEventKind } from '../sim/events';
import { zoomForViewport } from './viewport';

export type TeamSide = 'home' | 'away';

// ── Commentary ticker ─────────────────────────────────────────────────────────

/** Longest ticker line (chars) before it is cut with an ellipsis. */
export const TICKER_MAX_CHARS = 96;

/** Trim a commentary line to fit the slim ticker; adds "…" when cut. */
export function truncateTicker(line: string, max = TICKER_MAX_CHARS): string {
  const s = line.trim().replace(/\s+/g, ' ');
  if (max <= 0) return '';
  if (s.length <= max) return s;
  if (max === 1) return '…';
  // Cut on a word boundary when one falls in the back half of the budget.
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max / 2 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

// ── Name tags ─────────────────────────────────────────────────────────────────

/** How long a name tag stays up (real ms). */
export const NAME_TAG_MS = 1500;

/** "Jarrah Kavanagh" → "Kavanagh"; a single word is kept as is. */
export function surname(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export interface NameTag {
  side: TeamSide;
  slot: number;
  text: string;
}

/**
 * The tag for a beat: the surname from the event's `player` shown over the
 * sprite playback actually used for it (`actor`). Null when the event names
 * nobody or playback picked no sprite.
 */
export function nameTagFor(ev: MatchEvent, actor: { side: TeamSide; slot: number } | null): NameTag | null {
  if (!actor || !ev.player) return null;
  const text = surname(ev.player);
  return text ? { side: actor.side, slot: actor.slot, text } : null;
}

// ── Carrier marker ────────────────────────────────────────────────────────────

export interface MarkerTarget {
  side: TeamSide;
  fx: number;
  fy: number;
}

/**
 * Where the ring under the ball carrier goes: the holder's feet while the ball
 * is in his hands; none while it is in flight or on the ground.
 */
export function carrierMarkerTarget(
  ball:
    | { mode: 'held'; holder: { side: TeamSide; pos: { fx: number; fy: number } } }
    | { mode: 'ground' | 'flight' },
): MarkerTarget | null {
  if (ball.mode !== 'held') return null;
  const { side, pos } = ball.holder;
  return { side, fx: pos.fx, fy: pos.fy };
}

// ── Situational zoom ──────────────────────────────────────────────────────────

/**
 * Default match zoom as authored at 1280×800: a player stands ~42px tall. The
 * camera only ever sits at a whole number of canvas px per art px (see viewport):
 * on a phone the default comes down to ×1.5 on a 2× screen and ×1.33 on a 3× one,
 * or stays ×2 on a 1× screen (#627).
 */
export const ZOOM_DEFAULT = 2;
/**
 * Tighter on the big moments. As authored (a 1× desktop) this is ×3; on any screen
 * it is ZOOM_CLOSE_STEPS whole steps in from that screen's default (zoomForBeat).
 */
export const ZOOM_CLOSE = 3;
/** Canvas px per art px a close-up pulls in from the default: one step on every screen. */
export const ZOOM_CLOSE_STEPS = 1;
/** Kicks and breaks: no tighter than default, so the ball's destination stays in view. */
export const ZOOM_WIDE = 2;
/** Exponential ease rate (per second) toward a target zoom (easeZoom's default). */
export const ZOOM_RATE_PER_S = 2.2;
/**
 * A beat's zoom change (in to a close-up and back out) moves one whole step in this
 * long, linearly, so it lands in a few frames instead of crawling through
 * fractional zooms, where moving pixel art shimmers (#627).
 */
export const ZOOM_STEP_MS = 90;

export function zoomForEvent(kind: MatchEventKind): number {
  switch (kind) {
    // Only the big moments pull in: a close-up on every tackle is jumpy at
    // whole-number zooms (BAK-207) and happens every few seconds live.
    case 'big-hit':
    case 'try':
      return ZOOM_CLOSE;
    case 'kick':
    case 'break':
    case 'conversion':
    case 'penalty-goal':
    case 'field-goal':
      return ZOOM_WIDE;
    default:
      return ZOOM_DEFAULT;
  }
}

/**
 * The camera zoom (canvas px per art px) for a beat's authored zoom on a CSS-px
 * viewport at `density`: the viewport's default, or for a close-up one whole step
 * in from it, so a phone gets one too (#627: ×3 used to round back to ×2 there).
 */
export function zoomForBeat(beat: number, view: { width: number; height: number }, density = 1): number {
  const base = zoomForViewport(ZOOM_DEFAULT, view, density);
  if (beat > ZOOM_DEFAULT) return base + ZOOM_CLOSE_STEPS;
  return beat < ZOOM_DEFAULT ? Math.min(base, zoomForViewport(beat, view, density)) : base;
}

/** Frame-rate-independent ease of `cur` toward `target` over `deltaMs`. */
export function easeZoom(cur: number, target: number, deltaMs: number, rate = ZOOM_RATE_PER_S): number {
  const k = 1 - Math.exp((-rate * Math.max(0, deltaMs)) / 1000);
  const next = cur + (target - cur) * k;
  return Math.abs(target - next) < 0.002 ? target : next;
}

/** Linear move of `cur` toward `target`: one whole zoom step per `msPerStep`, landing exactly on it. */
export function stepZoom(cur: number, target: number, deltaMs: number, msPerStep = ZOOM_STEP_MS): number {
  const d = Math.max(0, deltaMs) / Math.max(1, msPerStep);
  return Math.abs(target - cur) <= d ? target : cur + Math.sign(target - cur) * d;
}
