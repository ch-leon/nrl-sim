// src/ui/buildInfo.ts — which build is this? (N7, GitHub #181)
//
// `main` deploys to GitHub Pages after every merge, and the phone that is testing
// it cannot otherwise tell one build from the next. vite.config.ts fills the
// `__NRL_BUILD__` define with the build date and the short commit SHA; the title
// screen and the Guide show it. Anything that runs this code without the define
// (a bundler that doesn't set it) sees the fallback. No Phaser, no DOM.

declare const __NRL_BUILD__: string | undefined;

/** What the label says when no build stamped it. */
export const BUILD_LABEL_FALLBACK = 'dev';

/** `2026-10-19 979cbbe` — the UTC build date and the short SHA (`local` without git). */
export function formatBuildLabel(date: Date, sha: string | null): string {
  const day = date.toISOString().slice(0, 10);
  return `${day} ${sha?.trim() || 'local'}`;
}

/** The label this build was stamped with, or the fallback. */
export function buildLabel(): string {
  return typeof __NRL_BUILD__ === 'string' && __NRL_BUILD__ !== '' ? __NRL_BUILD__ : BUILD_LABEL_FALLBACK;
}
