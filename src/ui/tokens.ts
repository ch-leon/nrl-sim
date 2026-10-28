// src/ui/tokens.ts — the Broadcast Quiet colour tokens (docs/specs/ui-broadcast-quiet.md)
// as values, so code that cannot read a CSS custom property can still use them: the
// brand (src/brand.ts) and, through it, index.html, the PWA manifest and the icons.
// dom.ts's stylesheet writes each one out as its --nrl-* property; this is the only
// copy of the palette. No DOM, no Phaser: vite.config.ts imports it through the brand.

export const COLOR_TOKENS = {
  navy: '#0e1630',
  panel: '#141d3a',
  raised: '#1b264a',
  button: '#1f2b55',
  line: '#26325c',
  me: '#24346b',
  sheet: 'rgba(14, 22, 48, 0.97)',
  text: '#ffffff',
  text2: '#c9d1ea',
  muted: '#9aa6c7',
  accent: '#f4d03f',
  onAccent: '#0e1630',
  pos: '#6fd896',
  neg: '#f0a39b',
  alert: '#e0574a',
  win: '#2d8a4a',
  injured: '#5a2430',
  bench: '#3a6ea5',
  out: '#b03a2e',
  fitGood: '#3fbf6a',
  fitOk: '#e8a33a',
  fitBad: '#d9534f',
  home: '#f4d03f',
  away: '#2f8a46',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;
