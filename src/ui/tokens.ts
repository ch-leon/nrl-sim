// src/ui/tokens.ts — the SuperCOOKED colour tokens (docs/specs/ui-supercooked.md §2;
// the keys are Broadcast Quiet's, docs/specs/ui-broadcast-quiet.md) as values, so code
// that cannot read a CSS custom property can still use them: the brand (src/brand.ts)
// and, through it, index.html, the PWA manifest and the icons. dom.ts's stylesheet
// writes each one out as its --nrl-* property; this is the only copy of the palette.
// No DOM, no Phaser: vite.config.ts imports it through the brand.

export const COLOR_TOKENS = {
  /** The darkest field: the dock, the title, loading, club setup and the match bars. */
  ink: '#05070d',
  navy: '#0b1220',
  panel: '#121a2e',
  raised: '#1a2540',
  button: '#1a2540',
  line: '#222c45',
  me: '#1a2540', // your row: with a 3px inset accent bar on its left (dom.ts .nrl-me)
  sheet: 'rgba(11, 18, 32, 0.98)',
  text: '#ffffff',
  text2: '#c8cdd8',
  muted: '#8f98ab',
  /** The orange: the one primary a screen. */
  accent: '#ff6b1a',
  onAccent: '#0b1220',
  pos: '#14c38e',
  neg: '#ff8a3d',
  alert: '#ff3b1f',
  win: '#14c38e', // navy text on it (onAccent), not white
  injured: '#5a2430',
  bench: '#3a6ea5',
  out: '#b03a2e',
  fitGood: '#14c38e',
  fitOk: '#ff8a3d',
  fitBad: '#ff3b1f',
  home: '#ff6b1a',
  away: '#14c38e',
  /** An empty star (parts.ts stars). */
  starEmpty: '#3a4566',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;
