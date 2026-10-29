// tests/ui/screens/matchScreenPolish.test.ts — the match screen at phone size
// (#341, #348, #339; Broadcast Quiet 3m–3t). Layout is checked in WebKit by
// scripts/e2e-webkit.mjs and the season e2e; these pin the pure helpers and the
// CSS, since vitest has no layout.
import { describe, it, expect } from 'vitest';
import {
  CALL_WHEN,
  CARD_SELECTOR,
  LOG_MODE_KEY,
  OVERLAY_CSS,
  SKIP_ARM_MS,
  TICKER_MIN_PX,
  fittedTickerPx,
  bannerText,
  callCaption,
  callEffect,
  callsUnlockLine,
  coachBadge,
  cssHex,
  readLogMode,
  replayCountdown,
  saveLogMode,
  scoreBanner,
  statSplit,
  teamCode,
  teamCodes,
} from '../../../src/ui/screens/matchOverlay';
import { REPORT_CSS } from '../../../src/ui/screens/matchReport';
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

describe('the half-time sheet waits (#341)', () => {
  it('has no timer: the sheet takes no autoMs and the scene passes none', () => {
    const overlay = readFileSync('src/ui/screens/matchOverlay.ts', 'utf8');
    const scene = readFileSync('src/scenes/MatchScene.ts', 'utf8');
    expect(overlay).not.toMatch(/autoMs|HALF_TIME_CARD_MS/);
    expect(scene).not.toMatch(/autoMs|HALF_TIME_CARD_MS/);
  });
  it('sits above every match control and the toasts, under a dialog', () => {
    const card = zIndex(OVERLAY_CSS, '.nrl-mo-plan, .nrl-mo-sheet');
    for (const sel of ['.nrl-mo-scoreboard', '.nrl-mo-statsheet', '.nrl-mo-strip', '.nrl-mo-full', '.nrl-mo-bar', '.nrl-mo-tray', '.nrl-mo-banner']) {
      expect(card, sel).toBeGreaterThan(zIndex(OVERLAY_CSS, sel));
    }
    expect(card).toBeGreaterThan(zIndex(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag'));
    expect(card).toBeGreaterThan(zIndex(CSS, '.nrl-toast-lane'));
    expect(card).toBeLessThan(100); // modals
  });
  it('the full-time card covers the match controls and the toasts, and the report goes over it', () => {
    const ft = zIndex(REPORT_CSS, '.nrl-mo-ft');
    expect(ft).toBeGreaterThan(zIndex(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag'));
    expect(ft).toBeGreaterThan(zIndex(CSS, '.nrl-toast-lane'));
    expect(ft).toBeLessThan(100); // the report is a dialog
    expect(CARD_SELECTOR).toContain('.nrl-mo-ft');
  });
  it('keeps its primary in view on a short screen: the rows scroll, the foot does not', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-plan-foot')).toContain('flex: 0 0 auto');
    const rows = rule(OVERLAY_CSS, '.nrl-mo-plan-rows');
    expect(rows).toContain('min-height: 0');
    expect(rows).toContain('overflow-y: auto');
    expect(rule(OVERLAY_CSS, '.nrl-mo-plan-sheet')).toContain('max-height: 100%');
  });
  it('the replay offer hides under the sheets, the full-time card and the report', () => {
    expect(CARD_SELECTOR).toContain('.nrl-mo-plan');
    expect(CARD_SELECTOR).toContain('.nrl-mo-sheet');
    expect(CARD_SELECTOR).toContain('.nrl-modal');
    expect(rule(OVERLAY_CSS, '.nrl-mo-replay[hidden]')).toContain('display: none');
  });
  it('the replay offer steps out from over the open coach tray (#348)', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-tray-open .nrl-mo-replay')).toContain('display: none');
  });
});

describe('Replay try chip (#348 M5, the try-replay e2e)', () => {
  it('has no centring transform for the pressed nudge to replace', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-replay, .nrl-mo-replay-tag')).not.toContain('transform');
    expect(OVERLAY_CSS).not.toMatch(/\.nrl-mo-replay[^{]*:active/);
  });
  it('sits under the score bug and the banner', () => {
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

describe('match screen readability (#348, Broadcast Quiet 3m)', () => {
  it('M3: the speed playing now is a yellow circle in the pill', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-controls .nrl-btn.nrl-mo-speed[aria-pressed="true"], .nrl-mo-controls .nrl-btn.nrl-mo-speed[aria-pressed="true"]:hover:not(:disabled)')).toContain('background: var(--nrl-accent)');
  });
  it('M3: SKIP in the pill takes two taps; Save & exit stays in the pause sheet', () => {
    const scene = readFileSync('src/scenes/MatchScene.ts', 'utf8');
    const row = scene.slice(scene.indexOf('private mountPlaybackControls'), scene.indexOf('private openSheet'));
    expect(row).not.toContain("button('Save & exit'");
    expect(row).toContain("setAttribute('data-armed'");
    expect(SKIP_ARM_MS).toBeGreaterThanOrEqual(2000);
    expect(SKIP_ARM_MS).toBeLessThanOrEqual(5000);
    expect(scene).toContain("'data-save-exit': ''");
    expect(scene).toContain("'data-skip': ''");
  });
  it('the log: one line, nothing, or the full log on the right', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-strip')).toContain('width: min(560px');
    expect(rule(OVERLAY_CSS, '.nrl-mo-strip')).toContain('min-height: 40px');
    // #433: a long name wraps to a second line; anything past that still ends in an ellipsis.
    expect(rule(OVERLAY_CSS, '.nrl-mo-strip-text')).toContain('text-overflow: ellipsis');
    expect(rule(OVERLAY_CSS, '.nrl-mo-strip-text')).toContain('-webkit-line-clamp: 2');
    // A narrow window gets a third line; the fitter then draws a long name smaller (#433).
    expect(OVERLAY_CSS).toContain('@media (max-width: 520px)');
    expect(fittedTickerPx(14, 40, 40)).toBe(14);
    expect(fittedTickerPx(20, 40, 30)).toBe(15);
    expect(fittedTickerPx(14, 200, 40)).toBe(TICKER_MIN_PX);
    const full = rule(OVERLAY_CSS, '.nrl-mo-full');
    expect(full).toContain('right: calc(12px');
    expect(full).toContain('width: min(330px');
    expect(OVERLAY_CSS).toContain('.nrl-match-overlay:not([data-log="full"]) .nrl-mo-full');
    expect(OVERLAY_CSS).toContain('.nrl-match-overlay:not([data-log="line"]) .nrl-mo-strip');
  });
  it('the log mode is kept between matches (full comes back as the line), and blocked storage is no error', () => {
    const box = new Map<string, string>();
    const store = { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => void box.set(k, v) };
    expect(readLogMode(store)).toBe('line');
    saveLogMode('hidden', store);
    expect(box.get(LOG_MODE_KEY)).toBe('hidden');
    expect(readLogMode(store)).toBe('hidden');
    saveLogMode('full', store);
    expect(box.get(LOG_MODE_KEY)).toBe('line');
    const blocked = {
      getItem: (): string | null => {
        throw new Error('denied');
      },
      setItem: (): void => {
        throw new Error('denied');
      },
    };
    expect(readLogMode(blocked)).toBe('line');
    expect(() => saveLogMode('hidden', blocked)).not.toThrow();
    expect(readLogMode(null)).toBe('line');
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
  it('M6: the coach tray says what every call does', () => {
    for (const call of COACH_CALLS) {
      expect(CALL_WHEN[call], call).toBeTruthy();
      expect(callEffect(call), call).not.toContain(':');
    }
    expect(callEffect('hit-up')).toBe('the forwards take the next carry');
  });
  it('3o: the tray footer says when the others come on, and what the Coach’s Office still locks', () => {
    expect(callsUnlockLine([
      { call: 'hit-up', why: null },
      { call: 'kick-early', why: 'tackles 3–4' },
      { call: 'bomb', why: 'late in the set' },
      { call: 'run-it', why: 'late in the set' },
    ], [])).toBe('Kick early from tackle 3 · Bomb, Run it from tackle 4');
    expect(callsUnlockLine([{ call: 'hit-up', why: 'one call a set' }], [{ call: 'field-goal', level: 3 }, { call: 'bomb', level: 3 }]))
      .toBe("Called this set: the next call with the next set · Field goal, Bomb at Coach's Office level 3");
    expect(callsUnlockLine([], [{ call: 'kick-early', level: 2 }, { call: 'shift-left', level: 1 }])).toBe("Shift left at Coach's Office level 1, more above");
    expect(callsUnlockLine([{ call: 'rush', why: null }], [])).toBe('');
  });
  it('3m: the COACH badge never goes away: the calls on now, the call made, or why none', () => {
    expect(coachBadge(3, true, null)).toEqual({ text: '3 calls', state: 'on' });
    expect(coachBadge(1, false, null)).toEqual({ text: '1 call', state: 'on' });
    expect(coachBadge(0, false, null)).toEqual({ text: 'Their ball', state: 'off' });
    expect(coachBadge(0, true, null).state).toBe('off');
    expect(coachBadge(0, true, 'hit-up')).toEqual({ text: 'Hit-up', state: 'made' });
  });
  it('M7: no permanent stats panel: the score bug opens them; the banner sits under the score bug', () => {
    expect(rule(OVERLAY_CSS, '.nrl-mo-statsheet[hidden]')).toContain('display: none');
    expect(readFileSync('src/ui/screens/matchOverlay.ts', 'utf8')).toContain('statsSheet.hidden = true;');
    expect(rule(OVERLAY_CSS, '.nrl-mo-banner')).toContain('var(--nrl-mo-board');
    expect(rule(OVERLAY_CSS, '.nrl-mo-banner')).toContain('pointer-events: none');
  });
  it('M8: colours as CSS, and three letters for each side', () => {
    expect(cssHex(0xf4d03f)).toBe('#f4d03f');
    expect(cssHex(0x00002e)).toBe('#00002e');
    expect(teamCode('Live Test FC')).toBe('LTF');
    expect(teamCode('Launceston Larrikins')).toBe('LAU');
    expect(teamCode('Gulls')).toBe('GUL');
    expect(teamCodes('Live Test FC', 'Launceston Larrikins')).toEqual(['LTF', 'LAU']);
    expect(teamCodes('Brisbane Bears', 'Brisbane Larrikins')).toEqual(['BBE', 'BLA']);
  });
  it('3n: the banner says the moment in one word, the points on the team line', () => {
    const names = ['Live Test FC', 'Larrikins'] as const;
    const ev = { t: 9, kind: 'try' as const, teamId: 'H', player: 'Jett Mbyerson' };
    expect(bannerText(scoreBanner(ev, 'H', names)!)).toEqual({ head: 'TRY', who: 'Jett Mbyerson', sub: 'Live Test FC · +4', tone: 'score' });
    expect(bannerText(scoreBanner({ ...ev, kind: 'penalty-goal', detail: 'good' }, 'H', names)!)).toMatchObject({ head: 'GOAL', sub: 'Live Test FC · penalty goal · +2' });
    expect(bannerText(scoreBanner({ ...ev, kind: 'field-goal', detail: 'missed' }, 'H', names)!)).toMatchObject({ head: 'MISSED', tone: 'miss', sub: 'Live Test FC · field goal' });
  });
  it('3t: a stat row’s split bar is the home share', () => {
    expect(statSplit('54%', '46%')).toBe(54);
    expect(statSplit('312', '298')).toBe(51);
    expect(statSplit('0', '0')).toBe(50);
    expect(statSplit('4/6', '2/4')).toBe(67);
  });
});

describe('club toasts wait for the club (#339)', () => {
  it('a match toast shows during the match; a club toast waits', () => {
    expect(toastWaits({ text: 'Saved', kind: 'success', match: true }, true)).toBe(false);
    expect(toastWaits({ text: 'Sponsor', kind: 'info' }, true)).toBe(true);
    expect(toastWaits({ text: 'Sponsor', kind: 'info' }, false)).toBe(false);
  });
});
