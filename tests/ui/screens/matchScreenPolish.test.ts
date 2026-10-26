// tests/ui/screens/matchScreenPolish.test.ts — the match screen at phone size
// (#341, #348, #339). Layout is checked in WebKit by scripts/e2e-webkit.mjs and
// the season e2e; these pin the pure helpers and the CSS, since vitest has no layout.
import { describe, it, expect } from 'vitest';
import {
  BANNER_DOCK_MS,
  CALL_WHEN,
  CARD_SELECTOR,
  OVERLAY_CSS,
  callCaption,
  cssHex,
  replayCountdown,
  statsStartOpen,
} from '../../../src/ui/screens/matchOverlay';
import { CSS } from '../../../src/ui/dom';
import { COACH_CALLS } from '../../../src/match/league/calls';
import { REPLAY_OFFER_MS } from '../../../src/match/view/replay';
import { toastWaits } from '../../../src/ui/toasts';

const raw = (glob: Record<string, unknown>): string => Object.values(glob)[0] as string;
const SRC: Record<string, string> = {
  'src/ui/screens/matchOverlay.ts': raw(import.meta.glob('../../../src/ui/screens/matchOverlay.ts', { query: '?raw', import: 'default', eager: true })),
  'src/scenes/MatchScene.ts': raw(import.meta.glob('../../../src/scenes/MatchScene.ts', { query: '?raw', import: 'default', eager: true })),
  'src/match/league/live.ts': raw(import.meta.glob('../../../src/match/league/live.ts', { query: '?raw', import: 'default', eager: true })),
};
const readFileSync = (path: string, _enc: 'utf8'): string => SRC[path]!;

/** The declarations of the first rule whose selector (or selector list) ends with `selector`. */
function rule(css: string, selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

function zIndex(css: string, selector: string): number {
  const m = /z-index:\s*(\d+)/.exec(rule(css, selector));
  expect(m, `${selector} z-index`).not.toBeNull();
  return Number(m![1]);
}

describe('the half-time card waits (#341)', () => {
  it('has no timer: the card takes no autoMs and the scene passes none', () => {
    const overlay = readFileSync('src/ui/screens/matchOverlay.ts', 'utf8');
    const scene = readFileSync('src/scenes/MatchScene.ts', 'utf8');
    expect(overlay).not.toMatch(/autoMs|HALF_TIME_CARD_MS/);
    expect(scene).not.toMatch(/autoMs|HALF_TIME_CARD_MS/);
  });
  it('sits above every match control and the toasts, under a dialog', () => {
    const card = zIndex(OVERLAY_CSS, '.nrl-mo-plan, .nrl-mo-sheet');
    for (const sel of ['.nrl-mo-scoreboard', '.nrl-mo-controls', '.nrl-mo-calls', '.nrl-mo-log-toggle', '.nrl-mo-banner']) {
      expect(card, sel).toBeGreaterThan(zIndex(OVERLAY_CSS, sel));
    }
    expect(card).toBeGreaterThan(zIndex(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag'));
    expect(card).toBeGreaterThan(zIndex(CSS, '.nrl-toast-lane'));
    expect(card).toBeLessThan(100); // modals
  });
  it('keeps Continue in view on a short screen: the foot is sticky', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-plan-foot')).toContain('position: sticky');
  });
  it('the replay offer hides under the card, a sheet and the full-time report', () => {
    expect(CARD_SELECTOR).toContain('.nrl-mo-plan');
    expect(CARD_SELECTOR).toContain('.nrl-mo-sheet');
    expect(CARD_SELECTOR).toContain('.nrl-modal');
    expect(rule(OVERLAY_CSS, '.nrl-mo-replay[hidden]')).toContain('display: none');
  });
});

describe('Replay try chip (#348 M5, the try-replay e2e)', () => {
  it('has no centring transform for the pressed nudge to replace', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag')).not.toContain('transform');
    expect(OVERLAY_CSS).not.toMatch(/\.nrl-mo-replay[^{]*:active/);
  });
  it('docks under the scoreboard', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag')).toContain('var(--nrl-mo-board');
  });
  it('counts down whole seconds and never shows 0', () => {
    expect(replayCountdown(REPLAY_OFFER_MS)).toBe(REPLAY_OFFER_MS / 1000);
    expect(replayCountdown(7001)).toBe(8);
    expect(replayCountdown(1000)).toBe(1);
    expect(replayCountdown(1)).toBe(1);
    expect(replayCountdown(-5)).toBe(1);
  });
});

describe('match screen readability (#348)', () => {
  it('M3: the selected speed is filled dark, not just outlined', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-controls .nrl-btn[data-active], .nrl-mo-controls .nrl-btn[data-active]:hover:not(:disabled)')).toContain('background: #1a1a2e');
  });
  it('M3: Skip and Save & exit are in the pause sheet, not the speed row', () => {
    const scene = readFileSync('src/scenes/MatchScene.ts', 'utf8');
    const row = scene.slice(scene.indexOf('private mountPlaybackControls'), scene.indexOf('private openSheet'));
    expect(row).not.toContain("button('Skip'");
    expect(row).not.toContain("button('Save & exit'");
    expect(scene).toContain("'data-save-exit': ''");
  });
  it('M4: the open log takes the ticker’s place on the left half', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-log-on .nrl-mo-ticker')).toContain('display: none');
    expect(rule(OVERLAY_CSS, '.nrl-match-overlay.nrl-mo-log-on .nrl-mo-commentary')).toMatch(/var\(--nrl-mo-log-w, calc\(50vw/);
  });
  it('M6: every refusal the sim gives has a short caption', () => {
    const live = readFileSync('src/match/league/live.ts', 'utf8');
    const body = live.slice(live.indexOf('callRefusal(side: Side, call: CoachCall)'));
    const reasons = [...body.slice(0, body.indexOf('\n  }\n')).matchAll(/return '([^']+)'/g)].map((m) => m[1]!);
    expect(reasons.length).toBeGreaterThanOrEqual(6);
    for (const why of [...reasons, 'full time']) {
      const c = callCaption(why, false);
      expect(c, why).not.toBe('');
      expect(c.length, why).toBeLessThanOrEqual(14);
    }
    expect(callCaption(null, false)).toBe('');
    expect(callCaption('one call a set', true)).toBe('called');
  });
  it('M6: the calls list says when every call can be made', () => {
    for (const call of COACH_CALLS) expect(CALL_WHEN[call], call).toBeTruthy();
  });
  it('M7: stats start collapsed on a phone either way up, open on a desktop', () => {
    expect(statsStartOpen(844, 390)).toBe(false);
    expect(statsStartOpen(667, 375)).toBe(false);
    expect(statsStartOpen(390, 844)).toBe(false);
    expect(statsStartOpen(1280, 800)).toBe(true);
  });
  it('M7: the try banner docks under the scoreboard after about a second', () => {
    expect(BANNER_DOCK_MS).toBeGreaterThanOrEqual(800);
    expect(BANNER_DOCK_MS).toBeLessThanOrEqual(1500);
    expect(rule(OVERLAY_CSS, '.nrl-mo-banner.nrl-mo-banner-docked')).toContain('var(--nrl-mo-board');
  });
  it('M8: colours as CSS', () => {
    expect(cssHex(0xf4d03f)).toBe('#f4d03f');
    expect(cssHex(0x00002e)).toBe('#00002e');
  });
  it('M9: the previous ticker line is at 75%', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-line-prev')).toContain('opacity: 0.75');
  });
});

describe('club toasts wait for the club (#339)', () => {
  it('a match toast shows during the match; a club toast waits', () => {
    expect(toastWaits({ text: 'Saved', kind: 'success', match: true }, true)).toBe(false);
    expect(toastWaits({ text: 'Sponsor', kind: 'info' }, true)).toBe(true);
    expect(toastWaits({ text: 'Sponsor', kind: 'info' }, false)).toBe(false);
  });
});
