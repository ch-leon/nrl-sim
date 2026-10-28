// src/brand.ts — the game's name, short name, colours and logo in one place (#363).
// Everything a player sees of the brand reads from here: the tab title and the
// home-screen name (index.html, filled in at build time by vite.config.ts), the PWA
// manifest, the title screen's heading, the rotate card, the stadium sign, the
// newer-save message, the export file name, the icons (scripts/gen-icons.mjs) and
// the not-affiliated line in Settings (#398).
// Renaming the game is a change to this file and a rebuild.
//
// The colours point at the Broadcast Quiet tokens (src/ui/tokens.ts); the brand adds
// only what the theme has no token for. No storage key is ever derived from the
// brand: the keys are frozen in src/core/storageKeys.ts so a rename loses no career.
// No DOM, no Phaser: vite.config.ts and the icon script import this file.

import { COLOR_TOKENS } from './ui/tokens';

/** How the title screen draws the game's name. */
export type BrandLogo =
  | { kind: 'text' }
  /** An image under public/ (`src` relative to it), drawn in place of the text heading. */
  | { kind: 'image'; src: string };

export interface Brand {
  /** The game's name: tab title, home-screen name, manifest name, the rotate card. */
  name: string;
  /** The manifest's short_name; the stadium sign falls back to it when the title text will not fit. */
  shortName: string;
  /** The title heading and the stadium sign, in the pixel font's capitals. */
  titleText: string;
  /** The parent-brand line under the title heading ("a SuperCOOKED game"), shown only when `show`. */
  parentBrand: { name: string; show: boolean };
  colors: {
    /** The page behind the game: index.html's background and theme-color. */
    background: string;
    /** The brand's yellow: the one primary action a screen, the title's subtitle. */
    primary: string;
    /** Text on `primary`. */
    onPrimary: string;
    /** Text on `background`. */
    text: string;
    /** The installed app's chrome (manifest theme_color/background_color) and the icon's field. */
    app: string;
    /** The rugby ball on the icon. */
    iconBall: string;
  };
  logo: BrandLogo;
  /** Up to three letters drawn on the icon's ball; '' draws today's seam and laces. */
  iconLetters: string;
  /** The front of an exported save's file name. Never a storage key. */
  exportSlug: string;
  /** Where a player asks for help, once there is somewhere. */
  supportUrl?: string | undefined;
  /**
   * The not-affiliated line (#398): in Settings, and the store listing's copy takes
   * it from here. Text only: no mark, logo or "official" wording anywhere in the game.
   */
  disclaimer: string;
}

export const BRAND: Brand = {
  name: 'NRL Sim', // DECISION (Leon): game name
  shortName: 'NRLSim', // DECISION (Leon): game name
  titleText: 'NRL SIM', // DECISION (Leon): game name
  parentBrand: { name: 'SuperCOOKED', show: false }, // DECISION (Leon): game name (show the line once it's chosen)
  colors: {
    background: COLOR_TOKENS.navy,
    primary: COLOR_TOKENS.accent,
    onPrimary: COLOR_TOKENS.onAccent,
    text: COLOR_TOKENS.text,
    // The theme has no token for these two: the manifest and the icons kept the
    // pre-theme navy-black and the ball's leather. Moving them is the theme's call.
    app: '#1a1a2e',
    iconBall: '#e8e4d8',
  },
  logo: { kind: 'text' }, // DECISION (Leon): game name (logo art)
  iconLetters: '', // DECISION (Leon): game name
  exportSlug: 'nrl-sim', // DECISION (Leon): game name
  supportUrl: undefined,
  disclaimer: 'Not affiliated with or endorsed by the NRL, its clubs or players.',
};

/**
 * The stadium sign's words: the title text when it fits a hoarding panel `maxWidth`
 * pixels wide in the pixel font, else the short name in capitals, cut to fit.
 */
export function signText(brand: Brand, measure: (text: string) => number, maxWidth: number): string {
  if (measure(brand.titleText) <= maxWidth) return brand.titleText;
  let s = brand.shortName.toUpperCase();
  while (s.length > 0 && measure(s) > maxWidth) s = s.slice(0, -1);
  return s;
}
