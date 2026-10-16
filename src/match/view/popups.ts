// src/match/view/popups.ts — what to shout about (BAK-208 §6). Pure: maps a
// sim event to the pop-up word over the player's head, its tone and whether it
// is a big moment (slow-motion beat). popupLayer.ts draws them.
import type { SimEvent } from '../core/snapshot';

export type PopupTone = 'attack' | 'defence' | 'neutral' | 'bad';

export interface Popup {
  word: string;
  /** Second line: the player's surname. */
  sub: string;
  tone: PopupTone;
  /** A big moment: larger text, slow-motion beat. */
  big: boolean;
  /** How long it stays up, real ms. */
  ms: number;
}

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
  error: { word: 'KNOCK-ON!', tone: 'bad' },
  handover: { word: 'HANDOVER', tone: 'neutral' },
  kick: { word: 'KICK!', tone: 'neutral' },
  try: { word: 'TRY!', tone: 'attack', big: true },
};

export function surnameOf(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

/** The pop-up for an event, or null for routine events (tackles, set starts). */
export function popupFor(e: SimEvent): Popup | null {
  const w = WORDS[e.kind];
  if (!w) return null;
  const big = w.big ?? false;
  return { word: w.word, sub: surnameOf(e.player).toUpperCase(), tone: w.tone, big, ms: big ? POPUP_BIG_MS : POPUP_MS };
}

/** Text colour per tone (team colour is applied by the layer for attack/defence when known). */
export const TONE_COLOR: Readonly<Record<PopupTone, string>> = {
  attack: '#ffe14a',
  defence: '#ff6b4a',
  neutral: '#f4ecd8',
  bad: '#ff4a4a',
};
