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
};

/** A bust out of a wrestle (the defenders' grip went first) reads differently from one at contact. */
const LATE_BUST = 'BROKE FREE!';

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
  const big = w.big ?? false;
  const word = e.kind === 'kick' && e.detail && KICK_WORDS[e.detail] ? KICK_WORDS[e.detail]! : e.kind === 'break-tackle' && e.detail === 'wrestle' ? LATE_BUST : w.word;
  const p: Popup = { word, sub: surnameOf(e.player).toUpperCase(), tone: w.tone, big, ms: big ? POPUP_BIG_MS : POPUP_MS };
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
