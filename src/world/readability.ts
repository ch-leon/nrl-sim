// src/world/readability.ts — Phaser-free helpers for match readability (#17):
// the commentary ticker, name tags, the carrier marker and the situational
// camera zoom. Presentation only; nothing here touches the sim.
import type { MatchEvent, MatchEventKind } from '../sim/events';

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
 * Default match zoom: a player stands ~42px tall. Whole numbers only — pixel
 * art shimmers at fractional zooms once everything is moving (see viewport).
 */
export const ZOOM_DEFAULT = 2;
/** Tighter at rucks and tackles. */
export const ZOOM_CLOSE = 3;
/** Kicks and breaks: no tighter than default, so the ball's destination stays in view. */
export const ZOOM_WIDE = 2;
/** Exponential ease rate (per second) toward the target zoom. */
export const ZOOM_RATE_PER_S = 2.2;

export function zoomForEvent(kind: MatchEventKind): number {
  switch (kind) {
    case 'tackle':
    case 'big-hit':
    case 'fend':
    case 'break-tackle':
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

/** Frame-rate-independent ease of `cur` toward `target` over `deltaMs`. */
export function easeZoom(cur: number, target: number, deltaMs: number, rate = ZOOM_RATE_PER_S): number {
  const k = 1 - Math.exp((-rate * Math.max(0, deltaMs)) / 1000);
  const next = cur + (target - cur) * k;
  return Math.abs(target - next) < 0.002 ? target : next;
}
