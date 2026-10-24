// src/match/view/popups.ts — what to shout about (BAK-208 §6). Pure: maps a
// sim event to the pop-up word over the player's head, its tone and whether it
// is a big moment (slow-motion beat). popupLayer.ts draws them.
import { CALL_LABEL, isCoachCall } from '../league/calls';
import type { SimEvent } from '../core/snapshot';

export type PopupTone = 'attack' | 'defence' | 'neutral' | 'bad';

export interface Popup {
  word: string;
  /** Second line: the player's surname (a bonus try's says where it was scored from). */
  sub: string;
  tone: PopupTone;
  /** A big moment: larger text, slow-motion beat. */
  big: boolean;
  /** How long it stays up, real ms. */
  ms: number;
  /** Third line: the special skill that fired ("DANCING FEET II"), in the trait colour. */
  trait?: string;
}

/** Trait line colour: the one colour no tone uses, so a firing trait always reads. */
export const TRAIT_COLOR = '#d9a5ff';

export const POPUP_MS = 1200;
export const POPUP_BIG_MS = 1700;
/** Slow-motion beat on a big moment: real ms and time factor. */
export const SLOWMO_MS = 320;
export const SLOWMO_FACTOR = 0.3;

const WORDS: Readonly<Record<string, { word: string; tone: PopupTone; big?: boolean }>> = {
  'break-tackle': { word: 'BUST!', tone: 'attack', big: true },
  fend: { word: 'FEND!', tone: 'attack' },
  offload: { word: 'OFFLOAD!', tone: 'attack' },
  dart: { word: 'DART!', tone: 'attack' },
  step: { word: 'STEP!', tone: 'attack' },
  'big-hit': { word: 'BIG HIT!', tone: 'defence', big: true },
  strip: { word: 'STRIP!', tone: 'defence', big: true },
  intercept: { word: 'INTERCEPT!', tone: 'defence', big: true },
  'cut-out': { word: 'CUT-OUT!', tone: 'attack' },
  gamble: { word: 'GAMBLED!', tone: 'bad' },
  error: { word: 'KNOCK-ON!', tone: 'bad' },
  handover: { word: 'HANDOVER', tone: 'neutral' },
  kick: { word: 'KICK!', tone: 'neutral' },
  regather: { word: 'REGATHER!', tone: 'attack', big: true },
  drop: { word: 'DROPPED!', tone: 'bad' },
  try: { word: 'TRY!', tone: 'attack', big: true },
  // Legs and the wrestle (§8): a quick play-the-ball off a short wrestle, a player whose legs are gone (COOKED!, not to be confused with running out of gas).
  'quick-ptb': { word: 'QUICK PTB!', tone: 'attack' },
  gassed: { word: 'COOKED!', tone: 'bad' },
  // Sprint and gas (§8.2): caught from behind after a break.
  'run-down': { word: 'RUN DOWN!', tone: 'defence', big: true },
  // Interchanges (BAK-207 2b): over the man coming on.
  interchange: { word: 'ON!', tone: 'neutral' },
  // Goal kicking (2c): the result over the kicker; a charge-down over the man who blocked it.
  conversion: { word: 'GOAL!', tone: 'attack' },
  'field-goal': { word: 'FIELD GOAL!', tone: 'attack', big: true },
  'charge-down': { word: 'CHARGED DOWN!', tone: 'defence', big: true },
  // Touch and dead ball (2d).
  touch: { word: 'TOUCH', tone: 'neutral' },
  '40-20': { word: '40/20!', tone: 'attack', big: true },
  'on-full': { word: 'ON THE FULL!', tone: 'bad' },
  'dead-ball': { word: 'DEAD BALL', tone: 'neutral' },
  'drop-out': { word: 'DROP-OUT', tone: 'neutral' },
  // Penalties (2e): over the man penalised; the captain's call over the taker; six again over the tackler.
  penalty: { word: 'PENALTY!', tone: 'bad', big: true },
  'six-again': { word: 'SIX AGAIN!', tone: 'attack' },
  'penalty-choice': { word: 'TAP AND GO', tone: 'neutral' },
  'penalty-goal': { word: 'GOAL!', tone: 'attack' },
  // Injuries (2f): over the man hurt in the tackle.
  injury: { word: 'HURT!', tone: 'bad' },
  // Coach calls (#73): the call, over the man it goes through.
  'coach-call': { word: 'CALL!', tone: 'neutral' },
  // Sin bins (#71): over the man marched, and over him again when he is back.
  'sin-bin': { word: 'SIN BIN!', tone: 'bad', big: true },
  'sin-bin-return': { word: 'BACK ON', tone: 'neutral' },
};

/** The captain's call on a penalty (2e). */
const CALL_WORDS: Readonly<Record<string, string>> = { goal: 'GOING FOR GOAL', tap: 'TAP AND GO', touch: 'FOR TOUCH' };

/** A bust out of a wrestle (the defenders' grip went first) reads differently from one at contact. */
const LATE_BUST = 'BROKE FREE!';

/** A bonus try's second line, in place of the scorer's name (the ticker names him). */
export const BONUS_SUB = 'FROM THE ZONE';

/** A kick's pop-up names its type (BAK-208 §4.4). */
const KICK_WORDS: Readonly<Record<string, string>> = {
  bomb: 'BOMB!',
  grubber: 'GRUBBER!',
  chip: 'CHIP!',
  'cross-field': 'CROSS-FIELD!',
};

export function surnameOf(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

/**
 * The pop-up for an event, or null for routine events (tackles, set starts).
 * A tackle that a trait shaped (a Wrecking Ball driving through it) does get
 * one, so every firing trait is seen.
 */
export function popupFor(e: SimEvent): Popup | null {
  const w = WORDS[e.kind] ?? (e.trait && e.kind === 'tackle' ? { word: 'DRIVE!', tone: 'attack' as const } : undefined);
  if (!w) return null;
  // A kick at goal that misses reads as a miss, whichever kind it was.
  if ((e.kind === 'conversion' || e.kind === 'field-goal' || e.kind === 'penalty-goal') && e.detail === 'missed') {
    return { word: 'MISSED!', sub: surnameOf(e.player).toUpperCase(), tone: 'bad', big: false, ms: POPUP_MS };
  }
  const big = w.big ?? false;
  const word =
    e.kind === 'kick' && e.detail && KICK_WORDS[e.detail]
      ? KICK_WORDS[e.detail]!
      : e.kind === 'break-tackle' && e.detail === 'wrestle'
        ? LATE_BUST
        : e.kind === 'try' && e.detail === 'bonus'
          ? 'BONUS TRY!'
          : e.kind === 'touch' && e.detail === 'bundled'
            ? 'INTO TOUCH!'
            : e.kind === 'coach-call' && e.detail && isCoachCall(e.detail)
              ? `${CALL_LABEL[e.detail].toUpperCase()}!`
              : e.kind === 'error' && e.detail === 'contact'
              ? 'SPILLED!'
              : e.kind === 'penalty-choice'
              ? (CALL_WORDS[e.detail ?? 'tap'] ?? w.word)
              : w.word;
  // A bonus try points at the zone it was grounded in (#77; zoneLayer.ts lights it).
  const sub = e.kind === 'try' && e.detail === 'bonus' ? BONUS_SUB : surnameOf(e.player).toUpperCase();
  const p: Popup = { word, sub, tone: w.tone, big, ms: big ? POPUP_BIG_MS : POPUP_MS };
  if (e.trait) p.trait = e.trait.toUpperCase();
  return p;
}

/** Text colour per tone (team colour is applied by the layer for attack/defence when known). */
export const TONE_COLOR: Readonly<Record<PopupTone, string>> = {
  attack: '#ffe14a',
  defence: '#ff6b4a',
  neutral: '#f4ecd8',
  bad: '#ff4a4a',
};

/** Screen px kept clear of the camera's edge (N15.6). A line of a pop-up is about this tall. */
export const POPUP_EDGE = 8;
export const POPUP_LINE_H = 22;
/** Half the widest word, screen px, so the sides of the word stay on screen. */
export const POPUP_HALF_W = 64;

/** The camera's visible rectangle, in world px. */
export interface PopupView {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** World px a pop-up's text occupies at this zoom (it is drawn at 1/zoom so it stays screen-sized). */
export function popupTextHeight(lines: number, zoom: number): number {
  return (Math.max(1, lines) * POPUP_LINE_H) / Math.max(zoom, 1e-3);
}

/**
 * Keep a pop-up's anchor inside the camera (N15.6, finding 4). The text hangs
 * upward from `anchor` (origin at its bottom edge) and is `textH` world px tall.
 * At ×8 a 40 px lift over a man near the top of the view walks off the screen;
 * this pulls the anchor back in, on every edge.
 */
export function clampPopupAnchor(
  anchor: { x: number; y: number },
  textH: number,
  view: PopupView,
  zoom: number,
): { x: number; y: number } {
  const z = Math.max(zoom, 1e-3);
  if (!(view.width > 0) || !(view.height > 0)) return { x: anchor.x, y: anchor.y };
  const mx = Math.min(POPUP_HALF_W / z, view.width / 2);
  const my = Math.min(POPUP_EDGE / z, view.height / 2);
  const left = view.left + mx;
  const right = view.left + view.width - mx;
  const top = view.top + my;
  const bottom = view.top + view.height - my;
  const x = left <= right ? Math.min(right, Math.max(left, anchor.x)) : view.left + view.width / 2;
  const room = Math.max(0, bottom - top);
  const h = Math.min(Math.max(0, textH), room);
  const minY = top + h;
  const maxY = bottom;
  const y = minY <= maxY ? Math.min(maxY, Math.max(minY, anchor.y)) : top + h;
  return { x, y };
}
